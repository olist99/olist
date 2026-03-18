import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, verifyPassword, setSession } from '@/lib/auth';
import { queryOne, query as dbQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Login' };

export default async function LoginPage({ searchParams }) {
  try {
    const user = await getCurrentUser();
    if (user) redirect('/');
  } catch (e) {}

  const sp = await searchParams;
  const error = sp?.error;

  async function loginAction(formData) {
    'use server';
    const { checkRateLimit } = await import('@/lib/security');
    const { sanitizeUsername } = await import('@/lib/security');

    const rawUsername = formData.get('username')?.trim();
    const password = formData.get('password');
    if (!rawUsername || !password) redirect('/login?error=Please+fill+in+all+fields');

    // Sanitize username
    const username = rawUsername.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 15);
    if (!username) redirect('/login?error=Invalid+username');

    // Rate limit: 10 attempts per 5 minutes per username
    const rl = checkRateLimit(`login:${username.toLowerCase()}`, 10, 300000);
    if (!rl.ok) redirect('/login?error=Too+many+login+attempts.+Try+again+in+a+few+minutes.');

    // Cap password length to prevent bcrypt DoS (bcrypt only hashes first 72 bytes)
    if (password.length > 128) redirect('/login?error=Invalid+credentials');

    const user = await queryOne('SELECT id, password FROM users WHERE username = ?', [username]);
    if (!user || !(await verifyPassword(password, user.password))) redirect('/login?error=Invalid+username+or+password');

    // Capture IP
    const { headers: nextHeaders } = await import('next/headers');
    const hdrs = await nextHeaders();
    function extractRealIp(hdrs) {
      // Try specific real-IP headers first (set by Cloudflare, nginx, etc.)
      for (const h of ['cf-connecting-ip', 'x-real-ip', 'true-client-ip', 'x-client-ip']) {
        const v = hdrs.get(h)?.trim();
        if (v && v !== '127.0.0.1' && v !== '::1') return v.replace(/^::ffff:/, '').slice(0, 45);
      }
      // Parse x-forwarded-for — take first non-loopback, non-private IP
      const xff = hdrs.get('x-forwarded-for') || '';
      for (const candidate of xff.split(',').map(s => s.trim()).filter(Boolean)) {
        const clean = candidate.replace(/^::ffff:/, '');
        if (clean && clean !== '127.0.0.1' && clean !== '::1' && !clean.startsWith('10.') && !clean.startsWith('192.168.') && !/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) {
          return clean.slice(0, 45);
        }
      }
      // Fall back to any xff value
      const first = xff.split(',')[0]?.trim().replace(/^::ffff:/, '');
      return (first || '0.0.0.0').slice(0, 45);
    }
    const ip = extractRealIp(hdrs);
    const ua = (hdrs.get('user-agent') || '').slice(0, 500);

    await dbQuery('UPDATE users SET last_online = UNIX_TIMESTAMP(), ip_current = ? WHERE id = ?', [ip, user.id]);

    // Log login history (non-blocking)
    const { logLogin } = await import('@/lib/notifications');
    logLogin(user.id, ip, ua);

    await setSession(user.id);
    redirect('/');
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade-up">

        <div className="panel no-hover" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>Sign In</h2>

          {error && <div className="flash flash-error" style={{ marginBottom: 16 }}>{decodeURIComponent(error).replace(/[<>]/g, "")}</div>}

          <form action={loginAction}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
              <input type="text" name="username" placeholder="Enter your username" required autoFocus />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
              <input type="password" name="password" placeholder="Enter your password" required />
            </div>
            <button type="submit" className="btn-enterhotel" style={{ width: '100%', textAlign: 'center', fontSize: 14 }}>Log In</button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Don&apos;t have an account? <Link href="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
