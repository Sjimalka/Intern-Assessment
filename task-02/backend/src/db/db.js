// PostgreSQL database connection pool and schema initializer
const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let isPgConnected = false;

// Get connection config options from environment
// Get connection config options from environment
function getDbConfig() {
  if (process.env.DATABASE_URL) {
    const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'serendib_store',
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

// Helper: Ensure the target database exists (creates it on default 'postgres' db if needed)
async function ensureDatabaseExists() {
  const config = getDbConfig();
  const targetDb = config.database || (config.connectionString ? new URL(config.connectionString).pathname.replace(/^\//, '') : 'serendib_store');

  if (!targetDb || targetDb === 'postgres') return;

  // Connect to default maintenance database 'postgres' to check if target exists
  let maintenanceConfig;
  if (config.connectionString) {
    const url = new URL(config.connectionString);
    url.pathname = '/postgres';
    maintenanceConfig = {
      connectionString: url.toString(),
      ssl: config.ssl,
    };
  } else {
    maintenanceConfig = { ...config, database: 'postgres' };
  }

  const client = new Client({
    ...maintenanceConfig,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (checkRes.rows.length === 0) {
      console.log(`[PostgreSQL] Database "${targetDb}" does not exist. Creating it automatically...`);
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[PostgreSQL] Database "${targetDb}" created successfully!`);
    }
  } catch (err) {
    // If maintenance check fails, continue and let main pool try directly
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}

// Initialize connection pool
function getPool() {
  if (!pool) {
    const config = getDbConfig();
    pool = new Pool({
      ...config,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning]:', err.message);
    });
  }
  return pool;
}

// Check connection, run schema, and seed initial data
async function initDb() {
  try {
    // Auto-create database if possible
    await ensureDatabaseExists();

    const p = getPool();
    const client = await p.connect();
    try {
      // Execute schema.sql to create tables if they do not exist
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);

      // Check if products exist; if not, seed from products.json
      const countRes = await client.query('SELECT COUNT(*) FROM products');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        const seedPath = path.join(__dirname, '../data/products.json');
        if (fs.existsSync(seedPath)) {
          const rawProducts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
          for (const item of rawProducts) {
            await client.query(
              `INSERT INTO products (
                id, name, description, price, category, rating, image_url,
                available_stock, reserved_stock, total_stock, specs, origin
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (id) DO NOTHING`,
              [
                item.id,
                item.name,
                item.description || '',
                item.price,
                item.category,
                item.rating || 5.0,
                item.imageUrl || '',
                item.availableStock || 0,
                item.reservedStock || 0,
                item.totalStock || item.availableStock || 0,
                JSON.stringify(item.specs || []),
                item.origin || 'Sri Lanka'
              ]
            );
          }
          console.log(`[PostgreSQL] Seeded ${rawProducts.length} initial products into database.`);
        }
      }

      isPgConnected = true;
      console.log('[PostgreSQL] Successfully connected to PostgreSQL and verified schema tables.');
    } finally {
      client.release();
    }
  } catch (err) {
    isPgConnected = false;
    console.warn(`[PostgreSQL] Notice: Could not connect to PostgreSQL (${err.message}). Using resilient in-memory fallback.`);
    console.warn('[PostgreSQL] If your local PostgreSQL is running, check your password/port in backend/.env');
  }
  return isPgConnected;
}

// Helper to execute a query
async function query(text, params) {
  if (!isPgConnected) {
    throw new Error('PostgreSQL is not connected.');
  }
  return getPool().query(text, params);
}

// Get a transactional client
async function getClient() {
  if (!isPgConnected) {
    throw new Error('PostgreSQL is not connected.');
  }
  return getPool().connect();
}

function isConnected() {
  return isPgConnected;
}

module.exports = {
  getPool,
  initDb,
  query,
  getClient,
  isConnected
};
