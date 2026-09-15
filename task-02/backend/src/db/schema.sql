-- Serendib Green Store - PostgreSQL Schema

-- 1. Products table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category VARCHAR(100) NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  image_url TEXT,
  available_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  total_stock INTEGER NOT NULL DEFAULT 0,
  specs JSONB,
  origin VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stock reservations (10-minute hold TTL)
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(64) PRIMARY KEY,
  expires_at BIGINT NOT NULL,
  ttl_seconds INTEGER NOT NULL DEFAULT 600,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reservation line items
CREATE TABLE IF NOT EXISTS reservation_items (
  id SERIAL PRIMARY KEY,
  reservation_id VARCHAR(64) REFERENCES reservations(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id),
  quantity INTEGER NOT NULL
);

-- 4. Customer orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  reservation_id VARCHAR(64),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(64),
  delivery_address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PAID',
  payment_id VARCHAR(64),
  payment_method VARCHAR(64),
  refund_id VARCHAR(64),
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64),
  product_name VARCHAR(255),
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  image_url TEXT
);

-- 6. Idempotency cache table for duplicate payment protection
CREATE TABLE IF NOT EXISTS idempotency_records (
  key VARCHAR(128) PRIMARY KEY,
  order_id VARCHAR(64),
  response_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
