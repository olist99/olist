'use server';
import { redirect } from 'next/navigation';
import { hashPassword, setSession } from '@/lib/auth';
import { queryOne, queryScalar, query as dbQuery } from '@/lib/db';
import { checkRateLimit } from '@/lib/security';
import { headers as nextHeaders } from 'next/headers';
import crypto from 'crypto';

function extractRegisterIp(hdrs) {
  for (const h of ['cf-connecting-ip', 'x-real-ip', 'true-client-ip', 'x-client-ip']) {
    const v = hdrs.get(h)?.trim();
    if (v && v !== '127.0.0.1' && v !== '::1') return v.replace(/^::ffff:/, '').slice(0, 45);
  }
  const xff = hdrs.get('x-forwarded-for') || '';
  for (const candidate of xff.split(',').map(s => s.trim()).filter(Boolean)) {
    const clean = candidate.replace(/^::ffff:/, '');
    if (clean && clean !== '127.0.0.1' && clean !== '::1' && !clean.startsWith('10.') && !clean.startsWith('192.168.') && !/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) {
      return clean.slice(0, 45);
    }
  }
  const first = xff.split(',')[0]?.trim().replace(/^::ffff:/, '');
  return (first || '0.0.0.0').slice(0, 45);
}

export async function registerAction(formData) {
  const rateCheck = await checkRateLimit('register:global', 20, 3600000);
  if (!rateCheck.ok) redirect('/register?error=Too+many+registrations.+Try+again+later.');

  const rawUsername = formData.get('username')?.trim();
  const rawEmail = formData.get('email')?.trim();
  const password = formData.get('password');
  const password2 = formData.get('password_confirm');
  const referralCode = formData.get('referral_code')?.trim();

  const username = rawUsername ? rawUsername.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 15) : '';
  const email = rawEmail?.trim().slice(0, 254) || '';

  if (!username || !email || !password || !password2) {
    redirect('/register?error=Please+fill+in+all+fields' + (referralCode ? `&ref=${referralCode}` : ''));
  }
  if (username.length < 3 || username.length > 15) {
    redirect('/register?error=Username+must+be+3-15+characters' + (referralCode ? `&ref=${referralCode}` : ''));
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) redirect('/register?error=Username+contains+invalid+characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/register?error=Invalid+email+address');
  if (password.length < 6 || password.length > 128) redirect('/register?error=Password+must+be+6-128+characters');
  if (password !== password2) redirect('/register?error=Passwords+do+not+match');

  const existingUser = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existingUser) redirect('/register?error=Username+is+already+taken');

  const existingEmail = await queryOne('SELECT id FROM users WHERE mail = ?', [email]);
  if (existingEmail) redirect('/register?error=Email+is+already+registered');

  const hashed = await hashPassword(password);
  const now = Math.floor(Date.now() / 1000);
  const newRefCode = crypto.randomUUID();

  const hdrs = await nextHeaders();
  const registerIp = extractRegisterIp(hdrs);

  try {
    await dbQuery(`
      INSERT INTO users (\`username\`, \`password\`, \`mail\`, \`account_created\`, \`last_online\`,
        \`motto\`, \`look\`, \`gender\`, \`rank\`, \`credits\`, \`pixels\`, \`points\`, \`online\`,
        \`ip_register\`, \`ip_current\`, \`auth_ticket\`, \`referral_code\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', ?, ?, '', ?)
    `, [
      username, hashed, email, now, now,
      process.env.DEFAULT_MOTTO || "I'm new here!",
      process.env.DEFAULT_LOOK || 'hr-115-42.hd-190-1.ch-215-62.lg-285-91.sh-290-62',
      'M',
      parseInt(process.env.DEFAULT_RANK || '1'),
      parseInt(process.env.DEFAULT_CREDITS || '5000'),
      parseInt(process.env.DEFAULT_PIXELS || '500'),
      parseInt(process.env.DEFAULT_POINTS || '100'),
      registerIp, registerIp,
      newRefCode,
    ]);
  } catch (e) {
    console.error('Register DB error:', e.message);
    redirect('/register?error=Registration+failed.+Please+contact+support.' + (referralCode ? `&ref=${referralCode}` : ''));
  }

  const newUser = await queryOne('SELECT id FROM users WHERE username = ?', [username]);

  if (newUser && referralCode) {
    try {
      const referrer = await queryOne('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
      if (referrer && referrer.id !== newUser.id) {
        const maxRefs = parseInt((await queryScalar("SELECT `value` FROM cms_settings WHERE `key` = 'referral_max'")) || '5');
        const currentRefs = parseInt((await queryScalar('SELECT COUNT(*) FROM cms_referrals WHERE referrer_id = ?', [referrer.id])) || '0');
        if (currentRefs < maxRefs) {
          await dbQuery('INSERT INTO cms_referrals (referrer_id, referred_id, referral_code) VALUES (?, ?, ?)',
            [referrer.id, newUser.id, referralCode]);
          const rewardCredits = parseInt((await queryScalar("SELECT `value` FROM cms_settings WHERE `key` = 'referral_reward_credits'")) || '500');
          const rewardPixels = parseInt((await queryScalar("SELECT `value` FROM cms_settings WHERE `key` = 'referral_reward_pixels'")) || '100');
          const rewardPoints = parseInt((await queryScalar("SELECT `value` FROM cms_settings WHERE `key` = 'referral_reward_points'")) || '50');
          await dbQuery(
            'UPDATE users SET credits = credits + ?, pixels = pixels + ?, points = points + ? WHERE id = ?',
            [rewardCredits, rewardPixels, rewardPoints, referrer.id]
          );
        }
      }
    } catch (e) {
      console.log('Referral processing skipped:', e.message);
    }
  }

  if (newUser) await setSession(newUser.id);
  redirect('/');
}
