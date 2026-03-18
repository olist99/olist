import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { timeAgo } from '@/lib/utils';
import TicketReply from './TicketReply';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const p = await params;
  return { title: `Ticket #${p.id}` };
}

const STATUS_COLORS = { open: '#f5a623', answered: '#34bd59', closed: '#8b949e' };

export default async function TicketDetailPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const p = await params;
  const ticketId = p.id;

  const ticket = await queryOne('SELECT t.*, u.username FROM cms_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?', [ticketId]);
  if (!ticket) redirect('/rules/tickets');

  // Only ticket owner or staff can view
  if (ticket.user_id !== user.id && user.rank < 4) redirect('/rules/tickets');

  const messages = await query(`
    SELECT m.*, u.username, u.look, u.\`rank\`
    FROM cms_ticket_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.ticket_id = ?
    ORDER BY m.created_at ASC
  `, [ticketId]);

  const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

  return (
    <div className="animate-fade-up">
      <Link href={user.rank >= 4 ? '/admin?tab=tickets' : '/rules/tickets'} className="btn btn-secondary btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>
        Back to {user.rank >= 4 ? 'Admin' : 'My Tickets'}
      </Link>

      {/* Ticket header */}
      <div className="panel no-hover" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>#{ticket.id} — {ticket.subject}</h1>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span>By {ticket.username}</span>
            <span>{ticket.category}</span>
            <span>{timeAgo(ticket.created_at)}</span>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: 20,
          background: `${STATUS_COLORS[ticket.status]}22`,
          color: STATUS_COLORS[ticket.status],
          textTransform: 'uppercase',
        }}>{ticket.status}</span>
      </div>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {messages.map(m => (
          <div key={m.id} className="panel no-hover" style={{
            padding: 16,
            borderLeft: m.is_staff ? '3px solid var(--green)' : '3px solid transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img src={`${HABBO_IMG}?figure=${m.look}&headonly=1&size=s&direction=3`} alt=""
                style={{ width: 24, imageRendering: 'pixelated' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: m.is_staff ? 'var(--green)' : 'var(--white)' }}>
                {m.username} {m.is_staff ? '(Staff)' : ''}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(m.created_at)}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {m.message}
            </div>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {ticket.status !== 'closed' ? (
        <TicketReply ticketId={ticket.id} />
      ) : (
        <div className="panel no-hover" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          This ticket is closed.
        </div>
      )}
    </div>
  );
}
