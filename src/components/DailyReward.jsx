'use client';
import { useState, useEffect, useRef } from 'react';

const CURRENCY_ICONS = { credits: '/images/coin.png', pixels: '/images/ducket.png', points: '/images/diamond.png' };

function Countdown({ nextClaimAt, onReady }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(nextClaimAt) - Date.now()) / 1000));
      setSecs(diff);
      if (diff === 0 && onReady) onReady();
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [nextClaimAt]);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return <span>{h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`}</span>;
}

export default function DailyReward() {
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const res = await fetch('/api/daily-reward');
      const d = await res.json();
      setData(d);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const claim = async () => {
    setClaiming(true); setMsg(null);
    try {
      const res = await fetch('/api/daily-reward', { method: 'POST' });
      const d = await res.json();
      if (d.ok) {
        const r = d.reward;
        setMsg({ type: 'success', text: `Day ${d.streakDay} claimed! +${r.credits} credits${r.pixels ? `, +${r.pixels} duckets` : ''}${r.points ? `, +${r.points} diamonds` : ''}` });
        load();
      } else {
        setMsg({ type: 'error', text: d.error || 'Failed' });
      }
    } catch { setMsg({ type: 'error', text: 'Connection error' }); }
    setClaiming(false);
  };

  if (!data) return null;

  const { rewards, streakDay, canClaim, nextClaimAt } = data;

  return (
    <div className="panel no-hover" style={{ padding: '16px 20px', marginBottom: 25 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Daily Reward</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {canClaim ? 'Your reward is ready!' : <>Next reward in <b><Countdown nextClaimAt={nextClaimAt} onReady={load} /></b></>}
          </div>
        </div>
        {canClaim && (
          <button onClick={claim} disabled={claiming} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            {claiming ? 'Claiming...' : 'Claim Reward'}
          </button>
        )}
      </div>

      {msg && (
        <div className={`flash flash-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 12, fontSize: 11, padding: '6px 12px' }}>
          {msg.text}
        </div>
      )}

      {/* 7-day streak track */}
      <div className="daily-streak-grid">
        {(rewards || []).map((r, i) => {
          const dayNum = r.day;
          const isCurrent = dayNum === streakDay;
          const isDone = canClaim ? dayNum < streakDay : dayNum <= streakDay;
          const isSpecial = dayNum === 7;
          return (
            <div key={dayNum} style={{
              background: isDone ? 'rgba(95,227,94,0.12)' : isCurrent && canClaim ? 'rgba(95,227,94,0.2)' : 'var(--panel-inner)',
              border: `2px solid ${isCurrent && canClaim ? 'var(--green)' : isDone ? 'rgba(95,227,94,0.3)' : isSpecial ? 'rgba(245,200,66,0.3)' : 'transparent'}`,
              borderRadius: 'var(--radius)',
              padding: '8px 4px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {isSpecial && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 800, background: '#f5c842', color: '#000', borderRadius: 10, padding: '1px 6px', whiteSpace: 'nowrap' }}>BEST</div>}
              <div style={{ fontSize: 9, fontWeight: 800, color: isDone ? 'var(--green)' : 'var(--text-muted)', marginBottom: 4 }}>
                {isDone ? '✓' : `Day ${dayNum}`}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isCurrent && canClaim ? 'var(--green)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                {r.credits > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}><img src="/images/coin.png" style={{ width: 10, height: 10 }} />{r.credits}</div>}
                {r.pixels  > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}><img src="/images/ducket.png" style={{ width: 10, height: 10 }} />{r.pixels}</div>}
                {r.points  > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}><img src="/images/diamond.png" style={{ width: 10, height: 10 }} />{r.points}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
