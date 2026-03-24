import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { checkRateLimit } from '@/lib/security';

// POST /api/tokens/gift
// Body: { item_id, recipient }  — gift a token shop item to another user
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // FIX #9: Rate limit gift endpoint — 5 gifts per minute per user
  const rl = await checkRateLimit(`tokens-gift:${user.id}`, 5, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many gift requests. Slow down.' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { item_id, recipient } = body;
  if (!item_id || !recipient?.trim())
    return NextResponse.json({ error: 'Missing item_id or recipient' }, { status: 400 });

  // Find the item
  const item = await queryOne('SELECT * FROM cms_token_shop_items WHERE id = ? AND active = 1', [item_id]);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.stock === 0) return NextResponse.json({ error: 'Item is sold out' }, { status: 400 });

  // Find the recipient
  const target = await queryOne('SELECT id, username FROM users WHERE username = ?', [recipient.trim()]);
  if (!target) return NextResponse.json({ error: `User "${recipient}" not found` }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: 'You cannot gift items to yourself' }, { status: 400 });

  // Deduct tokens from sender
  const deduct = await query(
    'UPDATE users SET shop_tokens = shop_tokens - ? WHERE id = ? AND shop_tokens >= ?',
    [item.token_cost, user.id, item.token_cost]
  );
  if (deduct.affectedRows === 0)
    return NextResponse.json({ error: 'Not enough tokens' }, { status: 400 });

  // FIX #2: Decrement stock atomically — WHERE stock > 0 prevents going negative
  // when two requests race past the stock === 0 check above.
  if (item.stock > 0) {
    const stockUpd = await query(
      'UPDATE cms_token_shop_items SET stock = stock - 1 WHERE id = ? AND stock > 0',
      [item.id]
    );
    if (stockUpd.affectedRows === 0) {
      // Stock ran out between our read and our write — refund and bail
      await query(
        'UPDATE users SET shop_tokens = shop_tokens + ? WHERE id = ?',
        [item.token_cost, user.id]
      );
      return NextResponse.json({ error: 'Item just sold out' }, { status: 409 });
    }
  }

  // Apply rewards to recipient
  if (item.give_credits > 0)
    await query('UPDATE users SET credits = credits + ? WHERE id = ?', [item.give_credits, target.id]);
  if (item.give_pixels > 0)
    await query('UPDATE users SET pixels = pixels + ? WHERE id = ?', [item.give_pixels, target.id]);
  if (item.give_points > 0)
    await query('UPDATE users SET points = points + ? WHERE id = ?', [item.give_points, target.id]);

  if (item.give_rank > 0) {
    if (item.give_rank_days > 0) {
      const targetUser = await queryOne('SELECT `rank` FROM users WHERE id = ?', [target.id]);
      const prevRank = targetUser?.rank || 1;
      const expiresAt = new Date(Date.now() + item.give_rank_days * 86400000);
      await query('UPDATE users SET `rank` = ? WHERE id = ?', [item.give_rank, target.id]);
      await query(`
        INSERT INTO cms_vip_subscriptions (user_id, vip_rank, prev_rank, expires_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE vip_rank = ?, prev_rank = ?, expires_at = ?, created_at = NOW()
      `, [target.id, item.give_rank, prevRank, expiresAt, item.give_rank, prevRank, expiresAt]);
    } else {
      await query('UPDATE users SET `rank` = ? WHERE id = ?', [item.give_rank, target.id]);
    }
  }

  if (item.give_badge) {
    const existing = await queryOne(
      'SELECT id FROM users_badges WHERE user_id = ? AND badge_code = ?', [target.id, item.give_badge]
    );
    if (!existing)
      await query('INSERT INTO users_badges (user_id, badge_code) VALUES (?, ?)', [target.id, item.give_badge]);
  }

  // Log the order
  await query(
    'INSERT INTO cms_token_orders (user_id, item_id, tokens_spent, gifted_to, created_at) VALUES (?, ?, ?, ?, NOW())',
    [user.id, item.id, item.token_cost, target.id]
  );

  // Send notification to recipient
  await query(
    `INSERT INTO cms_notifications (user_id, type, title, message, created_at)
     VALUES (?, 'item_gift', 'Item Received!', ?, NOW())`,
    [target.id, `${user.username} gifted you "${item.name}"!`]
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    message: `✓ Gifted "${item.name}" to ${target.username}!`,
  });
}
