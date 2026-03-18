export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

function secureRandom(max) { return crypto.randomInt(0, max); }

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Get waiting battles + recently completed (last 2 min)
  const battles = await query(`
    SELECT b.*, 
           c.username AS creator_name, c.look AS creator_look,
           o.username AS opponent_name, o.look AS opponent_look,
           w.username AS winner_name
    FROM cms_coinflip_battles b
    JOIN users c ON c.id = b.creator_id
    LEFT JOIN users o ON o.id = b.opponent_id
    LEFT JOIN users w ON w.id = b.winner_id
    WHERE b.status = 'waiting' 
       OR (b.status = 'done' AND b.created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE))
    ORDER BY b.status ASC, b.created_at DESC
    LIMIT 20
  `).catch(() => []);

  return NextResponse.json({ battles, userId });
}

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;

  // Create battle
  if (action === 'create') {
    const rl = checkRateLimit(`battle-create:${userId}`, 5, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast!' }, { status: 429 });

    const amount = safeInt(body.amount, 1, 10000000);
    if (!amount) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    const choice = body.choice === 'tails' ? 'tails' : 'heads';

    // Atomic deduct
    const deduct = await query('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?', [amount, userId, amount]);
    if (deduct.affectedRows === 0) return NextResponse.json({ error: 'Not enough diamonds' }, { status: 400 });

    const user = await queryOne('SELECT username FROM users WHERE id = ?', [userId]);

    await query('INSERT INTO cms_coinflip_battles (creator_id, bet, creator_choice, status) VALUES (?,?,?,?)',
      [userId, amount, choice, 'waiting']);

    return NextResponse.json({ ok: true });
  }

  // Accept battle
  if (action === 'accept') {
    const rl = checkRateLimit(`battle-accept:${userId}`, 10, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast!' }, { status: 429 });

    const battleId = safeInt(body.battleId, 1);
    if (!battleId) return NextResponse.json({ error: 'Invalid battle' }, { status: 400 });

    // Atomic claim the battle
    const claim = await query(
      'UPDATE cms_coinflip_battles SET opponent_id = ?, status = ? WHERE id = ? AND status = ? AND creator_id != ?',
      [userId, 'flipping', battleId, 'waiting', userId]
    );
    if (claim.affectedRows === 0) return NextResponse.json({ error: 'Battle unavailable' }, { status: 400 });

    const battle = await queryOne('SELECT * FROM cms_coinflip_battles WHERE id = ?', [battleId]);
    if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 400 });

    // Deduct from opponent
    const deduct = await query('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?',
      [battle.bet, userId, battle.bet]);
    if (deduct.affectedRows === 0) {
      // Refund creator and cancel
      await query('UPDATE users SET points = points + ? WHERE id = ?', [battle.bet, battle.creator_id]);
      await query('UPDATE cms_coinflip_battles SET status = ? WHERE id = ?', ['cancelled', battleId]);
      return NextResponse.json({ error: 'Not enough diamonds' }, { status: 400 });
    }

    // Flip the coin
    const flipResult = secureRandom(2) === 0 ? 'heads' : 'tails';
    const winnerId = flipResult === battle.creator_choice ? battle.creator_id : userId;
    const totalPot = battle.bet * 2;

    // Pay winner
    await query('UPDATE users SET points = points + ? WHERE id = ?', [totalPot, winnerId]);
    await query('UPDATE cms_coinflip_battles SET result = ?, winner_id = ?, status = ? WHERE id = ?',
      [flipResult, winnerId, 'done', battleId]);

    // Log both players
    const loserId = winnerId === battle.creator_id ? userId : battle.creator_id;
    try {
      await query('INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
        [winnerId, 'coinflip-battle', battle.bet, battle.bet, `Won vs battle #${battleId}`]);
      await query('INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
        [loserId, 'coinflip-battle', battle.bet, -battle.bet, `Lost vs battle #${battleId}`]);
    } catch {}

    const winner = await queryOne('SELECT username, look, points FROM users WHERE id = ?', [winnerId]);
    const loser = await queryOne('SELECT username, look, points FROM users WHERE id = ?', [loserId]);

    return NextResponse.json({
      ok: true, flip: flipResult, winnerId, pot: totalPot,
      winner: { id: winnerId, username: winner?.username, look: winner?.look },
      loser: { id: loserId, username: loser?.username, look: loser?.look },
      yourBalance: userId === winnerId ? winner?.points : loser?.points,
    });
  }

  // Cancel own battle
  if (action === 'cancel') {
    const battleId = safeInt(body.battleId, 1);
    if (!battleId) return NextResponse.json({ error: 'Invalid battle' }, { status: 400 });

    const battle = await queryOne('SELECT * FROM cms_coinflip_battles WHERE id = ? AND creator_id = ? AND status = ?',
      [battleId, userId, 'waiting']);
    if (!battle) return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 });

    await query('UPDATE users SET points = points + ? WHERE id = ?', [battle.bet, userId]);
    await query('DELETE FROM cms_coinflip_battles WHERE id = ?', [battleId]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
