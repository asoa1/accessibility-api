const https = require('https');
const http  = require('http');
const { JSDOM, VirtualConsole } = require('jsdom');
const axe = require('axe-core');

const IMPACT_META = {
  critical: { priority: 1, urgency: 'Must fix immediately'  },
  serious:  { priority: 2, urgency: 'Fix before launch'      },
  moderate: { priority: 3, urgency: 'Fix when possible'      },
  minor:    { priority: 4, urgency: 'Nice to fix'            }
};

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function scanUrl(url) {
  const start = Date.now();

  try {
    const html = await fetchHtml(url);

    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html, {
      url,
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
      pretendToBeVisual: true
    });

    const { window } = dom;

    // Wait briefly for DOM to settle
    await new Promise(r => setTimeout(r, 500));

    // Inject axe-core
    const axeSource = axe.source;
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = axeSource;
    window.document.head.appendChild(scriptEl);

    // Run axe
    const axeResults = await window.axe.run(window.document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }
    });

    window.close();
    const duration = Date.now() - start;

    const totalChecks = axeResults.passes.length + axeResults.violations.length;
    const score = totalChecks > 0 ? Math.round((axeResults.passes.length / totalChecks) * 100) : 100;
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

    const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    axeResults.violations.forEach(v => { if (bySeverity[v.impact] !== undefined) bySeverity[v.impact]++; });

    const violations = [...axeResults.violations]
      .sort((a, b) => (IMPACT_META[a.impact]?.priority ?? 99) - (IMPACT_META[b.impact]?.priority ?? 99))
      .map(v => ({
        id:                v.id,
        impact:            v.impact,
        urgency:           IMPACT_META[v.impact]?.urgency ?? 'Review needed',
        description:       v.description,
        how_to_fix:        v.help,
        learn_more:        v.helpUrl,
        wcag_tags:         v.tags.filter(t => t.startsWith('wcag')),
        best_practice:     v.tags.includes('best-practice'),
        affected_elements: v.nodes.length,
        examples: v.nodes.slice(0, 2).map(n => ({
          html:    n.html,
          problem: n.failureSummary?.replace('Fix any of the following:\n', '').trim(),
          target:  n.target?.join(', ')
        }))
      }));

    const passed = axeResults.passes.map(p => ({ id: p.id, description: p.help }));

    return {
      success: true,
      url,
      scanned_at: new Date().toISOString(),
      score,
      grade,
      summary: {
        total_checks: totalChecks,
        violations:   axeResults.violations.length,
        passed:       axeResults.passes.length,
        incomplete:   axeResults.incomplete.length,
        by_severity:  bySeverity
      },
      violations,
      passed,
      scan_duration_ms: duration
    };

  } catch (err) {
    return {
      success: false,
      url,
      error:            err.message,
      scan_duration_ms: Date.now() - start
    };
  }
}

module.exports = { scanUrl };
