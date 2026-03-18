'use client';
import { useState, useEffect, useRef } from 'react';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS  = { hearts: '#EF5856', diamonds: '#EF5856', clubs: '#1a1a2e', spades: '#1a1a2e' };

function PlayingCard({ card, size = 'md' }) {
  const w = size === 'sm' ? 52 : 70;
  const h = size === 'sm' ? 72 : 96;
  if (!card) {
    return (
      <div style={{ width: w, height: h, borderRadius: 8, background: 'linear-gradient(135deg, #2a4a7f, #1a2e4f)', border: '2px solid #3a5a8f', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <span style={{ fontSize: w * 0.35, color: 'rgba(255,255,255,0.2)', fontWeight: 900 }}>?</span>
      </div>
    );
  }
  return (
    <div style={{ width: w, height: h, borderRadius: 8, background: '#fff', border: '2px solid #ddd', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
      <div style={{ position: 'absolute', top: 3, left: 5, fontSize: size === 'sm' ? 10 : 12, fontWeight: 800, color: SUIT_COLORS[card.suit] }}>{card.rank}</div>
      <div style={{ fontSize: size === 'sm' ? 22 : 28, color: SUIT_COLORS[card.suit] }}>{SUIT_SYMBOLS[card.suit]}</div>
      <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: size === 'sm' ? 10 : 12, fontWeight: 800, color: SUIT_COLORS[card.suit], transform: 'rotate(180deg)' }}>{card.rank}</div>
    </div>
  );
}

const MODES = [
  { key: 'solo',  label: 'Solo', desc: '1 card vs Dealer' },
  { key: '2way',  label: '2-Way', desc: '1v1 · 2 cards each' },
  { key: '3way',  label: '3-Way', desc: '1v1v1 · 2 cards each' },
  { key: '4way',  label: '4-Way', desc: '1v1v1v1 · 2 cards each' },
];

export default function HighCardGame({ points, userId }) {
  const [balance, setBalance] = useState(points);
  const [mode, setMode] = useState('solo');
  const [bet, setBet] = useState(100);
  const [drawing, setDrawing] = useState(false);
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

  const loadRooms = async (selectedMode) => {
    const m = selectedMode || mode;
    if (m === 'solo') return;
    try {
      const res = await fetch(`/api/duel?game=highcard&mode=${m}`);
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

  // ── Solo draw ──
  const soloDraw = async () => {
    if (drawing || cooldown > 0 || bet < 1 || balance < bet) {
      if (balance < bet) showMsg('Not enough diamonds!');
      return;
    }
    setDrawing(true);
    setSoloResult(null);
    showMsg('');

    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'solo', game: 'highcard', bet }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error?.includes('Too fast')) {
        triggerCooldown(data.retryAfter || 5);
        showMsg(`Too fast! Please wait ${data.retryAfter || 5}s.`, 'error');
        setDrawing(false);
        return;
      }
      setTimeout(() => {
        if (data.ok) {
          setSoloResult(data);
          setBalance(data.balance);
          setHistory(h => [{ win: data.win, push: data.push, profit: data.profit, pc: data.playerDisplay, dc: data.dealerDisplay }, ...h].slice(0, 15));
          if (data.tries > 1) showMsg(`Tied ${data.tries - 1}x — redrawn!`, 'info');
          else showMsg(data.win ? `You win! +${bet.toLocaleString()}` : 'Dealer wins!', data.win ? 'success' : 'error');
        } else {
          showMsg(data.error === 'NOT_ENOUGH' ? 'Not enough diamonds!' : data.error);
        }
        setDrawing(false);
      }, 700);
    } catch {
      showMsg('Connection error');
      setDrawing(false);
    }
  };

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
        body: JSON.stringify({ action: 'create', game: 'highcard', mode, bet }),
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

  const joinRoom = async (roomId) => {
    if (roomLoading || cooldown > 0) return;
    setRoomLoading(true);
    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', game: 'highcard', roomId }),
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
          setBattleResult({ players: data.players, winnerId: data.winnerId, pot: data.pot });
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

  const cancelRoom = async (roomId) => {
    if (roomLoading) return;
    setRoomLoading(true);
    try {
      await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', game: 'highcard', roomId }),
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
      {/* Header */}
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5' }} src="/images/gambling/card_icon.png"></img>High Card</div>
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
            <div className="panel no-hover" style={{
              padding: 40, marginBottom: 16, minHeight: 220,
              background: 'linear-gradient(180deg, #1a2e4f 0%, #111827 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60,
            }}>
              {/* Player card */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>You</div>
                <PlayingCard card={drawing ? null : soloResult?.playerDisplay} />
                {!drawing && soloResult && (
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, color: soloResult.win ? '#34bd59' : '#EF5856' }}>
                    {soloResult.playerVal}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>VS</div>

              {/* Dealer card */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Dealer</div>
                <PlayingCard card={drawing ? null : soloResult?.dealerDisplay} />
                {!drawing && soloResult && (
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, color: 'var(--text-secondary)' }}>
                    {soloResult.dealerVal}
                  </div>
                )}
              </div>
            </div>

            <div className="panel no-hover" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Bet</label>
                  <input type="number" value={bet} onChange={e => setBet(Math.max(1, parseInt(e.target.value)||0))} min={1} disabled={drawing} />
                </div>
                {[100, 500, 1000, 5000].map(v => (
                  <button key={v} onClick={() => setBet(v)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>
                    {v >= 1000 ? `${v/1000}k` : v}
                  </button>
                ))}
                <button onClick={soloDraw} disabled={drawing || cooldown > 0 || bet < 1 || balance < bet} className="btn-enterhotel" style={{ fontSize: 13, opacity: (drawing || cooldown > 0) ? 0.5 : 1 }}>
                  {drawing ? 'Drawing…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Draw!'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                Card ranks: 2 (low) → Ace (high). Ties auto-redraw. Win = 2× bet.
              </div>
            </div>
          </div>

          {/* History */}
          <div className="panel no-hover" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>History</h3>
            {history.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No draws yet.</p>
              : history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {h.pc?.rank}{SUIT_SYMBOLS[h.pc?.suit]} vs {h.dc?.rank}{SUIT_SYMBOLS[h.dc?.suit]}
                    </span>
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
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {(battleResult.players || []).map((p, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: p.userId === battleResult.winnerId ? '#34bd59' : 'var(--text-secondary)', marginBottom: 8 }}>
                      {p.userId === userId ? 'You' : `Player ${i+1}`}
                      {p.userId === battleResult.winnerId && ' 🏆'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
                      {p.roll?.c1 && <PlayingCard card={p.roll.c1} size="sm" />}
                      {p.roll?.c2 && <PlayingCard card={p.roll.c2} size="sm" />}
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

          {/* My active room */}
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
                {mode === '2way' ? 'You and 1 opponent each draw 2 cards. Highest total wins.' :
                 mode === '3way' ? '3 players each draw 2 cards. Highest total wins the pot.' :
                 '4 players each draw 2 cards. Highest total takes everything.'}
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
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Open Rooms ({openRooms.length})</h3>
            {openRooms.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No open rooms. Create one!</p>
              : openRooms.map(r => {
                  const slots = { '2way':2,'3way':3,'4way':4 }[r.mode];
                  const filled = [r.player1_id,r.player2_id,r.player3_id,r.player4_id].filter(Boolean).length;
                  const alreadyIn = [r.player1_id,r.player2_id,r.player3_id,r.player4_id].includes(userId);
                  const isCreator = r.player1_id === userId;
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
