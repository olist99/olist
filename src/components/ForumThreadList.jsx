'use client';
import React from 'react';
import Link from 'next/link';

// Move timeAgo here so it's in scope
function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ForumThreadList({ category, threads, page, totalPages, canPost, categoryId }) {
  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="title-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div  style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <Link href="/forum" style={{ color: 'var(--green)' }}>Forum</Link> › {category.name}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{category.name}</h1>
          {category.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{category.description}</p>}
        </div>
        {canPost && <Link href={`/forum/${categoryId}/new`} className="btn btn-primary">+ New Thread</Link>}
      </div>

      {/* Thread list */}
      <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        {threads.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No threads yet.{canPost ? ' Be the first to post!' : ''}
          </div>
        ) : (
          threads.map((thread, idx) => <ThreadRow key={thread.id} thread={thread} isLast={idx === threads.length - 1} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/forum/${categoryId}?page=${p}`}
              style={{
                width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                background: p === page ? 'var(--green)' : 'var(--panel-inner)',
                color: p === page ? '#000' : 'var(--text-muted)',
              }}>{p}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadRow({ thread, isLast }) {
  const [hover, setHover] = React.useState(false);

  const bg = thread.pinned
    ? hover ? 'rgba(52,189,89,0.08)' : 'rgba(52,189,89,0.04)'
    : hover ? 'rgba(255,255,255,0.02)' : 'transparent';

  return (
    <Link href={`/forum/thread/${thread.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '14px 20px', alignItems: 'center',
          borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : 'none',
          background: bg,
          transition: 'background 0.15s',
        }}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
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
            <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.title}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            by <span style={{ color: 'var(--green)' }}>{thread.username}</span> · {timeAgo(thread.created_at)}
            {thread.last_reply_username && thread.reply_count > 0 && (
              <> · Last reply by <span style={{ color: 'var(--green)' }}>{thread.last_reply_username}</span> {timeAgo(thread.last_reply_at)}</>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{thread.reply_count}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>replies</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{thread.views} views</div>
        </div>
      </div>
    </Link>
  );
}