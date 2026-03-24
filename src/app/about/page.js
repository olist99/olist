import Link from 'next/link';
import { getAllPlugins } from '@/lib/plugins';

export const metadata = { title: 'About OCMS' };

export default function AboutPage() {
  const plugins = getAllPlugins();

  return (
    <div className="animate-fade-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Hero */}
      <div className="panel no-hover" style={{ padding: '40px 36px', marginBottom: 20, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>OCMS</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto', lineHeight: 1.8 }}>
          An open-source, modern CMS built for Habbo retro hotels running the <strong>Arcturus Morningstar</strong> emulator.
          Designed to be fast, modular, and easy to self-host.
        </p>
      </div>

      {/* What is OCMS */}
      <div className="panel no-hover" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>What is OCMS?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 12 }}>
          OCMS (Open CMS) is a full-stack hotel website built with <strong>Next.js 16.2</strong>, <strong>React 19.2</strong>,
          and <strong>MySQL2</strong>. It connects directly to your Arcturus database and provides your players with a
          feature-rich web experience, no external services or SaaS subscriptions required.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
          Everything runs on your own server. Your data stays yours.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
          {[
            { title: 'JWT Authentication', desc: 'Secure session management with bcrypt password hashing and SSO for the Nitro client.' },
            { title: 'Arcturus Integration', desc: 'Reads directly from your Arcturus DB, users, inventory, credits, badges, and more.' },
            { title: 'Nitro Client', desc: 'Built-in Nitro renderer with single sign-on. Players launch the hotel right from the browser.' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Plugin System */}
      <div className="panel no-hover" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Plugin System</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 20 }}>
          OCMS is built around a plugin architecture. Every major feature is a self-contained plugin that can be
          enabled, disabled, or extended without touching the core codebase.
          Plugins live in <code style={{ color: 'var(--green)', fontSize: 11 }}>src/app/&lt;plugin-name&gt;/</code> and
          are registered in <code style={{ color: 'var(--green)', fontSize: 11 }}>src/lib/plugins.js</code>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
          {plugins.map(p => (
            <div key={p.slug} style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
                  {p.version && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>v{p.version}</span>
                  )}
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 3, marginLeft: 'auto',
                    background: p.enabled ? 'rgba(52,189,89,0.15)' : 'rgba(239,88,86,0.15)',
                    color: p.enabled ? 'var(--green)' : '#EF5856',
                  }}>
                    {p.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{p.description || 'No description'}</p>
                <div style={{ marginTop: 8 }}>
                  <Link href={p.href} style={{ fontSize: 11, color: 'var(--green)', textDecoration: 'none' }}>{p.href} →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Installing a Plugin</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
            1. Copy plugin files into <code style={{ color: 'var(--green)' }}>src/app/&lt;plugin-name&gt;/</code><br />
            2. Run the SQL if included: <code style={{ color: 'var(--green)' }}>sql/&lt;plugin&gt;.sql</code><br />
            3. Register it in <code style={{ color: 'var(--green)' }}>src/lib/plugins.js</code><br />
            4. Rebuild: <code style={{ color: 'var(--green)' }}>npm run build &amp;&amp; npm start</code>
          </div>
        </div>
      </div>

      {/* Stack */}
      <div className="panel no-hover" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Tech Stack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { name: 'Next.js 16.2', role: 'Framework' },
            { name: 'React 19.2', role: 'UI' },
            { name: 'MySQL2', role: 'Database' },
            { name: 'Tailwind CSS', role: 'Styling' },
            { name: 'jose (JWT)', role: 'Auth' },
            { name: 'bcryptjs', role: 'Passwords' },
            { name: 'Nitro', role: 'Game Client' },
            { name: 'Arcturus', role: 'Emulator' },
          ].map((t, i) => (
            <div key={i} style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{t.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', paddingBottom: 20 }}>
        <Link href="/" className="btn btn-primary">Back to Home</Link>
        <Link href="/register" className="btn btn-secondary">Create an Account</Link>
      </div>
    </div>
  );
}
