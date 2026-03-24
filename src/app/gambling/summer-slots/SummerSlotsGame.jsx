'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Symbol definitions ────────────────────────────────────────────────────
const SYM = {
  parasol:       { img: '/images/gambling/summer-slots/parasol.png',       label: 'Parasol',       color: '#38bdf8', bg: 'rgba(56,189,248,.28)'   },
  floatring:     { img: '/images/gambling/summer-slots/floatring.png',     label: 'Float Ring',    color: '#4ade80', bg: 'rgba(74,222,128,.28)'   },
  seashell:      { img: '/images/gambling/summer-slots/seashell.png',      label: 'Seashell',      color: '#fbbf24', bg: 'rgba(251,191,36,.28)'   },
  tropicalfish:  { img: '/images/gambling/summer-slots/tropicalfish.png',  label: 'Tropical Fish', color: '#fb923c', bg: 'rgba(249,115,22,.28)'   },
  beachball:     { img: '/images/gambling/summer-slots/beachball.png',     label: 'Beach Ball',    color: '#f87171', bg: 'rgba(248,113,113,.28)'  },
  snorkel:       { img: '/images/gambling/summer-slots/snorkel.png',       label: 'Snorkel',       color: '#c084fc', bg: 'rgba(192,132,252,.28)'  },
  tropicaldrink: { img: '/images/gambling/summer-slots/tropicaldrink.png', label: 'Tropic. Drink', color: '#f472b6', bg: 'rgba(244,114,182,.28)'  },
  wave:          { img: '/images/gambling/summer-slots/wave.png',          label: 'Wave',          color: '#0ea5e9', bg: 'rgba(14,165,233,.32)'   },
  surfboard:     { img: '/images/gambling/summer-slots/surfboard.png',     label: 'Surfboard',     color: '#f59e0b', bg: 'rgba(245,158,11,.32)'   },
  wild:          { img: '/images/gambling/summer-slots/wild.png',          label: 'WILD',          color: '#fde68a', bg: 'rgba(253,230,138,.3)'   },
  scatter:       { img: '/images/gambling/summer-slots/scatter.png',       label: 'SCATTER',       color: '#a78bfa', bg: 'rgba(167,139,250,.3)'   },
  goldenfish:    { img: '/images/gambling/summer-slots/goldenfish.png',    label: 'GOLDEN FISH',   color: '#ffd700', bg: 'rgba(255,215,0,.35)'    },
};

const PAYTABLE = [
  { id: 'surfboard',     pays: { 3: '20×', 4: '50×', 5: '100×' } },
  { id: 'wave',          pays: { 3: '15×', 4: '30×', 5: '75×'  } },
  { id: 'tropicaldrink', pays: { 3: '10×', 4: '20×', 5: '40×'  } },
  { id: 'snorkel',    pays: { 3: '8×',  4: '16×', 5: '32×'  } },
  { id: 'beachball',     pays: { 3: '6×',  4: '12×', 5: '24×'  } },
  { id: 'tropicalfish',  pays: { 3: '4×',  4: '8×',  5: '16×'  } },
  { id: 'seashell',      pays: { 3: '4×',  4: '8×',  5: '16×'  } },
  { id: 'floatring',     pays: { 3: '3×',  4: '6×',  5: '12×'  } },
  { id: 'parasol',     pays: { 3: '2×',  4: '5×',  5: '10×'  } },
];

const MULTI_COLORS = { 1: '#94a3b8', 2: '#34d399', 3: '#60a5fa', 5: '#f59e0b', 10: '#f43f5e' };
const MULTI_BG     = { 1: 'rgba(148,163,184,.15)', 2: 'rgba(52,211,153,.22)', 3: 'rgba(96,165,250,.22)', 5: 'rgba(245,158,11,.25)', 10: 'rgba(244,63,94,.28)' };
const PL_COLORS    = ['#f5c842','#38bdf8','#f97316','#c084fc','#34d399','#fb923c','#a78bfa','#fbbf24','#4ade80','#f472b6'];

const NORM_SYMS = ['parasol','floatring','seashell','tropicalfish','beachball','snorkel','tropicaldrink','wave','surfboard'];
const ALL_MULTI = [1, 2, 3, 5, 10];

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// The background image (summer-slots-bg.png) is displayed at GAME_W × GAME_H.
// REEL_LEFTS: pixel x-position of each reel's LEFT edge within the game area.
// REEL_TOP:   pixel y-position of the top cell of each reel.
// Adjust these if the reels don't align perfectly with the water streams on your build.
// ─────────────────────────────────────────────────────────────────────────────
const GAME_W   = 806;
const GAME_H   = 624;
const CELL_W   = 80;
const CELL_H   = 65;
const CELL_GAP = 3;

// X left-edge of each of the 6 stream columns (red→orange→yellow→green→blue→purple)
const REEL_LEFTS  = [105, 205, 305, 425, 525, 625];
// Y where the top cell begins (just inside the tube opening)
const REEL_TOP    = 288;

// Per-tube accent colours matching the slide image
const TUBE_COLORS = ['#ff4433','#ff8800','#ffcc00','#33cc33','#2266ff','#bb44ee'];

// Payline coordinate helpers inside the full-game SVG overlay
function plcx(reel) { return REEL_LEFTS[reel] + CELL_W / 2; }
function plcy(row)  { return REEL_TOP + row * (CELL_H + CELL_GAP) + CELL_H / 2; }

const ALL_PAYLINES = [
  [[0,1],[1,1],[2,1],[3,1],[4,1]], [[0,0],[1,0],[2,0],[3,0],[4,0]], [[0,2],[1,2],[2,2],[3,2],[4,2]],
  [[0,0],[1,1],[2,2],[3,1],[4,0]], [[0,2],[1,1],[2,0],[3,1],[4,2]], [[0,0],[1,1],[2,1],[3,1],[4,0]],
  [[0,2],[1,1],[2,1],[3,1],[4,2]], [[0,1],[1,0],[2,1],[3,2],[4,1]], [[0,1],[1,2],[2,1],[3,0],[4,1]],
  [[0,0],[1,2],[2,1],[3,0],[4,2]],
];

function randSym()   { return NORM_SYMS[Math.floor(Math.random() * NORM_SYMS.length)]; }
function randMulti() { return ALL_MULTI[Math.floor(Math.random() * ALL_MULTI.length)]; }
function randReel()  { return [randSym(), randSym(), randSym()]; }
function buildScrollStrip() { return Array.from({ length: 14 }, randSym); }
function buildMultiStrip()  { return Array.from({ length: 14 }, randMulti); }

// ── Symbol cell ───────────────────────────────────────────────────────────
function SymCell({ id, highlight, bounce }) {
  const s = SYM[id] || SYM.parasol;
  return (
    <div style={{
      width: CELL_W, height: CELL_H, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      borderRadius: 7,
      background: highlight ? s.bg : 'rgba(0,25,55,.22)',
      border: `2px solid ${highlight ? s.color : 'rgba(255,255,255,.18)'}`,
      boxShadow: highlight ? `0 0 16px ${s.color}99, inset 0 0 10px ${s.color}22` : 'none',
      backdropFilter: 'blur(3px)',
      transition: 'all .12s',
      animation: bounce && highlight ? 'symBounce .4s ease-out' : 'none',
    }}>
      <img
        src={s.img}
        alt={s.label}
        style={{
          width: 50, height: 50,
          objectFit: 'contain',
          imageRendering: 'pixelated',
          filter: highlight ? `drop-shadow(0 0 5px ${s.color}) drop-shadow(0 0 10px ${s.color}88)` : 'none',
          flexShrink: 0,
        }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
}

// ── Multiplier cell ───────────────────────────────────────────────────────
function MultiCell({ value, active, bounce }) {
  const color = MULTI_COLORS[value] || '#fff';
  return (
    <div style={{
      width: CELL_W, height: CELL_H, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRadius: 7,
      background: active ? (MULTI_BG[value] || 'rgba(255,255,255,.1)') : 'rgba(0,0,0,.2)',
      border: `2px solid ${active ? color : 'rgba(255,215,0,.18)'}`,
      boxShadow: active ? `0 0 18px ${color}aa, inset 0 0 12px ${color}22` : 'none',
      backdropFilter: 'blur(3px)',
      transition: 'all .15s',
      animation: bounce && active ? 'symBounce .4s ease-out' : 'none',
    }}>
      <img
        src={`/images/gambling/summer-slots/multi_${value}.png`}
        alt={`×${value}`}
        style={{
          width: 50, height: 50,
          objectFit: 'contain',
          imageRendering: 'pixelated',
          filter: active ? `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px ${color}88)` : 'none',
          flexShrink: 0,
        }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
}

// ── Normal reel column ────────────────────────────────────────────────────
function Reel({ finalSyms, stopped, winRows, bounce, reelIdx, tubeColor }) {
  const [scrollStrip, setScrollStrip] = useState(buildScrollStrip);
  const wasSpinning = useRef(!stopped);
  useEffect(() => {
    if (!stopped && !wasSpinning.current) setScrollStrip(buildScrollStrip());
    wasSpinning.current = !stopped;
  }, [stopped]);
  const totalH = CELL_H + CELL_GAP;
  return (
    <div style={{ width: CELL_W, height: totalH * 3 - CELL_GAP, overflow: 'hidden', position: 'relative', borderRadius: 5, outline: `1.5px solid ${tubeColor}44` }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:16,background:'linear-gradient(180deg,rgba(0,20,50,.6) 0%,transparent 100%)',zIndex:3,pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:16,background:'linear-gradient(0deg,rgba(0,20,50,.6) 0%,transparent 100%)',zIndex:3,pointerEvents:'none' }} />
      {stopped ? (
        <div style={{ display:'flex',flexDirection:'column',gap:CELL_GAP,animation:`reelLand ${0.26+reelIdx*0.06}s cubic-bezier(0.22,1,0.36,1)` }}>
          {finalSyms.map((sym, row) => <SymCell key={row} id={sym} highlight={!!winRows?.includes(row)} bounce={bounce && !!winRows?.includes(row)} />)}
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:CELL_GAP,animation:`reelScroll ${0.52-reelIdx*0.03}s linear infinite`,willChange:'transform' }}>
          {[...scrollStrip,...scrollStrip].map((sym, i) => <SymCell key={i} id={sym} highlight={false} bounce={false} />)}
        </div>
      )}
    </div>
  );
}

// ── Multiplier reel column (reel 6) ──────────────────────────────────────
function MultiplierReel({ finalValues, stopped, bounce }) {
  const [scrollStrip, setScrollStrip] = useState(buildMultiStrip);
  const wasSpinning = useRef(!stopped);
  useEffect(() => {
    if (!stopped && !wasSpinning.current) setScrollStrip(buildMultiStrip());
    wasSpinning.current = !stopped;
  }, [stopped]);
  const totalH = CELL_H + CELL_GAP;
  return (
    <div style={{ width: CELL_W, height: totalH * 3 - CELL_GAP, overflow: 'hidden', position: 'relative', borderRadius: 5, outline: '1.5px solid rgba(255,215,0,.4)', boxShadow:'0 0 10px rgba(255,215,0,.15)' }}>
      <div style={{ position:'absolute',top:totalH-1,left:0,right:0,height:1,background:'rgba(255,215,0,.3)',zIndex:4,pointerEvents:'none' }} />
      <div style={{ position:'absolute',top:totalH*2-1,left:0,right:0,height:1,background:'rgba(255,215,0,.3)',zIndex:4,pointerEvents:'none' }} />
      <div style={{ position:'absolute',top:0,left:0,right:0,height:16,background:'linear-gradient(180deg,rgba(0,10,30,.6) 0%,transparent 100%)',zIndex:3,pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:16,background:'linear-gradient(0deg,rgba(0,10,30,.6) 0%,transparent 100%)',zIndex:3,pointerEvents:'none' }} />
      {stopped ? (
        <div style={{ display:'flex',flexDirection:'column',gap:CELL_GAP,animation:'reelLand .5s cubic-bezier(0.22,1,0.36,1)' }}>
          {finalValues.map((val, row) => <MultiCell key={row} value={val} active={row===1} bounce={bounce} />)}
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:CELL_GAP,animation:'reelScroll .38s linear infinite',willChange:'transform' }}>
          {[...scrollStrip,...scrollStrip].map((val, i) => <MultiCell key={i} value={val} active={false} bounce={false} />)}
        </div>
      )}
    </div>
  );
}

// ── Payline SVG overlay ───────────────────────────────────────────────────
function PaylineLines({ paylines }) {
  return (
    <>
      {paylines.map(plIdx => {
        const coords = ALL_PAYLINES[plIdx]; if (!coords) return null;
        const color  = PL_COLORS[plIdx] || '#fff';
        const pts    = coords.map(([r, row]) => `${plcx(r)},${plcy(row)}`).join(' ');
        return (
          <g key={plIdx}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="7" strokeOpacity="0.22" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round" style={{animation:'lineDraw .35s ease-out'}} />
            {coords.map(([r, row], di) => <circle key={di} cx={plcx(r)} cy={plcy(row)} r="5" fill={color} fillOpacity="0.9" stroke="#000" strokeWidth="1.5" />)}
          </g>
        );
      })}
    </>
  );
}

// ── Jackpot feed (wooden boards area) ────────────────────────────────────
function JackpotFeed() {
  const [jackpots, setJackpots] = useState([]);
  const habboImg = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';
  useEffect(() => {
    const load = async () => { try { const r = await fetch('/api/gambling/summer-slots'); const d = await r.json(); if (d.jackpots?.length) setJackpots(d.jackpots); } catch {} };
    load(); const t = setInterval(load, 5000); return () => clearInterval(t);
  }, []);
  return (
    <div style={{ position:'absolute',top:34,left:0,right:0,height:52,zIndex:20,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 14px',gap:36.5 }}>
      { jackpots.map((j, i) => (
        <div key={i} style={{ display:'flex',alignItems:'center',gap:5,background:'rgba(70,35,5,.65)',backdropFilter:'blur(4px)',border:'1px solid rgba(180,100,25,.5)',borderRadius:5,padding:'3px 8px 3px 4px',height:38 }}>
          {j.look && <div style={{ width:22,height:30,overflow:'hidden',display:'flex',alignItems:'flex-end',justifyContent:'center' }}><img src={`${habboImg}?figure=${j.look}&direction=2&head_direction=2&size=s`} alt={j.username} style={{ height:30,imageRendering:'pixelated' }} /></div>}
          <div>
            <div style={{ fontWeight:700,color:'rgba(255,215,120,.95)',fontSize:10,lineHeight:1 }}>{j.username}</div>
            <div style={{ color:'#4ade80',fontWeight:800,fontSize:9 }}>+{Number(j.profit).toLocaleString()} <img src="/images/diamond.png" alt="" style={{ float: 'right', width:14,height:14,imageRendering:'pixelated',verticalAlign:'middle',marginLeft:4 }} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Win bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, color, big, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, big ? 5000 : 3200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:'absolute',top:REEL_TOP - 15,left:'50%',transform:'translate(-50%, -100%)',background:big?'rgba(8,16,36,.93)':'rgba(8,16,36,.88)',border:`2px solid ${color}88`,borderRadius:14,padding:big?'16px 28px':'9px 18px',fontSize:big?18:13,fontWeight:900,color,whiteSpace:'nowrap',zIndex:200,boxShadow:`0 0 40px ${color}55,0 8px 32px rgba(0,0,0,.7)`,animation:'bubbleCenter .3s cubic-bezier(0.34,1.56,0.64,1)',textAlign:'center',pointerEvents:'none',backdropFilter:'blur(6px)' }}>{msg}</div>
  );
}

// ── Coin rain ─────────────────────────────────────────────────────────────
const COIN_P = Array.from({length:22},()=>({left:Math.random()*100,size:10+Math.random()*14,dur:(1.0+Math.random()*.8).toFixed(2),delay:(Math.random()*.6).toFixed(2)}));
function Coins({ show }) {
  if (!show) return null;
  return <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:999,overflow:'hidden'}}>{COIN_P.map((p,i) => <div key={i} style={{position:'absolute',top:'-5%',left:`${p.left}%`,animation:`coinFall ${p.dur}s ease-in ${p.delay}s forwards`}}><img src="/images/diamond.png" alt="" style={{width:p.size,height:p.size,imageRendering:'pixelated'}} /></div>)}</div>;
}

// ── Free Spin Summary modal ───────────────────────────────────────────────
function FreeSpinSummary({ total, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:950,background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#0a1520',border:'2px solid #a78bfa',borderRadius:20,padding:40,maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 0 80px #a78bfa55',animation:'bigWinPop .4s ease-out'}}>
        <div style={{fontSize:14,fontWeight:900,color:'#a78bfa',letterSpacing:3,textTransform:'uppercase',marginBottom:8}}>Free Spins Complete!</div>
        {total > 0 ? (<><div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>Total summer winnings:</div><div style={{fontSize:38,fontWeight:900,color:'#fff',marginBottom:22}}>{total.toLocaleString()} <img width="16" height="16" src="/images/diamond.png" style={{imageRendering:'pixelated',verticalAlign:'middle'}} alt="" /></div></>) : (<div style={{fontSize:14,color:'var(--text-muted)',margin:'12px 0 22px'}}>No wins this time — the waves weren't with you!</div>)}
        <button onClick={onClose} className="btn-enterhotel" style={{padding:'10px 32px',fontSize:14}}>Back to the Beach</button>
      </div>
    </div>
  );
}

// ── Sidebar collapsible ───────────────────────────────────────────────────
function SideDropdown({ title, titleColor, defaultOpen=true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel no-hover" style={{padding:0,overflow:'hidden'}}>
      <button onClick={() => setOpen(o=>!o)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
        <span style={{fontSize:10,fontWeight:900,color:titleColor,letterSpacing:2,textTransform:'uppercase'}}>{title}</span>
        <span style={{fontSize:10,color:'var(--text-muted)',transform:open?'rotate(180deg)':'none',transition:'transform .2s',display:'inline-block'}}>▼</span>
      </button>
      {open && <div style={{padding:'0 14px 12px 14px'}}>{children}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN GAME COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function SummerSlotsGame({ points }) {
  const [stoppedReels, setStoppedReels] = useState([true,true,true,true,true]);
  const [stoppedReel6, setStoppedReel6] = useState(true);
  const [finalReels,   setFinalReels]   = useState(() => Array.from({length:5},randReel));
  const [finalReel6,   setFinalReel6]   = useState([1,1,2]);
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
  const [shake,        setShake]        = useState(false);
  const [nearMiss,     setNearMiss]     = useState(false);
  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [revealedMulti,    setRevealedMulti]    = useState(false);
  const [freeSpinDisplay,  setFreeSpinDisplay]  = useState(0);
  const [freeModeDisplay,  setFreeModeDisplay]  = useState(false);
  const [freeSpinPot,      setFreeSpinPot]      = useState(0);
  const [freeSpinSummary,  setFreeSpinSummary]  = useState(null);

  const freeSpinRef    = useRef(0);
  const freeModeRef    = useRef(false);
  const freeSpinPotRef = useRef(0);
  const coolRef        = useRef(null);
  const autoRef        = useRef(false);
  const autoLeftRef    = useRef(0);

  const setFreeSpinCount = n => { freeSpinRef.current = n; setFreeSpinDisplay(n); };
  const setFreeMode      = v => { freeModeRef.current = v; setFreeModeDisplay(v); };
  const freeMode = freeModeDisplay;
  const freeSpin = freeSpinDisplay;

  const winCells = (() => {
    const map = {};
    for (const pl of winPaylines) {
      const c = ALL_PAYLINES[pl]; if (!c) continue;
      for (const [r,row] of c) { if (!map[r]) map[r]=[]; if (!map[r].includes(row)) map[r].push(row); }
    }
    return map;
  })();

  const startCooldown = s => {
    setCooldown(s);
    if (coolRef.current) clearInterval(coolRef.current);
    coolRef.current = setInterval(() => setCooldown(c => { if (c<=1){clearInterval(coolRef.current);return 0;} return c-1; }), 1000);
  };
  const stopAuto = useCallback(() => { autoRef.current=false; setAutoMode(false); setAutoLeft(0); }, []);

  const doSpin = useCallback(async (isFreeMode=false) => {
    const fm = isFreeMode || freeModeRef.current;
    if (spinning || (!fm && !autoRef.current && cooldown>0) || bet<1 || (!fm && balance<bet)) return;

    setSpinning(true); setResult(null); setWinPaylines([]); setBounce(false);
    setNearMiss(false); setBubble(null); setRevealedMulti(false); setActiveMultiplier(1);
    setStoppedReels([false,false,false,false,false]); setStoppedReel6(false);

    const spinDelay = turbo ? 150 : 300;
    try {
      const res  = await fetch('/api/gambling/summer-slots', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bet, freeSpinMode: fm }) });
      const data = await res.json();

      if (res.status===429) { setSpinning(false); setStoppedReels([true,true,true,true,true]); setStoppedReel6(true); startCooldown(data.retryAfter||5); stopAuto(); return; }
      if (!data.ok) { setSpinning(false); setStoppedReels([true,true,true,true,true]); setStoppedReel6(true); setResult({error:data.error}); stopAuto(); return; }

      setFinalReels(data.reels); setFinalReel6(data.reel6);

      for (let i=0;i<5;i++) { await new Promise(r=>setTimeout(r,spinDelay)); setStoppedReels(p=>{const n=[...p];n[i]=true;return n;}); }

      // Suspense pause then multiplier lands
      await new Promise(r=>setTimeout(r, turbo?450:1000));
      setStoppedReel6(true); setActiveMultiplier(data.activeMultiplier); setRevealedMulti(true);
      await new Promise(r=>setTimeout(r,180));

      setResult(data); setWinPaylines(data.winPaylines||[]); setBounce(true); setSpinning(false);
      if (data.scatterCount===2) setNearMiss(true);

      const win = data.win || 0;
      setBalance(data.balance);

      if (fm) {
        freeSpinPotRef.current += win; setFreeSpinPot(freeSpinPotRef.current);
        if (win>0) { setBubble({msg:`+${win.toLocaleString()} Diamonds`,big:false,color:'#a78bfa'}); setBubbleKey(k=>k+1); setHistory(h=>[{win,profit:win,type:data.type||'Free Spin',bet:0,multi:data.activeMultiplier},...h].slice(0,10)); }
        const newLeft = freeSpinRef.current-1; setFreeSpinCount(newLeft);
        if (newLeft<=0) { setFreeMode(false); const tot=freeSpinPotRef.current; freeSpinPotRef.current=0; setFreeSpinPot(0); setFreeSpinSummary({total:tot}); stopAuto(); return; }
        return;
      }

      const profit = win - bet;
      if (win>0) {
        setHistory(h=>[{win,profit,type:data.type,bet,multi:data.activeMultiplier},...h].slice(0,10));
        if (data.isJackpot) { setShake(true); setTimeout(()=>setShake(false),900); setShowCoins(true); setTimeout(()=>setShowCoins(false),3200); setBubble({msg:`GOLDEN FISH JACKPOT! +${win.toLocaleString()} Diamonds!`,big:true,color:'#ffd700'}); setBubbleKey(k=>k+1); }
        else if (data.activeMultiplier>=5 || win>=bet*15) { setShake(true); setTimeout(()=>setShake(false),600); setShowCoins(true); setTimeout(()=>setShowCoins(false),2400); setBubble({msg:`BIG WIN! +${win.toLocaleString()} Diamonds!`,big:true,color:'#38bdf8'}); setBubbleKey(k=>k+1); }
        else { setBubble({msg:`+${win.toLocaleString()} Diamonds${data.activeMultiplier>1?` ×${data.activeMultiplier}`:''}`,big:false,color:'#34d399'}); setBubbleKey(k=>k+1); }
      } else {
        setHistory(h=>[{win:0,profit:-bet,type:'No win',bet,multi:data.activeMultiplier},...h].slice(0,10));
      }

      if (data.freeSpinsAwarded>0) { freeSpinRef.current=data.freeSpinsAwarded; setFreeSpinDisplay(data.freeSpinsAwarded); freeModeRef.current=true; setFreeModeDisplay(true); freeSpinPotRef.current=0; setFreeSpinPot(0); setBubble({msg:`💦 ${data.freeSpinsAwarded} FREE SPINS! ×2 min!`,big:true,color:'#a78bfa'}); setBubbleKey(k=>k+1); stopAuto(); return; }

      if (autoRef.current && autoLeftRef.current>1) { autoLeftRef.current-=1; setAutoLeft(autoLeftRef.current); setTimeout(()=>doSpin(false),turbo?400:900); }
      else if (autoRef.current) { autoLeftRef.current=0; setAutoLeft(0); stopAuto(); startCooldown(1); }
      else { startCooldown(1); }
    } catch {
      setSpinning(false); setStoppedReels([true,true,true,true,true]); setStoppedReel6(true); setResult({error:'Connection error'}); stopAuto();
    }
  }, [spinning, cooldown, bet, balance, turbo, stopAuto]);

  useEffect(() => {
    if (freeModeRef.current && freeSpinRef.current>0 && !spinning) {
      const t = setTimeout(()=>doSpin(true), turbo?350:800); return ()=>clearTimeout(t);
    }
  }, [freeSpinDisplay, spinning, turbo]);

  const startAuto = count => { autoRef.current=true; autoLeftRef.current=count; setAutoMode(true); setAutoLeft(count); doSpin(false); };
  const isWin    = result && (result.win||0)>0;
  const canSpin  = !spinning && (freeMode || (cooldown===0 && balance>=bet));
  const multiClr = MULTI_COLORS[activeMultiplier] || '#fff';

  return (
    <div>
      <style>{`
        @keyframes reelScroll  { 0%{transform:translateY(0)} 100%{transform:translateY(-50%)} }
        @keyframes reelLand    { 0%{transform:translateY(-22px);opacity:.5} 60%{transform:translateY(5px)} 100%{transform:translateY(0);opacity:1} }
        @keyframes symBounce   { 0%{transform:scale(1)} 40%{transform:scale(1.15)} 70%{transform:scale(.95)} 100%{transform:scale(1)} }
        @keyframes bubbleCenter{ 0%{transform:translate(-50%,-50%) scale(.4);opacity:0} 70%{transform:translate(-50%,-50%) scale(1.07)} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes coinFall    { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes screenShake { 0%,100%{transform:translate(0)} 20%{transform:translate(-6px,3px)} 50%{transform:translate(6px,-3px)} 80%{transform:translate(-4px,4px)} }
        @keyframes nearFlash   { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes glowPulse   { 0%,100%{box-shadow:0 0 6px #a78bfa44} 50%{box-shadow:0 0 20px #a78bfaaa} }
        @keyframes goldPulse   { 0%,100%{box-shadow:0 0 8px rgba(255,215,0,.3)} 50%{box-shadow:0 0 26px rgba(255,215,0,.8)} }
        @keyframes multiReveal { 0%{opacity:0;transform:translateX(-50%) scale(.5)} 70%{transform:translateX(-50%) scale(1.1)} 100%{opacity:1;transform:translateX(-50%) scale(1)} }
        @keyframes lineDraw    { 0%{stroke-dasharray:1000;stroke-dashoffset:1000} 100%{stroke-dashoffset:0} }
        @keyframes bigWinPop   { 0%{transform:scale(.4);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        @keyframes shimmerFlow { 0%{opacity:.3} 50%{opacity:.7} 100%{opacity:.3} }
      `}</style>

      <Coins show={showCoins} />
      
      {freeSpinSummary && <FreeSpinSummary total={freeSpinSummary.total} onClose={()=>{setFreeSpinSummary(null);startCooldown(1);}} />}
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5px' }} src="/images/gambling/summer-slots_icon.png"></img>Slots Machine</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />{balance.toLocaleString()}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:`${GAME_W}px 240px`, gap:16, alignItems:'start' }}>

        {/* ══ LEFT: Machine ══ */}
        <div style={{ animation: shake?'screenShake .55s ease-out':'none' }}>

          {/* ── Background image game area ── */}
          <div style={{
            position:'relative', width:GAME_W, height:GAME_H,
            borderRadius:'10px', overflow:'hidden',
            backgroundImage:`url('/images/gambling/summer-slots-bg.png')`,
            backgroundSize:'100% 100%', backgroundRepeat:'no-repeat',
          }}>
            {bubble && <Bubble key={bubbleKey} msg={bubble.msg} color={bubble.color} big={bubble.big} onDone={()=>setBubble(null)} />}

            {/* Jackpot feed over wooden boards */}
            <JackpotFeed />

            {/* ── 6 Reel columns over water streams ── */}
            {REEL_LEFTS.map((left, i) => (
              <div key={i} style={{ position:'absolute', top:REEL_TOP, left }}>
                {i < 5 ? (
                  <Reel finalSyms={finalReels[i]} stopped={stoppedReels[i]} winRows={winCells[i]||[]} bounce={bounce} reelIdx={i} tubeColor={TUBE_COLORS[i]} />
                ) : (
                  <MultiplierReel finalValues={finalReel6} stopped={stoppedReel6} bounce={bounce} />
                )}
                {/* Water flow shimmer when spinning */}
                {((i<5 && !stoppedReels[i]) || (i===5 && !stoppedReel6)) && (
                  <div style={{ position:'absolute',inset:0,borderRadius:5,background:`linear-gradient(180deg,${TUBE_COLORS[i]}33,transparent,${TUBE_COLORS[i]}18)`,animation:'shimmerFlow .55s ease-in-out infinite',pointerEvents:'none',zIndex:5 }} />
                )}
              </div>
            ))}

            {/* Payline SVG full-game overlay */}
            {!spinning && winPaylines.length>0 && stoppedReel6 && (
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:15}} viewBox={`0 0 ${GAME_W} ${GAME_H}`} preserveAspectRatio="none">
                <PaylineLines paylines={winPaylines} />
              </svg>
            )}

            {/* Payline indicator dots (left edge) */}
            <div style={{ position:'absolute', left:8, top:REEL_TOP, display:'flex', flexDirection:'column', gap:4, zIndex:16 }}>
              {PL_COLORS.map((c,i) => <div key={i} style={{ width:6,height:6,borderRadius:'50%',background:winPaylines.includes(i)?c:'rgba(0,0,0,.45)',boxShadow:winPaylines.includes(i)?`0 0 6px ${c}`:'none',transition:'all .2s' }} />)}
            </div>

            {/* Multiplier spinning indicator */}
            {spinning && stoppedReels.every(s=>s) && !stoppedReel6 && (
              <div style={{ position:'absolute', top:REEL_TOP - 10, left:'50%', transform:'translate(-50%, -100%)', background:'rgba(0,8,22,.78)', backdropFilter:'blur(6px)', border:'1px solid rgba(255,215,0,.45)', borderRadius:20, padding:'5px 18px', fontSize:10, fontWeight:900, color:'#ffd700', letterSpacing:2, whiteSpace:'nowrap', animation:'goldPulse .8s infinite', zIndex:50 }}>MULTIPLIER SPINNING…</div>
            )}

            {/* Near miss */}
            {nearMiss && !spinning && (
              <div style={{ position:'absolute', top:REEL_TOP - 10, left:'50%', transform:'translate(-50%, -100%)', background:'rgba(8,4,28,.8)', border:'1px solid #a78bfa55', backdropFilter:'blur(5px)', borderRadius:20, padding:'5px 18px', fontSize:10, fontWeight:800, color:'#a78bfa', letterSpacing:1.5, whiteSpace:'nowrap', animation:'nearFlash .5s ease-in-out 3', zIndex:50 }}>So close! 2 Scatters..</div>
            )}

            {/* Free spin overlay inside image */}
            {freeMode && freeSpin>0 && (
              <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8, zIndex:20 }}>
                <div style={{ background:'rgba(167,139,250,.22)',border:'2px solid #a78bfa',borderRadius:10,padding:'4px 12px',animation:'glowPulse 1s ease-in-out infinite',textAlign:'center',backdropFilter:'blur(5px)' }}>
                  <div style={{ fontSize:8,fontWeight:900,color:'#a78bfa',letterSpacing:1 }}>FREE</div>
                  <div style={{ fontSize:20,fontWeight:900,color:'#fff',lineHeight:1 }}>{freeSpin}</div>
                </div>
                <div style={{ background:'rgba(245,200,66,.18)',border:'2px solid #f5c842',borderRadius:10,padding:'4px 12px',textAlign:'center',backdropFilter:'blur(5px)' }}>
                  <div style={{ fontSize:8,fontWeight:900,color:'#f5c842',letterSpacing:1 }}>POT</div>
                  <div style={{ fontSize:16,fontWeight:900,color:'#f5c842',lineHeight:1 }}>{freeSpinPot.toLocaleString()}</div>
                </div>
              </div>
            )}
            {/* ── Result message — above the reels ── */}
            {!spinning && result && !freeMode && (
              <div style={{ position:'absolute', top:REEL_TOP - 10, left:'50%', transform:'translate(-50%, -100%)', backdropFilter:'blur(5px)', borderRadius:20, padding:'5px 18px', fontSize:11, fontWeight:800, whiteSpace:'nowrap', zIndex:50,
                ...(result.error
                  ? { background:'rgba(40,5,5,.82)', border:'1px solid rgba(239,68,68,.5)', color:'#f87171' }
                  : isWin
                  ? { background:'rgba(5,30,10,.82)', border:'1px solid rgba(52,189,89,.5)', color:'#4ade80' }
                  : { background:'rgba(20,10,5,.82)', border:'1px solid rgba(100,60,20,.45)', color:'rgba(255,200,140,.85)' })
              }}>
                {result.error === 'NOT_ENOUGH' ? 'Not enough diamonds!'
                  : result.error ? `Error: ${result.error}`
                  : isWin ? `+${(result.win||0).toLocaleString()} Diamonds!${result.type ? ` · ${result.type}` : ''}`
                  : 'No win - catch the next wave!'}
              </div>
            )}

            {/* ── CONTROL BAR — absolutely positioned inside the image div ── */}
            <div style={{
              position: 'absolute', bottom: 4, left: 30, right: 30,
              padding: '12px 18px 14px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              zIndex: 30,
            }}>


              {/* Bet presets */}
              <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                {[5,10,50,100,500,1000,2500].map(v => (
                  <button key={v} onClick={()=>setBet(v)} disabled={freeMode}
                    style={{ padding:'4px 8px', fontSize:11, fontWeight:700, fontFamily:'inherit', cursor:'pointer', borderRadius:5,
                      background:bet===v?'rgba(0,0,0,.5)':'rgba(0,0,0,.22)',
                      color:bet===v?'#fff':'rgba(255,255,255,.75)',
                      border:bet===v?'1px solid rgba(0,0,0,.6)':'1px solid rgba(0,0,0,.25)',
                      boxShadow:bet===v?'inset 0 1px 3px rgba(0,0,0,.5)':'0 1px 2px rgba(255,255,255,.2)',
                    }}>{v>=1000?`${v/1000}k`:v}</button>
                ))}
              </div>

              {/* SPIN button */}
              <button className="btn btn-primary btn-sm" onClick={()=>doSpin(freeMode)} disabled={!canSpin}>
                {freeMode?'Free':spinning?'…':cooldown>0?`${cooldown}s`:'SPIN'}
              </button>

              {/* Turbo + auto */}
              <div style={{ display:'flex',gap:5,alignItems:'center',marginLeft:'auto',flexWrap:'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setTurbo(t=>!t)}
                  >Turbo{turbo?' ON':''}</button>
                {autoMode ? (
                  <button className="btn btn-secondary btn-sm" onClick={stopAuto} >STOP {autoLeft}</button>
                ) : (
                  [10,25,50].map(n => (
                    <button key={n} onClick={()=>startAuto(n)} disabled={spinning||freeMode||balance<bet}
                      className="btn btn-secondary btn-sm" >Auto {n}</button>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ══ RIGHT: Sidebar ══ */}
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {freeMode && (
            <div className="panel no-hover" style={{ padding:14 }}>
              <div style={{ display:'flex',gap:8 }}>
                <div style={{ background:'rgba(167,139,250,.15)',border:'2px solid #a78bfa',borderRadius:10,padding:'6px 12px',animation:'glowPulse 1s ease-in-out infinite',textAlign:'center',flex:1 }}>
                  <div style={{ fontSize:9,fontWeight:900,color:'#a78bfa',letterSpacing:1 }}>FREE SPINS</div>
                  <div style={{ fontSize:22,fontWeight:900,color:'#fff',lineHeight:1 }}>{freeSpin}</div>
                </div>
                <div style={{ background:'rgba(245,200,66,.12)',border:'2px solid #f5c842',borderRadius:10,padding:'6px 12px',textAlign:'center',flex:1 }}>
                  <div style={{ fontSize:9,fontWeight:900,color:'#f5c842',letterSpacing:1 }}>POT</div>
                  <div style={{ fontSize:18,fontWeight:900,color:'#f5c842',lineHeight:1 }}>{freeSpinPot.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
          <SideDropdown title="Special Symbols" titleColor="#ffffff" defaultOpen={false}>
            {[{id:'wild',desc:'Substitutes any normal symbol'},{id:'scatter',desc:'3=5 · 4=8 · 5=12 Free Spins + pays 10/25/75× bet'},{id:'goldenfish',desc:'5× = JACKPOT 500× bet (bypasses multiplier)'}].map(({id,desc})=>(
              <div key={id} style={{ display:'flex',gap:8,alignItems:'flex-start',marginBottom:10 }}>
                <div style={{ width:38,height:38,flexShrink:0,borderRadius:8,background:SYM[id].bg,border:`1.5px solid ${SYM[id].color}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}><img src={SYM[id].img} alt={SYM[id].label} style={{ width:30,height:30,objectFit:'contain',imageRendering:'pixelated' }} onError={e=>{e.currentTarget.style.display='none'}} /></div>
                <div><div style={{ fontSize:11,fontWeight:800,color:SYM[id].color }}>{SYM[id].label}</div><div style={{ fontSize:9,color:'var(--text-muted)',lineHeight:1.4 }}>{desc}</div></div>
              </div>
            ))}
            <div style={{ fontSize:9,color:'#a78bfa',marginTop:6,background:'rgba(167,139,250,.1)',padding:'4px 8px',borderRadius:6 }}>Free spins: ×2 min guaranteed!</div>
          </SideDropdown>
          <SideDropdown title="Paytable (×bet)" titleColor="#ffffff" defaultOpen={false}>
            <div style={{ fontSize:9,color:'var(--text-muted)',marginBottom:6 }}>× multiplied by reel 6</div>
            {PAYTABLE.map(p => { const s=SYM[p.id]; return (
              <div key={p.id} style={{ display:'flex',alignItems:'center',gap:7,padding:'3px 0',borderBottom:'1px solid rgba(255,255,255,.04)',fontSize:10 }}>
                <img src={s.img} alt={s.label} style={{ width:20,height:20,objectFit:'contain',imageRendering:'pixelated',flexShrink:0 }} onError={e=>{e.currentTarget.style.display='none'}} />
                <span style={{ flex:1,color:'var(--text-secondary)',fontSize:9 }}>{s.label}</span>
                <span style={{ color:s.color,fontWeight:700,fontSize:9,whiteSpace:'nowrap' }}>{[3,4,5].map(k=>p.pays[k]?`${k}:${p.pays[k]}`:null).filter(Boolean).join('  ')}</span>
              </div>
            );})}
          </SideDropdown>
          <SideDropdown title="Recent Spins" titleColor="var(--text-secondary)" defaultOpen={true}>
            {history.length===0 ? <p style={{ fontSize:11,color:'var(--text-muted)',textAlign:'center',padding:8 }}>No spins yet.</p> : history.map((h,i)=>(
              <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,.04)',fontSize:10,gap:4 }}>
                <span style={{ color:'var(--text-muted)',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{h.type||'No win'}</span>
                {h.multi>1 && h.profit>0 && <span style={{ background:MULTI_BG[h.multi]||'#272831',color:MULTI_COLORS[h.multi]||'#fff',fontSize:8,fontWeight:900,padding:'2px 5px',borderRadius:5,border:`1px solid ${MULTI_COLORS[h.multi]||'#fff'}44`,flexShrink:0 }}>×{h.multi}</span>}
                <span style={{ fontWeight:700,color:h.profit>0?'#34bd59':'#EF5856',whiteSpace:'nowrap',flexShrink:0 }}>{h.profit>0?'+':''}{h.profit.toLocaleString()}</span>
              </div>
            ))}
          </SideDropdown>
        </div>
      </div>
    </div>
  );
}