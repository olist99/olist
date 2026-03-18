import Link from 'next/link';
import { query, queryOne, queryScalar } from '@/lib/db';
import { formatNumber, timeAgo, CURRENCY_ICONS } from '@/lib/utils';
import PriceHistory from '@/components/PriceHistory';

const CIcon = ({ type, size = 14 }) => <img src={CURRENCY_ICONS[type] || '/images/coin.png'} alt="" style={{ width: size, height: size, imageRendering: 'pixelated', verticalAlign: 'middle' }} />;
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  return { title: sp?.name ? `${sp.name} — Market Data` : 'Furniture Profile' };
}

export default async function FurnitureProfilePage({ searchParams }) {
  const sp = await searchParams;
  const itemName = sp?.name;
  const baseId = sp?.base_id;

  if (!itemName) {
    return (
      <div className="animate-fade-up">
        <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No item specified.</p>
          <Link href="/marketplace" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  // Furni icon
  const furniBase = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';

  // LTD info
  let ltdInfo = null, ltdOwners = [];
  try {
    ltdInfo = await queryOne(
      'SELECT id, public_name, limit_number, limited_sells FROM items_base WHERE public_name = ? AND limit_number > 0 LIMIT 1',
      [itemName]
    );
    if (ltdInfo) {
      ltdOwners = await query(`
        SELECT u.username, u.look, COUNT(i.id) AS copies
        FROM items i JOIN users u ON u.id = i.user_id
        WHERE i.base_id = ?
        GROUP BY u.id, u.username, u.look
        ORDER BY copies DESC LIMIT 20
      `, [ltdInfo.id]);
    }
  } catch {}

  // Get first listing image for this item
  const sampleListing = await queryOne(
    'SELECT item_image, item_base_id FROM cms_marketplace WHERE item_name = ? AND item_image IS NOT NULL LIMIT 1',
    [itemName]
  );
  const itemImage = sampleListing?.item_image || null;
  const resolvedBaseId = baseId || sampleListing?.item_base_id || null;

  // Stats
  const totalListings = parseInt(await queryScalar(
    'SELECT COUNT(*) FROM cms_marketplace WHERE item_name = ?', [itemName]
  ) || '0');

  const activeListing = parseInt(await queryScalar(
    "SELECT COUNT(*) FROM cms_marketplace WHERE item_name = ? AND status = 'active'", [itemName]
  ) || '0');

  const totalSold = parseInt(await queryScalar(
    "SELECT COUNT(*) FROM cms_marketplace WHERE item_name = ? AND status = 'sold'", [itemName]
  ) || '0');

  const avgPrice = await queryOne(
    "SELECT AVG(price) AS avg_price, MIN(price) AS min_price, MAX(price) AS max_price FROM cms_marketplace WHERE item_name = ? AND status = 'sold'",
    [itemName]
  );

  const lastSale = await queryOne(
    "SELECT price, currency, sold_at FROM cms_marketplace WHERE item_name = ? AND status = 'sold' ORDER BY sold_at DESC LIMIT 1",
    [itemName]
  );

  // Recent sales (from price history + marketplace)
  let recentSales = [];
  try {
    recentSales = await query(`
      SELECT ml.price, ml.currency, ml.sold_at, ml.title,
             seller.username AS seller_name,
             buyer.username AS buyer_name
      FROM cms_marketplace ml
      JOIN users seller ON seller.id = ml.seller_id
      LEFT JOIN users buyer ON buyer.id = ml.buyer_id
      WHERE ml.item_name = ? AND ml.status = 'sold'
      ORDER BY ml.sold_at DESC
      LIMIT 20
    `, [itemName]);
  } catch(e) {}

  // Active listings for this item
  const activeListings = await query(`
    SELECT ml.id, ml.price, ml.currency, ml.quantity, ml.created_at,
           u.username AS seller_name
    FROM cms_marketplace ml
    JOIN users u ON u.id = ml.seller_id
    WHERE ml.item_name = ? AND ml.status = 'active'
    ORDER BY ml.price ASC
    LIMIT 10
  `, [itemName]);

  // Price history from dedicated table
  let priceHistoryData = [];
  try {
    priceHistoryData = await query(`
      SELECT price, currency, sold_at
      FROM cms_marketplace_price_history
      WHERE item_name = ?
      ORDER BY sold_at DESC
      LIMIT 20
    `, [itemName]);
  } catch(e) {}

  return (
    <div className="animate-fade-up">
      <Link href="/marketplace" className="btn btn-secondary btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>← Back to Marketplace</Link>

      {/* Header */}
      <div className="panel no-hover" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <div style={{
          width: 90, height: 90, borderRadius: 'var(--radius)',
          background: 'linear-gradient(135deg, var(--panel-inner), #22213a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {itemImage ? (
            <img src={itemImage} alt="" style={{ maxHeight: 60, imageRendering: 'pixelated' }} />
          ) : (
            <span style={{ fontSize: 40 }}></span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{itemName}</h1>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>{totalListings} total listing{totalListings !== 1 ? 's' : ''}</span>
            <span>{totalSold} sold</span>
            <span>{activeListing} active now</span>
            {lastSale && (
              <span>Last sale: <strong style={{ color: 'var(--green)' }}><CIcon type={lastSale.currency} /> {formatNumber(lastSale.price)}</strong> {timeAgo(lastSale.sold_at)}</span>
            )}
          </div>
        </div>
        {activeListing > 0 && (
          <Link href={`/marketplace?tab=browse&q=${encodeURIComponent(itemName)}`} className="btn btn-primary btn-sm">
            View listings
          </Link>
        )}
      </div>

      {/* LTD Info */}
      {ltdInfo && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid #f5c842' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, background: 'rgba(245,200,66,0.15)', color: '#f5c842' }}>LIMITED EDITION</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ltdInfo.limited_sells} of {ltdInfo.limit_number} copies claimed</span>
            <div style={{ flex: 1, background: 'var(--panel-inner)', borderRadius: 4, height: 6, overflow: 'hidden', maxWidth: 200 }}>
              <div style={{ height: '100%', borderRadius: 4, background: '#f5c842', width: `${Math.min(100, (ltdInfo.limited_sells / ltdInfo.limit_number) * 100)}%` }} />
            </div>
          </div>
          {ltdOwners.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                {ltdOwners.length} player{ltdOwners.length !== 1 ? 's' : ''} own this item
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ltdOwners.map((o, i) => (
                  <Link key={o.username} href={`/profile/${o.username}`} className="no-underline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--panel-inner)', borderRadius: 20, fontSize: 11 }}>
                    <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${o.look}&headonly=1&size=s`} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                    <span style={{ fontWeight: 700 }}>{o.username}</span>
                    {o.copies > 1 && <span style={{ color: 'var(--text-muted)' }}>×{o.copies}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginBottom: 20 }}>
        {[
          { label: 'Average Price', val: avgPrice?.avg_price ? formatNumber(Math.round(avgPrice.avg_price)) : '—', icon: '/images/icon-chart.png', color: 'var(--text-secondary)' },
          { label: 'Lowest Sale', val: avgPrice?.min_price ? formatNumber(avgPrice.min_price) : '—', icon: '/images/icon-low.png', color: '#34bd59' },
          { label: 'Highest Sale', val: avgPrice?.max_price ? formatNumber(avgPrice.max_price) : '—', icon: '/images/icon-high.png', color: '#EF5856' },
          { label: 'Total Volume', val: totalSold > 0 ? formatNumber(totalSold) : '—', icon: '/images/icon-chart.png', color: '#f5a623' },
        ].map((s, i) => (
          <div key={i} className="panel no-hover" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}><img src={s.icon} alt="" style={{ width: 32, height: 32, imageRendering: "pixelated" }} /></div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Left: Chart + Sales */}
        <div>
          {/* Price Chart */}
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Price History</h3>
            <PriceHistory itemName={itemName} baseId={resolvedBaseId} />
          </div>

          {/* Recent Sales */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Recent Sales</h3>
            {recentSales.length > 0 ? (
              <table className="table-panel">
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Seller</th>
                    <th>Buyer</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                          <CIcon type={sale.currency} /> {formatNumber(sale.price)}
                        </span>
                      </td>
                      <td>
                        <Link href={`/profile/${sale.seller_name}`} style={{ fontSize: 12 }}>{sale.seller_name}</Link>
                      </td>
                      <td>
                        {sale.buyer_name ? (
                          <Link href={`/profile/${sale.buyer_name}`} style={{ fontSize: 12 }}>{sale.buyer_name}</Link>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {sale.sold_at ? timeAgo(sale.sold_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No sales recorded yet for this item.
              </p>
            )}
          </div>
        </div>

        {/* Right: Active listings */}
        <div>
          <div className="panel no-hover" style={{ padding: 20, position: 'sticky', top: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}> Active Listings ({activeListing})</h3>
            {activeListings.length > 0 ? (
              <div>
                {activeListings.map((l, i) => (
                  <Link key={l.id} href={`/marketplace/${l.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: i === 0 ? 'rgba(52,189,89,0.06)' : 'var(--panel-inner)',
                      borderRadius: 'var(--radius)', marginBottom: 8,
                      border: i === 0 ? '1px solid rgba(52,189,89,0.15)' : '1px solid transparent',
                      textDecoration: 'none', transition: 'all .15s',
                    }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>
                        <CIcon type={l.currency} size={16} /> {formatNumber(l.price)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        by {l.seller_name} • {timeAgo(l.created_at)}
                      </div>
                    </div>
                    {i === 0 && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, color: 'var(--green)',
                        background: 'rgba(52,189,89,0.15)', padding: '2px 8px', borderRadius: 3,
                        textTransform: 'uppercase',
                      }}>Cheapest</span>
                    )}
                    {l.quantity > 1 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>x{l.quantity}</span>
                    )}
                  </Link>
                ))}
                {activeListing > 10 && (
                  <Link href={`/marketplace?tab=browse&q=${encodeURIComponent(itemName)}&sort=cheapest`}
                    className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                    View all {activeListing} listings
                  </Link>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No one is selling this item right now.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
