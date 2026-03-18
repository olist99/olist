import Link from 'next/link';
import { query, queryScalar } from '@/lib/db';
import CaseBuilder from '@/app/admin/CaseBuilder';

const RARITY_COLORS = {
  common:    '#aaa',
  uncommon:  '#34bd59',
  rare:      '#3b82f6',
  epic:      '#a442c2',
  legendary: '#f5a623',
};

export default async function GamblingSection({ view, sp, user }) {

  // ── Case Builder (list) ────────────────────────────────────────────────────
  if (view === 'cases') {
    const cases = await query(
      `SELECT c.*, COUNT(ci.id) AS item_count
       FROM cms_cases c
       LEFT JOIN cms_case_items ci ON ci.case_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC`
    ).catch(() => null);

    async function deleteCaseAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 5) redirect('/admin');
      const id = parseInt(formData.get('id'));
      if (id) {
        await db('DELETE FROM cms_case_items WHERE case_id = ?', [id]);
        await db('DELETE FROM cms_cases WHERE id = ?', [id]);
      }
      redirect('/admin?tab=gambling&view=cases&success=Case+deleted');
    }

    return (
      <div>
        <SectionHeader title="Case Manager" sub={cases ? `${cases.length} cases` : ''} back="gambling">
          <Link href="/admin?tab=gambling&view=case-create" className="btn btn-primary btn-sm">+ New Case</Link>
        </SectionHeader>

        {cases === null ? (
          <ErrorPanel msg="cms_cases table not found." />
        ) : cases.length === 0 ? (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>No cases created yet.</p>
            <Link href="/admin?tab=gambling&view=case-create" className="btn btn-primary btn-sm">Create First Case</Link>
          </div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <table className="table-panel">
              <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td>{c.image ? <img src={c.image} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4 }} /> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td style={{ color: '#f5c842', fontWeight: 700 }}>{parseInt(c.price || 0).toLocaleString()} pts</td>
                    <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.item_count} items</span></td>
                    <td>{c.active ? <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 11 }}>Active</span> : <span style={{ color: '#EF5856', fontSize: 11 }}>Inactive</span>}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <Link href={`/admin?tab=gambling&view=case-edit&id=${c.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 9 }}>Edit</Link>
                      <form action={deleteCaseAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn btn-delete" style={{ fontSize: 9, color: '#EF5856', background: 'rgba(239,88,86,0.1)', border: '1px solid rgba(239,88,86,0.3)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Create Case ────────────────────────────────────────────────────────────
  if (view === 'case-create') {
    return (
      <div>
        <SectionHeader title="Create Case" sub="Build a new loot case" back="gambling&view=cases" />
        <CaseBuilder />
      </div>
    );
  }

  // ── Edit Case + Manage Items ───────────────────────────────────────────────
  if (view === 'case-edit') {
    const caseId = parseInt(sp?.id);
    if (!caseId) return <div><SectionHeader title="Edit Case" back="gambling&view=cases" /><ErrorPanel msg="No case ID provided." /></div>;

    const [caseRow, items] = await Promise.all([
      query('SELECT * FROM cms_cases WHERE id = ?', [caseId]).then(r => r[0] || null).catch(() => null),
      query(`SELECT ci.*, ib.public_name AS furni_name, ib.item_name AS furni_base_name
             FROM cms_case_items ci
             LEFT JOIN items_base ib ON ib.id = ci.reward_furni_base_id
             WHERE ci.case_id = ? ORDER BY ci.drop_chance DESC`, [caseId]).catch(() => []),
    ]);

    if (!caseRow) return <div><SectionHeader title="Edit Case" back="gambling&view=cases" /><ErrorPanel msg="Case not found." /></div>;

    return (
      <div>
        <SectionHeader title={`Edit: ${caseRow.name}`} sub={`${items.length} items`} back="gambling&view=cases" />
        <CaseBuilder editCase={caseRow} editItems={items} />
      </div>
    );
  }

  // ── Recent Logs ────────────────────────────────────────────────────────────
  if (view === 'logs') {
    const logs = await query(`
      SELECT gl.*, u.username FROM cms_gambling_log gl
      LEFT JOIN users u ON u.id = gl.user_id
      ORDER BY gl.created_at DESC LIMIT 200
    `).catch(() => null);

    return (
      <div>
        <SectionHeader title="Gambling Logs" sub="Last 200 bets across all games" back="gambling" />
        {logs === null ? (
          <ErrorPanel msg="cms_gambling_log table not found." />
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No gambling activity yet.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>Player</th><th>Game</th><th>Bet</th><th>Result</th><th>Detail</th><th>Time</th></tr></thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i}>
                      <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)' }}>{l.username || `#${l.user_id}`}</Link></td>
                      <td><span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 3, textTransform: 'capitalize' }}>{l.game}</span></td>
                      <td style={{ color: '#f5c842', fontWeight: 700 }}>{parseInt(l.bet || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: l.profit > 0 ? '#34bd59' : '#EF5856' }}>
                        {l.profit > 0 ? `+${parseInt(l.profit).toLocaleString()}` : parseInt(l.profit).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{l.detail || '—'}</td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Overview / Statistics (default) ───────────────────────────────────────
  const [
    totalBets,
    totalWagered,
    houseProfit,
    bets24h,
    wagered24h,
    houseProfit24h,
    byGame,
    byGame24h,
    topWinners,
    topLosers,
    recentLogs,
    totalCases,
    activeCases,
    coinflipTotal,
    duelTotal,
  ] = await Promise.all([
    queryScalar('SELECT COUNT(*) FROM cms_gambling_log').catch(() => null),
    queryScalar('SELECT COALESCE(SUM(bet),0) FROM cms_gambling_log').catch(() => null),
    queryScalar('SELECT COALESCE(SUM(profit),0) * -1 FROM cms_gambling_log').catch(() => null),
    queryScalar('SELECT COUNT(*) FROM cms_gambling_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)').catch(() => 0),
    queryScalar('SELECT COALESCE(SUM(bet),0) FROM cms_gambling_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)').catch(() => 0),
    queryScalar('SELECT COALESCE(SUM(profit),0) * -1 FROM cms_gambling_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)').catch(() => 0),
    query('SELECT game, COUNT(*) AS bets, SUM(bet) AS wagered, SUM(profit) * -1 AS house_profit FROM cms_gambling_log GROUP BY game ORDER BY bets DESC').catch(() => []),
    query('SELECT game, COUNT(*) AS bets, SUM(bet) AS wagered, SUM(profit) * -1 AS house_profit FROM cms_gambling_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY game ORDER BY bets DESC').catch(() => []),
    query('SELECT u.id, u.username, SUM(gl.profit) AS net FROM cms_gambling_log gl JOIN users u ON u.id = gl.user_id WHERE gl.profit > 0 GROUP BY gl.user_id ORDER BY net DESC LIMIT 10').catch(() => []),
    query('SELECT u.id, u.username, SUM(gl.profit) AS net FROM cms_gambling_log gl JOIN users u ON u.id = gl.user_id WHERE gl.profit < 0 GROUP BY gl.user_id ORDER BY net ASC LIMIT 10').catch(() => []),
    query('SELECT gl.*, u.username FROM cms_gambling_log gl LEFT JOIN users u ON u.id = gl.user_id ORDER BY gl.created_at DESC LIMIT 10').catch(() => []),
    queryScalar('SELECT COUNT(*) FROM cms_cases').catch(() => null),
    queryScalar("SELECT COUNT(*) FROM cms_cases WHERE active = 1").catch(() => 0),
    queryScalar("SELECT COUNT(*) FROM cms_coinflip_battles WHERE status = 'done'").catch(() => null),
    queryScalar("SELECT COUNT(*) FROM cms_duel_rooms WHERE status = 'done'").catch(() => null),
  ]);

  const noData = totalBets === null;
  const fmt = n => parseInt(n || 0).toLocaleString();
  const profitColor = n => parseInt(n || 0) >= 0 ? '#34bd59' : '#EF5856';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Gambling Overview</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Statistics across all games</p>
        </div>
        <Link href="/admin?tab=gambling&view=cases" className="btn btn-primary btn-sm">Case Builder →</Link>
      </div>

      {noData ? (
        <ErrorPanel msg="cms_gambling_log table not found. Gambling stats require this table." />
      ) : (
        <>
          {/* ── 24h Stats ── */}
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Last 24 Hours</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Bets Placed',       val: fmt(bets24h),        color: '#3b82f6' },
              { label: 'Diamonds Wagered',   val: fmt(wagered24h),     color: '#f5c842' },
              { label: 'House Profit',        val: fmt(houseProfit24h), color: profitColor(houseProfit24h), prefix: parseInt(houseProfit24h||0) >= 0 ? '+' : '' },
            ].map((s, i) => (
              <div key={i} className="panel no-hover" style={{ padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.prefix||''}{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── All-time Stats ── */}
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>All Time</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Bets',          val: fmt(totalBets),       color: '#3b82f6' },
              { label: 'Total Wagered',        val: fmt(totalWagered),    color: '#f5c842' },
              { label: 'House Profit (total)', val: fmt(houseProfit),     color: profitColor(houseProfit), prefix: parseInt(houseProfit||0) >= 0 ? '+' : '' },
              { label: 'Cases',                val: `${fmt(activeCases)} / ${fmt(totalCases)}`, color: '#a442c2', sub: 'active / total' },
            ].map((s, i) => (
              <div key={i} className="panel no-hover" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.prefix||''}{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub || s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Per-game breakdown 24h */}
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>By Game — Last 24h</h4>
              {byGame24h.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 12 }}>No activity in last 24h</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Game</th><th>Bets</th><th>Wagered</th><th>House P/L</th></tr></thead>
                  <tbody>
                    {byGame24h.map((g, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{g.game}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{fmt(g.bets)}</td>
                        <td style={{ color: '#f5c842', fontWeight: 700 }}>{fmt(g.wagered)}</td>
                        <td style={{ fontWeight: 700, color: parseInt(g.house_profit||0) >= 0 ? '#34bd59' : '#EF5856' }}>
                          {parseInt(g.house_profit||0) >= 0 ? '+' : ''}{fmt(g.house_profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Per-game breakdown all time */}
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>By Game — All Time</h4>
              {byGame.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 12 }}>No gambling data yet</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Game</th><th>Bets</th><th>Wagered</th><th>House P/L</th></tr></thead>
                  <tbody>
                    {byGame.map((g, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{g.game}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{fmt(g.bets)}</td>
                        <td style={{ color: '#f5c842', fontWeight: 700 }}>{fmt(g.wagered)}</td>
                        <td style={{ fontWeight: 700, color: parseInt(g.house_profit||0) >= 0 ? '#34bd59' : '#EF5856' }}>
                          {parseInt(g.house_profit||0) >= 0 ? '+' : ''}{fmt(g.house_profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Top winners */}
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Winners (all time)</h4>
              <table className="table-panel">
                <thead><tr><th>#</th><th>Player</th><th>Net Won</th></tr></thead>
                <tbody>
                  {topWinners.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>No data</td></tr>}
                  {topWinners.map((w, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                      <td><Link href={`/admin?tab=users&view=profile&id=${w.id}`} style={{ color: 'var(--green)' }}>{w.username}</Link></td>
                      <td style={{ fontWeight: 700, color: '#34bd59' }}>+{fmt(w.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top losers */}
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Losers (all time)</h4>
              <table className="table-panel">
                <thead><tr><th>#</th><th>Player</th><th>Net Lost</th></tr></thead>
                <tbody>
                  {topLosers.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>No data</td></tr>}
                  {topLosers.map((w, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                      <td><Link href={`/admin?tab=users&view=profile&id=${w.id}`} style={{ color: 'var(--green)' }}>{w.username}</Link></td>
                      <td style={{ fontWeight: 700, color: '#EF5856' }}>{fmt(w.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent logs */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700 }}>Recent Bets</h4>
              <Link href="/admin?tab=gambling&view=logs" style={{ fontSize: 11, color: 'var(--green)' }}>View all →</Link>
            </div>
            <table className="table-panel">
              <thead><tr><th>Player</th><th>Game</th><th>Bet</th><th>Result</th><th>Detail</th><th>Time</th></tr></thead>
              <tbody>
                {recentLogs.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 12 }}>No bets yet</td></tr>}
                {recentLogs.map((l, i) => (
                  <tr key={i}>
                    <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)' }}>{l.username || `#${l.user_id}`}</Link></td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 3, textTransform: 'capitalize' }}>{l.game}</span></td>
                    <td style={{ color: '#f5c842', fontWeight: 700 }}>{fmt(l.bet)}</td>
                    <td style={{ fontWeight: 700, color: l.profit > 0 ? '#34bd59' : '#EF5856' }}>
                      {l.profit > 0 ? '+' : ''}{fmt(l.profit)}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{l.detail || '—'}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, sub, back, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {children}
        <Link href={`/admin?tab=${back}`} className="btn btn-secondary btn-sm">← Back</Link>
      </div>
    </div>
  );
}

function ErrorPanel({ msg }) {
  return (
    <div className="panel no-hover" style={{ padding: 24 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623' }}>{msg}</p>
    </div>
  );
}
