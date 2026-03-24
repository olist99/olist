import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import StaffScene from './StaffScene';
import RankLegend from './RankLegend';
import BackgroundSetter from './BackgroundSetter';

export const metadata = { title: 'Staff Team' };

export default async function StaffPage() {
  const user = await getCurrentUser();

  const staff = await query(`
    SELECT u.id, u.username, u.look, u.motto, u.online, u.rank,
           p.rank_name
    FROM users u
    LEFT JOIN permissions p ON p.id = u.\`rank\`
    WHERE u.rank >= 3
    ORDER BY u.rank DESC, u.username ASC
  `);

  const posRows = await query(
    'SELECT user_id, x_pct, y_pct, direction, head_direction, sitting FROM cms_staff_positions'
  ).catch(() => []);

  const savedPositions = {};
  for (const p of posRows) {
    savedPositions[p.user_id] = {
      x: parseFloat(p.x_pct),
      y: parseFloat(p.y_pct),
      direction: p.direction ?? 2,
      head_direction: p.head_direction ?? 2,
      sitting: p.sitting ?? 0,
    };
  }

  const canEdit = user?.rank >= 7;

  const bgRow = await query(
    "SELECT `value` FROM cms_settings WHERE `key` = 'staff_background'"
  ).then(r => r[0]).catch(() => null);
  const backgroundUrl = bgRow?.value || null;

  const fgRow = await query(
    "SELECT `value` FROM cms_settings WHERE `key` = 'staff_foreground'"
  ).then(r => r[0]).catch(() => null);
  const foregroundUrl = fgRow?.value || null;

  // Build groups for legend
  const groups = {};
  staff.forEach(s => {
    const key = String(s.rank);
    if (!groups[key]) groups[key] = { name: s.rank_name || `Rank ${s.rank}`, members: [] };
    groups[key].members.push({ id: s.id, username: s.username, online: s.online ? 1 : 0 });
  });
  const sortedRanks = Object.keys(groups).sort((a, b) => b - a);

  const onlineCount = staff.filter(s => s.online).length;
  const offlineCount = staff.length - onlineCount;

  // Rank breakdown for info box
  const rankBreakdown = sortedRanks.map(r => ({
    rank: Number(r),
    name: groups[r].name,
    count: groups[r].members.length,
    online: groups[r].members.filter(m => m.online).length,
  }));

  const RANK_COLORS = {
    1: '#8b949e', 2: '#f5a623', 3: '#5bc0de',
    4: '#3b82f6', 5: '#8b5cf6', 6: '#ef4444', 7: '#4ade80',
  };

  return (
    <div className="animate-fade-up">
      <div className="title-header mb-5">
        <h2 className="text-xl font-bold">Staff Team</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Meet the team keeping the hotel running ·{' '}
          <span style={{ color: '#4ade80', fontWeight: 700 }}>{onlineCount} online</span>
          {' '}/ {staff.length} total
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="card p-16 text-center text-text-muted">No staff members to display.</div>
      ) : (
        <>
          {/* Scene + info box side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, marginBottom: 28, alignItems: 'stretch' }}>

            {/* Info box */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>

              {/* Rank breakdown */}
              <div className="panel no-hover" style={{ padding: '18px 16px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  Who are we?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <p>Team Habbo is a group of passionate, hardworking individuals who care about bringing you the best possible experience yet. We're all about delivering real value, and each of us brings something unique to the table.
                      </p><br></br><p>
Whether it's improving features, solving problems, or just making things run smoother, we're constantly looking for ways to make your experience with us better. Above all, we're here to make sure you enjoy every moment with Habbo.</p>
                </div>
              </div>
            </div>

            {/* Scene */}
            <StaffScene
              staff={staff.map(s => ({
                id: s.id,
                username: s.username,
                look: s.look,
                rank: s.rank,
                rank_name: s.rank_name,
                online: s.online ? 1 : 0,
              }))}
              initialPositions={savedPositions}
              canEdit={canEdit}
              backgroundUrl={backgroundUrl}
              foregroundUrl={foregroundUrl}
            />
          </div>

        </>
      )}
    </div>
  );
}
