import Link from 'next/link';
import { query, queryOne, queryScalar } from '@/lib/db';
import { formatNumber } from '@/lib/utils';
import AdminActions from '../AdminActions';

const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };

export default async function UsersSection({ view, sp, user }) {

  // ── Edit User Profile (full profile view) ─────────────────────────────────
  if (view === 'profile' && sp?.id) {
    return <UserProfileView sp={sp} adminUser={user} />;
  }

  // ── Give Credits ──────────────────────────────────────────────────────────
  if (view === 'give-credits') {
    return (
      <div>
        <SectionHeader title="Give Credits" sub="Add credits, duckets or diamonds to any player" back="users" />
        <div className="panel no-hover" style={{ padding: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Use the <strong>Search Users</strong> tab to find a player, then use the <strong>⋮ Actions</strong> menu to give currency. Or search below:
          </p>
          <UserSearchForm label="Find player to give credits" tab="users" extraParam="view=give-credits" />
          {sp?.search && <UserResultsList search={sp.search} adminUser={user} tab="users" extraQuery="&view=give-credits" />}
        </div>
      </div>
    );
  }

  // ── Change Ranks ──────────────────────────────────────────────────────────
  if (view === 'ranks') {
    const allRanks = await query('SELECT id, rank_name FROM permissions ORDER BY id').catch(() => []);
    const staffList = await query(
      "SELECT u.id, u.username, u.`rank`, u.online, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.`rank` >= 3 ORDER BY u.`rank` DESC, u.username ASC LIMIT 100"
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="Change Ranks" sub="View and manage staff ranks" back="users" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Current Staff ({staffList.length})</h4>
          <table className="table-panel">
            <thead><tr><th>Avatar</th><th>Username</th><th>Current Rank</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {staffList.map(u => (
                <tr key={u.id}>
                  <td><img src={`${HABBO_IMG}?figure=${encodeURIComponent(u.look||'')}&headonly=1&size=s`} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} /></td>
                  <td style={{ fontWeight: 700 }}>{u.username}</td>
                  <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{u.rank_name || `Rank ${u.rank}`}</span></td>
                  <td><span className={`online-dot ${u.online ? 'online' : 'offline'}`} /></td>
                  <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} className="btn btn-primary btn-sm">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel no-hover" style={{ padding: 20, marginTop: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>All Ranks</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allRanks.map(r => (
              <span key={r.id} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{r.id}</strong> — {r.rank_name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Give Badges ───────────────────────────────────────────────────────────
  if (view === 'give-badges') {
    const search   = sp?.search || '';
    const userId   = sp?.id ? parseInt(sp.id) : null;
    let targetUser = null, userBadges = [], searchResults = [];

    if (userId) {
      [targetUser, userBadges] = await Promise.all([
        queryOne('SELECT id, username, look FROM users WHERE id = ?', [userId]).catch(() => null),
        query('SELECT badge_code FROM users_badges WHERE user_id = ? LIMIT 500', [userId]).catch(() => []),
      ]);
    } else if (search) {
      searchResults = await query(
        'SELECT id, username, look FROM users WHERE username LIKE ? ORDER BY id DESC LIMIT 20', [`%${search}%`]
      ).catch(() => []);
    }

    async function giveBadgeAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const uid = parseInt(formData.get('user_id'));
      const badgeCode = (formData.get('badge_code') || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
      if (!uid || !badgeCode) redirect(`/admin?tab=users&view=give-badges${uid ? `&id=${uid}` : ''}&error=Badge+code+required`);
      await db('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [uid, badgeCode]);
      redirect(`/admin?tab=users&view=give-badges&id=${uid}&success=Badge+${badgeCode}+given`);
    }

    async function removeBadgeAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const uid = parseInt(formData.get('user_id'));
      const badgeCode = formData.get('badge_code');
      if (uid && badgeCode) await db('DELETE FROM users_badges WHERE user_id = ? AND badge_code = ?', [uid, badgeCode]);
      redirect(`/admin?tab=users&view=give-badges&id=${uid}&success=Badge+removed`);
    }

    return (
      <div>
        <SectionHeader title="Give Badges" sub="Assign or remove badge codes from players" back="users" />

        <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="users" />
            <input type="hidden" name="view" value="give-badges" />
            <input type="text" name="search" placeholder="Search player by username..." defaultValue={search} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          {!userId && searchResults.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchResults.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--panel-inner)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={`${HABBO_IMG}?figure=${encodeURIComponent(u.look||'')}&headonly=1&size=s`} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} />
                    <span style={{ fontWeight: 600 }}>{u.username}</span>
                  </div>
                  <Link href={`/admin?tab=users&view=give-badges&id=${u.id}`} className="btn btn-primary btn-sm">Select</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {targetUser && (
          <div>
            <div className="panel no-hover" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
              <img src={`${HABBO_IMG}?figure=${encodeURIComponent(targetUser.look||'')}&headonly=1&size=m`} alt="" style={{ width: 40, height: 40, imageRendering: 'pixelated' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{targetUser.username}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userBadges.length} badges assigned</div>
              </div>
              <Link href={`/admin?tab=users&view=profile&id=${targetUser.id}`} className="btn btn-secondary btn-sm">Full Profile</Link>
              <Link href="/admin?tab=users&view=give-badges" className="btn btn-secondary btn-sm">Change User</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
              <div className="panel no-hover" style={{ padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Give Badge</h4>
                <form action={giveBadgeAction}>
                  <input type="hidden" name="user_id" value={targetUser.id} />
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Badge Code *</label>
                    <input type="text" name="badge_code" placeholder="e.g. ADMIN, ACH_Win1" required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Give Badge</button>
                </form>
              </div>

              <div className="panel no-hover" style={{ padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Current Badges ({userBadges.length})</h4>
                {userBadges.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No badges assigned yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                    {userBadges.map((b, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 8, background: 'var(--panel-inner)', borderRadius: 6, minWidth: 68 }}>
                        <img src={`/images/badges/${b.badge_code}.gif`} alt="" style={{ width: 40, height: 40, imageRendering: 'pixelated' }} />
                        <code style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-all' }}>{b.badge_code}</code>
                        <form action={removeBadgeAction}>
                          <input type="hidden" name="user_id" value={targetUser.id} />
                          <input type="hidden" name="badge_code" value={b.badge_code} />
                          <button type="submit" style={{ fontSize: 9, color: '#EF5856', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>remove</button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Ban / Unban ───────────────────────────────────────────────────────────
  if (view === 'bans') {
    const bans = await query(
      "SELECT b.*, u.username AS banned_user FROM bans b LEFT JOIN users u ON u.id = b.user_id ORDER BY b.timestamp DESC LIMIT 100"
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="Ban / Unban" sub="Active and recent bans" back="users" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {bans.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No active bans, or bans table not found.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>User</th><th>Reason</th><th>Type</th><th>Expire</th><th>Banned By</th></tr></thead>
              <tbody>
                {bans.map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{b.banned_user || b.value || '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{b.reason || '—'}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,88,86,0.12)', color: '#EF5856' }}>{b.ban_type || 'account'}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.expire ? new Date(b.expire * 1000).toLocaleDateString() : 'Permanent'}</td>
                    <td style={{ fontSize: 11 }}>{b.added_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── View Inventory ────────────────────────────────────────────────────────
  if (view === 'inventory') {
    return (
      <div>
        <SectionHeader title="View Inventory" sub="Browse a user's item inventory" back="users" />
        <div className="panel no-hover" style={{ padding: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Search for a user to view their inventory:</p>
          <UserSearchForm label="Find player" tab="users" extraParam="view=profile" />
          {sp?.search && <UserResultsList search={sp.search} adminUser={user} tab="users" extraQuery="&view=profile" />}
        </div>
      </div>
    );
  }

  // ── Login History ─────────────────────────────────────────────────────────
  if (view === 'login-history') {
    const search   = sp?.search || '';
    const userId   = sp?.id ? parseInt(sp.id) : null;
    let targetUser = null, loginLogs = null, searchResults = [];

    if (userId) {
      targetUser = await queryOne(
        'SELECT id, username, look, ip_register, ip_current, account_created, last_online FROM users WHERE id = ?', [userId]
      ).catch(() => null);
      loginLogs = await query(
        'SELECT * FROM login_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50', [userId]
      ).catch(() => null);
    } else if (search) {
      searchResults = await query(
        'SELECT id, username, look FROM users WHERE username LIKE ? ORDER BY id DESC LIMIT 20', [`%${search}%`]
      ).catch(() => []);
    }

    const recentLogins = (!userId && !search) ? await query(
      "SELECT u.id, u.username, u.look, u.`rank`, u.ip_current, u.last_online, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.last_online > 0 ORDER BY u.last_online DESC LIMIT 50"
    ).catch(() => []) : [];

    return (
      <div>
        <SectionHeader title="Login History" sub="View login records and recent activity" back="users" />

        <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="users" />
            <input type="hidden" name="view" value="login-history" />
            <input type="text" name="search" placeholder="Search username..." defaultValue={search} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          {!userId && searchResults.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchResults.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--panel-inner)', borderRadius: 6 }}>
                  <span style={{ fontWeight: 600 }}>{u.username}</span>
                  <Link href={`/admin?tab=users&view=login-history&id=${u.id}`} className="btn btn-primary btn-sm">View</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {targetUser && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Registration IP', val: targetUser.ip_register, mono: true, href: `/admin?tab=users&view=ip-history&ip=${encodeURIComponent(targetUser.ip_register||'')}` },
                { label: 'Current IP', val: targetUser.ip_current, mono: true, href: `/admin?tab=users&view=ip-history&ip=${encodeURIComponent(targetUser.ip_current||'')}` },
                { label: 'Account Created', val: targetUser.account_created ? new Date(targetUser.account_created * 1000).toLocaleString() : '—' },
                { label: 'Last Online', val: targetUser.last_online ? new Date(targetUser.last_online * 1000).toLocaleString() : '—' },
              ].map((row, i) => (
                <div key={i} className="panel no-hover" style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{row.label}</div>
                  {row.href ? (
                    <Link href={row.href} style={{ fontWeight: 600, fontFamily: row.mono ? 'monospace' : undefined, color: 'var(--green)', fontSize: 13 }}>{row.val || '—'}</Link>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{row.val || '—'}</div>
                  )}
                </div>
              ))}
            </div>

            {loginLogs !== null ? (
              <div className="panel no-hover" style={{ padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Login Log ({loginLogs.length} entries)</h4>
                {loginLogs.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No login entries in login_log.</p>
                ) : (
                  <table className="table-panel">
                    <thead><tr><th>IP Address</th><th>Time</th></tr></thead>
                    <tbody>
                      {loginLogs.map((l, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.ip || l.ip_address || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.timestamp ? new Date(l.timestamp * 1000).toLocaleString() : l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="panel no-hover" style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                No <code>login_log</code> table found. IP and last-login data shown above from the users table.
              </div>
            )}
          </div>
        )}

        {!userId && !search && recentLogins.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent Activity (Last 50 by last_online)</h4>
            <table className="table-panel">
              <thead><tr><th>Avatar</th><th>Username</th><th>Rank</th><th>Current IP</th><th>Last Online</th><th></th></tr></thead>
              <tbody>
                {recentLogins.map(u => (
                  <tr key={u.id}>
                    <td><img src={`${HABBO_IMG}?figure=${encodeURIComponent(u.look||'')}&headonly=1&size=s`} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} /></td>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{u.rank_name || `Rank ${u.rank}`}</span></td>
                    <td><code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.ip_current || '—'}</code></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.last_online ? new Date(u.last_online * 1000).toLocaleString() : '—'}</td>
                    <td><Link href={`/admin?tab=users&view=login-history&id=${u.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Multi-Account Detection ───────────────────────────────────────────────
  if (view === 'multi-accounts') {
    const sharedIPs = await query(`
      SELECT ip_register AS ip, COUNT(*) AS account_count, GROUP_CONCAT(username ORDER BY id SEPARATOR ', ') AS usernames, MIN(id) AS first_id
      FROM users
      GROUP BY ip_register
      HAVING COUNT(*) > 1
      ORDER BY account_count DESC
      LIMIT 50
    `).catch(() => []);
    return (
      <div>
        <SectionHeader title="Multi-Account Detection" sub="IPs registered to more than one account" back="users" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {sharedIPs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No shared IPs detected.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>IP Address</th><th>Accounts</th><th>Usernames</th><th></th></tr></thead>
              <tbody>
                {sharedIPs.map((row, i) => (
                  <tr key={i}>
                    <td><code style={{ fontSize: 11, color: '#f5a623' }}>{row.ip}</code></td>
                    <td><span style={{ fontWeight: 800, color: row.account_count >= 5 ? '#EF5856' : row.account_count >= 3 ? '#f5a623' : 'var(--text-secondary)' }}>{row.account_count}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.usernames}</td>
                    <td><Link href={`/admin?tab=users&view=ip-history&ip=${encodeURIComponent(row.ip)}`} className="btn btn-secondary btn-sm">View All</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── IP History ────────────────────────────────────────────────────────────
  if (view === 'ip-history') {
    const ip = sp?.ip || '';
    const usersWithIP = ip ? await query(
      'SELECT u.id, u.username, u.`rank`, u.account_created, u.online, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.ip_register = ? OR u.ip_current = ? ORDER BY u.id DESC LIMIT 50',
      [ip, ip]
    ).catch(() => []) : [];
    return (
      <div>
        <SectionHeader title="IP History" sub="Find all accounts associated with an IP address" back="users" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input type="hidden" name="tab" value="users" />
            <input type="hidden" name="view" value="ip-history" />
            <input type="text" name="ip" placeholder="Enter IP address..." defaultValue={ip} style={{ flex: 1, fontFamily: 'monospace' }} />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          {ip && (
            usersWithIP.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No accounts found for IP: <code>{ip}</code></p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>ID</th><th>Username</th><th>Rank</th><th>Registered</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {usersWithIP.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td style={{ fontWeight: 700 }}>{u.username}</td>
                      <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{u.rank_name || `Rank ${u.rank}`}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.account_created ? new Date(u.account_created * 1000).toLocaleDateString() : '—'}</td>
                      <td><span className={`online-dot ${u.online ? 'online' : 'offline'}`} /></td>
                      <td><Link href={`/admin?tab=users&view=profile&id=${u.id}`} className="btn btn-primary btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    );
  }

  // ── Device Fingerprint ────────────────────────────────────────────────────
  if (view === 'fingerprint') {
    const [sharedRegIP, sharedCurrentIP, sharedEmail] = await Promise.all([
      query(`
        SELECT ip_register AS ip, COUNT(*) AS accounts,
               GROUP_CONCAT(username ORDER BY id SEPARATOR ', ') AS usernames,
               MIN(account_created) AS first_seen
        FROM users
        WHERE ip_register IS NOT NULL AND ip_register != ''
        GROUP BY ip_register
        HAVING COUNT(*) > 1
        ORDER BY accounts DESC LIMIT 30
      `).catch(() => []),
      query(`
        SELECT ip_current AS ip, COUNT(*) AS accounts,
               GROUP_CONCAT(username ORDER BY last_online DESC SEPARATOR ', ') AS usernames,
               MAX(last_online) AS last_seen
        FROM users
        WHERE ip_current IS NOT NULL AND ip_current != ''
        GROUP BY ip_current
        HAVING COUNT(*) > 1
        ORDER BY accounts DESC LIMIT 30
      `).catch(() => []),
      query(`
        SELECT mail AS email, COUNT(*) AS accounts,
               GROUP_CONCAT(username ORDER BY id SEPARATOR ', ') AS usernames
        FROM users
        WHERE mail IS NOT NULL AND mail != ''
        GROUP BY mail
        HAVING COUNT(*) > 1
        ORDER BY accounts DESC LIMIT 20
      `).catch(() => []),
    ]);

    return (
      <div>
        <SectionHeader title="Device Fingerprint" sub="IP and email-based account grouping" back="users" />

        <div className="panel no-hover" style={{ padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            True device fingerprinting requires client-side JS. This page uses IP address and email grouping from the users table to identify shared accounts. For more detail, use Multi-Account Detection.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Shared Registration IPs ({sharedRegIP.length})</h4>
            {sharedRegIP.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No shared IPs found.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>IP</th><th>Accounts</th><th>Users</th></tr></thead>
                <tbody>
                  {sharedRegIP.map((row, i) => (
                    <tr key={i}>
                      <td><Link href={`/admin?tab=users&view=ip-history&ip=${encodeURIComponent(row.ip)}`} style={{ color: '#f5a623', fontFamily: 'monospace', fontSize: 11 }}>{row.ip}</Link></td>
                      <td><span style={{ fontWeight: 800, color: row.accounts >= 5 ? '#EF5856' : row.accounts >= 3 ? '#f5a623' : 'var(--text-secondary)' }}>{row.accounts}</span></td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.usernames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Shared Current IPs ({sharedCurrentIP.length})</h4>
            {sharedCurrentIP.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No shared current IPs found.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>IP</th><th>Accounts</th><th>Users</th></tr></thead>
                <tbody>
                  {sharedCurrentIP.map((row, i) => (
                    <tr key={i}>
                      <td><Link href={`/admin?tab=users&view=ip-history&ip=${encodeURIComponent(row.ip)}`} style={{ color: '#f5a623', fontFamily: 'monospace', fontSize: 11 }}>{row.ip}</Link></td>
                      <td><span style={{ fontWeight: 800, color: row.accounts >= 5 ? '#EF5856' : row.accounts >= 3 ? '#f5a623' : 'var(--text-secondary)' }}>{row.accounts}</span></td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.usernames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {sharedEmail.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Shared Email Addresses ({sharedEmail.length})</h4>
            <table className="table-panel">
              <thead><tr><th>Email</th><th>Accounts</th><th>Users</th></tr></thead>
              <tbody>
                {sharedEmail.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: '#f5a623', fontFamily: 'monospace' }}>{row.email}</td>
                    <td><span style={{ fontWeight: 800, color: row.accounts >= 3 ? '#EF5856' : '#f5a623' }}>{row.accounts}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.usernames}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Default: Search Users ─────────────────────────────────────────────────
  const search = sp?.search || '';
  const totalUsers = await queryScalar('SELECT COUNT(*) FROM users');
  const where = search ? 'WHERE u.username LIKE ?' : '';
  const params = search ? [`%${search}%`] : [];
  const users = await query(`
    SELECT u.id, u.username, u.mail, u.\`rank\`, u.credits, u.online, u.account_created, p.rank_name
    FROM users u LEFT JOIN permissions p ON p.id = u.\`rank\`
    ${where} ORDER BY u.id DESC LIMIT 50
  `, params);

  return (
    <div className="panel no-hover" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Users ({formatNumber(totalUsers)})</h3>
        <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="users" />
          <input type="text" name="search" placeholder="Search username..." defaultValue={search} style={{ width: 200 }} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>
      <table className="table-panel">
        <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Rank</th><th>Credits</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td><Link href={`/profile/${u.username}`} style={{ color: 'var(--green)' }}>{u.username}</Link></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.mail}</td>
              <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{u.rank_name || `Rank ${u.rank}`}</span></td>
              <td>{formatNumber(u.credits)}</td>
              <td><span className={`online-dot ${u.online ? 'online' : 'offline'}`} /></td>
              <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Link href={`/admin?tab=users&view=profile&id=${u.id}`} className="btn btn-primary btn-sm">View</Link>
                <AdminActions userId={u.id} username={u.username} currentRank={u.rank} adminRank={user.rank} />
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No users found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Full user profile ──────────────────────────────────────────────────────
async function UserProfileView({ sp, adminUser }) {
  const uid = parseInt(sp?.id);
  if (!uid) return <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>No user ID specified.</p><Link href="/admin?tab=users" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Back</Link></div>;

  const [profileUser, profileChats, profileRooms, profileInventory, allRanks, profileRelationships] = await Promise.all([
    queryOne('SELECT u.*, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.id = ?', [uid]).catch(() => null),
    query('SELECT cr.message, cr.timestamp, r.name AS room_name FROM chatlogs_room cr LEFT JOIN rooms r ON r.id = cr.room_id WHERE cr.user_from_id = ? ORDER BY cr.timestamp DESC LIMIT 30', [uid]).catch(() => []),
    query('SELECT id, name, description, users, score, state FROM rooms WHERE owner_id = ? ORDER BY score DESC LIMIT 20', [uid]).catch(() => []),
    query('SELECT ib.id AS base_id, ib.public_name, ib.item_name, COUNT(i.id) AS qty FROM items i JOIN items_base ib ON ib.id = i.item_id WHERE i.user_id = ? AND i.room_id = 0 GROUP BY ib.id, ib.public_name, ib.item_name ORDER BY ib.public_name ASC LIMIT 100', [uid]).catch(() => []),
    query('SELECT id, rank_name FROM permissions ORDER BY id').catch(() => []),
    query('SELECT r.relation AS type, r.target_id, u.username AS target_name, u.look AS target_look FROM users_relationships r JOIN users u ON u.id = r.target_id WHERE r.user_id = ? AND r.relation > 0 ORDER BY r.relation ASC', [uid]).catch(() => []),
  ]);

  if (!profileUser) return (
    <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>User not found.</p>
      <Link href="/admin?tab=users" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Back to Users</Link>
    </div>
  );

  async function editUserAction(formData) {
    'use server';
    const { getCurrentUser } = await import('@/lib/auth');
    const { query: db } = await import('@/lib/db');
    const { sanitizeText } = await import('@/lib/security');
    const { redirect } = await import('next/navigation');
    const u = await getCurrentUser();
    if (!u || u.rank < 4) redirect('/admin');
    const id = parseInt(formData.get('user_id'));
    if (!id) redirect('/admin?tab=users&error=Invalid+user');
    const motto = sanitizeText(formData.get('motto') || '', 100);
    const credits = Math.max(0, parseInt(formData.get('credits')) || 0);
    const pixels  = Math.max(0, parseInt(formData.get('pixels'))  || 0);
    const points  = Math.max(0, parseInt(formData.get('points'))  || 0);
    const newRank = parseInt(formData.get('rank')) || 1;
    if (newRank >= u.rank && u.rank < 7) redirect(`/admin?tab=users&view=profile&id=${id}&error=Cannot+set+rank+equal+or+higher+than+your+own`);
    const prevUser = await (await import('@/lib/db')).queryOne('SELECT credits, pixels, points, `rank` FROM users WHERE id = ?', [id]).catch(() => null);
    await db('UPDATE users SET motto=?, credits=?, pixels=?, points=?, `rank`=? WHERE id=?', [motto, credits, pixels, points, newRank, id]);
    // Log currency changes
    if (prevUser) {
      const logEntries = [
        ['credits', credits - (prevUser.credits || 0)],
        ['pixels',  pixels  - (prevUser.pixels  || 0)],
        ['points',  points  - (prevUser.points  || 0)],
      ].filter(([, diff]) => diff !== 0);
      for (const [currency, diff] of logEntries) {
        await db(
          'INSERT INTO cms_credit_log (user_id, admin_id, currency, amount, balance_after, reason) VALUES (?,?,?,?,?,?)',
          [id, u.id, currency, diff, currency === 'credits' ? credits : currency === 'pixels' ? pixels : points, `Admin edit by ${u.username}`]
        ).catch(() => {});
      }
      if (prevUser.rank !== newRank) {
        await db(
          'INSERT INTO cms_rank_log (user_id, admin_id, old_rank, new_rank, reason) VALUES (?,?,?,?,?)',
          [id, u.id, prevUser.rank, newRank, `Admin edit by ${u.username}`]
        ).catch(() => {});
      }
    }
    redirect(`/admin?tab=users&view=profile&id=${id}&success=User+updated`);
  }

  const joined     = profileUser.account_created ? new Date(profileUser.account_created * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  const lastOnline = profileUser.last_online      ? new Date(profileUser.last_online * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const REL_TYPES  = { 1: { label: 'Love', icon: '/images/rel_heart.svg' }, 2: { label: 'Friend', icon: '/images/rel_smile.svg' }, 3: { label: 'Hate', icon: '/images/rel_skull.svg' } };

  return (
    <div>
      <Link href="/admin?tab=users" className="btn btn-secondary btn-sm" style={{ marginBottom: 16, display: 'inline-flex' }}>← Back to Users</Link>

      {/* Header card */}
      <div className="panel no-hover" style={{ padding: 24, marginBottom: 16, display: 'flex', gap: 24, alignItems: 'center' }}>
        <img src={`${HABBO_IMG}?figure=${encodeURIComponent(profileUser.look||'')}&direction=2&head_direction=2&gesture=sml&size=l`} alt="" style={{ width: 64, height: 110, imageRendering: 'pixelated', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{profileUser.username}</h2>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{profileUser.rank_name || `Rank ${profileUser.rank}`}</span>
            <span className={`online-dot ${profileUser.online ? 'online' : 'offline'}`} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{profileUser.motto}</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>ID: <strong style={{ color: 'var(--text-secondary)' }}>{profileUser.id}</strong></span>
            <span>Email: <strong style={{ color: 'var(--text-secondary)' }}>{profileUser.mail}</strong></span>
            <span>Joined: <strong style={{ color: 'var(--text-secondary)' }}>{joined}</strong></span>
            <span>Last online: <strong style={{ color: 'var(--text-secondary)' }}>{lastOnline}</strong></span>
            <span>IP: <Link href={`/admin?tab=users&view=ip-history&ip=${encodeURIComponent(profileUser.ip_register||'')}`} style={{ color: 'var(--green)', fontFamily: 'monospace' }}>{profileUser.ip_register}</Link></span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: '#f5c842' }}><img src="/images/coin.png" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 3 }} />{parseInt(profileUser.credits||0).toLocaleString()}</span>
            <span style={{ color: '#a0b4ff' }}><img src="/images/ducket.png" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 3 }} />{parseInt(profileUser.pixels||0).toLocaleString()}</span>
            <span style={{ color: '#34bd59' }}><img src="/images/diamond.png" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 3 }} />{parseInt(profileUser.points||0).toLocaleString()}</span>
          </div>
        </div>
        <Link href={`/profile/${profileUser.username}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>View Public Profile</Link>
      </div>

      {/* Edit form + rooms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Edit User</h3>
          <form action={editUserAction}>
            <input type="hidden" name="user_id" value={profileUser.id} />
            <div style={{ marginBottom: 12 }}><label style={labelStyle}>Motto</label><input type="text" name="motto" defaultValue={profileUser.motto || ''} maxLength={100} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={labelStyle}>Credits</label><input type="number" name="credits" defaultValue={profileUser.credits||0} min={0} /></div>
              <div><label style={labelStyle}>Duckets</label><input type="number" name="pixels"   defaultValue={profileUser.pixels||0}  min={0} /></div>
              <div><label style={labelStyle}>Diamonds</label><input type="number" name="points"  defaultValue={profileUser.points||0}  min={0} /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Rank</label>
              <select name="rank" defaultValue={profileUser.rank}>
                {allRanks.map(r => <option key={r.id} value={r.id}>{r.id} — {r.rank_name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
          </form>
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Rooms ({profileRooms.length})</h3>
          {profileRooms.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No rooms owned.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {profileRooms.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--panel-inner)', borderRadius: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.users} users · Score {r.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Relationships */}
      {profileRelationships.length > 0 && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Relationships</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(type => {
              const group = profileRelationships.filter(r => r.type === type);
              if (!group.length) return null;
              return (
                <div key={type}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                    <img src={REL_TYPES[type].icon} alt="" style={{ width: 14, height: 14 }} /> {REL_TYPES[type].label} ({group.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {group.map(r => (
                      <Link key={r.target_id} href={`/admin?tab=users&view=profile&id=${r.target_id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--panel-inner)', borderRadius: 'var(--radius)', textDecoration: 'none' }}>
                        <img src={`${HABBO_IMG}?figure=${encodeURIComponent(r.target_look||'')}&headonly=1&size=s`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', imageRendering: 'pixelated' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{r.target_name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Recent Chats ({profileChats.length})</h3>
          {profileChats.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No recent chats.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {profileChats.map((c, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--panel-inner)', borderRadius: 6, fontSize: 11 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{c.room_name || 'Unknown room'}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{c.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Inventory ({profileInventory.length} types)</h3>
          {profileInventory.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No items in inventory.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {profileInventory.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'var(--panel-inner)', borderRadius: 6, fontSize: 11 }}>
                  <span>{item.public_name || item.item_name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>×{item.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserSearchForm({ label, tab, extraParam }) {
  return (
    <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
      <input type="hidden" name="tab" value={tab} />
      {extraParam && extraParam.split('&').map(p => {
        const [k, v] = p.split('=');
        return <input key={k} type="hidden" name={k} value={v} />;
      })}
      <input type="text" name="search" placeholder={label || 'Search username...'} style={{ flex: 1 }} />
      <button type="submit" className="btn btn-primary">Search</button>
    </form>
  );
}

async function UserResultsList({ search, adminUser, tab, extraQuery }) {
  const users = await query(
    'SELECT u.id, u.username, u.`rank`, u.online, p.rank_name FROM users u LEFT JOIN permissions p ON p.id = u.`rank` WHERE u.username LIKE ? ORDER BY u.id DESC LIMIT 20',
    [`%${search}%`]
  ).catch(() => []);
  if (users.length === 0) return <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>No users found for "{search}".</p>;
  return (
    <div style={{ marginTop: 16 }}>
      {users.map(u => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--panel-inner)', borderRadius: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.rank_name || `Rank ${u.rank}`}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href={`/admin?tab=users&view=profile&id=${u.id}${extraQuery||''}`} className="btn btn-primary btn-sm">Select</Link>
            <AdminActions userId={u.id} username={u.username} currentRank={u.rank} adminRank={adminUser.rank} />
          </div>
        </div>
      ))}
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
