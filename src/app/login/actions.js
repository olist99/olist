'use server';
import { redirect } from 'next/navigation';
import { verifyPassword, setSession } from '@/lib/auth';
import { queryOne, query as dbQuery } from '@/lib/db';
import { checkRateLimit } from '@/lib/security';
import { headers as nextHeaders } from 'next/headers';
import { verifyTOTP } from '@/lib/totp';

function extractRealIp(hdrs) {
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

export async function loginAction(formData) {
  const rawUsername = formData.get('username')?.trim();
  const password = formData.get('password');
  const totpCode = formData.get('totp_code')?.trim();
  if (!rawUsername || !password) redirect('/login?error=Please+fill+in+all+fields');

  const username = rawUsername.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 15);
  if (!username) redirect('/login?error=Invalid+username');

  const rl = await checkRateLimit(`login:${username.toLowerCase()}`, 10, 300000);
  if (!rl.ok) redirect('/login?error=Too+many+login+attempts.+Try+again+in+a+few+minutes.');

  if (password.length > 128) redirect('/login?error=Invalid+credentials');

  const user = await queryOne('SELECT id, password, `rank` FROM users WHERE username = ?', [username]);
  if (!user || !(await verifyPassword(password, user.password))) redirect('/login?error=Invalid+username+or+password');

  // Check 2FA if enabled
  const twofa = await queryOne(
    'SELECT secret FROM cms_user_2fa WHERE user_id = ? AND enabled = 1',
    [user.id]
  ).catch(() => null);

  if (twofa) {
    if (!totpCode) {
      // Password correct but 2FA needed — redirect back with flag
      redirect(`/login?requires_2fa=1&username=${encodeURIComponent(username)}&error=Enter+your+authenticator+code`);
    }
    if (!verifyTOTP(twofa.secret, totpCode)) {
      redirect('/login?error=Invalid+authenticator+code');
    }
  }

  const hdrs = await nextHeaders();
  const ip = extractRealIp(hdrs);
  const ua = (hdrs.get('user-agent') || '').slice(0, 500);

  await dbQuery('UPDATE users SET last_online = UNIX_TIMESTAMP(), ip_current = ? WHERE id = ?', [ip, user.id]);

  const { logLogin } = await import('@/lib/notifications');
  logLogin(user.id, ip, ua);

  await setSession(user.id);
  redirect('/');
}
