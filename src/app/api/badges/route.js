export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const rl = checkRateLimit(`badge:${userId}`, 5, 300000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many badges. Wait a few minutes.' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { imageData } = body;
  if (!imageData || typeof imageData !== 'string') return NextResponse.json({ error: 'Missing image data' }, { status: 400 });

  // Validate: must be a data URL (PNG or GIF) and max ~100KB
  if (!imageData.startsWith('data:image/') || imageData.length > 150000) {
    return NextResponse.json({ error: 'Invalid image. Must be PNG or GIF, max 100KB' }, { status: 400 });
  }

  // Generate unique badge code
  const badgeCode = `CUSTOM_${userId}_${crypto.randomInt(10000, 99999)}`;

  // Save to database
  await query('INSERT INTO cms_custom_badges (user_id, badge_code, image_data) VALUES (?,?,?)', [userId, badgeCode, imageData]);

  // Give badge to user
  await query('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?,?)', [userId, badgeCode]);

  return NextResponse.json({ ok: true, badgeCode });
}
