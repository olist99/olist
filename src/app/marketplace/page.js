import { redirect } from 'next/navigation';
import { buyAction, cancelAction, sendOffer } from './actions';
import { isPluginEnabled } from '@/lib/plugins';
import Link from 'next/link';
import { getCurrentUser, getSessionUserId } from '@/lib/auth';
import { query, queryOne, queryScalar } from '@/lib/db';
import { formatNumber, timeAgo, CURRENCY_ICONS } from '@/lib/utils';

const CIcon = ({ type, size = 14 }) => <img src={CURRENCY_ICONS[type] || '/images/coin.png'} alt="" style={{ width: size, height: size, imageRendering: 'pixelated', verticalAlign: 'middle' }} />;
import SellForm from '@/components/SellForm';

export const metadata = { title: 'Marketplace' };



export default async function MarketplacePage({ searchParams }) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const cat = sp?.cat || 'all';
  const search = sp?.q || '';
  const sort = sp?.sort || 'newest';
  const tab = sp?.tab || 'browse';
  const page = Math.max(1, parseInt(sp?.p || '1'));
  const perPage = 12;
  const msg = sp?.msg;
  const error = sp?.error;

  const sortMap = {
    newest: 'ml.created_at DESC',
    cheapest: 'ml.price ASC',
    expensive: 'ml.price DESC',
    name: 'ml.item_name ASC',
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  // ── Buy Action (transfers currency + item) ──

  // ── Cancel Action (returns item to seller inventory) ──

  // ── Send Offer Action ──

  // ── Fetch data ──
  let where = 'WHERE ml.status = ?';
  let qParams = ['active'];

  if (tab === 'my' && user) {
    where = 'WHERE ml.seller_id = ?';
    qParams = [user.id];
  }

  if (cat !== 'all' && tab !== 'my') {
    where += ' AND ml.category = ?';
    qParams.push(cat);
  }
  if (search) {
    where += ' AND (ml.title LIKE ? OR ml.item_name LIKE ?)';
    qParams.push('%' + search + '%', '%' + search + '%');
  }

  const total = await queryScalar(`SELECT COUNT(*) FROM cms_marketplace ml ${where}`, qParams);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const offset = (Math.min(page, pages) - 1) * perPage;

  const listings = await query(`
    SELECT ml.*, u.username AS seller_name, u.look AS seller_look
    FROM cms_marketplace ml
    JOIN users u ON u.id = ml.seller_id
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [...qParams, perPage, offset]);

  const categories = await query('SELECT DISTINCT category FROM cms_marketplace WHERE status = ? ORDER BY category', ['active']);

  const activeCount = await queryScalar("SELECT COUNT(*) FROM cms_marketplace WHERE status = 'active'");
  const soldCount = await queryScalar("SELECT COUNT(*) FROM cms_marketplace WHERE status = 'sold'");


  const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

  return (
    <div className="animate-fade-up">
      {/* Stats */}
      <div className="r-grid-3" style={{ marginBottom: 0 }}>
        <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}></span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{formatNumber(activeCount)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active Listings</div>
          </div>
        </div>
        <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}></span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{formatNumber(soldCount)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Items Sold</div>
          </div>
        </div>
        <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}></span>
          <div>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: '#7eb4a9', display: 'flex', alignItems: 'center', gap: 4 }}><img src="/images/diamond.png" alt="" style={{ width: 14, imageRendering: 'pixelated' }} /> {formatNumber(user.points)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>diamonds</span></span>
                <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><img src="/images/coin.png" alt="" style={{ width: 14, imageRendering: 'pixelated' }} /> {formatNumber(user.credits)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>credits</span></span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Log in to trade</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your Balance</div>
          </div>
        </div>
      </div>

      {msg && <div className="flash flash-success">{decodeURIComponent(msg).replace(/[<>]/g, "")}</div>}
      {error && <div className="flash flash-error">{decodeURIComponent(error).replace(/[<>]/g, "")}</div>}

      {/* ── BROWSE / MY LISTINGS TAB ── */}
      {(tab === 'browse' || tab === 'my') && (
        <>
          {/* Filters */}
          {tab === 'browse' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/marketplace?tab=browse&cat=all" className={`btn btn-sm btn-secondary ${cat === 'all' ? 'btn btn-primary' : ''}`}>All</Link>
              {categories.map(c => (
                <Link key={c.category} href={`/marketplace?tab=browse&cat=${encodeURIComponent(c.category)}&sort=${sort}`}
                  className={`btn btn-sm btn-secondary ${cat === c.category ? 'btn btn-sm btn-primary' : ''}`}>
                  {c.category}
                </Link>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {[
                  { k: 'newest', l: 'New' },
                  { k: 'cheapest', l: 'Cheap' },
                  { k: 'expensive', l: 'Expensive' },
                ].map(s => (
                  <Link key={s.k} href={`/marketplace?tab=browse&cat=${encodeURIComponent(cat)}&sort=${s.k}&q=${encodeURIComponent(search)}`}
                    className={`btn btn-sm ${sort === s.k ? 'btn-primary' : 'btn-secondary'}`}>
                    {s.l}
                  </Link>
                ))}
              </div>
              <form method="GET" action="/marketplace" style={{ display: 'flex', gap: 6 }}>
                <input type="hidden" name="tab" value="browse" />
                <input type="hidden" name="cat" value={cat} />
                <input type="hidden" name="sort" value={sort} />
                <input type="text" name="q" placeholder="Search..." defaultValue={search} style={{ width: 160 }} />
                <button type="submit" className="btn btn-secondary btn-sm"></button>
              </form>
            </div>
          )}

          {/* Listing Grid */}
          <div className="r-grid-3">
            {listings.map((item) => {
              const isMine = user && item.seller_id === user.id;
              return (
                <div key={item.id} className="panel" style={{ overflow: 'hidden' }}>
                  {/* Image area — links to furniture profile */}
                  <Link href={`/marketplace/item?name=${encodeURIComponent(item.item_name)}${item.item_base_id ? `&base_id=${item.item_base_id}` : ''}`}
                    style={{
                      height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--panel-inner), #22213a)', position: 'relative',
                      cursor: 'pointer',
                    }}>
                    {item.item_image ? (
                      <img src={item.item_image} alt="" style={{ maxHeight: 70, imageRendering: 'pixelated' }} />
                    ) : (
                      <span style={{ fontSize: 42 }}></span>
                    )}
                    {item.quantity > 1 && (
                      <span style={{
                        position: 'absolute', top: 8, right: 8, background: 'var(--green)',
                        color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                      }}>x{item.quantity}</span>
                    )}
                    <span className={`listing-status ${item.status}`}
                      style={{ position: 'absolute', top: 8, left: 8 }}>
                      {item.status === 'active' && item.item_id ? '✓ VERIFIED' : item.status.toUpperCase()}
                    </span>
                  </Link>

                  <div style={{ padding: 14 }}>
                    <Link href={`/marketplace/${item.id}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', display: 'block' }} className="ellipsis">
                      {item.title}
                    </Link>
                    <Link href={`/marketplace/item?name=${encodeURIComponent(item.item_name)}${item.item_base_id ? `&base_id=${item.item_base_id}` : ''}`}
                      style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textDecoration: 'none' }} className="ellipsis">
                      {item.item_name} • {item.category}
                    </Link>

                    {/* Seller */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
                      <img src={`${HABBO_IMG}?figure=${item.seller_look}&headonly=1&size=s&direction=3`} alt=""
                        style={{ width: 20, imageRendering: 'pixelated' }} />
                      <Link href={`/profile/${item.seller_name}`} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {item.seller_name}
                      </Link>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(item.created_at)}</span>
                    </div>

                    {/* Price + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CIcon type={item.currency} size={16} /> {formatNumber(item.price)}
                      </span>
                      {item.status === 'active' && user && !isMine && (
                        <form action={buyAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="listing_id" value={item.id} />
                          <button type="submit" className="btn btn-primary btn-sm">Buy</button>
                        </form>
                      )}
                      {item.status === 'active' && isMine && (
                        <form action={cancelAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="listing_id" value={item.id} />
                          <button type="submit" className="btn btn-delete btn-sm">Cancel</button>
                        </form>
                      )}
                      {item.status === 'sold' && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--red)' }}>SOLD</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {listings.length === 0 && (
            <div className="panel no-hover" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              {tab === 'my' ? 'You have no listings yet.' : (search ? `No results for "${search}".` : 'No listings available.')}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pages }, (_, i) => i + 1).map(pg => (
                <Link key={pg} href={`/marketplace?tab=${tab}&cat=${encodeURIComponent(cat)}&sort=${sort}&q=${encodeURIComponent(search)}&p=${pg}`}
                  className={pg === page ? 'active' : ''}>
                  {pg}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SELL TAB ── */}
      {tab === 'sell' && (
        <div style={{ maxWidth: 600 }}>
          {!user ? (
            <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>You need to be logged in to sell items.</p>
              <Link href="/login" className="btn btn-primary">Log In</Link>
            </div>
          ) : (
            <SellForm />
          )}
        </div>
      )}
    </div>
  );
}
