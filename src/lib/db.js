import mysql from 'mysql2/promise';

/**
 * MySQL connection pool for Arcturus Morningstar DB
 * Uses the same database that the emulator connects to
 */

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'arcturus',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
    });
  }
  return pool;
}

/**
 * Execute a query with params
 */
export async function query(sql, params = []) {
  const db = getPool();
  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * Get single row
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Get scalar value
 */
export async function queryScalar(sql, params = []) {
  const row = await queryOne(sql, params);
  return row ? Object.values(row)[0] : null;
}
