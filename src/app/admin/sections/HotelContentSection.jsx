import Link from 'next/link';
import { query } from '@/lib/db';

export default async function HotelContentSection({ view, sp, user }) {

  if (view === 'badges') {
    const badges = await query(
      "SELECT ub.badge_code, COUNT(ub.user_id) AS owners FROM users_badges ub GROUP BY ub.badge_code ORDER BY owners DESC LIMIT 50"
    ).catch(() => null);
    return (
      <div>
        <SectionHeader title="Badge Manager" sub="View and manage badge distribution" back="hotel-content" />
        {badges === null ? (
          <ComingSoonPanel feature="Badge Manager" description="Requires a users_badges table in your Arcturus database. Full badge manager with upload/assign functionality coming soon." />
        ) : (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Most Common Badges (top 50)</h4>
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Badge Code</th><th>Preview</th><th>Owners</th></tr></thead>
              <tbody>
                {badges.map((b, i) => (
                  <tr key={i}>
                    <td><code style={{ fontSize: 11 }}>{b.badge_code}</code></td>
                    <td><img src={`/images/badges/${b.badge_code}.gif`} alt="" style={{ width: 40, height: 40, imageRendering: 'pixelated' }} onError="this.style.display='none'" /></td>
                    <td>{b.owners}</td>
                  </tr>
                ))}
                {badges.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No badge data found.</td></tr>}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'navigator') {
    const categories = await query('SELECT * FROM navigator_publiccats ORDER BY id').catch(() => null);

    if (categories === null) {
      return (
        <div>
          <SectionHeader title="Navigator Categories" sub="Manage navigator room categories" back="hotel-content" />
          <ComingSoonPanel feature="Navigator Categories" description="The navigator_publiccats table was not found. This table is part of the Arcturus emulator schema and should already exist in your hotel database." />
        </div>
      );
    }

    async function toggleNavCatAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 5) redirect('/admin');
      const id = parseInt(formData.get('id'));
      const current = formData.get('enabled') === '1' ? 1 : 0;
      if (id) await db('UPDATE navigator_publiccats SET enabled = ? WHERE id = ?', [current ? 0 : 1, id]);
      redirect('/admin?tab=hotel-content&view=navigator&success=Category+updated');
    }

    async function updateNavCatRankAction(formData) {
      'use server';
      const { getCurrentUser } = await import('@/lib/auth');
      const { query: db } = await import('@/lib/db');
      const { redirect } = await import('next/navigation');
      const u = await getCurrentUser();
      if (!u || u.rank < 5) redirect('/admin');
      const id = parseInt(formData.get('id'));
      const minRank = Math.max(0, parseInt(formData.get('min_rank')) || 0);
      if (id) await db('UPDATE navigator_publiccats SET min_rank = ? WHERE id = ?', [minRank, id]);
      redirect('/admin?tab=hotel-content&view=navigator&success=Min+rank+updated');
    }

    return (
      <div>
        <SectionHeader title="Navigator Categories" sub={`${categories.length} categories in navigator_publiccats`} back="hotel-content" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          <div className="adm-table-wrap"><table className="table-panel">
            <thead><tr><th>ID</th><th>Caption</th><th>Type</th><th>Min Rank</th><th>Enabled</th><th>Actions</th></tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.caption}</td>
                  <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{c.type}</span></td>
                  <td>
                    <form action={updateNavCatRankAction} style={{ display: 'flex', gap: 4 }}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="number" name="min_rank" defaultValue={c.min_rank || 0} min={0} max={10} style={{ width: 60 }} />
                      <button type="submit" className="btn btn-secondary btn-sm" style={{ fontSize: 9 }}>Set</button>
                    </form>
                  </td>
                  <td>{c.enabled ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>Yes</span> : <span style={{ color: '#EF5856' }}>No</span>}</td>
                  <td>
                    <form action={toggleNavCatAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="enabled" value={c.enabled ? '1' : '0'} />
                      <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: c.enabled ? '#EF5856' : 'var(--green)', background: c.enabled ? 'rgba(239,88,86,0.1)' : 'rgba(52,189,89,0.1)', border: `1px solid ${c.enabled ? 'rgba(239,88,86,0.3)' : 'rgba(52,189,89,0.3)'}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                        {c.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No categories found.</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>
    );
  }

  if (view === 'achievements') {
    const [achievements, pendingRow] = await Promise.all([
      query(
        'SELECT ua.achievement_name, COUNT(*) AS completions, SUM(ua.progress) AS total_progress FROM users_achievements ua GROUP BY ua.achievement_name ORDER BY completions DESC LIMIT 50'
      ).catch(() => null),
      query('SELECT COUNT(*) AS pending FROM users_achievements_queue').catch(() => [{ pending: 0 }]),
    ]);

    const pending = parseInt(pendingRow?.[0]?.pending || 0);

    if (achievements === null) {
      return (
        <div>
          <SectionHeader title="Achievements Manager" sub="Configure player achievements" back="hotel-content" />
          <div className="panel no-hover" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', marginBottom: 8 }}>users_achievements table not found in your database.</p>
          </div>
        </div>
      );
    }

    const totalCompletions = achievements.reduce((s, a) => s + (parseInt(a.completions) || 0), 0);

    return (
      <div>
        <SectionHeader title="Achievements Manager" sub="Configure player achievements" back="hotel-content" />
        <div className="panel no-hover" style={{ padding: '12px 18px', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{totalCompletions.toLocaleString()} total completions</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>{pending.toLocaleString()} pending in queue</span>
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          {achievements.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No achievement data yet.</p>
          ) : (
            <div className="adm-table-wrap"><table className="table-panel">
              <thead><tr><th>Achievement Name</th><th>Completions</th><th>Total Progress</th></tr></thead>
              <tbody>
                {achievements.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{a.achievement_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>{parseInt(a.completions || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{parseInt(a.total_progress || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    );
  }

  // Default: overview with links
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Catalog Editor', desc: 'Edit catalog pages, tabs, and item listings', href: '/admin/catalog', active: true },
          { label: 'Furniture Manager', desc: 'Browse and manage furniture definitions', href: '/admin/furniture', active: true },
          { label: 'Badge Manager', desc: 'View badge distribution and assign badges', href: '/admin?tab=hotel-content&view=badges', active: true },
          { label: 'Navigator Categories', desc: 'Configure navigator room categories', href: '/admin?tab=hotel-content&view=navigator', active: false },
          { label: 'Achievements Manager', desc: 'Manage achievement definitions and rewards', href: '/admin?tab=hotel-content&view=achievements', active: false },
        ].map((tool, i) => (
          <Link key={i} href={tool.href} className="panel no-hover" style={{ padding: 20, display: 'block', textDecoration: 'none', opacity: tool.active ? 1 : 0.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>{tool.label}</h4>
              {!tool.active && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 3 }}>soon</span>}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, back }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <Link href={`/admin?tab=${back}`} className="btn btn-secondary btn-sm">← Back</Link>
    </div>
  );
}

function ComingSoonPanel({ feature, description }) {
  return (
    <div className="panel no-hover" style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🚧</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{feature}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>{description}</p>
    </div>
  );
}
