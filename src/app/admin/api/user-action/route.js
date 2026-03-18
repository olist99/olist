import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, sanitizeText, oneOf, checkRateLimit } from '@/lib/security';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Rate limit admin actions: 30/min
  const rl = checkRateLimit(`admin-action:${user.id}`, 30, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const targetUserId = safeInt(body.userId, 1);
  const action = oneOf(body.action, [
    'give_credits', 'give_pixels', 'give_points',
    'set_rank', 'set_motto', 'ban'
  ]);

  if (!targetUserId || !action) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
  }

  // Prevent self-targeting for dangerous actions
  if (['set_rank', 'ban'].includes(action) && targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot target yourself' }, { status: 400 });
  }

  // Verify target exists and check rank hierarchy
  const target = await queryOne('SELECT id, `rank` FROM users WHERE id = ?', [targetUserId]);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Cannot target users of equal or higher rank
  if (target.rank >= user.rank && ['set_rank', 'ban', 'set_motto'].includes(action)) {
    return NextResponse.json({ error: 'Cannot target users of equal or higher rank' }, { status: 403 });
  }

  try {
    switch (action) {
      case 'give_credits': {
        const amt = safeInt(body.amount, 1, 10000000);
        if (!amt) return NextResponse.json({ error: 'Invalid amount (1-10,000,000)' }, { status: 400 });
        await query('UPDATE users SET credits = credits + ? WHERE id = ?', [amt, targetUserId]);
        break;
      }
      case 'give_pixels': {
        const amt = safeInt(body.amount, 1, 10000000);
        if (!amt) return NextResponse.json({ error: 'Invalid amount (1-10,000,000)' }, { status: 400 });
        await query('UPDATE users SET pixels = pixels + ? WHERE id = ?', [amt, targetUserId]);
        break;
      }
      case 'give_points': {
        const amt = safeInt(body.amount, 1, 10000000);
        if (!amt) return NextResponse.json({ error: 'Invalid amount (1-10,000,000)' }, { status: 400 });
        await query('UPDATE users SET points = points + ? WHERE id = ?', [amt, targetUserId]);
        break;
      }
      case 'set_rank': {
        if (user.rank < 6) return NextResponse.json({ error: 'Rank 6+ required' }, { status: 403 });
        const newRank = safeInt(body.rank, 1, 7);
        if (!newRank) return NextResponse.json({ error: 'Invalid rank (1-7)' }, { status: 400 });
        if (newRank >= user.rank) return NextResponse.json({ error: 'Cannot set rank >= your own' }, { status: 403 });
        await query('UPDATE users SET `rank` = ? WHERE id = ?', [newRank, targetUserId]);
        break;
      }
      case 'set_motto': {
        if (user.rank < 6) return NextResponse.json({ error: 'Rank 6+ required' }, { status: 403 });
        const motto = sanitizeText(body.motto || '', 127);
        await query('UPDATE users SET motto = ? WHERE id = ?', [motto, targetUserId]);
        break;
      }
      case 'ban': {
        if (user.rank < 5) return NextResponse.json({ error: 'Rank 5+ required' }, { status: 403 });
        await query('UPDATE users SET `rank` = 0, online = 0 WHERE id = ?', [targetUserId]);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin action error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
