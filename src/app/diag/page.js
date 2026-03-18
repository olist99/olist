
export const dynamic = 'force-dynamic';
export const metadata = { title: 'OCMS Diagnostics' };

export default async function DiagPage() {
  const checks = [];

  // Check 1: Environment variables
  const dbHost = process.env.DB_HOST || '(not set)';
  const dbUser = process.env.DB_USER || '(not set)';
  const dbName = process.env.DB_NAME || '(not set)';
  const dbPass = process.env.DB_PASS ? '✓ set' : '✗ empty/not set';
  const jwtSecret = process.env.JWT_SECRET ? '✓ set' : '✗ not set';

  checks.push({ name: 'DB_HOST', val: dbHost, ok: dbHost !== '(not set)' });
  checks.push({ name: 'DB_USER', val: dbUser, ok: dbUser !== '(not set)' });
  checks.push({ name: 'DB_NAME', val: dbName, ok: dbName !== '(not set)' });
  checks.push({ name: 'DB_PASS', val: dbPass, ok: dbPass.startsWith('✓') });
  checks.push({ name: 'JWT_SECRET', val: jwtSecret, ok: jwtSecret.startsWith('✓') });

  // Check 2: Database connection
  let dbConnected = false;
  let dbError = '';
  try {
    const { getPool } = await import('@/lib/db');
    const pool = getPool();
    const [rows] = await pool.query('SELECT 1 as test');
    dbConnected = rows[0]?.test === 1;
  } catch (e) {
    dbError = e.message;
  }
  checks.push({ name: 'DB Connection', val: dbConnected ? '✓ connected' : `✗ ${dbError}`, ok: dbConnected });

  // Check 3: Users table
  let usersOk = false;
  let usersError = '';
  let userCount = 0;
  if (dbConnected) {
    try {
      const { queryScalar } = await import('@/lib/db');
      userCount = await queryScalar('SELECT COUNT(*) FROM users');
      usersOk = true;
    } catch (e) {
      usersError = e.message;
    }
  }
  checks.push({ name: 'Users table', val: usersOk ? `✓ ${userCount} users` : `✗ ${usersError}`, ok: usersOk });

  // Check 4: CMS tables
  const cmsTableChecks = [
    'cms_news', 'cms_settings', 'cms_rare_values', 'cms_shop_items',
    'cms_campaigns', 'cms_referrals', 'cms_marketplace',
    'cms_marketplace_price_history',
  ];

  if (dbConnected) {
    for (const table of cmsTableChecks) {
      try {
        const { queryScalar } = await import('@/lib/db');
        const count = await queryScalar(`SELECT COUNT(*) FROM \`${table}\``);
        checks.push({ name: table, val: `✓ ${count} rows`, ok: true });
      } catch (e) {
        checks.push({ name: table, val: `✗ ${e.message.substring(0, 80)}`, ok: false });
      }
    }
  }

  // Check 5: referral_code column
  if (dbConnected) {
    try {
      const { query } = await import('@/lib/db');
      await query('SELECT referral_code FROM users LIMIT 1');
      checks.push({ name: 'users.referral_code column', val: '✓ exists', ok: true });
    } catch (e) {
      checks.push({ name: 'users.referral_code column', val: `✗ missing — run: ALTER TABLE users ADD COLUMN referral_code VARCHAR(64) DEFAULT NULL`, ok: false });
    }
  }

  // Check 6: item_id column on marketplace
  if (dbConnected) {
    try {
      const { query } = await import('@/lib/db');
      await query('SELECT item_id FROM cms_marketplace LIMIT 1');
      checks.push({ name: 'cms_marketplace.item_id column', val: '✓ exists', ok: true });
    } catch (e) {
      checks.push({ name: 'cms_marketplace.item_id column', val: `✗ missing — run fix_marketplace.sql`, ok: false });
    }
  }

  const allOk = checks.every(c => c.ok);

  return (
    <div style={{ padding: '40px 0' }} className="animate-fade-up">
      <div className="panel no-hover" style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
           OCMS Diagnostics
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          {allOk ? ' Everything looks good!' : ' Some issues found — fix them below.'}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Check</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                </td>
                <td style={{ ...tdStyle, color: c.ok ? '#34bd59' : '#EF5856' }}>
                  <span style={{ fontSize: 12, wordBreak: 'break-all' }}>{c.val}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 20, padding: 16, background: 'var(--panel-inner)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>If DB Connection fails:</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            1. Make sure MySQL is running<br />
            2. Check your <code style={{ color: 'var(--green)' }}>.env</code> file exists in the project root (not .env.example)<br />
            3. Verify DB_HOST, DB_USER, DB_PASS, DB_NAME are correct<br />
            4. Try connecting with the same credentials in HeidiSQL/phpMyAdmin<br />
            5. Run <code style={{ color: 'var(--green)' }}>sql/cms_tables.sql</code> if CMS tables are missing<br />
            6. Run <code style={{ color: 'var(--green)' }}>npm run build</code> after changing .env, then <code style={{ color: 'var(--green)' }}>npm start</code>
          </p>
        </div>

        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 16 }}>
          Delete this page (src/app/diag/page.js) before going live.
        </p>
      </div>
    </div>
  );
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'var(--text-muted)' };
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)' };
