import { query } from '@/lib/db';

export default async function SettingsSection({ view, sp, user }) {
  if (user.rank < 6) return (
    <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>You need rank 6 or higher to manage site settings.</p>
    </div>
  );

  const settings = await query('SELECT * FROM cms_settings ORDER BY `key`').catch(() => []);

  return (
    <div className="panel no-hover" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Site Settings</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        Edit key/value pairs stored in cms_settings. Changes apply immediately after saving.
      </p>
      <form action="/admin/api/settings" method="POST">
        {settings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No settings found in cms_settings table.</p>
        ) : (
          <div className="adm-table-wrap"><table className="table-panel">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>
              {settings.map(s => (
                <tr key={s.key}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{s.key}</td>
                  <td><input type="text" name={`setting_${s.key}`} defaultValue={s.value} style={{ width: '100%', maxWidth: 400 }} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn btn-primary">Save All Settings</button>
        </div>
      </form>
    </div>
  );
}
