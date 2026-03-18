'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const ACTION_COLORS = {
  user_ban: '#EF5856', user_unban: 'var(--green)', user_rank_change: '#f5c842',
  user_credit_adjust: '#bda75e', catalog_update_item: '#4298c2', catalog_update_page: '#4298c2',
  catalog_add_item: 'var(--green)', catalog_move_item: '#a442c2',
  furniture_add: 'var(--green)', furniture_update: '#f5c842',
};

function actionColor(action) {
  for (const [k, v] of Object.entries(ACTION_COLORS)) { if (action?.includes(k)) return v; }
  return 'var(--text-muted)';
}

function timeAgo(str) {
  if (!str) return '—';
  const diff = Math.floor((Date.now() - new Date(str)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return new Date(str).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function LogsClient() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [admins, setAdmins] = useState([]);
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page, ...(filterAdmin ? { admin_id: filterAdmin } : {}), ...(filterAction ? { action: filterAction } : {}) });
    const d = await fetch(`/api/admin/logs?${qs}`).then(r => r.json()).catch(() => ({}));
    setLogs(d.logs || []);
    setTotal(d.total || 0);
    if (d.admins) setAdmins(d.admins);
    setLoading(false);
  }, [page, filterAdmin, filterAction]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterAdmin} onChange={e => { setFilterAdmin(e.target.value); setPage(1); }} style={{ flex: 'none', width: 'auto', minWidth: 160 }}>
          <option value="">All Admins</option>
          {admins.map(a => <option key={a.admin_id} value={a.admin_id}>{a.admin_name}</option>)}
        </select>
        <input type="text" value={filterAction} onChange={e => setFilterAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && setPage(1)} placeholder="Filter by action..." style={{ flex: 1 }} />
        <button onClick={() => { setPage(1); load(); }} className="btn btn-secondary btn-sm">Filter</button>
        <button onClick={() => { setFilterAdmin(''); setFilterAction(''); setPage(1); }} className="btn btn-secondary btn-sm">Clear</button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{total.toLocaleString()} entries</span>
      </div>

      <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No log entries found.</div>
        ) : (
          <div className="table-scroll">
          <table className="table-panel" style={{ width: '100%' }}>
            <thead>
              <tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }} title={log.created_at}>{timeAgo(log.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {log.look && (
                        <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${log.look}&headonly=1&size=s`} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                      )}
                      <Link href={`/admin?tab=user-profile&id=${log.admin_id}`} style={{ fontSize: 12, fontWeight: 700 }}>{log.admin_name}</Link>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 800, color: actionColor(log.action), background: `${actionColor(log.action)}18`, padding: '2px 8px', borderRadius: 10 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {log.target_type && <span>{log.target_type}{log.target_id ? ` #${log.target_id}` : ''}</span>}
                  </td>
                  <td style={{ fontSize: 11, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                    {log.details || '—'}
                  </td>
                  <td style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button disabled={page <= 1} className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ lineHeight: '32px', fontSize: 12 }}>Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
