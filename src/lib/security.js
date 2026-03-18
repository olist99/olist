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

// ── Rate Limiting (in-memory, per IP/userId) ──

const rateLimitStore = new Map();
const CLEANUP_INTERVAL = 60000; // clean every 60s

// Auto-cleanup old entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now - entry.windowStart > 120000) rateLimitStore.delete(key);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check rate limit. Returns { ok, remaining, retryAfter }.
 * @param {string} key - Unique key (e.g., "login:192.168.1.1" or "bet:123")
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(key, entry);
    return { ok: true, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: maxRequests - entry.count };
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
