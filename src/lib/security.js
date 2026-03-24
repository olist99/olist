/**
 * OCMS Security Module
 * Centralized input validation, sanitization, rate limiting, and SQL safety.
 */

// ── Whitelist maps for column names (prevents SQL injection via interpolation) ──
const VALID_CURRENCY_COLUMNS = { credits: 'credits', pixels: 'pixels', points: 'points' };
const VALID_LEADERBOARD_COLUMNS = { credits: 'credits', pixels: 'pixels', points: 'points' };
const VALID_SORT_COLUMNS = {
  newest: 'ml.created_at DESC',
  cheapest: 'ml.price ASC',
  expensive: 'ml.price DESC',
  name: 'ml.item_name ASC',
};

/**
 * Get a safe SQL column name from a whitelist.
 * Returns null if the value isn't in the allowed map.
 */
export function safeCurrencyColumn(input) {
  return VALID_CURRENCY_COLUMNS[input] || null;
}

export function safeLeaderboardColumn(input) {
  return VALID_LEADERBOARD_COLUMNS[input] || null;
}

export function safeSortOrder(input) {
  return VALID_SORT_COLUMNS[input] || VALID_SORT_COLUMNS.newest;
}

// ── Input sanitization ──

/**
 * Strip HTML tags and dangerous characters from user input.
 * Use for any text that will be displayed back to users.
 */
export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')          // strip HTML angle brackets
    .replace(/javascript:/gi, '')  // strip JS protocol
    .replace(/on\w+=/gi, '')       // strip inline event handlers
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a username — only alphanumeric, underscore, hyphen, dot.
 */
export function sanitizeUsername(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 15);
}

/**
 * Sanitize email — basic format check.
 */
export function sanitizeEmail(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().slice(0, 254);
  // Basic RFC 5322 check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '';
  return trimmed;
}

/**
 * Validate and clamp an integer within safe bounds.
 */
export function safeInt(input, min = 0, max = 2147483647) {
  const n = parseInt(input);
  if (isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

/**
 * Validate a positive bet amount.
 */
export function safeBet(input, maxBet = 1000000) {
  const n = safeInt(input, 1, maxBet);
  if (n === null || n < 1) return null;
  return n;
}

/**
 * Validate pagination params.
 */
export function safePage(input, maxPage = 1000) {
  return safeInt(input, 1, maxPage) || 1;
}

export function safePerPage(input, max = 100) {
  return safeInt(input, 1, max) || 20;
}

// ── Rate Limiting (DB-backed, shared across all worker processes) ──
//
// FIX #3: The old in-memory Map was per-worker — with N Next.js workers users
// effectively got N× the rate limit. This implementation uses a shared MySQL
// table so all workers see the same counters.
//
// The table is created automatically on first use. checkRateLimit is now async.

let rlTableReady = false;

async function ensureRLTable() {
  if (rlTableReady) return;
  // Lazy import avoids circular dependency (db → security → db)
  const { query } = await import('./db.js');
  await query(`
    CREATE TABLE IF NOT EXISTS cms_rate_limits (
      rl_key       VARCHAR(255) NOT NULL PRIMARY KEY,
      count        INT UNSIGNED NOT NULL DEFAULT 1,
      window_start INT UNSIGNED NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  rlTableReady = true;
  // Purge rows older than 1 hour on startup — runs once per worker lifecycle
  query('DELETE FROM cms_rate_limits WHERE window_start < UNIX_TIMESTAMP() - 3600').catch(() => {});
}

/**
 * Check rate limit. Returns { ok, remaining, retryAfter }.
 * NOW ASYNC — all callers must await this.
 *
 * @param {string} key         - Unique key (e.g. "login:username" or "slots:42")
 * @param {number} maxRequests - Max requests allowed per window
 * @param {number} windowMs    - Window duration in milliseconds
 */
export async function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  try {
    await ensureRLTable();
    const { query } = await import('./db.js');

    const windowSec = Math.ceil(windowMs / 1000);
    const now = Math.floor(Date.now() / 1000);

    // Single atomic round-trip:
    // • If no row exists → INSERT with count=1
    // • If row exists and window has expired → reset count to 1, update window_start
    // • If row exists and window is current → increment count
    await query(`
      INSERT INTO cms_rate_limits (rl_key, count, window_start)
      VALUES (?, 1, ?)
      ON DUPLICATE KEY UPDATE
        count        = IF(? - window_start >= ?, 1,                      count + 1),
        window_start = IF(? - window_start >= ?, VALUES(window_start), window_start)
    `, [key, now, now, windowSec, now, windowSec]);

    const row = await query(
      'SELECT count, window_start FROM cms_rate_limits WHERE rl_key = ?',
      [key]
    ).then(r => r[0] ?? null);

    const count = row?.count ?? 1;

    if (count > maxRequests) {
      const retryAfter = Math.max(1, (row.window_start + windowSec) - now);
      return { ok: false, remaining: 0, retryAfter };
    }

    return { ok: true, remaining: Math.max(0, maxRequests - count) };

  } catch (err) {
    // If the DB is down, fail open rather than blocking all requests.
    // Log the error so ops can catch it, but don't bring the site down.
    console.error('[checkRateLimit] DB error, failing open:', err?.message);
    return { ok: true, remaining: maxRequests };
  }
}

// ── Security headers helper ──

export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

/**
 * Validate that a value is strictly one of the allowed values.
 */
export function oneOf(value, allowed, fallback = null) {
  return allowed.includes(value) ? value : fallback;
}

/**
 * Escape HTML entities for safe display (extra safety layer).
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
