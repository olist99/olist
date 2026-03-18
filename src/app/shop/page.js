import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatNumber, CURRENCIES } from '@/lib/utils';
import GiftButton from '@/components/GiftButton';

export const metadata = { title: 'Shop' };

export default async function ShopPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const cat = sp?.cat || 'all';
  const msg = sp?.msg;
  const error = sp?.error;

  async function purchaseAction(formData) {
    'use server';
    const { getCurrentUser: getUser } = await import('@/lib/auth');
    const { query: dbQuery, queryOne: dbOne } = await import('@/lib/db');
    const { safeInt, safeCurrencyColumn, checkRateLimit } = await import('@/lib/security');
    const u = await getUser();
    if (!u) redirect('/login');

    const rl = checkRateLimit(`shop-buy:${u.id}`, 15, 60000);
    if (!rl.ok) redirect('/shop?error=Too+many+purchases.+Slow+down.');

    const itemId = safeInt(formData.get('item_id'), 1);
    if (!itemId) redirect('/shop?error=Invalid+item');

    const item = await dbOne('SELECT * FROM cms_shop_items WHERE id = ? AND active = 1', [itemId]);
    if (!item) redirect('/shop?error=Item+not+found');
    if (item.stock === 0) redirect('/shop?error=Out+of+stock');

    const col = safeCurrencyColumn(item.currency);
    if (!col) redirect('/shop?error=Invalid+currency');

    // Atomic deduct
    const deduct = await dbQuery(
      `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
      [item.price, u.id, item.price]
    );
    if (deduct.affectedRows === 0) redirect(`/shop?cat=${cat}&error=Not+enough+funds`);

    // Give rewards
    if (item.give_credits > 0) await dbQuery('UPDATE users SET credits = credits + ? WHERE id = ?', [item.give_credits, u.id]);
    if (item.give_pixels > 0) await dbQuery('UPDATE users SET pixels = pixels + ? WHERE id = ?', [item.give_pixels, u.id]);
    if (item.give_points > 0) await dbQuery('UPDATE users SET points = points + ? WHERE id = ?', [item.give_points, u.id]);
    if (item.give_rank) await dbQuery('UPDATE users SET `rank` = ? WHERE id = ?', [item.give_rank, u.id]);
    if (item.give_badge) {
      const existing = await dbOne('SELECT id FROM users_badges WHERE user_id = ? AND badge_code = ?', [u.id, item.give_badge]);
      if (!existing) {
        await dbQuery('INSERT INTO users_badges (user_id, badge_code) VALUES (?, ?)', [u.id, item.give_badge]);
      }
    }

    // Record purchase
    await dbQuery('INSERT INTO cms_shop_purchases (user_id, item_id, price_paid, currency_used) VALUES (?, ?, ?, ?)',
      [u.id, itemId, item.price, currency]);

    // Decrease stock
    if (item.stock > 0) await dbQuery('UPDATE cms_shop_items SET stock = stock - 1 WHERE id = ?', [itemId]);

    redirect(`/shop?cat=${cat}&msg=Purchased+${encodeURIComponent(item.name)}!`);
  }

  const where = cat !== 'all' ? 'AND category = ?' : '';
  const params = cat !== 'all' ? [cat] : [];
  const items = await query(`SELECT * FROM cms_shop_items WHERE active = 1 ${where} ORDER BY category, name`, params);
  const categories = await query('SELECT DISTINCT category FROM cms_shop_items WHERE active = 1 ORDER BY category');

  const currencyIcons = { credits: '/images/coin.png', pixels: '/images/ducket.png', points: '/images/diamond.png' };
  const itemIcons = ['','','','','','','','','',''];

  return (
    <div className="animate-fade-up">
      <div className="title-header flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Donor Shop</h2>
          <p className="text-xs text-text-secondary mt-0.5">Spend your currencies on exclusive items</p>
        </div>
        <div className="flex gap-3 text-[13px]">
          <span className="text-currency-credits"><img src="/images/coin.png" alt="" className="icon-inline" /> {formatNumber(user.credits)}</span>
          <span className="text-currency-duckets"><img src="/images/ducket.png" alt="" className="icon-inline" /> {formatNumber(user.pixels)}</span>
          <span className="text-currency-diamonds"><img src="/images/diamond.png" alt="" className="icon-inline" /> {formatNumber(user.points)}</span>
        </div>
      </div>

      {msg && <div className="flash flash-success">{decodeURIComponent(msg).replace(/[<>]/g, "")}</div>}
      {error && <div className="flash flash-error">{decodeURIComponent(error).replace(/[<>]/g, "")}</div>}

      <div className="flex gap-2.5 mb-5 flex-wrap">
        <Link href="/shop?cat=all" className={`btn btn-sm no-underline ${cat === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All Items</Link>
        {categories.map(c => (
          <Link key={c.category} href={`/shop?cat=${encodeURIComponent(c.category)}`}
            className={`btn btn-sm no-underline ${cat === c.category ? 'btn-primary' : 'btn-secondary'}`}>
            {c.category}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
        {items.map((item, i) => (
          <div key={item.id} className="card transition-all hover:-translate-y-1 hover:border-accent">
            <div className="h-28 flex items-center justify-center text-5xl"
              style={{ background: 'linear-gradient(135deg, #1c2333, #161b22)' }}>
              {item.image ? <img src={item.image} alt="" className="max-h-20" /> : itemIcons[i % itemIcons.length]}
            </div>
            <div className="p-4">
              <div className="text-[15px] font-bold mb-1">{item.name}</div>
              <div className="text-xs text-text-muted mb-3">{item.description}</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-accent flex items-center gap-1.5">
                  <img src={currencyIcons[item.currency] || '/images/coin.png'} alt="" className="icon-inline" /> {formatNumber(item.price)}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <form action={purchaseAction}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={item.stock === 0}>
                      {item.stock === 0 ? 'Sold Out' : 'Buy'}
                    </button>
                  </form>
                  {item.stock !== 0 && <GiftButton itemId={item.id} itemName={item.name} />}
                </div>
              </div>
              {item.stock > 0 && <div className="text-[11px] text-text-muted mt-1.5">Stock: {item.stock}</div>}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="card p-16 text-center text-text-muted">No items available.</div>
      )}
    </div>
  );
}
