import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { timeAgo } from '@/lib/utils';

export const metadata = { title: 'My Tickets' };

const STATUS_COLORS = { open: '#f5a623', answered: '#34bd59', closed: '#8b949e' };

export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let tickets = [];
  try {
    tickets = await query(
      'SELECT * FROM cms_tickets WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id]
    );
  } catch(e) {}

  return (
    <div className="animate-fade-up">
      <div className="panel no-hover" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>My Tickets</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>View and manage your support tickets.</p>
        </div>
        <Link href="/rules/tickets/create" className="btn-enterhotel" style={{ fontSize: 12 }}>Create Ticket</Link>
      </div>

      {tickets.length === 0 ? (
        <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tickets yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tickets.map(t => (
            <Link key={t.id} href={`/rules/tickets/${t.id}`} className="panel"
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none' }}>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                background: `${STATUS_COLORS[t.status] || '#8b949e'}22`,
                color: STATUS_COLORS[t.status] || '#8b949e',
                textTransform: 'uppercase',
              }}>{t.status}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>#{t.id} — {t.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.category} — {timeAgo(t.updated_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
