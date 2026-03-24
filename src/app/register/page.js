import { redirect } from 'next/navigation';
import { registerAction } from './actions';
import Link from 'next/link';
import { getCurrentUser, hashPassword, setSession } from '@/lib/auth';
import { queryOne, queryScalar, query as dbQuery } from '@/lib/db';
import crypto from 'crypto';
import { sanitizeText, sanitizeEmail, sanitizeUsername, checkRateLimit } from '@/lib/security';

export const metadata = { title: 'Register' };

export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect('/');

  const sp = await searchParams;
  const error = sp?.error;
  const refCode = sp?.ref || '';


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
