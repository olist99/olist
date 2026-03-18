export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
import { sendNotification } from '@/lib/notifications';

export async function GET(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'feed';

  if (type === 'feed') {
    const page = Math.max(1, safeInt(url.searchParams.get('page'), 1) || 1);
    const offset = (page - 1) * 20;
    const photos = await query(`
      SELECT p.id, p.user_id, p.photo_url, p.room_name, p.created_at,
             p.likes, u.username, u.look,
             (SELECT COUNT(*) FROM cms_camera_likes l WHERE l.photo_id = p.id) AS like_count
      FROM cms_camera_photos p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 20 OFFSET ?
    `, [offset]).catch(() => []);
    return NextResponse.json({ photos });
  }

  if (type === 'my') {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ photos: [] });
    const photos = await query(`
      SELECT p.id, p.photo_url, p.room_name, p.created_at,
             (SELECT COUNT(*) FROM cms_camera_likes l WHERE l.photo_id = p.id) AS like_count
      FROM cms_camera_photos p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC LIMIT 50
    `, [user.id]).catch(() => []);
    return NextResponse.json({ photos });
  }

  if (type === 'user') {
    const userId = safeInt(url.searchParams.get('user_id'), 1);
    if (!userId) return NextResponse.json({ photos: [] });
    const photos = await query(`
      SELECT p.id, p.photo_url, p.room_name, p.created_at,
             (SELECT COUNT(*) FROM cms_camera_likes l WHERE l.photo_id = p.id) AS like_count
      FROM cms_camera_photos p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC LIMIT 30
    `, [userId]).catch(() => []);
    return NextResponse.json({ photos });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;

  if (action === 'upload') {
    const photoUrl = (body.photo_url || '').trim();
    if (!photoUrl || !/^https?:\/\/.+/i.test(photoUrl)) {
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
    }
    if (photoUrl.length > 500) return NextResponse.json({ error: 'URL too long' }, { status: 400 });
    const roomName = sanitizeText(body.room_name || '', 100);

    // Max 50 photos per user
    const count = await query('SELECT COUNT(*) AS c FROM cms_camera_photos WHERE user_id = ?', [user.id]).catch(() => [{ c: 0 }]);
    if ((count[0]?.c || 0) >= 50) return NextResponse.json({ error: 'Max 50 photos allowed' }, { status: 400 });

    await query('INSERT INTO cms_camera_photos (user_id, photo_url, room_name, created_at) VALUES (?,?,?,NOW())', [user.id, photoUrl, roomName || null]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'like') {
    const photoId = safeInt(body.photo_id, 1);
    if (!photoId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    // Check photo exists
    const photo = await queryOne('SELECT id, user_id FROM cms_camera_photos WHERE id = ?', [photoId]).catch(() => null);
    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (photo.user_id === user.id) return NextResponse.json({ error: 'Cannot like your own photo' }, { status: 400 });

    // Toggle like
    const existing = await queryOne('SELECT 1 FROM cms_camera_likes WHERE photo_id = ? AND user_id = ?', [photoId, user.id]).catch(() => null);
    if (existing) {
      await query('DELETE FROM cms_camera_likes WHERE photo_id = ? AND user_id = ?', [photoId, user.id]);
      return NextResponse.json({ ok: true, liked: false });
    } else {
      await query('INSERT IGNORE INTO cms_camera_likes (photo_id, user_id) VALUES (?,?)', [photoId, user.id]);
      // Notify photo owner (non-blocking, once per user per photo is fine via INSERT IGNORE)
      await sendNotification(photo.user_id, {
        type: 'camera_like',
        title: `${user.username} liked your photo!`,
        message: photo.room_name ? `Photo from room: ${photo.room_name}` : '',
        link: '/camera',
      });
      return NextResponse.json({ ok: true, liked: true });
    }
  }

  if (action === 'delete') {
    const photoId = safeInt(body.photo_id, 1);
    const photo = await queryOne('SELECT id, user_id FROM cms_camera_photos WHERE id = ?', [photoId]).catch(() => null);
    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (photo.user_id !== user.id && user.rank < 4) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    await query('DELETE FROM cms_camera_likes WHERE photo_id = ?', [photoId]);
    await query('DELETE FROM cms_camera_photos WHERE id = ?', [photoId]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
