import 'dotenv/config';
import { initSchema, pool, testConnection } from '../db.js';

async function main() {
  console.log('[PostgreSQL] Initializing database schema...');
  try {
    const conn = await testConnection();
    console.log(`[PostgreSQL] Connection verified. Server time: ${conn.timestamp}`);
    await initSchema();
    console.log('[PostgreSQL] Database tables and indexes created successfully!');
  } catch (err) {
    console.error('[PostgreSQL] Error connecting to database:', err.message || err.code || err);
    console.error('[PostgreSQL] Please ensure PostgreSQL is running and check your credentials in backend/.env');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
