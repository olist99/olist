'use client';

const RANK_COLORS = {
  1: '#8b949e', 2: '#f5a623', 3: '#5bc0de',
  4: '#3b82f6', 5: '#8b5cf6', 6: '#ef4444', 7: '#4ade80',
};

const RANK_ICONS = {
  7: '/images/rank7.gif',  6: '/images/rank6.gif',
  5: '/images/rank5.gif', 4: '/images/rank4.gif',
  3: '/images/rank3.gif',  2: '/images/rank2.gif',
  1: '/images/rank-member.gif',
};

export default function RankLegend({ groups, sortedRanks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sortedRanks.map(rankId => {
        const group = groups[rankId];
        const color = RANK_COLORS[rankId] || '#8b949e';
        const icon = RANK_ICONS[rankId] || '/images/rank-member.gif';
        return (
          <div key={rankId}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <img src={icon} alt="" style={{ width: 39, height: 42, imageRendering: 'pixelated' }} />
              <span style={{ color, fontWeight: 800, fontSize: 13 }}>{group.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({group.members.length})</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.members.map(s => (
                <a
                  key={s.id}
                  href={`/profile/${s.username}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 20,
                    background: `${color}0f`,
                    border: `1px solid ${color}25`,
                    textDecoration: 'none', color: 'inherit',
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${color}66`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = `${color}25`}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: s.online ? '#4ade80' : '#6b7280',
                    display: 'inline-block', flexShrink: 0,
                    boxShadow: s.online ? '0 0 6px #4ade80' : 'none',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{s.username}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
