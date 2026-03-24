import { saveAnnouncementAction, clearAnnouncementAction } from './actions/settings';
import Link from 'next/link';
import { query, queryOne } from '@/lib/db';

const L = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-secondary)', marginBottom:6 };

export default async function SettingsSection({ view, sp, user }) {
  if (user.rank < 5) return (
    <div className="panel no-hover" style={{ padding:40, textAlign:'center' }}>
      <p style={{ color:'var(--text-muted)' }}>You need rank 5 or higher to access settings.</p>
    </div>
  );

  // ── Announcement Banner ───────────────────────────────────────────────────
  if (view === 'announcement') {
    const textRow = await queryOne("SELECT `value` FROM cms_settings WHERE `key`='announcement_text'").catch(()=>null);
    const typeRow = await queryOne("SELECT `value` FROM cms_settings WHERE `key`='announcement_type'").catch(()=>null);
    const currentText = textRow?.value || '';
    const currentType = typeRow?.value || 'info';
    return (
      <div>
        <SH title="Announcement Banner" sub="Show a sitewide notice bar to all visitors" back="settings" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="panel no-hover" style={{ padding:24 }}>
            <h4 style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Set Announcement</h4>
            <form action={saveAnnouncementAction}>
              <div style={{ marginBottom:14 }}>
                <label style={L}>Message (leave blank to hide)</label>
                <input type="text" name="announcement_text" defaultValue={currentText} placeholder="e.g. Server maintenance tonight at 10PM" maxLength={300} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={L}>Type</label>
                <select name="announcement_type" defaultValue={currentType}>
                  <option value="info">ℹ️ Info (blue)</option>
                  <option value="warning">⚠️ Warning (orange)</option>
                  <option value="success">✅ Success (green)</option>
                  <option value="danger">🚨 Danger (red)</option>
                </select>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="btn btn-primary btn-sm">Save Banner</button>
                <button formAction={clearAnnouncementAction} className="btn btn-secondary btn-sm">Clear</button>
              </div>
            </form>
          </div>
          <div className="panel no-hover" style={{ padding:24 }}>
            <h4 style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Preview</h4>
            {currentText ? (
              <div style={{ padding:'10px 16px', borderRadius:'var(--radius)', fontSize:13, fontWeight:600,
                background: currentType==='warning'?'rgba(245,166,35,0.12)':currentType==='success'?'rgba(52,189,89,0.12)':currentType==='danger'?'rgba(239,88,86,0.12)':'rgba(59,130,246,0.12)',
                border:`1px solid ${currentType==='warning'?'rgba(245,166,35,0.3)':currentType==='success'?'rgba(52,189,89,0.3)':currentType==='danger'?'rgba(239,88,86,0.3)':'rgba(59,130,246,0.3)'}`,
                color: currentType==='warning'?'#f5a623':currentType==='success'?'#34bd59':currentType==='danger'?'#EF5856':'#60a5fa',
              }}>
                {currentType==='warning'?'⚠️ ':currentType==='success'?'✅ ':currentType==='danger'?'🚨 ':'ℹ️ '}{currentText}
              </div>
            ) : (
              <p style={{ color:'var(--text-muted)', fontSize:12 }}>No announcement active.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Default: Site Settings ─────────────────────────────────────────────────
  const settings = await query("SELECT * FROM cms_settings WHERE `key` NOT LIKE 'plugin_%' ORDER BY `key`").catch(() => []);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {/* Quick tools */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[
          { href:'/admin?tab=settings&view=announcement', label:'Announcement Banner', desc:'Show a notice bar sitewide', icon:'📢' },
        ].map(t => (
          <a key={t.href} href={t.href} className="panel no-hover" style={{ padding:16, display:'flex', gap:14, alignItems:'center', textDecoration:'none' }}>
            <span style={{ fontSize:22 }}>{t.icon}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>{t.label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{t.desc}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Raw settings editor */}
      <div className="panel no-hover" style={{ padding:20 }}>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Site Settings</h3>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>Raw key/value settings. Changes apply immediately.</p>
        <form action="/admin/api/settings" method="POST">
          {settings.length === 0 ? (
            <p style={{ color:'var(--text-muted)', fontSize:12 }}>No settings found.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:400, overflowY:'auto' }}>
              {settings.map(s => (
                <div key={s.key} style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <code style={{ fontSize:11, color:'var(--text-secondary)', flexShrink:0, minWidth:180 }}>{s.key}</code>
                  <input type="text" name={`setting_${s.key}`} defaultValue={s.value} style={{ flex:1 }} />
                </div>
              ))}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop:16 }}>Save Settings</button>
        </form>
      </div>
    </div>
  );
}

function SH({ title, sub, back }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
      <div>
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{title}</h3>
        {sub && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</p>}
      </div>
      <a href={`/admin?tab=${back}`} className="btn btn-secondary btn-sm">← Back</a>
    </div>
  );
}
