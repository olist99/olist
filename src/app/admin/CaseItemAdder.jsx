'use client';
import { useState, useEffect } from 'react';

const RARITY_COLORS = { common: '#8b949e', uncommon: '#4ade80', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const ls = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 };

export default function CaseItemAdder({ caseId, existingItems = [] }) {
  const [items, setItems] = useState(existingItems.map(i => ({
    dbId: i.id,
    name: i.furni_name || i.name,
    rarity: i.rarity || 'common',
    dropChance: parseFloat(i.drop_chance) || 0,
    rewardType: i.reward_furni_base_id ? 'furni' : (i.reward_type || 'credits'),
    rewardAmount: i.reward_amount || 0,
    rewardBadge: i.reward_badge || '',
    furniBaseId: i.reward_furni_base_id || null,
    furniBaseName: i.furni_base_name || null,
    image: i.image || '',
  })));

  const [furniSearch, setFurniSearch] = useState('');
  const [furniResults, setFurniResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const totalChance = items.reduce((s, i) => s + (parseFloat(i.dropChance) || 0), 0);
  const isValid = Math.abs(totalChance - 100) < 0.01;
  const iconBase = '/swf/dcr/hof_furni/icons/';

  const searchFurni = async () => {
    if (furniSearch.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_furni', search: furniSearch }),
      });
      const data = await res.json();
      setFurniResults(data.results || []);
    } catch { setFurniResults([]); }
    setSearching(false);
  };

  const addFurni = (f) => {
    setItems(prev => [...prev, {
      dbId: null, name: f.public_name, rarity: 'common', dropChance: 0,
      rewardType: 'furni', rewardAmount: 0, rewardBadge: '',
      furniBaseId: f.base_id, furniBaseName: f.item_name,
      image: `${iconBase}${f.item_name}_icon.png`,
    }]);
  };

  const addCurrencyItem = () => {
    setItems(prev => [...prev, {
      dbId: null, name: '', rarity: 'common', dropChance: 0,
      rewardType: 'credits', rewardAmount: 100, rewardBadge: '',
      furniBaseId: null, furniBaseName: null, image: '',
    }]);
  };

  const updateItem = (idx, field, val) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const distributeEvenly = () => {
    if (items.length === 0) return;
    const each = parseFloat((100 / items.length).toFixed(3));
    setItems(prev => {
      const updated = prev.map(i => ({ ...i, dropChance: each }));
      // Fix rounding: adjust last item
      const sum = updated.reduce((s, i) => s + i.dropChance, 0);
      if (updated.length > 0) updated[updated.length - 1].dropChance = parseFloat((updated[updated.length - 1].dropChance + (100 - sum)).toFixed(3));
      return updated;
    });
  };

  const autoBalance = () => {
    // Distribute based on rarity: legendary=2%, epic=5%, rare=12%, uncommon=25%, common=rest
    const weights = { legendary: 2, epic: 5, rare: 12, uncommon: 25, common: 50 };
    const totalWeight = items.reduce((s, i) => s + (weights[i.rarity] || 50), 0);
    setItems(prev => {
      const updated = prev.map(i => ({ ...i, dropChance: parseFloat(((weights[i.rarity] || 50) / totalWeight * 100).toFixed(3)) }));
      const sum = updated.reduce((s, i) => s + i.dropChance, 0);
      if (updated.length > 0) updated[updated.length - 1].dropChance = parseFloat((updated[updated.length - 1].dropChance + (100 - sum)).toFixed(3));
      return updated;
    });
  };

  const saveAll = async () => {
    if (!isValid) { setMessage(`Drop chances must total 100% (currently ${totalChance.toFixed(2)}%)`); return; }
    for (const item of items) {
      if (!item.name) { setMessage('All items need a name'); return; }
      if (item.dropChance <= 0) { setMessage(`"${item.name}" needs a drop chance > 0`); return; }
      if (item.rewardType === 'furni' && !item.furniBaseId) { setMessage(`"${item.name}" has no furniture selected`); return; }
    }

    setSaving(true); setMessage('');

    try {
      // Delete removed items
      for (const existing of existingItems) {
        if (!items.find(i => i.dbId === existing.id)) {
          await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_item', id: existing.id }) });
        }
      }

      // Add new / update existing
      for (const item of items) {
        const payload = {
          case_id: caseId, name: item.name, image: item.image, rarity: item.rarity,
          drop_chance: item.dropChance, reward_type: item.rewardType,
          reward_amount: item.rewardAmount || 0, reward_badge: item.rewardBadge || null,
          reward_furni_base_id: item.furniBaseId || null,
        };

        if (item.dbId) {
          await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_item', id: item.dbId, ...payload }) });
        } else {
          await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_item', ...payload }) });
        }
      }

      setMessage('All items saved!');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) { setMessage('Error saving: ' + e.message); }
    setSaving(false);
  };

  return (
    <div>
      {/* Furniture search bar */}
      <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Add Items</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="text" value={furniSearch} onChange={e => setFurniSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchFurni())}
            placeholder="Search furniture by name..." style={{ flex: 1 }} />
          <button type="button" onClick={searchFurni} disabled={searching || furniSearch.length < 2}
            className="btn btn-primary btn-sm">{searching ? '...' : 'Search Furniture'}</button>
          <button type="button" onClick={addCurrencyItem} className="btn btn-secondary btn-sm">+ Currency/Badge</button>
        </div>

        {furniResults.length > 0 && (
          <div style={{ maxHeight: 220, overflow: 'auto', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
            {furniResults.map(f => {
              const alreadyAdded = items.some(i => i.furniBaseId === f.base_id);
              return (
                <div key={f.base_id} onClick={() => !alreadyAdded && addFurni(f)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: alreadyAdded ? 'default' : 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: alreadyAdded ? 0.4 : 1,
                }}
                onMouseOver={e => !alreadyAdded && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <img src={`${iconBase}${f.item_name}_icon.png`} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{f.public_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.item_name}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{f.base_id}</div>
                  {alreadyAdded ? <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Added</span> :
                    <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>+ Add</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {/* Total bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{items.length} Items</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isValid ? 'var(--green)' : '#EF5856' }}>
                Total: {totalChance.toFixed(2)}% {isValid ? '✓' : `(need ${(100 - totalChance).toFixed(2)}% more)`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={distributeEvenly} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>Distribute Evenly</button>
              <button type="button" onClick={autoBalance} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>Auto by Rarity</button>
            </div>
          </div>

          {/* Drop chance total bar */}
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden', display: 'flex' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ width: `${Math.min(item.dropChance, 100)}%`, height: '100%', background: RARITY_COLORS[item.rarity] || '#555', transition: 'width 0.2s' }} title={`${item.name}: ${item.dropChance}%`} />
            ))}
          </div>

          {/* Item rows */}
          {items.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', marginBottom: 6,
              borderRadius: 'var(--radius)', background: 'var(--panel-inner)',
              borderLeft: `3px solid ${RARITY_COLORS[item.rarity] || '#555'}`,
            }}>
              {/* Icon */}
              <div style={{ width: 36, height: 36, borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {item.rewardType === 'furni' && item.furniBaseName ? (
                  <img src={`${iconBase}${item.furniBaseName}_icon.png`} alt="" style={{ maxWidth: 32, maxHeight: 32, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} />
                ) : (
                  <img src={item.rewardType === 'credits' ? '/images/coin.png' : item.rewardType === 'pixels' ? '/images/ducket.png' : '/images/diamond.png'} alt="" style={{ width: 20, height: 20 }} />
                )}
              </div>

              {/* Name */}
              <div style={{ width: 140, flexShrink: 0 }}>
                <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                  placeholder="Item name" style={{ fontSize: 11, padding: '4px 8px', width: '100%' }} />
              </div>

              {/* Type (for non-furni) */}
              {item.rewardType !== 'furni' ? (
                <div style={{ width: 90, flexShrink: 0 }}>
                  <select value={item.rewardType} onChange={e => updateItem(idx, 'rewardType', e.target.value)} style={{ fontSize: 10, padding: '4px 6px', width: '100%' }}>
                    <option value="credits">Credits</option>
                    <option value="pixels">Duckets</option>
                    <option value="points">Diamonds</option>
                  </select>
                </div>
              ) : (
                <div style={{ width: 90, flexShrink: 0, fontSize: 10, color: 'var(--green)', fontWeight: 700, textAlign: 'center' }}>Furniture</div>
              )}

              {/* Amount (for currency) */}
              {item.rewardType !== 'furni' ? (
                <div style={{ width: 80, flexShrink: 0 }}>
                  <input type="number" value={item.rewardAmount} onChange={e => updateItem(idx, 'rewardAmount', parseInt(e.target.value) || 0)}
                    min={0} placeholder="Amount" style={{ fontSize: 10, padding: '4px 6px', width: '100%' }} />
                </div>
              ) : <div style={{ width: 80 }} />}

              {/* Rarity */}
              <div style={{ width: 100, flexShrink: 0 }}>
                <select value={item.rarity} onChange={e => updateItem(idx, 'rarity', e.target.value)}
                  style={{ fontSize: 10, padding: '4px 6px', width: '100%', color: RARITY_COLORS[item.rarity] }}>
                  {RARITIES.map(r => <option key={r} value={r} style={{ color: '#fff' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>

              {/* Drop chance */}
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input type="number" value={item.dropChance} onChange={e => updateItem(idx, 'dropChance', parseFloat(e.target.value) || 0)}
                    min={0.001} max={100} step={0.1} style={{ fontSize: 11, padding: '4px 6px', width: '100%', fontWeight: 700 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>%</span>
                </div>
              </div>

              {/* Remove */}
              <button type="button" onClick={() => removeItem(idx)} style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                background: 'rgba(239,88,86,0.12)', color: '#EF5856', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 12 }}>
          No items yet. Search for furniture above or add a currency reward.
        </div>
      )}

      {/* Save / message */}
      {message && <div style={{ fontSize: 11, padding: '8px 12px', borderRadius: 4, marginBottom: 12, background: message.includes('saved') ? 'rgba(52,189,89,0.1)' : 'rgba(239,88,86,0.1)', color: message.includes('saved') ? 'var(--green)' : '#EF5856' }}>{message}</div>}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="button" onClick={saveAll} disabled={saving || items.length === 0}
          className="btn btn-primary" style={{ opacity: saving || !isValid ? 0.5 : 1 }}>
          {saving ? 'Saving...' : `Save All Items (${items.length})`}
        </button>
        {!isValid && items.length > 0 && (
          <span style={{ fontSize: 11, color: '#EF5856', fontWeight: 600 }}>
            Fix drop chances to total 100% before saving
          </span>
        )}
      </div>
    </div>
  );
}
