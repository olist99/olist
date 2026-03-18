import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import Avatar from '@/components/Avatar';
import { headers } from 'next/headers';

export const metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const tab = sp?.tab || 'general';
  const msg = sp?.msg;
  const error = sp?.error;

  async function updateProfile(formData) {
    'use server';
    const { getCurrentUser: getUser } = await import('@/lib/auth');
    const { query: dbQuery } = await import('@/lib/db');
    const { sanitizeText } = await import('@/lib/security');
    const u = await getUser();
    if (!u) redirect('/login');

    const motto = sanitizeText(formData.get('motto') || '', 127);
    const rawEmail = formData.get('email')?.trim() || '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) redirect('/settings?tab=general&error=Invalid+email');
    const email = rawEmail.slice(0, 254);

    await dbQuery('UPDATE users SET motto = ?, mail = ? WHERE id = ?', [motto, email, u.id]);
    redirect('/settings?tab=general&msg=Profile+updated!');
  }

  async function updateLook(formData) {
    'use server';
    const { getCurrentUser: getUser } = await import('@/lib/auth');
    const { query: dbQuery } = await import('@/lib/db');
    const u = await getUser();
    if (!u) redirect('/login');

    const look = formData.get('look')?.trim() || '';
    if (!look || !/^[a-zA-Z0-9\-\.]+$/.test(look)) redirect('/settings?tab=avatar&error=Invalid+look+string');

    await dbQuery('UPDATE users SET look = ? WHERE id = ?', [look, u.id]);
    redirect('/settings?tab=avatar&msg=Look+updated!');
  }

  async function changePassword(formData) {
    'use server';
    const { getCurrentUser: getUser, verifyPassword: verify, hashPassword: hash } = await import('@/lib/auth');
    const { query: dbQuery } = await import('@/lib/db');
    const { queryOne } = await import('@/lib/db');
    const u = await getUser();
    if (!u) redirect('/login');

    const current = formData.get('current_password');
    const newPass = formData.get('new_password');
    const confirm = formData.get('confirm_password');

    const fullUser = await queryOne('SELECT password FROM users WHERE id = ?', [u.id]);
    if (!fullUser || !(await verify(current, fullUser.password))) {
      redirect('/settings?tab=security&error=Current+password+is+incorrect');
    }
    if (!newPass || newPass.length < 6) redirect('/settings?tab=security&error=Password+must+be+6%2B+characters');
    if (newPass !== confirm) redirect('/settings?tab=security&error=Passwords+do+not+match');

    const hashed = await hash(newPass);
    await dbQuery('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
    redirect('/settings?tab=security&msg=Password+changed!');
  }

  // Fetch login history for the history tab
  let loginHistory = [];
  if (tab === 'history') {
    loginHistory = await query(
      'SELECT * FROM cms_login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [user.id]
    ).catch(() => []);
  }

  const tabs = [
    { key: 'general',  label: 'General' },
    { key: 'avatar',   label: 'Avatar' },
    { key: 'security', label: 'Security' },
    { key: 'history',  label: 'Login History' },
  ];

  return (
    <div className="grid grid-cols-[220px_1fr] gap-5 animate-fade-up max-md:grid-cols-1">
      {/* Sidebar */}
      <div className="bg-bg-secondary border border-border rounded-lg p-3">
        {tabs.map(t => (
          <Link key={t.key} href={`/settings?tab=${t.key}`}
            className={`block px-3.5 py-2.5 rounded-md text-sm mb-1 no-underline transition-all
              ${tab === t.key ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-accent/5 hover:text-accent'}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div>
        {msg && <div className="flash flash-success">{decodeURIComponent(msg).replace(/[<>]/g, "")}</div>}
        {error && <div className="flash flash-error">{decodeURIComponent(error).replace(/[<>]/g, "")}</div>}

        {tab === 'general' && (
          <div className="card">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">General Settings</h3></div>
            <div className="p-5">
              <form action={updateProfile}>
                <div className="mb-4">
                  <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Username</label>
                  <input type="text" className="input opacity-50" value={user.username} disabled />
                </div>
                <div className="mb-4">
                  <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Email</label>
                  <input type="email" name="email" className="input" defaultValue={user.mail} required />
                </div>
                <div className="mb-6">
                  <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Motto</label>
                  <input type="text" name="motto" className="input" defaultValue={user.motto} maxLength={127} placeholder="Set your motto..." />
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'avatar' && (
          <div className="card">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Avatar Settings</h3></div>
            <div className="p-5">
              <div className="text-center mb-5">
                <Avatar look={user.look} size="xl" className="mx-auto" />
                <p className="text-text-muted text-xs mt-2">Current look</p>
              </div>
              <form action={updateLook}>
                <div className="mb-6">
                  <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Look String</label>
                  <input type="text" name="look" className="input" defaultValue={user.look} required />
                  <p className="text-text-muted text-xs mt-1">Paste your Habbo figure string here.</p>
                </div>
                <button type="submit" className="btn btn-primary">Update Look</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <>
            <div className="card">
              <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Change Password</h3></div>
              <div className="p-5">
                <form action={changePassword}>
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Current Password</label>
                    <input type="password" name="current_password" className="input" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">New Password</label>
                    <input type="password" name="new_password" className="input" minLength={6} required />
                  </div>
                  <div className="mb-6">
                    <label className="block text-[13px] font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
                    <input type="password" name="confirm_password" className="input" required />
                  </div>
                  <button type="submit" className="btn btn-primary">Change Password</button>
                </form>
              </div>
            </div>
            <div className="card mt-5">
              <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Account Info</h3></div>
              <div className="p-5">
                <div className="flex justify-between py-2.5 border-b border-border text-sm">
                  <span className="text-text-secondary">Registration IP</span>
                  <span className="font-mono text-xs">{user.ip_register || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border text-sm">
                  <span className="text-text-secondary">Last Login IP</span>
                  <span className="font-mono text-xs">{user.ip_current || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-text-secondary">Registered</span>
                  <span>{user.account_created ? new Date(user.account_created * 1000).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold">Login History</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Last 20 login sessions. If you see an unfamiliar IP, change your password immediately.</p>
            </div>
            <div className="p-5">
              {loginHistory.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  No login history recorded yet. History is captured from your next login.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loginHistory.map((h, i) => {
                    const isCurrentIp = h.ip === user.ip_current;
                    return (
                      <div key={h.id} style={{
                        padding: '12px 16px', background: 'var(--panel-inner)', borderRadius: 'var(--radius)',
                        borderLeft: `3px solid ${isCurrentIp ? 'var(--green)' : 'transparent'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{h.ip || 'Unknown'}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            {h.user_agent ? h.user_agent.slice(0, 80) + (h.user_agent.length > 80 ? '...' : '') : 'Unknown device'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: isCurrentIp ? 'var(--green)' : 'var(--text-muted)', fontWeight: isCurrentIp ? 700 : 400 }}>
                            {isCurrentIp ? 'Current' : ''}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
