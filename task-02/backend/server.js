// Express backend server entry point

const express = require('express');
const cors = require('cors');

const productRoutes = require('./src/routes/productRoutes');
const checkoutRoutes = require('./src/routes/checkoutRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const { initDb, isConnected } = require('./src/db/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the React frontend can talk to our API
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Request logger for friendly terminal visibility
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount API routes
app.use('/api/products', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    store: 'Serendib Green Store API',
    database: isConnected() ? 'PostgreSQL' : 'in-memory-fallback',
    currency: 'LKR (Sri Lanka Rupees)',
    time: new Date().toISOString()
  });
});

// Start server and initialize PostgreSQL database
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🌱 Serendib Green Store API running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Products API: http://localhost:${PORT}/api/products`);
  console.log('====================================================');

  // Attempt database connection and schema setup
  await initDb();
});
