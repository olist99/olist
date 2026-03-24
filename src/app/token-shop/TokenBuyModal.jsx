'use client';
import { useState } from 'react';

const COINS = [
  { symbol: 'BTC',   name: 'Bitcoin',    color: '#f7931a', icon: '₿' },
  { symbol: 'ETH',   name: 'Ethereum',   color: '#627eea', icon: 'Ξ' },
  { symbol: 'LTC',   name: 'Litecoin',   color: '#bfbbbb', icon: 'Ł' },
  { symbol: 'USDT',  name: 'Tether',     color: '#26a17b', icon: '₮' },
  { symbol: 'DOGE',  name: 'Dogecoin',   color: '#c2a633', icon: 'Ð' },
  { symbol: 'SOL',   name: 'Solana',     color: '#9945ff', icon: '◎' },
  { symbol: 'XRP',   name: 'Ripple',     color: '#346aa9', icon: '✕' },
  { symbol: 'BNB',   name: 'BNB',        color: '#f3ba2f', icon: 'B' },
];

export default function TokenBuyModal({ packages }) {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [giftTo, setGiftTo]     = useState('');
  const [showGift, setShowGift] = useState(false);
  const [error, setError]       = useState(null);

  const handleCheckout = async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/tokens/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id:    selected,
          gift_username: showGift ? giftTo.trim() : '',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const pkg = packages.find(p => p.id === selected);
  const fmtPrice = (pence, currency) => {
    const sym = { gbp: '£', usd: '$', eur: '€' }[currency] || '';
    return `${sym}${(pence / 100).toFixed(2)}`;
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="btn btn-primary"
      style={{
        background: 'linear-gradient(135deg, #f7931a, #e8860a)',
        border: 'none', fontWeight: 800, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 7,
      }}
    >
      <span style={{ fontSize: 15 }}>₿</span> Buy Tokens
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && setOpen(false)}
    >
      <div style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', width: '100%', maxWidth: 500,
        overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(247,147,26,0.1), transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>₿</span> Buy Tokens with Crypto
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Pay with any coin — powered by NOWPayments · 300+ cryptocurrencies accepted
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
          >✕</button>
        </div>

        <div style={{ padding: 20 }}>

          {/* ── Accepted coins strip ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {COINS.map(c => (
              <div key={c.symbol} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.04)', borderRadius: 20,
                padding: '3px 8px', fontSize: 10, fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ color: c.color, fontSize: 11 }}>{c.icon}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.symbol}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '3px 8px', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic',
            }}>+ 300 more</div>
          </div>

          {/* ── Package selector ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
            SELECT A PACKAGE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {packages.map(p => {
              const isSel = selected === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{
                    padding: '12px 16px', borderRadius: 'var(--radius)', cursor: 'pointer',
                    border: `1.5px solid ${isSel ? '#f7931a' : 'var(--border)'}`,
                    background: isSel ? 'rgba(247,147,26,0.07)' : 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all .12s', position: 'relative',
                  }}
                >
                  {p.popular === 1 && (
                    <div style={{
                      position: 'absolute', top: -8, right: 12,
                      background: 'linear-gradient(135deg, #f7931a, #e8860a)',
                      color: '#000', fontSize: 9, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 10,
                    }}>⭐ BEST VALUE</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isSel ? 'rgba(247,147,26,0.18)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, transition: 'background .12s',
                      color: '#f7931a',
                    }}>🪙</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {Number(p.tokens).toLocaleString()} tokens
                        {p.bonus_pct > 0 && (
                          <span style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 6 }}>
                            +{p.bonus_pct}% bonus
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 800, fontSize: 16,
                      color: isSel ? '#f7931a' : 'var(--text-primary)',
                    }}>
                      {fmtPrice(p.price_pence, p.currency)}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>equiv. in crypto</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Gift toggle ── */}
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: 'var(--bg-secondary)',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>🎁 Gift to another player</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tokens go to a friend instead</div>
              </div>
              <div
                onClick={() => setShowGift(v => !v)}
                style={{
                  width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                  background: showGift ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background .15s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: showGift ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left .15s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }} />
              </div>
            </div>
            {showGift && (
              <input
                type="text" value={giftTo} onChange={e => setGiftTo(e.target.value)}
                placeholder="Enter username..."
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, marginTop: 10 }}
              />
            )}
          </div>

          {error && (
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 'var(--radius)',
              background: 'rgba(239,88,86,0.12)', color: '#EF5856',
              border: '1px solid rgba(239,88,86,0.2)', marginBottom: 12,
            }}>{error}</div>
          )}

          {/* ── Checkout button ── */}
          <button
            onClick={handleCheckout}
            disabled={!selected || loading || (showGift && !giftTo.trim())}
            style={{
              width: '100%', padding: '13px 20px',
              background: selected && !loading
                ? 'linear-gradient(135deg, #f7931a, #c8610a)'
                : 'rgba(255,255,255,0.06)',
              color: selected && !loading ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRadius: 'var(--radius)',
              fontWeight: 800, fontSize: 14,
              cursor: selected && !loading ? 'pointer' : 'not-allowed',
              transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                Redirecting to payment page...
              </>
            ) : pkg ? (
              <>₿ Pay {fmtPrice(pkg.price_pence, pkg.currency)} in crypto</>
            ) : (
              'Select a package to continue'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
            🔒 Powered by <strong>NOWPayments</strong> · Tokens added within minutes of confirmation
          </div>
        </div>
      </div>
    </div>
  );
}
