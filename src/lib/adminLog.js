import { query } from './db';

/**
 * Log an admin action to cms_admin_log.
 * Call this from any admin API route after a significant action.
 */
export async function logAdminAction({ adminId, adminName, action, targetType = null, targetId = null, details = null, ip = null }) {
  try {
    await query(
      'INSERT INTO cms_admin_log (admin_id, admin_name, action, target_type, target_id, details, ip, created_at) VALUES (?,?,?,?,?,?,?,NOW())',
      [adminId, adminName || 'Unknown', action, targetType, targetId ?? null, details ? String(details).slice(0, 1000) : null, ip]
    );
  } catch {
    // Never throw — logging must be non-blocking
  }
}

/**
 * Extract IP from a Next.js request object.
 */
export function getRequestIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}
