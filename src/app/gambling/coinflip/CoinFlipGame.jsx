'use client';
import { useState, useEffect, useRef } from 'react';

export default function CoinFlipGame({ points, userId }) {
    const [balance, setBalance] = useState(points);
    const [bet, setBet] = useState(100);
    const [choice, setChoice] = useState('heads');
    const [flipping, setFlipping] = useState(false);
    const [battleLoading, setBattleLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [mode, setMode] = useState('solo');
    const [battles, setBattles] = useState([]);
    const [battleResult, setBattleResult] = useState(null);
    const [myUserId, setMyUserId] = useState(userId);
    const [cooldown, setCooldown] = useState(0);
    const cooldownRef = useRef(null);

    const setMsg = (text, type = 'error') => setMessage({ text, type });

    const triggerCooldown = (seconds = 5) => {
        setCooldown(seconds);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current); setMessage({ text: '', type: '' }); return 0; } return c - 1; });
        }, 1000);
    };

    // --- Load battles and handle latest completed battle ---
    const loadBattles = async () => {
        try {
            const res = await fetch('/api/coinflip-battle');
            const d = await res.json();
            setBattles(d.battles || []);
            if (d.userId) setMyUserId(d.userId);

            // Show only the latest completed battle for this user
            const latestBattle = (d.battles || [])
                .filter(b => b.status === 'done' && (b.creator_id === d.userId || b.opponent_id === d.userId))
                .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

            if (latestBattle) {
                const isWinner = latestBattle.winner_id === d.userId;
                setBattleResult({
                    flip: latestBattle.result,
                    pot: latestBattle.bet * 2,
                    winner: { username: latestBattle.winner_name },
                    loser: {
                        username: isWinner
                            ? (latestBattle.creator_id === d.userId ? latestBattle.opponent_name : latestBattle.creator_name)
                            : (latestBattle.creator_id === d.userId ? latestBattle.creator_name : latestBattle.opponent_name)
                    },
                    isWinner,
                });

                // Refresh balance after completed battle
                const balRes = await fetch('/api/gambling', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game: 'coinflip', bet: 0, choice: 'heads' })
                });
                const balData = await balRes.json();
                if (balData.balance != null) setBalance(balData.balance);
            } else {
                setBattleResult(null); // clear previous battle result
            }
        } catch (e) {
            console.error('Failed to load battles', e);
        }
    };

    // Poll battles every 3s
    useEffect(() => {
        loadBattles();
        const t = setInterval(loadBattles, 3000);
        return () => clearInterval(t);
    }, []);

    // --- Solo flip ---
    const soloFlip = async () => {
        if (flipping || cooldown > 0 || bet < 1) return;
        if (balance < bet) { setMsg('Not enough diamonds!', 'error'); return; }

        setFlipping(true);
        setMsg('');
        setResult(null);

        try {
            const res = await fetch('/api/gambling', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: 'coinflip', bet, choice })
            });
            if (res.status === 429) {
                triggerCooldown(data.retryAfter || 5); setMsg(`Too fast! Please wait ${data.retryAfter || 5}s.`, 'error'); setFlipping(false); return;
            }
            const data = await res.json();
            if (data.error?.includes('Too fast') || data.error?.includes('Too many')) {
                triggerCooldown(data.retryAfter || 5); setMsg(`Too fast! Please wait ${data.retryAfter || 5}s.`, 'error'); setFlipping(false); return;
            }

            setTimeout(() => {
                if (data.ok) {
                    setResult(data);
                    setBalance(data.balance);
                    setHistory(h => [{ flip: data.flip, win: data.win, profit: data.profit, choice }, ...h].slice(0, 15));
                    setMsg(data.win ? `Won ${(bet * 2).toLocaleString()} diamonds!` : `Lost ${bet.toLocaleString()} diamonds`, data.win ? 'success' : 'error');
                } else {
                    setMsg(data.error);
                }
                setFlipping(false);
            }, 1800);
        } catch {
            setMsg('Connection error');
            setFlipping(false);
        }
    };

    // --- Create a battle ---
    const createBattle = async () => {
        if (battleLoading || cooldown > 0 || balance < bet) {
            if (balance < bet) setMsg('Not enough diamonds!', 'error');
            return;
        }
        setBattleLoading(true);
        setBalance(prev => prev - bet);

        try {
            const res = await fetch('/api/coinflip-battle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', amount: bet, choice })
            });
            const data = await res.json();
            if (res.status === 429 || data.error?.includes('Too many')) {
                const wait = data.retryAfter || 5;
                triggerCooldown(wait); setMsg(`Too fast! Please wait ${wait}s.`, 'error');
                setBalance(prev => prev + bet);
            } else {
                if (data.ok) {
                    loadBattles();
                    setMsg('Battle created! Waiting for opponent...', 'success');
                } else {
                    setBalance(prev => prev + bet);
                    setMsg(data.error);
                }
            }
        } catch {
            setBalance(prev => prev + bet);
            setMsg('Connection error');
        }
        setBattleLoading(false);
    };

    // --- Accept a battle ---
    const acceptBattle = async (battleId) => {
        if (battleLoading || cooldown > 0) return;
        setBattleLoading(true);
        setBattleResult(null);

        try {
            const res = await fetch('/api/coinflip-battle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', battleId })
            });
            const data = await res.json();
            if (res.status === 429 || data.error?.includes('Too many')) {
                const wait = data.retryAfter || 5;
                triggerCooldown(wait); setMsg(`Too fast! Please wait ${wait}s.`, 'error');
            } else {
                if (data.ok) {
                    setBalance(data.yourBalance || balance);
                    const isWinner = data.winnerId === myUserId;
                    setBattleResult({ flip: data.flip, pot: data.pot, winner: data.winner, loser: data.loser, isWinner });
                    loadBattles();
                    setMsg(isWinner ? `You won ${data.pot.toLocaleString()} diamonds!` : `${data.winner.username} won!`, isWinner ? 'success' : 'error');
                } else {
                    setMsg(data.error);
                }
            }
        } catch {
            setMsg('Connection error');
        }
        setBattleLoading(false);
    };

    // --- Cancel a battle ---
    const cancelBattle = async (battleId, amount) => {
        if (battleLoading) return;
        setBattleLoading(true);
        await fetch('/api/coinflip-battle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel', battleId })
        });
        setBalance(prev => prev + amount);
        loadBattles();
        setBattleLoading(false);
    };

    return (
    <div>
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5' }} src="/images/gambling/cointoss_icon.png"></img>Coin Toss</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />{balance.toLocaleString()}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {['solo', 'battle'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: 12, background: mode === m ? 'var(--green)' : 'var(--panel-bg)', border: 'none', color: mode === m ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', borderRadius: m === 'solo' ? 'var(--radius) 0 0 var(--radius)' : '0 var(--radius) var(--radius) 0' }}>
            {m === 'solo' ? 'Solo Flip' : 'Battle a Player'}
          </button>
        ))}
      </div>

      {/* Alert messages */}
      {(message.text || cooldown > 0) && (
        <div className={`flash flash-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`} style={{ marginBottom: 16 }}>
          {message.text}{cooldown > 0 ? ` (${cooldown}s)` : ''}
          {message.link && <a href={message.link} style={{ color: '#fff', fontWeight: 800, marginLeft: 8, textDecoration: 'underline' }}>Go to Shop →</a>}
        </div>
      )}

      {mode === 'solo' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {/* Coin animation */}
            <div className="panel no-hover" style={{ padding: 30, textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', margin: '0 auto 12px',
                background: result ? (result.flip === 'heads' ? 'linear-gradient(135deg, #f5c842, #e6a817)' : 'linear-gradient(135deg, #c0c0c0, #888)') : 'var(--panel-inner)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, fontWeight: 900, color: result?.flip === 'heads' ? '#4a3600' : result?.flip === 'tails' ? '#222' : 'var(--text-muted)',
                boxShadow: result ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                animation: flipping ? 'spin 0.5s linear infinite' : 'none',
                transition: 'all 0.3s',
              }}>
                {flipping ? '?' : result ? (result.flip === 'heads' ? 'H' : 'T') : '?'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: result ? (result.win ? '#34bd59' : '#EF5856') : 'var(--text-muted)', marginTop: 8 }}>
                {result ? `Landed: ${result.flip}` : 'Pick a side and flip!'}
              </div>
            </div>
            <div className="panel no-hover" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <button onClick={() => setChoice('heads')} disabled={flipping} style={{ padding: 16, borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit', background: choice === 'heads' ? 'linear-gradient(135deg, #f5c842, #e6a817)' : 'var(--panel-inner)', border: choice === 'heads' ? '2px solid #f5c842' : '2px solid transparent', color: choice === 'heads' ? '#4a3600' : 'var(--text-secondary)', fontSize: 16, fontWeight: 800 }}>Heads</button>
                <button onClick={() => setChoice('tails')} disabled={flipping} style={{ padding: 16, borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit', background: choice === 'tails' ? 'linear-gradient(135deg, #c0c0c0, #888)' : 'var(--panel-inner)', border: choice === 'tails' ? '2px solid #c0c0c0' : '2px solid transparent', color: choice === 'tails' ? '#222' : 'var(--text-secondary)', fontSize: 16, fontWeight: 800 }}>Tails</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><input type="number" value={bet} onChange={e => setBet(Math.max(1, parseInt(e.target.value)||0))} min={1} disabled={flipping} /></div>
                {[100,500,1000].map(v => <button key={v} onClick={() => setBet(v)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>{v>=1000?`${v/1000}k`:v}</button>)}
                <button onClick={soloFlip} disabled={flipping || cooldown > 0 || bet < 1} className="btn-enterhotel" style={{ fontSize: 13, opacity: (flipping || cooldown > 0) ? 0.5 : 1 }}>{flipping ? 'Flipping...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Flip!'}</button>
              </div>
            </div>
          </div>
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>History</h3>
            {history.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No flips yet.</p> :
              history.map((h, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><span>{h.flip}</span><span style={{ fontWeight: 700, color: h.win ? '#34bd59' : '#EF5856' }}>{h.profit > 0 ? '+' : ''}{h.profit.toLocaleString()}</span></div>)
            }
          </div>
        </div>
      ) : (
        <div>
          {battleResult && (
            <div className="panel no-hover" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
              {/* Coin with both usernames */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${battleResult.winner?.look || ''}&headonly=1&size=s`} alt="" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel-inner)' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: '#34bd59' }}>{battleResult.winner?.username}</div>
                </div>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: battleResult.flip === 'heads' ? 'linear-gradient(135deg, #f5c842, #e6a817)' : 'linear-gradient(135deg, #c0c0c0, #888)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 900, color: battleResult.flip === 'heads' ? '#4a3600' : '#222',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>{battleResult.flip === 'heads' ? 'H' : 'T'}</div>
                <div style={{ textAlign: 'center' }}>
                  <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${battleResult.loser?.look || ''}&headonly=1&size=s`} alt="" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel-inner)' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: '#EF5856' }}>{battleResult.loser?.username}</div>
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: battleResult.isWinner ? '#34bd59' : '#EF5856' }}>
                {battleResult.isWinner ? `You won ${battleResult.pot.toLocaleString()} diamonds!` : `${battleResult.winner?.username} won!`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Pot: <img src="/images/diamond.png" alt="" className="icon-inline" /> {battleResult.pot.toLocaleString()}</div>
            </div>
          )}

          <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Create a Battle</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Wager (Diamonds)</label>
                <input type="number" value={bet} onChange={e => setBet(Math.max(1, parseInt(e.target.value)||0))} min={1} /></div>
              <button onClick={createBattle} disabled={battleLoading || cooldown > 0 || bet < 1} className="btn-enterhotel" style={{ fontSize: 13, opacity: (battleLoading || cooldown > 0) ? 0.5 : 1 }}>
                {battleLoading ? 'Creating…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Create Battle'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Diamonds held until someone accepts or you cancel. Updates live every 3s.</div>
          </div>

          <div className="panel no-hover" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Open Battles ({battles.filter(b => b.status === 'waiting').length})</h3>
            {battles.filter(b => b.status === 'waiting').length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No open battles. Create one!</p> :
              battles.filter(b => b.status === 'waiting').map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${b.creator_look || ''}&headonly=1&size=s`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--panel-inner)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{b.creator_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wager: <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 2 }} />{b.bet?.toLocaleString()}</div>
                  </div>
                  {b.creator_id === myUserId ? (
                    <button onClick={() => cancelBattle(b.id, b.bet)} disabled={battleLoading} className="btn btn-secondary btn-sm">Cancel</button>
                  ) : (
                    <button onClick={() => acceptBattle(b.id)} disabled={battleLoading || cooldown > 0} className="btn-enterhotel" style={{ fontSize: 12, opacity: (battleLoading || cooldown > 0) ? 0.5 : 1 }}>
                      {battleLoading ? '…' : 'Accept'}
                    </button>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }`}</style>
    </div>
  );
}
