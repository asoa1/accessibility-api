const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireApiKey } = require('../middleware/auth');
const { scanUrl } = require('../services/scanner');
const { run, get, all } = require('../utils/database');

const router = express.Router();

router.post('/scan', requireApiKey, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'url is required.' });

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL. Must start with http:// or https://' });
  }

  await run('UPDATE api_keys SET calls_today = calls_today + 1, calls_total = calls_total + 1 WHERE id = ?', [req.apiKey.id]);

  const result = await scanUrl(parsedUrl.href);

  await run(
    'INSERT INTO scan_logs (id, api_key_id, url, violations, status, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), req.apiKey.id, parsedUrl.href, result.summary?.violations ?? null, result.success ? 'success' : 'error', result.scan_duration_ms]
  );

  result.quota = {
    plan:            req.apiKey.plan,
    limit_per_day:   req.planLimit,
    used_today:      req.apiKey.calls_today + 1,
    remaining_today: Math.max(0, req.planLimit - req.apiKey.calls_today - 1)
  };

  return res.status(result.success ? 200 : 500).json(result);
});

router.get('/usage', requireApiKey, async (req, res) => {
  const recentScans = await all(
    'SELECT url, violations, status, duration_ms, created_at FROM scan_logs WHERE api_key_id = ? ORDER BY created_at DESC LIMIT 10',
    [req.apiKey.id]
  );
  res.json({
    success: true,
    key_name:        req.apiKey.name,
    plan:            req.apiKey.plan,
    limit_per_day:   req.planLimit,
    used_today:      req.apiKey.calls_today,
    remaining_today: Math.max(0, req.planLimit - req.apiKey.calls_today),
    total_scans:     req.apiKey.calls_total,
    member_since:    req.apiKey.created_at,
    recent_scans:    recentScans
  });
});

module.exports = router;
