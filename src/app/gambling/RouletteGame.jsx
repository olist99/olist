'use client';
import { useState } from 'react';

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
function numColor(n) { if (n === 0) return '#34bd59'; return RED_NUMBERS.includes(n) ? '#EF5856' : '#2a2a2e'; }

export default function RouletteGame({ credits, pixels, points }) {
  const [balance, setBalance] = useState(points);
  const [chipSize, setChipSize] = useState(5);
  const [bets, setBets] = useState({});
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  const totalBet = Object.values(bets).reduce((s, v) => s + v, 0);

  const placePick = (c) => {
    if (spinning) return;
    if (chipSize > balance - totalBet) {
      setMessage({ text: 'Not enough diamonds! Visit the shop to buy more.', type: 'error', link: '/shop/currency' });
      return;
    }
    setBets(prev => ({ ...prev, [c]: (prev[c] || 0) + chipSize }));
  };

  const removePick = (c, e) => { e?.stopPropagation(); if (!spinning) setBets(prev => { const n = { ...prev }; delete n[c]; return n; }); };
  const clearAll = () => { if (!spinning) setBets({}); };

  const spin = async () => {
    if (spinning || totalBet < 1 || Object.keys(bets).length === 0) return;
    if (totalBet > balance) { setMessage({ text: 'Not enough diamonds!', type: 'error', link: '/shop/currency' }); return; }
    setSpinning(true); setMessage({ text: '', type: '' }); setResult(null);
    try {
      const res = await fetch('/api/gambling', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'roulette', bets }) });
      const data = await res.json();
      setTimeout(() => {
        if (data.ok) {
          setResult(data); setBalance(data.balance); setBets({});
          setHistory(h => [{ number: data.number, color: data.color, totalWin: data.totalWin, totalBet: data.totalBet, profit: data.profit }, ...h].slice(0, 20));
          setMessage(data.profit > 0 ? { text: `Won ${data.totalWin.toLocaleString()} diamonds! (+${data.profit.toLocaleString()})`, type: 'success' } : data.profit === 0 ? { text: 'Push — broke even', type: 'info' } : { text: `Lost ${Math.abs(data.profit).toLocaleString()} diamonds`, type: 'error' });
        } else {
          if (data.error?.includes('Not enough')) setMessage({ text: 'Not enough diamonds!', type: 'error', link: '/shop/currency' });
          else setMessage({ text: data.error || 'Bet failed', type: 'error' });
        }
        setSpinning(false);
      }, 2500);
    } catch { setMessage({ text: 'Connection error', type: 'error' }); setSpinning(false); }
  };

  const chipColors = { 5: '#3b82f6', 10: '#a855f7', 25: '#f59e0b', 50: '#EF5856', 250: '#34bd59', 500: '#e74c8b' };

  const BetBadge = ({ val }) => {
    const b = bets[val]; if (!b) return null;
    return (
      <div onClick={(e) => removePick(val, e)} title="Click to remove" style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, background: '#f59e0b', color: '#000', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid rgba(0,0,0,0.3)', cursor: 'pointer', zIndex: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
        {b >= 1000 ? `${(b/1000).toFixed(b%1000?1:0)}k` : b}
      </div>
    );
  };

  return (
    <div>
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <img src="/images/nav-gambling.png" alt="" className="icon-pixelated" />
        <div style={{ fontSize: 18, fontWeight: 800 }}>Roulette</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />{balance.toLocaleString()}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div>
          {/* Result */}
          <div className="panel no-hover" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
            {result ? (
              <div>
                <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: numColor(result.number), fontSize: 32, fontWeight: 900, color: '#fff', boxShadow: `0 0 30px ${numColor(result.number)}44` }}>{result.number}</div>
                {result.winningBets?.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Winning: {result.winningBets.map(w => `${w.choice} (${w.multiplier}x → +${w.payout.toLocaleString()})`).join(', ')}
                </div>}
              </div>
            ) : <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>{spinning ? 'Spinning...' : 'Pick a chip size, then click to place bets'}</div>}
          </div>

          {/* Message */}
          {message.text && (
            <div className={`flash flash-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`} style={{ marginBottom: 16 }}>
              {message.text}
              {message.link && <a href={message.link} style={{ color: '#fff', fontWeight: 800, marginLeft: 8, textDecoration: 'underline' }}>Go to Shop →</a>}
            </div>
          )}

          {/* Chip selector */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Chips:</span>
              {[5, 10, 25, 50, 250, 500].map(v => (
                <button key={v} onClick={() => setChipSize(v)} disabled={spinning} style={{
                  width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontFamily: 'inherit',
                  background: chipColors[v], color: '#fff', fontWeight: 800, fontSize: 11,
                  border: chipSize === v ? '3px solid #fff' : '3px solid transparent',
                  boxShadow: chipSize === v ? `0 0 12px ${chipColors[v]}88` : 'none',
                  opacity: spinning ? 0.5 : 1, transition: 'all 0.15s',
                }}>{v}</button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {totalBet > 0 && <span style={{ fontSize: 12, fontWeight: 700 }}>Total: <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 2 }} />{totalBet.toLocaleString()}</span>}
                {Object.keys(bets).length > 0 && <button onClick={clearAll} disabled={spinning} style={{ padding: '6px 12px', borderRadius: 'var(--radius)', background: 'rgba(239,88,86,0.12)', color: '#EF5856', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>Clear</button>}
              </div>
            </div>
          </div>

          {/* Number board */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Numbers (36x)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
              <button onClick={() => placePick('0')} disabled={spinning} style={{ gridColumn: '1/-1', padding: 8, borderRadius: 4, position: 'relative', border: bets['0'] ? '2px solid #fff' : '2px solid transparent', background: '#34bd59', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>0 (14x) <BetBadge val="0" /></button>
              {Array.from({length:36},(_,i)=>i+1).map(n => (
                <button key={n} onClick={() => placePick(String(n))} disabled={spinning} style={{ padding: '6px 0', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', background: numColor(n), color: '#fff', fontWeight: 700, fontSize: 11, border: bets[String(n)] ? '2px solid #fff' : '2px solid transparent', opacity: spinning ? 0.5 : 1 }}>{n}<BetBadge val={String(n)} /></button>
              ))}
            </div>
          </div>

          {/* Side bets - new layout */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Side Bets</div>
            {/* Red / Black - full row each */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              {[{ val:'red', label:'Red', c:'#EF5856', p:'2x' }, { val:'black', label:'Black', c:'#2a2a2e', p:'2x' }].map(s => (
                <button key={s.val} onClick={() => placePick(s.val)} disabled={spinning} style={{ padding: '12px 6px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', background: bets[s.val] ? s.c : 'var(--panel-inner)', border: bets[s.val] ? '2px solid #fff' : `2px solid ${s.c}44`, color: '#fff', fontSize: 13, fontWeight: 800 }}>
                  {s.label} <span style={{ fontSize: 10, opacity: 0.6 }}>{s.p}</span><BetBadge val={s.val} />
                </button>
              ))}
            </div>
            {/* Even / Odd - full row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              {[{ val:'even', label:'Even', p:'2x' }, { val:'odd', label:'Odd', p:'2x' }].map(s => (
                <button key={s.val} onClick={() => placePick(s.val)} disabled={spinning} style={{ padding: '12px 6px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', background: bets[s.val] ? '#555' : 'var(--panel-inner)', border: bets[s.val] ? '2px solid #fff' : '2px solid transparent', color: '#fff', fontSize: 13, fontWeight: 800 }}>
                  {s.label} <span style={{ fontSize: 10, opacity: 0.6 }}>{s.p}</span><BetBadge val={s.val} />
                </button>
              ))}
            </div>
            {/* 1st 12, 2nd 12, 3rd 12 - full row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[{ val:'1-12', label:'1st 12', p:'3x' }, { val:'13-24', label:'2nd 12', p:'3x' }, { val:'25-36', label:'3rd 12', p:'3x' }].map(s => (
                <button key={s.val} onClick={() => placePick(s.val)} disabled={spinning} style={{ padding: '12px 6px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', background: bets[s.val] ? '#555' : 'var(--panel-inner)', border: bets[s.val] ? '2px solid #fff' : '2px solid transparent', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                  {s.label} <span style={{ fontSize: 10, opacity: 0.6 }}>{s.p}</span><BetBadge val={s.val} />
                </button>
              ))}
            </div>
          </div>

          {/* Bet summary & spin */}
          <div className="panel no-hover" style={{ padding: 16 }}>
            {Object.keys(bets).length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(bets).map(([choice, amount]) => (
                  <div key={choice} onClick={(e) => removePick(choice, e)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', cursor: 'pointer', fontSize: 11 }}>
                    <span style={{ fontWeight: 700 }}>{choice}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{amount.toLocaleString()}</span>
                    <span style={{ color: '#EF5856', fontSize: 10 }}>✕</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Object.keys(bets).length} bet{Object.keys(bets).length !== 1 ? 's' : ''} — {totalBet.toLocaleString()} diamonds</div>
              <button onClick={spin} disabled={spinning || totalBet < 1 || totalBet > balance} className="btn-enterhotel" style={{ fontSize: 13, opacity: spinning ? 0.5 : 1 }}>{spinning ? 'Spinning...' : 'Spin!'}</button>
            </div>
          </div>
        </div>

        {/* History sidebar */}
        <div className="panel no-hover" style={{ padding: 20, position: 'sticky', top: 20, alignSelf: 'start' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Recent Spins</h3>
          {history.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No spins yet.</p> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {history.map((h, i) => <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', background: numColor(h.number) }}>{h.number}</div>)}
            </div>
          )}
          {history.length > 0 && <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            {history.slice(0, 8).map((h, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0' }}><span style={{ color: 'var(--text-muted)' }}>#{h.number}</span><span style={{ fontWeight: 700, color: h.profit > 0 ? '#34bd59' : h.profit === 0 ? 'var(--text-muted)' : '#EF5856' }}>{h.profit > 0 ? '+' : ''}{h.profit?.toLocaleString()}</span></div>)}
          </div>}
        </div>
      </div>
    </div>
  );
}
