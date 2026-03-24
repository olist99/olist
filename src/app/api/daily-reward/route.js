import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { checkRateLimit, safeInt } from '@/lib/security';

// Max reward values — prevents a rogue DB row from granting unlimited currency
const MAX_REWARD_CREDITS = 10000;
const MAX_REWARD_PIXELS  = 10000;
const MAX_REWARD_POINTS  = 1000;

// Default 7-day reward config (overridden by cms_daily_rewards table if rows exist)
const DEFAULT_REWARDS = [
  { day: 1, label: 'Day 1',   credits: 50,  pixels: 0,   points: 0 },
  { day: 2, label: 'Day 2',   credits: 100, pixels: 0,   points: 0 },
  { day: 3, label: 'Day 3',   credits: 100, pixels: 50,  points: 0 },
  { day: 4, label: 'Day 4',   credits: 150, pixels: 0,   points: 0 },
  { day: 5, label: 'Day 5',   credits: 150, pixels: 100, points: 0 },
  { day: 6, label: 'Day 6',   credits: 200, pixels: 0,   points: 0 },
  { day: 7, label: 'Day 7 ★', credits: 300, pixels: 150, points: 5 },
];

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS cms_daily_claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      streak_day TINYINT NOT NULL DEFAULT 1,
      claimed_at DATETIME NOT NULL DEFAULT NOW(),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

async function getRewards() {
  try {
    const rows = await query('SELECT * FROM cms_daily_rewards ORDER BY day ASC');
    if (rows.length >= 7) return rows;
  } catch {}
  return DEFAULT_REWARDS;
}

// Get the last claim record for a user
async function getLastClaim(userId) {
  return queryOne(
    'SELECT * FROM cms_daily_claims WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 1',
    [userId]
  );
}

// Compute streak state from last claim using MySQL date functions (avoids JS timezone issues)
async function getStreakState(userId) {
  const claimedToday = await queryOne(
    'SELECT id, streak_day FROM cms_daily_claims WHERE user_id = ? AND DATE(claimed_at) = CURDATE() LIMIT 1',
    [userId]
  );

  if (claimedToday) {
    // Already claimed today — next claim at midnight (local server time)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return { canClaim: false, streakDay: claimedToday.streak_day, nextClaimAt: tomorrow.toISOString() };
  }

  // Check yesterday
  const claimedYesterday = await queryOne(
    'SELECT streak_day FROM cms_daily_claims WHERE user_id = ? AND DATE(claimed_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) LIMIT 1',
    [userId]
  );

  if (claimedYesterday) {
    const nextDay = (claimedYesterday.streak_day % 7) + 1;
    return { canClaim: true, streakDay: nextDay, nextClaimAt: null };
  }

  // No claim yesterday — streak reset or first time
  return { canClaim: true, streakDay: 1, nextClaimAt: null };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const rewards = await getRewards();
  const { canClaim, streakDay, nextClaimAt } = await getStreakState(user.id);

  return NextResponse.json({ rewards, streakDay, canClaim, nextClaimAt });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: 5 attempts per minute (DB is the true once-per-day guard below)
  const rl = await checkRateLimit(`daily-reward:${user.id}`, 5, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  await ensureTable();

  // Re-check using MySQL date comparison — authoritative guard
  const alreadyClaimed = await queryOne(
    'SELECT id FROM cms_daily_claims WHERE user_id = ? AND DATE(claimed_at) = CURDATE() LIMIT 1',
    [user.id]
  );
  if (alreadyClaimed) {
    return NextResponse.json({ error: 'Already claimed today! Come back tomorrow.' }, { status: 400 });
  }

  // Determine streak day
  const claimedYesterday = await queryOne(
    'SELECT streak_day FROM cms_daily_claims WHERE user_id = ? AND DATE(claimed_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) LIMIT 1',
    [user.id]
  );
  const streakDay = claimedYesterday ? (claimedYesterday.streak_day % 7) + 1 : 1;

  const rewards = await getRewards();
  const reward = rewards.find(r => r.day === streakDay) || rewards[0];

  // Clamp reward values from DB to safe maximums (prevents rogue admin DB rows)
  const credits = Math.min(safeInt(reward.credits, 0, MAX_REWARD_CREDITS) ?? 0, MAX_REWARD_CREDITS);
  const pixels  = Math.min(safeInt(reward.pixels,  0, MAX_REWARD_PIXELS)  ?? 0, MAX_REWARD_PIXELS);
  const points  = Math.min(safeInt(reward.points,  0, MAX_REWARD_POINTS)  ?? 0, MAX_REWARD_POINTS);

  // FIX #5: Use separate parameterized queries instead of string interpolation.
  // The old code built `UPDATE users SET credits = credits + ${parseInt(val)}` which
  // is exploitable by an admin inserting crafted values into cms_daily_rewards.
  if (credits > 0) await query('UPDATE users SET credits = credits + ? WHERE id = ?', [credits, user.id]);
  if (pixels  > 0) await query('UPDATE users SET pixels  = pixels  + ? WHERE id = ?', [pixels,  user.id]);
  if (points  > 0) await query('UPDATE users SET points  = points  + ? WHERE id = ?', [points,  user.id]);

  // Record claim
  await query(
    'INSERT INTO cms_daily_claims (user_id, streak_day, claimed_at) VALUES (?, ?, NOW())',
    [user.id, streakDay]
  );

  // Notify user
  await sendNotification(user.id, {
    type: 'daily_reward',
    title: `Day ${streakDay} reward claimed!`,
    message: `+${credits} credits${pixels ? `, +${pixels} duckets` : ''}${points ? `, +${points} diamonds` : ''}`,
    link: '/',
  });

  return NextResponse.json({ ok: true, reward: { ...reward, credits, pixels, points }, streakDay });
}
