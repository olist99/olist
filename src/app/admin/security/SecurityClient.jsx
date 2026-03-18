'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'alt_farming',   label: 'Alt Farming' },
  { id: 'credit_abuse',  label: 'Credit Abuse' },
  { id: 'economy',       label: 'Economy Heatmap' },
  { id: 'duplication',   label: 'Item Duplication' },
];

function StatBox({ label, value, color = 'var(--green)', sub }) {
  return (
    <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function EconomyBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Number(value).toLocaleString()}</span>
      </div>
      <div style={{ height: 8, background: 'var(--panel-inner)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

export default function SecurityClient() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (t) => {
    setLoading(true); setData(null);
    const d = await fetch(`/api/admin/security?type=${t}`).then(r => r.json()).catch(() => ({}));
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
            {t.label}
          </button>
        ))}
        <button onClick={() => load(tab)} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>↺ Refresh</button>
      </div>

      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Analysing...</div>}

      {/* Overview */}
      {!loading && tab === 'overview' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatBox label="New Users (7d)" value={data.newUsers} color="var(--green)" />
            <StatBox label="Active (24h)" value={data.activeToday} color="#4298c2" />
            <StatBox label="Banned" value={data.bannedUsers} color="#EF5856" />
          </div>
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700 }}>Top Credit Holders</div>
            <table className="table-panel" style={{ width: '100%' }}>
              <thead><tr><th>User</th><th>Credits</th><th>Shared IP Accounts</th><th></th></tr></thead>
              <tbody>
                {(data.recentRichGain || []).map(u => (
                  <tr key={u.id} style={{ background: u.shared_ip > 3 ? 'rgba(239,88,86,0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>{Number(u.credits).toLocaleString()}</td>
                    <td style={{ color: u.shared_ip > 3 ? '#EF5856' : 'var(--text-muted)' }}>
                      {u.shared_ip > 1 ? `⚠ ${u.shared_ip} accounts` : '—'}
                    </td>
                    <td><Link href={`/admin?tab=user-profile&id=${u.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alt Farming */}
      {!loading && tab === 'alt_farming' && data && (
        <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700 }}>
            IPs with 3+ accounts — {(data.rows || []).length} suspicious IPs found
          </div>
          {(data.rows || []).length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No alt farming detected.</div>
          ) : (
            <table className="table-panel" style={{ width: '100%' }}>
              <thead><tr><th>IP</th><th>Accounts</th><th>Usernames</th><th>Total Credits</th><th>Last Seen</th></tr></thead>
              <tbody>
                {(data.rows || []).map((r, i) => (
                  <tr key={i} style={{ background: r.account_count > 5 ? 'rgba(239,88,86,0.05)' : 'transparent' }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.ip_register}</td>
                    <td style={{ fontWeight: 800, color: r.account_count > 5 ? '#EF5856' : '#f5c842' }}>{r.account_count}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.usernames}</td>
                    <td style={{ fontWeight: 700 }}>{Number(r.total_credits).toLocaleString()}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.last_seen ? new Date(r.last_seen).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Credit Abuse */}
      {!loading && tab === 'credit_abuse' && data && (
        <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700 }}>
            Users with 10× average credits
          </div>
          <table className="table-panel" style={{ width: '100%' }}>
            <thead><tr><th>User</th><th>Credits</th><th>IP Accounts</th><th>Registered</th><th></th></tr></thead>
            <tbody>
              {(data.rows || []).map(u => (
                <tr key={u.id} style={{ background: u.ip_accounts > 3 ? 'rgba(239,88,86,0.05)' : 'transparent' }}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td style={{ fontWeight: 800, color: '#EF5856' }}>{Number(u.credits).toLocaleString()}</td>
                  <td style={{ color: u.ip_accounts > 3 ? '#EF5856' : 'var(--text-muted)' }}>
                    {u.ip_accounts > 1 ? `⚠ ${u.ip_accounts}` : '1'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.account_created ? new Date(u.account_created * 1000).toLocaleDateString() : '—'}</td>
                  <td><Link href={`/admin?tab=user-profile&id=${u.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Economy Heatmap */}
      {!loading && tab === 'economy' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
            <StatBox label="Total Credits in Economy" value={Number(data.totalCredits).toLocaleString()} color="#bda75e" sub="All users combined" />
            <StatBox label="Gambling Wagered (30d)" value={Number(data.gamblingWagered).toLocaleString()} color="#EF5856" sub={`Won: ${Number(data.gamblingWon).toLocaleString()}`} />
          </div>
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Credit Flow (30 days)</div>
            {(() => {
              const max = Math.max(data.shopSpend, data.marketSpend, data.gamblingWagered, 1);
              return (
                <>
                  <EconomyBar label="Shop Spending" value={data.shopSpend} max={max} color="#4298c2" />
                  <EconomyBar label="Marketplace Volume" value={data.marketSpend} max={max} color="#a442c2" />
                  <EconomyBar label="Gambling Wagered" value={data.gamblingWagered} max={max} color="#EF5856" />
                  <EconomyBar label="Gambling Paid Out" value={data.gamblingWon} max={max} color="var(--green)" />
                </>
              );
            })()}
          </div>
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700 }}>Top 10 Credit Holders</div>
            <table className="table-panel" style={{ width: '100%' }}>
              <thead><tr><th>#</th><th>User</th><th>Credits</th><th>Duckets</th><th>Diamonds</th></tr></thead>
              <tbody>
                {(data.topHolders || []).map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 800, color: i === 0 ? '#f5c842' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}>{i + 1}</td>
                    <td><Link href={`/admin?tab=user-profile&id=${u.id}`} style={{ fontWeight: 600 }}>{u.username}</Link></td>
                    <td style={{ color: '#bda75e', fontWeight: 700 }}>{Number(u.credits).toLocaleString()}</td>
                    <td style={{ color: '#9a65af' }}>{Number(u.pixels).toLocaleString()}</td>
                    <td style={{ color: '#7eb4a9' }}>{Number(u.points).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Duplication */}
      {!loading && tab === 'duplication' && data && (
        <div>
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700 }}>High-Count Items (10+ copies)</div>
            <table className="table-panel" style={{ width: '100%' }}>
              <thead><tr><th>Item</th><th>Total Copies</th><th>Owners</th><th>Owner List</th></tr></thead>
              <tbody>
                {(data.highCount || []).map(r => (
                  <tr key={r.base_id} style={{ background: r.total_copies > 50 ? 'rgba(239,88,86,0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{r.public_name}<br /><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.item_name}</span></td>
                    <td style={{ fontWeight: 800, color: r.total_copies > 50 ? '#EF5856' : '#f5c842' }}>{r.total_copies}</td>
                    <td>{r.owner_count}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.owners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700 }}>Users with Unusually High Item Counts</div>
            <table className="table-panel" style={{ width: '100%' }}>
              <thead><tr><th>User</th><th>Items</th><th>Credits</th><th>IP</th><th></th></tr></thead>
              <tbody>
                {(data.itemHoarders || []).map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td style={{ fontWeight: 800, color: '#EF5856' }}>{Number(u.item_count).toLocaleString()}</td>
                    <td>{Number(u.credits).toLocaleString()}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.ip_register}</td>
                    <td><Link href={`/admin?tab=user-profile&id=${u.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
