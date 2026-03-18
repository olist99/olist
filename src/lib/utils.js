/**
 * OCMS utility functions
 */

/**
 * Build Habbo avatar image URL
 */
export function avatarUrl(look, direction = 2, size = 'l', gesture = 'sml', headOnly = false) {
  const base = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';
  const params = new URLSearchParams({
    figure: look || 'hr-115-42.hd-190-1.ch-215-62.lg-285-91.sh-290-62',
    direction: String(direction),
    head_direction: String(direction),
    size: size,
    gesture: gesture,
  });
  if (headOnly) params.set('headonly', '1');
  return `${base}?${params.toString()}`;
}

/**
 * Badge image URL
 */
export function badgeUrl(code) {
  const base = process.env.NEXT_PUBLIC_BADGE_URL || 'https://images.habbo.com/c_images/Badgesbig/';
  return `${base}${code}.gif`;
}

/**
 * Furni image URL
 */
export function furniUrl(itemName) {
  const base = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';
  return `${base}${itemName}_icon.png`;
}

/**
 * Time ago helper
 */
export function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const now = new Date();
  const date = new Date(dateStr);
  // Arcturus stores account_created as unix timestamp
  const then = typeof dateStr === 'number' ? new Date(dateStr * 1000) : date;
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
  if (seconds < 31536000) return Math.floor(seconds / 2592000) + 'mo ago';
  return Math.floor(seconds / 31536000) + 'y ago';
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

/**
 * Sanitize string for display
 */
export function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Truncate string
 */
export function truncate(str, len = 100) {
  if (!str || str.length <= len) return str || '';
  return str.substring(0, len) + '...';
}

/**
 * Site name helper
 */
export function siteName() {
  return process.env.NEXT_PUBLIC_SITE_NAME || 'OCMS';
}

/**
 * Unix timestamp to date string (Arcturus uses unix timestamps)
 */
export function unixToDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/**
 * Image-based icons — all sourced from /images/ folder
 * Place your icon PNGs in public/images/
 */
export const ICON = {
  // Currency
  coin: '/images/coin.png',
  ducket: '/images/ducket.png',
  diamond: '/images/diamond.png',
  gotw: '/images/eventpoint.png',
  // Navigation
  home: '/images/nav-home.png',
  leaderboard: '/images/nav-leaderboard.png',
  online: '/images/nav-online.png',
  marketplace: '/images/nav-marketplace.png',
  rares: '/images/nav-rares.png',
  shop: '/images/nav-shop.png',
  staff: '/images/nav-staff.png',
  profile: '/images/nav-profile.png',
  // UI
  users: '/images/icon-users.png',
  news: '/images/icon-news.png',
  chart: '/images/icon-chart.png',
  settings: '/images/icon-settings.png',
  logout: '/images/icon-logout.png',
  housekeeping: '/images/icon-housekeeping.png',
};

/**
 * Inline icon img tag helper — returns an img HTML string for use in JSX
 */
export function iconImg(key, size = 16) {
  const src = ICON[key] || key;
  return { src, width: size, height: size, style: { imageRendering: 'pixelated', verticalAlign: 'middle' } };
}

/**
 * Currency config for display
 */
export const CURRENCIES = {
  credits:  { label: 'Credits',  color: '#bda75e', icon: '/images/coin.png' },
  pixels:   { label: 'Duckets', color: '#9a65af', icon: '/images/ducket.png' },
  points:   { label: 'Diamonds', color: '#7eb4a9', icon: '/images/diamond.png' },
  gotw:     { label: 'GOTW',    color: '#ad5460', icon: '/images/eventpoint.png' },
};

export const CURRENCY_ICONS = {
  credits: '/images/coin.png',
  pixels: '/images/ducket.png',
  points: '/images/diamond.png',
};

/**
 * Rank color mapping for Arcturus ranks
 */
export const RANK_COLORS = {
  1: '#8b949e',  // Member
  2: '#f5a623',  // VIP
  3: '#5bc0de',  // Guide / Trial Mod
  4: '#3b82f6',  // Moderator
  5: '#8b5cf6',  // Senior Mod
  6: '#ef4444',  // Admin
  7: '#4ade80',  // Owner
};

export const RANK_ICONS = {
  7: '/images/rank-owner.png',
  6: '/images/rank-admin.png',
  5: '/images/rank-senior.png',
  4: '/images/rank-mod.png',
  3: '/images/rank-guide.png',
  2: '/images/rank-vip.png',
  1: '/images/rank-member.png',
};
