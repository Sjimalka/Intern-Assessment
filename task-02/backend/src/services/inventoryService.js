// Manages stock tracking, temporary reservations (10-min hold), and restock
// Supports both PostgreSQL database and in-memory fallback.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db/db');

// Load initial product data from JSON for fallback in-memory store
const productsFilePath = path.join(__dirname, '../data/products.json');
const rawProducts = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'));

// Fallback in-memory products store with tracked reservedStock
const memoryProducts = rawProducts.map(p => ({
  ...p,
  totalStock: p.stock,
  reservedStock: 0,
  get availableStock() {
    return Math.max(0, this.totalStock - this.reservedStock);
  }
}));

// Fallback in-memory reservations
const memoryReservations = new Map();

/**
 * Fetch products with optional filtering and search
 */
async function getProducts({ search = '', category = '', minPrice, maxPrice, inStock } = {}) {
  // Use PostgreSQL if connected
  if (db.isConnected()) {
    try {
      let sql = `
        SELECT id, name, category, price, rating, image_url AS "imageUrl",
               available_stock AS "availableStock", reserved_stock AS "reservedStock",
               total_stock AS "totalStock", description, specs, origin
        FROM products
        WHERE 1=1
      `;
      const values = [];
      let idx = 1;

      if (category && category !== 'All') {
        sql += ` AND LOWER(category) = LOWER($${idx++})`;
        values.push(category);
      }

      if (search && search.trim()) {
        sql += ` AND (LOWER(name) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR LOWER(category) LIKE $${idx})`;
        values.push(`%${search.toLowerCase().trim()}%`);
        idx++;
      }

      if (minPrice !== undefined && minPrice !== '') {
        sql += ` AND price >= $${idx++}`;
        values.push(Number(minPrice));
      }

      if (maxPrice !== undefined && maxPrice !== '') {
        sql += ` AND price <= $${idx++}`;
        values.push(Number(maxPrice));
      }

      if (inStock === 'true' || inStock === true) {
        sql += ` AND available_stock > 0`;
      }

      sql += ` ORDER BY id ASC`;

      const result = await db.query(sql, values);
      return result.rows;
    } catch (err) {
      console.warn('[Inventory PG Error, falling back to memory]:', err.message);
    }
  }

  // Fallback: In-memory filtering
  let list = memoryProducts.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    badge: p.badge,
    description: p.description,
    features: p.features,
    imageUrl: p.imageUrl,
    totalStock: p.totalStock,
    reservedStock: p.reservedStock,
    availableStock: p.availableStock
  }));

  if (category && category !== 'All') {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search.trim()) {
    const query = search.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  }

  if (minPrice !== undefined && minPrice !== '') {
    list = list.filter(p => p.price >= Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    list = list.filter(p => p.price <= Number(maxPrice));
  }

  if (inStock === 'true' || inStock === true) {
    list = list.filter(p => p.availableStock > 0);
  }

  return list;
}

/**
 * Get single product by ID
 */
async function getProductById(id) {
  if (db.isConnected()) {
    try {
      const res = await db.query(
        `SELECT id, name, category, price, rating, image_url AS "imageUrl",
                available_stock AS "availableStock", reserved_stock AS "reservedStock",
                total_stock AS "totalStock", description, specs, origin
         FROM products WHERE id = $1`,
        [id]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
      return null;
    } catch (err) {
      console.warn('[Inventory PG Error, falling back to memory]:', err.message);
    }
  }

  const p = memoryProducts.find(prod => prod.id === id);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    badge: p.badge,
    description: p.description,
    features: p.features,
    imageUrl: p.imageUrl,
    totalStock: p.totalStock,
    reservedStock: p.reservedStock,
    availableStock: p.availableStock
  };
}

/**
 * Reserve stock for items in cart before payment
 * Default TTL is 600 seconds (10 minutes)
 */
async function createReservation(items, ttlSeconds = 600) {
  const reservationId = 'res_' + crypto.randomUUID().slice(0, 8);
  const expiresAt = Date.now() + ttlSeconds * 1000;

  // Use PostgreSQL transaction if connected
  if (db.isConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const enrichedItems = [];
      for (const item of items) {
        const prodRes = await client.query(
          'SELECT * FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );

        if (prodRes.rows.length === 0) {
          throw new Error(`Product with ID "${item.productId}" was not found.`);
        }

        const product = prodRes.rows[0];
        const requestedQty = Number(item.quantity) || 1;
        if (requestedQty <= 0) {
          throw new Error(`Invalid quantity for "${product.name}".`);
        }

        if (product.available_stock < requestedQty) {
          throw new Error(
            `Sorry! Not enough stock for "${product.name}". Only ${product.available_stock} available right now.`
          );
        }

        // Lock stock
        const newReserved = product.reserved_stock + requestedQty;
        const newAvailable = Math.max(0, product.total_stock - newReserved);
        await client.query(
          'UPDATE products SET reserved_stock = $1, available_stock = $2 WHERE id = $3',
          [newReserved, newAvailable, product.id]
        );

        enrichedItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: requestedQty,
          imageUrl: product.image_url
        });
      }

      // Insert reservation
      await client.query(
        'INSERT INTO reservations (id, expires_at, ttl_seconds, status) VALUES ($1, $2, $3, $4)',
        [reservationId, expiresAt, ttlSeconds, 'ACTIVE']
      );

      // Insert reservation items
      for (const item of enrichedItems) {
        await client.query(
          'INSERT INTO reservation_items (reservation_id, product_id, quantity) VALUES ($1, $2, $3)',
          [reservationId, item.productId, item.quantity]
        );
      }

      await client.query('COMMIT');
      console.log(`[PostgreSQL Inventory] Created reservation ${reservationId} for ${enrichedItems.length} item(s).`);

      return {
        id: reservationId,
        items: enrichedItems,
        expiresAt,
        ttlSeconds,
        status: 'ACTIVE',
        createdAt: Date.now()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback: In-memory reservation
  const enrichedItems = [];
  for (const item of items) {
    const product = memoryProducts.find(p => p.id === item.productId);
    if (!product) {
      throw new Error(`Product with ID "${item.productId}" was not found.`);
    }

    const requestedQty = Number(item.quantity) || 1;
    if (requestedQty <= 0) {
      throw new Error(`Invalid quantity for "${product.name}".`);
    }

    if (product.availableStock < requestedQty) {
      throw new Error(
        `Sorry! Not enough stock for "${product.name}". Only ${product.availableStock} available right now.`
      );
    }

    enrichedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: requestedQty,
      imageUrl: product.imageUrl
    });
  }

  for (const item of enrichedItems) {
    const product = memoryProducts.find(p => p.id === item.productId);
    product.reservedStock += item.quantity;
  }

  const reservation = {
    id: reservationId,
    items: enrichedItems,
    expiresAt,
    ttlSeconds,
    status: 'ACTIVE',
    createdAt: Date.now()
  };

  memoryReservations.set(reservationId, reservation);
  console.log(`[Inventory] Reserved stock for reservation ${reservationId}. Expires in ${ttlSeconds}s.`);
  return reservation;
}

/**
 * Get an existing reservation and auto-expire if needed
 */
async function getReservation(reservationId) {
  if (db.isConnected()) {
    try {
      const res = await db.query(
        'SELECT id, expires_at AS "expiresAt", ttl_seconds AS "ttlSeconds", status FROM reservations WHERE id = $1',
        [reservationId]
      );
      if (res.rows.length === 0) return null;

      const reservation = res.rows[0];
      reservation.expiresAt = Number(reservation.expiresAt);

      // Fetch items
      const itemsRes = await db.query(
        `SELECT ri.quantity, p.id AS "productId", p.name, p.price, p.image_url AS "imageUrl"
         FROM reservation_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.reservation_id = $1`,
        [reservationId]
      );
      reservation.items = itemsRes.rows;

      // Auto-expire if time is up
      if (reservation.status === 'ACTIVE' && Date.now() > reservation.expiresAt) {
        await releaseReservation(reservationId, 'EXPIRED');
        reservation.status = 'EXPIRED';
      }

      return reservation;
    } catch (err) {
      console.warn('[Inventory PG Error, falling back to memory]:', err.message);
    }
  }

  const reservation = memoryReservations.get(reservationId);
  if (!reservation) return null;

  if (reservation.status === 'ACTIVE' && Date.now() > reservation.expiresAt) {
    expireMemoryReservation(reservation);
  }

  return reservation;
}

/**
 * Expire or release a reservation and return held stock
 */
async function releaseReservation(reservationId, newStatus = 'RELEASED') {
  if (db.isConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const reservation = res.rows[0];
      if (reservation.status === 'ACTIVE') {
        const itemsRes = await client.query('SELECT * FROM reservation_items WHERE reservation_id = $1', [reservationId]);
        for (const item of itemsRes.rows) {
          await client.query(
            `UPDATE products
             SET reserved_stock = GREATEST(0, reserved_stock - $1),
                 available_stock = total_stock - GREATEST(0, reserved_stock - $1)
             WHERE id = $2`,
            [item.quantity, item.product_id]
          );
        }
        await client.query('UPDATE reservations SET status = $1 WHERE id = $2', [newStatus, reservationId]);
        await client.query('COMMIT');
        return true;
      }

      await client.query('COMMIT');
      return false;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[Inventory PG Release Error]:', err.message);
      return false;
    } finally {
      client.release();
    }
  }

  const reservation = memoryReservations.get(reservationId);
  if (!reservation) return false;

  if (reservation.status === 'ACTIVE') {
    for (const item of reservation.items) {
      const product = memoryProducts.find(p => p.id === item.productId);
      if (product) {
        product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
      }
    }
    reservation.status = newStatus;
    return true;
  }
  return false;
}

function expireMemoryReservation(reservation) {
  if (reservation.status !== 'ACTIVE') return;
  for (const item of reservation.items) {
    const product = memoryProducts.find(p => p.id === item.productId);
    if (product) {
      product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
    }
  }
  reservation.status = 'EXPIRED';
}

/**
 * Commit reservation once payment succeeds
 */
async function commitReservation(reservationId) {
  if (db.isConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
      if (res.rows.length === 0) {
        throw new Error(`Reservation ${reservationId} not found.`);
      }

      const reservation = res.rows[0];
      if (reservation.status === 'EXPIRED') {
        throw new Error('Your reservation expired before payment completed. Please review your cart.');
      }
      if (reservation.status === 'RELEASED') {
        throw new Error('This checkout session was already released or cancelled.');
      }
      if (reservation.status === 'COMMITTED') {
        await client.query('COMMIT');
        return reservation;
      }

      const itemsRes = await client.query(
        `SELECT ri.quantity, p.id AS "productId", p.name, p.price, p.image_url AS "imageUrl"
         FROM reservation_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.reservation_id = $1`,
        [reservationId]
      );

      for (const item of itemsRes.rows) {
        await client.query(
          `UPDATE products
           SET total_stock = GREATEST(0, total_stock - $1),
               reserved_stock = GREATEST(0, reserved_stock - $1),
               available_stock = GREATEST(0, total_stock - $1) - GREATEST(0, reserved_stock - $1)
           WHERE id = $2`,
          [item.quantity, item.productId]
        );
      }

      await client.query('UPDATE reservations SET status = $1 WHERE id = $2', ['COMMITTED', reservationId]);
      await client.query('COMMIT');

      return {
        id: reservationId,
        items: itemsRes.rows,
        status: 'COMMITTED'
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback: In-memory commit
  const reservation = memoryReservations.get(reservationId);
  if (!reservation) {
    throw new Error(`Reservation ${reservationId} not found.`);
  }

  if (reservation.status === 'EXPIRED') {
    throw new Error('Your reservation expired before payment completed. Please review your cart.');
  }

  if (reservation.status === 'RELEASED') {
    throw new Error('This checkout session was already released or cancelled.');
  }

  if (reservation.status === 'COMMITTED') {
    return reservation;
  }

  for (const item of reservation.items) {
    const product = memoryProducts.find(p => p.id === item.productId);
    if (product) {
      product.totalStock = Math.max(0, product.totalStock - item.quantity);
      product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
    }
  }

  reservation.status = 'COMMITTED';
  console.log(`[Inventory] Successfully committed reservation ${reservationId}. Stock permanently updated.`);
  return reservation;
}

/**
 * Restore stock when an order is cancelled and refunded
 */
async function restoreStock(items) {
  if (db.isConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await client.query(
          `UPDATE products
           SET total_stock = total_stock + $1,
               available_stock = (total_stock + $1) - reserved_stock
           WHERE id = $2`,
          [Number(item.quantity), item.productId]
        );
      }
      await client.query('COMMIT');
      console.log(`[PostgreSQL Inventory] Restored stock for ${items.length} item(s).`);
      return;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PostgreSQL Inventory Restore Error]:', err.message);
    } finally {
      client.release();
    }
  }

  for (const item of items) {
    const product = memoryProducts.find(p => p.id === item.productId);
    if (product) {
      product.totalStock += Number(item.quantity);
      console.log(`[Inventory] Restored ${item.quantity}x "${product.name}". Total stock now: ${product.totalStock}`);
    }
  }
}

// Background cleanup worker for expired reservations
setInterval(async () => {
  const now = Date.now();
  if (db.isConnected()) {
    try {
      const expiredRes = await db.query(
        'SELECT id FROM reservations WHERE status = $1 AND expires_at < $2',
        ['ACTIVE', now]
      );
      for (const row of expiredRes.rows) {
        await releaseReservation(row.id, 'EXPIRED');
      }
    } catch (_) {}
  }

  for (const reservation of memoryReservations.values()) {
    if (reservation.status === 'ACTIVE' && now > reservation.expiresAt) {
      expireMemoryReservation(reservation);
    }
  }
}, 10000);

module.exports = {
  getProducts,
  getProductById,
  createReservation,
  getReservation,
  releaseReservation,
  commitReservation,
  restoreStock
};
