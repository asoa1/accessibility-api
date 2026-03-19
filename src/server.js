require('dotenv').config();

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');

const scanRoutes  = require('./routes/scan');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Security middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global rate limiter (protects server from floods before auth kicks in)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Slow down.' }
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/v1', scanRoutes);
app.use('/admin', adminRoutes);

// Health check (for Render.com ping)
app.get('/', (req, res) => {
  res.json({
    name:    'Accessibility Checker API',
    version: '1.0.0',
    status:  'running',
    docs:    'https://rapidapi.com/your-api',
    endpoints: {
      scan:  'POST /v1/scan',
      usage: 'GET  /v1/usage'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Accessibility Checker API v1.0       ║
║   Running on http://localhost:${PORT}     ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
