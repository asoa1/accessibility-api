const db = require('../utils/database');

// Plan limits (scans per day)
const PLAN_LIMITS = {
  free:       5,
  basic:      100,
  pro:        1000,
  enterprise: 999999
};

function requireApiKey(req, res, next) {
  // Accept key from header or query param
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing API key. Pass it as X-Api-Key header or ?api_key= query param.'
    });
  }

  // Look up key in database
  const record = db.prepare(`
    SELECT * FROM api_keys WHERE key = ? AND active = 1
  `).get(apiKey);

  if (!record) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or inactive API key.'
    });
  }

  // Reset daily counter if it's a new day
  const today = new Date().toISOString().split('T')[0];
  if (record.last_reset !== today) {
    db.prepare(`
      UPDATE api_keys SET calls_today = 0, last_reset = ? WHERE id = ?
    `).run(today, record.id);
    record.calls_today = 0;
  }

  // Check daily limit
  const limit = PLAN_LIMITS[record.plan] || PLAN_LIMITS.free;
  if (record.calls_today >= limit) {
    return res.status(429).json({
      success: false,
      error: `Daily limit reached. Your ${record.plan} plan allows ${limit} scans/day.`,
      upgrade_url: 'https://rapidapi.com/your-api'
    });
  }

  // Attach to request for use in routes
  req.apiKey = record;
  req.planLimit = limit;
  next();
}

module.exports = { requireApiKey, PLAN_LIMITS };
