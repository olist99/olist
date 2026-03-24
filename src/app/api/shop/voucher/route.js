import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, checkRateLimit } from '@/lib/security';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const code = sanitizeText((body.code || '').trim().toUpperCase(), 32);
  if (!code) return NextResponse.json({ error: 'Enter a voucher code' }, { status: 400 });

  const rl = await checkRateLimit(`voucher:${user.id}`, 5, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 });

  const voucher = await queryOne(
    "SELECT * FROM cms_vouchers WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > NOW())",
    [code]
  );
  if (!voucher) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });

  if (voucher.max_uses > 0 && voucher.uses_count >= voucher.max_uses) {
    return NextResponse.json({ error: 'This voucher has been fully redeemed' }, { status: 400 });
  }

  const already = await queryOne(
    'SELECT id FROM cms_voucher_redemptions WHERE voucher_id = ? AND user_id = ?',
    [voucher.id, user.id]
  );
  if (already) return NextResponse.json({ error: 'You have already redeemed this code' }, { status: 400 });

  const updates = [];
  const vals = [];
  if (voucher.give_credits > 0) { updates.push('credits = credits + ?');      vals.push(voucher.give_credits); }
  if (voucher.give_pixels > 0)  { updates.push('pixels = pixels + ?');        vals.push(voucher.give_pixels); }
  if (voucher.give_points > 0)  { updates.push('points = points + ?');        vals.push(voucher.give_points); }
  if (voucher.give_tokens > 0)  { updates.push('shop_tokens = shop_tokens + ?'); vals.push(voucher.give_tokens); }

  if (updates.length > 0) {
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...vals, user.id]);
  }
  if (voucher.give_badge) {
    const exists = await queryOne('SELECT id FROM users_badges WHERE user_id = ? AND badge_code = ?', [user.id, voucher.give_badge]);
    if (!exists) await query('INSERT INTO users_badges (user_id, badge_code) VALUES (?, ?)', [user.id, voucher.give_badge]);
  }

  await query('INSERT INTO cms_voucher_redemptions (voucher_id, user_id) VALUES (?, ?)', [voucher.id, user.id]);
  await query('UPDATE cms_vouchers SET uses_count = uses_count + 1 WHERE id = ?', [voucher.id]);

  const rewards = [];
  if (voucher.give_credits > 0) rewards.push(`${voucher.give_credits.toLocaleString()} credits`);
  if (voucher.give_pixels > 0)  rewards.push(`${voucher.give_pixels.toLocaleString()} duckets`);
  if (voucher.give_points > 0)  rewards.push(`${voucher.give_points.toLocaleString()} diamonds`);
  if (voucher.give_badge)        rewards.push(`badge: ${voucher.give_badge}`);
  if (voucher.give_tokens > 0)  rewards.push(`${voucher.give_tokens.toLocaleString()} tokens`);

  return NextResponse.json({ ok: true, rewards: rewards.join(', '), message: voucher.message || '' });
}
