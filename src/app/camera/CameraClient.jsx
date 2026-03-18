'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr.toString().trim().replace(' UTC', '').replace(' ', 'T') + (dateStr.toString().endsWith('Z') ? '' : 'Z'))) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function PhotoCard({ photo, userId, onLikeToggle, onDelete }) {
  const [liked, setLiked] = useState(photo.my_like);
  const [likeCount, setLikeCount] = useState(parseInt(photo.like_count) || 0);
  const [liking, setLiking] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLike = async () => {
    if (!userId || photo.user_id === userId) return;
    setLiking(true);
    try {
      const res = await fetch('/api/camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', photo_id: photo.id }),
      });
      const d = await res.json();
      if (d.ok) {
        setLiked(d.liked);
        setLikeCount(c => d.liked ? c + 1 : c - 1);
      }
    } catch {}
    setLiking(false);
  };

  return (
    <div style={{ background: 'var(--panel-bg)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--panel-inner)', overflow: 'hidden' }}>
        {imgError ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Photo unavailable</div>
        ) : (
          <img src={photo.photo_url} alt="" onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {photo.room_name && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '16px 10px 8px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
            {photo.room_name}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {photo.look && (
          <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${photo.look}&headonly=1&size=s`} alt=""
            style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {photo.username && (
            <Link href={`/profile/${photo.username}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{photo.username}</Link>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(photo.created_at)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={handleLike} disabled={liking || photo.user_id === userId || !userId}
            style={{ background: liked ? 'rgba(239,88,86,0.15)' : 'var(--panel-inner)', border: `1px solid ${liked ? 'rgba(239,88,86,0.4)' : 'transparent'}`, borderRadius: 20, padding: '4px 10px', cursor: photo.user_id === userId || !userId ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: liked ? '#EF5856' : 'var(--text-muted)', transition: 'all .15s' }}>
            ♥ {likeCount}
          </button>
          {(userId === photo.user_id) && (
            <button onClick={() => onDelete(photo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }} title="Delete">×</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CameraClient({ userId, username }) {
  const [tab, setTab] = useState('feed');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadRoom, setUploadRoom] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const endpoint = tab === 'mine' ? '/api/camera?type=my' : `/api/camera?type=feed&page=${p}`;
      const res = await fetch(endpoint);
      const d = await res.json();
      setPhotos(d.photos || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(page); }, [tab, page]);

  const handleDelete = async (photoId) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await fetch('/api/camera', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', photo_id: photoId }) });
      setPhotos(ps => ps.filter(p => p.id !== photoId));
    } catch {}
  };

  const handleUpload = async () => {
    setUploading(true); setUploadMsg(null);
    try {
      const res = await fetch('/api/camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', photo_url: uploadUrl, room_name: uploadRoom }),
      });
      const d = await res.json();
      if (d.ok) { setUploadMsg({ type: 'success', text: 'Photo added!' }); setUploadUrl(''); setUploadRoom(''); load(1); setShowUpload(false); }
      else setUploadMsg({ type: 'error', text: d.error || 'Failed' });
    } catch { setUploadMsg({ type: 'error', text: 'Connection error' }); }
    setUploading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {['feed', 'mine'].map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={tab === t ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
            {t === 'feed' ? 'All Photos' : 'My Photos'}
          </button>
        ))}
        {userId && (
          <button onClick={() => setShowUpload(s => !s)} className={showUpload ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}>
            {showUpload ? 'Cancel' : '+ Add Photo'}
          </button>
        )}
      </div>

      {showUpload && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add Camera Photo</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Photo URL *</label>
            <input type="text" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} placeholder="https://..." />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Paste the URL of your Habbo camera photo</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Room Name (optional)</label>
            <input type="text" value={uploadRoom} onChange={e => setUploadRoom(e.target.value)} placeholder="My Room" />
          </div>
          {uploadMsg && <div className={`flash flash-${uploadMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 10, fontSize: 11 }}>{uploadMsg.text}</div>}
          <button onClick={handleUpload} disabled={uploading || !uploadUrl} className="btn btn-primary">
            {uploading ? 'Adding...' : 'Add Photo'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
      ) : photos.length === 0 ? (
        <div className="panel no-hover" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {tab === 'mine' ? 'You haven\'t added any photos yet.' : 'No photos yet. Be the first!'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {photos.map(p => (
            <PhotoCard key={p.id} photo={p} userId={userId} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {tab === 'feed' && photos.length === 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {page > 1 && <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)}>← Previous</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
