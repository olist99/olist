import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/tokens/expire-vip
//
// Call this on a schedule to expire VIP ranks when their time is up.
//
// Easy setup options:
//   1. Cron job:  */5 * * * * curl -s https://yourhotel.com/api/tokens/expire-vip?key=YOUR_CRON_KEY
//   2. Vercel Cron (vercel.json):  { "crons": [{ "path": "/api/tokens/expire-vip", "schedule": "*/5 * * * *" }] }
//   3. GitHub Actions scheduled workflow hitting this URL
//
// Add CRON_SECRET to your .env to protect this endpoint.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Optional: protect with a secret key
  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all expired VIP subscriptions
  const expired = await query(
    `SELECT v.*, u.username
     FROM cms_vip_subscriptions v
     LEFT JOIN users u ON u.id = v.user_id
     WHERE v.expires_at <= NOW()`
  ).catch(() => []);

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  let reverted = 0;
  for (const sub of expired) {
    // Restore the previous rank
    await query(
      'UPDATE users SET `rank` = ? WHERE id = ? AND `rank` = ?',
      [sub.prev_rank, sub.user_id, sub.vip_rank]
    );
    // Remove the subscription record
    await query('DELETE FROM cms_vip_subscriptions WHERE id = ?', [sub.id]);
    reverted++;

    console.log(`VIP expired: ${sub.username} (#${sub.user_id}) → restored to rank ${sub.prev_rank}`);
  }

  return NextResponse.json({ ok: true, expired: reverted });
}
