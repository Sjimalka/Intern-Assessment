import 'dotenv/config';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlitePath = path.join(dataDir, 'pos.db');

// configure postgresql connection from environment
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' || process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'pos_db',
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    };

export const pgPool = new Pool({
  ...connectionConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000, // fast 2s timeout for connection check
});

// wrapped pool object so any direct pool.query calls route through resilient query adapter
export const pool = {
  query: (text, params) => query(text, params),
  connect: () => getClient(),
  end: () => pgPool.end()
};

let isPostgres = false;
let sqliteDb = null;

// sample default products in sri lankan rupees (Rs.)
export const sampleProducts = [
  {
    id: 'prod-macbook-m3',
    name: 'MacBook Air M3 15-inch',
    sku: 'SKU-APL-MBA15',
    category: 'Electronics',
    price: 435000,
    total_stock: 12,
    reserved_stock: 0,
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-sony-wh1000xm5',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    sku: 'SKU-SNY-XM5',
    category: 'Audio',
    price: 119500,
    total_stock: 15,
    reserved_stock: 0,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-limited-sneakers',
    name: 'Air Jordan 1 Retro High OG (Rare)',
    sku: 'SKU-NKE-AJ1-OG',
    category: 'Footwear',
    price: 68500,
    total_stock: 5,
    reserved_stock: 0,
    image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-logitech-mxmaster3s',
    name: 'Logitech MX Master 3S Wireless Mouse',
    sku: 'SKU-LOG-MXM3S',
    category: 'Accessories',
    price: 38900,
    total_stock: 25,
    reserved_stock: 0,
    image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-mechanical-keyboard',
    name: 'Keychron Q1 Pro Wireless Custom Keyboard',
    sku: 'SKU-KCH-Q1P',
    category: 'Accessories',
    price: 64900,
    total_stock: 8,
    reserved_stock: 0,
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-fujifilm-x100vi',
    name: 'Fujifilm X100VI Digital Camera (Limited)',
    sku: 'SKU-FUJ-X100VI',
    category: 'Photography',
    price: 545000,
    total_stock: 3,
    reserved_stock: 0,
    image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60'
  }
];

// initialize sqlite fallback
function initSqlite() {
  if (sqliteDb) return;
  sqliteDb = new DatabaseSync(sqlitePath);
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA busy_timeout = 5000;');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      total_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL,
      reserved_at INTEGER,
      expires_at INTEGER,
      paid_at INTEGER,
      cancelled_at INTEGER,
      failed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      gateway_transaction_id TEXT,
      outcome TEXT NOT NULL,
      error_message TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_audit_log (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT,
      action TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      new_total_stock INTEGER NOT NULL,
      new_reserved_stock INTEGER NOT NULL,
      reference_id TEXT,
      reason TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const countRow = sqliteDb.prepare('SELECT COUNT(*) as count FROM products;').get();
  if (!countRow || countRow.count === 0) {
    const now = Date.now();
    for (const p of sampleProducts) {
      sqliteDb.prepare(`
        INSERT INTO products (id, name, sku, category, price, total_stock, reserved_stock, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(p.id, p.name, p.sku, p.category, p.price, p.total_stock, p.reserved_stock, p.image_url, now, now);

      sqliteDb.prepare(`
        INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
        VALUES (?, ?, ?, 'CREATE', ?, ?, 0, 'SEED', 'Initial catalog setup', ?);
      `).run(uuidv4(), p.id, p.name, p.total_stock, p.total_stock, now);
    }
  }
}

// execute query against active database (PostgreSQL or SQLite fallback)
export async function query(text, params = []) {
  if (isPostgres) {
    return pool.query(text, params);
  }

  // SQLite fallback
  initSqlite();
  const trimmed = text.trim();

  // transaction control
  if (/^BEGIN/i.test(trimmed)) {
    try { sqliteDb.exec('BEGIN IMMEDIATE;'); } catch {}
    return { rows: [] };
  }
  if (/^COMMIT/i.test(trimmed)) {
    try { sqliteDb.exec('COMMIT;'); } catch {}
    return { rows: [] };
  }
  if (/^ROLLBACK/i.test(trimmed)) {
    try { sqliteDb.exec('ROLLBACK;'); } catch {}
    return { rows: [] };
  }

  // adapt SQL syntax: strip FOR UPDATE, replace $1,$2 with ?, replace GREATEST/CAST
  let sqliteText = text
    .replace(/FOR UPDATE/gi, '')
    .replace(/CAST\((.*?)\s+AS\s+DOUBLE PRECISION\)/gi, '$1')
    .replace(/GREATEST\(0,\s*([a-zA-Z0-9_]+)\s*-\s*\$(\d+)\)/gi, 'MAX(0, $1 - ?)')
    .replace(/\$(\d+)/g, '?');

  // execute statement
  try {
    if (/^\s*SELECT/i.test(sqliteText)) {
      const rows = sqliteDb.prepare(sqliteText).all(...params);
      return { rows: rows.map(r => ({ ...r })) };
    } else {
      const info = sqliteDb.prepare(sqliteText).run(...params);
      return { rows: [], rowCount: info.changes };
    }
  } catch (err) {
    throw err;
  }
}

// client interface for transactions
export async function getClient() {
  if (isPostgres) {
    return pool.connect();
  }

  // SQLite transaction client wrapper
  initSqlite();
  return {
    query: async (text, params = []) => query(text, params),
    release: () => {}
  };
}

// initialize database schema
export async function initSchema() {
  try {
    const client = await pool.connect();
    isPostgres = true;
    console.log('[Database] Connected to PostgreSQL successfully!');

    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(64) UNIQUE NOT NULL,
          category VARCHAR(64) NOT NULL,
          price NUMERIC(12, 2) NOT NULL,
          total_stock INT NOT NULL DEFAULT 0,
          reserved_stock INT NOT NULL DEFAULT 0,
          image_url TEXT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(64) PRIMARY KEY,
          order_number VARCHAR(64) UNIQUE NOT NULL,
          customer_name VARCHAR(255),
          customer_email VARCHAR(255),
          total_amount NUMERIC(12, 2) NOT NULL,
          status VARCHAR(32) NOT NULL,
          reserved_at BIGINT,
          expires_at BIGINT,
          paid_at BIGINT,
          cancelled_at BIGINT,
          failed_at BIGINT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id VARCHAR(64) PRIMARY KEY,
          order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id VARCHAR(64) NOT NULL REFERENCES products(id),
          product_name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL,
          unit_price NUMERIC(12, 2) NOT NULL,
          total_price NUMERIC(12, 2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(64) PRIMARY KEY,
          order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
          idempotency_key VARCHAR(128) UNIQUE NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          payment_method VARCHAR(64) NOT NULL,
          gateway_transaction_id VARCHAR(128),
          outcome VARCHAR(32) NOT NULL,
          error_message TEXT,
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory_audit_log (
          id VARCHAR(64) PRIMARY KEY,
          product_id VARCHAR(64) NOT NULL,
          product_name VARCHAR(255),
          action VARCHAR(32) NOT NULL,
          quantity_change INT NOT NULL,
          new_total_stock INT NOT NULL,
          new_reserved_stock INT NOT NULL,
          reference_id VARCHAR(128),
          reason TEXT,
          created_at BIGINT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_orders_status_expires ON orders(status, expires_at);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_audit_created ON inventory_audit_log(created_at DESC);
      `);
      await client.query('COMMIT');

      const countRes = await client.query('SELECT COUNT(*) as count FROM products');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        await seedDefaultProducts();
      }
    } finally {
      client.release();
    }
  } catch (err) {
    isPostgres = false;
    console.log('[Database] PostgreSQL not reachable on localhost:5432. Active SQLite fallback engaged (100% operational).');
    initSqlite();
  }
}

// seed sample products in sri lankan rupees
export async function seedDefaultProducts() {
  const now = Date.now();
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const p of sampleProducts) {
        await client.query(`
          INSERT INTO products (id, name, sku, category, price, total_stock, reserved_stock, image_url, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING;
        `, [p.id, p.name, p.sku, p.category, p.price, p.total_stock, p.reserved_stock, p.image_url, now, now]);

        await client.query(`
          INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
          VALUES ($1, $2, $3, 'CREATE', $4, $5, 0, 'SYSTEM-SEED', 'Initial catalog setup', $6);
        `, [uuidv4(), p.id, p.name, p.total_stock, p.total_stock, now]);
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  } else {
    initSqlite();
    for (const p of sampleProducts) {
      sqliteDb.prepare(`
        INSERT OR IGNORE INTO products (id, name, sku, category, price, total_stock, reserved_stock, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(p.id, p.name, p.sku, p.category, p.price, p.total_stock, p.reserved_stock, p.image_url, now, now);
    }
  }
}

// reset database back to original sample products
export async function resetDatabase() {
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE payments, order_items, orders, inventory_audit_log, products CASCADE;');
      await client.query('COMMIT');
      await seedDefaultProducts();
    } finally {
      client.release();
    }
  } else {
    initSqlite();
    sqliteDb.exec(`
      DELETE FROM payments;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM inventory_audit_log;
      DELETE FROM products;
    `);
    const now = Date.now();
    for (const p of sampleProducts) {
      sqliteDb.prepare(`
        INSERT INTO products (id, name, sku, category, price, total_stock, reserved_stock, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(p.id, p.name, p.sku, p.category, p.price, p.total_stock, p.reserved_stock, p.image_url, now, now);

      sqliteDb.prepare(`
        INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
        VALUES (?, ?, ?, 'CREATE', ?, ?, 0, 'SYSTEM-SEED', 'Initial catalog setup', ?);
      `).run(uuidv4(), p.id, p.name, p.total_stock, p.total_stock, now);
    }
  }
}

export function getDatabaseStatus() {
  return {
    engine: isPostgres ? 'PostgreSQL' : 'SQLite (Fallback)',
    isPostgres,
    connected: true
  };
}
