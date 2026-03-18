import { NextResponse } from 'next/server';
import { getSessionUserId, getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt, oneOf, checkRateLimit } from '@/lib/security';

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const action = oneOf(body.action, ['create', 'reply', 'close']);
  if (!action) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  // Create ticket
  if (action === 'create') {
    // Rate limit: 3 tickets per 10 minutes
    const rl = checkRateLimit(`ticket-create:${userId}`, 3, 600000);
    if (!rl.ok) return NextResponse.json({ error: `Too many tickets. Try again in ${rl.retryAfter}s` }, { status: 429 });

    const subject = sanitizeText(body.subject, 200);
    const category = oneOf(body.category, ['general', 'bug', 'payment', 'report', 'appeal', 'other'], 'general');
    const message = sanitizeText(body.message, 5000);

    if (!subject || subject.length < 3) return NextResponse.json({ error: 'Subject too short (min 3 chars)' }, { status: 400 });
    if (!message || message.length < 10) return NextResponse.json({ error: 'Message too short (min 10 chars)' }, { status: 400 });

    const result = await query(
      'INSERT INTO cms_tickets (user_id, subject, category) VALUES (?, ?, ?)',
      [userId, subject, category]
    );

    await query(
      'INSERT INTO cms_ticket_messages (ticket_id, user_id, message, is_staff) VALUES (?, ?, ?, 0)',
      [result.insertId, userId, message]
    );

    return NextResponse.json({ ok: true, ticketId: result.insertId });
  }

  // Reply to ticket
  if (action === 'reply') {
    // Rate limit: 10 replies per minute
    const rl = checkRateLimit(`ticket-reply:${userId}`, 10, 60000);
    if (!rl.ok) return NextResponse.json({ error: `Too many replies. Try again in ${rl.retryAfter}s` }, { status: 429 });

    const ticketId = safeInt(body.ticketId, 1);
    const message = sanitizeText(body.message, 5000);

    if (!ticketId) return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    if (!message || message.length < 2) return NextResponse.json({ error: 'Message too short' }, { status: 400 });

    const ticket = await queryOne('SELECT * FROM cms_tickets WHERE id = ?', [ticketId]);
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const user = await getCurrentUser();
    const isStaff = user && user.rank >= 4;

    if (ticket.user_id !== userId && !isStaff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 });
    }

    await query(
      'INSERT INTO cms_ticket_messages (ticket_id, user_id, message, is_staff) VALUES (?, ?, ?, ?)',
      [ticketId, userId, message, isStaff ? 1 : 0]
    );

    const newStatus = isStaff ? 'answered' : 'open';
    await query('UPDATE cms_tickets SET status = ? WHERE id = ?', [newStatus, ticketId]);

    return NextResponse.json({ ok: true });
  }

  // Close ticket
  if (action === 'close') {
    const ticketId = safeInt(body.ticketId, 1);
    if (!ticketId) return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });

    const ticket = await queryOne('SELECT * FROM cms_tickets WHERE id = ?', [ticketId]);
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const user = await getCurrentUser();
    const isStaff = user && user.rank >= 4;

    if (ticket.user_id !== userId && !isStaff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await query("UPDATE cms_tickets SET status = 'closed' WHERE id = ?", [ticketId]);
    return NextResponse.json({ ok: true });
  }
}
