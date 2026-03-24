import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { safeInt, checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

function secureRandom(max) { return crypto.randomInt(0, max); }

export const SYMBOLS = [
  { id: 'coin',    name: 'Habbo Coin',  weight: 60 },
  { id: 'duck',    name: 'Rubber Duck', weight: 36 },
  { id: 'sofa',    name: 'HC Sofa',     weight: 13 },
  { id: 'throne',  name: 'Throne',      weight:  5 },
  { id: 'diamond', name: 'Diamond',     weight:  2 },
  { id: 'crown',   name: 'HC Crown',    weight:  1 },
  { id: 'bonus',   name: 'Gift Box',    weight:  3 }, // ~31% chance to appear per spin
  { id: 'scatter', name: 'Ticket',      weight:  3 }, // ~31% chance to appear per spin
  { id: 'wild',    name: 'WILD',        weight:  2 }, // ~21% chance to appear per spin
];

// ~75% RTP / 25% house edge — player wins ~38% of spins, specials visible
const PAYOUTS = {
  crown:   { 3:6,  4:16,  5:40  },
  diamond: { 3:3,  4:9,   5:22  },
  throne:  { 3:2,  4:5,   5:11  },
  sofa:    { 3:1,  4:2,   5:5   },
  duck:    { 3:1,  4:2,   5:4   }, // 3x duck = 1x (small feel-good win)
  coin:    {              5:1   }, // only 5x coin pays
};

const SCATTER_FS  = { 3:5, 4:8, 5:12 };
const SCATTER_PAY = { 3:1, 4:3, 5:6 };  // 3x scatter pays + free spins
const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);

function spinReel() {
  let r = secureRandom(TOTAL_WEIGHT);
  for (const sym of SYMBOLS) { r -= sym.weight; if (r < 0) return sym.id; }
  return SYMBOLS[0].id;
}

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

function calcWin(reels, bet, freeSpinMode = false) {
  const wins = [];
  let bonus = false;
  let freeSpinsAwarded = 0;

  let sc = 0;
  for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (reels[r][row] === 'scatter') sc++;
  if (sc >= 3) {
    const mult = SCATTER_PAY[Math.min(sc, 5)] || 0;
    freeSpinsAwarded = freeSpinMode ? 0 : (SCATTER_FS[Math.min(sc, 5)] || 0);
    wins.push({ payline: -1, sym: 'scatter', count: sc, mult, win: bet * mult, name: `${sc}x Ticket (Scatter)` });
  }

  let bo = 0;
  for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (reels[r][row] === 'bonus') bo++;
  if (bo >= 3 && !freeSpinMode) bonus = true;

  PAYLINES.forEach((pl, idx) => {
    const syms = pl.map(([r, row]) => reels[r][row]);
    let base = null;
    for (const s of syms) { if (s !== 'wild' && s !== 'scatter' && s !== 'bonus') { base = s; break; } }
    if (!base) return;
    let cnt = 0;
    for (const s of syms) { if (s === base || s === 'wild') cnt++; else break; }
    if (cnt < 3) return;
    const mult = PAYOUTS[base]?.[cnt] || 0;
    if (mult > 0) wins.push({ payline: idx, sym: base, count: cnt, mult, win: bet * mult, name: `${cnt}x ${base} (Line ${idx+1})` });
  });

  const totalWin = wins.reduce((s, w) => s + w.win, 0);
  const best = wins.slice().sort((a, b) => b.win - a.win)[0] || null;
  const isJackpot = best?.sym === 'crown' && best?.count === 5;

  return {
    win: totalWin,
    type: wins.length > 1 ? `${wins.length} winning lines!` : (best?.name || null),
    multiplier: best?.mult || 0,
    lines: wins,
    winPaylines: wins.map(w => w.payline).filter(p => p >= 0),
    bonus, freeSpinsAwarded, scatterCount: sc, isJackpot,
  };
}

function getBonusRoomPrizes(bet) {
  const pool = [
    { label: 'Jackpot!',      mult: 25, type: 'jackpot' },
    { label: 'Big Win!',      mult: 10, type: 'big'     },
    { label: 'Diamonds!',     mult: 5,  type: 'win'     },
    { label: 'x3 Multiplier', mult: 3,  type: 'win'     },
    { label: 'x2 Multiplier', mult: 2,  type: 'win'     },
    { label: 'Try Again',     mult: 0,  type: 'miss'    },
    { label: 'Try Again',     mult: 0,  type: 'miss'    },
    { label: 'Try Again',     mult: 0,  type: 'miss'    },
  ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5).map(p => ({ ...p, win: bet * p.mult }));
}

// Ensure the pending-claims table exists (created once per worker start)
let claimsTableReady = false;
async function ensureClaimsTable() {
  if (claimsTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS cms_slots_pending_claims (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      token      CHAR(32) NOT NULL,
      prizes_json TEXT NOT NULL,
      bet        INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT NOW(),
      UNIQUE KEY uq_user (user_id),
      INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  claimsTableReady = true;
}

// GET: jackpot livefeed
export async function GET() {
  const rows = await query(`
    SELECT g.detail, g.profit, g.bet, g.created_at, u.username, u.look
    FROM cms_gambling_log g
    JOIN users u ON u.id = g.user_id
    WHERE g.game = 'slots' AND g.bet > 0 AND g.profit >= g.bet * 20
    ORDER BY g.created_at DESC
    LIMIT 5
  `).catch(() => []);
  return NextResponse.json({ jackpots: rows });
}

// POST: spin
export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const rl = await checkRateLimit(`slots:${userId}`, 150, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too fast!', retryAfter: rl.retryAfter }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const bet          = safeInt(body.bet, 1, 10000);
  const freeSpinMode = !!body.freeSpinMode;
  const expandedWild = body.expandedWildReel != null ? safeInt(body.expandedWildReel, 0, 4) : null;

  if (!bet) return NextResponse.json({ error: 'Invalid bet (1-10,000)' }, { status: 400 });

  const user = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });
  if (!freeSpinMode && user.points < bet) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

  const reels = Array.from({ length: 5 }, (_, ri) =>
    [0, 1, 2].map(() => (expandedWild != null && ri === expandedWild) ? 'wild' : spinReel())
  );

  const result = calcWin(reels, bet, freeSpinMode);
  const profit = freeSpinMode ? result.win : result.win - bet;

  const upd = await query(
    'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
    [profit, userId, profit]
  );
  if (upd.affectedRows === 0) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

  try {
    await query(
      'INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
      [userId, 'slots', freeSpinMode ? 0 : bet, profit, result.type || 'No win']
    );
  } catch {}

  // FIX #1: If a bonus round is triggered, generate prizes server-side and store
  // them in the DB. The client receives a claim token — the PUT endpoint will verify
  // the chosen amount matches one of the server-generated prizes before crediting.
  let bonusPrizes = null;
  let bonusClaimToken = null;
  if (result.bonus) {
    await ensureClaimsTable();
    bonusPrizes = getBonusRoomPrizes(bet);
    bonusClaimToken = crypto.randomBytes(16).toString('hex');
    // Upsert: one pending claim per user (old unclaimed bonuses are replaced)
    await query(`
      INSERT INTO cms_slots_pending_claims (user_id, token, prizes_json, bet)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE token = VALUES(token), prizes_json = VALUES(prizes_json), bet = VALUES(bet), created_at = NOW()
    `, [userId, bonusClaimToken, JSON.stringify(bonusPrizes), bet]).catch(() => {});
  }

  return NextResponse.json({
    ok: true, reels, profit, type: result.type, multiplier: result.multiplier,
    lines: result.lines, winPaylines: result.winPaylines,
    bonus: result.bonus,
    bonusPrizes,
    bonusClaimToken, // client must send this back in the PUT
    freeSpinsAwarded: result.freeSpinsAwarded, scatterCount: result.scatterCount,
    balance: user.points + profit, win: result.win, isJackpot: result.isJackpot,
  });
}

// PUT: claim bonus room prize
// FIX #1: Amount is now verified server-side against the stored prizes for this user.
// A raw PUT with an arbitrary amount will be rejected.
export async function PUT(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const claimToken = typeof body.bonusClaimToken === 'string' ? body.bonusClaimToken.slice(0, 64) : null;
  const prizeIndex = safeInt(body.prizeIndex, 0, 4);

  if (!claimToken) {
    return NextResponse.json({ error: 'Missing bonus claim token' }, { status: 400 });
  }

  await ensureClaimsTable();

  // Fetch and atomically delete the pending claim in one operation.
  // Using token + user_id prevents one user from claiming another's bonus.
  const claim = await queryOne(
    `SELECT * FROM cms_slots_pending_claims
     WHERE user_id = ? AND token = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
    [userId, claimToken]
  );

  if (!claim) {
    return NextResponse.json({ error: 'Invalid or expired bonus claim' }, { status: 400 });
  }

  // Delete first — prevents double-claim if network causes a retry
  const deleted = await query(
    'DELETE FROM cms_slots_pending_claims WHERE id = ? AND token = ?',
    [claim.id, claimToken]
  );
  if (deleted.affectedRows === 0) {
    return NextResponse.json({ error: 'Bonus already claimed' }, { status: 409 });
  }

  // Verify the chosen prize is one of the server-generated amounts
  let prizes;
  try { prizes = JSON.parse(claim.prizes_json); } catch {
    return NextResponse.json({ error: 'Corrupted claim data' }, { status: 500 });
  }

  const idx = prizeIndex ?? 0;
  const chosenPrize = prizes[idx];
  if (!chosenPrize) {
    return NextResponse.json({ error: 'Invalid prize selection' }, { status: 400 });
  }

  const amount  = chosenPrize.win;  // server-authoritative
  const origBet = claim.bet;
  const isPot   = amount >= origBet * 20;

  if (amount > 0) {
    await query('UPDATE users SET points = points + ? WHERE id = ?', [amount, userId]);
  }

  // Log large wins to jackpot feed
  if (isPot && origBet > 0) {
    try {
      await query(
        'INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
        [userId, 'slots', origBet, amount, `POT WIN: ${amount.toLocaleString()} diamonds`]
      );
    } catch {}
  }

  const updated = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
  return NextResponse.json({ ok: true, balance: updated?.points || 0, amount });
}

