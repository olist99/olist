'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { renderBBCode } from '@/lib/bbcode';
import Image from 'next/image';
function FormatToolbar({ textareaRef, value, onChange }) {
  const wrap = (before, after) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 0);
  };

  const buttons = [
    { label: 'B', title: 'Bold', style: { fontWeight: 900 }, action: () => wrap('[b]', '[/b]') },
    { label: 'I', title: 'Italic', style: { fontStyle: 'italic' }, action: () => wrap('[i]', '[/i]') },
    { label: 'U', title: 'Underline', style: { textDecoration: 'underline' }, action: () => wrap('[u]', '[/u]') },
    { label: '💛', title: 'Highlight', style: {}, action: () => wrap('[hl]', '[/hl]') },
    { label: '❝', title: 'Quote', style: { fontSize: 14 }, action: () => wrap('[quote]\n', '\n[/quote]') },
    { label: '🔗', title: 'Link', style: {}, action: () => wrap('[url=https://]', '[/url]') },
  ];

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {buttons.map(b => (
        <button key={b.label} type="button" onClick={b.action} title={b.title} style={{
          ...b.style, padding: '4px 10px', borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
          color: '#fff', cursor: 'pointer', fontSize: 12, minWidth: 32,
        }}>{b.label}</button>
      ))}
    </div>
  );
}

export default function ThreadActions({
  threadId, replyId, targetType, targetId,
  initialLikes = 0, initialUserLiked = false,
  isAdmin = false, isAdminBar = false, isReplyBox = false,
  isPinned = false, isLocked = false, categoryId,
}) {
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [liking, setLiking] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [pinned, setPinned] = useState(isPinned);
  const [locked, setLocked] = useState(isLocked);
  const replyRef = useRef(null);

  const toggleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch('/api/forum', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_like', target_type: targetType, target_id: targetId }),
      });
      const data = await res.json();
      if (data.ok) { setLikes(prev => data.liked ? prev + 1 : prev - 1); setUserLiked(data.liked); }
    } catch {}
    setLiking(false);
  };

  const postReply = async () => {
    if (!replyBody.trim() || replyBody.length < 2) return setError('Reply cannot be empty');
    setPosting(true); setError('');
    try {
      const res = await fetch('/api/forum', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_reply', thread_id: threadId, body: replyBody }),
      });
      const data = await res.json();
      if (data.ok) { setReplyBody(''); setPreview(false); router.refresh(); }
      else setError(data.error || 'Failed to post');
    } catch { setError('Something went wrong'); }
    setPosting(false);
  };

  const adminAction = async (action) => {
    try {
      const res = await fetch('/api/forum', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, thread_id: threadId, reply_id: replyId }),
      });
      const data = await res.json();
      if (!data.ok) return;
      if (action === 'pin_thread') setPinned(data.pinned);
      if (action === 'lock_thread') setLocked(data.locked);
      if (action === 'delete_thread') router.push(`/forum/${categoryId}`);
      if (action === 'delete_reply') router.refresh();
    } catch {}
  };

  // Admin bar
  if (isAdminBar) {
    return (
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button
                onClick={() => adminAction('pin_thread')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
            >
                <Image
                    src={pinned ? "/images/forum/unpin.png" : "/images/forum/pin.png"}
                    alt={pinned ? "Unpin" : "Pin"}
                    width={12}
                    height={12}
                    style={{ display: 'inline-block', marginRight: '4px', marginTop: '-4px' }}
                />
                {pinned ? "Unpin" : "Pin"}
            </button>

            <button
                onClick={() => adminAction('lock_thread')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
            >
                <Image
                    src={locked ? "/images/forum/unlock.png" : "/images/forum/lock.png"}
                    alt={locked ? "Unlock" : "Lock"}
                    width={12}
                    height={12}
                    style={{ display: 'inline-block', marginRight: '4px', marginTop: '-4px' }}
                />
                {locked ? "Unlock" : "Lock"}
            </button>

            <button
                onClick={() => { if (confirm('Delete this thread and all replies?')) adminAction('delete_thread'); }}
                className="btn btn-delete"
                style={{ fontSize: 10, background: 'rgba(239,88,86,0.15)', color: '#EF5856', display: 'flex', alignItems: 'center', gap: 4 }}
            >
                <Image src="/images/forum/trash.png" alt="Delete" width={12} height={12} style={{ display: 'inline-block', marginRight: '4px', marginTop: '-4px' }} />
                Delete Thread
            </button>
      </div>
    );
  }

  // Reply box
  if (isReplyBox) {
    return (
      <div className="panel no-hover" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Post a Reply</div>
          <button type="button" onClick={() => setPreview(v => !v)}
            style={{ fontSize: 10, fontWeight: 700, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer' }}>
            {preview ? '✏️ Edit' : '👁️ Preview'}
          </button>
        </div>
        <FormatToolbar textareaRef={replyRef} value={replyBody} onChange={setReplyBody} />
        {preview ? (
          <div style={{ minHeight: 100, padding: '10px 12px', borderRadius: 'var(--radius)', background: 'var(--panel-inner)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}
            dangerouslySetInnerHTML={{ __html: renderBBCode(replyBody) || '<span style="color:var(--text-muted);font-style:italic">Nothing to preview...</span>' }} />
        ) : (
          <textarea ref={replyRef} value={replyBody} onChange={e => setReplyBody(e.target.value)}
            placeholder="Write your reply..." rows={5} maxLength={10000}
            style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{replyBody.length}/10000</div>
        {error && <div className="flash flash-error" style={{ marginBottom: 8 }}>{error}</div>}
        <button onClick={postReply} disabled={posting} className="btn btn-primary" style={{ opacity: posting ? 0.5 : 1 }}>
          {posting ? 'Posting...' : 'Post Reply'}
        </button>
      </div>
    );
  }

  // Like + admin actions per post
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <button onClick={toggleLike} disabled={liking} style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
        border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
        background: userLiked ? 'rgba(52,189,89,0.15)' : 'rgba(255,255,255,0.06)',
        color: userLiked ? 'var(--green)' : 'var(--text-muted)', transition: 'all 0.15s',
      }}>
        <Image src="/images/forum/forum-like.png" alt="Delete" width={13} height={14} style={{ display: 'inline-block', marginRight: '4px', marginTop: '-2px' }} /> {likes > 0 ? likes : ''} {likes === 1 ? 'Like' : 'Likes'}
      </button>

      {isAdmin && (
        <button onClick={() => { if (confirm('Delete this post?')) adminAction(replyId ? 'delete_reply' : 'delete_thread'); }}
          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'rgba(239,88,86,0.1)', color: '#EF5856' }}>
          <Image src="/images/forum/trash.png" alt="Delete" width={12} height={12} style={{ display: 'inline-block', marginRight: '4px', marginTop: '-4px' }} /> Delete
        </button>
      )}
    </div>
  );
}
