import 'dotenv/config';
import { resetDatabase, pool } from '../db.js';

async function main() {
  console.log('[PostgreSQL] Resetting database to seed products...');
  try {
    await resetDatabase();
    console.log('[PostgreSQL] Database reset successfully!');
  } catch (err) {
    console.error('[PostgreSQL] Error resetting database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
