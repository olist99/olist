import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt } from '@/lib/security';

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.action === 'vote') {
    const pollId = safeInt(body.poll_id, 1);
    const optionId = safeInt(body.option_id, 1);
    if (!pollId || !optionId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const poll = await queryOne(
      "SELECT * FROM cms_polls WHERE id = ? AND active = 1 AND is_open = 1 AND (expires_at IS NULL OR expires_at > NOW())",
      [pollId]
    );
    if (!poll) return NextResponse.json({ error: 'Poll not found or closed' }, { status: 404 });

    const option = await queryOne('SELECT id FROM cms_poll_options WHERE id = ? AND poll_id = ?', [optionId, pollId]);
    if (!option) return NextResponse.json({ error: 'Invalid option' }, { status: 400 });

    const alreadyVoted = await queryOne('SELECT id FROM cms_poll_votes WHERE poll_id = ? AND user_id = ?', [pollId, userId]);
    if (alreadyVoted) return NextResponse.json({ error: 'Already voted' }, { status: 400 });

    await query('INSERT INTO cms_poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)', [pollId, optionId, userId]);

    // Return updated results
    const options = await query(`
      SELECT o.*, COUNT(v.id) AS vote_count,
        MAX(CASE WHEN v.user_id = ? THEN 1 ELSE 0 END) AS user_picked
      FROM cms_poll_options o
      LEFT JOIN cms_poll_votes v ON v.option_id = o.id
      WHERE o.poll_id = ?
      GROUP BY o.id ORDER BY o.sort_order ASC, o.id ASC
    `, [userId, pollId]);

    const total_votes = options.reduce((s, o) => s + Number(o.vote_count), 0);
    return NextResponse.json({ ok: true, options, total_votes });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
