export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Return recent gambling activity
export async function GET(request) {
  const url = new URL(request.url);
  const after = parseInt(url.searchParams.get('after') || '0');

  // Get recent results from the log table
  let where = '';
  let params = [];
  if (after > 0) {
    where = 'WHERE gl.id > ?';
    params = [after];
  }

  const feed = await query(`
    SELECT gl.*, u.username, u.look
    FROM cms_gambling_log gl
    JOIN users u ON u.id = gl.user_id
    ${where}
    ORDER BY gl.id DESC
    LIMIT 30
  `, params).catch(() => []);

  // Leaderboard: most profit all time by game
  const leaderboard = await query(`
    SELECT user_id, u.username, u.look, game,
           SUM(profit) AS total_profit,
           COUNT(*) AS total_bets,
           SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) AS wins
    FROM cms_gambling_log gl
    JOIN users u ON u.id = gl.user_id
    WHERE game != 'cases'
    GROUP BY user_id, game
    HAVING total_profit > 0
    ORDER BY total_profit DESC
    LIMIT 30
  `).catch(() => []);

  return NextResponse.json({ feed, leaderboard });
}
