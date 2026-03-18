'use client';
import { useState, useEffect, useRef } from 'react';

// ── Die face component ──
const PIP_POSITIONS = {
  1: [[50,50]],
  2: [[28,28],[72,72]],
  3: [[28,28],[50,50],[72,72]],
  4: [[28,28],[72,28],[28,72],[72,72]],
  5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  6: [[28,28],[72,28],[28,50],[72,50],[28,72],[72,72]],
};

function Die({ value, size = 72, rolling = false, color = '#fff' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.15,
      background: color, position: 'relative',
      border: '2px solid rgba(0,0,0,0.2)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
      animation: rolling ? 'diceShake 0.15s ease infinite' : 'none',
      flexShrink: 0,
    }}>
      {value
        ? (PIP_POSITIONS[value] || []).map((p, i) => (
            <div key={i} style={{
              position: 'absolute', width: '16%', height: '16%',
              borderRadius: '50%', background: '#1a1a2e',
              left: `${p[0]}%`, top: `${p[1]}%`,
              transform: 'translate(-50%,-50%)',
            }} />
          ))
        : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, color: '#bbb', fontWeight: 900 }}>?</div>
      }
    </div>
  );
}

function DicePair({ dice, rolling, label, total, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {dice.map((v, i) => <Die key={i} value={v} rolling={rolling} color={color} />)}
      </div>
      {total !== undefined && (
        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>{total}</div>
      )}
    </div>
  );
}

const MODES = [
  { key: 'solo',  label: 'Solo', desc: '1 die vs Dealer' },
  { key: '2way',  label: '2-Way', desc: '1v1 · 2 dice each' },
  { key: '3way',  label: '3-Way', desc: '1v1v1 · 2 dice each' },
  { key: '4way',  label: '4-Way', desc: '1v1v1v1 · 2 dice each' },
];

export default function DiceDuelGame({ points, userId }) {
  const [balance, setBalance] = useState(points);
  const [mode, setMode] = useState('solo');
  const [bet, setBet] = useState(100);
  const [rolling, setRolling] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [soloResult, setSoloResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Battle state
  const [rooms, setRooms] = useState([]);
  const [myActiveRoom, setMyActiveRoom] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const lastResultId = useRef(null);

  const showMsg = (text, type = 'error') => setMsg({ text, type });

  const triggerCooldown = (seconds = 5) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current); setMsg({ text: '', type: '' }); return 0; } return c - 1; });
    }, 1000);
  };

  // Poll rooms when in battle mode
  const loadRooms = async (selectedMode) => {
    const m = selectedMode || mode;
    if (m === 'solo') return;
    try {
      const res = await fetch(`/api/duel?game=dice&mode=${m}`);
      const d = await res.json();
      setRooms(d.rooms || []);
      setMyActiveRoom(d.myActiveRoom || null);

      const latestResult = (d.recentResults || [])[0];
      if (latestResult && latestResult.id !== lastResultId.current) {
        lastResultId.current = latestResult.id;
        const parsed = typeof latestResult.result === 'string'
          ? JSON.parse(latestResult.result) : latestResult.result;
        if (parsed) {
          setBattleResult({ ...parsed, winnerName: latestResult.winner_name, pot: latestResult.bet * { '2way':2,'3way':3,'4way':4 }[latestResult.mode] });
          const myEntry = parsed.players?.find(p => p.userId === d.userId || p.userId === userId);
          if (myEntry && latestResult.winner_id !== undefined) {
            const isWinner = latestResult.winner_id === (d.userId || userId);
            setBalance(prev => {
              const pot = latestResult.bet * { '2way':2,'3way':3,'4way':4 }[latestResult.mode];
              return isWinner ? prev + pot - latestResult.bet : prev;
            });
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadRooms(mode);
    if (mode !== 'solo') {
      const t = setInterval(() => loadRooms(mode), 3000);
      return () => clearInterval(t);
    }
  }, [mode]);

  // ── Solo roll ──
  const soloRoll = async () => {
    if (rolling || cooldown > 0 || bet < 1 || balance < bet) {
      if (balance < bet) showMsg('Not enough diamonds!');
      return;
    }
    setRolling(true);
    setSoloResult(null);
    showMsg('');

    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'solo', game: 'dice', bet }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast')) {
        triggerCooldown(data.retryAfter || 5);
        showMsg(`Too fast! Please wait ${data.retryAfter || 5}s.`, 'error');
        setRolling(false);
        return;
      }
      setTimeout(() => {
        if (data.ok) {
          setSoloResult(data);
          setBalance(data.balance);
          setHistory(h => [{ win: data.win, push: data.push, profit: data.profit, pv: data.playerVal, dv: data.dealerVal }, ...h].slice(0, 15));
          if (data.tries > 1) showMsg(`Tied ${data.tries - 1}x — rerolled!`, 'info');
          else showMsg(data.win ? `You win! +${bet.toLocaleString()}` : 'Dealer wins!', data.win ? 'success' : 'error');
        } else {
          showMsg(data.error === 'NOT_ENOUGH' ? 'Not enough diamonds!' : data.error);
        }
        setRolling(false);
      }, 900);
    } catch {
      showMsg('Connection error');
      setRolling(false);
    }
  };

  // ── Create battle room ──
  const createRoom = async () => {
    if (roomLoading || cooldown > 0 || balance < bet) {
      if (balance < bet) showMsg('Not enough diamonds!');
      return;
    }
    setRoomLoading(true);
    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', game: 'dice', mode, bet }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast')) {
        triggerCooldown(data.retryAfter || 5); showMsg(`Too fast! Please wait ${data.retryAfter || 5}s.`, 'error');
      } else if (data.ok) {
        setBalance(b => b - bet);
        showMsg('Room created! Waiting for players...', 'success');
        loadRooms();
      } else {
        showMsg(data.error === 'NOT_ENOUGH' ? 'Not enough diamonds!' : data.error);
      }
    } catch { showMsg('Connection error'); }
    setRoomLoading(false);
  };

  // ── Join battle room ──
  const joinRoom = async (roomId) => {
    if (roomLoading || cooldown > 0) return;
    setRoomLoading(true);
    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', game: 'dice', roomId }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast')) {
        triggerCooldown(data.retryAfter || 5); showMsg(`Too fast! Please wait ${data.retryAfter || 5}s.`, 'error');
      } else if (data.ok) {
        if (data.waiting) {
          showMsg('Joined! Waiting for more players...', 'success');
          loadRooms();
        } else if (data.resolved) {
          setBalance(data.balance);
          setBattleResult({ players: data.players, winnerId: data.winnerId, winnerName: data.winnerName, pot: data.pot });
          lastResultId.current = roomId;
          showMsg(data.isWinner ? `You win! +${(data.pot - bet).toLocaleString()}` : 'You lose!', data.isWinner ? 'success' : 'error');
          loadRooms();
        }
      } else {
        showMsg(data.error === 'NOT_ENOUGH' ? 'Not enough diamonds!' : data.error);
      }
    } catch { showMsg('Connection error'); }
    setRoomLoading(false);
  };

  // ── Cancel room ──
  const cancelRoom = async (roomId) => {
    if (roomLoading) return;
    setRoomLoading(true);
    try {
      await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', game: 'dice', roomId }),
      });
      setBalance(b => b + bet);
      setMyActiveRoom(null);
      loadRooms();
    } catch { showMsg('Connection error'); }
    setRoomLoading(false);
  };

  const openRooms = rooms.filter(r => !myActiveRoom || r.id !== myActiveRoom?.id);

  return (
    <div>
      <style>{`
        @keyframes diceShake {
          0%,100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg) scale(1.05); }
          75% { transform: rotate(8deg) scale(1.05); }
        }
      `}</style>

      {/* Header */}
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5' }} src="/images/gambling/dice_icon.png"></img>Dice Duel</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />
          {balance.toLocaleString()}
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {MODES.map((m, i) => (
          <button key={m.key} onClick={() => { setMode(m.key); setSoloResult(null); setBattleResult(null); showMsg(''); }}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 700, fontSize: 12,
              background: mode === m.key ? 'var(--green)' : 'var(--panel-bg)',
              color: mode === m.key ? '#fff' : 'var(--text-muted)',
              borderRadius: i === 0 ? 'var(--radius) 0 0 var(--radius)' : i === MODES.length - 1 ? '0 var(--radius) var(--radius) 0' : 0,
            }}>
            <div>{m.label}</div>
            <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Message */}
      {(msg.text || cooldown > 0) && (
        <div className={`flash flash-${msg.type === 'success' ? 'success' : msg.type === 'info' ? 'info' : 'error'}`} style={{ marginBottom: 16 }}>
          {msg.text}{cooldown > 0 ? ` (${cooldown}s)` : ''}
        </div>
      )}

      {/* ── SOLO MODE ── */}
      {mode === 'solo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div>
            {/* Dice table */}
            <div className="panel no-hover" style={{
              padding: 40, marginBottom: 16, minHeight: 220,
              background: 'linear-gradient(180deg, #1a2e4f 0%, #111827 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60,
            }}>
              <DicePair
                dice={rolling ? [null] : [soloResult?.playerVal]}
                rolling={rolling} label="You"
                total={!rolling && soloResult ? soloResult.playerVal : undefined}
                color={soloResult ? (soloResult.win ? '#e8f5e9' : '#ffebee') : '#fff'}
              />
              <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>VS</div>
              <DicePair
                dice={rolling ? [null] : [soloResult?.dealerVal]}
                rolling={rolling} label="Dealer"
                total={!rolling && soloResult ? soloResult.dealerVal : undefined}
                color='#fff'
              />
            </div>

            {/* Controls */}
            <div className="panel no-hover" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Bet</label>
                  <input type="number" value={bet} onChange={e => setBet(Math.max(1, parseInt(e.target.value)||0))} min={1} disabled={rolling} />
                </div>
                {[100, 500, 1000, 5000].map(v => (
                  <button key={v} onClick={() => setBet(v)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>
                    {v >= 1000 ? `${v/1000}k` : v}
                  </button>
                ))}
                <button onClick={soloRoll} disabled={rolling || cooldown > 0 || bet < 1 || balance < bet} className="btn-enterhotel" style={{ fontSize: 13, opacity: (rolling || cooldown > 0) ? 0.5 : 1 }}>
                  {rolling ? 'Rolling…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Roll!'}
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="panel no-hover" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>History</h3>
            {history.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No rolls yet.</p>
              : history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{h.pv} vs {h.dv}</span>
                    <span style={{ fontWeight: 700, color: h.push ? '#f5a623' : h.win ? '#34bd59' : '#EF5856' }}>
                      {h.profit > 0 ? '+' : ''}{h.profit.toLocaleString()}
                    </span>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* ── BATTLE MODES ── */}
      {mode !== 'solo' && (
        <div>
          {/* Battle result */}
          {battleResult && (
            <div className="panel no-hover" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Round Result — {battleResult.winnerName} wins!
              </div>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {(battleResult.players || []).map((p, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: p.userId === battleResult.winnerId ? '#34bd59' : 'var(--text-secondary)', marginBottom: 6 }}>
                      {p.userId === userId ? 'You' : `Player ${i+1}`}
                      {p.userId === battleResult.winnerId && ' 🏆'}
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4 }}>
                      {p.roll?.d1 && <Die value={p.roll.d1} size={48} />}
                      {p.roll?.d2 && <Die value={p.roll.d2} size={48} />}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: p.userId === battleResult.winnerId ? '#34bd59' : '#EF5856' }}>
                      {p.roll?.total}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Pot: <img src="/images/diamond.png" alt="" className="icon-inline" /> {battleResult.pot?.toLocaleString()}
              </div>
            </div>
          )}

          {/* My active room (waiting) */}
          {myActiveRoom && (
            <div className="panel no-hover" style={{ padding: 20, marginBottom: 20, border: '1px solid var(--green)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Waiting for players…</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Bet: <img src="/images/diamond.png" alt="" className="icon-inline" /> {myActiveRoom.bet?.toLocaleString()} · Room #{myActiveRoom.id}
                  </div>
                </div>
                {myActiveRoom.player1_id === userId && !myActiveRoom.player2_id && (
                  <button onClick={() => cancelRoom(myActiveRoom.id)} disabled={roomLoading} className="btn btn-secondary btn-sm">Cancel</button>
                )}
              </div>
            </div>
          )}

          {/* Create room */}
          {!myActiveRoom && (
            <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Create a Room</h3>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                {mode === '2way' ? 'You and 1 opponent each roll 2 dice. Highest total wins.' :
                 mode === '3way' ? '3 players each roll 2 dice. Highest total wins the pot.' :
                 '4 players each roll 2 dice. Highest total takes everything.'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Wager per player</label>
                  <input type="number" value={bet} onChange={e => setBet(Math.max(1, parseInt(e.target.value)||0))} min={1} />
                </div>
                {[100, 500, 1000].map(v => (
                  <button key={v} onClick={() => setBet(v)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>
                    {v >= 1000 ? `${v/1000}k` : v}
                  </button>
                ))}
                <button onClick={createRoom} disabled={roomLoading || cooldown > 0 || bet < 1} className="btn-enterhotel" style={{ fontSize: 13, opacity: (roomLoading || cooldown > 0) ? 0.5 : 1 }}>
                  {roomLoading ? 'Creating…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Create Room'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Diamonds held until the room fills. Updates live every 3s.</div>
            </div>
          )}

          {/* Open rooms */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              Open Rooms ({openRooms.length})
            </h3>
            {openRooms.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No open rooms. Create one!</p>
              : openRooms.map(r => {
                  const slots = { '2way':2,'3way':3,'4way':4 }[r.mode];
                  const filled = [r.player1_id,r.player2_id,r.player3_id,r.player4_id].filter(Boolean).length;
                  const isCreator = r.player1_id === userId;
                  const alreadyIn = [r.player1_id,r.player2_id,r.player3_id,r.player4_id].includes(userId);
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${r.p1_look||''}&headonly=1&size=s`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--panel-inner)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{r.p1_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 2 }} />{r.bet?.toLocaleString()}
                          <span style={{ marginLeft: 8 }}>{filled}/{slots} players</span>
                        </div>
                      </div>
                      {!alreadyIn && !myActiveRoom && (
                        <button onClick={() => joinRoom(r.id)} disabled={roomLoading || cooldown > 0} className="btn-enterhotel" style={{ fontSize: 12, opacity: (roomLoading || cooldown > 0) ? 0.5 : 1 }}>
                          {roomLoading ? '…' : 'Join'}
                        </button>
                      )}
                      {isCreator && (
                        <button onClick={() => cancelRoom(r.id)} disabled={roomLoading} className="btn btn-secondary btn-sm">Cancel</button>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}
