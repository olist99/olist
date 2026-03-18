import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import ThreadActions from './ThreadActions';
import { renderBBCode } from '@/lib/bbcode';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const p = await params;
  const thread = await queryOne('SELECT title FROM cms_forum_threads WHERE id = ?', [parseInt(p.threadId)]).catch(() => null);
  return { title: thread?.title || 'Thread' };
}

export default async function ThreadPage({ params, searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const p = await params;
  const sp = await searchParams;
  const threadId = parseInt(p.threadId);
  const page = Math.max(1, parseInt(sp?.page || 1));
  const perPage = 15;
  const offset = (page - 1) * perPage;

  const thread = await queryOne(`
    SELECT t.*, u.username, u.look, u.rank AS user_rank,
      c.name AS category_name, c.icon AS category_icon, c.id AS category_id,
      c.min_rank, c.post_min_rank,
      COALESCE(t.created_at, t.timestamp, t.date, t.posted_at) AS created_at
    FROM cms_forum_threads t
    JOIN users u ON u.id = t.user_id
    JOIN cms_forum_categories c ON c.id = t.category_id
    WHERE t.id = ?
  `, [threadId]).catch(() => null);

  if (!thread) notFound();
  if (user.rank < thread.min_rank) redirect('/forum');

  await query('UPDATE cms_forum_threads SET views = views + 1 WHERE id = ?', [threadId]).catch(() => {});

  const [replies, totalReplies] = await Promise.all([
    query(`
      SELECT r.*, u.username, u.look, u.rank AS user_rank
      FROM cms_forum_replies r
      JOIN users u ON u.id = r.user_id
      WHERE r.thread_id = ?
      ORDER BY r.created_at ASC
      LIMIT ? OFFSET ?
    `, [threadId, perPage, offset]).catch(() => []),
    query('SELECT COUNT(*) as cnt FROM cms_forum_replies WHERE thread_id = ?', [threadId])
      .then(r => r[0]?.cnt || 0).catch(() => 0),
  ]);

  // Per-post like counts
  const likes = replies.length > 0
    ? await query(`
        SELECT target_type, target_id, COUNT(*) as count,
          MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_liked
        FROM cms_forum_likes
        WHERE (target_type = 'thread' AND target_id = ?)
           OR (target_type = 'reply' AND target_id IN (${replies.map(() => '?').join(',')}))
        GROUP BY target_type, target_id
      `, [user.id, threadId, ...replies.map(r => r.id)]).catch(() => [])
    : await query(`
        SELECT target_type, target_id, COUNT(*) as count,
          MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_liked
        FROM cms_forum_likes
        WHERE target_type = 'thread' AND target_id = ?
        GROUP BY target_type, target_id
      `, [user.id, threadId]).catch(() => []);

  const likesMap = {};
  for (const l of likes) {
    likesMap[`${l.target_type}:${l.target_id}`] = {
      count: Number(l.count),
      userLiked: l.user_liked === 1,
    };
  }

  // Likes received per poster in this thread (who owns the liked posts)
  const receivedLikesRows = replies.length > 0
    ? await query(`
        SELECT
          COALESCE(t.user_id, r.user_id) AS uid,
          COUNT(*) AS received
        FROM cms_forum_likes fl
        LEFT JOIN cms_forum_threads t ON fl.target_type = 'thread' AND fl.target_id = t.id AND t.id = ?
        LEFT JOIN cms_forum_replies r ON fl.target_type = 'reply'  AND fl.target_id = r.id AND r.thread_id = ?
        WHERE (fl.target_type = 'thread' AND fl.target_id = ?)
           OR (fl.target_type = 'reply'  AND fl.target_id IN (${replies.map(() => '?').join(',')}))
        GROUP BY COALESCE(t.user_id, r.user_id)
      `, [threadId, threadId, threadId, ...replies.map(r => r.id)]).catch(() => [])
    : await query(`
        SELECT t.user_id AS uid, COUNT(*) AS received
        FROM cms_forum_likes fl
        JOIN cms_forum_threads t ON fl.target_type = 'thread' AND fl.target_id = t.id
        WHERE fl.target_type = 'thread' AND fl.target_id = ?
        GROUP BY t.user_id
      `, [threadId]).catch(() => []);

  // userId → likes received in this thread
  const receivedMap = {};
  for (const r of receivedLikesRows) receivedMap[Number(r.uid)] = Number(r.received);

  const totalPages = Math.ceil(totalReplies / perPage);
  const canPost = user.rank >= thread.post_min_rank && !thread.locked;
  const isAdmin = user.rank >= 4;

  function parseUtc(date) {
    if (!date) return new Date(NaN);
    const s = date.toString().trim().replace(' UTC', '').replace(' ', 'T');
    return new Date(s.endsWith('Z') ? s : s + 'Z');
  }

  function timeAgo(date) {
    if (!date) return '';
    const d = parseUtc(date);
    if (isNaN(d)) return '';
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function avatarUrl(look) {
    if (!look) return null;
    return `https://www.habbo.com/habbo-imaging/avatarimage?figure=${encodeURIComponent(look)}&direction=2&head_direction=2&gesture=sml&action=std&size=m`;
  }

  function PostCard({ id, userId, username, look, userRank, body, createdAt, targetType, isOp }) {
    const likeData = likesMap[`${targetType}:${id}`] || { count: 0, userLiked: false };
    const received = receivedMap[Number(userId)] || 0;
    const src = avatarUrl(look);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        {/* ── Sidebar ── */}
        <div style={{
          padding: '20px 10px 16px',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>

          {/* Habbo avatar — full body */}
          <div style={{ width: 80, height: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {src
              ? <img src={src} alt={username} style={{ imageRendering: 'pixelated', maxWidth: 80, maxHeight: 110, objectFit: 'contain' }} />
              : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--panel-inner)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
            }
          </div>

          {/* Username */}
          <Link href={`/profile/${username}`}
            style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', textDecoration: 'none', textAlign: 'center' }}>
            {username}
          </Link>

          {/* Badges */}
          {isOp && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(52,189,89,0.15)', color: 'var(--green)' }}>OP</span>
          )}
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Rank {userRank}</div>

          {/* ── Likes received bar ── */}
          <div style={{
            width: '100%', marginTop: 6, padding: '7px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 5 }}>
              LIKES RECEIVED
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={{ fontSize: 14, color: received > 0 ? '#e05c8a' : 'rgba(255,255,255,0.15)' }}>♥</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: received > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {received}
              </span>
            </div>
            {/* Gradient fill bar */}
            <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min(100, (received / 20) * 100)}%`,
                background: received > 0 ? 'linear-gradient(90deg, #e05c8a, var(--green))' : 'transparent',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* ── Post body ── */}
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{timeAgo(createdAt)}</div>
          <div
            style={{ fontSize: 13, lineHeight: 1.7, wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: renderBBCode(body) }}
          />
          <ThreadActions
            threadId={thread.id}
            replyId={targetType === 'reply' ? id : null}
            targetType={targetType}
            targetId={id}
            initialLikes={likeData.count}
            initialUserLiked={likeData.userLiked}
            isAdmin={isAdmin}
            categoryId={thread.category_id}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Breadcrumb */}
      <div className="title-header" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        <Link href="/forum" style={{ color: 'var(--green)' }}>Forum</Link>
        {' › '}
        <Link href={`/forum/${thread.category_id}`} style={{ color: 'var(--green)' }}>
          {thread.category_name}
        </Link>
        {' › '}
        <span style={{ color: 'var(--text-secondary)' }}>{thread.title}</span>
        <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {thread.pinned === 1 && (
  <span
    style={{
      fontSize: 9,
      fontWeight: 800,
      padding: '2px 6px',
      borderRadius: 4,
      background: 'rgba(52,189,89,0.15)',
      color: 'var(--green)',
      textTransform: 'uppercase',
    }}
  >
    <img
      src="/images/forum/pin.png"
      alt="Pin"
      style={{ width: 13, height: 15, float: 'left' }}
    />{' '}
    Pinned
  </span>
)}

{thread.locked === 1 && (
  <span
    style={{
      fontSize: 9,
      fontWeight: 800,
      padding: '2px 6px',
      borderRadius: 4,
      background: 'rgba(239,88,86,0.15)',
      color: '#EF5856',
      textTransform: 'uppercase',
    }}
  >
    <img
      src="/images/forum/lock.png"
      alt="Lock"
      style={{ width: 13, height: 18, float: 'left' }}
    />{' '}
    Locked
  </span>
)}
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{thread.title}</h1>
        </div>

      </div>
      </div>
        {isAdmin && (
          <ThreadActions
            threadId={thread.id} isAdmin={isAdmin} isAdminBar
            isPinned={thread.pinned} isLocked={thread.locked}
            categoryId={thread.category_id}
          />
        )}
      {/* Thread header */}
      

      {/* Posts */}
      <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <PostCard
          id={thread.id} userId={thread.user_id} username={thread.username} look={thread.look}
          userRank={thread.user_rank} body={thread.body} createdAt={thread.created_at}
          targetType="thread" isOp
        />
        {replies.map(reply => (
          <PostCard key={reply.id}
            id={reply.id} userId={reply.user_id} username={reply.username} look={reply.look}
            userRank={reply.user_rank} body={reply.body} createdAt={reply.created_at}
            targetType="reply" isOp={false}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
            <Link key={pg} href={`/forum/thread/${threadId}?page=${pg}`}
              style={{
                width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                background: pg === page ? 'var(--green)' : 'var(--panel-inner)',
                color: pg === page ? '#000' : 'var(--text-muted)',
              }}>{pg}</Link>
          ))}
        </div>
      )}

      {/* Reply box */}
      {canPost ? (
        <ThreadActions threadId={thread.id} isReplyBox categoryId={thread.category_id} />
      ) : thread.locked ? (
        <div className="panel no-hover" style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          This thread is locked and cannot receive new replies.
        </div>
      ) : null}
    </div>
  );
}
