import Link from 'next/link';
import { query, queryScalar } from '@/lib/db';

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };

export default async function ModerationSection({ view, sp, user }) {

  // ── Report Center (tickets) ───────────────────────────────────────────────
  if (view === 'reports') {
    const tickets = await query(`
      SELECT t.*, u.username, u.look
      FROM cms_tickets t JOIN users u ON u.id = t.user_id
      ORDER BY FIELD(t.status, 'open', 'answered', 'closed'), t.updated_at DESC
      LIMIT 100
    `).catch(() => null);

    if (tickets === null) {
      return (
        <div>
          <SectionHeader title="Report Center" sub="Manage player reports and support tickets" back="moderation" />
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_tickets table not found.</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create it.</p>
          </div>
        </div>
      );
    }

    const openCount = tickets.filter(t => t.status === 'open').length;
    return (
      <div>
        <SectionHeader title="Report Center" sub={`${openCount} open · ${tickets.length} total`} back="moderation" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {tickets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No open tickets. All clear!</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>#</th><th>User</th><th>Subject</th><th>Category</th><th>Status</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{t.id}</td>
                    <td>{t.username}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{t.category}</span></td>
                    <td>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase',
                        background: t.status === 'open' ? '#f5a62322' : t.status === 'answered' ? '#34bd5922' : '#8b949e22',
                        color: t.status === 'open' ? '#f5a623' : t.status === 'answered' ? '#34bd59' : '#8b949e',
                      }}>{t.status}</span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ''}</td>
                    <td><Link href={`/rules/tickets/${t.id}`} className="btn btn-primary btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Room Logs ─────────────────────────────────────────────────────────────
  if (view === 'room-logs') {
    const roomSearch = sp?.room || '';
    const userSearch = sp?.username || '';

    // Try Arcturus room_enter_log table
    const whereArr = [], params = [];
    if (userSearch) { whereArr.push('u.username LIKE ?'); params.push(`%${userSearch}%`); }
    if (roomSearch) { whereArr.push('r.name LIKE ?'); params.push(`%${roomSearch}%`); }
    const whereClause = whereArr.length ? 'WHERE ' + whereArr.join(' AND ') : '';

    const enterLogs = await query(`
      SELECT rel.user_id, rel.room_id, rel.timestamp,
             u.username, r.name AS room_name
      FROM room_enter_log rel
      LEFT JOIN users u ON u.id = rel.user_id
      LEFT JOIN rooms r ON r.id = rel.room_id
      ${whereClause}
      ORDER BY rel.timestamp DESC LIMIT 100
    `, params).catch(() => null);

    // Fall back to chat activity per room
    const chatByRoom = enterLogs === null ? await query(`
      SELECT cr.room_id, r.name AS room_name, COUNT(*) AS messages,
             COUNT(DISTINCT cr.user_from_id) AS unique_users,
             MAX(cr.timestamp) AS last_activity
      FROM chatlogs_room cr
      LEFT JOIN rooms r ON r.id = cr.room_id
      ${roomSearch ? 'WHERE r.name LIKE ?' : ''}
      GROUP BY cr.room_id, r.name
      ORDER BY last_activity DESC LIMIT 50
    `, roomSearch ? [`%${roomSearch}%`] : []).catch(() => []) : null;

    return (
      <div>
        <SectionHeader title="Room Logs" sub={enterLogs !== null ? `${enterLogs.length} entries from room_enter_log` : 'Chat activity per room (room_enter_log not found)'} back="moderation" />

        <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="moderation" />
            <input type="hidden" name="view" value="room-logs" />
            <input type="text" name="room" placeholder="Room name..." defaultValue={roomSearch} style={{ flex: 1 }} />
            {enterLogs !== null && <input type="text" name="username" placeholder="Username..." defaultValue={userSearch} style={{ flex: 1 }} />}
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
            {(roomSearch || userSearch) && <Link href="/admin?tab=moderation&view=room-logs" className="btn btn-secondary btn-sm">Clear</Link>}
          </form>
        </div>

        {enterLogs !== null ? (
          <div className="panel no-hover" style={{ padding: 20 }}>
            {enterLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No room entry logs found.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>User</th><th>Room</th><th>Time</th></tr></thead>
                <tbody>
                  {enterLogs.map((l, i) => (
                    <tr key={i}>
                      <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{l.username || `User ${l.user_id}`}</Link></td>
                      <td style={{ fontSize: 11 }}>{l.room_name || `Room ${l.room_id}`}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.timestamp ? new Date(l.timestamp * 1000).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div>
            <div className="panel no-hover" style={{ padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#f5a623' }}>The <code>room_enter_log</code> table was not found. Showing chat activity per room as a proxy.</p>
            </div>
            <div className="panel no-hover" style={{ padding: 20 }}>
              {chatByRoom.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No chat data found.</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Room</th><th>Messages</th><th>Unique Users</th><th>Last Activity</th><th></th></tr></thead>
                  <tbody>
                    {chatByRoom.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.room_name || `Room ${r.room_id}`}</td>
                        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{parseInt(r.messages||0).toLocaleString()}</td>
                        <td>{r.unique_users}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.last_activity ? new Date(r.last_activity * 1000).toLocaleString() : '—'}</td>
                        <td><Link href={`/admin?tab=moderation&room_id=${r.room_id}`} className="btn btn-secondary btn-sm">Chat Logs</Link></td>
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

  // ── Warning System ────────────────────────────────────────────────────────
  if (view === 'warnings') {
    const search = sp?.search || '';
    const userId = sp?.id ? parseInt(sp.id) : null;
    let targetUser = null, searchResults = [];

    if (userId) {
      targetUser = await query('SELECT id, username, look FROM users WHERE id = ?', [userId]).then(r => r[0] || null).catch(() => null);
    } else if (search) {
      searchResults = await query(
        'SELECT id, username FROM users WHERE username LIKE ? ORDER BY id DESC LIMIT 15', [`%${search}%`]
      ).catch(() => []);
    }

    const warnings = await query(
      `SELECT w.*, u.username AS target_user, s.username AS staff_user
       FROM cms_user_warnings w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN users s ON s.id = w.issued_by
       ${userId ? 'WHERE w.user_id = ?' : ''}
       ORDER BY w.created_at DESC LIMIT 100`,
      userId ? [userId] : []
    ).catch(() => null);

    async function issueWarningAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { sanitizeText } = await import('@/lib/security');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const uid = parseInt(formData.get('user_id'));
      const reason = sanitizeText(formData.get('reason') || '', 300);
      if (!uid || !reason) redirect('/admin?tab=moderation&view=warnings&error=User+and+reason+required');
      await db('INSERT INTO cms_user_warnings (user_id, issued_by, reason) VALUES (?, ?, ?)', [uid, u.id, reason]);
      redirect(`/admin?tab=moderation&view=warnings&id=${uid}&success=Warning+issued`);
    }

    return (
      <div>
        <SectionHeader title="Warning System" sub="Issue and track formal player warnings" back="moderation" />

        {warnings === null ? (
          <div className="panel no-hover" style={{ padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_user_warnings table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 16 }}>
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Issue Warning</h4>
              <form action="/admin" method="GET" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="hidden" name="tab" value="moderation" />
                <input type="hidden" name="view" value="warnings" />
                <input type="text" name="search" placeholder="Search player..." defaultValue={search} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-secondary btn-sm">Find</button>
              </form>
              {!userId && searchResults.map(u => (
                <Link key={u.id} href={`/admin?tab=moderation&view=warnings&id=${u.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--panel-inner)', borderRadius: 6, marginBottom: 4, textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{u.username}</span>
                  <span style={{ fontSize: 10, color: 'var(--green)' }}>Select →</span>
                </Link>
              ))}
              {targetUser && (
                <div>
                  <div style={{ padding: '8px 10px', background: 'rgba(52,189,89,0.1)', borderRadius: 6, marginBottom: 12, border: '1px solid rgba(52,189,89,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 12 }}>✓ {targetUser.username}</span>
                    <Link href="/admin?tab=moderation&view=warnings" className="btn btn-secondary btn-sm" style={{ fontSize: 9 }}>Clear</Link>
                  </div>
                  <form action={issueWarningAction}>
                    <input type="hidden" name="user_id" value={targetUser.id} />
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Reason *</label>
                      <textarea name="reason" rows={3} placeholder="Describe the violation..." required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Issue Warning</button>
                  </form>
                </div>
              )}
            </div>

            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                {targetUser ? `Warnings for ${targetUser.username} (${warnings.length})` : `All Warnings (${warnings.length})`}
              </h4>
              {warnings.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{targetUser ? 'No warnings issued to this player.' : 'No warnings issued yet.'}</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Player</th><th>Reason</th><th>Issued By</th><th>Date</th></tr></thead>
                  <tbody>
                    {warnings.map((w, i) => (
                      <tr key={i}>
                        <td><Link href={`/admin?tab=users&view=profile&id=${w.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{w.target_user}</Link></td>
                        <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{w.reason}</td>
                        <td style={{ fontSize: 11 }}>{w.staff_user || '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
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

  // ── Ban Management ────────────────────────────────────────────────────────
  if (view === 'bans') {
    const bans = await query(
      'SELECT b.*, u.username AS banned_user FROM bans b LEFT JOIN users u ON u.id = b.user_id ORDER BY b.timestamp DESC LIMIT 100'
    ).catch(() => []);
    return (
      <div>
        <SectionHeader title="Ban Management" sub={`${bans.length} recent bans`} back="moderation" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {bans.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No bans found.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>User / Value</th><th>Reason</th><th>Type</th><th>Expire</th><th>Added By</th></tr></thead>
              <tbody>
                {bans.map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{b.banned_user || b.value || '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{b.reason || '—'}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,88,86,0.12)', color: '#EF5856' }}>{b.ban_type || 'account'}</span></td>
                    <td style={{ fontSize: 11, color: b.expire && b.expire * 1000 < Date.now() ? '#EF5856' : 'var(--text-muted)' }}>
                      {b.expire ? new Date(b.expire * 1000).toLocaleDateString() : 'Permanent'}
                    </td>
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

  // ── Word Filter Manager ───────────────────────────────────────────────────
  if (view === 'word-filter') {
    const words = await query('SELECT * FROM cms_word_filter ORDER BY word ASC').catch(() => null);

    if (!words) {
      return (
        <div>
          <SectionHeader title="Word Filter Manager" sub="Block prohibited words from chat" back="moderation" />
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_word_filter table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table.</p>
          </div>
        </div>
      );
    }

    async function addWordAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const word = formData.get('word')?.toLowerCase().trim();
      const replacement = formData.get('replacement')?.trim() || '***';
      if (!word) redirect('/admin?tab=moderation&view=word-filter&error=Word+required');
      await db('INSERT IGNORE INTO cms_word_filter (word, replacement, active) VALUES (?, ?, 1)', [word, replacement]);
      redirect('/admin?tab=moderation&view=word-filter&success=Word+added');
    }

    async function deleteWordAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const id = parseInt(formData.get('id'));
      if (id) await db('DELETE FROM cms_word_filter WHERE id = ?', [id]);
      redirect('/admin?tab=moderation&view=word-filter&success=Word+removed');
    }

    return (
      <div>
        <SectionHeader title="Word Filter Manager" sub={`${words.length} filtered words`} back="moderation" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Add Filtered Word</h4>
            <form action={addWordAction}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Word / Phrase *</label>
                <input type="text" name="word" placeholder="badword" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Replace With</label>
                <input type="text" name="replacement" placeholder="***" defaultValue="***" />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">Add Word</button>
            </form>
          </div>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Filtered Words ({words.length})</h4>
            {words.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No filtered words yet.</p> : (
              <table className="table-panel">
                <thead><tr><th>Word</th><th>Replacement</th><th>Active</th><th></th></tr></thead>
                <tbody>
                  {words.map(w => (
                    <tr key={w.id}>
                      <td><code style={{ fontSize: 11 }}>{w.word}</code></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.replacement}</td>
                      <td>{w.active ? <span style={{ color: 'var(--green)' }}>Yes</span> : <span style={{ color: '#EF5856' }}>No</span>}</td>
                      <td>
                        <form action={deleteWordAction}>
                          <input type="hidden" name="id" value={w.id} />
                          <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: '#EF5856', background: 'rgba(239,88,86,0.1)' }}>Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Auto Spam Detection ───────────────────────────────────────────────────
  if (view === 'spam-detection') {
    const [topSpammers, repeatMessages, recentFlood] = await Promise.all([
      query(`
        SELECT cr.user_from_id AS user_id, u.username, COUNT(*) AS msg_count,
               MAX(cr.timestamp) AS last_msg
        FROM chatlogs_room cr
        LEFT JOIN users u ON u.id = cr.user_from_id
        WHERE cr.timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 HOUR))
        GROUP BY cr.user_from_id, u.username
        ORDER BY msg_count DESC LIMIT 20
      `).catch(() => []),
      query(`
        SELECT cr.message, COUNT(*) AS count, MAX(cr.user_from_id) AS user_id,
               u.username, MAX(cr.timestamp) AS last_seen
        FROM chatlogs_room cr
        LEFT JOIN users u ON u.id = cr.user_from_id
        WHERE cr.timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 24 HOUR))
          AND LENGTH(cr.message) > 3
        GROUP BY cr.message
        HAVING COUNT(*) >= 5
        ORDER BY count DESC LIMIT 20
      `).catch(() => []),
      query(`
        SELECT cr.user_from_id AS user_id, u.username, cr.room_id, r.name AS room_name, COUNT(*) AS burst
        FROM chatlogs_room cr
        LEFT JOIN users u ON u.id = cr.user_from_id
        LEFT JOIN rooms r ON r.id = cr.room_id
        WHERE cr.timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 5 MINUTE))
        GROUP BY cr.user_from_id, cr.room_id
        HAVING COUNT(*) >= 10
        ORDER BY burst DESC LIMIT 15
      `).catch(() => []),
    ]);

    return (
      <div>
        <SectionHeader title="Spam Detection" sub="Automated analysis of chat patterns from the last hour" back="moderation" />

        {recentFlood.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 12, border: '1px solid rgba(239,88,86,0.3)' }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#EF5856' }}>Active Flood Alert (last 5 min)</h4>
            <table className="table-panel">
              <thead><tr><th>User</th><th>Room</th><th>Messages (5 min)</th><th></th></tr></thead>
              <tbody>
                {recentFlood.map((r, i) => (
                  <tr key={i}>
                    <td><Link href={`/admin?tab=users&view=profile&id=${r.user_id}`} style={{ color: '#EF5856', fontWeight: 700 }}>{r.username || `User ${r.user_id}`}</Link></td>
                    <td style={{ fontSize: 11 }}>{r.room_name || `Room ${r.room_id}`}</td>
                    <td><span style={{ fontWeight: 800, color: '#EF5856' }}>{r.burst}</span></td>
                    <td><Link href={`/admin?tab=moderation&room_id=${r.room_id}`} className="btn btn-secondary btn-sm">View Chat</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Chatters (last hour)</h4>
            {topSpammers.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No chat data in the last hour.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>#</th><th>User</th><th>Messages</th></tr></thead>
                <tbody>
                  {topSpammers.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                      <td><Link href={`/admin?tab=users&view=profile&id=${s.user_id}`} style={{ color: i < 3 ? '#EF5856' : 'var(--green)', fontWeight: 600 }}>{s.username || `User ${s.user_id}`}</Link></td>
                      <td><span style={{ fontWeight: 700, color: i < 3 ? '#EF5856' : 'var(--text-secondary)' }}>{s.msg_count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Repeated Messages (24h, 5+ times)</h4>
            {repeatMessages.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No repeated messages detected today.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>Message</th><th>Times</th><th>Last Sender</th></tr></thead>
                <tbody>
                  {repeatMessages.map((m, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{m.message}</td>
                      <td><span style={{ fontWeight: 800, color: '#f5a623' }}>{m.count}</span></td>
                      <td style={{ fontSize: 11 }}>{m.username || `User ${m.user_id}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Default: Chat Logs ────────────────────────────────────────────────────
  const search    = sp?.search || '';
  const roomId    = sp?.room_id ? parseInt(sp.room_id) : null;
  const whereArr  = [];
  const params    = [];
  if (search)  { whereArr.push('cr.message LIKE ?'); params.push(`%${search}%`); }
  if (roomId)  { whereArr.push('cr.room_id = ?');    params.push(roomId); }
  const whereClause = whereArr.length ? 'WHERE ' + whereArr.join(' AND ') : '';

  const logs = await query(`
    SELECT cr.message, cr.timestamp, cr.user_from_id AS user_id, cr.room_id,
           u.username, r.name AS room_name
    FROM chatlogs_room cr
    LEFT JOIN users u ON u.id = cr.user_from_id
    LEFT JOIN rooms r ON r.id = cr.room_id
    ${whereClause}
    ORDER BY cr.timestamp DESC LIMIT 100
  `, params).catch(() => []);

  const totalLogs = await queryScalar('SELECT COUNT(*) FROM chatlogs_room').catch(() => null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Chat Logs</h3>
          {totalLogs !== null && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{parseInt(totalLogs).toLocaleString()} total messages logged</p>}
        </div>
      </div>
      <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
        <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="moderation" />
          <input type="text" name="search" placeholder="Search message content..." defaultValue={search} style={{ flex: 1 }} />
          <input type="number" name="room_id" placeholder="Room ID (optional)" defaultValue={roomId || ''} style={{ width: 160 }} />
          <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          {(search || roomId) && <Link href="/admin?tab=moderation" className="btn btn-secondary btn-sm">Clear</Link>}
        </form>
      </div>
      <div className="panel no-hover" style={{ padding: 20 }}>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No chat logs found. Try adjusting filters.</p>
        ) : (
          <table className="table-panel">
            <thead><tr><th>User</th><th>Room</th><th>Message</th><th>Time</th></tr></thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i}>
                  <td><Link href={`/admin?tab=users&view=profile&id=${log.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{log.username || `User ${log.user_id}`}</Link></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.room_name || `Room ${log.room_id}`}</td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.timestamp ? new Date(log.timestamp * 1000).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
