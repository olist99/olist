import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { query, queryOne } from './db';
import { randomBytes } from 'crypto';

const JWT_SECRET_RAW = process.env.JWT_SECRET;
// SECURITY: Never allow a missing secret — a public fallback makes every session forgeable.
if (!JWT_SECRET_RAW) {
  throw new Error(
    '[auth] JWT_SECRET environment variable is required. ' +
    'Set it to a long random string in your .env file.'
  );
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE_NAME    = 'ocms_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const ROTATE_AFTER   = 60 * 60 * 6;       // rotate every 6 hours
const SSO_TTL        = 30;                 // SSO ticket expires in 30s

let tokenTableEnsured = false;
async function ensureTokenTable() {
  if (tokenTableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cms_token_version (
        user_id    INT PRIMARY KEY,
        version    INT NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL DEFAULT NOW()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tokenTableEnsured = true;
  } catch {}
}

async function getTokenVersion(userId) {
  await ensureTokenTable();
  const row = await queryOne('SELECT version FROM cms_token_version WHERE user_id = ?', [userId]).catch(() => null);
  if (row) return row.version;
  await query('INSERT IGNORE INTO cms_token_version (user_id, version) VALUES (?, 1)', [userId]).catch(() => {});
  return 1;
}

export async function invalidateUserTokens(userId) {
  await ensureTokenTable();
  await query(`
    INSERT INTO cms_token_version (user_id, version, updated_at) VALUES (?, 1, NOW())
    ON DUPLICATE KEY UPDATE version = version + 1, updated_at = NOW()
  `, [userId]).catch(() => {});
}

export async function createToken(userId) {
  const version = await getTokenVersion(userId);
  return new SignJWT({ userId, ver: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload?.userId) return null;
    const currentVersion = await getTokenVersion(payload.userId);
    if (payload.ver !== currentVersion) return null;
    return payload;
  } catch { return null; }
}

export async function setSession(userId) {
  const token = await createToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https'),
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
      if (payload?.userId) await invalidateUserTokens(payload.userId);
    } catch {}
  }
  cookieStore.delete(COOKIE_NAME, { path: '/' });
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.userId) return null;
  // Rotate token if older than 6 hours
  const age = Math.floor(Date.now() / 1000) - (payload.iat || 0);
  if (age > ROTATE_AFTER) {
    try {
      const newToken = await createToken(payload.userId);
      cookieStore.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https'),
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
    } catch {}
  }
  return payload.userId;
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // Try with shop_tokens — falls back gracefully if column doesn't exist yet
  try {
    const user = await queryOne(`
      SELECT u.id, u.username, u.mail, u.look, u.motto, u.credits,
             u.pixels, u.points, u.\`rank\`, u.online,
             u.last_online, u.account_created, u.ip_register, u.ip_current,
             u.auth_ticket, u.gotw,
             COALESCE(u.shop_tokens, 0) AS shop_tokens,
             p.rank_name, p.badge AS rank_badge
      FROM users u
      LEFT JOIN permissions p ON p.id = u.\`rank\`
      WHERE u.id = ?
    `, [userId]);
    return user;
  } catch (e) {
    // If shop_tokens column doesn't exist yet, retry without it
    if (e.message && e.message.includes('shop_tokens')) {
      try {
        const user = await queryOne(`
          SELECT u.id, u.username, u.mail, u.look, u.motto, u.credits,
                 u.pixels, u.points, u.\`rank\`, u.online,
                 u.last_online, u.account_created, u.ip_register, u.ip_current,
                 u.auth_ticket, u.gotw,
                 p.rank_name, p.badge AS rank_badge
          FROM users u
          LEFT JOIN permissions p ON p.id = u.\`rank\`
          WHERE u.id = ?
        `, [userId]);
        if (user) user.shop_tokens = 0;
        return user;
      } catch (e2) {
        console.error('getCurrentUser fallback error:', e2.message);
        return null;
      }
    }
    console.error('getCurrentUser error:', e.message);
    return null;
  }
}

export async function hashPassword(password) { return bcrypt.hash(password, 10); }
export async function verifyPassword(password, hash) { return bcrypt.compare(password, hash); }

// Cryptographically secure SSO ticket — expires in 30 seconds, one-time use
export async function generateSSOTicket(userId) {
  const ticket  = 'OCMS-' + randomBytes(32).toString('hex');
  await query('UPDATE users SET auth_ticket = ? WHERE id = ?', [ticket, userId]);
  await query('UPDATE users SET auth_ticket_expires = ? WHERE id = ?',
    [new Date(Date.now() + SSO_TTL * 1000), userId]).catch(() => {});
  return ticket;
}