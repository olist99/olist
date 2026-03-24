import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { safeInt, checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

function secureRandom(max) { return crypto.randomInt(0, max); }

// ── Symbols for reels 1-5 ──────────────────────────────────────────────────
export const SYMBOLS = [
  { id: 'parasol',       name: 'Parasol',       weight: 30 },
  { id: 'floatring',     name: 'Float Ring',    weight: 24 },
  { id: 'seashell',      name: 'Seashell',      weight: 22 },
  { id: 'tropicalfish',  name: 'Tropical Fish', weight: 22 },
  { id: 'beachball',     name: 'Beach Ball',    weight: 12 },
  { id: 'snorkel',       name: 'Snorkel',       weight: 10 },
  { id: 'tropicaldrink', name: 'Tropical Drink',weight: 8  },
  { id: 'wave',          name: 'Wave',          weight: 3  },
  { id: 'surfboard',     name: 'Surfboard',     weight: 2  },
  { id: 'wild',          name: 'Wild Sun',      weight: 1  }, // was 3 — wilds now rare
  { id: 'scatter',       name: 'Scatter',       weight: 2  }, // was 3 — fewer free spin triggers
  { id: 'goldenfish',    name: 'Golden Fish',   weight: 1  }, // ultra rare
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);

// ── Multiplier reel (reel 6) ──────────────────────────────────────────────
const MULTIPLIERS = [
  { value: 1,  weight: 65 }, // was 50 — ×1 now 65% of spins
  { value: 2,  weight: 20 }, // was 25
  { value: 3,  weight: 10 }, // was 15
  { value: 5,  weight:  4 }, // was 8
  { value: 10, weight:  1 }, // was 2
];
const TOTAL_MULTI_WEIGHT = MULTIPLIERS.reduce((s, m) => s + m.weight, 0);

// Free spin multipliers — guaranteed ×2 minimum
const FREE_MULTIPLIERS = [
  { value: 2,  weight: 55 }, // was 45
  { value: 3,  weight: 28 }, // was 30
  { value: 5,  weight: 13 }, // was 17
  { value: 10, weight:  4 }, // was 8
];
const TOTAL_FREE_MULTI_WEIGHT = FREE_MULTIPLIERS.reduce((s, m) => s + m.weight, 0);

// ── Paytable (× bet, BASE GAME, applied before multiplier reel) ───────────
const PAYOUTS = {
  parasol:       { 3: 1,  4: 3,   5: 6   }, // was waterdrop 2/5/10 — fixed key + reduced
  floatring:     { 3: 2,  4: 4,   5: 8   }, // was 3/6/12
  seashell:      { 3: 2,  4: 5,   5: 10  }, // was 4/8/16
  tropicalfish:  { 3: 2,  4: 5,   5: 10  }, // was 4/8/16
  beachball:     { 3: 4,  4: 8,   5: 16  }, // was 6/12/24
  snorkel:       { 3: 5,  4: 10,  5: 20  }, // was sunglasses 8/16/32 — fixed key + reduced
  tropicaldrink: { 3: 6,  4: 12,  5: 25  }, // was 10/20/40
  wave:          { 3: 10, 4: 20,  5: 50  }, // was 15/30/75
  surfboard:     { 3: 12, 4: 30,  5: 60  }, // was 20/50/100
};

const SCATTER_PAY = { 3: 5,  4: 15, 5: 40  }; // was 10/25/75 — reduced ~50%
const SCATTER_FS  = { 3: 3,  4: 6,  5: 10  }; // was 5/8/12 — fewer free spins
const GOLDEN_JACKPOT_MULT = 300; // was 500 — still massive but less explosive

const PAYLINES = [
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

function spinReel() {
  let r = secureRandom(TOTAL_WEIGHT);
  for (const sym of SYMBOLS) { r -= sym.weight; if (r < 0) return sym.id; }
  return SYMBOLS[0].id;
}

function spinMultiplier(freeSpinMode = false) {
  const pool = freeSpinMode ? FREE_MULTIPLIERS : MULTIPLIERS;
  const total = freeSpinMode ? TOTAL_FREE_MULTI_WEIGHT : TOTAL_MULTI_WEIGHT;
  let r = secureRandom(total);
  for (const m of pool) { r -= m.weight; if (r < 0) return m.value; }
  return pool[0].value;
}

function buildMultiplierReel(activeValue) {
  const all = [1, 2, 3, 5, 10];
  const idx = all.indexOf(activeValue);
  const above = all[(idx - 1 + all.length) % all.length];
  const below = all[(idx + 1) % all.length];
  return [above, activeValue, below];
}

function calcBaseWin(reels, bet, freeSpinMode = false) {
  const wins = [];
  let jackpot = false;
  let freeSpinsAwarded = 0;

  // Count scatters (all positions across 5 reels)
  let sc = 0;
  for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (reels[r][row] === 'scatter') sc++;
  if (sc >= 3) {
    const mult = SCATTER_PAY[Math.min(sc, 5)] || 0;
    freeSpinsAwarded = freeSpinMode ? 0 : (SCATTER_FS[Math.min(sc, 5)] || 0);
    wins.push({ payline: -1, sym: 'scatter', count: sc, mult, win: bet * mult, name: `${sc}× Scatter` });
  }

  // Check paylines
  PAYLINES.forEach((pl, idx) => {
    const syms = pl.map(([r, row]) => reels[r][row]);
    let base = null;
    for (const s of syms) { if (s !== 'wild' && s !== 'scatter') { base = s; break; } }
    if (!base) return;

    let cnt = 0;
    for (const s of syms) { if (s === base || s === 'wild') cnt++; else break; }
    if (cnt < 3) return;

    if (base === 'goldenfish' && cnt === 5) {
      wins.push({ payline: idx, sym: 'goldenfish', count: 5, mult: GOLDEN_JACKPOT_MULT, win: bet * GOLDEN_JACKPOT_MULT, name: 'GOLDEN FISH JACKPOT!', isJackpot: true });
      jackpot = true;
      return;
    }

    const mult = PAYOUTS[base]?.[cnt] || 0;
    if (mult > 0) wins.push({ payline: idx, sym: base, count: cnt, mult, win: bet * mult, name: `${cnt}× ${SYMBOLS.find(s=>s.id===base)?.name||base}` });
  });

  const baseWin = wins.reduce((s, w) => s + w.win, 0);
  const best    = wins.slice().sort((a, b) => b.win - a.win)[0] || null;

  return {
    baseWin, wins, jackpot, freeSpinsAwarded, scatterCount: sc,
    winPaylines: wins.map(w => w.payline).filter(p => p >= 0),
    type: wins.length > 1 ? `${wins.length} winning lines!` : (best?.name || null),
  };
}

// ── GET: jackpot livefeed ─────────────────────────────────────────────────
export async function GET() {
  const rows = await query(`
    SELECT g.detail, g.profit, g.bet, g.created_at, u.username, u.look
    FROM cms_gambling_log g
    JOIN users u ON u.id = g.user_id
    WHERE g.game = 'summer-slots' AND g.bet > 0 AND g.profit >= g.bet * 30
    ORDER BY g.created_at DESC
    LIMIT 5
  `).catch(() => []);
  return NextResponse.json({ jackpots: rows });
}

// ── POST: spin ────────────────────────────────────────────────────────────
export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const rl = await checkRateLimit(`summer-slots:${userId}`, 150, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too fast!', retryAfter: rl.retryAfter }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const bet          = safeInt(body.bet, 1, 10000);
  const freeSpinMode = !!body.freeSpinMode;

  if (!bet) return NextResponse.json({ error: 'Invalid bet (1–10,000)' }, { status: 400 });

  const user = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });
  if (!freeSpinMode && user.points < bet) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

  // Spin reels 1-5
  const reels = Array.from({ length: 5 }, () => [0, 1, 2].map(() => spinReel()));

  // Spin multiplier reel (reel 6)
  const activeMultiplier = spinMultiplier(freeSpinMode);
  const reel6            = buildMultiplierReel(activeMultiplier);

  // Calculate result
  const result = calcBaseWin(reels, bet, freeSpinMode);

  // Apply multiplier (golden fish jackpot bypasses multiplier reel)
  const effectiveMultiplier = result.jackpot ? 1 : activeMultiplier;
  const win    = result.baseWin * effectiveMultiplier;
  const profit = freeSpinMode ? win : win - bet;

  const upd = await query(
    'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
    [profit, userId, profit]
  );
  if (upd.affectedRows === 0) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

  try {
    await query(
      'INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
      [userId, 'summer-slots', freeSpinMode ? 0 : bet, profit, result.type || 'No win']
    );
  } catch {}

  // Log jackpots separately for livefeed
  if (result.jackpot && bet > 0) {
    try {
      await query(
        'INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
        [userId, 'summer-slots', bet, win, `GOLDEN FISH JACKPOT: ${win.toLocaleString()} diamonds`]
      );
    } catch {}
  }

  const updated = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);

  return NextResponse.json({
    ok: true,
    reels,
    reel6,
    activeMultiplier,
    effectiveMultiplier,
    baseWin: result.baseWin,
    win,
    profit,
    type: result.type,
    winPaylines: result.winPaylines,
    freeSpinsAwarded: result.freeSpinsAwarded,
    scatterCount: result.scatterCount,
    isJackpot: result.jackpot,
    balance: updated?.points ?? (user.points + profit),
  });
}

// ── PUT: event bonus credit (room events, etc.) ───────────────────────────
export async function PUT(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const amount = safeInt(body.amount, 0, 9999999);
  if (amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  await query('UPDATE users SET points = points + ? WHERE id = ?', [amount, userId]);
  const updated = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
  return NextResponse.json({ ok: true, balance: updated?.points || 0 });
}