require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb } = require('./utils/database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Slow down.' }
}));

app.get('/', (req, res) => {
  res.json({
    name:    'Accessibility Checker API',
    version: '1.0.0',
    status:  'running',
    endpoints: { scan: 'POST /v1/scan', usage: 'GET /v1/usage' }
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Init DB first, then mount routes and start server
getDb().then(() => {
  const scanRoutes  = require('./routes/scan');
  const adminRoutes = require('./routes/admin');
  app.use('/v1', scanRoutes);
  app.use('/admin', adminRoutes);

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Accessibility Checker API v1.0       ║
║   Running on http://localhost:${PORT}     ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
╚════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});

module.exports = app;
