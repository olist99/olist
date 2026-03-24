import Link from 'next/link';
import { query } from '@/lib/db';
import Avatar from '@/components/Avatar';

const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

function Podium({ top3, icon, format }) {
  if (!top3 || top3.length < 1) return null;
  // Display order: 2nd | 1st | 3rd
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const classes = top3[1] ? ['p2', 'p1', 'p3'] : ['p1'];
  const labels = top3[1] ? ['2nd', '1st', '3rd'] : ['1st'];
  const labelColors = ['#c0c0c0', '#f5c842', '#cd7f32'];
  return (
    <div className="podium">
      {order.map((user, i) => {
        const realIdx = top3[1] ? (i === 0 ? 1 : i === 1 ? 0 : 2) : 0;
        const cls = classes[i];
        return (
          <div key={user.id} className="podium-slot">
            <div className="podium-avatar">
              <span className="podium-rank-badge" style={{ background: `${labelColors[realIdx]}22`, color: labelColors[realIdx], border: `1px solid ${labelColors[realIdx]}55` }}>
                {labels[i]}
              </span>
              <Link href={`/profile/${user.username}`}>
                <img src={`${HABBO_IMG}?figure=${user.look}&direction=2&head_direction=2&gesture=sml&headonly=1&size=m`}
                  alt={user.username} style={{ imageRendering: 'pixelated', marginTop: 10, display: 'block' }} />
              </Link>
            </div>
            <Link href={`/profile/${user.username}`} className="podium-name no-underline" style={{ color: labelColors[realIdx] }}>{user.username}</Link>
            <div className="podium-value">
              {icon && <img src={icon} alt="" style={{ width: 12, height: 12, verticalAlign: 'middle', imageRendering: 'pixelated' }} />}
              {' '}{format ? format(user.value) : fmtNum(user.value)}
            </div>
            <div className={`podium-base ${cls}`}>{labels[i][0]}</div>
          </div>
        );
      })}
    </div>
  );
}

export const metadata = { title: 'Leaderboards' };

function fmtNum(n) { return (parseInt(n) || 0).toLocaleString(); }

function fmtTime(s) {
  const sec = parseInt(s) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const RANK_COLORS = ['', '#f5c842', '#c0c0c0', '#cd7f32'];

function MiniBoard({ title, icon, rows, valueLabel, format }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <img src={icon} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />}
        <span style={{ fontWeight: 800, fontSize: 14 }}>{title}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No data</div>
      ) : rows.map((row, i) => (
        <div key={row.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ width: 22, fontSize: 12, fontWeight: 800, color: RANK_COLORS[i + 1] || 'var(--text-muted)', flexShrink: 0 }}>
            #{i + 1}
          </div>
          <Avatar look={row.look} size="s" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/profile/${row.username}`} className="no-underline" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
              {row.username}
            </Link>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {icon && <img src={icon} alt="" style={{ width: 14, height: 14, objectFit: 'contain', marginRight: 4, verticalAlign: 'middle' }} />}
            {format ? format(row.value) : fmtNum(row.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function LeaderboardsPage() {
  const [credits, duckets, diamonds, respects, chats, onlineTime] = await Promise.all([
    query(`
      SELECT u.id, u.username, u.look, u.credits AS value
      FROM users u WHERE u.rank >= 1
      ORDER BY u.credits DESC LIMIT 10
    `).catch(() => []),

    query(`
      SELECT u.id, u.username, u.look, u.pixels AS value
      FROM users u WHERE u.rank >= 1
      ORDER BY u.pixels DESC LIMIT 10
    `).catch(() => []),

    query(`
      SELECT u.id, u.username, u.look, u.points AS value
      FROM users u WHERE u.rank >= 1
      ORDER BY u.points DESC LIMIT 10
    `).catch(() => []),

    query(`
      SELECT u.id, u.username, u.look, u.respect AS value
      FROM users u WHERE u.rank >= 1
      ORDER BY u.respect DESC LIMIT 10
    `).catch(() => []),

    query(`
      SELECT u.id, u.username, u.look, COUNT(c.id) AS value
      FROM users u
      INNER JOIN chatlogs_room c ON c.user_id = u.id
      WHERE u.rank >= 1
      GROUP BY u.id, u.username, u.look
      ORDER BY value DESC LIMIT 10
    `).catch(() => []),

    query(`
      SELECT u.id, u.username, u.look, u.online_time AS value
      FROM users u WHERE u.rank >= 1
      ORDER BY u.online_time DESC LIMIT 10
    `).catch(() => []),
  ]);

  const sections = [
    { title: 'Credits',       icon: '/images/coin.png',   rows: credits,     format: null },
    { title: 'Duckets',       icon: '/images/ducket.png', rows: duckets,     format: null },
    { title: 'Diamonds',      icon: '/images/diamond.png',rows: diamonds,    format: null },
    { title: 'Most Respects', icon: null,                 rows: respects,    format: v => fmtNum(v) + ' ❤️' },
    { title: 'Chats Sent',    icon: null,                 rows: chats,       format: v => fmtNum(v) + ' msgs' },
    { title: 'Online Time',   icon: null,                 rows: onlineTime,  format: v => fmtTime(v) },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-4 title-header">
        <div>
          <h2 className="text-xl font-bold">Leaderboards</h2>
          <p className="text-xs text-text-secondary mt-0.5">Top users ranked across all categories</p>
        </div>
      </div>

      <div className="r-grid-3 mobile-full" style={{ gap: 24 }}>
        {sections.map(({ title, icon, rows, format }) => (
          <div key={title}>
            <Podium top3={rows.slice(0, 3)} icon={icon} format={format} />
            <MiniBoard title={title} icon={icon} rows={rows} format={format} />
          </div>
        ))}
      </div>
    </div>
  );
}
