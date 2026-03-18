import Link from 'next/link';
import { query, queryOne } from '@/lib/db';

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };

export default async function EventsSection({ view, sp, user }) {

  // ── Create / Edit Event ───────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    const event = view === 'edit' && sp?.id
      ? await queryOne('SELECT * FROM cms_events WHERE id = ?', [parseInt(sp.id)]).catch(() => null)
      : null;

    async function saveEventAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { sanitizeText } = await import('@/lib/security');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 3) redirect('/admin');
      const id          = formData.get('id');
      const title       = sanitizeText(formData.get('title') || '', 200);
      const description = sanitizeText(formData.get('description') || '', 2000);
      const eventDate   = formData.get('event_date') || null;
      const endDate     = formData.get('end_date')   || null;
      const image       = sanitizeText(formData.get('image') || '', 500);
      if (!title) redirect('/admin?tab=events&error=Title+required');
      if (id) {
        await db('UPDATE cms_events SET title=?,description=?,event_date=?,end_date=?,image=? WHERE id=?', [title,description,eventDate,endDate,image,id]);
        redirect('/admin?tab=events&success=Event+updated');
      } else {
        await db('INSERT INTO cms_events (title,description,event_date,end_date,image,staff_id) VALUES (?,?,?,?,?,?)', [title,description,eventDate,endDate,image,u.id]);
        redirect('/admin?tab=events&success=Event+created');
      }
    }

    return (
      <div className="panel no-hover" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{event ? `Edit: ${event.title}` : 'Create Event / Competition'}</h3>
          <Link href="/admin?tab=events" className="btn btn-secondary btn-sm">Back</Link>
        </div>
        <form action={saveEventAction}>
          {event && <input type="hidden" name="id" value={event.id} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div><label style={labelStyle}>Title *</label><input type="text" name="title" defaultValue={event?.title||''} required /></div>
            <div><label style={labelStyle}>Start Date & Time</label><input type="datetime-local" name="event_date" defaultValue={event?.event_date ? new Date(event.event_date).toISOString().slice(0,16) : ''} /></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>End Date & Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — shows Happening Now! while active)</span></label>
            <input type="datetime-local" name="end_date" defaultValue={event?.end_date ? new Date(event.end_date).toISOString().slice(0,16) : ''} />
          </div>
          <div style={{ marginBottom: 16 }}><label style={labelStyle}>Description</label><textarea name="description" defaultValue={event?.description||''} rows={4} /></div>
          <div style={{ marginBottom: 20 }}><label style={labelStyle}>Banner Image URL</label><input type="text" name="image" defaultValue={event?.image||''} placeholder="https://..." /></div>
          <button type="submit" className="btn btn-primary">{event ? 'Save Changes' : 'Create Event'}</button>
        </form>
      </div>
    );
  }

  // ── Event Currency Control ────────────────────────────────────────────────
  if (view === 'currency') {
    const events = await query(
      "SELECT * FROM cms_events WHERE event_date <= NOW() OR event_date IS NULL ORDER BY event_date DESC LIMIT 30"
    ).catch(() => []);

    async function awardCurrencyAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const currency = ['credits','pixels','points'].includes(formData.get('currency')) ? formData.get('currency') : 'credits';
      const amount   = Math.max(1, Math.min(10000, parseInt(formData.get('amount')) || 0));
      const target   = formData.get('target'); // 'all' or user id
      const reason   = `Event reward by ${u.username}`;
      if (!amount) redirect('/admin?tab=events&view=currency&error=Invalid+amount');
      if (target === 'all') {
        await db(`UPDATE users SET \`${currency}\` = \`${currency}\` + ? WHERE rank >= 1`, [amount]);
        await db('INSERT INTO cms_credit_log (user_id, admin_id, currency, amount, reason) SELECT id, ?, ?, ?, ? FROM users WHERE rank >= 1',
          [u.id, currency, amount, reason]).catch(() => {});
      } else {
        const uid = parseInt(target);
        if (uid) {
          await db(`UPDATE users SET \`${currency}\` = \`${currency}\` + ? WHERE id = ?`, [amount, uid]);
          await db('INSERT INTO cms_credit_log (user_id, admin_id, currency, amount, reason) VALUES (?,?,?,?,?)',
            [uid, u.id, currency, amount, reason]).catch(() => {});
        }
      }
      redirect('/admin?tab=events&view=currency&success=Currency+awarded');
    }

    return (
      <div>
        <SectionHeader title="Event Currency Control" sub="Award currency to players as event rewards" back="events" />

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Award Currency</h4>
            <form action={awardCurrencyAction}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Currency</label>
                <select name="currency">
                  <option value="credits">Credits</option>
                  <option value="pixels">Duckets</option>
                  <option value="points">Diamonds</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Amount *</label>
                <input type="number" name="amount" min={1} max={10000} placeholder="100" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Award To</label>
                <select name="target">
                  <option value="all">All Players</option>
                </select>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Or enter a user ID to award to one player:</p>
                <input type="number" name="target" placeholder="User ID (optional)" min={1} style={{ marginTop: 4 }} />
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(245,166,35,0.08)', borderRadius: 6, marginBottom: 14, border: '1px solid rgba(245,166,35,0.2)' }}>
                <p style={{ fontSize: 11, color: '#f5a623' }}>Awarding to <strong>All Players</strong> will give currency to every registered account. Use with care.</p>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Award Currency</button>
            </form>
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent Events (for reference)</h4>
            {events.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No events found. <Link href="/admin?tab=events&view=create" style={{ color: 'var(--green)' }}>Create one</Link></p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>Event</th><th>Date</th></tr></thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.title}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.event_date ? new Date(e.event_date).toLocaleDateString() : '—'}</td>
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

  // ── Quest Editor ──────────────────────────────────────────────────────────
  if (view === 'quests') {
    const quests = await query('SELECT * FROM cms_quests ORDER BY id LIMIT 200').catch(() => null);

    if (quests === null) {
      return (
        <div>
          <SectionHeader title="Quest Editor" sub="Create and manage player quests" back="events" />
          <ComingSoonPanel feature="Quest Editor" description="The cms_quests table was not found. Run sql/ocms_missing_tables.sql to create it." />
        </div>
      );
    }

    const groups = [...new Set(quests.map(q => q.category || q.achievement_group || 'General'))].sort();

    return (
      <div>
        <SectionHeader title="Quest Editor" sub={`${quests.length} quests in database`} back="events" />
        {groups.map(group => {
          const groupQuests = quests.filter(q => (q.category || q.achievement_group || 'General') === group);
          return (
            <div key={group} className="panel no-hover" style={{ padding: 20, marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--green)' }}>{group} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({groupQuests.length})</span></h4>
              <table className="table-panel">
                <thead><tr><th>ID</th><th>Name</th><th>Reward</th><th>Reward Type</th><th>Achievement</th></tr></thead>
                <tbody>
                  {groupQuests.map(q => (
                    <tr key={q.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{q.id}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{q.name || q.quest_name || '—'}</td>
                      <td style={{ color: '#f5c842', fontWeight: 600 }}>{q.reward_amount || q.reward || '—'}</td>
                      <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{q.reward_type || '—'}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.achievement_group || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {quests.length === 0 && (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No quests found in the database.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Badge Rewards ─────────────────────────────────────────────────────────
  if (view === 'badge-rewards') {
    const search = sp?.search || '';
    const userId = sp?.id ? parseInt(sp.id) : null;
    let targetUser = null, searchResults = [];

    if (userId) {
      targetUser = await queryOne('SELECT id, username FROM users WHERE id = ?', [userId]).catch(() => null);
    } else if (search) {
      searchResults = await query(
        'SELECT id, username FROM users WHERE username LIKE ? ORDER BY id DESC LIMIT 15', [`%${search}%`]
      ).catch(() => []);
    }

    async function awardBadgeAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 4) redirect('/admin');
      const badgeCode = (formData.get('badge_code') || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
      const target    = formData.get('target'); // 'all' or user id
      if (!badgeCode) redirect('/admin?tab=events&view=badge-rewards&error=Badge+code+required');
      if (target === 'all') {
        const users = await db('SELECT id FROM users WHERE rank >= 1').catch(() => []);
        for (const user of users) {
          await db('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [user.id, badgeCode]).catch(() => {});
        }
      } else {
        const uid = parseInt(target);
        if (uid) await db('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [uid, badgeCode]);
      }
      const redir = userId ? `/admin?tab=events&view=badge-rewards&id=${userId}&success=Badge+${badgeCode}+awarded` : `/admin?tab=events&view=badge-rewards&success=Badge+${badgeCode}+awarded`;
      redirect(redir);
    }

    return (
      <div>
        <SectionHeader title="Badge Rewards" sub="Award event badges to players" back="events" />

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Award Badge</h4>

            <form action="/admin" method="GET" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="hidden" name="tab" value="events" />
              <input type="hidden" name="view" value="badge-rewards" />
              <input type="text" name="search" placeholder="Search player..." defaultValue={search} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-secondary btn-sm">Find</button>
            </form>

            {!userId && searchResults.map(u => (
              <Link key={u.id} href={`/admin?tab=events&view=badge-rewards&id=${u.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--panel-inner)', borderRadius: 6, marginBottom: 4, textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{u.username}</span>
                <span style={{ fontSize: 10, color: 'var(--green)' }}>Select →</span>
              </Link>
            ))}

            <form action={awardBadgeAction}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Badge Code *</label>
                <input type="text" name="badge_code" placeholder="e.g. EVENT2024" required style={{ textTransform: 'uppercase' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Award To</label>
                <select name="target">
                  {targetUser ? (
                    <option value={targetUser.id}>{targetUser.username}</option>
                  ) : (
                    <option value="all">All Players</option>
                  )}
                </select>
                {targetUser && (
                  <Link href="/admin?tab=events&view=badge-rewards" style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Change player</Link>
                )}
              </div>
              {!targetUser && (
                <div style={{ padding: '10px 14px', background: 'rgba(245,166,35,0.08)', borderRadius: 6, marginBottom: 14, border: '1px solid rgba(245,166,35,0.2)' }}>
                  <p style={{ fontSize: 11, color: '#f5a623' }}>Search for a player above to award to one person, or leave "All Players" to award to everyone.</p>
                </div>
              )}
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Award Badge</button>
            </form>
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>How It Works</h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <p style={{ marginBottom: 8 }}>Use badge codes from your Arcturus installation. Common event badges:</p>
              {[
                ['ACH_Win1', 'First win achievement'],
                ['ACH_Login7', '7-day login streak'],
                ['EVENT_*', 'Custom event badges'],
              ].map(([code, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <code style={{ color: 'var(--green)', fontSize: 11, minWidth: 100 }}>{code}</code>
                  <span style={{ fontSize: 11 }}>{desc}</span>
                </div>
              ))}
              <p style={{ marginTop: 12 }}>Badge images are served from <code>/images/badges/[code].gif</code>.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: Schedule Events ──────────────────────────────────────────────
  const eventsData = await query(
    'SELECT e.*, u.username AS staff_name FROM cms_events e LEFT JOIN users u ON u.id = e.staff_id ORDER BY e.event_date DESC LIMIT 50'
  ).catch(() => []);

  async function deleteEventAction(formData) {
    'use server';
    const { getCurrentUser } = await import('@/lib/auth');
    const { query: db } = await import('@/lib/db');
    const { redirect } = await import('next/navigation');
    const u = await getCurrentUser();
    if (!u || u.rank < 3) redirect('/admin');
    const id = parseInt(formData.get('event_id'));
    if (id) await db('DELETE FROM cms_events WHERE id = ?', [id]);
    redirect('/admin?tab=events&success=Event+deleted');
  }

  return (
    <div className="panel no-hover" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Events & Competitions ({eventsData.length})</h3>
        <Link href="/admin?tab=events&view=create" className="btn btn-primary btn-sm">+ Create Event</Link>
      </div>
      {eventsData.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No events scheduled.</p>
      ) : (
        <table className="table-panel">
          <thead><tr><th>Event</th><th>Start</th><th>Status</th><th>Staff</th><th></th></tr></thead>
          <tbody>
            {eventsData.map(e => {
              const now   = new Date();
              const start = e.event_date ? new Date(e.event_date) : null;
              const end   = e.end_date   ? new Date(e.end_date)   : null;
              let statusLabel = '—', statusColor = 'var(--text-muted)';
              if (start && now < start) {
                const diff = start - now;
                const days = Math.floor(diff / 86400000);
                const hrs  = Math.floor((diff % 86400000) / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                statusLabel = days > 0 ? `in ${days}d ${hrs}h` : hrs > 0 ? `in ${hrs}h ${mins}m` : `in ${mins}m`;
                statusColor = '#f5a623';
              } else if (start && end && now >= start && now <= end) {
                const diff = end - now;
                const hrs  = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                statusLabel = hrs > 0 ? `ends in ${hrs}h ${mins}m` : `ends in ${mins}m`;
                statusColor = '#34bd59';
              } else if (end && now > end) {
                statusLabel = 'Finished'; statusColor = '#EF5856';
              } else if (start && !end) {
                statusLabel = 'Active'; statusColor = '#34bd59';
              }
              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 700 }}>{e.title}</td>
                  <td style={{ fontSize: 11 }}>{start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td><span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: `${statusColor}22`, padding: '2px 8px', borderRadius: 4 }}>{statusLabel}</span></td>
                  <td>{e.staff_name}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/admin?tab=events&view=edit&id=${e.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                    <form action={deleteEventAction}><input type="hidden" name="event_id" value={e.id} /><button type="submit" className="btn btn-sm btn-delete">Delete</button></form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
