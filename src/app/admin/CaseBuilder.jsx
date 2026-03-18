'use client';
import { useState, useEffect, useRef } from 'react';

const RARITY_COLORS = { common: '#8b949e', uncommon: '#4ade80', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const ICON_BASE = '/swf/dcr/hof_furni/icons/';
const ls = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 };
const colHead = { fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };

export default function CaseBuilder({ editCase, editItems }) {
  const isEdit = !!editCase;
  const [name, setName] = useState(editCase?.name || '');
  const [description, setDescription] = useState(editCase?.description || '');
  const [image, setImage] = useState(editCase?.image || '');
  const [price, setPrice] = useState(editCase?.price || 50);
  const [active, setActive] = useState(editCase ? editCase.active === 1 : true);

  const [items, setItems] = useState(() => {
    if (!editItems?.length) return [];
    return editItems.map(i => ({
      dbId: i.id, name: (i.reward_furni_base_id && i.furni_name) ? i.furni_name : i.name,
      rarity: i.rarity || 'common', dropChance: parseFloat(i.drop_chance) || 0,
      rewardType: i.reward_furni_base_id ? 'furni' : (i.reward_type || 'credits'),
      rewardAmount: i.reward_amount || 0, rewardBadge: i.reward_badge || '',
      furniBaseId: i.reward_furni_base_id || null, furniBaseName: i.furni_base_name || null,
    }));
  });

  const [deletedIds, setDeletedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [caseImages, setCaseImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowImagePicker(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openImagePicker = async () => {
    setShowImagePicker(v => !v);
    if (caseImages.length === 0) {
      setLoadingImages(true);
      try {
        const res = await fetch('/api/admin/case-images');
        const data = await res.json();
        setCaseImages(data.images || []);
      } catch { setCaseImages([]); }
      setLoadingImages(false);
    }
  };

  const totalChance = items.reduce((s, i) => s + (parseFloat(i.dropChance) || 0), 0);
  const isBalanced = Math.abs(totalChance - 100) < 0.01;

  const setMsg = (text, type = 'error') => setMessage({ text, type });

  const searchFurni = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_furni', search: searchQuery }) });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const addFurni = (f) => {
    setItems(prev => [...prev, {
      dbId: null, name: f.public_name, rarity: 'common', dropChance: 0,
      rewardType: 'furni', rewardAmount: 0, rewardBadge: '',
      furniBaseId: f.base_id, furniBaseName: f.item_name,
    }]);
    setSearchResults([]); setSearchQuery('');
  };

  const addCurrency = (type) => {
    const d = { credits: { name: 'Credits', amt: 500 }, pixels: { name: 'Duckets', amt: 200 }, points: { name: 'Diamonds', amt: 50 } };
    const c = d[type] || d.credits;
    setItems(prev => [...prev, {
      dbId: null, name: c.name, rarity: 'common', dropChance: 0,
      rewardType: type, rewardAmount: c.amt, rewardBadge: '',
      furniBaseId: null, furniBaseName: null,
    }]);
  };

  const updateItem = (idx, field, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const removeItem = (idx) => {
    const item = items[idx];
    if (item.dbId) setDeletedIds(prev => [...prev, item.dbId]);
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const distributeEvenly = () => {
    if (!items.length) return;
    const each = parseFloat((100 / items.length).toFixed(2));
    setItems(prev => {
      const u = prev.map(i => ({ ...i, dropChance: each }));
      const diff = 100 - u.reduce((s, i) => s + i.dropChance, 0);
      if (u.length > 0) u[u.length - 1].dropChance = parseFloat((u[u.length - 1].dropChance + diff).toFixed(2));
      return u;
    });
  };

  const autoByRarity = () => {
    if (!items.length) return;
    const w = { legendary: 2, epic: 5, rare: 12, uncommon: 25, common: 50 };
    const tw = items.reduce((s, i) => s + (w[i.rarity] || 50), 0);
    setItems(prev => {
      const u = prev.map(i => ({ ...i, dropChance: parseFloat(((w[i.rarity] || 50) / tw * 100).toFixed(2)) }));
      const diff = 100 - u.reduce((s, i) => s + i.dropChance, 0);
      if (u.length > 0) u[u.length - 1].dropChance = parseFloat((u[u.length - 1].dropChance + diff).toFixed(2));
      return u;
    });
  };

  const saveCase = async () => {
    if (!name.trim()) return setMsg('Case needs a name');
    if (items.length === 0) return setMsg('Add at least one item');
    if (!isBalanced) return setMsg(`Drop chances must total 100% (currently ${totalChance.toFixed(2)}%)`);
    for (const item of items) {
      if (!item.name.trim()) return setMsg('Every item needs a name');
      if (item.dropChance <= 0) return setMsg(`"${item.name}" needs a drop chance above 0`);
      if (item.rewardType === 'furni' && !item.furniBaseId) return setMsg(`"${item.name}" needs a furniture item`);
      if (item.rewardType !== 'furni' && item.rewardAmount <= 0) return setMsg(`"${item.name}" needs an amount above 0`);
    }

    setSaving(true); setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_case_full',
          caseId: editCase?.id || null,
          name, description, image, price, active,
          items: items.map(i => ({
            dbId: i.dbId || null,
            name: i.name,
            image: i.rewardType === 'furni' && i.furniBaseName ? `${ICON_BASE}${i.furniBaseName}_icon.png` : '',
            rarity: i.rarity,
            drop_chance: i.dropChance,
            reward_type: i.rewardType,
            reward_amount: i.rewardAmount || 0,
            reward_badge: i.rewardBadge || null,
            reward_furni_base_id: i.furniBaseId || null,
          })),
          deleteItemIds: deletedIds,
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMsg('Case saved!', 'success');
        setTimeout(() => { window.location.href = '/admin?tab=cases&success=Case+saved'; }, 600);
      } else setMsg(data.error || 'Save failed');
    } catch (e) { setMsg('Error: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="panel no-hover" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>{isEdit ? 'Edit Case' : 'Create New Case'}</h3>
        <a href="/admin?tab=cases" className="btn btn-secondary btn-sm">← Back</a>
      </div>

      {/* Case Details */}
      <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>Case Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div><label style={ls}>Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Legendary Crate" /></div>
          <div><label style={ls}>Price (Diamonds) *</label><input type="number" value={price} onChange={e => setPrice(parseInt(e.target.value) || 0)} min={1} /></div>
          <div>
            <label style={ls}>Image URL</label>
            <div ref={pickerRef} style={{ position: 'relative' }}>
              {/* Preview + trigger */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {image ? <img src={image} alt="" style={{ maxWidth: 44, maxHeight: 44, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize: 18, opacity: 0.3 }}>🖼️</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="/images/cases/mycase.png" style={{ width: '100%', marginBottom: 4 }} />
                  <button type="button" onClick={openImagePicker} className="btn btn-secondary btn-sm" style={{ fontSize: 10, width: '100%' }}>
                    {showImagePicker ? 'Close Picker' : '📁 Browse /images/cases/'}
                  </button>
                </div>
              </div>

              {/* Dropdown picker */}
              {showImagePicker && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 6,
                  background: 'var(--panel)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: 280, overflow: 'auto',
                }}>
                  {loadingImages ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Loading images...</div>
                  ) : caseImages.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                      No images found in <code style={{ color: 'var(--green)' }}>/public/images/cases/</code>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, padding: 12 }}>
                      {caseImages.map(img => (
                        <div key={img} onClick={() => { setImage(img); setShowImagePicker(false); }}
                          style={{
                            cursor: 'pointer', borderRadius: 6, padding: 6, textAlign: 'center',
                            background: image === img ? 'rgba(52,189,89,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `2px solid ${image === img ? 'var(--green)' : 'rgba(255,255,255,0.06)'}`,
                            transition: 'all 0.15s',
                          }}
                          onMouseOver={e => { if (image !== img) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                          onMouseOut={e => { if (image !== img) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                          <img src={img} alt="" style={{ width: 48, height: 48, objectFit: 'contain', imageRendering: 'pixelated', display: 'block', margin: '0 auto 4px' }} onError={e => e.target.style.opacity = '0.2'} />
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {img.split('/').pop()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={ls}>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What's in this case..." /></div>
        {isEdit && <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 'auto' }} /> Active
        </label>}
      </div>

      {/* Add Items */}
      <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>Add Drop Items</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchFurni())}
            placeholder="Search furniture by name..." style={{ flex: 1 }} />
          <button type="button" onClick={searchFurni} disabled={searching || searchQuery.length < 2} className="btn btn-primary btn-sm">{searching ? '...' : 'Search'}</button>
          <button type="button" onClick={() => addCurrency('credits')} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>+ Credits</button>
          <button type="button" onClick={() => addCurrency('pixels')} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>+ Duckets</button>
          <button type="button" onClick={() => addCurrency('points')} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>+ Diamonds</button>
        </div>
        {searchResults.length > 0 && (
          <div style={{ maxHeight: 250, overflow: 'auto', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {searchResults.map(f => {
              const added = items.some(i => i.furniBaseId === f.base_id);
              return (
                <div key={f.base_id} onClick={() => !added && addFurni(f)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: added ? 'default' : 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: added ? 0.35 : 1 }}
                  onMouseOver={e => !added && (e.currentTarget.style.background = 'rgba(52,189,89,0.06)')} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <img src={`${ICON_BASE}${f.item_name}_icon.png`} alt="" style={{ width: 32, height: 32, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{f.public_name}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.item_name} — #{f.base_id}</div></div>
                  {added ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Added</span> : <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>+ Add</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item List */}
      {items.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{items.length} Item{items.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: isBalanced ? 'rgba(52,189,89,0.1)' : 'rgba(239,88,86,0.1)', color: isBalanced ? 'var(--green)' : '#EF5856' }}>
                {totalChance.toFixed(2)}% / 100% {isBalanced ? '✓' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={distributeEvenly} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>Split Evenly</button>
              <button type="button" onClick={autoByRarity} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>Auto by Rarity</button>
            </div>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden', display: 'flex' }}>
            {items.map((item, idx) => <div key={idx} style={{ width: `${Math.min(item.dropChance, 100)}%`, height: '100%', background: RARITY_COLORS[item.rarity], transition: 'width 0.2s' }} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 110px 90px 100px 85px 32px', gap: 8, padding: '0 12px', marginBottom: 6 }}>
            <div style={colHead}></div><div style={colHead}>NAME</div><div style={colHead}>REWARD</div><div style={colHead}>AMOUNT</div><div style={colHead}>RARITY</div><div style={colHead}>DROP %</div><div></div>
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 110px 90px 100px 85px 32px', gap: 8, alignItems: 'center', padding: '8px 12px', marginBottom: 4, borderRadius: 'var(--radius)', background: 'var(--panel-inner)', borderLeft: `3px solid ${RARITY_COLORS[item.rarity]}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.rewardType === 'furni' && item.furniBaseName ? <img src={`${ICON_BASE}${item.furniBaseName}_icon.png`} alt="" style={{ maxWidth: 32, maxHeight: 32, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} /> : <img src={item.rewardType === 'credits' ? '/images/coin.png' : item.rewardType === 'pixels' ? '/images/ducket.png' : '/images/diamond.png'} alt="" style={{ width: 20 }} />}
              </div>
              <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Item name" style={{ fontSize: 12, padding: '5px 8px' }} />
              {item.rewardType === 'furni' ? <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, textAlign: 'center', padding: '5px 0', background: 'rgba(52,189,89,0.08)', borderRadius: 'var(--radius)' }}>Furniture</div>
                : <select value={item.rewardType} onChange={e => updateItem(idx, 'rewardType', e.target.value)} style={{ fontSize: 11, padding: '5px 6px' }}><option value="credits">Credits</option><option value="pixels">Duckets</option><option value="points">Diamonds</option></select>}
              {item.rewardType !== 'furni' ? <input type="number" value={item.rewardAmount} onChange={e => updateItem(idx, 'rewardAmount', parseInt(e.target.value) || 0)} min={1} style={{ fontSize: 11, padding: '5px 6px' }} />
                : <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.furniBaseName || '—'}</div>}
              <select value={item.rarity} onChange={e => updateItem(idx, 'rarity', e.target.value)} style={{ fontSize: 11, padding: '5px 6px', color: RARITY_COLORS[item.rarity], fontWeight: 700 }}>
                {RARITIES.map(r => <option key={r} value={r} style={{ color: '#fff' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input type="number" value={item.dropChance} onChange={e => updateItem(idx, 'dropChance', parseFloat(e.target.value) || 0)} min={0.01} max={100} step={0.1} style={{ fontSize: 12, padding: '5px 6px', fontWeight: 800, width: '100%' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
              </div>
              <button type="button" onClick={() => removeItem(idx)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(239,88,86,0.12)', color: '#EF5856', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, background: 'var(--panel-inner)', borderRadius: 'var(--radius)', border: '2px dashed rgba(255,255,255,0.08)' }}>No items yet — search for furniture or add currency rewards above</div>}

      {message.text && <div className={`flash flash-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`} style={{ marginBottom: 16 }}>{message.text}</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" onClick={saveCase} disabled={saving} className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 14, opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving...' : isEdit ? 'Save Case' : 'Create Case'}
        </button>
        {items.length > 0 && !isBalanced && <span style={{ fontSize: 12, color: '#EF5856', fontWeight: 700 }}>Need {totalChance < 100 ? (100 - totalChance).toFixed(2) + '% more' : (totalChance - 100).toFixed(2) + '% less'}</span>}
        {items.length > 0 && isBalanced && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Balanced</span>}
      </div>
    </div>
  );
}
