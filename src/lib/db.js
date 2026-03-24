import mysql from 'mysql2/promise';

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
      // FIX #12: Raised from 10 → 25. With gambling, marketplace, auction, and
      // active users all hitting the DB concurrently, 10 connections exhausts
      // quickly and causes silent "Too many connections" crashes. 20–25 is safer.
      // Set via DB_CONNECTION_LIMIT env var to tune per deployment.
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '25'),
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
      connectTimeout: 3000,
      dateStrings: true,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const db = getPool();
  const [rows] = await db.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function queryScalar(sql, params = []) {
  const row = await queryOne(sql, params);
  return row ? Object.values(row)[0] : null;
}
