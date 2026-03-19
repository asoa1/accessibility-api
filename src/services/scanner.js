const puppeteer = require('puppeteer');

const IMPACT_META = {
  critical: { label: 'Critical',  priority: 1, badge: 'Must fix immediately'   },
  serious:  { label: 'Serious',   priority: 2, badge: 'Fix before launch'       },
  moderate: { label: 'Moderate',  priority: 3, badge: 'Fix when possible'       },
  minor:    { label: 'Minor',     priority: 4, badge: 'Nice to fix'             }
};

async function scanUrl(url) {
  const start = Date.now();
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js'
    });

    const axeResults = await page.evaluate(async () => {
      return await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }
      });
    });

    const duration = Date.now() - start;

    // Score calculation
    const totalChecks = axeResults.passes.length + axeResults.violations.length;
    const score = totalChecks > 0 ? Math.round((axeResults.passes.length / totalChecks) * 100) : 100;
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

    // Count by impact
    const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    axeResults.violations.forEach(v => {
      if (bySeverity[v.impact] !== undefined) bySeverity[v.impact]++;
    });

    // Sort violations by severity (critical first)
    const sortedViolations = [...axeResults.violations].sort((a, b) => {
      const pa = IMPACT_META[a.impact]?.priority ?? 99;
      const pb = IMPACT_META[b.impact]?.priority ?? 99;
      return pa - pb;
    });

    // Clean structured violations
    const violations = sortedViolations.map(v => ({
      id:          v.id,
      impact:      v.impact,
      urgency:     IMPACT_META[v.impact]?.badge ?? 'Review needed',
      description: v.description,
      how_to_fix:  v.help,
      learn_more:  v.helpUrl,
      wcag_tags:   v.tags.filter(t => t.startsWith('wcag')),
      best_practice: v.tags.includes('best-practice'),
      affected_elements: v.nodes.length,
      examples: v.nodes.slice(0, 2).map(n => ({
        html:    n.html,
        problem: n.failureSummary?.replace('Fix any of the following:\n', '').trim(),
        target:  n.target?.join(', ')
      }))
    }));

    // Passed checks (just names, clean)
    const passed = axeResults.passes.map(p => ({
      id:          p.id,
      description: p.help
    }));

    return {
      success:  true,
      url,
      scanned_at: new Date().toISOString(),
      score,
      grade,
      summary: {
        total_checks:  totalChecks,
        violations:    axeResults.violations.length,
        passed:        axeResults.passes.length,
        incomplete:    axeResults.incomplete.length,
        by_severity: {
          critical: bySeverity.critical,
          serious:  bySeverity.serious,
          moderate: bySeverity.moderate,
          minor:    bySeverity.minor
        }
      },
      violations,
      passed,
      scan_duration_ms: duration
    };

  } catch (err) {
    return {
      success: false,
      url,
      error:   err.message,
      scan_duration_ms: Date.now() - start
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scanUrl };
