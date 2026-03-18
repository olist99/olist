'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

function renderBBCode(text) {
  if (!text) return '';
  return text
    .replace(/\[b\](.*?)\[\/b\]/gs, '<strong>$1</strong>')
    .replace(/\[i\](.*?)\[\/i\]/gs, '<em>$1</em>')
    .replace(/\[u\](.*?)\[\/u\]/gs, '<span style="text-decoration:underline">$1</span>')
    .replace(/\[hl\](.*?)\[\/hl\]/gs, '<mark style="background:rgba(245,166,35,0.3);color:inherit;padding:1px 3px;border-radius:3px">$1</mark>')
    .replace(/\[quote\](.*?)\[\/quote\]/gs, '<blockquote style="border-left:3px solid var(--green);padding:8px 12px;margin:8px 0;background:rgba(255,255,255,0.04);border-radius:0 6px 6px 0;font-style:italic;color:var(--text-muted)">$1</blockquote>')
    .replace(/\[url=(.*?)\](.*?)\[\/url\]/gs, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--green)">$2</a>')
    .replace(/\n/g, '<br/>');
}

const BB_BUTTONS = [
  { label: 'B',     tag: 'b',     style: { fontWeight: 800 } },
  { label: 'I',     tag: 'i',     style: { fontStyle: 'italic' } },
  { label: 'U',     tag: 'u',     style: { textDecoration: 'underline' } },
  { label: 'HL',    tag: 'hl',    style: { background: 'rgba(245,166,35,0.3)', borderRadius: 3, padding: '0 4px' } },
  { label: 'Quote', tag: 'quote', style: {} },
  { label: 'URL',   tag: 'url',   style: { color: 'var(--green)' } },
];

export default function NewThreadForm({ categoryId, categoryName, categoryIcon }) {
  const router = useRouter();
  const textareaRef = useRef(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const insertTag = (tag) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end) || 'text';

    let insert;
    if (tag === 'url') {
      const url = prompt('Enter URL (include https://):');
      if (!url) return;
      insert = `[url=${url}]${selected === 'text' ? url : selected}[/url]`;
    } else {
      insert = `[${tag}]${selected}[/${tag}]`;
    }

    const next = content.substring(0, start) + insert + content.substring(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      const cursor = start + insert.length;
      el.selectionStart = cursor;
      el.selectionEnd = cursor;
    }, 0);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim()) return setError('Please enter a title.');
    if (!content.trim()) return setError('Please enter some content.');
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_thread',
          category_id: categoryId,
          title: title.trim(),
          body: content.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/forum/thread/${data.threadId}`);
      } else {
        setError(data.error || 'Failed to post thread.');
        setSubmitting(false);
      }
    } catch {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      {/* Breadcrumb */}
      <div className="title-header" style={{  alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        <a href="/forum" style={{ color: 'var(--green)', textDecoration: 'none' }}>Forum</a>
        <span> › </span>
        <a href={`/forum/${categoryId}`} style={{ color: 'var(--green)', textDecoration: 'none' }}>{categoryName}</a>
        <span> › </span>
        <span>New Thread</span>
      </div>

      <div className="panel no-hover" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
          New Thread in {categoryName}
        </h2>

        {error && (
          <div className="flash flash-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Thread Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              maxLength={200}
              style={{ width: '100%' }}
            />
          </div>

          {/* BBCode toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 0, padding: '8px 10px', background: 'var(--panel-inner)', borderRadius: 'var(--radius) var(--radius) 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', flexWrap: 'wrap' }}>
            {BB_BUTTONS.map(btn => (
              <button key={btn.tag} type="button" onClick={() => insertTag(btn.tag)}
                style={{
                  padding: '3px 10px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-secondary)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  ...btn.style,
                }}>
                {btn.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto' }}>
              <button type="button" onClick={() => setPreview(p => !p)}
                style={{
                  padding: '3px 12px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: preview ? 'var(--green)' : 'rgba(255,255,255,0.04)',
                  color: preview ? '#000' : 'var(--text-secondary)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                }}>
                {preview ? '✏️ Edit' : '👁 Preview'}
              </button>
            </div>
          </div>

          {/* Content area */}
          <div style={{ marginBottom: 20 }}>
            {preview ? (
              <div
                style={{
                  minHeight: 220, padding: '12px 14px',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  background: 'var(--panel-inner)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 13, lineHeight: 1.8, color: 'var(--text-primary)',
                }}
                dangerouslySetInnerHTML={{ __html: renderBBCode(content) || '<span style="color:var(--text-muted)">Nothing to preview yet...</span>' }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your post here... Select text then click a toolbar button to format it."
                rows={10}
                style={{
                  width: '100%', resize: 'vertical',
                  fontSize: 13, lineHeight: 1.7,
                  borderRadius: '0 0 var(--radius) var(--radius)',
                }}
              />
            )}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              Tip: Highlight text in the box, then click a formatting button above.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary"
              style={{ opacity: submitting ? 0.5 : 1, minWidth: 120 }}>
              {submitting ? 'Posting...' : 'Post Thread'}
            </button>
            <a href={`/forum/${categoryId}`} className="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  );
}
