'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', subject, category, message }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/rules/tickets/${data.ticketId}`);
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch {
      setError('Connection error');
    }
    setSubmitting(false);
  };

  return (
    <div className="panel no-hover" style={{ padding: 24 }}>
      {error && <div className="flash flash-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="general">General Question</option>
            <option value="bug">Bug Report</option>
            <option value="payment">Payment Issue</option>
            <option value="report">Report a User</option>
            <option value="appeal">Ban Appeal</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Subject</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" maxLength={200} required />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..." rows={6}
            style={{ width: '100%', resize: 'vertical', minHeight: 120 }} required />
        </div>

        <button type="submit" className="btn-enterhotel" disabled={submitting} style={{ fontSize: 13, opacity: submitting ? 0.5 : 1 }}>
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
