import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { safeInt } from '@/lib/security';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user || user.rank < 6) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const url = new URL(request.url);
  const page = Math.max(1, safeInt(url.searchParams.get('page'), 1) || 1);
  const adminFilter = safeInt(url.searchParams.get('admin_id'), 0) || null;
  const actionFilter = (url.searchParams.get('action') || '').trim();
  const offset = (page - 1) * 50;

  const conditions = [];
  const params = [];
  if (adminFilter) { conditions.push('admin_id = ?'); params.push(adminFilter); }
  if (actionFilter) { conditions.push('action LIKE ?'); params.push(`%${actionFilter}%`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const [logs, countRow, admins] = await Promise.all([
    query(
      `SELECT l.*, u.look FROM cms_admin_log l LEFT JOIN users u ON u.id = l.admin_id ${where} ORDER BY l.created_at DESC LIMIT 50 OFFSET ?`,
      [...params, offset]
    ).catch(() => []),
    query(`SELECT COUNT(*) AS c FROM cms_admin_log ${where}`, params).catch(() => [{ c: 0 }]),
    query('SELECT DISTINCT admin_id, admin_name FROM cms_admin_log ORDER BY admin_name').catch(() => []),
  ]);

  return NextResponse.json({ logs, total: countRow[0]?.c || 0, page, admins });
}
