export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) return null;
  return user;
}

export async function GET(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  // ── Suspicious credit activity: users who gained large credits fast ──
  if (type === 'credit_abuse') {
    const rows = await query(`
      SELECT u.id, u.username, u.credits, u.ip_register, u.ip_current,
             u.account_created, u.last_online,
             (SELECT COUNT(*) FROM users u2 WHERE u2.ip_register = u.ip_register) AS ip_accounts
      FROM users u
      WHERE u.credits > (SELECT AVG(credits) * 10 FROM users WHERE credits > 0)
      ORDER BY u.credits DESC
      LIMIT 30
    `).catch(() => []);
    return NextResponse.json({ rows });
  }

  // ── Alt farming: multiple accounts from same IP ──
  if (type === 'alt_farming') {
    const rows = await query(`
      SELECT ip_register, COUNT(*) AS account_count,
             GROUP_CONCAT(username ORDER BY id ASC SEPARATOR ', ') AS usernames,
             SUM(credits) AS total_credits,
             SUM(pixels) AS total_pixels,
             MAX(last_online) AS last_seen
      FROM users
      WHERE ip_register IS NOT NULL AND ip_register != '' AND ip_register != '127.0.0.1'
      GROUP BY ip_register
      HAVING account_count > 2
      ORDER BY account_count DESC
      LIMIT 50
    `).catch(() => []);
    return NextResponse.json({ rows });
  }

  // ── Economy heatmap: where credits are going ──
  if (type === 'economy') {
    const [shopSpend, marketSpend, gamblingSpend, gamblingWin, totalCredits, topHolders] = await Promise.all([
      query("SELECT SUM(price) AS total FROM cms_shop_purchases WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)").catch(() => [{ total: 0 }]),
      query("SELECT SUM(price) AS total FROM cms_marketplace WHERE status = 'sold' AND sold_at > DATE_SUB(NOW(), INTERVAL 30 DAY)").catch(() => [{ total: 0 }]),
      query("SELECT SUM(bet) AS total FROM cms_gambling_log WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)").catch(() => [{ total: 0 }]),
      query("SELECT SUM(GREATEST(profit,0)) AS total FROM cms_gambling_log WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)").catch(() => [{ total: 0 }]),
      query("SELECT SUM(credits) AS total FROM users").catch(() => [{ total: 0 }]),
      query("SELECT id, username, credits, pixels, points FROM users ORDER BY credits DESC LIMIT 10").catch(() => []),
    ]);

    // Daily credit flow last 14 days
    const dailyGambling = await query(`
      SELECT DATE(created_at) AS day,
             SUM(bet) AS wagered,
             SUM(GREATEST(profit, 0)) AS won,
             SUM(LEAST(profit, 0)) AS lost
      FROM cms_gambling_log
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `).catch(() => []);

    return NextResponse.json({
      shopSpend: shopSpend[0]?.total || 0,
      marketSpend: marketSpend[0]?.total || 0,
      gamblingWagered: gamblingSpend[0]?.total || 0,
      gamblingWon: gamblingWin[0]?.total || 0,
      totalCredits: totalCredits[0]?.total || 0,
      topHolders,
      dailyGambling,
    });
  }

  // ── Item duplication detector ──
  if (type === 'duplication') {
    // Items that appear to be in multiple users' inventories that shouldn't be
    // Detect items with suspiciously high counts per base item
    const highCount = await query(`
      SELECT ib.id AS base_id, ib.public_name, ib.item_name,
             COUNT(i.id) AS total_copies,
             COUNT(DISTINCT i.user_id) AS owner_count,
             GROUP_CONCAT(DISTINCT u.username ORDER BY i.id ASC SEPARATOR ', ') AS owners
      FROM items i
      JOIN items_base ib ON ib.id = i.item_id
      JOIN users u ON u.id = i.user_id
      WHERE i.user_id > 0
      GROUP BY ib.id
      HAVING total_copies > 10
      ORDER BY total_copies DESC
      LIMIT 30
    `).catch(() => []);

    // Users with an unusually high total item count
    const itemHoarders = await query(`
      SELECT u.id, u.username, u.ip_register, COUNT(i.id) AS item_count, u.credits
      FROM items i
      JOIN users u ON u.id = i.user_id
      WHERE i.user_id > 0 AND i.room_id >= 0
      GROUP BY i.user_id
      HAVING item_count > (SELECT AVG(cnt) * 15 FROM (SELECT COUNT(*) AS cnt FROM items WHERE user_id > 0 GROUP BY user_id) t)
      ORDER BY item_count DESC
      LIMIT 20
    `).catch(() => []);

    return NextResponse.json({ highCount, itemHoarders });
  }

  // ── Recent user activity overview ──
  if (type === 'overview') {
    const [newUsers, activeToday, bannedUsers, recentRichGain] = await Promise.all([
      query("SELECT COUNT(*) AS c FROM users WHERE account_created > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY))").catch(() => [{ c: 0 }]),
      query("SELECT COUNT(*) AS c FROM users WHERE online = '1' OR last_online > DATE_SUB(NOW(), INTERVAL 24 HOUR)").catch(() => [{ c: 0 }]),
      query("SELECT COUNT(*) AS c FROM users WHERE `rank` = 0").catch(() => [{ c: 0 }]),
      query(`
        SELECT u.id, u.username, u.credits, u.ip_register,
               (SELECT COUNT(*) FROM users u2 WHERE u2.ip_register = u.ip_register) AS shared_ip
        FROM users u
        WHERE u.credits > 50000
        ORDER BY u.credits DESC LIMIT 10
      `).catch(() => []),
    ]);
    return NextResponse.json({
      newUsers: newUsers[0]?.c || 0,
      activeToday: activeToday[0]?.c || 0,
      bannedUsers: bannedUsers[0]?.c || 0,
      recentRichGain,
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
