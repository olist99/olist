'use client';
import { useState } from 'react';
import { buyWithTokensAction } from './actions';

export default function TokenPurchaseButton({ itemId, itemName, tokenCost, userTokens, disabled, cat }) {
  const [showGift, setShowGift]     = useState(false);
  const [showError, setShowError]   = useState(false);
  const [recipient, setRecipient]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);

  const canAfford = userTokens >= tokenCost;

  const handleBuyClick = () => {
    if (!canAfford) {
      setShowError(true);
      setTimeout(() => setShowError(false), 4000);
    }
  };

  const handleGift = async () => {
    if (!recipient.trim()) return;
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('/api/tokens/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, recipient }),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg({ type: 'success', text: d.message });
        setRecipient('');
        setTimeout(() => { setShowGift(false); setMsg(null); }, 2500);
      } else {
        setMsg({ type: 'error', text: d.error || 'Gift failed' });
      }
    } catch { setMsg({ type: 'error', text: 'Connection error' }); }
    setLoading(false);
  };

  if (disabled) {
    return (
      <button disabled className="btn btn-secondary btn-sm" style={{ opacity: 0.5, fontSize: 10 }}>
        Sold Out
      </button>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        {canAfford ? (
          <form action={buyWithTokensAction}>
            <input type="hidden" name="item_id" value={itemId} />
            <input type="hidden" name="cat" value={cat} />
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'var(--green)', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer',
              }}
            >
              Buy
            </button>
          </form>
        ) : (
          <button
            onClick={handleBuyClick}
            className="btn btn-primary"
            style={{
              background: 'var(--green)', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer',
            }}
          >
            Buy
          </button>
        )}
        <button
          onClick={() => { setShowGift(v => !v); setShowError(false); }}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 10 }}
          title="Gift this item to another player"
        >
          Gift
        </button>
      </div>

      {/* Can't afford error */}
      {showError && (
        <div style={{
          marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius)',
          background: 'rgba(239,88,86,0.12)', border: '1px solid rgba(239,88,86,0.25)',
          fontSize: 10, color: '#EF5856', fontWeight: 600, lineHeight: 1.5,
        }}>
          Not enough tokens! You need <strong>{tokenCost - userTokens}</strong> more.{' '}
          <a href="/token-shop" onClick={() => {
            // trigger buy modal — scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} style={{ color: '#f5a623', fontWeight: 700, textDecoration: 'underline' }}>
            Buy tokens
          </a>
        </div>
      )}

      {/* Gift form */}
      {showGift && (
        <div style={{
          marginTop: 8, padding: '10px 12px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Gift &ldquo;{itemName}&rdquo; to:
          </div>
          {msg && (
            <div style={{
              fontSize: 10, padding: '4px 8px', borderRadius: 4, marginBottom: 6,
              background: msg.type === 'success' ? 'rgba(95,227,94,0.15)' : 'rgba(239,88,86,0.15)',
              color: msg.type === 'success' ? 'var(--green)' : '#EF5856', fontWeight: 700,
            }}>
              {msg.text}
            </div>
          )}
          {!canAfford && (
            <div style={{ fontSize: 10, color: '#EF5856', marginBottom: 6 }}>
              You need {tokenCost - userTokens} more tokens to gift this item.
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text" value={recipient}
              onChange={e => setRecipient(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGift()}
              placeholder="Username..." style={{ flex: 1, padding: '6px 10px', fontSize: 11 }}
            />
            <button
              onClick={handleGift}
              disabled={loading || !recipient.trim() || !canAfford}
              className="btn btn-primary btn-sm" style={{ fontSize: 10 }}
            >
              {loading ? '...' : 'Send'}
            </button>
            <button
              onClick={() => { setShowGift(false); setMsg(null); }}
              className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
