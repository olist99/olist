'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TicketReply({ ticketId }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', ticketId, message }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage('');
        router.refresh();
      }
    } catch {}
    setSubmitting(false);
  };

  const handleClose = async () => {
    if (!confirm('Close this ticket?')) return;
    await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', ticketId }),
    });
    router.refresh();
  };

  return (
    <div className="panel no-hover" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Reply</h3>
      <textarea value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Type your reply..." rows={4}
        style={{ width: '100%', resize: 'vertical', minHeight: 80, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleReply} disabled={submitting || !message.trim()}
          className="btn-enterhotel" style={{ fontSize: 12, opacity: submitting ? 0.5 : 1 }}>
          {submitting ? 'Sending...' : 'Send Reply'}
        </button>
        <button onClick={handleClose}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius)', background: 'rgba(239,88,86,0.1)',
            border: '1px solid rgba(239,88,86,0.2)', color: '#EF5856', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          }}>
          Close Ticket
        </button>
      </div>
    </div>
  );
}
