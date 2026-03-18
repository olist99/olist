'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

function parseUtc(s) {
  if (!s) return new Date(NaN);
  const t = s.toString().trim().replace(' UTC', '').replace(' ', 'T');
  return new Date(t.endsWith('Z') ? t : t + 'Z');
}
function timeAgo(s) {
  if (!s) return '';
  const diff = Math.floor((Date.now() - parseUtc(s)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ctrlBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, color: 'var(--text-secondary)',
  padding: '1px 5px', fontFamily: 'inherit', lineHeight: 1,
};

// ── Full-page Sticker Overlay ─────────────────────────────────────────────────
// Positions stored in px relative to the profile container so stickers
// scroll with the page and never resize when dragged to the edges.

export function StickerOverlay({ profileId, isOwn, initialStickers }) {
  const [stickers, setStickers]     = useState(initialStickers || []);
  const [available, setAvailable]   = useState([]);
  const [editing, setEditing]       = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const containerRef = useRef(null);
  const dragOffset   = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/api/profile?type=sticker_list')
      .then(r => r.json())
      .then(d => setAvailable(d.stickers || []))
      .catch(() => {});
  }, []);

  // Listen for edit trigger from the profile header button
  useEffect(() => {
    const handler = () => setEditing(true);
    document.addEventListener('sticker-edit', handler);
    return () => document.removeEventListener('sticker-edit', handler);
  }, []);

  // ── Drag — pure pixel coords, no percentages ──
  const startDrag = (e, idx) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const s = stickers[idx];
    // Store offset between pointer and sticker top-left corner
    dragOffset.current = {
      x: clientX - rect.left - s.x,
      y: clientY - rect.top  + window.scrollY - s.y,
    };
    setDragging(idx);
  };

  const onMove = useCallback((e) => {
    if (dragging === null) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left  - dragOffset.current.x;
    const y = clientY - rect.top   + window.scrollY - dragOffset.current.y;
    // Clamp so sticker stays within container bounds
    const maxX = container.offsetWidth  - 20;
    const maxY = container.scrollHeight - 20;
    setStickers(prev => prev.map((s, i) => i === dragging
      ? { ...s, x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) }
      : s
    ));
  }, [dragging]);

  const onUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (!editing) return;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [editing, onMove, onUp]);

  const addSticker = (file) => {
    if (stickers.length >= 20) return;
    const container = containerRef.current;
    const w = container ? container.offsetWidth  : 600;
    const h = container ? container.scrollHeight : 800;
    // Place randomly but away from edges
    const x = 60 + Math.random() * (w - 200);
    const y = 80 + Math.random() * Math.min(h - 200, 600);
    setStickers(prev => [...prev, { file, x, y, scale: 1, rot: 0 }]);
    setPickerOpen(false);
  };

  const removeSticker  = (idx) => setStickers(prev => prev.filter((_, i) => i !== idx));
  const updateSticker  = (idx, key, val) => setStickers(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_stickers', profile_id: profileId, stickers }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); setPickerOpen(false); }, 1500);
    } catch {}
    setSaving(false);
  };

  const cancelEdit = async () => {
    const res = await fetch(`/api/profile?type=stickers&profile_id=${profileId}`);
    const d   = await res.json();
    setStickers(d.stickers || []);
    setEditing(false);
    setPickerOpen(false);
  };

  if (stickers.length === 0 && !isOwn) return null;

  return (
    <>
      {/* Absolute layer inside position:relative profile wrapper */}
      <div
        ref={containerRef}
        style={{
          position:      'absolute',
          inset:         0,
          zIndex:        50,
          pointerEvents: 'none',
          overflow:      'hidden',
        }}
      >
        {stickers.map((s, i) => (
          <div
            key={i}
            onMouseDown={e => startDrag(e, i)}
            onTouchStart={e => startDrag(e, i)}
            style={{
              position:        'absolute',
              left:            s.x,
              top:             s.y,
              transform:       `rotate(${s.rot || 0}deg) scale(${s.scale || 1})`,
              transformOrigin: 'top left',
              cursor:          editing ? (dragging === i ? 'grabbing' : 'grab') : 'default',
              pointerEvents:   editing ? 'all' : 'none',
              zIndex:          dragging === i ? 60 : 51,
              touchAction:     'none',
              userSelect:      'none',
              filter:          editing ? 'drop-shadow(0 0 8px rgba(52,189,89,0.7))' : 'none',
              transition:      dragging === i ? 'none' : 'filter .2s',
              display:         'inline-block',
              lineHeight:      0,
            }}
          >
            <img
              src={`/images/stickers/${s.file}`}
              alt=""
              draggable={false}
              style={{
                display:        'block',
                pointerEvents:  'none',
                maxWidth:       'none',
                maxHeight:      'none',
              }}
            />
            {editing && (
              <div
                onMouseDown={e => e.stopPropagation()}
                style={{
                  position:  'absolute', top: -34, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', gap: 2,
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6, padding: '2px 4px',
                  whiteSpace: 'nowrap', zIndex: 70,
                  pointerEvents: 'all',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                <button onClick={() => updateSticker(i, 'scale', Math.min(3,   +(s.scale||1)+0.2))} style={ctrlBtn} title="Bigger">+</button>
                <button onClick={() => updateSticker(i, 'scale', Math.max(0.3, +(s.scale||1)-0.2))} style={ctrlBtn} title="Smaller">−</button>
                <button onClick={() => updateSticker(i, 'rot', ((+(s.rot||0)-15)+360)%360)} style={ctrlBtn} title="Rotate left">↺</button>
                <button onClick={() => updateSticker(i, 'rot', (+(s.rot||0)+15)%360)}       style={ctrlBtn} title="Rotate right">↻</button>
                <button onClick={() => removeSticker(i)} style={{ ...ctrlBtn, color: '#EF5856' }} title="Remove">✕</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar — fixed bottom-centre, only visible while editing */}
      {isOwn && editing && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--panel-bg)', border: '1px solid var(--border)',
          borderRadius: 50, padding: '8px 16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)', pointerEvents: 'all',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>{stickers.length}/20</span>
          <button onClick={() => setPickerOpen(p => !p)} className="btn btn-secondary btn-sm" style={{ borderRadius: 20, fontSize: 11 }}>
            {pickerOpen ? '✕ Close' : '+ Add Sticker'}
          </button>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm"
            style={{ borderRadius: 20, fontSize: 11, background: saved ? 'var(--green)' : undefined }}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
          </button>
          <button onClick={cancelEdit} className="btn btn-secondary btn-sm" style={{ borderRadius: 20, fontSize: 11 }}>Cancel</button>
        </div>
      )}

      {/* Sticker picker — fixed above toolbar */}
      {editing && pickerOpen && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, background: 'var(--panel-bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
          maxWidth: 480, width: 'calc(100vw - 32px)', maxHeight: 300, overflowY: 'auto',
          pointerEvents: 'all',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
            Pick a sticker
          </div>
          {available.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No stickers found. Add images to <code>/public/images/stickers/</code>
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {available.map(file => (
                <button key={file} onClick={() => addSticker(file)} title={file}
                  style={{ background: 'var(--panel-inner)', border: '2px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 6, cursor: 'pointer', transition: 'border-color .15s, transform .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                  <img src={`/images/stickers/${file}`} alt={file} style={{ width: 52, height: 52, objectFit: 'contain', display: 'block', imageRendering: 'pixelated' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Guestbook ────────────────────────────────────────────────────────────────

export default function GuestbookAndStickers({ profileId, profileUsername, currentUserId, currentUserRank, isOwn, initialStickers }) {
  const [entries, setEntries]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [message, setMessage]   = useState('');
  const [posting, setPosting]   = useState(false);
  const [postMsg, setPostMsg]   = useState(null);
  const [deleting, setDeleting] = useState(null);
  const perPage = 10;

  const loadEntries = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?type=guestbook&profile_id=${profileId}&page=${p}`);
      const d   = await res.json();
      setEntries(d.entries || []);
      setTotal(d.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadEntries(1); }, [profileId]);

  const handlePost = async () => {
    if (!message.trim()) return;
    setPosting(true); setPostMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guestbook_post', profile_id: profileId, message }),
      });
      const d = await res.json();
      if (d.ok) {
        setMessage('');
        setPostMsg({ type: 'success', text: 'Entry posted!' });
        loadEntries(1);
      } else {
        setPostMsg({ type: 'error', text: d.error || 'Failed to post' });
      }
    } catch {
      setPostMsg({ type: 'error', text: 'Connection error' });
    }
    setPosting(false);
  };

  const handleDelete = async (entryId) => {
    if (!confirm('Delete this guestbook entry?')) return;
    setDeleting(entryId);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guestbook_delete', entry_id: entryId }),
      });
      const d = await res.json();
      if (d.ok) {
        setEntries(prev => prev.filter(e => e.id !== entryId));
        setTotal(t => t - 1);
      }
    } catch {}
    setDeleting(null);
  };

  const canDelete = (entry) =>
    currentUserId && (
      currentUserId === entry.author_id ||
      currentUserId === profileId       ||
      currentUserRank >= 4
    );

  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      <StickerOverlay profileId={profileId} isOwn={isOwn} initialStickers={initialStickers} />

      <div className="card mt-5">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            📖 Guestbook
            {total > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{total} {total === 1 ? 'entry' : 'entries'}</span>}
          </span>
        </div>

        {currentUserId && (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'var(--panel-inner)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
              Leave a message for {profileUsername}
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write something nice…"
              maxLength={500}
              rows={3}
              style={{ width: '100%', marginBottom: 8, resize: 'vertical', fontSize: 13 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handlePost} disabled={posting || !message.trim()} className="btn btn-primary btn-sm">
                {posting ? 'Posting…' : 'Sign Guestbook'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{message.length}/500</span>
            </div>
            {postMsg && (
              <div className={`flash flash-${postMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>
                {postMsg.text}
              </div>
            )}
          </div>
        )}

        <div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No entries yet. Be the first to sign!</div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Link href={`/profile/${entry.author_name}`} style={{ flexShrink: 0 }}>
                  <img
                    src={`${HABBO_IMG}?figure=${encodeURIComponent(entry.author_look || '')}&headonly=1&size=s&direction=2&head_direction=2&gesture=sml`}
                    alt={entry.author_name}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel-inner)', display: 'block' }}
                  />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <Link href={`/profile/${entry.author_name}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {entry.author_name}
                    </Link>
                    {entry.author_id === profileId && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: 'rgba(52,189,89,0.15)', color: 'var(--green)' }}>OWNER</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(entry.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>{entry.message}</p>
                </div>
                {canDelete(entry) && (
                  <button onClick={() => handleDelete(entry.id)} disabled={deleting === entry.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                    title="Delete entry">
                    {deleting === entry.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '10px 18px', display: 'flex', gap: 6, justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => loadEntries(p)}
                className={p === page ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                style={{ minWidth: 32, padding: '3px 8px', fontSize: 12 }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
