import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryScalar } from '@/lib/db';
import { formatNumber, timeAgo } from '@/lib/utils';

export const metadata = { title: 'Community' };

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [totalUsers, onlineNow, totalRooms, totalNews] = await Promise.all([
    queryScalar('SELECT COUNT(*) FROM users').catch(() => 0),
    queryScalar("SELECT COUNT(*) FROM users WHERE online = '1'").catch(() => 0),
    queryScalar('SELECT COUNT(*) FROM rooms').catch(() => 0),
    queryScalar('SELECT COUNT(*) FROM cms_news').catch(() => 0),
  ]);

  const hottestRooms = await query(`
    SELECT r.id, r.name, r.description, r.users, r.users_max, r.score, 
           u.username AS owner_name, u.look AS owner_look
    FROM rooms r
    JOIN users u ON u.id = r.owner_id
    WHERE r.users > 0
    ORDER BY r.users DESC, r.score DESC
    LIMIT 8
  `).catch(() => []);

  const newestUsers = await query(`
    SELECT id, username, look, motto, account_created
    FROM users ORDER BY account_created DESC LIMIT 5
  `).catch(() => []);

  const events = await query(`
    SELECT e.*, u.username AS staff_name
    FROM cms_events e
    JOIN users u ON u.id = e.staff_id
    WHERE (e.end_date IS NOT NULL AND e.end_date > NOW())
       OR (e.end_date IS NULL AND e.event_date >= DATE_SUB(NOW(), INTERVAL 2 HOUR))
       OR e.event_date > NOW()
    ORDER BY e.event_date ASC LIMIT 6
  `).catch(() => []);

  const recentNews = await query('SELECT id, title, tag, short_desc, created_at FROM cms_news ORDER BY created_at DESC LIMIT 4').catch(() => []);

  const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

  return (
    <div className="animate-fade-up">
      {/* Stats Bar */}
      <div className="r-grid-4" style={{ gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: formatNumber(totalUsers), icon: '/images/icon-users.png' },
          { label: 'Online Now', value: formatNumber(onlineNow), icon: '/images/icon-online.png' },
          { label: 'Total Rooms', value: formatNumber(totalRooms), icon: '/images/icon-rooms.png' },
          { label: 'News Articles', value: formatNumber(totalNews), icon: '/images/icon-news.png' },
        ].map((s, i) => (
          <div key={i} className="panel no-hover" style={{ padding: 20, textAlign: 'center' }}>
            <img src={s.icon} alt="" className="icon-pixelated" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="r-grid-community">
        <div>
          {/* Hottest Rooms */}
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Hottest Rooms</h2>
            {hottestRooms.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No active rooms right now.</p>
            ) : (
              <div className="r-grid-2-rooms">
                {hottestRooms.map((r, i) => (
                  <div key={r.id} style={{
                    padding: 14, background: 'var(--panel-inner)', borderRadius: 'var(--radius)',
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}>
                    <img src={`${HABBO_IMG}?figure=${r.owner_look}&headonly=1&size=s&direction=2`}
                      alt="" className="icon-pixelated" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i === 0 && <span style={{ color: 'var(--green)', marginRight: 4 }}>#1</span>}
                        {r.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>by {r.owner_name}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', flexShrink: 0 }}>
                      {r.users}/{r.users_max}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Upcoming Events</h2>
            </div>
            {events.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No upcoming events scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.map(e => {
                  const now = new Date();
                  const start = e.event_date ? new Date(e.event_date) : null;
                  const end = e.end_date ? new Date(e.end_date) : null;
                  const isHappeningNow = start && now >= start && (!end || now <= end);
                  const isFinished = end && now > end;
                  const isUpcoming = start && now < start;
                  const borderColor = isHappeningNow ? '#34bd59' : isFinished ? 'var(--text-muted)' : 'var(--green)';
                  let badgeText = start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
                  let badgeColor = 'var(--green)'; let badgeBg = 'rgba(52,189,89,0.1)';
                  if (isHappeningNow) { badgeText = 'Happening Now!'; badgeColor = '#34bd59'; badgeBg = 'rgba(52,189,89,0.15)'; }
                  else if (isFinished) { badgeText = 'Finished'; badgeColor = 'var(--text-muted)'; badgeBg = 'rgba(255,255,255,0.04)'; }
                  return (
                    <div key={e.id} style={{
                      padding: 16, background: 'var(--panel-inner)', borderRadius: 'var(--radius)',
                      borderLeft: `3px solid ${borderColor}`,
                      opacity: isFinished ? 0.6 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{e.title}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, padding: '2px 10px', borderRadius: 20 }}>
                          {badgeText}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{e.description}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Hosted by {e.staff_name} — {e.location || 'TBA'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Recent News */}
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Latest News</h3>
            {recentNews.map(n => (
              <Link key={n.id} href={`/news/${n.id}`} style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{n.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{n.tag}, {timeAgo(n.created_at)}</div>
              </Link>
            ))}
            <Link href="/news" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--green)', marginTop: 10, textDecoration: 'none' }}>View all news →</Link>
          </div>

          {/* Newest Users */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Newest Members</h3>
            {newestUsers.map(u => (
              <Link key={u.id} href={`/profile/${u.username}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}>
                <img src={`${HABBO_IMG}?figure=${u.look}&headonly=1&size=s&direction=2`} alt="" className="icon-pixelated" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{u.username}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Joined {timeAgo(u.account_created)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
