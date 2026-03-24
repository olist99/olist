'use client';
import { useState } from 'react';

export default function TokenVoucherBox() {
  const [code, setCode]       = useState('');
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/shop/voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ ok: true, msg: `Redeemed! You received: ${data.rewards}${data.message ? ` - ${data.message}` : ''}` });
        setCode('');
      } else {
        setStatus({ ok: false, msg: data.error || 'Invalid or expired voucher code.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Connection error. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 240 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && redeem()}
          placeholder="VOUCHER CODE"
          style={{
            flex: 1, fontFamily: 'monospace', letterSpacing: 2,
            textTransform: 'uppercase', fontSize: 12,
          }}
          maxLength={32}
        />
        <button
          onClick={redeem}
          disabled={loading || !code.trim()}
          className="btn btn-secondary btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? '...' : 'Redeem'}
        </button>
      </div>
      {status && (
        <div style={{
          fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius)',
          background: status.ok ? 'rgba(52,189,89,0.10)' : 'rgba(239,88,86,0.10)',
          color: status.ok ? '#34bd59' : '#EF5856',
          border: `1px solid ${status.ok ? 'rgba(52,189,89,0.2)' : 'rgba(239,88,86,0.2)'}`,
        }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
