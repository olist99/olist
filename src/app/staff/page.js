import Link from 'next/link';
import { query } from '@/lib/db';
import { RANK_COLORS, RANK_ICONS } from '@/lib/utils';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Staff' };

export default async function StaffPage() {
  // Arcturus: rank >= 3 = staff
  const staff = await query(`
    SELECT u.id, u.username, u.look, u.motto, u.online, u.rank,
           p.rank_name
    FROM users u
    LEFT JOIN permissions p ON p.id = u.rank
    WHERE u.rank >= 3
    ORDER BY u.rank DESC, u.username ASC
  `);

  // Group by rank
  const groups = {};
  staff.forEach(s => {
    const rName = s.rank_name || `Rank ${s.rank}`;
    if (!groups[s.rank]) groups[s.rank] = { name: rName, members: [] };
    groups[s.rank].members.push(s);
  });

  // Sort by rank desc
  const sortedRanks = Object.keys(groups).sort((a, b) => b - a);

  return (
    <div className="animate-fade-up">
      <div className="mb-6 title-header">
        <h2 className="text-xl font-bold">Staff Team</h2>
        <p className="text-xs text-text-secondary mt-0.5">Meet the team that keeps the Hotel running!</p>
      </div>

      {sortedRanks.length === 0 && (
        <div className="card p-16 text-center text-text-muted">No staff members to display.</div>
      )}

      {sortedRanks.map(rankId => {
        const group = groups[rankId];
        const color = RANK_COLORS[rankId] || '#8b949e';
        const icon = RANK_ICONS[rankId] || '/images/rank-member.png';

        return (
          <div key={rankId} className="mb-8">
            <h3 className="title-header text-lg font-bold mb-4 pb-2 border-b-2 border-border flex items-center gap-2.5">
              <img src={icon} alt="" style={{ width: 20, height: 20, imageRendering: 'pixelated' }} />
              <span style={{ color }}>{group.name}</span>
              <span className="text-xs font-normal text-text-muted ml-2">({group.members.length})</span>
            </h3>
            <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
              {group.members.map(member => (
                <Link key={member.id} href={`/profile/${member.username}`}
                  className="bg-bg-secondary border border-border rounded-lg p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent no-underline"
                  style={{ ':hover': { boxShadow: `0 4px 20px ${color}33` } }}>
                  <div className="mx-auto mb-2.5">
                    <Avatar look={member.look} size="l" className="mx-auto" />
                  </div>
                  <div className="text-[15px] font-bold text-text-primary">{member.username}</div>
                  <div className="text-xs mt-1" style={{ color }}>{group.name}</div>
                  <div className="text-[11px] text-text-muted mt-1.5 italic">&ldquo;{member.motto}&rdquo;</div>
                  {member.online ? (
                    <span className="inline-block mt-2 text-[11px] text-accent bg-accent/10 px-2.5 py-0.5 rounded-full"> Online</span>
                  ) : (
                    <span className="inline-block mt-2 text-[11px] text-text-muted bg-bg-primary px-2.5 py-0.5 rounded-full">⚫ Offline</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
