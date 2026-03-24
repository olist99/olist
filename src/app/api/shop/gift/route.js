import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, safeCurrencyColumn, checkRateLimit } from '@/lib/security';
import { sendNotification } from '@/lib/notifications';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const rl = await checkRateLimit(`shop-gift:${user.id}`, 5, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many gifts. Slow down.' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const itemId = safeInt(body.item_id, 1);
  const recipientUsername = (body.recipient || '').trim().replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 15);

  if (!itemId) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
  if (!recipientUsername) return NextResponse.json({ error: 'Enter a valid username' }, { status: 400 });
  if (recipientUsername.toLowerCase() === user.username.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot gift to yourself' }, { status: 400 });
  }

  const item = await queryOne('SELECT * FROM cms_shop_items WHERE id = ? AND active = 1', [itemId]);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.stock === 0) return NextResponse.json({ error: 'Out of stock' }, { status: 400 });

  const recipient = await queryOne('SELECT id, username FROM users WHERE username = ?', [recipientUsername]);
  if (!recipient) return NextResponse.json({ error: `User "${recipientUsername}" not found` }, { status: 404 });

  const col = safeCurrencyColumn(item.currency);
  if (!col) return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });

  // Deduct from sender
  const deduct = await query(
    `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
    [item.price, user.id, item.price]
  );
  if (deduct.affectedRows === 0) return NextResponse.json({ error: 'Not enough funds' }, { status: 400 });

  // Apply rewards to recipient
  if (item.give_credits > 0) await query('UPDATE users SET credits = credits + ? WHERE id = ?', [item.give_credits, recipient.id]);
  if (item.give_pixels  > 0) await query('UPDATE users SET pixels = pixels + ? WHERE id = ?',  [item.give_pixels,  recipient.id]);
  if (item.give_points  > 0) await query('UPDATE users SET points = points + ? WHERE id = ?',  [item.give_points,  recipient.id]);
  if (item.give_rank)        await query('UPDATE users SET `rank` = ? WHERE id = ?',            [item.give_rank,    recipient.id]);
  if (item.give_badge) {
    const existing = await queryOne('SELECT id FROM users_badges WHERE user_id = ? AND badge_code = ?', [recipient.id, item.give_badge]);
    if (!existing) await query('INSERT INTO users_badges (user_id, badge_code) VALUES (?, ?)', [recipient.id, item.give_badge]);
  }

  // FIX #2: Decrement stock atomically — WHERE stock > 0 prevents negative stock
  // when two simultaneous buyers both pass the stock === 0 check above.
  if (item.stock > 0) {
    const stockUpd = await query(
      'UPDATE cms_shop_items SET stock = stock - 1 WHERE id = ? AND stock > 0',
      [itemId]
    );
    if (stockUpd.affectedRows === 0) {
      // Stock ran out between our read and write — refund the sender and bail
      await query(
        `UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`,
        [item.price, user.id]
      );
      return NextResponse.json({ error: 'Item just sold out' }, { status: 409 });
    }
  }

  // Record purchase
  await query(
    'INSERT INTO cms_shop_purchases (user_id, item_id, price_paid, currency_used) VALUES (?, ?, ?, ?)',
    [user.id, itemId, item.price, item.currency]
  ).catch(() => {});

  // Notify recipient
  await sendNotification(recipient.id, {
    type: 'gift',
    title: `You received a gift from ${user.username}!`,
    message: `${user.username} gifted you: ${item.name}`,
    link: '/',
  });

  return NextResponse.json({ ok: true, message: `Gift sent to ${recipient.username}!` });
}
