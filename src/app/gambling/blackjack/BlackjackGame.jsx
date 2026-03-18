'use client';
import { useState, useRef } from 'react';

const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const SUIT_COLORS = { hearts: '#EF5856', diamonds: '#EF5856', clubs: '#1a1a2e', spades: '#1a1a2e' };

function Card({ card, index = 0, hidden = false }) {
  const isHidden = hidden || card.suit === 'hidden';

  return (
    <div style={{
      width: 80, height: 112, borderRadius: 8, position: 'relative',
      background: isHidden ? 'linear-gradient(135deg, #2a4a7f, #1a2e4f)' : '#fff',
      border: isHidden ? '2px solid #3a5a8f' : '2px solid #ddd',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      transform: `translateX(${index * -25}px)`,
      transition: 'all 0.3s ease',
      flexShrink: 0,
    }}>
      {isHidden ? (
        <div style={{
          width: '80%', height: '85%', borderRadius: 4,
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 6px)',
          border: '2px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.15)', fontWeight: 900 }}>?</div>
        </div>
      ) : (
        <>
          {/* Top rank */}
          <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 13, fontWeight: 800, color: SUIT_COLORS[card.suit] }}>
            {card.rank}
          </div>
          {/* Center suit */}
          <div style={{ fontSize: 32, color: SUIT_COLORS[card.suit] }}>
            {SUIT_SYMBOLS[card.suit]}
          </div>
          {/* Bottom rank */}
          <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 13, fontWeight: 800, color: SUIT_COLORS[card.suit], transform: 'rotate(180deg)' }}>
            {card.rank}
          </div>
        </>
      )}
    </div>
  );
}

function HandDisplay({ label, cards, total, showTotal = true }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
        {showTotal && total !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
            background: total > 21 ? 'rgba(239,88,86,0.2)' : total === 21 ? 'rgba(52,189,89,0.2)' : 'rgba(255,255,255,0.06)',
            color: total > 21 ? '#EF5856' : total === 21 ? '#34bd59' : '#fff',
          }}>{total}</span>
        )}
      </div>
      <div style={{ display: 'flex', paddingLeft: (cards.length - 1) * 25 }}>
        {cards.map((c, i) => <Card key={i} card={c} index={i} />)}
      </div>
    </div>
  );
}

export default function BlackjackGame({ credits, pixels, points }) {
  const [balance, setBalance] = useState({ credits, pixels, points });
  const currency = 'points';
  const [bet, setBet] = useState(100);
  const [gameState, setGameState] = useState(null); // null = not playing
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const triggerCooldown = (seconds = 5) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current); setMessage(''); return 0; } return c - 1; });
    }, 1000);
  };

  const apiCall = async (body) => {
    const res = await fetch('/api/gambling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  // Deal new hand
  const deal = async () => {
    if (loading || cooldown > 0 || (gameState && gameState.action === 'playing')) return;
    if (bet < 1) return;
    if (balance[currency] < bet) { setMessage('NOT_ENOUGH'); return; }
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/gambling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'blackjack', bet, currency, action: 'deal' }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast') || data.error?.includes('Too many')) {
        const wait = data.retryAfter || 5;
        triggerCooldown(wait); setMessage(`TOO_FAST:${wait}`); setLoading(false); return;
      }

      if (data.ok) {
        setBalance(b => ({ ...b, [currency]: data.balance }));

        if (data.action === 'result') {
          setGameState(data);
          const msg = data.push ? 'Push! Both have Blackjack.' : 'Blackjack! You win!';
          setMessage(msg);
          setHistory(h => [{ win: !data.push, push: data.push, profit: data.profit, blackjack: true }, ...h].slice(0, 15));
        } else {
          setGameState(data);
        }
      } else {
        if (data.error?.includes('NOT_ENOUGH') || data.error?.includes('Insufficient') || data.type === 'insufficient_funds') {
          setMessage('NOT_ENOUGH');
        } else {
          setMessage(data.error || 'Failed to deal');
        }
      }
    } catch { setMessage('Connection error'); }
    setLoading(false);
  };

  // Hit
  const hit = async () => {
    if (loading || cooldown > 0 || !gameState || gameState.action !== 'playing') return;
    setLoading(true);

    try {
      const res = await fetch('/api/gambling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'blackjack', bet, currency, action: 'hit', handState: { playerCards: gameState.playerCards, dealerHidden: gameState.dealerHidden } }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast') || data.error?.includes('Too many')) { const wait = data.retryAfter || 5; triggerCooldown(wait); setMessage(`TOO_FAST:${wait}`); setLoading(false); return; }

      if (data.ok) {
        setBalance(b => ({ ...b, [currency]: data.balance }));

        if (data.action === 'result') {
          setGameState(data);
          setMessage(data.bust ? 'Bust! You went over 21.' : 'You win!');
          setHistory(h => [{ win: data.win, push: false, profit: data.profit, bust: data.bust }, ...h].slice(0, 15));
        } else {
          setGameState(data);
        }
      } else {
        setMessage(data.error || 'Hit failed');
      }
    } catch { setMessage('Connection error'); }
    setLoading(false);
  };

  // Stand
  const stand = async () => {
    if (loading || cooldown > 0 || !gameState || gameState.action !== 'playing') return;
    setLoading(true);

    try {
      const res = await fetch('/api/gambling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'blackjack', bet, currency, action: 'stand', handState: { playerCards: gameState.playerCards, dealerHidden: gameState.dealerHidden } }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast') || data.error?.includes('Too many')) { const wait = data.retryAfter || 5; triggerCooldown(wait); setMessage(`TOO_FAST:${wait}`); setLoading(false); return; }

      if (data.ok) {
        setBalance(b => ({ ...b, [currency]: data.balance }));
        setGameState(data);

        let msg;
        if (data.push) msg = `Push! Both have ${data.playerTotal}.`;
        else if (data.win) msg = data.dealerTotal > 21 ? `Dealer busts with ${data.dealerTotal}! You win!` : `You win! ${data.playerTotal} vs ${data.dealerTotal}`;
        else msg = `Dealer wins. ${data.dealerTotal} vs ${data.playerTotal}`;
        setMessage(msg);

        setHistory(h => [{ win: data.win, push: data.push, profit: data.profit }, ...h].slice(0, 15));
      } else {
        setMessage(data.error || 'Stand failed');
        setGameState(null);
      }
    } catch { setMessage('Connection error'); }
    setLoading(false);
  };

  const isPlaying = gameState?.action === 'playing';
  const isResult = gameState?.action === 'result';

  return (
    <div>
      {/* Balance Bar */}
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5px' }} src="/images/gambling/blackjack_icon.png"></img>Blackjack</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13, fontWeight: 700 }}>
          <span><img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />{balance.points.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          {/* Card Table */}
          <div className="panel no-hover" style={{
            padding: 30, marginBottom: 20, minHeight: 400,
            background: 'linear-gradient(180deg, #1a5c2a 0%, #145222 50%, #1a5c2a 100%)',
            borderRadius: 'var(--radius)', border: '3px solid #0d3318',
            position: 'relative',
          }}>
            {/* Felt texture overlay */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius)', opacity: 0.05,
              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {!gameState ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.15)', marginBottom: 12 }}>21</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Place a bet and deal to start</div>
                </div>
              ) : (
                <>
                  {/* Dealer hand */}
                  <HandDisplay
                    label="Dealer"
                    cards={gameState.dealerCards}
                    total={isResult ? gameState.dealerTotal : gameState.dealerShowing}
                    showTotal={true}
                  />

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '16px 0' }} />

                  {/* Player hand */}
                  <HandDisplay
                    label="Your Hand"
                    cards={gameState.playerCards}
                    total={gameState.playerTotal}
                  />
                </>
              )}
            </div>

            {/* Result overlay */}
            {message && message !== 'NOT_ENOUGH' && message !== 'TOO_FAST' && (
              <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                padding: '10px 30px', borderRadius: 'var(--radius)', zIndex: 2,
                background: gameState?.win ? 'rgba(52,189,89,0.9)' : gameState?.push ? 'rgba(59,130,246,0.9)' : 'rgba(239,88,86,0.9)',
                color: '#fff',
                fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}>
                {message}
              </div>
            )}
            {/* Rate limit overlay */}
            {message?.startsWith('TOO_FAST') && (
              <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                padding: '10px 30px', borderRadius: 'var(--radius)', zIndex: 2,
                background: 'rgba(239,88,86,0.9)', color: '#fff',
                fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}>
                Too fast!{cooldown > 0 ? ` Wait ${cooldown}s` : ''}
              </div>
            )}
            {/* Not enough diamonds modal */}
            {message === 'NOT_ENOUGH' && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)', borderRadius: 12, zIndex: 10,
              }}>
                <div style={{ background: 'var(--panel)', padding: 30, borderRadius: 'var(--radius)', textAlign: 'center', maxWidth: 300 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#EF5856', marginBottom: 8 }}>Not Enough Diamonds!</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>You need more diamonds to place this bet.</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <a href="/shop/currency" className="btn btn-primary btn-sm">Buy Diamonds</a>
                    <button onClick={() => setMessage('')} className="btn btn-secondary btn-sm">Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            {isPlaying ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={hit} disabled={loading || cooldown > 0} className="btn-enterhotel"
                  style={{ flex: 1, fontSize: 15, padding: '14px 0', opacity: (loading || cooldown > 0) ? 0.5 : 1 }}>
                  {cooldown > 0 ? `Wait ${cooldown}s` : 'Hit'}
                </button>
                <button onClick={stand} disabled={loading || cooldown > 0}
                  style={{
                    flex: 1, fontSize: 15, padding: '14px 0', borderRadius: 'var(--radius)',
                    background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.1)',
                    color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800,
                    opacity: (loading || cooldown > 0) ? 0.5 : 1,
                  }}>
                  Stand
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Bet Amount</label>
                  <input type="number" value={bet} onChange={e => setBet(Math.max(1, parseInt(e.target.value) || 0))} min={1} />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[100, 500, 1000, 5000].map(v => (
                    <button key={v} onClick={() => setBet(v)}
                      style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>
                      {v >= 1000 ? `${v / 1000}k` : v}
                    </button>
                  ))}
                  <button onClick={() => setBet(balance[currency])}
                    style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'rgba(239,88,86,0.15)', color: '#EF5856', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>
                    MAX
                  </button>
                </div>
                <button onClick={deal} disabled={loading || cooldown > 0 || bet < 1 || balance[currency] < bet}
                  className="btn-enterhotel" style={{ fontSize: 13, opacity: (loading || cooldown > 0) ? 0.5 : 1 }}>
                  {cooldown > 0 ? `Wait ${cooldown}s` : isResult ? 'Deal Again' : 'Deal'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: History */}
        <div>
          {/* Quick rules */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>How to Play</h3>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              Get as close to 21 as possible without going over. Face cards are 10, Aces are 1 or 11.
              Beat the dealer to win. Blackjack (21 on deal) pays 1.5x.
            </div>
          </div>

          <div className="panel no-hover" style={{ padding: 20, position: 'sticky', top: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Hand History</h3>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No hands played yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'var(--panel-inner)', borderRadius: 'var(--radius)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900, flexShrink: 0,
                      background: h.push ? 'rgba(255,255,255,0.1)' : h.win ? 'rgba(52,189,89,0.15)' : 'rgba(239,88,86,0.15)',
                      color: h.push ? '#fff' : h.win ? '#34bd59' : '#EF5856',
                    }}>{h.blackjack ? 'BJ' : h.bust ? 'X' : h.push ? '=' : h.win ? 'W' : 'L'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: h.push ? '#f5a623' : h.win ? '#34bd59' : '#EF5856' }}>
                        {h.push ? 'PUSH' : h.win ? 'WIN' : 'LOSS'}
                      </div>
                      {h.blackjack && <div style={{ fontSize: 9, color: '#f5a623' }}>Blackjack!</div>}
                      {h.bust && <div style={{ fontSize: 9, color: '#EF5856' }}>Bust</div>}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: h.profit > 0 ? '#34bd59' : h.profit === 0 ? '#f5a623' : '#EF5856' }}>
                      {h.profit > 0 ? '+' : ''}{h.profit.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hands played</span>
                  <span style={{ fontWeight: 700 }}>{history.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Win rate</span>
                  <span style={{ fontWeight: 700 }}>{Math.round(history.filter(h => h.win).length / history.length * 100)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Net profit</span>
                  <span style={{ fontWeight: 700, color: history.reduce((s, h) => s + h.profit, 0) >= 0 ? '#34bd59' : '#EF5856' }}>
                    {history.reduce((s, h) => s + h.profit, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
