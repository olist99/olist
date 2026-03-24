'use client';
import { useState } from 'react';

export default function EventRsvp({ eventId, myRsvp, userId }) {
  const [attending, setAttending] = useState(!!myRsvp);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const next = !attending;
    try {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, attending: next }),
      });
      const data = await res.json();
      if (data.ok) {
        setAttending(next);
        setCount(data.count);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700,
        border: attending ? '1px solid rgba(52,189,89,0.5)' : '1px solid var(--border)',
        background: attending ? 'rgba(52,189,89,0.12)' : 'var(--panel-inner)',
        color: attending ? '#34bd59' : 'var(--text-secondary)',
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
        transition: 'all .15s',
        flexShrink: 0,
      }}
    >
      {loading ? '…' : attending ? '✅ Going' : '+ RSVP'}
    </button>
  );
}
