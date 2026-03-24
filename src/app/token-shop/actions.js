'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt } from '@/lib/security';

export async function buyWithTokensAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const itemId = safeInt(formData.get('item_id'), 1);
  const cat    = formData.get('cat') || 'all';
  if (!itemId) redirect('/token-shop?error=Invalid+item');

  const item = await queryOne(
    'SELECT * FROM cms_token_shop_items WHERE id = ? AND active = 1', [itemId]
  );
  if (!item) redirect('/token-shop?error=Item+not+found');
  if (item.stock === 0) redirect('/token-shop?error=Out+of+stock');

  // Check for active flash sale and apply discount
  const sale = await queryOne(
    `SELECT discount_pct FROM cms_flash_sales
     WHERE item_id = ? AND active = 1 AND starts_at <= NOW() AND ends_at > NOW()
     LIMIT 1`,
    [itemId]
  ).catch(() => null);

  const price = sale
    ? Math.floor(item.token_cost * (1 - sale.discount_pct / 100))
    : item.token_cost;

  // Deduct tokens atomically at the correct (possibly discounted) price
  const deduct = await query(
    'UPDATE users SET shop_tokens = shop_tokens - ? WHERE id = ? AND shop_tokens >= ?',
    [price, user.id, price]
  );
  if (deduct.affectedRows === 0) redirect(`/token-shop?cat=${cat}&error=Not+enough+tokens`);

  // Apply rewards
  if (item.give_credits > 0)
    await query('UPDATE users SET credits = credits + ? WHERE id = ?', [item.give_credits, user.id]);
  if (item.give_pixels > 0)
    await query('UPDATE users SET pixels = pixels + ? WHERE id = ?', [item.give_pixels, user.id]);
  if (item.give_points > 0)
    await query('UPDATE users SET points = points + ? WHERE id = ?', [item.give_points, user.id]);

  if (item.give_rank > 0) {
    if (item.give_rank_days > 0) {
      // Timed VIP — save old rank + set VIP
      const currentUser = await queryOne('SELECT `rank` FROM users WHERE id = ?', [user.id]);
      const prevRank = currentUser?.rank || 1;
      const expiresAt = new Date(Date.now() + item.give_rank_days * 86400000);
      await query('UPDATE users SET `rank` = ? WHERE id = ?', [item.give_rank, user.id]);
      await query(`
        INSERT INTO cms_vip_subscriptions (user_id, vip_rank, prev_rank, expires_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE vip_rank = ?, prev_rank = ?, expires_at = ?, created_at = NOW()
      `, [user.id, item.give_rank, prevRank, expiresAt, item.give_rank, prevRank, expiresAt]);
    } else {
      await query('UPDATE users SET `rank` = ? WHERE id = ?', [item.give_rank, user.id]);
    }
  }

  if (item.give_badge) {
    const existing = await queryOne(
      'SELECT id FROM users_badges WHERE user_id = ? AND badge_code = ?',
      [user.id, item.give_badge]
    );
    if (!existing)
      await query('INSERT INTO users_badges (user_id, badge_code) VALUES (?, ?)', [user.id, item.give_badge]);
  }

  // Log the order
  await query(
    'INSERT INTO cms_token_orders (user_id, item_id, tokens_spent, created_at) VALUES (?, ?, ?, NOW())',
    [user.id, itemId, price]
  );

  // Decrement stock if limited
  if (item.stock > 0)
    await query('UPDATE cms_token_shop_items SET stock = stock - 1 WHERE id = ?', [itemId]);

  redirect(`/token-shop?cat=${cat}&msg=Purchased+${encodeURIComponent(item.name)}!`);
}