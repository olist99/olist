import { giveItemAction } from './actions/logs';
import Link from 'next/link';
import { query } from '@/lib/db';

export default async function LogsSection({ view, sp, user }) {

  if (view === 'credit-edits') {
    const logs = await query(
      `SELECT cl.*, u.username AS target_name, a.username AS admin_name
       FROM cms_credit_log cl
       LEFT JOIN users u ON u.id = cl.user_id
       LEFT JOIN users a ON a.id = cl.admin_id
       ORDER BY cl.created_at DESC LIMIT 200`
    ).catch(() => null);
    return (
      <div>
        <SectionHeader title="Credit Edits" sub="Log of all staff currency modifications" back="logs" />
        {logs === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_credit_log table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table. Credit changes via Admin → User Profile are logged automatically.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>No credit edits logged yet.</p></div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <table className="table-panel">
              <thead><tr><th>Time</th><th>Player</th><th>Currency</th><th>Amount</th><th>Balance After</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{l.target_name || `#${l.user_id}`}</Link></td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{l.currency}</span></td>
                    <td style={{ fontWeight: 700, color: l.amount > 0 ? '#34bd59' : '#EF5856' }}>{l.amount > 0 ? '+' : ''}{parseInt(l.amount||0).toLocaleString()}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.balance_after != null ? parseInt(l.balance_after).toLocaleString() : '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason || '—'}</td>
                    <td style={{ fontSize: 11 }}>{l.admin_name || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (view === 'rank-changes') {
    const logs = await query(
      `SELECT rl.*, u.username AS target_name, a.username AS admin_name,
              op.rank_name AS old_rank_name, np.rank_name AS new_rank_name
       FROM cms_rank_log rl
       LEFT JOIN users u ON u.id = rl.user_id
       LEFT JOIN users a ON a.id = rl.admin_id
       LEFT JOIN permissions op ON op.id = rl.old_rank
       LEFT JOIN permissions np ON np.id = rl.new_rank
       ORDER BY rl.created_at DESC LIMIT 200`
    ).catch(() => null);
    return (
      <div>
        <SectionHeader title="Rank Changes" sub="Log of all staff rank modifications" back="logs" />
        {logs === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_rank_log table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table. Rank changes via Admin → User Profile are logged automatically.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>No rank changes logged yet.</p></div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <table className="table-panel">
              <thead><tr><th>Time</th><th>Player</th><th>Old Rank</th><th>New Rank</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{l.target_name || `#${l.user_id}`}</Link></td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,88,86,0.12)', color: '#EF5856' }}>{l.old_rank_name || `Rank ${l.old_rank}`}</span></td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(52,189,89,0.12)', color: '#34bd59' }}>{l.new_rank_name || `Rank ${l.new_rank}`}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.reason || '—'}</td>
                    <td style={{ fontSize: 11 }}>{l.admin_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (view === 'rare-spawns') {
    const itemSearch = sp?.search || '';
    const userSearch = sp?.user  || '';
    const userId     = sp?.id ? parseInt(sp.id) : null;

    let targetUser = null, searchItems = [], searchUsers = [];

    if (userId) {
      targetUser = await query('SELECT id, username FROM users WHERE id = ?', [userId]).then(r => r[0] || null).catch(() => null);
    }
    if (itemSearch) {
      searchItems = await query(
        'SELECT id, item_name, public_name, type FROM items_base WHERE public_name LIKE ? OR item_name LIKE ? ORDER BY public_name ASC LIMIT 20',
        [`%${itemSearch}%`, `%${itemSearch}%`]
      ).catch(() => []);
    }
    if (userSearch && !userId) {
      searchUsers = await query(
        'SELECT id, username FROM users WHERE username LIKE ? ORDER BY id DESC LIMIT 20', [`%${userSearch}%`]
      ).catch(() => []);
    }
    const recentSpawns = await query(
      `SELECT l.*, u1.username AS staff_name, u2.username AS target_name
       FROM cms_rare_spawn_log l
       LEFT JOIN users u1 ON u1.id = l.admin_id
       LEFT JOIN users u2 ON u2.id = l.target_id
       ORDER BY l.created_at DESC LIMIT 50`
    ).catch(() => null);


    return (
      <div>
        <SectionHeader title="Rare Spawns" sub="Give items to players and track distributions" back="logs" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>1. Find Item</h4>
            <form action="/admin" method="GET" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="hidden" name="tab" value="logs" />
              <input type="hidden" name="view" value="rare-spawns" />
              {userId && <input type="hidden" name="id" value={userId} />}
              <input type="text" name="search" placeholder="Search furniture name..." defaultValue={itemSearch} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>
            {searchItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {searchItems.map(item => (
                  <form key={item.id} action={giveItemAction} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--panel-inner)', borderRadius: 6 }}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <input type="hidden" name="user_id" value={userId || ''} />
                    <input type="hidden" name="item_name" value={item.public_name || item.item_name} />
                    <input type="hidden" name="search_val" value={itemSearch} />
                    <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>{item.public_name || item.item_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.type}</span>
                    <input type="number" name="qty" defaultValue={1} min={1} max={10} style={{ width: 50 }} />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: 10 }}>Give</button>
                  </form>
                ))}
                {!userId && <p style={{ fontSize: 11, color: '#f5a623', marginTop: 4 }}>Select a player first to give items.</p>}
              </div>
            ) : itemSearch ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>No items found for "{itemSearch}".</p>
            ) : null}
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>2. Select Player</h4>
            <form action="/admin" method="GET" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="hidden" name="tab" value="logs" />
              <input type="hidden" name="view" value="rare-spawns" />
              {itemSearch && <input type="hidden" name="search" value={itemSearch} />}
              <input type="text" name="user" placeholder="Search username..." defaultValue={userSearch} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>
            {targetUser && (
              <div style={{ padding: '10px 12px', background: 'rgba(52,189,89,0.1)', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(52,189,89,0.25)' }}>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>✓ {targetUser.username}</span>
                <Link href={`/admin?tab=logs&view=rare-spawns${itemSearch ? `&search=${encodeURIComponent(itemSearch)}` : ''}`} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>Clear</Link>
              </div>
            )}
            {!targetUser && searchUsers.map(u => (
              <Link key={u.id} href={`/admin?tab=logs&view=rare-spawns${itemSearch ? `&search=${encodeURIComponent(itemSearch)}` : ''}&id=${u.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--panel-inner)', borderRadius: 6, marginBottom: 6, textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{u.username}</span>
                <span style={{ fontSize: 10, color: 'var(--green)' }}>Select →</span>
              </Link>
            ))}
          </div>
        </div>

        {recentSpawns !== null ? (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Spawn Log ({recentSpawns.length})</h4>
            {recentSpawns.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No items given yet.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>Staff</th><th>Player</th><th>Item</th><th>Qty</th><th>Date</th></tr></thead>
                <tbody>
                  {recentSpawns.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{l.staff_name || l.admin_name || `Staff #${l.admin_id}`}</td>
                      <td><Link href={`/admin?tab=users&view=profile&id=${l.target_id}`} style={{ color: 'var(--green)' }}>{l.target_name || `User #${l.target_id}`}</Link></td>
                      <td>{l.item_name || '—'}</td>
                      <td style={{ color: '#f5a623', fontWeight: 700 }}>{l.quantity || l.qty || 1}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Items can still be given above. Run <code>sql/ocms_missing_tables.sql</code> to enable the spawn log.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Default: Staff Actions ────────────────────────────────────────────────
  const staffLogs = await query(
    `SELECT l.*, u.username AS staff_name
     FROM cms_admin_log l
     LEFT JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC LIMIT 100`
  ).catch(() => null);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Logs & Auditing</h3>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full admin action logs and audit trails</p>
      </div>

      {staffLogs === null ? (
        <div>
          <div className="panel no-hover" style={{ padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_admin_log table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table. Admin actions will be logged automatically once it exists.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Admin Action Logs', desc: 'Full log of all admin actions', href: '/admin/logs' },
              { label: 'Security Logs', desc: 'Login attempts and security events', href: '/admin/security' },
            ].map((l, i) => (
              <a key={i} href={l.href} className="panel no-hover" style={{ padding: 20, display: 'block', textDecoration: 'none' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{l.label} ↗</h4>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.desc}</p>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent Staff Actions ({staffLogs.length})</h4>
          {staffLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No staff actions logged yet.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr></thead>
              <tbody>
                {staffLogs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{l.staff_name || l.admin_name || `#${l.admin_id}`}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{l.action || '—'}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.target_type ? `${l.target_type} #${l.target_id}` : l.target_id || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details || '—'}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip || '—'}</td>
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
