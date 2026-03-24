import { redirect } from 'next/navigation';
import { purchaseAction } from './actions';
import { isPluginEnabled } from '@/lib/plugins';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatNumber } from '@/lib/utils';
import GiftButton from '@/components/GiftButton';
import VoucherBox from './VoucherBox';

export const metadata = { title: 'Shop' };

export default async function ShopPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('shop')) redirect('/');

  const sp = await searchParams;
  const cat = sp?.cat || 'all';
  const msg = sp?.msg;
  const error = sp?.error;

  const now = new Date();

  // Fetch items with flash sale data
  const where = cat !== 'all' ? 'AND category = ?' : '';
  const params = cat !== 'all' ? [cat] : [];
  const items = await query(
    `SELECT i.*,
       fs.discount_pct, fs.ends_at
     FROM cms_shop_items i
     LEFT JOIN cms_flash_sales fs ON fs.item_id = i.id
       AND fs.active = 1
       AND fs.starts_at <= NOW()
       AND fs.ends_at > NOW()
     WHERE i.active = 1 ${where}
     ORDER BY fs.ends_at IS NULL ASC, i.category, i.name`,
    params
  ).catch(() => query(`SELECT * FROM cms_shop_items WHERE active = 1 ${where} ORDER BY category, name`, params));

  const categories = await query('SELECT DISTINCT category FROM cms_shop_items WHERE active = 1 ORDER BY category');

  const currencyIcons = { credits: '/images/coin.png', pixels: '/images/ducket.png', points: '/images/diamond.png' };

  // Check if there are any active flash sales
  const flashSales = items.filter(i => i.discount_pct > 0);

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

      {msg && <div className="flash flash-success">{decodeURIComponent(msg).replace(/[<>]/g, '')}</div>}
      {error && <div className="flash flash-error">{decodeURIComponent(error).replace(/[<>]/g, '')}</div>}

      {/* Flash sales banner */}
      {flashSales.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(239,88,86,0.12), rgba(245,166,35,0.12))', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#f5a623' }}>Flash Sale Active!</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{flashSales.length} item{flashSales.length > 1 ? 's' : ''} on sale — limited time only</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start', marginBottom: 20 }}>
        <div className="flex gap-2.5 flex-wrap">
          <Link href="/shop?cat=all" className={`btn btn-sm no-underline ${cat === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All Items</Link>
          {categories.map(c => (
            <Link key={c.category} href={`/shop?cat=${encodeURIComponent(c.category)}`}
              className={`btn btn-sm no-underline ${cat === c.category ? 'btn-primary' : 'btn-secondary'}`}>
              {c.category}
            </Link>
          ))}
        </div>
        <VoucherBox />
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
        {items.map((item) => {
          const hasSale = item.discount_pct > 0;
          const salePrice = hasSale ? Math.floor(item.price * (1 - item.discount_pct / 100)) : item.price;
          return (
            <div key={item.id} className="card transition-all hover:-translate-y-1 hover:border-accent" style={{ position: 'relative' }}>
              {hasSale && (
                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: '#EF5856', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20 }}>
                  -{item.discount_pct}%
                </div>
              )}
              <div className="h-28 flex items-center justify-center text-5xl"
                style={{ background: 'linear-gradient(135deg, #1c2333, #161b22)' }}>
                {item.image ? <img src={item.image} alt="" className="max-h-20" /> : '🎁'}
              </div>
              <div className="p-4">
                <div className="text-[15px] font-bold mb-1">{item.name}</div>
                <div className="text-xs text-text-muted mb-3">{item.description}</div>
                {hasSale && item.ends_at && (
                  <FlashCountdown endsAt={item.ends_at} />
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-accent flex items-center gap-1.5">
                      <img src={currencyIcons[item.currency] || '/images/coin.png'} alt="" className="icon-inline" />
                      {formatNumber(salePrice)}
                    </span>
                    {hasSale && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 4 }}>
                        {formatNumber(item.price)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <form action={purchaseAction}>
                      <input type="hidden" name="item_id" value={item.id} />
                      <input type="hidden" name="cat" value={cat} />
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
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="card p-16 text-center text-text-muted">No items available.</div>
      )}
    </div>
  );
}

function FlashCountdown({ endsAt }) {
  // Server-rendered time remaining (client countdown handled by VoucherBox module)
  const end = new Date(endsAt);
  const diff = Math.max(0, end - new Date());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (diff <= 0) return null;
  return (
    <div style={{ fontSize: 10, color: '#f5a623', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
      ⏱ Sale ends in {h > 0 ? `${h}h ${m}m` : `${m}m`}
    </div>
  );
}
