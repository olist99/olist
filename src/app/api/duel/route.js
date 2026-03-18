export const dynamic = 'force-dynamic';
/**
 * Duel API — shared for Dice Duel & High Card (solo + multiplayer rooms)
 *
 * Run this SQL once:
 *   CREATE TABLE IF NOT EXISTS cms_duel_rooms (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     game_type ENUM('dice','highcard') NOT NULL,
 *     mode ENUM('2way','3way','4way') NOT NULL,
 *     bet INT NOT NULL,
 *     player1_id INT NOT NULL,
 *     player2_id INT DEFAULT NULL,
 *     player3_id INT DEFAULT NULL,
 *     player4_id INT DEFAULT NULL,
 *     status ENUM('waiting','done','cancelled') DEFAULT 'waiting',
 *     result JSON DEFAULT NULL,
 *     winner_id INT DEFAULT NULL,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *   );
 */
import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

function secureRandom(max) { return crypto.randomInt(0, max); }
function rollDie() { return secureRandom(6) + 1; }

const CARD_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['hearts','diamonds','clubs','spades'];
const RANK_VALUE = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
function drawCard() { return { rank: CARD_RANKS[secureRandom(13)], suit: SUITS[secureRandom(4)] }; }
function cardVal(c) { return RANK_VALUE[c.rank]; }

const VALID_GAMES = ['dice', 'highcard'];
const VALID_MODES = ['2way', '3way', '4way'];
const SLOTS_NEEDED = { '2way': 2, '3way': 3, '4way': 4 };

// ── GET: list open rooms + user's active room + recent results ──
export async function GET(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game');
  const mode = searchParams.get('mode');

  if (!VALID_GAMES.includes(game) || !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const [rooms, myActiveRoom, recentResults] = await Promise.all([
    query(`
      SELECT r.*,
        u1.username AS p1_name, u1.look AS p1_look,
        u2.username AS p2_name, u2.look AS p2_look,
        u3.username AS p3_name, u3.look AS p3_look,
        u4.username AS p4_name, u4.look AS p4_look
      FROM cms_duel_rooms r
      JOIN users u1 ON u1.id = r.player1_id
      LEFT JOIN users u2 ON u2.id = r.player2_id
      LEFT JOIN users u3 ON u3.id = r.player3_id
      LEFT JOIN users u4 ON u4.id = r.player4_id
      WHERE r.game_type = ? AND r.mode = ? AND r.status = 'waiting'
      ORDER BY r.created_at DESC LIMIT 20
    `, [game, mode]).catch(() => []),

    queryOne(`
      SELECT r.* FROM cms_duel_rooms r
      WHERE r.game_type = ? AND r.mode = ? AND r.status = 'waiting'
        AND (r.player1_id = ? OR r.player2_id = ? OR r.player3_id = ? OR r.player4_id = ?)
      LIMIT 1
    `, [game, mode, userId, userId, userId, userId]).catch(() => null),

    query(`
      SELECT r.*, uw.username AS winner_name
      FROM cms_duel_rooms r
      LEFT JOIN users uw ON uw.id = r.winner_id
      WHERE r.game_type = ? AND r.status = 'done'
        AND (r.player1_id = ? OR r.player2_id = ? OR r.player3_id = ? OR r.player4_id = ?)
        AND r.updated_at > DATE_SUB(NOW(), INTERVAL 3 MINUTE)
      ORDER BY r.updated_at DESC LIMIT 3
    `, [game, userId, userId, userId, userId]).catch(() => []),
  ]);

  return NextResponse.json({ rooms, myActiveRoom: myActiveRoom || null, recentResults, userId });
}

// ── POST: solo / create / join / cancel ──
export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, game } = body;
  if (!VALID_GAMES.includes(game)) return NextResponse.json({ error: 'Invalid game' }, { status: 400 });

  // ── SOLO ──
  if (action === 'solo') {
    const rl = checkRateLimit(`duel-solo:${userId}`, 20, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast!' }, { status: 429 });

    const bet = safeInt(body.bet, 1, 10000000);
    if (!bet) return NextResponse.json({ error: 'Invalid bet' }, { status: 400 });

    const user = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
    if (!user || user.points < bet) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

    let playerVal, dealerVal, playerDisplay, dealerDisplay, tries = 0;

    if (game === 'dice') {
      do {
        playerVal = rollDie();
        dealerVal = rollDie();
        playerDisplay = playerVal;
        dealerDisplay = dealerVal;
        tries++;
      } while (playerVal === dealerVal && tries < 20);
    } else {
      let pc, dc;
      do {
        pc = drawCard(); dc = drawCard();
        playerVal = cardVal(pc); dealerVal = cardVal(dc);
        playerDisplay = pc; dealerDisplay = dc;
        tries++;
      } while (playerVal === dealerVal && tries < 20);
    }

    const win = playerVal > dealerVal;
    const push = playerVal === dealerVal;
    const profit = push ? 0 : win ? bet : -bet;

    const upd = await query(
      'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
      [profit, userId, profit]
    );
    if (upd.affectedRows === 0) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

    try {
      const detail = game === 'dice'
        ? `${playerVal} vs ${dealerVal}`
        : `${playerDisplay.rank} vs ${dealerDisplay.rank}`;
      await query('INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
        [userId, game, bet, profit, detail]);
    } catch {}

    return NextResponse.json({
      ok: true, win, push, profit, tries,
      playerVal, dealerVal, playerDisplay, dealerDisplay,
      balance: user.points + profit,
    });
  }

  // ── CREATE ROOM ──
  if (action === 'create') {
    const rl = checkRateLimit(`duel-create:${userId}`, 5, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast!' }, { status: 429 });

    const mode = body.mode;
    if (!VALID_MODES.includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    const bet = safeInt(body.bet, 1, 10000000);
    if (!bet) return NextResponse.json({ error: 'Invalid bet' }, { status: 400 });

    const existing = await queryOne(
      'SELECT id FROM cms_duel_rooms WHERE game_type = ? AND status = ? AND (player1_id = ? OR player2_id = ? OR player3_id = ? OR player4_id = ?)',
      [game, 'waiting', userId, userId, userId, userId]
    ).catch(() => null);
    if (existing) return NextResponse.json({ error: 'You already have an open room' }, { status: 400 });

    const deduct = await query('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?', [bet, userId, bet]);
    if (deduct.affectedRows === 0) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

    await query('INSERT INTO cms_duel_rooms (game_type, mode, bet, player1_id) VALUES (?,?,?,?)',
      [game, mode, bet, userId]);

    return NextResponse.json({ ok: true });
  }

  // ── JOIN ROOM ──
  if (action === 'join') {
    const rl = checkRateLimit(`duel-join:${userId}`, 10, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast!' }, { status: 429 });

    const roomId = safeInt(body.roomId, 1);
    if (!roomId) return NextResponse.json({ error: 'Invalid room' }, { status: 400 });

    const room = await queryOne('SELECT * FROM cms_duel_rooms WHERE id = ? AND status = ?', [roomId, 'waiting']);
    if (!room) return NextResponse.json({ error: 'Room not available' }, { status: 400 });

    if ([room.player1_id, room.player2_id, room.player3_id, room.player4_id].includes(userId)) {
      return NextResponse.json({ error: 'Already in this room' }, { status: 400 });
    }

    const slotsNeeded = SLOTS_NEEDED[room.mode];
    const currentPlayers = [room.player1_id, room.player2_id, room.player3_id, room.player4_id].filter(Boolean);
    if (currentPlayers.length >= slotsNeeded) return NextResponse.json({ error: 'Room is full' }, { status: 400 });

    const slotCol = !room.player2_id ? 'player2_id' : !room.player3_id ? 'player3_id' : 'player4_id';
    const isLast = (currentPlayers.length + 1) === slotsNeeded;

    const deduct = await query('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?', [room.bet, userId, room.bet]);
    if (deduct.affectedRows === 0) return NextResponse.json({ error: 'NOT_ENOUGH' }, { status: 400 });

    const claim = await query(
      `UPDATE cms_duel_rooms SET ${slotCol} = ? WHERE id = ? AND ${slotCol} IS NULL AND status = 'waiting'`,
      [userId, roomId]
    );
    if (claim.affectedRows === 0) {
      await query('UPDATE users SET points = points + ? WHERE id = ?', [room.bet, userId]);
      return NextResponse.json({ error: 'Room no longer available' }, { status: 400 });
    }

    if (!isLast) {
      return NextResponse.json({ ok: true, waiting: true });
    }

    // Last player joined — resolve now
    const allPlayerIds = [...currentPlayers, userId];
    const { rolls, winnerId } = resolveMulti(allPlayerIds, room.game_type);
    const pot = room.bet * slotsNeeded;

    await query('UPDATE users SET points = points + ? WHERE id = ?', [pot, winnerId]);

    const resultData = {
      players: allPlayerIds.map((pid, i) => ({ userId: pid, roll: rolls[i] })),
      winnerId,
    };

    await query('UPDATE cms_duel_rooms SET winner_id = ?, result = ?, status = ? WHERE id = ?',
      [winnerId, JSON.stringify(resultData), 'done', roomId]);

    for (const pid of allPlayerIds) {
      const profit = pid === winnerId ? pot - room.bet : -room.bet;
      try {
        await query('INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
          [pid, room.game_type, room.bet, profit, `${room.mode} room #${roomId}`]);
      } catch {}
    }

    const balRow = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
    return NextResponse.json({
      ok: true, resolved: true, winnerId,
      isWinner: winnerId === userId, pot,
      players: resultData.players,
      balance: balRow?.points,
    });
  }

  // ── CANCEL ──
  if (action === 'cancel') {
    const roomId = safeInt(body.roomId, 1);
    if (!roomId) return NextResponse.json({ error: 'Invalid room' }, { status: 400 });

    const room = await queryOne(
      'SELECT * FROM cms_duel_rooms WHERE id = ? AND player1_id = ? AND status = ?',
      [roomId, userId, 'waiting']
    );
    if (!room) return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 });
    if (room.player2_id) return NextResponse.json({ error: 'Cannot cancel — others have joined' }, { status: 400 });

    await query('UPDATE users SET points = points + ? WHERE id = ?', [room.bet, userId]);
    await query('UPDATE cms_duel_rooms SET status = ? WHERE id = ?', ['cancelled', roomId]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Roll dice or draw cards for all players until a unique winner is found
function resolveMulti(playerIds, gameType) {
  for (let attempt = 0; attempt < 50; attempt++) {
    let rolls;
    if (gameType === 'dice') {
      rolls = playerIds.map(() => { const d1 = rollDie(), d2 = rollDie(); return { d1, d2, total: d1 + d2 }; });
    } else {
      rolls = playerIds.map(() => { const c1 = drawCard(), c2 = drawCard(); return { c1, c2, total: cardVal(c1) + cardVal(c2) }; });
    }
    const maxTotal = Math.max(...rolls.map(r => r.total));
    const winnerIdxs = rolls.reduce((acc, r, i) => r.total === maxTotal ? [...acc, i] : acc, []);
    if (winnerIdxs.length === 1) return { rolls, winnerId: playerIds[winnerIdxs[0]] };
  }
  // Fallback
  const rolls = playerIds.map(() => gameType === 'dice'
    ? (() => { const d1 = rollDie(), d2 = rollDie(); return { d1, d2, total: d1 + d2 }; })()
    : (() => { const c1 = drawCard(), c2 = drawCard(); return { c1, c2, total: cardVal(c1) + cardVal(c2) }; })()
  );
  return { rolls, winnerId: playerIds[0] };
}
