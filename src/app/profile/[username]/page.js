import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne, queryScalar } from '@/lib/db';
import { formatNumber, badgeUrl, timeAgo, unixToDate, RANK_COLORS, RANK_ICONS } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import GuestbookAndStickers from './GuestbookAndStickers';
import ProfileActions from './ProfileActions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const p = await params;
  return { title: `${p.username}'s Profile` };
}

export default async function ProfilePage({ params }) {
  const p = await params;
  const profile = await queryOne(`
    SELECT u.id, u.username, u.mail, u.look, u.motto, u.credits, u.pixels, u.points,
           u.rank, u.online, u.last_online, u.account_created, u.gotw,
           p.rank_name, p.badge AS rank_badge
    FROM users u
    LEFT JOIN permissions p ON p.id = u.rank
    WHERE u.username = ?
  `, [p.username]);

  if (!profile) notFound();

  const currentUser = await getCurrentUser();
  const isOwn = currentUser?.id === profile.id;
  const rankColor = RANK_COLORS[profile.rank] || '#8b949e';

  const [badges, recentComments, marketActivity, relationships, cameraPhotos, initialStickers] = await Promise.all([
    query('SELECT badge_code FROM users_badges WHERE user_id = ? LIMIT 20', [profile.id]),
    query(`
      SELECT c.*, n.title AS news_title
      FROM cms_news_comments c
      JOIN cms_news n ON n.id = c.news_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC LIMIT 5
    `, [profile.id]),
    query(`
      SELECT m.id, m.item_name, m.price, m.currency, m.status, m.created_at, m.sold_at,
             buyer.username AS buyer_name
      FROM cms_marketplace m
      LEFT JOIN users buyer ON buyer.id = m.buyer_id
      WHERE m.seller_id = ? OR m.buyer_id = ?
      ORDER BY COALESCE(m.sold_at, m.created_at) DESC LIMIT 5
    `, [profile.id, profile.id]).catch(() => []),
    query(`
      SELECT ur.relation, u.username, u.look
      FROM users_relationships ur
      JOIN users u ON u.id = ur.target_id
      WHERE ur.user_id = ? AND ur.relation > 0
      ORDER BY ur.relation ASC
    `, [profile.id]).catch(() => []),
    query(`
      SELECT p.id, p.photo_url, p.room_name, p.created_at,
             (SELECT COUNT(*) FROM cms_camera_likes l WHERE l.photo_id = p.id) AS like_count
      FROM cms_camera_photos p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC LIMIT 6
    `, [profile.id]).catch(() => []),
    queryOne('SELECT stickers FROM cms_profile_stickers WHERE profile_id = ?', [profile.id])
      .then(r => { try { return r ? JSON.parse(r.stickers) : []; } catch { return []; } })
      .catch(() => []),
  ]);

  const REL_CONFIG = {
    1: { label: 'Love',  icon: '/images/rel_heart.png', color: '#EF5856' },
    2: { label: 'BFF',   icon: '/images/rel_smile.png', color: '#f5c842' },
    3: { label: 'Rival', icon: '/images/rel_skull.png', color: '#8b949e' },
  };
  const relGroups = { 1: [], 2: [], 3: [] };
  for (const r of relationships) {
    if (relGroups[r.relation]) relGroups[r.relation].push(r);
  }

  const accountAge = profile.account_created
    ? Math.floor((Date.now() / 1000 - profile.account_created) / 86400)
    : 0;

  return (
    <div className="animate-fade-up" style={{ position: 'relative' }}>
      {/* Hero */}
      <div className="profilebox rounded-lg border border-border p-8 flex gap-6 items-center mb-5 relative overflow-hidden max-md:flex-col max-md:text-center">
        <Avatar look={profile.look} />
        <div>
          <h1 className="text-3xl font-bold mb-1">{profile.username}</h1>
          <p className="text-text-secondary text-sm italic">&ldquo;{profile.motto}&rdquo;</p>
          <div className="flex gap-2 mt-2 max-md:justify-center">
            <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: `${rankColor}22`, color: rankColor, border: `1px solid ${rankColor}44` }}>
              <img src={RANK_ICONS[profile.rank] || '/images/rank-member.png'} alt="" className="icon-inline" /> {profile.rank_name || 'Member'}
            </span>
            {profile.online ? (
              <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-accent/10 text-accent border border-accent/30">Online</span>
            ) : (
              <span className="inline-block px-3 py-0.5 rounded-full text-[11px] text-text-muted bg-bg-primary border border-border">
                Last seen: {profile.last_online ? timeAgo(profile.last_online) : 'Unknown'}
              </span>
            )}
          </div>
        </div>
        {isOwn && (
          <ProfileActions />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5 max-md:grid-cols-2">
        {[
          { label: 'Credits', val: profile.credits, color: '#bda75e' },
          { label: 'Duckets', val: profile.pixels, color: '#9a65af' },
          { label: 'Diamonds', val: profile.points, color: '#7eb4a9' },
          { label: 'GOTW', val: profile.gotw, color: '#ad5460' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{formatNumber(s.val)}</div>
            <div className="text-xs text-text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
        {/* Info */}
        <div className="card">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Profile Information</h3></div>
          <div className="p-5 space-y-0">
            {[
              ['Member since', unixToDate(profile.account_created)],
              ['Account age', `${accountAge} days`],
              ['Rank', profile.rank_name || 'Member'],
            ].map(([label, val], i) => (
              <div key={label} className={`flex items-center justify-between py-2.5 ${i < 3 ? 'border-b border-border' : ''}`}>
                <span className="text-[13px] text-text-secondary">{label}</span>
                <span className="text-sm font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="card">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Badges ({badges.length})</h3></div>
          <div className="p-5">
            {badges.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {badges.map((b, i) => (
                  <img key={i} src={badgeUrl(b.badge_code)} alt={b.badge_code} title={b.badge_code}
                    className="w-10 h-10 rounded pixel-render hover:scale-110 transition-transform" />
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-[13px]">No badges to display.</p>
            )}
          </div>
        </div>
      </div>
      {/* Relationships */}
      {relationships.length > 0 && (
        <div className="card mt-5">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Relationships</h3></div>
          <div className="p-5">
            {[1, 2, 3].map(relType => {
              const group = relGroups[relType];
              if (!group.length) return null;
              const cfg = REL_CONFIG[relType];
              return (
                <div key={relType} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={cfg.icon} alt={cfg.label} style={{ width: 16, height: 16 }} /> {cfg.label}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {group.map((r, i) => (
                      <a key={i} href={`/profile/${r.username}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <img
                          src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${encodeURIComponent(r.look || '')}&headonly=1&size=s&direction=2&head_direction=2&gesture=sml`}
                          alt={r.username}
                          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel-inner)', border: `2px solid ${cfg.color}44` }}
                        />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>{r.username}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
      {/* Recent Activity */}
        <div className="card mt-5">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Recent Activity</h3></div>
          <div className="p-5">
            {recentComments.length > 0 ? recentComments.map(rc => (
              <div key={rc.id} className="py-2.5 border-b border-border last:border-0">
                <span className="text-text-muted text-xs">{timeAgo(rc.created_at)}</span>
                <span className="text-[13px]"> — Commented on <Link href={`/news/${rc.news_id}`} className="text-accent">{rc.news_title}</Link></span>
              </div>
           )) : (
              <p className="text-text-muted text-[13px]">No recent comments.</p>
            )}
          </div>
        </div>

      {/* Marketplace Activity */}
        <div className="card mt-5">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Marketplace Activity</h3></div>
          <div className="p-5">
            {marketActivity.length > 0 ? marketActivity.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{m.item_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {m.status === 'sold' ? (
                      m.seller_id === profile.id ? `Sold to ${m.buyer_name}` : `Bought from seller`
                    ) : m.status === 'active' ? 'Listed' : m.status === 'cancelled' ? 'Cancelled' : m.status}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{m.price?.toLocaleString()} <img src="/images/diamond.png" alt="" className="icon-inline" /></div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(m.sold_at || m.created_at)} — {new Date(m.sold_at || m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                </div>
              </div>
            )) : (
              <p className="text-text-muted text-[13px]">No marketplace activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* Camera Photos */}
      {cameraPhotos.length > 0 && (
        <div className="card mt-5">
          <div className="px-5 py-4 border-b border-border" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="font-bold">Camera ({cameraPhotos.length})</h3>
            <a href="/camera" style={{ fontSize: 11, color: 'var(--green)' }}>View all</a>
          </div>
          <div className="camera-grid">
            {cameraPhotos.map(p => (
              <div key={p.id} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--panel-inner)' }}>
                <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }} />
                <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  ♥ {p.like_count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Guestbook & Stickers */}
      <GuestbookAndStickers
        profileId={profile.id}
        profileUsername={profile.username}
        currentUserId={currentUser?.id || null}
        currentUserRank={currentUser?.rank || 0}
        isOwn={isOwn}
        initialStickers={initialStickers}
      />
    </div>
  );
}
