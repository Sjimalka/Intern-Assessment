import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSchema, pool } from './db.js';
import apiRoutes from './routes/api.js';
import { startExpiryWorker, stopExpiryWorker } from './workers/expiryWorker.js';

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5001;

// allow frontend to talk to this backend
app.use(cors());

// allow json bodies up to 20mb for picture uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// log api requests to console
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// api routes
app.use('/api', apiRoutes);

// quick health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: Date.now() });
});

// handle errors
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    statusCode: status
  });
});

// start the application
async function startServer() {
  try {
    console.log('[Server] Connecting to PostgreSQL and initializing schema...');
    try {
      await initSchema();
      console.log('[Server] PostgreSQL database schema ready.');
    } catch (dbErr) {
      console.error('[Server] Notice: Could not connect to PostgreSQL on startup:', dbErr.message || dbErr.code || 'Connection refused');
      console.error('[Server] Please ensure PostgreSQL is running and check backend/.env');
    }

    // check for expired reservations every 5 seconds
    startExpiryWorker(5000);

    const server = app.listen(PORT, () => {
      console.log(`POS Backend running on http://localhost:${PORT}`);
    });

    // stop cleanly on exit
    const shutdown = async () => {
      console.log('[Server] Shutting down cleanly...');
      stopExpiryWorker();
      try {
        await pool.end();
      } catch {}
      server.close(() => process.exit(0));
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
