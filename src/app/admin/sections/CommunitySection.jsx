import { createNewsAction, editNewsAction, deleteNewsAction, deleteThreadAction, deletePostAction, togglePinAction, toggleLockAction, resolveReportAction, deleteEntryAction, createContestAction, closeContestAction } from './actions/community';
import { createPollAction, deletePollAction, togglePollAction } from './actions/settings';
import Link from 'next/link';
import { query, queryOne } from '@/lib/db';

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };

export default async function CommunitySection({ view, sp, user }) {

  // ── Create News ───────────────────────────────────────────────────────────
  if (view === 'news-create') {
    return <NewsForm action={createNewsAction} article={null} />;
  }

  // ── Edit News ─────────────────────────────────────────────────────────────
  if (view === 'news-edit') {
    const article = sp?.id ? await queryOne('SELECT * FROM cms_news WHERE id = ?', [sp.id]).catch(() => null) : null;
    if (!article) return (
      <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Article not found.</p>
        <Link href="/admin?tab=community" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Back</Link>
      </div>
    );
    return <NewsForm action={editNewsAction} article={article} />;
  }

  // ── Referrals ─────────────────────────────────────────────────────────────
  if (view === 'referrals') {
    const referrals = await query(`
      SELECT r.*, u1.username AS referrer_name, u2.username AS referred_name
      FROM cms_referrals r
      JOIN users u1 ON u1.id = r.referrer_id
      JOIN users u2 ON u2.id = r.referred_id
      ORDER BY r.created_at DESC LIMIT 50
    `).catch(() => []);
    return (
      <div>
        <SectionHeader title="Referrals" sub="Recent player referrals" back="community" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {referrals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No referrals yet.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Referrer</th><th>New User</th><th>Date</th></tr></thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id}>
                    <td><Link href={`/profile/${r.referrer_name}`} style={{ color: 'var(--green)' }}>{r.referrer_name}</Link></td>
                    <td><Link href={`/profile/${r.referred_name}`} style={{ color: 'var(--green)' }}>{r.referred_name}</Link></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Forum Moderation ──────────────────────────────────────────────────────
  if (view === 'forum') {
    const [threads, posts] = await Promise.all([
      query(`SELECT t.id, t.title, t.user_id, t.category_id, t.created_at,
                    t.pinned AS is_pinned, t.locked AS is_locked,
                    c.name AS category_name, u.username AS author_name,
                    (SELECT COUNT(*) FROM cms_forum_replies r WHERE r.thread_id = t.id) AS reply_count
             FROM cms_forum_threads t
             LEFT JOIN cms_forum_categories c ON c.id = t.category_id
             LEFT JOIN users u ON u.id = t.user_id
             ORDER BY t.created_at DESC LIMIT 50`).catch(() => null),
      query(`SELECT r.*, u.username, t.title AS thread_title
             FROM cms_forum_replies r
             JOIN users u ON u.id = r.user_id
             LEFT JOIN cms_forum_threads t ON t.id = r.thread_id
             ORDER BY r.created_at DESC LIMIT 30`).catch(() => null),
    ]);





    if (threads === null) {
      return (
        <div>
          <SectionHeader title="Forum Moderation" sub="Moderate forum threads and posts" back="community" />
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>Forum tables not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Run <code>sql/ocms_missing_tables.sql</code> to create the forum tables (cms_forum_categories, cms_forum_threads, cms_forum_replies).</p>
            <Link href="/forum" className="btn btn-secondary btn-sm">View Forum ↗</Link>
          </div>
        </div>
      );
    }

    return (
      <div>
        <SectionHeader title="Forum Moderation" sub={`${threads.length} threads`} back="community" />

        <div className="panel no-hover" style={{ padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700 }}>Threads</h4>
            <Link href="/forum" className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>View Forum ↗</Link>
          </div>
          {threads.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No threads yet.</p> : (
            <table className="table-panel">
              <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Replies</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {threads.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${t.user_id}`} style={{ color: 'var(--green)', fontSize: 11 }}>{t.author_name}</Link></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.category_name || '—'}</td>
                    <td style={{ fontSize: 11 }}>{t.reply_count || 0}</td>
                    <td>
                      {t.is_pinned ? <span style={{ fontSize: 9, color: '#f5a623', marginRight: 4 }}>📌</span> : null}
                      {t.is_locked ? <span style={{ fontSize: 9, color: '#EF5856' }}>🔒</span> : null}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <form action={togglePinAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="thread_id" value={t.id} />
                          <input type="hidden" name="pinned" value={t.is_pinned ? '1' : '0'} />
                          <button type="submit" className="btn btn-sm" style={{ fontSize: 8, padding: '2px 6px', color: '#f5a623', background: 'rgba(245,166,35,0.1)' }}>{t.is_pinned ? 'Unpin' : 'Pin'}</button>
                        </form>
                        <form action={toggleLockAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="thread_id" value={t.id} />
                          <input type="hidden" name="locked" value={t.is_locked ? '1' : '0'} />
                          <button type="submit" className="btn btn-sm" style={{ fontSize: 8, padding: '2px 6px', color: '#a0b4ff', background: 'rgba(160,180,255,0.1)' }}>{t.is_locked ? 'Unlock' : 'Lock'}</button>
                        </form>
                        <form action={deleteThreadAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="thread_id" value={t.id} />
                          <button type="submit" className="btn btn-sm btn-delete" style={{ fontSize: 8, padding: '2px 6px' }}>Del</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {posts !== null && posts.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent Posts ({posts.length})</h4>
            <table className="table-panel">
              <thead><tr><th>Author</th><th>Thread</th><th>Content</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id}>
                    <td><Link href={`/admin?tab=users&view=profile&id=${p.user_id}`} style={{ color: 'var(--green)', fontSize: 11 }}>{p.username}</Link></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.thread_title || '—'}</td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{p.content}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <form action={deletePostAction}>
                        <input type="hidden" name="post_id" value={p.id} />
                        <button type="submit" className="btn btn-sm btn-delete" style={{ fontSize: 8, padding: '2px 6px' }}>Del</button>
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

  // ── Report Posts ──────────────────────────────────────────────────────────
  if (view === 'report-posts') {
    const reports = await query(`
      SELECT r.*, u.username AS reporter_name, t.username AS target_name
      FROM cms_content_reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      LEFT JOIN users t ON t.id = r.target_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC LIMIT 100
    `).catch(() => null);


    return (
      <div>
        <SectionHeader title="Report Posts" sub={reports ? `${reports.length} pending reports` : 'User-reported community content'} back="community" />
        {reports === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_content_reports table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table.</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pending reports.</p>
          </div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <table className="table-panel">
              <thead><tr><th>Reporter</th><th>Type</th><th>Target</th><th>Reason</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.reporter_name || '—'}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{r.content_type || r.type || 'post'}</span></td>
                    <td style={{ fontSize: 11 }}>{r.target_name || r.content_id || '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)' }}>{r.reason || '—'}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <form action={resolveReportAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="report_id" value={r.id} />
                          <input type="hidden" name="action" value="resolve" />
                          <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: '#34bd59', background: 'rgba(52,189,89,0.1)' }}>Resolve</button>
                        </form>
                        <form action={resolveReportAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="report_id" value={r.id} />
                          <input type="hidden" name="action" value="dismiss" />
                          <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}>Dismiss</button>
                        </form>
                      </div>
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

  // ── User Guestbooks ───────────────────────────────────────────────────────
  if (view === 'guestbooks') {
    const entries = await query(`
      SELECT g.*, a.username AS author_name, p.username AS profile_name
      FROM cms_guestbook_entries g
      LEFT JOIN users a ON a.id = g.author_id
      LEFT JOIN users p ON p.id = g.profile_id
      ORDER BY g.created_at DESC LIMIT 100
    `).catch(() => null);


    return (
      <div>
        <SectionHeader title="User Guestbooks" sub={entries ? `${entries.length} recent entries` : 'Moderate guestbook entries'} back="community" />
        {entries === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_guestbook_entries table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No guestbook entries yet.</p>
          </div>
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <table className="table-panel">
              <thead><tr><th>Written By</th><th>On Profile</th><th>Message</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td><Link href={`/admin?tab=users&view=profile&id=${e.author_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{e.author_name || '—'}</Link></td>
                    <td><Link href={`/admin?tab=users&view=profile&id=${e.profile_id}`} style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{e.profile_name || '—'}</Link></td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)' }}>{e.message}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <form action={deleteEntryAction}>
                        <input type="hidden" name="entry_id" value={e.id} />
                        <button type="submit" className="btn btn-sm btn-delete" style={{ fontSize: 9, padding: '2px 6px' }}>Delete</button>
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

  // ── Community Contests ────────────────────────────────────────────────────
  if (view === 'contests') {
    const contests = await query(`
      SELECT c.*, u.username AS created_by_name,
             (SELECT COUNT(*) FROM cms_contest_entries e WHERE e.contest_id = c.id) AS entry_count
      FROM cms_contests c
      LEFT JOIN users u ON u.id = c.created_by
      ORDER BY c.created_at DESC LIMIT 50
    `).catch(() => null);



    return (
      <div>
        <SectionHeader title="Community Contests" sub={contests ? `${contests.length} contests` : 'Manage contests'} back="community" />

        {contests === null ? (
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>cms_contests table not found</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run <code>sql/ocms_missing_tables.sql</code> to create the table.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Create Contest</h4>
              <form action={createContestAction}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Title *</label>
                  <input type="text" name="title" placeholder="Screenshot Contest..." required />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Description</label>
                  <textarea name="description" rows={3} placeholder="Details and rules..." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Prize</label>
                  <input type="text" name="prize" placeholder="e.g. 500 credits" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>End Date</label>
                  <input type="datetime-local" name="end_date" />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Create Contest</button>
              </form>
            </div>

            <div className="panel no-hover" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Contests ({contests.length})</h4>
              {contests.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No contests yet. Create one!</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Title</th><th>Prize</th><th>Entries</th><th>Ends</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {contests.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td style={{ fontSize: 11, color: '#f5a623' }}>{c.prize || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{c.entry_count || 0}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}</td>
                        <td><span style={{ fontSize: 10, fontWeight: 700, color: c.status === 'active' ? '#34bd59' : '#EF5856', padding: '2px 8px', borderRadius: 4, background: c.status === 'active' ? 'rgba(52,189,89,0.12)' : 'rgba(239,88,86,0.12)' }}>{c.status}</span></td>
                        <td>
                          {c.status === 'active' && (
                            <form action={closeContestAction}>
                              <input type="hidden" name="contest_id" value={c.id} />
                              <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: '#EF5856', background: 'rgba(239,88,86,0.1)' }}>Close</button>
                            </form>
                          )}
                        </td>
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

  // ── Polls ─────────────────────────────────────────────────────────────────
  if (view === 'polls') {
    const polls = await query(`
      SELECT p.*, u.username AS created_by_name,
        COUNT(DISTINCT v.id) AS total_votes,
        COUNT(DISTINCT o.id) AS option_count
      FROM cms_polls p
      LEFT JOIN users u ON u.id = p.created_by
      LEFT JOIN cms_poll_votes v ON v.poll_id = p.id
      LEFT JOIN cms_poll_options o ON o.poll_id = p.id
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 50
    `).catch(() => null);

    return (
      <div>
        <SectionHeader title="Polls & Surveys" sub="Create community polls and view results" back="community" />

        {polls === null && (
          <div className="panel no-hover" style={{ padding:16, marginBottom:16 }}>
            <p style={{ fontSize:12, color:'#f5a623', fontWeight:700 }}>Run this SQL to enable polls:</p>
            <pre style={{ fontSize:10, color:'var(--text-muted)', marginTop:8, whiteSpace:'pre-wrap' }}>{`CREATE TABLE cms_polls (id INT AUTO_INCREMENT PRIMARY KEY, question VARCHAR(300) NOT NULL, description TEXT, created_by INT, active TINYINT DEFAULT 1, is_open TINYINT DEFAULT 1, expires_at DATETIME, created_at DATETIME DEFAULT NOW());
CREATE TABLE cms_poll_options (id INT AUTO_INCREMENT PRIMARY KEY, poll_id INT NOT NULL, option_text VARCHAR(200) NOT NULL, sort_order INT DEFAULT 0);
CREATE TABLE cms_poll_votes (id INT AUTO_INCREMENT PRIMARY KEY, poll_id INT NOT NULL, option_id INT NOT NULL, user_id INT NOT NULL, created_at DATETIME DEFAULT NOW(), UNIQUE KEY uk_vote (poll_id, user_id));`}</pre>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16 }}>
          {/* Create form */}
          <div className="panel no-hover" style={{ padding:20 }}>
            <h4 style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Create Poll</h4>
            <form action={createPollAction}>
              <div style={{ marginBottom:12 }}>
                <label style={labelStyle}>Question *</label>
                <input type="text" name="question" placeholder="What do you think about...?" required maxLength={300} />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={labelStyle}>Description (optional)</label>
                <textarea name="description" rows={2} placeholder="More context..." maxLength={1000} />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={labelStyle}>Options (min 2)</label>
                {[0,1,2,3].map(i => (
                  <input key={i} type="text" name={`option_${i}`} placeholder={`Option ${i+1}${i < 2 ? ' *' : ''}`}
                    required={i < 2} maxLength={200} style={{ marginBottom:6 }} />
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={labelStyle}>Closes At (optional)</label>
                <input type="datetime-local" name="expires_at" />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width:'100%' }}>Create Poll</button>
            </form>
          </div>

          {/* Poll list */}
          <div className="panel no-hover" style={{ padding:20 }}>
            <h4 style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Polls ({polls?.length ?? 0})</h4>
            {!polls || polls.length === 0 ? (
              <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:20 }}>No polls yet.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>Question</th><th>Options</th><th>Votes</th><th>Status</th><th>Open</th><th></th></tr></thead>
                <tbody>
                  {polls.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.question}</td>
                      <td style={{ fontSize:11, color:'var(--text-muted)' }}>{p.option_count}</td>
                      <td style={{ fontWeight:700 }}>{p.total_votes}</td>
                      <td>
                        <form action={togglePollAction} style={{ display:'inline' }}>
                          <input type="hidden" name="poll_id" value={p.id} />
                          <input type="hidden" name="field" value="active" />
                          <input type="hidden" name="current" value={p.active ? '1':'0'} />
                          <button type="submit" className="btn btn-sm" style={{ fontSize:9, padding:'2px 8px',
                            color: p.active ? 'var(--green)' : '#EF5856',
                            background: p.active ? 'rgba(52,189,89,0.1)' : 'rgba(239,88,86,0.1)'
                          }}>{p.active ? 'Active' : 'Hidden'}</button>
                        </form>
                      </td>
                      <td>
                        <form action={togglePollAction} style={{ display:'inline' }}>
                          <input type="hidden" name="poll_id" value={p.id} />
                          <input type="hidden" name="field" value="is_open" />
                          <input type="hidden" name="current" value={p.is_open ? '1':'0'} />
                          <button type="submit" className="btn btn-sm" style={{ fontSize:9, padding:'2px 8px',
                            color: p.is_open ? '#34bd59' : 'var(--text-muted)',
                            background: p.is_open ? 'rgba(52,189,89,0.1)' : 'rgba(255,255,255,0.05)'
                          }}>{p.is_open ? 'Open' : 'Closed'}</button>
                        </form>
                      </td>
                      <td>
                        <form action={deletePollAction}>
                          <input type="hidden" name="poll_id" value={p.id} />
                          <button type="submit" className="btn btn-sm btn-delete" style={{ fontSize:9 }}>Del</button>
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

  // ── Default: News ─────────────────────────────────────────────────────────
  const news = await query(
    'SELECT n.*, u.username AS author_name FROM cms_news n JOIN users u ON u.id = n.author_id ORDER BY n.created_at DESC LIMIT 50'
  ).catch(() => []);


  return (
    <div>
      <div className="panel no-hover" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>News Articles ({news.length})</h3>
          <Link href="/admin?tab=community&view=news-create" className="btn btn-primary btn-sm">+ Create Article</Link>
        </div>
        <table className="table-panel">
          <thead><tr><th>ID</th><th>Title</th><th>Tag</th><th>Author</th><th>Pinned</th><th>Views</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {news.map(n => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td style={{ maxWidth: 200 }}>
                  <Link href={`/news/${n.id}`} style={{ color: 'var(--green)' }} title={n.title}>
                    {n.title?.length > 40 ? n.title.slice(0,40)+'…' : n.title}
                  </Link>
                </td>
                <td><span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'var(--panel-inner)', color: 'var(--text-secondary)' }}>{n.tag}</span></td>
                <td>{n.author_name}</td>
                <td>{n.pinned ? <span style={{ color: '#f5a623' }}>📌</span> : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{n.views}</td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Link href={`/admin?tab=community&view=news-edit&id=${n.id}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 10 }}>Edit</Link>
                    <form action={deleteNewsAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="news_id" value={n.id} />
                      <button type="submit" className="btn btn-sm" style={{ padding: '3px 8px', fontSize: 10, color: 'var(--red)', background: 'rgba(239,88,86,0.1)' }}>Del</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {news.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No news articles yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewsForm({ action, article }) {
  return (
    <div className="panel no-hover" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{article ? `Edit: ${article.title}` : 'Create News Article'}</h3>
        <Link href="/admin?tab=community" className="btn btn-secondary btn-sm">← Back</Link>
      </div>
      <form action={action}>
        {article && <input type="hidden" name="id" value={article.id} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div><label style={labelStyle}>Title *</label><input type="text" name="title" defaultValue={article?.title||''} required /></div>
          <div><label style={labelStyle}>Tag</label>
            <select name="tag" defaultValue={article?.tag||'NEWS'}>
              {['NEWS','UPDATE','EVENT','PROMO','STAFF','PATCH'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Short Description</label><input type="text" name="short_desc" defaultValue={article?.short_desc||''} /></div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Banner Image URL</label><input type="text" name="image" defaultValue={article?.image||''} placeholder="https://..." /></div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Content *</label><textarea name="content" defaultValue={article?.content||''} required style={{ minHeight: 200 }} /></div>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="pinned" id="pinned" defaultChecked={article?.pinned === 1} style={{ width: 'auto' }} />
          <label htmlFor="pinned" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Pin this article to the top</label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary">{article ? 'Save Changes' : 'Publish Article'}</button>
          <Link href="/admin?tab=community" className="btn btn-secondary">Cancel</Link>
          {article && <Link href={`/news/${article.id}`} className="btn btn-secondary" style={{ marginLeft: 'auto' }}>View on Site ↗</Link>}
        </div>
      </form>
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
