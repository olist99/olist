import { redirect } from 'next/navigation';
import { loginAction } from './actions';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Login' };

export default async function LoginPage({ searchParams }) {
  try {
    const user = await getCurrentUser();
    if (user) redirect('/');
  } catch (e) {}

  const sp = await searchParams;
  const error = sp?.error;
  const requires2FA = sp?.requires_2fa === '1';
  const prefillUsername = sp?.username ? decodeURIComponent(sp.username) : '';

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade-up">
        <div className="panel no-hover" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
            {requires2FA ? '🔐 Two-Factor Authentication' : 'Sign In'}
          </h2>

          {error && <div className="flash flash-error" style={{ marginBottom: 16 }}>{decodeURIComponent(error).replace(/[<>]/g, '')}</div>}

          <form action={loginAction}>
            {!requires2FA ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
                  <input type="text" name="username" placeholder="Enter your username" required autoFocus />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
                  <input type="password" name="password" placeholder="Enter your password" required />
                </div>
              </>
            ) : (
              <>
                <input type="hidden" name="username" value={prefillUsername} />
                <input type="hidden" name="password" value="__2fa_step__" />
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Your account has 2FA enabled. Open your authenticator app and enter the 6-digit code.
                  </p>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Authenticator Code</label>
                  <input
                    type="text"
                    name="totp_code"
                    placeholder="000000"
                    required
                    autoFocus
                    maxLength={6}
                    pattern="\d{6}"
                    inputMode="numeric"
                    style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: 'monospace' }}
                  />
                </div>
              </>
            )}

            {!requires2FA && (
              <input type="hidden" name="totp_code" value="" />
            )}

            <button type="submit" className="btn-enterhotel" style={{ width: '100%', textAlign: 'center', fontSize: 14 }}>
              {requires2FA ? 'Verify Code' : 'Log In'}
            </button>
          </form>

          {!requires2FA && (
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
              Don&apos;t have an account? <Link href="/register">Register here</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
