'use client';
import { useState, useEffect, useRef } from 'react';

const GAME_COLORS = { roulette: '#EF5856', coinflip: '#f5c842', 'coinflip-battle': '#e74c8b', blackjack: '#34bd59', dice: '#6c8ebf', highcard: '#9b59b6' };
const GAME_LABELS = { roulette: 'Roulette', coinflip: 'Coin Toss', 'coinflip-battle': 'Battle', blackjack: 'Blackjack', dice: 'Dice Duel', highcard: 'High Card' };

export default function LiveFeedClient() {
  const [tab, setTab] = useState('feed');
  const [feed, setFeed] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [period, setPeriod] = useState('all');
  const [filter, setFilter] = useState('all');
  const isMounted = useRef(true);

  const loadFeed = async () => {
    try {
      const res = await fetch('/api/livefeed?type=feed');
      const data = await res.json();
      if (!isMounted.current) return;
      setFeed(data.feed || []);
    } catch {}
  };

  const loadLeaders = async () => {
    try {
      const res = await fetch(`/api/livefeed?type=leaderboard&period=${period}`);
      const data = await res.json();
      setLeaders(data.leaders || []);
    } catch {}
  };

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    loadFeed();
    const t = setInterval(loadFeed, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (tab === 'leaderboard') loadLeaders(); }, [tab, period]);

  const timeAgo = (s) => {
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago'; return Math.floor(s/86400) + 'd ago';
  };

  const filtered = filter === 'all' ? feed : feed.filter(f => f.game === filter);

  return (
    <div>
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5' }} src="/images/gambling/feed_icon.png"></img>Live Feed</div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {['feed', 'leaderboard'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 12, background: tab === t ? 'var(--green)' : 'var(--panel-bg)', border: 'none', color: tab === t ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', borderRadius: t === 'feed' ? 'var(--radius) 0 0 var(--radius)' : '0 var(--radius) var(--radius) 0' }}>
            {t === 'feed' ? 'Live Activity' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'feed' ? (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {['all', 'roulette', 'coinflip', 'coinflip-battle', 'blackjack', 'dice', 'highcard'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? "btn-primary" : "btn-secondary"}>
                {f === 'all' ? 'All' : GAME_LABELS[f]}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', lineHeight: '28px' }}>Updates every 3s</div>
          </div>

          <div className="panel no-hover" style={{ padding: 0 }}>
            {filtered.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No activity yet.</div>
              : filtered.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', animation: 'fadeUp 0.3s ease' }}>
                  <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${item.look}&headonly=1&size=s`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--panel-inner)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 700 }}>{item.username}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{item.detail}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span style={{ color: GAME_COLORS[item.game], fontWeight: 700 }}>{GAME_LABELS[item.game] || item.game}</span>
                      <span style={{ marginLeft: 8 }}>Bet: {item.bet?.toLocaleString()}</span>
                      <span style={{ marginLeft: 8 }}>{timeAgo(item.seconds_ago)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: item.profit > 0 ? '#34bd59' : item.profit === 0 ? 'var(--text-muted)' : '#EF5856', whiteSpace: 'nowrap' }}>
                    {item.profit > 0 ? '+' : ''}{item.profit?.toLocaleString()}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['all','All Time'],['month','This Month'],['week','This Week'],['today','Today']].map(([p, l]) => (
              <button key={p} onClick={() => setPeriod(p)} className={period === p ? "btn-primary" : "btn-secondary"}>{l}</button>
            ))}
          </div>

          <div className="panel no-hover" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 100px', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <div>#</div><div>Player</div><div>Wins</div><div>Bets</div><div>Net Profit</div>
            </div>
            {leaders.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No data yet.</div> :
              leaders.map((l, i) => (
                <div key={l.user_id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 100px', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: i === 0 ? '#f5c842' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}>{i+1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${l.look}&headonly=1&size=s`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--panel-inner)' }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{l.username}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{l.wins}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.total_bets}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: l.total_profit > 0 ? '#34bd59' : l.total_profit === 0 ? 'var(--text-muted)' : '#EF5856' }}>
                    {l.total_profit > 0 ? '+' : ''}{parseInt(l.total_profit).toLocaleString()}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
