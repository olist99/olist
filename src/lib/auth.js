import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { query, queryOne } from './db';

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW || JWT_SECRET_RAW === 'fallback-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET must be set in production! Generate one: openssl rand -hex 32');
  }
  console.warn('WARNING: Using default JWT_SECRET — set JWT_SECRET in .env for security!');
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW || 'fallback-secret-change-me-dev-only');
const COOKIE_NAME = 'ocms_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days hard expiry
const ROTATE_AFTER  = 60 * 60 * 24;       // re-issue token after 24 hours

/**
 * Ensure the cms_token_version table exists.
 * One row per user — bumping the version instantly invalidates all existing tokens.
 */
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

/**
 * Get (or create) the current token version for a user.
 */
async function getTokenVersion(userId) {
  await ensureTokenTable();
  const row = await queryOne(
    'SELECT version FROM cms_token_version WHERE user_id = ?',
    [userId]
  ).catch(() => null);
  if (row) return row.version;
  // First login — create a version row
  await query(
    'INSERT IGNORE INTO cms_token_version (user_id, version) VALUES (?, 1)',
    [userId]
  ).catch(() => {});
  return 1;
}

/**
 * Bump the token version for a user, instantly invalidating all existing tokens.
 * Call this on logout and password change.
 */
export async function invalidateUserTokens(userId) {
  await ensureTokenTable();
  await query(`
    INSERT INTO cms_token_version (user_id, version, updated_at)
    VALUES (?, 1, NOW())
    ON DUPLICATE KEY UPDATE version = version + 1, updated_at = NOW()
  `, [userId]).catch(() => {});
}

/**
 * Create a signed JWT token for a user, embedding the current token version.
 */
export async function createToken(userId) {
  const version = await getTokenVersion(userId);
  return new SignJWT({ userId, ver: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token.
 * Also validates the token version against the DB — returns null if invalidated.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload?.userId) return null;

    // Check token version — if it's been bumped (logout/password change), reject
    const currentVersion = await getTokenVersion(payload.userId);
    if (payload.ver !== currentVersion) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie
 */
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

/**
 * Clear the session cookie and invalidate the token version.
 * This ensures the old token cannot be reused even if someone has it cached.
 */
export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      // Verify without version check so we can get the userId to invalidate
      const { payload } = await jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
      if (payload?.userId) {
        await invalidateUserTokens(payload.userId);
      }
    } catch {}
  }
  cookieStore.delete(COOKIE_NAME, { path: '/' });
}

/**
 * Get current session user ID from cookie.
 * Automatically rotates the token if it is older than ROTATE_AFTER seconds.
 * Returns { userId, rotatedToken } — rotatedToken is set if a new token was issued.
 */
export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  // Rotate if token is older than 24 hours
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

/**
 * Get the full current user from DB
 */
export async function getCurrentUser() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return null;

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

    return user;
  } catch (e) {
    console.error('getCurrentUser error:', e.message);
    return null;
  }
}

/**
 * Hash password (Arcturus uses bcrypt)
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against Arcturus hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate SSO ticket for Arcturus client connection
 */
export async function generateSSOTicket(userId) {
  const ticket = 'OCMS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
  await query('UPDATE users SET auth_ticket = ? WHERE id = ?', [ticket, userId]);
  return ticket;
}
