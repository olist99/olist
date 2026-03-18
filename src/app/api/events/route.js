import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt, checkRateLimit } from '@/lib/security';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.rank < 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;

  if (action === 'create') {
    const title = sanitizeText(body.title, 200);
    const description = sanitizeText(body.description, 2000);
    const location = sanitizeText(body.location, 200);
    const eventDate = body.event_date;

    if (!title || !eventDate) return NextResponse.json({ error: 'Title and date required' }, { status: 400 });

    await query('INSERT INTO cms_events (title, description, location, event_date, staff_id) VALUES (?,?,?,?,?)',
      [title, description, location, eventDate, user.id]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const id = safeInt(body.id, 1);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const title = sanitizeText(body.title, 200);
    const description = sanitizeText(body.description, 2000);
    const location = sanitizeText(body.location, 200);
    const eventDate = body.event_date;

    await query('UPDATE cms_events SET title=?, description=?, location=?, event_date=? WHERE id=?',
      [title, description, location, eventDate, id]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const id = safeInt(body.id, 1);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    await query('DELETE FROM cms_events WHERE id=?', [id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
