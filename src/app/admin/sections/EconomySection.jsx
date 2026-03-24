import { deleteCaseAction, addRareAction, deleteRareAction } from './actions/economy';
import Link from 'next/link';
import { query, queryOne, queryScalar } from '@/lib/db';
import CaseBuilder from '../CaseBuilder';

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


const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };

export default async function EconomySection({ view, sp, user }) {

  // ── Case Create / Edit ────────────────────────────────────────────────────
  if (view === 'case-create' || view === 'case-edit') {
    const editCase  = view === 'case-edit' && sp?.id ? (await query('SELECT * FROM cms_cases WHERE id = ?', [sp.id]).catch(() => []))[0] || null : null;
    const editItems = view === 'case-edit' && sp?.id ? await query('SELECT ci.*, ib.public_name AS furni_name, ib.item_name AS furni_base_name FROM cms_case_items ci LEFT JOIN items_base ib ON ib.id = ci.reward_furni_base_id WHERE ci.case_id = ? ORDER BY ci.drop_chance DESC', [sp.id]).catch(() => []) : [];
    return <CaseBuilder editCase={editCase} editItems={editItems} />;
  }

  // ── Cases list ────────────────────────────────────────────────────────────
  if (view === 'cases') {
    const casesData = await query('SELECT * FROM cms_cases ORDER BY name').catch(() => []);
    const caseItems = await query('SELECT ci.*, ib.public_name AS furni_name FROM cms_case_items ci LEFT JOIN items_base ib ON ib.id = ci.reward_furni_base_id ORDER BY ci.case_id, ci.drop_chance DESC').catch(() => []);


    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div><h3 style={{ fontSize: 16, fontWeight: 700 }}>Case Builder ({casesData.length})</h3></div>
          <Link href="/admin?tab=economy&view=case-create" className="btn btn-primary btn-sm">+ Create Case</Link>
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          {casesData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No cases yet. Create one to get started!</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Name</th><th>Price</th><th>Items</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {casesData.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td><img src="/images/diamond.png" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} />{c.price}</td>
                    <td>{caseItems.filter(ci => ci.case_id === c.id).length}</td>
                    <td>{c.active ? <span style={{ color: 'var(--green)' }}>Yes</span> : <span style={{ color: '#EF5856' }}>No</span>}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/admin?tab=economy&view=case-edit&id=${c.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                      <form action={deleteCaseAction}><input type="hidden" name="case_id" value={c.id} /><button type="submit" className="btn btn-sm btn-delete">Delete</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Rare Releases ─────────────────────────────────────────────────────────
  if (view === 'rare-releases') {
    const [rares, history] = await Promise.all([
      query('SELECT * FROM cms_rare_values ORDER BY updated_at DESC LIMIT 100').catch(() => null),
      query('SELECT * FROM cms_rare_value_history ORDER BY changed_at DESC LIMIT 20').catch(() => []),
    ]);



    const trendColor = { up: '#34bd59', down: '#EF5856', stable: 'var(--text-muted)' };
    const trendIcon  = { up: '↑', down: '↓', stable: '→' };

    return (
      <div>
        <SectionHeader title="Rare Releases" sub="Track rare item values and releases" back="economy" />

        {rares === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_rare_values table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
            {/* Sidebar: Add Rare form */}
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Add Rare</h4>
              <form action={addRareAction}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Item Name *</label>
                  <input type="text" name="item_name" placeholder="e.g. Sand Dragon" required />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Value *</label>
                  <input type="text" name="value" placeholder="e.g. 45.4k" required />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Trend</label>
                  <select name="trend">
                    <option value="stable">→ Stable</option>
                    <option value="up">↑ Up</option>
                    <option value="down">↓ Down</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Category</label>
                  <input type="text" name="category" placeholder="e.g. Rares" defaultValue="Rares" />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Add Rare</button>
              </form>
            </div>

            {/* Main panel: table of rares */}
            <div>
              <div className="panel no-hover" style={{ padding: 20, marginBottom: 12 }}>
                {rares.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No rare values tracked yet.</p>
                ) : (
                  <table className="table-panel">
                    <thead><tr><th>Item Name</th><th>Value</th><th>Trend</th><th>Category</th><th>Updated</th><th></th></tr></thead>
                    <tbody>
                      {rares.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.item_name}</td>
                          <td style={{ color: '#f5c842', fontWeight: 700 }}>{r.value || '—'}</td>
                          <td style={{ color: trendColor[r.trend] || 'var(--text-muted)', fontWeight: 700 }}>{trendIcon[r.trend] || '→'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.category || '—'}</td>
                          <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—'}</td>
                          <td>
                            <form action={deleteRareAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: '#EF5856', background: 'rgba(239,88,86,0.1)', border: '1px solid rgba(239,88,86,0.3)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Delete</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Recent Value Changes history */}
              {history.length > 0 && (
                <div className="panel no-hover" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Recent Value Changes</h4>
                  <table className="table-panel">
                    <thead><tr><th>Item</th><th>Old Credits</th><th>New Credits</th><th>Changed By</th><th>Date</th></tr></thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{h.item_name}</td>
                          <td style={{ color: '#EF5856' }}>{parseInt(h.old_credits || 0).toLocaleString()}</td>
                          <td style={{ color: '#34bd59' }}>{parseInt(h.new_credits || 0).toLocaleString()}</td>
                          <td style={{ fontSize: 11 }}>{h.changed_by || 'System'}</td>
                          <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.changed_at ? new Date(h.changed_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Marketplace Listings ──────────────────────────────────────────────────
  if (view === 'marketplace') {
    const listings = await query(`
      SELECT m.*, ib.public_name, u.username AS seller_name
      FROM cms_marketplace m
      LEFT JOIN items_base ib ON ib.id = m.item_base_id
      LEFT JOIN users u ON u.id = m.seller_id
      WHERE m.status = 'active'
      ORDER BY m.created_at DESC LIMIT 100
    `).catch(() => []);
    const totalListings = await queryScalar("SELECT COUNT(*) FROM cms_marketplace WHERE status = 'active'").catch(() => 0);
    return (
      <div>
        <SectionHeader title="Marketplace Listings" sub={`${parseInt(totalListings).toLocaleString()} active listings`} back="economy" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {listings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No active marketplace listings.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Item</th><th>Seller</th><th>Price</th><th>Listed</th></tr></thead>
              <tbody>
                {listings.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{m.public_name || m.title || m.item_name || `Item #${m.id}`}</td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${m.seller_id}`} style={{ color: 'var(--green)' }}>{m.seller_name || '—'}</Link></td>
                    <td style={{ fontWeight: 700, color: '#f5a623' }}>{parseInt(m.price||0).toLocaleString()} {m.currency || 'c'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Credit Statistics ─────────────────────────────────────────────────────
  if (view === 'credit-stats') {
    const [totalCredits, totalPixels, totalPoints, avgCredits, richest] = await Promise.all([
      queryScalar('SELECT COALESCE(SUM(credits),0) FROM users').catch(() => 0),
      queryScalar('SELECT COALESCE(SUM(pixels),0) FROM users').catch(() => 0),
      queryScalar('SELECT COALESCE(SUM(points),0) FROM users').catch(() => 0),
      queryScalar('SELECT COALESCE(AVG(credits),0) FROM users').catch(() => 0),
      query('SELECT id, username, credits, pixels, points FROM users ORDER BY credits DESC LIMIT 10').catch(() => []),
    ]);
    return (
      <div>
        <SectionHeader title="Credit Statistics" sub="Current economy overview" back="economy" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Credits in Circulation', val: parseInt(totalCredits||0).toLocaleString(), color: '#f5c842' },
            { label: 'Total Duckets in Circulation', val: parseInt(totalPixels||0).toLocaleString(), color: '#a0b4ff' },
            { label: 'Total Diamonds in Circulation', val: parseInt(totalPoints||0).toLocaleString(), color: '#34bd59' },
          ].map((s, i) => (
            <div key={i} className="panel no-hover" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Top 10 Richest Players</h4>
          <table className="table-panel">
            <thead><tr><th>#</th><th>Username</th><th>Credits</th><th>Duckets</th><th>Diamonds</th></tr></thead>
            <tbody>
              {richest.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: i === 0 ? '#f5c842' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}>{i+1}</td>
                  <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} style={{ color: 'var(--green)' }}>{u.username}</Link></td>
                  <td style={{ color: '#f5c842', fontWeight: 600 }}>{parseInt(u.credits||0).toLocaleString()}</td>
                  <td style={{ color: '#a0b4ff' }}>{parseInt(u.pixels||0).toLocaleString()}</td>
                  <td style={{ color: '#34bd59' }}>{parseInt(u.points||0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Item Circulation ──────────────────────────────────────────────────────
  if (view === 'item-circulation') {
    const topItems = await query(`
      SELECT ib.public_name, ib.item_name, COUNT(i.id) AS qty
      FROM items i JOIN items_base ib ON ib.id = i.item_id
      GROUP BY ib.id ORDER BY qty DESC LIMIT 30
    `).catch(() => []);
    return (
      <div>
        <SectionHeader title="Item Circulation" sub="Most common items owned by players" back="economy" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          <table className="table-panel">
            <thead><tr><th>Item</th><th>Base Name</th><th>Quantity in Game</th></tr></thead>
            <tbody>
              {topItems.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{item.public_name || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.item_name}</td>
                  <td><span style={{ fontWeight: 700, color: 'var(--green)' }}>{parseInt(item.qty).toLocaleString()}</span></td>
                </tr>
              ))}
              {topItems.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No item data found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Marketplace Analytics ─────────────────────────────────────────────────
  if (view === 'analytics') {
    const [sold24h, sold7d, topSellers, topItems] = await Promise.all([
      queryScalar("SELECT COUNT(*) FROM cms_marketplace WHERE status = 'sold' AND sold_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() => 0),
      queryScalar("SELECT COUNT(*) FROM cms_marketplace WHERE status = 'sold' AND sold_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)").catch(() => 0),
      query("SELECT u.username, COUNT(m.id) AS sales, SUM(m.price) AS revenue FROM cms_marketplace m JOIN users u ON u.id = m.seller_id WHERE m.status = 'sold' GROUP BY m.seller_id ORDER BY sales DESC LIMIT 10").catch(() => []),
      query("SELECT ib.public_name, COUNT(m.id) AS sales FROM cms_marketplace m LEFT JOIN items_base ib ON ib.id = m.item_base_id WHERE m.status = 'sold' GROUP BY m.item_base_id ORDER BY sales DESC LIMIT 10").catch(() => []),
    ]);
    return (
      <div>
        <SectionHeader title="Marketplace Analytics" sub="Sales performance and trends" back="economy" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          <div className="panel no-hover" style={{ padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#a442c2' }}>{parseInt(sold24h||0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sales in last 24h</div>
          </div>
          <div className="panel no-hover" style={{ padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{parseInt(sold7d||0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sales in last 7 days</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Top Sellers</h4>
            <table className="table-panel">
              <thead><tr><th>Username</th><th>Sales</th><th>Revenue</th></tr></thead>
              <tbody>
                {topSellers.map((s, i) => (
                  <tr key={i}><td>{s.username}</td><td>{s.sales}</td><td style={{ color: '#f5a623' }}>{parseInt(s.revenue||0).toLocaleString()}c</td></tr>
                ))}
                {topSellers.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Top Selling Items</h4>
            <table className="table-panel">
              <thead><tr><th>Item</th><th>Sales</th></tr></thead>
              <tbody>
                {topItems.map((item, i) => (
                  <tr key={i}><td>{item.public_name || '—'}</td><td>{item.sales}</td></tr>
                ))}
                {topItems.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Economy Alerts ────────────────────────────────────────────────────────
  if (view === 'alerts') {
    const [topRich, bigTransactions, recentLarge, topGainers] = await Promise.all([
      query('SELECT id, username, credits, pixels, points FROM users ORDER BY credits DESC LIMIT 10').catch(() => []),
      query(`SELECT cl.*, u.username AS target_name, a.username AS admin_name
             FROM cms_credit_log cl
             LEFT JOIN users u ON u.id = cl.user_id
             LEFT JOIN users a ON a.id = cl.admin_id
             WHERE ABS(cl.amount) >= 1000
             ORDER BY cl.created_at DESC LIMIT 20`).catch(() => null),
      query(`SELECT cl.user_id, u.username, SUM(CASE WHEN cl.amount > 0 THEN cl.amount ELSE 0 END) AS total_gained,
                    SUM(CASE WHEN cl.amount < 0 THEN ABS(cl.amount) ELSE 0 END) AS total_spent
             FROM cms_credit_log cl
             LEFT JOIN users u ON u.id = cl.user_id
             WHERE cl.created_at >= CURDATE() AND cl.currency = 'credits'
             GROUP BY cl.user_id, u.username
             ORDER BY total_gained DESC LIMIT 10`).catch(() => null),
      query(`SELECT u.id, u.username, u.credits, COUNT(i.id) AS item_count
             FROM users u LEFT JOIN items i ON i.user_id = u.id AND i.room_id = 0
             GROUP BY u.id ORDER BY item_count DESC LIMIT 10`).catch(() => []),
    ]);

    const avgCredits = topRich.length > 0 ? topRich.reduce((s, u) => s + (parseInt(u.credits) || 0), 0) / topRich.length : 0;

    return (
      <div>
        <SectionHeader title="Economy Alerts" sub="Anomaly detection using current economy data" back="economy" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Credit Holders</h4>
            <table className="table-panel">
              <thead><tr><th>User</th><th>Credits</th><th>Duckets</th></tr></thead>
              <tbody>
                {topRich.map((u, i) => (
                  <tr key={u.id}>
                    <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} style={{ color: parseInt(u.credits) > avgCredits * 5 ? '#EF5856' : 'var(--green)', fontWeight: 600 }}>{u.username}</Link></td>
                    <td style={{ fontWeight: 700, color: parseInt(u.credits) > avgCredits * 5 ? '#EF5856' : '#f5c842' }}>{parseInt(u.credits||0).toLocaleString()}</td>
                    <td style={{ color: '#a0b4ff' }}>{parseInt(u.pixels||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Most Items in Inventory</h4>
            <table className="table-panel">
              <thead><tr><th>User</th><th>Credits</th><th>Items</th></tr></thead>
              <tbody>
                {topGainers.map((u, i) => (
                  <tr key={u.id}>
                    <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{u.username}</Link></td>
                    <td style={{ color: '#f5c842' }}>{parseInt(u.credits||0).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: parseInt(u.item_count) > 500 ? '#EF5856' : 'var(--text-secondary)' }}>{parseInt(u.item_count||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {bigTransactions === null ? (
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Install <code>sql/ocms_missing_tables.sql</code> to enable transaction anomaly tracking via cms_credit_log.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Large Transactions (≥1,000 credits)</h4>
              {bigTransactions.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No large transactions logged.</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Time</th><th>Player</th><th>Amount</th><th>By</th></tr></thead>
                  <tbody>
                    {bigTransactions.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                        <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)' }}>{l.target_name || `#${l.user_id}`}</Link></td>
                        <td style={{ fontWeight: 700, color: l.amount > 0 ? '#34bd59' : '#EF5856' }}>{l.amount > 0 ? '+' : ''}{parseInt(l.amount||0).toLocaleString()}</td>
                        <td style={{ fontSize: 11 }}>{l.admin_name || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Credit Gainers Today</h4>
              {recentLarge === null || recentLarge.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No credit log entries today.</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Player</th><th>Gained</th><th>Spent</th></tr></thead>
                  <tbody>
                    {recentLarge.map((l, i) => (
                      <tr key={i}>
                        <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)' }}>{l.username || `#${l.user_id}`}</Link></td>
                        <td style={{ color: '#34bd59', fontWeight: 700 }}>+{parseInt(l.total_gained||0).toLocaleString()}</td>
                        <td style={{ color: '#EF5856' }}>{parseInt(l.total_spent||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}