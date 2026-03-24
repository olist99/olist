import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { timeAgo } from '@/lib/utils';
import EventRsvp from './EventRsvp';

export const metadata = { title: 'Events Calendar' };

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [upcoming, past] = await Promise.all([
    query(`
      SELECT e.*, u.username AS staff_name,
        (SELECT COUNT(*) FROM cms_event_rsvps r WHERE r.event_id = e.id AND r.attending = 1) AS rsvp_count,
        (SELECT attending FROM cms_event_rsvps r WHERE r.event_id = e.id AND r.user_id = ?) AS my_rsvp
      FROM cms_events e
      JOIN users u ON u.id = e.staff_id
      WHERE e.event_date >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
         OR (e.end_date IS NOT NULL AND e.end_date > NOW())
      ORDER BY e.event_date ASC
      LIMIT 20
    `, [user.id]).catch(() => []),
    query(`
      SELECT e.*, u.username AS staff_name,
        (SELECT COUNT(*) FROM cms_event_rsvps r WHERE r.event_id = e.id AND r.attending = 1) AS rsvp_count
      FROM cms_events e
      JOIN users u ON u.id = e.staff_id
      WHERE e.event_date < DATE_SUB(NOW(), INTERVAL 2 HOUR)
        AND (e.end_date IS NULL OR e.end_date <= NOW())
      ORDER BY e.event_date DESC
      LIMIT 10
    `).catch(() => []),
  ]);

  return (
    <div className="animate-fade-up">
      <div className="title-header mb-6">
        <h2 className="text-xl font-bold">Events Calendar</h2>
        <p className="text-xs text-text-secondary mt-0.5">Upcoming hotel events — RSVP to let staff know you're coming!</p>
      </div>

      {upcoming.length === 0 ? (
        <div className="card p-16 text-center text-text-muted">No upcoming events scheduled. Check back soon!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {upcoming.map(e => <EventCard key={e.id} event={e} user={user} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, marginTop: 8 }}>Past Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(e => (
              <div key={e.id} className="panel no-hover" style={{ padding: '14px 20px', opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {e.event_date ? new Date(e.event_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    {' · '}{e.rsvp_count} attended
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#EF5856', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,88,86,0.1)' }}>Finished</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventCard({ event: e, user }) {
  const now = new Date();
  const start = e.event_date ? new Date(e.event_date) : null;
  const end = e.end_date ? new Date(e.end_date) : null;
  const isLive = start && now >= start && (!end || now <= end);
  const isSoon = start && !isLive && (start - now) < 86400000; // within 24h

  return (
    <div className="card" style={{ overflow: 'hidden', borderColor: isLive ? 'var(--green)' : undefined }}>
      {e.image && (
        <div style={{ height: 160, background: `url(${e.image}) center/cover`, position: 'relative' }}>
          {isLive && (
            <span style={{ position: 'absolute', top: 12, left: 12, background: '#34bd59', color: '#fff', fontWeight: 800, fontSize: 10, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              HAPPENING NOW
            </span>
          )}
        </div>
      )}
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {!e.image && isLive && (
                <span style={{ background: '#34bd59', color: '#fff', fontWeight: 800, fontSize: 9, padding: '2px 8px', borderRadius: 20 }}>● LIVE</span>
              )}
              {isSoon && !isLive && (
                <span style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623', fontWeight: 800, fontSize: 9, padding: '2px 8px', borderRadius: 20 }}>SOON</span>
              )}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{e.title}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {start && (
                <span>📅 {start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {e.location && <span>📍 {e.location}</span>}
              <span>👤 Hosted by {e.staff_name}</span>
              <span>✅ {e.rsvp_count} attending</span>
            </div>
          </div>
          <EventRsvp eventId={e.id} myRsvp={e.my_rsvp} userId={user.id} />
        </div>
        {e.description && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line', marginTop: 10 }}>{e.description}</p>
        )}
        {start && !isLive && start > now && (
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            Starts {timeAgo(e.event_date)}
          </div>
        )}
      </div>
    </div>
  );
}
