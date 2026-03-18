'use client';
import { useState, useEffect, useCallback } from 'react';

const FURNI_RENDER = process.env.NEXT_PUBLIC_FURNI_RENDER_URL || '/swf/dcr/hof_furni/';
const FURNI_ICON   = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';

function FurniPreview({ name }) {
  const [src, setSrc] = useState(`${FURNI_ICON}${name}_icon.png`);
  const [failed, setFailed] = useState(false);
  if (!name || failed) return <span style={{ fontSize: 24 }}>📦</span>;
  return <img src={src} alt="" style={{ maxWidth: 64, maxHeight: 64, imageRendering: 'pixelated' }}
    onError={() => { if (src.includes('_icon.png')) setSrc(`${FURNI_RENDER}${name}/${name}_64.png`); else setFailed(true); }} />;
}

const BLANK = { item_name: '', public_name: '', type: 's', width: 1, length: 1, stack_height: 1.0, sprite_id: 0, allow_stack: true, allow_sit: false, allow_lay: false, allow_walk: false, interaction_type: 'default', interaction_modes_count: 1, multiheight: '0' };

export default function FurnitureManager() {
  const [furniture, setFurniture] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ type: 'list', page, ...(search ? { q: search } : {}) });
    const d = await fetch(`/api/admin/furniture?${qs}`).then(r => r.json()).catch(() => ({}));
    setFurniture(d.furniture || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const setAdd = (k, v) => setAddForm(f => ({ ...f, [k]: v }));
  const setEdit = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/furniture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', ...addForm }) }).then(r => r.json());
    if (res.ok) { showMsg(`Furniture added! ID: ${res.id}`); setShowAdd(false); setAddForm({ ...BLANK }); load(); }
    else showMsg(res.error || 'Failed', 'error');
    setSaving(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/furniture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: editId, ...editForm }) }).then(r => r.json());
    if (res.ok) { showMsg('Saved!'); setEditId(null); load(); }
    else showMsg(res.error || 'Failed', 'error');
    setSaving(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const FurniForm = ({ form, set }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Item Name (sprite key) *</label>
        <input type="text" value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="e.g. throne" /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Public Name *</label>
        <input type="text" value={form.public_name} onChange={e => set('public_name', e.target.value)} placeholder="e.g. Throne" /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Type</label>
        <select value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="s">Floor (s)</option><option value="i">Wall (i)</option><option value="e">Effect (e)</option><option value="r">Robot (r)</option>
        </select></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Sprite ID</label>
        <input type="number" value={form.sprite_id} onChange={e => set('sprite_id', parseInt(e.target.value) || 0)} /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Width (tiles)</label>
        <input type="number" value={form.width} onChange={e => set('width', parseInt(e.target.value) || 1)} min={1} /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Length (tiles)</label>
        <input type="number" value={form.length} onChange={e => set('length', parseInt(e.target.value) || 1)} min={1} /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Stack Height</label>
        <input type="number" step="0.5" value={form.stack_height} onChange={e => set('stack_height', parseFloat(e.target.value) || 1)} /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Interaction Type</label>
        <input type="text" value={form.interaction_type} onChange={e => set('interaction_type', e.target.value)} placeholder="default" /></div>
      <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Interaction Modes</label>
        <input type="number" value={form.interaction_modes_count} onChange={e => set('interaction_modes_count', parseInt(e.target.value) || 1)} min={1} /></div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', paddingBottom: 4 }}>
        {[['allow_stack','Stackable'],['allow_sit','Sittable'],['allow_lay','Layable'],['allow_walk','Walkable']].map(([k, l]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} />{l}
          </label>
        ))}
      </div>
      {form.item_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 10 }}>
          <FurniPreview name={form.item_name} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Preview (if sprite exists)</div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {msg && <div className={`flash flash-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16, fontSize: 11 }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} placeholder="Search by name (press Enter)..." style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(searchInput); setPage(1); }}>Search</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add Furniture'}</button>
      </div>

      {showAdd && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--green)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Add New Furniture</h3>
          <FurniForm form={addForm} set={setAdd} />
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving || !addForm.item_name || !addForm.public_name} className="btn btn-primary">{saving ? 'Adding...' : 'Add Furniture'}</button>
            <button onClick={() => { setShowAdd(false); setAddForm({ ...BLANK }); }} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {editId && editForm && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid #f5c842' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Edit: {editForm.item_name} (#{editId})</h3>
          <FurniForm form={editForm} set={setEdit} />
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={handleUpdate} disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={() => setEditId(null)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'var(--text-muted)' }}>
          {total.toLocaleString()} items total — Page {page}/{totalPages}
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div> : (
          <table className="table-panel" style={{ width: '100%' }}>
            <thead><tr><th>Preview</th><th>ID</th><th>Item Name</th><th>Public Name</th><th>Size</th><th>Type</th><th>Interaction</th><th></th></tr></thead>
            <tbody>
              {furniture.map(f => (
                <tr key={f.id}>
                  <td style={{ width: 56 }}><FurniPreview name={f.item_name} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>#{f.id}</td>
                  <td style={{ fontWeight: 600, fontSize: 11 }}>{f.item_name}</td>
                  <td>{f.public_name}</td>
                  <td style={{ fontSize: 11 }}>{f.width}×{f.length}</td>
                  <td style={{ fontSize: 11 }}>{f.type}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.interaction_type}</td>
                  <td><button onClick={() => { setEditId(f.id); setEditForm({ ...f }); setShowAdd(false); }} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button disabled={page <= 1} className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ lineHeight: '32px', fontSize: 12 }}>Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}



