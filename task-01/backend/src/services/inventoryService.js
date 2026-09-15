import { pool, getClient } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// handles product data and inventory counts
export const inventoryService = {
  // get all products and calculate available stock (total minus reserved)
  async getAllProducts() {
    const res = await pool.query(`
      SELECT 
        id, 
        name, 
        sku, 
        category, 
        CAST(price AS DOUBLE PRECISION) AS price, 
        total_stock, 
        reserved_stock, 
        (total_stock - reserved_stock) AS available_stock,
        image_url,
        created_at,
        updated_at
      FROM products
      ORDER BY name ASC;
    `);
    return res.rows;
  },

  // find a single product by its id
  async getProductById(id) {
    const res = await pool.query(`
      SELECT 
        id, 
        name, 
        sku, 
        category, 
        CAST(price AS DOUBLE PRECISION) AS price, 
        total_stock, 
        reserved_stock, 
        (total_stock - reserved_stock) AS available_stock,
        image_url,
        created_at,
        updated_at
      FROM products
      WHERE id = $1;
    `, [id]);
    return res.rows[0] || null;
  },

  // insert a new product and add a log entry
  async createProduct({ name, sku, category, price, total_stock = 0, image_url = '' }) {
    const id = 'prod_' + uuidv4().substring(0, 8);
    const now = Date.now();
    const parsedStock = Math.max(0, parseInt(total_stock, 10) || 0);
    const parsedPrice = Math.max(0, parseFloat(price) || 0);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(`
        INSERT INTO products (id, name, sku, category, price, total_stock, reserved_stock, image_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9);
      `, [id, name, sku, category || 'General', parsedPrice, parsedStock, image_url, now, now]);

      // save record to audit log
      await client.query(`
        INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
        VALUES ($1, $2, $3, 'CREATE', $4, $5, 0, 'MANUAL_CREATE', 'Product added to catalog', $6);
      `, [uuidv4(), id, name, parsedStock, parsedStock, now]);

      await client.query('COMMIT');
      return this.getProductById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // update product details or adjust stock count
  async updateProduct(id, { name, sku, category, price, total_stock, image_url }) {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error('Product not found');
    }

    const now = Date.now();
    const newStock = total_stock !== undefined ? Math.max(0, parseInt(total_stock, 10)) : existing.total_stock;
    const newPrice = price !== undefined ? Math.max(0, parseFloat(price)) : existing.price;

    // don't allow lowering stock below what people are currently checking out
    if (newStock < existing.reserved_stock) {
      throw new Error(`Cannot lower total stock (${newStock}) below current active reservations (${existing.reserved_stock}).`);
    }

    const stockDiff = newStock - existing.total_stock;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE products 
        SET 
          name = COALESCE($1, name),
          sku = COALESCE($2, sku),
          category = COALESCE($3, category),
          price = $4,
          total_stock = $5,
          image_url = COALESCE($6, image_url),
          updated_at = $7
        WHERE id = $8;
      `, [
        name ?? existing.name,
        sku ?? existing.sku,
        category ?? existing.category,
        newPrice,
        newStock,
        image_url ?? existing.image_url,
        now,
        id
      ]);

      // log restock if quantity changed
      if (stockDiff !== 0) {
        await client.query(`
          INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
          VALUES ($1, $2, $3, 'RESTOCK', $4, $5, $6, 'MANUAL_UPDATE', 'Stock updated via admin', $7);
        `, [uuidv4(), id, name || existing.name, stockDiff, newStock, existing.reserved_stock, now]);
      }

      await client.query('COMMIT');
      return this.getProductById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // delete a product (only allowed if no items are locked in checkout)
  async deleteProduct(id) {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.reserved_stock > 0) {
      throw new Error('Cannot delete product with active checkout reservations');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM products WHERE id = $1;', [id]);
      await client.query(`
        INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
        VALUES ($1, $2, $3, 'DELETE', $4, 0, 0, 'MANUAL_DELETE', 'Product deleted', $5);
      `, [uuidv4(), id, product.name, -product.total_stock, Date.now()]);

      await client.query('COMMIT');
      return { success: true, id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // fetch recent inventory changes
  async getAuditLogs(limit = 100) {
    const res = await pool.query(`
      SELECT * FROM inventory_audit_log
      ORDER BY created_at DESC
      LIMIT $1;
    `, [limit]);
    return res.rows;
  }
};
