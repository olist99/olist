import Link from 'next/link';
import { query, queryScalar } from '@/lib/db';
import { formatNumber } from '@/lib/utils';

const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

export default async function DashboardSection({ view, sp, user }) {
  const [
    totalUsers, onlineUsers, newReg24h, openTickets, activeRooms,
    marketplaceVol, totalRares, totalNews, creditsToday,
    marketplaceDiamonds, diamondsToday, auctionActive, auctionBids24h, forumPosts24h, pluginsActive,
  ] = await Promise.all([
    queryScalar('SELECT COUNT(*) FROM users'),
    queryScalar("SELECT COUNT(*) FROM users WHERE online = '1'"),
    queryScalar("SELECT COUNT(*) FROM users WHERE account_created >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 24 HOUR))").catch(() => 0),
    queryScalar("SELECT COUNT(*) FROM cms_tickets WHERE status = 'open'").catch(() => 0),
    queryScalar("SELECT COUNT(*) FROM rooms WHERE users > 0").catch(() => 0),
    queryScalar("SELECT COALESCE(SUM(price),0) FROM cms_marketplace WHERE currency != 'points' AND status = 'sold' AND sold_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() =>
      0
    ),
    queryScalar('SELECT COUNT(*) FROM cms_rare_values').catch(() => 0),
    queryScalar('SELECT COUNT(*) FROM cms_news').catch(() => 0),
    queryScalar("SELECT COALESCE(SUM(amount),0) FROM cms_credit_log WHERE currency = 'credits' AND amount > 0 AND created_at >= CURDATE()").catch(() => null),
    queryScalar("SELECT COALESCE(SUM(price),0) FROM cms_marketplace WHERE currency = 'points' AND status = 'sold' AND sold_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() => 0),
    queryScalar("SELECT COALESCE(SUM(amount),0) FROM cms_credit_log WHERE currency = 'points' AND amount > 0 AND created_at >= CURDATE()").catch(() => null),
    queryScalar("SELECT COUNT(*) FROM cms_auctions WHERE status = 'active'").catch(() => 0),
    queryScalar("SELECT COUNT(*) FROM cms_auction_bids WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() => 0),
    queryScalar("SELECT COUNT(*) FROM cms_forum_replies WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() =>
      queryScalar("SELECT COUNT(*) FROM cms_forum_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() => null)
    ),
    queryScalar("SELECT COUNT(*) FROM cms_plugins WHERE active = 1").catch(() => null),
  ]);

  // ── Users Online ──────────────────────────────────────────────────────────
  if (view === 'users-online') {
    const list = await query(
      "SELECT u.id, u.username, u.`rank`, u.look, u.last_online, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.online = '1' ORDER BY u.`rank` DESC, u.username ASC LIMIT 200"
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="Users Online" sub={`${list.length} players currently in the hotel`} back="dashboard" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {list.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No users online right now.</p>
          ) : (
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Avatar</th><th>Username</th><th>Rank</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(u => (
                  <tr key={u.id}>
                    <td><img src={`${HABBO_IMG}?figure=${encodeURIComponent(u.look||'')}&headonly=1&size=s`} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} /></td>
                    <td><Link href={`/profile/${u.username}`} style={{ color: 'var(--green)' }}>{u.username}</Link></td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{u.rank_name || `Rank ${u.rank}`}</span></td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} className="btn btn-primary btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    );
  }

  // ── New Registrations ─────────────────────────────────────────────────────
  if (view === 'registrations') {
    const list = await query(
      "SELECT u.id, u.username, u.mail, u.ip_register, u.account_created, u.`rank`, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.account_created >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 24 HOUR)) ORDER BY u.account_created DESC LIMIT 200"
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="New Registrations (24h)" sub={`${list.length} new accounts in the last 24 hours`} back="dashboard" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {list.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No new registrations in the last 24 hours.</p>
          ) : (
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>IP</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {list.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{u.id}</td>
                    <td style={{ fontWeight: 700 }}>{u.username}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.mail}</td>
                    <td><Link href={`/admin?tab=users&view=ip-history&ip=${encodeURIComponent(u.ip_register)}`} style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{u.ip_register}</Link></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.account_created ? new Date(u.account_created * 1000).toLocaleString() : '—'}</td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} className="btn btn-primary btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    );
  }

  // ── Credits Generated Today ───────────────────────────────────────────────
  if (view === 'credits-today') {
    const currencyFilter = ['credits', 'pixels', 'points', 'gotw'].includes(sp?.currency) ? sp.currency : null;

    const tabs = [
      { key: null,      label: 'All Currencies' },
      { key: 'credits', label: 'Credits' },
      { key: 'pixels',  label: 'Duckets' },
      { key: 'points',  label: 'Diamonds' },
      { key: 'gotw',    label: 'GOTW' },
    ];

    const tabBar = (
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const href = t.key === null
            ? '/admin?tab=dashboard&view=credits-today'
            : `/admin?tab=dashboard&view=credits-today&currency=${t.key}`;
          const active = currencyFilter === t.key;
          return (
            <Link key={String(t.key)} href={href} className="btn btn-sm" style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: active ? 700 : 500,
              background: active ? 'var(--green)' : 'rgba(255,255,255,0.06)',
              color: active ? '#fff' : 'var(--text-secondary)',
              border: active ? '1px solid var(--green)' : '1px solid rgba(255,255,255,0.08)',
              textDecoration: 'none',
            }}>{t.label}</Link>
          );
        })}
      </div>
    );

    // GOTW tab: show top GOTW holders instead of credit log
    if (currencyFilter === 'gotw') {
      const [gotwUsers, gotwTotal] = await Promise.all([
        query('SELECT id, username, gotw FROM users WHERE gotw > 0 ORDER BY gotw DESC LIMIT 50').catch(() => []),
        queryScalar('SELECT COALESCE(SUM(gotw),0) FROM users WHERE gotw > 0').catch(() => 0),
      ]);
      return (
        <div>
          {tabBar}
          <SectionHeader title="Currency Generated Today" sub={`${parseInt(gotwTotal || 0).toLocaleString()} total GOTW in circulation`} back="dashboard" />
          <div className="panel no-hover" style={{ padding: 20 }}>
            {gotwUsers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No players have GOTW points.</p>
            ) : (
              <div className="adm-table-wrap"><table className="table-panel">
                <thead><tr><th>ID</th><th>Username</th><th>GOTW</th></tr></thead>
                <tbody>
                  {gotwUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{u.id}</td>
                      <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{u.username}</Link></td>
                      <td style={{ fontWeight: 700, color: '#f5c842' }}>{parseInt(u.gotw || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>
      );
    }

    // Build credit log query with optional currency filter
    const currencyWhere = currencyFilter ? `AND cl.currency = '${currencyFilter}'` : '';
    const [creditLog, topCredits, hourlyCredits, hourlyPixels, hourlyPoints] = await Promise.all([
      query(
        `SELECT cl.*, u.username AS target_name, a.username AS admin_name
         FROM cms_credit_log cl
         LEFT JOIN users u ON u.id = cl.user_id
         LEFT JOIN users a ON a.id = cl.admin_id
         WHERE cl.created_at >= CURDATE() ${currencyWhere}
         ORDER BY cl.created_at DESC LIMIT 100`
      ).catch(() => null),
      query('SELECT id, username, credits, pixels, points FROM users ORDER BY credits DESC LIMIT 20').catch(() => []),
      query(
        `SELECT HOUR(created_at) AS hr, SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS given,
                ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS taken
         FROM cms_credit_log WHERE currency = 'credits' AND created_at >= CURDATE() GROUP BY HOUR(created_at) ORDER BY hr ASC`
      ).catch(() => []),
      query(
        `SELECT HOUR(created_at) AS hr, SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS given
         FROM cms_credit_log WHERE currency = 'pixels' AND created_at >= CURDATE() GROUP BY HOUR(created_at) ORDER BY hr ASC`
      ).catch(() => []),
      query(
        `SELECT HOUR(created_at) AS hr, SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS given
         FROM cms_credit_log WHERE currency = 'points' AND created_at >= CURDATE() GROUP BY HOUR(created_at) ORDER BY hr ASC`
      ).catch(() => []),
    ]);

    // Stats: filter based on current tab
    const logForStats = creditLog || [];
    const totalGiven  = currencyFilter
      ? logForStats.filter(l => l.amount > 0).reduce((s, l) => s + (l.amount || 0), 0)
      : logForStats.filter(l => l.amount > 0 && l.currency === 'credits').reduce((s, l) => s + (l.amount || 0), 0);
    const totalTaken  = currencyFilter
      ? logForStats.filter(l => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount || 0), 0)
      : logForStats.filter(l => l.amount < 0 && l.currency === 'credits').reduce((s, l) => s + Math.abs(l.amount || 0), 0);
    const totalPixels = currencyFilter ? 0 : logForStats.filter(l => l.amount > 0 && l.currency === 'pixels').reduce((s, l) => s + (l.amount || 0), 0);
    const totalPoints = currencyFilter ? 0 : logForStats.filter(l => l.amount > 0 && l.currency === 'points').reduce((s, l) => s + (l.amount || 0), 0);

    const maxHourly = Math.max(1, ...hourlyCredits.map(h => h.given || 0));

    const statBoxes = currencyFilter ? [
      { label: `${tabs.find(t => t.key === currencyFilter)?.label || currencyFilter} Given Today`, val: totalGiven,  color: '#34bd59' },
      { label: `${tabs.find(t => t.key === currencyFilter)?.label || currencyFilter} Taken Today`, val: totalTaken,  color: '#EF5856' },
    ] : [
      { label: 'Credits Given Today',  val: totalGiven,  color: '#34bd59' },
      { label: 'Credits Taken Today',  val: totalTaken,  color: '#EF5856' },
      { label: 'Duckets Given Today',  val: totalPixels, color: '#a0b4ff' },
      { label: 'Diamonds Given Today', val: totalPoints, color: '#f5c842' },
    ];

    return (
      <div>
        {tabBar}
        <SectionHeader title="Currency Generated Today" sub={creditLog ? `${creditLog.length} transactions logged today` : 'Credit distribution overview'} back="dashboard" />

        {creditLog === null ? (
          <div className="panel no-hover" style={{ padding: 24, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#f5a623' }}>cms_credit_log table not found</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Run <code>sql/ocms_missing_tables.sql</code> to create the table. Credit changes made via Admin → User Profile are automatically logged once the table exists.
            </p>
          </div>
        ) : (
          <div>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statBoxes.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
              {statBoxes.map((s, i) => (
                <div key={i} className="panel no-hover" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Hourly bar chart */}
            {(!currencyFilter || currencyFilter === 'credits') && hourlyCredits.length > 0 && (
              <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Credits Given — Hourly Breakdown (Today)</h4>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                  {Array.from({ length: 24 }, (_, hr) => {
                    const entry = hourlyCredits.find(h => h.hr === hr);
                    const given = entry?.given || 0;
                    const pct   = Math.round((given / maxHourly) * 100);
                    return (
                      <div key={hr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: '100%', height: pct ? `${pct}%` : 2, background: pct ? 'var(--green)' : 'rgba(255,255,255,0.06)', borderRadius: 2, minHeight: 2, transition: 'height .2s' }} title={`${hr}:00 — ${given.toLocaleString()} credits`} />
                        {hr % 6 === 0 && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{hr}h</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent Transactions Today ({creditLog.length})</h4>
              {creditLog.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No transactions logged today yet. Credit changes via Admin → User Profile will appear here.</p>
              ) : (
                <div className="adm-table-wrap"><table className="table-panel">
                  <thead><tr><th>Time</th><th>Player</th><th>Currency</th><th>Amount</th><th>After</th><th>Reason</th><th>By</th></tr></thead>
                  <tbody>
                    {creditLog.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleTimeString() : '—'}</td>
                        <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{l.target_name || `#${l.user_id}`}</Link></td>
                        <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{l.currency}</span></td>
                        <td style={{ fontWeight: 700, color: l.amount > 0 ? '#34bd59' : '#EF5856' }}>{l.amount > 0 ? '+' : ''}{parseInt(l.amount||0).toLocaleString()}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.balance_after != null ? parseInt(l.balance_after).toLocaleString() : '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason || '—'}</td>
                        <td style={{ fontSize: 11 }}>{l.admin_name || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </div>
          </div>
        )}

        {/* Top credit holders always shown */}
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Top Credit Holders</h4>
          <div className="adm-table-wrap"><table className="table-panel">
            <thead><tr><th>Username</th><th>Credits</th><th>Duckets</th><th>Diamonds</th></tr></thead>
            <tbody>
              {topCredits.map(u => (
                <tr key={u.id}>
                  <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} style={{ color: 'var(--green)' }}>{u.username}</Link></td>
                  <td style={{ fontWeight: 700 }}>{parseInt(u.credits||0).toLocaleString()}</td>
                  <td>{parseInt(u.pixels||0).toLocaleString()}</td>
                  <td>{parseInt(u.points||0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    );
  }

  // ── Marketplace Volume ────────────────────────────────────────────────────
  if (view === 'marketplace-vol') {
    const recent = await query(
      `SELECT m.*, ib.public_name, u.username AS seller_name
       FROM cms_marketplace m
       LEFT JOIN items_base ib ON ib.id = m.item_base_id
       LEFT JOIN users u ON u.id = m.seller_id
       WHERE m.status = 'sold' AND m.sold_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY m.sold_at DESC LIMIT 100`
    ).catch(() => []);
    const creditVol   = recent.filter(r => r.currency !== 'points').reduce((s, r) => s + (parseInt(r.price) || 0), 0);
    const diamondVol  = recent.filter(r => r.currency === 'points').reduce((s, r) => s + (parseInt(r.price) || 0), 0);
    return (
      <div>
        <SectionHeader title="Marketplace Volume (24h)" sub={`${parseInt(creditVol).toLocaleString()} credits · ${parseInt(diamondVol).toLocaleString()} diamonds traded`} back="dashboard" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div className="panel no-hover" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#a442c2' }}>{parseInt(creditVol).toLocaleString()}<span style={{ fontSize: 12, marginLeft: 4 }}>credits</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Credits traded (24h)</div>
          </div>
          <div className="panel no-hover" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f5c842' }}>{parseInt(diamondVol).toLocaleString()}<span style={{ fontSize: 12, marginLeft: 4 }}>diamonds</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Diamonds traded (24h)</div>
          </div>
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          {recent.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No marketplace sales in the last 24 hours.</p>
          ) : (
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Item</th><th>Seller</th><th>Price</th><th>Currency</th><th>Sold At</th></tr></thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.public_name || r.title || r.item_name || `Item #${r.id}`}</td>
                    <td>{r.seller_name || '—'}</td>
                    <td style={{ color: r.currency === 'points' ? '#f5c842' : '#f5a623', fontWeight: 700 }}>{parseInt(r.price||0).toLocaleString()}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{r.currency === 'points' ? 'diamonds' : r.currency || 'credits'}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.sold_at ? new Date(r.sold_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    );
  }

  // ── Auction House ─────────────────────────────────────────────────────────
  if (view === 'auction-house') {
    const [active, recent, topBids] = await Promise.all([
      query(
        `SELECT a.*, u.username AS creator_name,
                b.amount AS top_bid, bu.username AS top_bidder
         FROM cms_auctions a
         LEFT JOIN users u ON u.id = a.created_by
         LEFT JOIN cms_auction_bids b ON b.id = (SELECT id FROM cms_auction_bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1)
         LEFT JOIN users bu ON bu.id = b.user_id
         WHERE a.status = 'active' ORDER BY a.end_time ASC LIMIT 50`
      ).catch(() => []),
      query(
        `SELECT a.title, a.currency, b.amount, b.created_at, u.username AS bidder
         FROM cms_auction_bids b
         JOIN cms_auctions a ON a.id = b.auction_id
         JOIN users u ON u.id = b.user_id
         WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY b.created_at DESC LIMIT 50`
      ).catch(() => []),
      queryScalar("SELECT COUNT(*) FROM cms_auction_bids WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() => 0),
    ]);
    return (
      <div>
        <SectionHeader title="Auction House" sub={`${active.length} active auctions · ${topBids} bids placed (24h)`} back="dashboard" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div className="panel no-hover" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#a0b4ff' }}>{active.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Active auctions</div>
          </div>
          <div className="panel no-hover" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{parseInt(topBids).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Bids placed (24h)</div>
          </div>
        </div>
        {active.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Active Auctions</h4>
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Title</th><th>Type</th><th>Top Bid</th><th>Bidder</th><th>Ends</th></tr></thead>
              <tbody>
                {active.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: a.is_official ? 'rgba(160,180,255,0.15)' : 'rgba(255,255,255,0.06)', color: a.is_official ? '#a0b4ff' : 'inherit' }}>{a.is_official ? 'Official' : 'Player'}</span></td>
                    <td style={{ color: '#f5a623', fontWeight: 700 }}>{a.top_bid ? parseInt(a.top_bid).toLocaleString() : `${parseInt(a.start_bid||0).toLocaleString()} (start)`}</td>
                    <td style={{ fontSize: 11 }}>{a.top_bidder || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.end_time ? new Date(a.end_time).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
        {recent.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Recent Bids (24h)</h4>
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Auction</th><th>Bidder</th><th>Amount</th><th>Currency</th><th>Time</th></tr></thead>
              <tbody>
                {recent.map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</td>
                    <td style={{ fontSize: 11 }}>{b.bidder}</td>
                    <td style={{ color: '#f5a623', fontWeight: 700 }}>{parseInt(b.amount||0).toLocaleString()}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{b.currency}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.created_at ? new Date(b.created_at).toLocaleTimeString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
        {active.length === 0 && recent.length === 0 && (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No active auctions or recent bids.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Forum Volume ──────────────────────────────────────────────────────────
  if (view === 'forum-volume') {
    const [recentPosts, topPosters, threadActivity] = await Promise.all([
      query(
        `SELECT r.*, u.username, t.title AS thread_title
         FROM cms_forum_replies r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN cms_forum_threads t ON t.id = r.thread_id
         WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY r.created_at DESC LIMIT 50`
      ).catch(() => []),
      query(
        `SELECT r.user_id, u.username, COUNT(*) AS post_count
         FROM cms_forum_replies r
         JOIN users u ON u.id = r.user_id
         WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY r.user_id, u.username ORDER BY post_count DESC LIMIT 10`
      ).catch(() => []),
      query(
        `SELECT t.title, COUNT(r.id) AS replies
         FROM cms_forum_replies r
         JOIN cms_forum_threads t ON t.id = r.thread_id
         WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY t.id, t.title ORDER BY replies DESC LIMIT 10`
      ).catch(() => []),
    ]);
    return (
      <div>
        <SectionHeader title="Forum Posts Volume (24h)" sub={`${recentPosts.length} posts in the last 24 hours`} back="dashboard" />
        {recentPosts.length === 0 ? (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No forum activity in the last 24 hours.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Posters (24h)</h4>
              <div className="adm-table-wrap"><table className="table-panel">
                <thead><tr><th>Player</th><th>Posts</th></tr></thead>
                <tbody>
                  {topPosters.map((p, i) => (
                    <tr key={i}>
                      <td><Link href={`/admin?tab=users&view=profile&id=${p.user_id}`} style={{ color: 'var(--green)' }}>{p.username}</Link></td>
                      <td style={{ fontWeight: 700, color: '#a0b4ff' }}>{p.post_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Most Active Threads (24h)</h4>
              <div className="adm-table-wrap"><table className="table-panel">
                <thead><tr><th>Thread</th><th>Replies</th></tr></thead>
                <tbody>
                  {threadActivity.map((t, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>{t.replies}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Plugin Volume ─────────────────────────────────────────────────────────
  if (view === 'plugin-volume') {
    const plugins = await query('SELECT * FROM cms_plugins ORDER BY active DESC, name ASC').catch(() => null);
    return (
      <div>
        <SectionHeader title="Plugin Volume" sub={plugins ? `${plugins.filter(p => p.active).length} active plugins` : 'Plugin overview'} back="dashboard" />
        {plugins === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_plugins table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>The plugin system table has not been created yet. Install at least one plugin to initialise the table.</p>
            <Link href="/admin?tab=plugins" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Go to Plugin Manager</Link>
          </div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            {plugins.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No plugins installed.</p>
            ) : (
              <div className="adm-table-wrap"><table className="table-panel">
                <thead><tr><th>Plugin</th><th>Version</th><th>Status</th></tr></thead>
                <tbody>
                  {plugins.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{p.name || p.plugin_name || `Plugin #${p.id}`}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.version || '—'}</td>
                      <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: p.active ? '#34bd59' : '#EF5856', background: p.active ? 'rgba(52,189,89,0.12)' : 'rgba(239,88,86,0.12)' }}>{p.active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Active Rooms ──────────────────────────────────────────────────────────
  if (view === 'active-rooms') {
    const rooms = await query(
      'SELECT r.id, r.name, r.description, r.users, r.score, r.state, u.username AS owner_name FROM rooms r LEFT JOIN users u ON u.id = r.owner_id WHERE r.users > 0 ORDER BY r.users DESC LIMIT 100'
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="Active Rooms" sub={`${rooms.length} rooms currently occupied`} back="dashboard" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {rooms.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No rooms occupied right now.</p>
          ) : (
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Room Name</th><th>Owner</th><th>Players</th><th>Score</th><th>State</th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ fontSize: 11 }}>{r.owner_name || '—'}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--green)' }}>{r.users}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.score}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{r.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    );
  }

  // ── Open Support Tickets ──────────────────────────────────────────────────
  if (view === 'open-tickets') {
    const tickets = await query(
      "SELECT t.*, u.username FROM cms_tickets t JOIN users u ON u.id = t.user_id WHERE t.status = 'open' ORDER BY t.created_at ASC LIMIT 100"
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="Open Support Tickets" sub={`${tickets.length} tickets awaiting a response`} back="dashboard" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {tickets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No open tickets right now.</p>
          ) : (
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>#</th><th>User</th><th>Subject</th><th>Category</th><th>Opened</th><th></th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{t.id}</td>
                    <td>{t.username}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{t.category}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                    <td><Link href={`/rules/tickets/${t.id}`} className="btn btn-primary btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    );
  }

  // ── Overview (default) ────────────────────────────────────────────────────
  const widgets = [
    { label: 'Users Online',          val: onlineUsers,  color: 'var(--green)', sub: `of ${formatNumber(totalUsers)} total`, dot: true, view: 'users-online' },
    { label: 'New Registrations',     val: newReg24h,    color: '#3b82f6',      sub: 'last 24 hours', view: 'registrations' },
    { label: 'Open Support Tickets',  val: openTickets,  color: openTickets > 0 ? '#EF5856' : 'var(--text-muted)', sub: openTickets > 0 ? 'needs attention' : 'all clear', view: 'open-tickets' },
    { label: 'Active Rooms',          val: activeRooms,  color: '#f5a623',      sub: 'with players now', view: 'active-rooms' },
    { label: 'Marketplace Volume',    val: `${parseInt(marketplaceVol||0).toLocaleString()}c`, color: '#a442c2', sub: `credits · ${parseInt(marketplaceDiamonds||0).toLocaleString()} diamonds (24h)`, raw: true, view: 'marketplace-vol' },
    { label: 'Credits Generated',     val: creditsToday != null ? `${parseInt(creditsToday).toLocaleString()}c` : '—', color: creditsToday > 0 ? '#f5c842' : 'var(--text-muted)', sub: creditsToday != null ? 'given today (admin)' : 'run ocms_missing_tables.sql', raw: true, view: 'credits-today' },
    { label: 'Diamonds Generated',    val: diamondsToday != null ? parseInt(diamondsToday).toLocaleString() : '—', color: diamondsToday > 0 ? '#f5c842' : 'var(--text-muted)', sub: diamondsToday != null ? 'diamonds given today' : 'run ocms_missing_tables.sql', raw: true, view: 'credits-today' },
    { label: 'Auction House',         val: `${parseInt(auctionActive||0)} active`, color: '#a0b4ff', sub: `${parseInt(auctionBids24h||0).toLocaleString()} bids placed (24h)`, raw: true, view: 'auction-house' },
    { label: 'Forum Posts (24h)',     val: forumPosts24h != null ? formatNumber(forumPosts24h) : '—', color: forumPosts24h > 0 ? '#34bd59' : 'var(--text-muted)', sub: forumPosts24h != null ? 'replies posted today' : 'forum tables not found', view: 'forum-volume' },
    { label: 'Active Plugins',        val: pluginsActive != null ? formatNumber(pluginsActive) : '—', color: pluginsActive > 0 ? '#3b82f6' : 'var(--text-muted)', sub: pluginsActive != null ? 'plugins running' : 'cms_plugins not found', view: 'plugin-volume' },
  ];

  return (
    <div>
      {/* Stat widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {widgets.map((w, i) => (
          <Link key={i} href={`/admin?tab=dashboard&view=${w.view}`} className="panel no-hover" style={{ padding: '16px 18px', textDecoration: 'none', display: 'block', transition: 'background .12s' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: w.color, marginBottom: 2 }}>
              {w.dot && onlineUsers > 0 && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', marginRight: 6, verticalAlign: 'middle', boxShadow: '0 0 6px var(--green)' }} />}
              {w.raw ? w.val : formatNumber(w.val)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{w.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.sub}</div>
          </Link>
        ))}
      </div>

      {/* Quick access */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div className="panel no-hover" style={{ padding: '14px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Quick Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Manage Users',      href: '/admin?tab=users' },
              { label: 'Support Tickets',   href: '/admin?tab=moderation&view=reports' },
              { label: 'Event Manager',     href: '/admin?tab=events' },
              { label: 'Plugin Manager',    href: '/admin?tab=plugins' },
              { label: 'Site Settings',     href: '/admin?tab=settings' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: 'var(--panel-inner)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                {l.label} <span style={{ color: 'var(--green)', fontSize: 10 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="panel no-hover" style={{ padding: '14px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Hotel Tools</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Catalog Editor',    href: '/admin/catalog' },
              { label: 'Furniture Manager', href: '/admin/furniture' },
              { label: 'Admin Logs',        href: '/admin/logs' },
              { label: 'Security',          href: '/admin/security' },
              { label: 'Rare Values',       href: '/rares' },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: 'var(--panel-inner)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                {l.label} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="panel no-hover" style={{ padding: '12px 18px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Logged in as <span style={{ color: 'var(--green)', fontWeight: 700 }}>{user.username}</span> · Rank {user.rank} ({user.rank_name || 'Staff'}) · {formatNumber(totalUsers)} total users · {formatNumber(totalNews)} news articles · {formatNumber(totalRares)} tracked rares
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, back }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <Link href={`/admin?tab=${back}`} className="btn btn-secondary btn-sm">← Back</Link>
    </div>
  );
}

function ComingSoonPanel({ feature, description }) {
  return (
    <div className="panel no-hover" style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🚧</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{feature}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>{description}</p>
    </div>
  );
}
