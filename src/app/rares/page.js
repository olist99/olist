import Link from 'next/link';
import { query, queryScalar } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Rare Values' };

export default async function RaresPage({ searchParams }) {
  const sp = await searchParams;
  const tab = sp?.tab || 'rares';
  const cat = sp?.cat || 'all';
  const search = sp?.q || '';
  const page = Math.max(1, parseInt(sp?.p || '1'));
  const perPage = 12;

  // ── Rare Values Tab ──
  let rares = [], total = 0, pages = 1, categories = [];
  if (tab === 'rares') {
    let where = [];
    let params = [];
    if (cat !== 'all') { where.push('category = ?'); params.push(cat); }
    if (search) { where.push('item_name LIKE ?'); params.push(`%${search}%`); }
    const whereSQL = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    total = await queryScalar(`SELECT COUNT(*) FROM cms_rare_values ${whereSQL}`, params);
    pages = Math.max(1, Math.ceil(total / perPage));
    const offset = (Math.min(page, pages) - 1) * perPage;

    rares = await query(`
      SELECT r.*,
        (SELECT ROUND(AVG(sub.price)) FROM (SELECT price FROM cms_marketplace_price_history ph WHERE ph.item_name = r.item_name ORDER BY ph.sold_at DESC LIMIT 20) sub) AS market_avg,
        (SELECT COUNT(*) FROM cms_marketplace_price_history ph2 WHERE ph2.item_name = r.item_name) AS trade_count,
        (SELECT MIN(sub2.price) FROM (SELECT price FROM cms_marketplace_price_history ph3 WHERE ph3.item_name = r.item_name ORDER BY ph3.sold_at DESC LIMIT 20) sub2) AS market_low,
        (SELECT MAX(sub3.price) FROM (SELECT price FROM cms_marketplace_price_history ph4 WHERE ph4.item_name = r.item_name ORDER BY ph4.sold_at DESC LIMIT 20) sub3) AS market_high
      FROM cms_rare_values r ${whereSQL} ORDER BY r.updated_at DESC LIMIT ? OFFSET ?
    `, [...params, perPage, offset]);
    categories = await query('SELECT DISTINCT category FROM cms_rare_values ORDER BY category');
  }

  // ── LTD Tab ──
  let ltdItems = [];
  if (tab === 'ltd') {
    const ltdSearch = search ? 'AND ib.public_name LIKE ?' : '';
    const ltdParams = search ? [`%${search}%`] : [];
    ltdItems = await query(`
      SELECT ib.id, ib.public_name, ib.item_name, ib.limit_number, ib.limited_sells,
             ib.sprite_id, ib.type,
             COUNT(DISTINCT i.user_id) AS owner_count,
             COUNT(i.id) AS total_copies_in_game
      FROM items_base ib
      LEFT JOIN items i ON i.base_id = ib.id
      WHERE ib.limit_number > 0 ${ltdSearch}
      GROUP BY ib.id
      ORDER BY ib.limit_number ASC
      LIMIT 50
    `, ltdParams).catch(() => []);
  }

  // ── LTD detail: owners for a specific base_id ──
  const detailBaseId = sp?.ltd_id ? parseInt(sp.ltd_id) : null;
  let ltdDetail = null, ltdOwners = [];
  if (tab === 'ltd' && detailBaseId) {
    ltdDetail = await query('SELECT ib.id, ib.public_name, ib.item_name, ib.limit_number, ib.limited_sells FROM items_base ib WHERE ib.id = ? AND ib.limit_number > 0', [detailBaseId]).then(r => r[0] || null).catch(() => null);
    if (ltdDetail) {
      ltdOwners = await query(`
        SELECT u.username, u.look, COUNT(i.id) AS copies
        FROM items i
        JOIN users u ON u.id = i.user_id
        WHERE i.base_id = ?
        GROUP BY u.id, u.username, u.look
        ORDER BY copies DESC
      `, [detailBaseId]).catch(() => []);
    }
  }

  const icons = ['','','','','','','','','','','',''];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-4 title-header">
        <div>
          <h2 className="text-xl font-bold">Rare Values</h2>
          <p className="text-xs text-text-secondary mt-0.5">Track the latest furni values and limited editions</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        <Link href="/rares?tab=rares" className="no-underline" style={{ flex: 1, padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, cursor: 'pointer', borderRadius: 'var(--radius) 0 0 var(--radius)', background: tab === 'rares' ? 'var(--green)' : 'var(--panel-bg)', color: tab === 'rares' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
          Rare Values
        </Link>
        <Link href="/rares?tab=ltd" className="no-underline" style={{ flex: 1, padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, cursor: 'pointer', borderRadius: '0 var(--radius) var(--radius) 0', background: tab === 'ltd' ? 'var(--green)' : 'var(--panel-bg)', color: tab === 'ltd' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', borderLeft: 'none' }}>
          LTD Items
        </Link>
      </div>

      {tab === 'rares' && (
        <>
          <div className="flex gap-2.5 mb-5 flex-wrap items-center">
            <Link href="/rares?tab=rares&cat=all" className={`btn btn-sm no-underline ${cat === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All</Link>
            {categories.map(c => (
              <Link key={c.category} href={`/rares?tab=rares&cat=${encodeURIComponent(c.category)}`}
                className={`btn btn-sm no-underline ${cat === c.category ? 'btn-primary' : 'btn-secondary'}`}>
                {c.category}
              </Link>
            ))}
            <form method="GET" action="/rares" className="ml-auto flex gap-2">
              <input type="hidden" name="tab" value="rares" />
              <input type="hidden" name="cat" value={cat} />
              <input type="text" name="q" className="input !w-48 !py-2 !px-3.5" placeholder="Search rares..." defaultValue={search} />
              <button type="submit" className="btn btn-secondary btn-sm"></button>
            </form>
          </div>

          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
            {rares.map((rare, i) => (
              <div key={rare.id} className="panel p-4 flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-1 hover:border-border-hover relative overflow-hidden">
                {rare.is_new ? <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">NEW</span> : null}
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl pixel-render flex-shrink-0"
                  style={{ background: `${rare.color}55`, border: `1px solid ${rare.color}88` }}>
                  {rare.item_image ? <img src={rare.item_image} alt="" className="w-8 h-8" /> : icons[i % icons.length]}
                </div>
                <div>
                  <div className={`text-[11px] ${rare.trend === 'up' ? 'text-green-400' : rare.trend === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {rare.trend === 'up' ? '▲ Rising' : rare.trend === 'down' ? '▼ Falling' : '● Stable'}
                  </div>
                  <div className="text-sm font-semibold">{rare.item_name}</div>
                  <div className="text-xs text-text-secondary">{rare.value}</div>
                  {rare.market_avg && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    Avg: {parseInt(rare.market_avg).toLocaleString()} | Low: {parseInt(rare.market_low || 0).toLocaleString()} | High: {parseInt(rare.market_high || 0).toLocaleString()}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({Math.min(rare.trade_count, 20)} trades)</span>
                  </div>}
                  <div style={{ marginTop: 6 }}>
                    <span className="text-[10px] text-text-muted">{rare.category}</span>
                    <Link href={`/marketplace/item?name=${encodeURIComponent(rare.item_name)}`} style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: 'rgba(52,189,89,0.1)', border: '1px solid rgba(52,189,89,0.2)' }}>More →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rares.length === 0 && (
            <div className="card p-16 text-center text-text-muted">
              {search ? `No rares found matching "${search}".` : 'No rare values listed yet.'}
            </div>
          )}

          {pages > 1 && (
            <div className="flex gap-1.5 justify-center mt-6">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <Link key={p} href={`/rares?tab=rares&cat=${encodeURIComponent(cat)}&q=${encodeURIComponent(search)}&p=${p}`}
                  className={`px-3.5 py-2 rounded-md text-[13px] border no-underline transition-all
                    ${p === page ? 'bg-accent text-bg-primary border-accent font-bold' : 'border-border text-text-secondary hover:border-accent hover:text-accent'}`}>
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'ltd' && (
        <div>
          {/* Search */}
          <form method="GET" action="/rares" className="flex gap-2 mb-5" style={{ maxWidth: 340 }}>
            <input type="hidden" name="tab" value="ltd" />
            <input type="text" name="q" className="input !w-full !py-2 !px-3.5" placeholder="Search LTD items..." defaultValue={search} />
            <button type="submit" className="btn btn-secondary btn-sm"></button>
          </form>

          {detailBaseId && ltdDetail ? (
            /* Detail view for one LTD item */
            <div>
              <Link href="/rares?tab=ltd" className="btn btn-secondary btn-sm" style={{ marginBottom: 16, display: 'inline-flex' }}>← Back to LTD list</Link>
              <div className="panel no-hover" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                  <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 16, flexShrink: 0 }}>
                    <span style={{ fontSize: 36 }}>🔒</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 800 }}>{ltdDetail.public_name}</h2>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, background: 'rgba(245,200,66,0.15)', color: '#f5c842' }}>LTD</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {ltdDetail.limited_sells} / {ltdDetail.limit_number} copies claimed
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ background: 'var(--panel-inner)', borderRadius: 8, height: 8, width: 300, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 8, background: 'var(--green)', width: `${Math.min(100, (ltdDetail.limited_sells / ltdDetail.limit_number) * 100)}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {ltdDetail.limit_number - ltdDetail.limited_sells} remaining
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel no-hover" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  Owners ({ltdOwners.length} unique {ltdOwners.length === 1 ? 'player' : 'players'})
                </h3>
                {ltdOwners.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No one owns this item in-game.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ltdOwners.map((o, i) => (
                      <div key={o.username} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--panel-inner)', borderRadius: 'var(--radius)' }}>
                        <div style={{ width: 24, fontSize: 12, fontWeight: 800, color: i === 0 ? '#f5c842' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)', flexShrink: 0 }}>#{i+1}</div>
                        <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${o.look}&headonly=1&size=s`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--panel-bg)' }} />
                        <div style={{ flex: 1 }}>
                          <Link href={`/profile/${o.username}`} className="no-underline" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{o.username}</Link>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                          {o.copies === 1 ? '1 copy' : `${o.copies} copies`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* LTD list view */
            <div>
              {ltdItems.length === 0 ? (
                <div className="card p-16 text-center text-text-muted">
                  {search ? `No LTD items found matching "${search}".` : 'No limited items found in the database.'}
                </div>
              ) : (
                <div className="r-grid-3" style={{ gap: 14 }}>
                  {ltdItems.map(item => {
                    const pct = item.limit_number > 0 ? Math.min(100, (item.limited_sells / item.limit_number) * 100) : 0;
                    return (
                      <Link key={item.id} href={`/rares?tab=ltd&ltd_id=${item.id}`} className="no-underline">
                        <div className="panel" style={{ padding: 18, cursor: 'pointer', transition: 'all .15s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{item.public_name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.item_name}</div>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,200,66,0.15)', color: '#f5c842', whiteSpace: 'nowrap', marginLeft: 8 }}>LTD</span>
                          </div>

                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                              <span>{item.limited_sells} / {item.limit_number} claimed</span>
                              <span>{Math.round(pct)}%</span>
                            </div>
                            <div style={{ background: 'var(--panel-inner)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 4, background: pct >= 100 ? '#EF5856' : 'var(--green)', width: `${pct}%` }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.owner_count}</span> owner{item.owner_count !== 1 ? 's' : ''}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.total_copies_in_game}</span> in-game
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
