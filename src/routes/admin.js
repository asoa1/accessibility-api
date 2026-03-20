const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { run, get, all } = require('../utils/database');
const { PLAN_LIMITS } = require('../middleware/auth');

const router = express.Router();

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden.' });
  }
  next();
}

router.post('/keys', requireAdmin, async (req, res) => {
  const { name, email, plan = 'free' } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, error: 'name and email are required.' });
  if (!PLAN_LIMITS[plan]) return res.status(400).json({ success: false, error: `Invalid plan. Choose from: ${Object.keys(PLAN_LIMITS).join(', ')}` });

  const id  = uuidv4();
  const key = 'acc_' + crypto.randomBytes(24).toString('hex');

  await run('INSERT INTO api_keys (id, key, name, email, plan) VALUES (?, ?, ?, ?, ?)', [id, key, name, email, plan]);
  res.status(201).json({ success: true, message: 'API key created.', api_key: key, name, email, plan, daily_limit: PLAN_LIMITS[plan] });
});

router.get('/keys', requireAdmin, async (req, res) => {
  const keys = await all('SELECT id, name, email, plan, calls_today, calls_total, created_at, active FROM api_keys ORDER BY created_at DESC');
  res.json({ success: true, total: keys.length, keys });
});

router.patch('/keys/:id', requireAdmin, async (req, res) => {
  const { plan, active } = req.body;
  if (plan && !PLAN_LIMITS[plan]) return res.status(400).json({ success: false, error: 'Invalid plan.' });
  const fields = [], values = [];
  if (plan   !== undefined) { fields.push('plan = ?');   values.push(plan); }
  if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ success: false, error: 'Nothing to update.' });
  values.push(req.params.id);
  await run(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json({ success: true, message: 'Key updated.' });
});

module.exports = router;
