'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as dbQuery, queryOne as dbOne } from '@/lib/db';
import { safeInt, safeCurrencyColumn, checkRateLimit } from '@/lib/security';

export async function purchaseAction(formData) {
  const u = await getCurrentUser();
  if (!u) redirect('/login');

  const rl = await checkRateLimit(`shop-buy:${u.id}`, 15, 60000);
  if (!rl.ok) redirect('/shop?error=Too+many+purchases.+Slow+down.');

  const itemId = safeInt(formData.get('item_id'), 1);
  if (!itemId) redirect('/shop?error=Invalid+item');
  const cat = formData.get('cat') || 'all';

  const item = await dbOne('SELECT * FROM cms_shop_items WHERE id = ? AND active = 1', [itemId]);
  if (!item) redirect('/shop?error=Item+not+found');
  if (item.stock === 0) redirect('/shop?error=Out+of+stock');

  const col = safeCurrencyColumn(item.currency);
  if (!col) redirect('/shop?error=Invalid+currency');

  // Check for active flash sale
  const sale = await dbOne(
    "SELECT discount_pct FROM cms_flash_sales WHERE item_id = ? AND active = 1 AND starts_at <= NOW() AND ends_at > NOW() LIMIT 1",
    [itemId]
  ).catch(() => null);

  const price = sale ? Math.floor(item.price * (1 - sale.discount_pct / 100)) : item.price;

  const deduct = await dbQuery(
    `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
    [price, u.id, price]
  );
  if (deduct.affectedRows === 0) redirect(`/shop?cat=${cat}&error=Not+enough+funds`);

  if (item.give_credits > 0) await dbQuery('UPDATE users SET credits = credits + ? WHERE id = ?', [item.give_credits, u.id]);
  if (item.give_pixels > 0) await dbQuery('UPDATE users SET pixels = pixels + ? WHERE id = ?', [item.give_pixels, u.id]);
  if (item.give_points > 0) await dbQuery('UPDATE users SET points = points + ? WHERE id = ?', [item.give_points, u.id]);
  if (item.give_rank) await dbQuery('UPDATE users SET `rank` = ? WHERE id = ?', [item.give_rank, u.id]);
  if (item.give_badge) {
    const existing = await dbOne('SELECT id FROM users_badges WHERE user_id = ? AND badge_code = ?', [u.id, item.give_badge]);
    if (!existing) await dbQuery('INSERT INTO users_badges (user_id, badge_code) VALUES (?, ?)', [u.id, item.give_badge]);
  }

  await dbQuery('INSERT INTO cms_shop_purchases (user_id, item_id, price_paid, currency_used) VALUES (?, ?, ?, ?)',
    [u.id, itemId, price, item.currency]);
  if (item.stock > 0) await dbQuery('UPDATE cms_shop_items SET stock = stock - 1 WHERE id = ?', [itemId]);

  redirect(`/shop?cat=${cat}&msg=Purchased+${encodeURIComponent(item.name)}!`);
}
