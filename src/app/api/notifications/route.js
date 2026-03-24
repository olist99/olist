import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ unread: 0, notifications: [] });

  // Ensure table exists by calling sendNotification infra (no-op)
  const [notifications, unreadRow] = await Promise.all([
    query(
      'SELECT * FROM cms_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    ).catch(() => []),
    query(
      'SELECT COUNT(*) AS c FROM cms_notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    ).catch(() => [{ c: 0 }]),
  ]);

  return NextResponse.json({
    unread: unreadRow[0]?.c || 0,
    notifications,
  });
}

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.action === 'mark_all_read') {
    await query('UPDATE cms_notifications SET is_read = 1 WHERE user_id = ?', [userId]).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'mark_read' && body.id) {
    await query('UPDATE cms_notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [body.id, userId]).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'clear_all') {
    await query('DELETE FROM cms_notifications WHERE user_id = ?', [userId]).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
