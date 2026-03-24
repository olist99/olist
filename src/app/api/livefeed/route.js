import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'feed';
  const since = parseInt(url.searchParams.get('since')) || 0;

  try {
    if (type === 'feed') {
      const feed = await query(`
        SELECT g.id, g.user_id, g.game, g.bet, g.profit, g.detail,
               TIMESTAMPDIFF(SECOND, g.created_at, NOW()) AS seconds_ago,
               u.username, u.look
        FROM cms_gambling_log g
        JOIN users u ON u.id = g.user_id
        ORDER BY g.created_at DESC
        LIMIT 20
      `);
      return NextResponse.json({ feed });
    }

    if (type === 'leaderboard') {
      const period = url.searchParams.get('period') || 'all';
      let dateFilter = '';
      if (period === 'today') dateFilter = "AND g.created_at >= CURDATE()";
      else if (period === 'week') dateFilter = "AND g.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      else if (period === 'month') dateFilter = "AND g.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

      const leaders = await query(`
        SELECT g.user_id, u.username, u.look,
          SUM(CASE WHEN g.profit > 0 THEN 1 ELSE 0 END) AS wins,
          COUNT(*) AS total_bets,
          SUM(g.profit) AS total_profit,
          SUM(g.bet) AS total_wagered
        FROM cms_gambling_log g
        JOIN users u ON u.id = g.user_id
        WHERE g.game != 'case-open' ${dateFilter}
        GROUP BY g.user_id
        ORDER BY total_profit DESC
        LIMIT 20
      `);
      return NextResponse.json({ leaders });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
