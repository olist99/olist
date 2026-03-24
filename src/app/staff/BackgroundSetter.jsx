'use client';
import { useState } from 'react';

export default function BackgroundSetter({ current, field = 'background' }) {
  const [url, setUrl] = useState(current || '');
  const [status, setStatus] = useState('');

  const save = async (val) => {
    const v = (val !== undefined ? val : url);
    setStatus('saving');
    try {
      const res = await fetch('/api/staff-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: v }),
      });
      const data = await res.json();
      setStatus(data.ok ? 'saved' : 'error');
      setTimeout(() => setStatus(''), 2000);
    } catch { setStatus('error'); }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="text" value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://example.com/image.png"
        style={{ flex: 1, minWidth: 260, fontSize: 12 }}
      />
      <button onClick={() => save()} disabled={status === 'saving'} className="btn btn-secondary btn-sm"
        style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.4)', whiteSpace: 'nowrap' }}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved!' : 'Save'}
      </button>
      {url && (
        <button onClick={() => { setUrl(''); save(''); }} className="btn btn-secondary btn-sm"
          style={{ color: 'var(--text-muted)' }}>Clear</button>
      )}
    </div>
  );
}
