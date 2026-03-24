import { togglePluginAction } from './actions/plugins';
import Link from 'next/link';
import { query } from '@/lib/db';
import { getAllPlugins } from '@/lib/plugins';

export default async function PluginsSection({ view, sp, user }) {
  if (user.rank < 6) return (
    <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>You need rank 6 or higher to manage plugins.</p>
    </div>
  );

  const pluginRows = await query("SELECT `key`, `value` FROM cms_settings WHERE `key` LIKE 'plugin_%'").catch(() => []);
  const pluginStateMap = {};
  for (const row of pluginRows) pluginStateMap[row.key.replace('plugin_', '')] = row.value == 1;
  const plugins = getAllPlugins().map(p => ({
    ...p,
    enabled: p.slug in pluginStateMap ? pluginStateMap[p.slug] : p.enabled,
  }));


  return (
    <div>
      <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Plugin Manager</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Enable or disable CMS plugins. Core pages cannot be toggled. Changes take effect immediately.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 20 }}>
        {plugins.map(p => (
          <div key={p.slug} className="panel no-hover" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🔌</span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
                background: p.core ? 'rgba(59,130,246,0.15)' : p.enabled ? 'rgba(52,189,89,0.15)' : 'rgba(239,88,86,0.15)',
                color: p.core ? '#3b82f6' : p.enabled ? 'var(--green)' : '#EF5856',
              }}>
                {p.core ? 'CORE' : p.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.name}</h4>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{p.description || 'No description'}</p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.href}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                  {p.version && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>v{p.version}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {!p.core && <Link href={p.href} style={{ fontSize: 10, color: 'var(--green)', textDecoration: 'none' }}>View →</Link>}
                {!p.core && (
                  <form action={togglePluginAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="slug" value={p.slug} />
                    <input type="hidden" name="enabled" value={p.enabled ? '0' : '1'} />
                    <button type="submit" className="btn btn-sm" style={{
                      fontSize: 9, padding: '2px 8px',
                      background: p.enabled ? 'rgba(239,88,86,0.12)' : 'rgba(52,189,89,0.12)',
                      color: p.enabled ? '#EF5856' : 'var(--green)',
                      border: `1px solid ${p.enabled ? 'rgba(239,88,86,0.3)' : 'rgba(52,189,89,0.3)'}`,
                      borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                    }}>
                      {p.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel no-hover" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Install New Plugin</h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          1. Copy plugin files into <code style={{ color: 'var(--green)' }}>src/app/&lt;plugin-name&gt;/</code><br />
          2. Run the SQL if included: <code style={{ color: 'var(--green)' }}>sql/&lt;plugin&gt;.sql</code><br />
          3. Add the entry to <code style={{ color: 'var(--green)' }}>src/lib/plugins.js</code><br />
          4. Rebuild: <code style={{ color: 'var(--green)' }}>pm2 restart OCMS</code>
        </p>
      </div>
    </div>
  );
}
