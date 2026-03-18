import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, hashPassword, setSession } from '@/lib/auth';
import { queryOne, queryScalar, query as dbQuery } from '@/lib/db';
import crypto from 'crypto';
import { sanitizeText, sanitizeEmail, sanitizeUsername, checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Register' };

export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect('/');

  const sp = await searchParams;
  const error = sp?.error;
  const refCode = sp?.ref || '';

  async function registerAction(formData) {
    'use server';
    const { checkRateLimit: rl } = await import('@/lib/security');

    // Rate limit: 5 registrations per hour per IP (using a global key for now)
    const rateCheck = rl('register:global', 20, 3600000);
    if (!rateCheck.ok) redirect('/register?error=Too+many+registrations.+Try+again+later.');

    const rawUsername = formData.get('username')?.trim();
    const rawEmail = formData.get('email')?.trim();
    const password = formData.get('password');
    const password2 = formData.get('password_confirm');
    const referralCode = formData.get('referral_code')?.trim();

    // Sanitize
    const username = rawUsername ? rawUsername.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 15) : '';
    const email = rawEmail?.trim().slice(0, 254) || '';

    // Validation
    if (!username || !email || !password || !password2) {
      redirect('/register?error=Please+fill+in+all+fields' + (referralCode ? `&ref=${referralCode}` : ''));
    }
    if (username.length < 3 || username.length > 15) {
      redirect('/register?error=Username+must+be+3-15+characters' + (referralCode ? `&ref=${referralCode}` : ''));
    }
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) {
      redirect('/register?error=Username+contains+invalid+characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect('/register?error=Invalid+email+address');
    }
    if (password.length < 6 || password.length > 128) {
      redirect('/register?error=Password+must+be+6-128+characters');
    }
    if (password !== password2) {
      redirect('/register?error=Passwords+do+not+match');
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) redirect('/register?error=Username+is+already+taken');

    const existingEmail = await queryOne('SELECT id FROM users WHERE mail = ?', [email]);
    if (existingEmail) redirect('/register?error=Email+is+already+registered');

    // Hash + insert
    const hashed = await hashPassword(password);
    const now = Math.floor(Date.now() / 1000);
    const newRefCode = crypto.randomUUID();

    // Capture real IP
    const { headers: nextHeaders } = await import('next/headers');
    const hdrs = await nextHeaders();
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

    // ── Process referral ──
    if (newUser && referralCode) {
      try {
        const referrer = await queryOne('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
        if (referrer && referrer.id !== newUser.id) {
          const maxRefs = parseInt((await queryScalar("SELECT `value` FROM cms_settings WHERE `key` = 'referral_max'")) || '5');
          const currentRefs = parseInt((await queryScalar('SELECT COUNT(*) FROM cms_referrals WHERE referrer_id = ?', [referrer.id])) || '0');

          if (currentRefs < maxRefs) {
            // Record referral
            await dbQuery('INSERT INTO cms_referrals (referrer_id, referred_id, referral_code) VALUES (?, ?, ?)',
              [referrer.id, newUser.id, referralCode]);

            // Reward referrer
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
        // Referral tables might not exist yet — silently skip
        console.log('Referral processing skipped:', e.message);
      }
    }

    if (newUser) {
      await setSession(newUser.id);
    }
    redirect('/');
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade-up">

        <div className="panel no-hover" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>Create Account</h2>

          {refCode && (
            <div className="flash flash-info" style={{ marginBottom: 16 }}>
               You were invited by a friend! You&apos;ll both receive rewards.
            </div>
          )}

          {error && <div className="flash flash-error" style={{ marginBottom: 16 }}>{decodeURIComponent(error).replace(/[<>]/g, "")}</div>}

          <form action={registerAction}>
            <input type="hidden" name="referral_code" value={refCode} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
              <input type="text" name="username" placeholder="Choose a username" minLength={3} maxLength={15} required autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
              <input type="email" name="email" placeholder="your@email.com" required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
              <input type="password" name="password" placeholder="At least 6 characters" minLength={6} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Confirm Password</label>
              <input type="password" name="password_confirm" placeholder="Repeat your password" required />
            </div>
            <button type="submit" className="btn-enterhotel" style={{ width: '100%', textAlign: 'center', fontSize: 14 }}>Create Account</button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
