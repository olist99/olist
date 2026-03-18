'use client';
import { useState } from 'react';

export default function GiftButton({ itemId, itemName }) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const send = async () => {
    if (!recipient.trim()) return;
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('/api/shop/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, recipient }),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg({ type: 'success', text: d.message });
        setRecipient('');
        setTimeout(() => { setOpen(false); setMsg(null); }, 2500);
      } else {
        setMsg({ type: 'error', text: d.error || 'Failed' });
      }
    } catch { setMsg({ type: 'error', text: 'Connection error' }); }
    setLoading(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>🎁 Gift</button>
  );

  return (
    <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--panel-inner)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Gift "{itemName}" to:</div>
      {msg && (
        <div style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, marginBottom: 6,
          background: msg.type === 'success' ? 'rgba(95,227,94,0.15)' : 'rgba(239,88,86,0.15)',
          color: msg.type === 'success' ? 'var(--green)' : '#EF5856', fontWeight: 700 }}>
          {msg.text}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Username..." style={{ flex: 1, padding: '6px 10px', fontSize: 11 }}
        />
        <button onClick={send} disabled={loading || !recipient.trim()} className="btn btn-primary btn-sm" style={{ fontSize: 10 }}>
          {loading ? '...' : 'Send'}
        </button>
        <button onClick={() => { setOpen(false); setMsg(null); }} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>✕</button>
      </div>
    </div>
  );
}
