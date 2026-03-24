'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Symbol definitions ────────────────────────────────────────────────────────
const SYM = {
  coin:    { img:'/images/gambling/coin.png',    label:'Coin',    color:'#f5c842', bg:'rgba(245,200,66,.18)'  },
  duck:    { img:'/images/gambling/duck.png',    label:'Duck',    color:'#fbbf24', bg:'rgba(251,191,36,.18)'  },
  sofa:    { img:'/images/gambling/sofa.png',    label:'HC Sofa', color:'#38bdf8', bg:'rgba(56,189,248,.18)'  },
  throne:  { img:'/images/gambling/throne.png',  label:'Throne',  color:'#c084fc', bg:'rgba(192,132,252,.18)' },
  diamond: { img:'/images/gambling/diamond.png', label:'Diamond', color:'#34d399', bg:'rgba(52,211,153,.18)'  },
  crown:   { img:'/images/gambling/crown.png',   label:'Crown',   color:'#f97316', bg:'rgba(249,115,22,.18)'  },
  bonus:   { img:'/images/gambling/bonus.png',   label:'BONUS',   color:'#ff84c6', bg:'rgba(255,106,210,.22)' },
  scatter: { img:'/images/gambling/scatter.png', label:'SCATTER', color:'#be87e5', bg:'rgba(167,139,250,.22)' },
  wild:    { img:'/images/gambling/wild.png',    label:'WILD',    color:'#3fdf22', bg:'rgba(34,197,94,.22)'   },
};

const PAYTABLE = [
  { id:'crown',   pays:{3:'6×', 4:'16×', 5:'40×'} },
  { id:'diamond', pays:{3:'3×', 4:'9×',  5:'22×'} },
  { id:'throne',  pays:{3:'2×', 4:'5×',  5:'11×'} },
  { id:'sofa',    pays:{3:'1×', 4:'2×',  5:'5×' } },
  { id:'duck',    pays:{3:'1×', 4:'2×',  5:'4×' } },
  { id:'coin',    pays:{              5:'1×'} },  // only 5x pays
];

const PL_COLORS = ['#f5c842','#38bdf8','#f97316','#c084fc','#34d399','#fb923c','#a78bfa','#fbbf24','#4ade80','#f472b6'];

const NORM = ['coin','duck','sofa','throne','diamond','crown'];
const CELL = 74;

// Random filler symbol for spinning reels
function randSym() { return NORM[Math.floor(Math.random() * NORM.length)]; }
function randReel() { return [randSym(), randSym(), randSym()]; }

// ── Single symbol cell ────────────────────────────────────────────────────────
function SymCell({ id, highlight, bounce }) {
  const s = SYM[id] || SYM.coin;
  const special = id === 'wild' || id === 'scatter' || id === 'bonus';
  return (
    <div style={{
      width: CELL, height: CELL, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10, position: 'relative',
      background: highlight ? s.bg : 'rgba(255,255,255,.03)',
      border: `2px solid ${highlight ? s.color : 'rgba(255,255,255,.07)'}`,
      boxShadow: highlight ? `0 0 14px ${s.color}77` : 'none',
      transition: 'border-color .1s, background .1s, box-shadow .1s',
      animation: bounce ? 'symBounce .4s ease-out' : 'none',
    }}>
      <img src={s.img} alt={s.label}
        style={{ width: 96, height: 96, objectFit:'contain', imageRendering:'pixelated' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}

// ── Reel ─────────────────────────────────────────────────────────────────────
// Spinning: a long strip of random symbols scrolls continuously via CSS animation
// — zero JS re-renders, pure GPU. When stopped: strip is replaced with final
//   symbols and a smooth ease-in landing animation plays.

const SCROLL_SYMS = 12; // symbols in the looping strip while spinning

function buildScrollStrip() {
  return Array.from({ length: SCROLL_SYMS }, randSym);
}

function Reel({ finalSyms, stopped, winRows, expanded, bounce, reelIdx }) {
  const CELL_H = CELL + 5;
  const STRIP_H = CELL_H * SCROLL_SYMS; // total height of spinning strip

  // Generate a stable scroll strip once; regenerate each time spinning starts
  const [scrollStrip, setScrollStrip] = useState(buildScrollStrip);
  const wasSpinning = useRef(!stopped);

  useEffect(() => {
    if (!stopped && !wasSpinning.current) {
      // Just started spinning — fresh random strip
      setScrollStrip(buildScrollStrip());
    }
    wasSpinning.current = !stopped;
  }, [stopped]);

  return (
    <div style={{
      width: CELL + 10,
      height: CELL_H * 3 + 10,
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,.07)',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,.7)',
      outline: expanded ? '2px solid #22c55e' : 'none',
      outlineOffset: 2,
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(rgb(8 209 175 / 25%), rgb(8 157 149 / 25%) 40%, rgb(8 157 149 / 25%) 60%, rgb(8 91 134 / 25%))',
    }}>
      {/* Top/bottom fade masks */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:32,
        background:'linear-gradient(180deg,#085b86 0%,transparent 100%)',zIndex:3,pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:32,
        background:'linear-gradient(0deg,#085b86 0%,transparent 100%)',zIndex:3,pointerEvents:'none' }} />

      {stopped ? (
        /* ── STOPPED: show exact server result with landing animation ── */
        <div style={{
          display:'flex', flexDirection:'column', gap:5, padding:5,
          animation: `reelLand ${0.28 + reelIdx * 0.06}s cubic-bezier(0.22,1,0.36,1)`,
        }}>
          {finalSyms.map((sym, row) => (
            <SymCell
              key={row}
              id={sym}
              highlight={winRows && winRows.includes(row)}
              bounce={bounce && winRows && winRows.includes(row)}
            />
          ))}
        </div>
      ) : (
        /* ── SPINNING: CSS-only infinite scroll, no JS re-renders ── */
        <div style={{
          display:'flex', flexDirection:'column', gap:5, padding:5,
          animation: `reelScroll ${0.55 - reelIdx * 0.04}s linear infinite`,
          willChange: 'transform',
        }}>
          {/* Duplicate strip for seamless loop */}
          {[...scrollStrip, ...scrollStrip].map((sym, i) => (
            <SymCell key={i} id={sym} highlight={false} bounce={false} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Jackpot livefeed ──────────────────────────────────────────────────────────
function JackpotFeed() {
  const [jackpots, setJackpots] = useState([]);
  const habboImg = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/gambling/slots');
      const d = await r.json();
      if (d.jackpots?.length > 0) setJackpots(d.jackpots);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (jackpots.length === 0) return null;

  return (
    <div style={{
      marginBottom: 14, marginTop: 46, padding: '10px 14px',
    }}>
      <div style={{ display: 'flex', gap: 18 }}>
        {jackpots.map((j, i) => (
          <div key={i} style={{
            flex: '1 1 0', minWidth: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'url(/images/gambling/jackpotslotbackdrop.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            borderRadius: 8, padding: '7px 10px', fontSize: 11, height: 46,
            boxShadow: 'rgb(255, 226, 156) 2px 2px 0px 0px, rgb(219, 154, 89) 4px 4px 0px 2px, rgb(150, 93, 35) 6px 6px 0px 2px, rgb(0 0 0) 6px 6px 0px 5px, rgb(0 0 0) 0px 0px 0px 3px',
          }}>
            <div style={{
              width: 30, height: 40, padding: '4px 0px', overflow: 'hidden', flexShrink: 0,
              borderRadius: 5, background: 'rgb(219, 154, 89)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}>
              {j.look ? (
                <img
                  src={`${habboImg}?figure=${j.look}&direction=2&head_direction=2&size=s`}
                  alt={j.username}
                  style={{ height: 38, imageRendering: 'pixelated' }}
                />
              ) : (
                <span style={{ fontSize: 18 }}>👤</span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#965d23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.username}</div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginTop:2, flexWrap:'nowrap', justifyContent:'flex-start', alignContent:'flex-end', flexDirection:'row' }}>
                <div style={{ background:'rgb(57, 215, 100)', fontSize:10, color:'rgb(255, 255, 255)', fontWeight:700, padding:'1px 5px', borderRadius:4, display:'flex', justifyContent:'space-between', alignContent:'stretch', flexDirection:'row-reverse', alignItems:'baseline', flexWrap:'nowrap' }}>
                  {j.detail && j.detail.startsWith('POT') ? 'POT ' : ''}+{Number(j.profit).toLocaleString()}
                </div>
                {Number(j.bet) > 0 && (
                  <div style={{ background:'#965d23', color:'rgb(255, 255, 255)', fontSize:9, fontWeight:900, padding:'1px 6px', borderRadius:5, display:'flex', whiteSpace:'nowrap', justifyContent:'flex-end', flexWrap:'nowrap', flexDirection:'row', alignItems:'stretch' }}>
                    {Math.floor(Number(j.profit) / Number(j.bet))}×
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg, color, big, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, big ? 5000 : 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: big ? '#2a2c3a' : '#1e1f29',
      border: `1px solid ${color}55`,
      borderRadius: 14,
      padding: big ? '18px 32px' : '10px 20px',
      fontSize: big ? 22 : 15,
      fontWeight: 800,
      color,
      whiteSpace: 'nowrap',
      zIndex: 200,
      boxShadow: `0 0 40px ${color}44, 0 8px 32px rgba(0,0,0,0.7)`,
      animation: 'bubbleCenter .3s cubic-bezier(0.34,1.56,0.64,1)',
      textAlign: 'center',
      pointerEvents: 'none',
    }}>
      {msg}
    </div>
  );
}

// Persistent room-event bubble — survives respins, sits just below center
function RoomEventBubble({ msg, icon, color, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(50% + 80px)', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#1e1f29',
      border: `1px solid ${color}55`,
      borderRadius: 14,
      padding: '12px 24px',
      fontSize: 14,
      fontWeight: 800,
      color,
      whiteSpace: 'nowrap',
      zIndex: 200,
      animation: 'bubbleCenter .3s cubic-bezier(0.34,1.56,0.64,1)',
      textAlign: 'center',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {icon && <img src={icon} alt="" style={{ width:36, height:36, imageRendering:'pixelated', flexShrink:0 }} onError={e => e.target.style.display='none'} />}
      <span> {msg}</span>
    </div>
  );
}

// ── Bonus room ────────────────────────────────────────────────────────────────
const ROOM_ITEMS = [
  { icon:'/images/gambling/bonus_dragon.png',label:'Fire Dragon'   }, { icon:'/images/gambling/bonus_egg.png',label:'Purple Dino'  },
  { icon:'/images/gambling/bonus_throne.png',label:'Throne'   }, { icon:'/images/gambling/bonus_dj.png',label:'DJ Turntable' },
  { icon:'/images/gambling/bonus_write.png',label:'Typewriter'    },
];

function BonusRoom({ prizes, onClaim }) {
  const [picked, setPicked] = useState(null);
  const pick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    setTimeout(() => onClaim(prizes[i].win), 1800);
  };
  return (
    <div style={{ position:'fixed',inset:0,zIndex:900,background:'rgba(0,0,0,.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ backgroundImage: 'url(/images/gambling/bonusbackdrop.png)',border:'2px solid #ff6ad2',borderRadius:20,padding:32,maxWidth:500,width:'100%',textAlign:'center',boxShadow:'0 0 60px #ff6ad244' }}>
        <div style={{ fontSize:13,fontWeight:900,letterSpacing:3,color:'#ff6ad2',marginBottom:6,textTransform:'uppercase' }}>Bonus Room!</div>
        <div style={{ fontSize:18,fontWeight:800,color:'#fff',marginBottom:4 }}>You found a hidden casino room!</div>
        <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:24 }}>Click an item to reveal your prize</div>
        <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
          {prizes.map((p, i) => {
            const item = ROOM_ITEMS[i];
            const rev = picked === i;
            return (
              <div key={i} onClick={() => pick(i)} style={{
                width:86,height:86,borderRadius:14,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,
                cursor: picked===null?'pointer':'default',
                background: rev ? (p.type==='jackpot'?'linear-gradient(135deg,#f5c842,#f97316)' : p.type==='miss'?'rgba(239, 89, 86, 0.5)':'rgba(34, 197, 94, 0.5)') : 'rgba(0, 0, 0, 0.7)',
                border: `2px solid ${rev ? (p.type==='miss'?'#EF5856':p.type==='jackpot'?'#f5c842':'#22c55e') : 'rgba(255, 255, 255, 0.4)'}`,
                transition:'all .2s', transform: rev?'scale(1.06)':'scale(1)',
              }}>
                {rev ? (
                  <><div style={{fontSize:22}}>{p.type==='jackpot'?'':p.type==='miss'?'':''}</div>
                  <div style={{fontSize:9,fontWeight:900,color:'#fff',textAlign:'center',lineHeight:1.3}}>{p.label}</div></>
                ) : (
                  <><img src={item.icon} alt={item.label} style={{maxWidth:70,maxHeight:70,imageRendering:'pixelated'}} onError={e=>{e.target.style.display='none'}} />
                  <div style={{fontSize:9,color:'#fff'}}>{item.label}</div></>
                )}
              </div>
            );
          })}
        </div>
        {picked===null && <button onClick={()=>onClaim(0)} style={{marginTop:20,fontSize:11,color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Skip</button>}
      </div>
    </div>
  );
}

// ── Coin rain ─────────────────────────────────────────────────────────────────
// Pre-generate stable random values so they don't re-roll on every render
const COIN_PARTICLES = Array.from({length:20}, (_, i) => ({
  left:  Math.random() * 100,
  size:  12 + Math.random() * 16,
  dur:   (1.1 + Math.random() * 0.7).toFixed(2),
  delay: (Math.random() * 0.5).toFixed(2),
}));

function Coins({ show }) {
  if (!show) return null;
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:999,overflow:'hidden'}}>
      {COIN_PARTICLES.map((p, i) => (
        <div key={i} style={{
          position:'absolute', top:'-5%', left:`${p.left}%`,
          animation:`coinFall ${p.dur}s ease-in ${p.delay}s forwards`,
        }}>
          <img src="/images/diamond.png" alt="" style={{width:p.size, height:p.size, imageRendering:'pixelated'}} />
        </div>
      ))}
    </div>
  );
}

// ── Payline SVG overlay ──────────────────────────────────────────────────────
// Reel layout: 5 reels × 84px wide, 7px gap between reels, 242px tall
// Cell centres: X = reelIdx * 91 + 42,  Y = rowIdx * 79 + 42
const ALL_PAYLINES = [
  [[0,1],[1,1],[2,1],[3,1],[4,1]],
  [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,2],[1,2],[2,2],[3,2],[4,2]],
  [[0,0],[1,1],[2,2],[3,1],[4,0]],
  [[0,2],[1,1],[2,0],[3,1],[4,2]],
  [[0,0],[1,1],[2,1],[3,1],[4,0]],
  [[0,2],[1,1],[2,1],[3,1],[4,2]],
  [[0,1],[1,0],[2,1],[3,2],[4,1]],
  [[0,1],[1,2],[2,1],[3,0],[4,1]],
  [[0,0],[1,2],[2,1],[3,0],[4,2]],
];
const PL_LINE_COLORS = ['#f5c842','#38bdf8','#f97316','#c084fc','#34d399','#fb923c','#a78bfa','#fbbf24','#4ade80','#f472b6'];

function cx(reel) { return reel * 91 + 42; }
function cy(row)  { return row  * 79 + 42; }

function PaylineLines({ paylines }) {
  return (
    <>
      {paylines.map((plIdx) => {
        const coords = ALL_PAYLINES[plIdx];
        if (!coords) return null;
        const color = PL_LINE_COLORS[plIdx] || '#fff';
        const points = coords.map(([r, row]) => `${cx(r)},${cy(row)}`).join(' ');
        return (
          <g key={plIdx}>
            {/* Glow layer */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeOpacity="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Solid line */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeOpacity="0.95"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'lineDraw .35s ease-out' }}
            />
            {/* Dot at each cell */}
            {coords.map(([r, row], di) => (
              <circle
                key={di}
                cx={cx(r)} cy={cy(row)} r="5"
                fill={color} fillOpacity="0.9"
                stroke="#000" strokeWidth="1.5"
              />
            ))}
          </g>
        );
      })}
    </>
  );
}

// ── Free Spin Summary Modal ──────────────────────────────────────────────────
function FreeSpinSummary({ total, onClose }) {
  const big = total > 0;
  return (
    <div style={{ position:'fixed',inset:0,zIndex:950,background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{
        background:'#1e1f29',
        border:'2px solid #a78bfa', borderRadius:20, padding:40,
        maxWidth:400, width:'100%', textAlign:'center',
        boxShadow:'0 0 80px #a78bfa55',
        animation:'bigWinPop .4s ease-out',
      }}>
        <div style={{ fontSize:14, fontWeight:900, color:'#a78bfa', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>Free Spins Complete!</div>
        {big ? (
          <>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Total winnings collected:</div>
            <div style={{ fontSize:36, fontWeight:900, color:'#ffffff', marginBottom:20 }}>
              {total.toLocaleString()} <img width="15" height="15" src="/images/diamond.png" style={{imageRendering:"pixelated",verticalAlign:"middle"}} alt="" />
            </div>
          </>
        ) : (
          <div style={{ fontSize:14, color:'var(--text-muted)', marginBottom:20, marginTop:8 }}>No wins this time - better luck next spin!</div>
        )}
        <button onClick={onClose} className="btn-enterhotel" style={{ padding:'10px 32px', fontSize:14 }}>Continue</button>
      </div>
    </div>
  );
}

// ── Collapsible sidebar panel ─────────────────────────────────────────────────
function SideDropdown({ title, titleColor, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 900, color: titleColor, letterSpacing: 2, textTransform: 'uppercase' }}>
          {title}
        </span>
        <span style={{
          fontSize: 10, color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .2s',
          display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px 14px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main game ─────────────────────────────────────────────────────────────────
export default function SlotsGame({ points }) {
  // stoppedReels[i] = true once reel i has stopped
  const [stoppedReels, setStoppedReels] = useState([true,true,true,true,true]);
  const [finalReels,   setFinalReels]   = useState(() => Array.from({length:5}, randReel));
  const [spinning,     setSpinning]     = useState(false);
  const [balance,      setBalance]      = useState(points);
  const [bet,          setBet]          = useState(100);
  const [turbo,        setTurbo]        = useState(false);
  const [autoMode,     setAutoMode]     = useState(false);
  const [autoLeft,     setAutoLeft]     = useState(0);
  const [winPaylines,  setWinPaylines]  = useState([]);
  const [result,       setResult]       = useState(null);
  const [history,      setHistory]      = useState([]);
  const [cooldown,     setCooldown]     = useState(0);
  const [bounce,       setBounce]       = useState(false);
  const [showCoins,    setShowCoins]    = useState(false);
  const [bubble,       setBubble]       = useState(null);
  const [bubbleKey,    setBubbleKey]    = useState(0);
  const [roomBubble,   setRoomBubble]   = useState(null);  // survives respins
  const [shake,        setShake]        = useState(false);
  // Free spins — use refs so doSpin always reads current values without stale closures
  const [freeSpinDisplay, setFreeSpinDisplay] = useState(0);   // UI counter
  const [freeModeDisplay, setFreeModeDisplay] = useState(false); // UI flag
  const [freeSpinPot,  setFreeSpinPot]  = useState(0);   // accumulated winnings display
  const freeSpinRef   = useRef(0);   // source of truth for remaining spins
  const freeModeRef   = useRef(false);
  const freeSpinPotRef = useRef(0);  // accumulated winnings (not debounced by renders)
  const expandedWildRef = useRef(null);
  const [expandedWildDisplay, setExpandedWildDisplay] = useState(null);
  const [freeSpinSummary, setFreeSpinSummary] = useState(null); // { total, spins }
  const [bonus,        setBonus]        = useState(null);
  const [spinCount,    setSpinCount]    = useState(0);
  const spinCountRef = useRef(0);
  const origBetRef   = useRef(0);  // bet that triggered the free spin session
  const [eventMulti,   setEventMulti]   = useState(1);
  const eventMultiRef = useRef(1);
  const [nearMiss,     setNearMiss]     = useState(false);

  const lastBetRef  = useRef(0);   // bet used on the spin that just completed
  const coolRef     = useRef(null);
  const autoRef     = useRef(false);
  const autoLeftRef = useRef(0);  // source of truth — never read from state inside doSpin
  
  // Convenience helpers that sync ref+state together
  const setFreeSpinCount = (n) => { freeSpinRef.current = n; setFreeSpinDisplay(n); };
  const setFreeMode = (v) => { freeModeRef.current = v; setFreeModeDisplay(v); };
  const setExpandedWild = (v) => { expandedWildRef.current = v; setExpandedWildDisplay(v); };

  // Aliases for render
  const freeMode = freeModeDisplay;
  const freeSpin = freeSpinDisplay;
  const expandedWild = expandedWildDisplay;

  // Build win-cell map from winning paylines
  const winCells = (() => {
    const PAYLINES = [
      [[0,1],[1,1],[2,1],[3,1],[4,1]],[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,2],[1,2],[2,2],[3,2],[4,2]],
      [[0,0],[1,1],[2,2],[3,1],[4,0]],[[0,2],[1,1],[2,0],[3,1],[4,2]],[[0,0],[1,1],[2,1],[3,1],[4,0]],
      [[0,2],[1,1],[2,1],[3,1],[4,2]],[[0,1],[1,0],[2,1],[3,2],[4,1]],[[0,1],[1,2],[2,1],[3,0],[4,1]],
      [[0,0],[1,2],[2,1],[3,0],[4,2]],
    ];
    const map = {};
    for (const pl of winPaylines) {
      const coords = PAYLINES[pl];
      if (!coords) continue;
      for (const [r, row] of coords) {
        if (!map[r]) map[r] = [];
        if (!map[r].includes(row)) map[r].push(row);
      }
    }
    return map;
  })();

  const startCooldown = (s) => {
    setCooldown(s);
    if (coolRef.current) clearInterval(coolRef.current);
    coolRef.current = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(coolRef.current); return 0; } return c - 1; }), 1000);
  };

  const stopAuto = useCallback(() => {
    autoRef.current = false;
    setAutoMode(false);
    setAutoLeft(0);
  }, []);

  const doSpin = useCallback(async (isFreeMode = false) => {
    // Read free spin state from refs — always current, no stale closure issues
    const fm = isFreeMode || freeModeRef.current;
    const inAuto = autoRef.current;
    if (spinning || (!fm && !inAuto && cooldown > 0) || bet < 1 || (!fm && balance < bet)) return;

    setSpinning(true);
    setResult(null);
    setWinPaylines([]);
    setBounce(false);
    setNearMiss(false);
    setBubble(null);
    spinCountRef.current += 1;
    setSpinCount(spinCountRef.current);

    lastBetRef.current = bet;
    setStoppedReels([false, false, false, false, false]);
    const spinDelay = turbo ? 150 : 350;

    try {
      const res = await fetch('/api/gambling/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, freeSpinMode: fm, expandedWildReel: expandedWildRef.current }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setSpinning(false); setStoppedReels([true,true,true,true,true]);
        startCooldown(data.retryAfter || 5); stopAuto(); return;
      }
      if (!data.ok) {
        setSpinning(false); setStoppedReels([true,true,true,true,true]);
        setResult({ error: data.error }); stopAuto(); return;
      }

      setFinalReels(data.reels);

      // Stop reels one by one left→right
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, spinDelay));
        setStoppedReels(prev => { const next=[...prev]; next[i]=true; return next; });
      }
      await new Promise(r => setTimeout(r, 150));

      setResult(data);
      setWinPaylines(data.winPaylines || []);
      setBounce(true);
      setSpinning(false);

      if (data.scatterCount === 2) setNearMiss(true);

      const effectiveWin = Math.floor((data.win || 0) * eventMultiRef.current);
      const appliedMulti = eventMultiRef.current;
      eventMultiRef.current = 1;
      setEventMulti(1);

      // If a room event multiplier was active, credit the extra diamonds server-side
      if (appliedMulti > 1 && (data.win || 0) > 0) {
        const bonus = Math.floor((data.win || 0) * (appliedMulti - 1));
        fetch('/api/gambling/slots', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: bonus, origBet: 0, isPot: false }),
        }).then(r => r.json()).then(d => { if (d.ok) setBalance(d.balance); }).catch(() => {});
      } else {
        setBalance(data.balance);
      }

      // ── Handle free spin mode ─────────────────────────────────────────────
      if (fm) {
        // Accumulate into the pot (use ref so it's never stale)
        freeSpinPotRef.current += effectiveWin;
        setFreeSpinPot(freeSpinPotRef.current);

        // Show small spin win if any
        if (effectiveWin > 0) {
          setBubble({ msg: `+${effectiveWin.toLocaleString()} `, big: false, color: '#a78bfa' });
          setBubbleKey(k => k + 1);
          setHistory(h => [{ win: effectiveWin, profit: effectiveWin, type: data.type || 'Free Spin', bet: 0 }, ...h].slice(0, 10));
        }

        // Consume one free spin
        const newLeft = freeSpinRef.current - 1;
        setFreeSpinCount(newLeft);

        if (newLeft <= 0) {
          // Free spins over — show summary
          setFreeMode(false);
          setExpandedWild(null);
          const totalPot = freeSpinPotRef.current;
          freeSpinPotRef.current = 0;
          setFreeSpinPot(0);
          setFreeSpinSummary({ total: totalPot });
          stopAuto();
          return;
        }
        // More free spins left — auto-continue (handled by useEffect)
        return;
      }

      // ── Normal spin ───────────────────────────────────────────────────────
      const profit = effectiveWin - bet;
      if (effectiveWin > 0) {
        setHistory(h => [{ win: effectiveWin, profit, type: data.type, bet, multi: appliedMulti }, ...h].slice(0, 10));
        const isBig = data.multiplier >= 8;  // lower threshold — more drama
        if (isBig) {
          setShake(true); setTimeout(() => setShake(false), 600);
          setShowCoins(true); setTimeout(() => setShowCoins(false), 2200);
          setBubble({ msg: `BIG WIN! +${effectiveWin.toLocaleString()} Diamonds!`, big: true, color: '#f5c842' });
          setBubbleKey(k => k + 1);
        } else {
          setBubble({ msg: `+${effectiveWin.toLocaleString()} Diamonds!`, big: false, color: '#34bd59' });
          setBubbleKey(k => k + 1);
        }
      } else {
        setHistory(h => [{ win: 0, profit: -bet, type: 'No win', bet, multi: 1 }, ...h].slice(0, 10));
      }

      // Free spins trigger (scatter) — start cleanly
      if (data.freeSpinsAwarded > 0) {
        const wildReel = Math.floor(Math.random() * 5);
        expandedWildRef.current = wildReel;
        setExpandedWildDisplay(wildReel);
        freeSpinRef.current = data.freeSpinsAwarded;
        setFreeSpinDisplay(data.freeSpinsAwarded);
        freeModeRef.current = true;
        setFreeModeDisplay(true);
        freeSpinPotRef.current = 0;
        setFreeSpinPot(0);
        origBetRef.current = bet;  // remember bet for jackpot threshold check
        // Don't call startCooldown — free spins start immediately
        setBubble({ msg: ` ${data.freeSpinsAwarded} FREE SPINS! Reel ${wildReel+1} is WILD!`, big: true, color: '#a78bfa' });
        setBubbleKey(k => k + 1);
        stopAuto();
        return; // useEffect will trigger first free spin
      }

      // Bonus room
      if (data.bonus && data.bonusPrizes) { setBonus({ prizes: data.bonusPrizes }); stopAuto(); return; }

      // Random room event
      if (spinCountRef.current > 0 && spinCountRef.current % (10 + Math.floor(Math.random() * 6)) === 0) {
        const events = [
          { msg: 'Bot drops 2× multiplier!',       type: 'multi', icon: '/images/gambling/botvisits_big.png'       },
          { msg: 'Diamonds rain from the ceiling!', type: 'coins', icon: '/images/gambling/diamondrain_big.png'     },
          { msg: 'Rare item - random WILD!',        type: 'wilds', icon: '/images/gambling/rareitemdrop_big.png'    },
          { msg: 'HC Member spotted - lucky spin!', type: 'multi', icon: '/images/gambling/hcmemberspotted_big.png' },
        ];
        const ev = events[Math.floor(Math.random() * events.length)];
        if (ev.type === 'multi') { setEventMulti(2); eventMultiRef.current = 2; }
        if (ev.type === 'wilds') {
          const wildReel = Math.floor(Math.random() * 5);
          expandedWildRef.current = wildReel;
          setExpandedWildDisplay(wildReel);
          setTimeout(() => { expandedWildRef.current = null; setExpandedWildDisplay(null); }, 2000);
        }
        if (ev.type === 'coins') {
          setShowCoins(true); setTimeout(() => setShowCoins(false), 2200);
          const rainPayout = lastBetRef.current * 3;
          fetch('/api/gambling/slots', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: rainPayout, origBet: 0, isPot: false }),
          }).then(r => r.json()).then(d => {
            if (d.ok) {
              setBalance(d.balance);
              setBubble({ msg: `Diamond Rain! +${rainPayout.toLocaleString()} Diamonds!`, big: false, color: '#38bdf8' });
              setBubbleKey(k => k + 1);
            }
          }).catch(() => {});
        }
        setRoomBubble({ msg: ev.msg, icon: ev.icon, color: '#ffffff' });
        // Don't stop auto for room events — just apply effect and continue
      }

      if (autoRef.current && autoLeftRef.current > 1) {
        // Auto mode: decrement ref immediately, skip cooldown, chain next spin
        autoLeftRef.current -= 1;
        setAutoLeft(autoLeftRef.current);
        setTimeout(() => doSpin(false), turbo ? 400 : 900);
      } else if (autoRef.current) {
        // Last auto spin done
        autoLeftRef.current = 0;
        setAutoLeft(0);
        stopAuto();
        startCooldown(1);
      } else {
        // Normal single spin — apply cooldown
        startCooldown(1);
      }

    } catch {
      setSpinning(false);
      setStoppedReels([true, true, true, true, true]);
      setResult({ error: 'Connection error' });
      stopAuto();
    }
  }, [spinning, cooldown, bet, balance, turbo, spinCount, stopAuto]); // eventMulti read via ref

  // Free spin auto-trigger — fires when a free spin ends and more remain
  useEffect(() => {
    if (freeModeRef.current && freeSpinRef.current > 0 && !spinning && !bonus) {
      const t = setTimeout(() => doSpin(true), turbo ? 350 : 800);
      return () => clearTimeout(t);
    }
  }, [freeSpinDisplay, spinning, bonus, turbo]);

  const startAuto = (count) => {
    autoRef.current = true;
    autoLeftRef.current = count;  // set ref FIRST before doSpin reads it
    setAutoMode(true);
    setAutoLeft(count);
    doSpin(false);
  };

  const claimBonus = async (amount) => {
    setBonus(null);
    if (amount > 0) {
      try {
        const r = await fetch('/api/gambling/slots', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, origBet: origBetRef.current, isPot: true }) });
        const d = await r.json();
        if (d.ok) {
          setBalance(d.balance);
          setBubble({ msg: `Bonus: +${amount.toLocaleString()} Diamonds`, big: true, color: '#ff6ad2' });
          setShowCoins(true); setTimeout(() => setShowCoins(false), 2000);
        }
      } catch {}
    }
  };

  const isWin = result && (result.win || 0) > 0;

  return (
    <div>
      <style>{`
        @keyframes reelScroll  { 0%{transform:translateY(0)} 100%{transform:translateY(-50%)} }
        @keyframes reelLand    { 0%{transform:translateY(-18px);opacity:.6} 60%{transform:translateY(4px)} 100%{transform:translateY(0);opacity:1} }
        @keyframes symBounce   { 0%{transform:scale(1)} 40%{transform:scale(1.13)} 70%{transform:scale(.96)} 100%{transform:scale(1)} }
        @keyframes bubblePop       { 0%{transform:translateX(-50%) scale(.5);opacity:0} 70%{transform:translateX(-50%) scale(1.06)} 100%{transform:translateX(-50%) scale(1);opacity:1} }
        @keyframes bubbleCenter    { 0%{transform:translate(-50%,-50%) scale(.4);opacity:0} 70%{transform:translate(-50%,-50%) scale(1.07)} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes coinFall    { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes screenShake { 0%,100%{transform:translate(0)} 20%{transform:translate(-5px,2px)} 50%{transform:translate(5px,-2px)} 80%{transform:translate(-3px,3px)} }
        @keyframes shimmer     { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes nearFlash   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes glowPulse   { 0%,100%{box-shadow:0 0 6px #a78bfa44} 50%{box-shadow:0 0 18px #a78bfaaa} }
        @keyframes lineDraw    { 0%{stroke-dasharray:1000;stroke-dashoffset:1000} 100%{stroke-dashoffset:0} }
        @keyframes bigWinPop   { 0%{transform:scale(.4);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <Coins show={showCoins} />
      {bonus && <BonusRoom prizes={bonus.prizes} onClaim={claimBonus} />}
      {freeSpinSummary && (
        <FreeSpinSummary
          total={freeSpinSummary.total}
          onClose={() => { setFreeSpinSummary(null); startCooldown(1); }}
        />
      )}

      {/* Balance */}
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5px' }} src="/images/gambling/slots_icon.png"></img>Slots Machine</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />{balance.toLocaleString()}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:16 }}>
        {/* ── Machine ── */}
        <div>
          <div className="panel no-hover" style={{
            padding:24, marginBottom:12, textAlign:'center',
            backgroundImage: 'url(/images/gambling/habboslotsbackdrop.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            position:'relative', height: 624, overflow: 'visible',
            animation: shake ? 'screenShake .5s ease-out' : 'none',
          }}>
            {/* Win bubble */}
            {bubble && <Bubble key={bubbleKey} msg={bubble.msg} color={bubble.color} big={bubble.big} onDone={() => setBubble(null)} />}
            {/* Room event bubble — inside the panel so it's centred within the backdrop */}
            {roomBubble && <RoomEventBubble key={JSON.stringify(roomBubble)} msg={roomBubble.msg} icon={roomBubble.icon} color={roomBubble.color} onDone={() => setRoomBubble(null)} />}

            {/* Jackpot livefeed */}
            <JackpotFeed />

            {/* Payline indicator dots */}
            <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center', marginBottom:20, marginTop: -11, fontWeight: 700, }}>
              {PL_COLORS.map((c, i) => (
                <div key={i} style={{
                  width:7, height:7, borderRadius:'50%',
                  background: winPaylines.includes(i) ? c : 'rgba(0, 0, 0, 0.35)',
                  boxShadow: winPaylines.includes(i) ? `0 0 6px ${c}` : 'none',
                  transition:'all .2s',
                }} />
              ))}
              <span style={{ fontSize:8, color:'#000', marginLeft:4, letterSpacing:1 }}>10 LINES</span>
            </div>

            {/* 5×3 Reels + payline overlay */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
              <div style={{ position:'relative', display:'inline-flex', gap:7 }}>
                {finalReels.map((reelSyms, i) => (
                  <Reel
                    key={i}
                    finalSyms={reelSyms}
                    stopped={stoppedReels[i]}
                    winRows={winCells[i] || []}
                    expanded={expandedWild === i}
                    bounce={bounce}
                    reelIdx={i}
                  />
                ))}
                {/* SVG payline lines — drawn over the reel grid after reels stop */}
                {!spinning && winPaylines.length > 0 && (
                  <svg
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:10 }}
                    viewBox="0 0 448 242"
                    preserveAspectRatio="none"
                  >
                    <PaylineLines paylines={winPaylines} />
                  </svg>
                )}
              </div>
            </div>

            {/* Near miss */}
            {nearMiss && !spinning && (
              <div style={{ fontSize:11, color:'#a78bfa', fontWeight:700, background: '#1e1f29', padding: '8px 12px', marginBottom:8, animation:'nearFlash .5s ease-in-out 3' }}>
                So close! 2 Scatters…
              </div>
            )}

            {/* Result */}
            <div style={{ minHeight:40, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 ,  borderRadius: 4 }}>
              {spinning && <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:3, fontWeight:700, background: '#1e1f29', padding: '8px 12px', borderRadius: 5, }}>SPINNING…</div>}
              {!spinning && result && !result.error && !isWin && <div style={{ fontSize:14, color:'#EF5856', fontWeight:700 , background: '#1e1f29', padding: '8px 12px', borderRadius: 5, }}>No win - spin again!</div>}
              {!spinning && result?.error && <div style={{ fontSize:13, color:'#EF5856', fontWeight:700 , background: '#1e1f29', padding: '8px 12px', borderRadius: 5, }}>{result.error === 'NOT_ENOUGH' ? 'Not enough diamonds!' : result.error}</div>}
              {freeMode && freeSpin > 0 && !spinning && (
                <div style={{ fontSize:11, color:'#a78bfa', fontWeight:700, background:'#1e1f29', padding:'8px 12px', borderRadius:5, textAlign:'center' }}>
                  {expandedWild != null ? `Reel ${expandedWild+1} WILD · ` : ''}{freeSpin} spin{freeSpin !== 1 ? 's' : ''} left · Pot: +{freeSpinPot.toLocaleString()} Diamonds
                </div>
              )}
            </div>

            {/* Bet */}
            <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center', flexWrap:'wrap', marginBottom:14 }}>
              {[10,50,100,500,1000].map(v => (
                <button key={v} onClick={() => setBet(v)} disabled={freeMode} className="btn btn-sm btn-secondary"  style={{
                  background: bet === v ? 'rgb(62, 61, 83)' : 'rgb(26 25 36)',
                }}>{v >= 1000 ? `${v/1000}k` : v}</button>
              ))}
              <input type="number" value={bet} disabled={freeMode}
                onChange={e => setBet(Math.max(1, Math.min(10000, parseInt(e.target.value)||1)))}
                style={{ width:72, height:38, boxShadow: '0 5px #00000035',  textAlign:'center', fontSize:12 }}
              />
            </div>

            {/* Controls */}
            <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
              <button
                onClick={() => doSpin(freeMode)}
                disabled={spinning || (!freeMode && (cooldown > 0 || balance < bet))}
                className="btn-enterhotel"
                style={{ fontSize:14, padding:'11px 36px', opacity:(spinning||cooldown>0) ? .6 : 1 }}
              >
                {freeMode ? 'Free Spin' : spinning ? 'Spinning…' : cooldown > 0 ? `Wait ${cooldown}s` : `SPIN`}
              </button>
              <button onClick={() => setTurbo(t => !t)}  className="btn btn-sm btn-secondary" >{turbo ? 'TURBO ON' : 'TURBO'}</button>
              {autoMode ? (
                <button onClick={stopAuto} className="btn btn-delete btn-sm">
                  STOP ({autoLeft})
                </button>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  {[10, 25, 50].map(n => (
                    <button key={n} onClick={() => startAuto(n)} disabled={spinning||freeMode||balance<bet} className="btn btn-sm btn-secondary" >AUTO {n}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {freeMode && (
          <div className="panel no-hover" style={{ padding:14 }}>
          <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
            <div style={{ background:'rgba(167,139,250,.15)', border:'2px solid #a78bfa', borderRadius:10, padding:'6px 14px', animation:'glowPulse 1s ease-in-out infinite', textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#a78bfa', letterSpacing:1 }}>FREE SPINS</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>{freeSpin}</div>
            </div>
            <div style={{ background:'rgba(245,200,66,.12)', border:'2px solid #f5c842', borderRadius:10, padding:'6px 14px', textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#f5c842', letterSpacing:1 }}>POT</div>
              <div style={{ fontSize:18, fontWeight:900, color:'#f5c842', lineHeight:1 }}>{freeSpinPot.toLocaleString()}</div>
            </div>
          </div>
          </div>
        )}
          {/* Special symbols — collapsible */}
          <SideDropdown title="Special Symbols" titleColor="#ffffff" defaultOpen={false}>
            {[
              { id:'wild',    desc:'Substitutes any normal symbol' },
              { id:'scatter', desc:'3=6 Free Spins · 4=10 Free Spins · 5=15 Free Spins' },
              { id:'bonus',   desc:'3+ triggers Bonus Room mini-game' },
            ].map(({ id, desc }) => (
              <div key={id} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <SymCell id={id} />
                <div>
                  <div style={{ fontSize:11, fontWeight:800, color:SYM[id].color }}>{SYM[id].label}</div>
                  <div style={{ fontSize:9.5, color:'var(--text-muted)', lineHeight:1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </SideDropdown>

          {/* Paytable — collapsible */}
          <SideDropdown title="Paytable (×bet)" titleColor="#ffffff" defaultOpen={false}>
            {PAYTABLE.map(p => {
              const s = SYM[p.id];
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,.04)', fontSize:10 }}>
                  <img src={s.img} alt={p.id} style={{ width:18, height:18, objectFit:'contain', imageRendering:'pixelated', flexShrink:0 }} onError={e => e.target.style.display='none'} />
                  <span style={{ flex:1, color:'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ color:s.color, fontWeight:700, fontSize:9, whiteSpace:'nowrap' }}>
                    {[3,4,5].map(k => p.pays[k] ? `${k}:${p.pays[k]}` : null).filter(Boolean).join('  ')}
                  </span>
                </div>
              );
            })}
          </SideDropdown>

          {/* Room Events — collapsible */}
          <SideDropdown title="Room Events" titleColor="#ffffff" defaultOpen={false}>
            {[
              { icon:'/images/gambling/botvisits.png',     name:'Bot Visits',       color:'#75bd6e', effect:'2× multiplier', desc:'Your next spin wins are doubled.' },
              { icon:'/images/gambling/diamondrain.png',   name:'Diamond Rain',     color:'#6ebdb0', effect:'+3× last bet',   desc:'Awards 3× your last spin\'s bet as instant bonus diamonds.' },
              { icon:'/images/gambling/rareitemdrop.png',  name:'Rare Item Drop',   color:'#b06ebd', effect:'Wild reel',      desc:'A rare Habbo item drops, a random reel turns fully WILD for your next spin.' },
              { icon:'/images/gambling/hcmemberspotted.png',name:'HC Member Spotted',color:'#bd9b6e',effect:'2× multiplier', desc:'An HC member blesses your next spin' },
            ].map(ev => (
              <div key={ev.name} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:10, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                <img src={ev.icon} alt={ev.name} style={{imageRendering:'pixelated', flexShrink:0, marginTop:2 }} onError={e => e.target.style.display='none'} />
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:ev.color }}>{ev.name}</span>
                    <span style={{ fontSize:9, fontWeight:700, background:`${ev.color}22`, color:ev.color, padding:'1px 6px', borderRadius:10, whiteSpace:'nowrap' }}>{ev.effect}</span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.5 }}>{ev.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:2, lineHeight:1.6 }}>
              Events trigger every ~10–15 spins. A grey pill in Recent Spins shows when a multiplier was active.
            </div>
          </SideDropdown>

          {/* Recent spins — collapsible */}
          <SideDropdown title="Recent Spins" titleColor="var(--text-secondary)" defaultOpen={true}>
            {history.length === 0 ? (
              <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:8 }}>No spins yet.</p>
            ) : history.map((h,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.04)', fontSize:10, gap:4 }}>
                <span style={{ color:'var(--text-muted)', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{h.type||'No win'}</span>
                {h.multi > 1 && (
                  <span style={{ background:'#272831', color:'#fff', fontSize:8, fontWeight:900, padding:'3px 6px', borderRadius:5, whiteSpace:'nowrap', flexShrink:0 }}>
                    {h.multi}×
                  </span>
                )}
                <span style={{ fontWeight:700, color:h.profit>0?'#34bd59':'#EF5856', whiteSpace:'nowrap', flexShrink:0 }}>{h.profit>0?'+':''}{h.profit.toLocaleString()}</span>
              </div>
            ))}
          </SideDropdown>

        </div>
      </div>
    </div>
  );
}