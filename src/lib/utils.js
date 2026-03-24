/**
 * OCMS utility functions
 */

export function avatarUrl(look, direction = 2, size = 'l', gesture = 'sml', headOnly = false) {
  const base = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';
  const params = new URLSearchParams({
    figure: look || 'hr-115-42.hd-190-1.ch-215-62.lg-285-91.sh-290-62',
    direction: String(direction),
    head_direction: String(direction),
    size,
    gesture,
  });
  if (headOnly) params.set('headonly', '1');
  return `${base}?${params.toString()}`;
}

export function badgeUrl(code) {
  const base = process.env.NEXT_PUBLIC_BADGE_URL || 'https://images.habbo.com/c_images/Badgesbig/';
  return `${base}${code}.gif`;
}

export function furniUrl(itemName) {
  const base = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';
  return `${base}${itemName}_icon.png`;
}

/**
 * Parse a UTC datetime string from the DB into a JS Date.
 * Handles "2026-03-18 14:00:00", "2026-03-18 14:00:00 UTC", ISO strings.
 */
export function parseUtc(dateStr) {
  if (dateStr === null || dateStr === undefined || dateStr === '') return null;
  if (typeof dateStr === 'number') return new Date(dateStr * 1000);
  // Numeric string unix timestamp e.g. "1711234567"
  if (/^\d{9,11}$/.test(String(dateStr).trim())) return new Date(Number(dateStr) * 1000);
  const s = dateStr.toString().trim().replace(' UTC', '').replace(' ', 'T');
  return new Date(s.endsWith('Z') ? s : s + 'Z');
}

/**
 * Format a UTC datetime string into the user's local timezone.
 */
export function formatUtcDate(dateStr, opts) {
  const d = parseUtc(dateStr);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleString(undefined, opts || {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Time ago helper — correctly parses UTC strings from DB
 */
export function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const then = parseUtc(dateStr);
  if (!then || isNaN(then)) return 'Never';
  const seconds = Math.floor((new Date() - then) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
  if (seconds < 31536000) return Math.floor(seconds / 2592000) + 'mo ago';
  return Math.floor(seconds / 31536000) + 'y ago';
}

export function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

export function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function truncate(str, len = 100) {
  if (!str || str.length <= len) return str || '';
  return str.substring(0, len) + '...';
}

export function siteName() {
  return process.env.NEXT_PUBLIC_SITE_NAME || 'OCMS';
}

export function unixToDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export const ICON = {
  coin: '/images/coin.png', ducket: '/images/ducket.png',
  diamond: '/images/diamond.png', gotw: '/images/eventpoint.png',
  home: '/images/nav-home.png', leaderboard: '/images/nav-leaderboard.png',
  online: '/images/nav-online.png', marketplace: '/images/nav-marketplace.png',
  rares: '/images/nav-rares.png', shop: '/images/nav-shop.png',
  staff: '/images/nav-staff.png', profile: '/images/nav-profile.png',
  users: '/images/icon-users.png', news: '/images/icon-news.png',
  chart: '/images/icon-chart.png', settings: '/images/icon-settings.png',
  logout: '/images/icon-logout.png', housekeeping: '/images/icon-housekeeping.png',
};

export function iconImg(key, size = 16) {
  const src = ICON[key] || key;
  return { src, width: size, height: size, style: { imageRendering: 'pixelated', verticalAlign: 'middle' } };
}

export const CURRENCIES = {
  credits:  { label: 'Credits',  color: '#bda75e', icon: '/images/coin.png' },
  pixels:   { label: 'Duckets',  color: '#9a65af', icon: '/images/ducket.png' },
  points:   { label: 'Diamonds', color: '#7eb4a9', icon: '/images/diamond.png' },
  gotw:     { label: 'GOTW',     color: '#ad5460', icon: '/images/eventpoint.png' },
};

export const CURRENCY_ICONS = {
  credits: '/images/coin.png',
  pixels:  '/images/ducket.png',
  points:  '/images/diamond.png',
};

export const RANK_COLORS = {
  1: '#8b949e', 2: '#f5a623', 3: '#5bc0de',
  4: '#3b82f6', 5: '#8b5cf6', 6: '#ef4444', 7: '#4ade80',
};

export const RANK_ICONS = {
  7: '/images/rank-owner.png', 6: '/images/rank-admin.png',
  5: '/images/rank-senior.png', 4: '/images/rank-mod.png',
  3: '/images/rank-guide.png', 2: '/images/rank-vip.png',
  1: '/images/rank-member.png',
};
