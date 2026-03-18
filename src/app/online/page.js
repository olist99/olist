import Link from 'next/link';
import { query, queryScalar } from '@/lib/db';
import { formatNumber, RANK_COLORS, RANK_ICONS, timeAgo } from '@/lib/utils';
import Avatar from '@/components/Avatar';

export const metadata = { title: 'Users Online' };

export default async function OnlinePage({ searchParams }) {
  const sp = await searchParams;
  const search = sp?.q || '';
  const sort = sp?.sort || 'username';
  const page = Math.max(1, parseInt(sp?.p || '1'));
  const perPage = 24;

  const validSorts = {
    username: 'u.username ASC',
    credits: 'u.credits DESC',
    rank: 'u.rank DESC',
    newest: 'u.account_created DESC',
  };
  const orderBy = validSorts[sort] || validSorts.username;

let where = "WHERE u.online = '1'";
  let params = [];
  if (search) {
    where += ' AND u.username LIKE ?';
    params.push('%' + search + '%');
  }

  const totalOnline = await queryScalar(`SELECT COUNT(*) FROM users u ${where}`, params);
  const pages = Math.max(1, Math.ceil(totalOnline / perPage));
  const offset = (Math.min(page, pages) - 1) * perPage;

  // Arcturus: get online users
  const users = await query(`
    SELECT u.id, u.username, u.look, u.motto, u.credits, u.pixels, u.points,
           u.\`rank\`, u.online, u.last_online, u.account_created,
           p.rank_name
    FROM users u
    LEFT JOIN permissions p ON p.id = u.\`rank\`
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [...params, perPage, offset]);

  // Stats
  const totalUsers = await queryScalar('SELECT COUNT(*) FROM users');
  const peakToday = totalOnline; // simplified

  const sortOptions = [
    { key: 'username', label: 'Name' },
    { key: 'credits', label: 'Credits' },
    { key: 'rank', label: 'Rank' },
    { key: 'newest', label: 'Newest' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="title-header mb-4">
          <h2 className="text-xl font-bold">Users Online</h2>
          <p className="text-xs text-text-secondary mt-0.5">See who&apos;s currently in the hotel</p>
        </div>
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-5 max-md:grid-cols-1">
        {[
          { label: 'Currently Online', val: totalOnline, color: '#4ade80', icon: '/images/icon-online.png' },
          { label: 'Total Users', val: totalUsers, color: '#5bc0de', icon: '/images/icon-users.png' },
          { label: 'Peak Today', val: peakToday, color: '#f5a623', icon: '/images/icon-chart.png' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <span className="text-3xl"><img src={s.icon} alt="" style={{ width: 32, height: 32, imageRendering: "pixelated" }} /></span>
            <div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{formatNumber(s.val)}</div>
              <div className="text-xs text-text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header + Filters */}
      
      <div className="flex justify-between items-start mb-5 gap-4 flex-wrap">
        <div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Sort */}
          <div className="flex gap-1.5">
            {sortOptions.map(o => (
              <Link key={o.key} href={`/online?sort=${o.key}&q=${encodeURIComponent(search)}`}
                className={`btn btn-sm no-underline ${sort === o.key ? 'btn-primary' : 'btn-secondary'}`}>
                {o.label}
              </Link>
            ))}
          </div></div></div>
         
          {/* Search */}
          <form method="GET" action="/online" className="flex gap-1.5">
            <input type="hidden" name="sort" value={sort} />
            <input type="text" name="q" className="input !w-44 !py-1.5 !px-3 !text-xs" placeholder="Search users..." defaultValue={search} />
            <button type="submit" className="btn btn-secondary btn-sm"></button>
          </form>
        </div>                

      {/* Users Grid */}
      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
        {users.map(u => {
          const rankColor = RANK_COLORS[u.rank] || '#8b949e';
          return (
            <Link key={u.id} href={`/profile/${u.username}`}
              className="card p-4 text-center transition-all hover:-translate-y-1 hover:border-accent no-underline group">
              <div className="relative mx-auto mb-2 w-fit">
                <Avatar look={u.look} size="l" className="mx-auto" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-bg-secondary" />
              </div>
              <div className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{u.username}</div>
              <div className="text-[11px] mt-0.5" style={{ color: rankColor }}>
                <img src={RANK_ICONS[u.rank] || '/images/rank-member.png'} alt="" className="icon-inline" /> {u.rank_name || 'Member'}
              </div>
              <div className="text-[10px] text-text-muted mt-1 italic truncate">&ldquo;{u.motto}&rdquo;</div>
              {u.room_name && (
                <div className="mt-2 text-[10px] bg-bg-primary text-text-muted px-2 py-1 rounded-full truncate border border-border">
                  {u.room_name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="card p-16 text-center text-text-muted">
          {search ? `No online users matching "${search}".` : 'No users currently online.'}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex gap-1.5 justify-center mt-6">
          {Array.from({ length: pages }, (_, i) => i + 1).map(pg => (
            <Link key={pg} href={`/online?sort=${sort}&q=${encodeURIComponent(search)}&p=${pg}`}
              className={`px-3.5 py-2 rounded-md text-[13px] border no-underline transition-all
                ${pg === page ? 'bg-accent text-bg-primary border-accent font-bold' : 'border-border text-text-secondary hover:border-accent hover:text-accent'}`}>
              {pg}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
