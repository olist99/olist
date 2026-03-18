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
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a JWT token for a user
 */
export async function createToken(userId) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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
 * Clear the session cookie
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('ocms_session', { path: '/' }); // ✅ matches your cookie name

}

/**
 * Get current session user ID from cookie
 */
export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

/**
 * Get the full current user from DB
 * Uses Arcturus `users` table schema
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
 * Arcturus Morningstar stores bcrypt hashes
 */
export async function verifyPassword(password, hash) {
  // Arcturus uses standard bcrypt
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
