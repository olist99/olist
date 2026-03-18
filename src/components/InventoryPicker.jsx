'use client';
import { useState, useEffect } from 'react';
import FurniImage from './FurniImage';

export default function InventoryPicker({ onSelect }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/inventory')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setInventory(data.inventory);
        } else {
          setError(data.error || 'Failed to load inventory');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load inventory'); setLoading(false); });
  }, []);

  const filtered = search
    ? inventory.filter(i => i.public_name.toLowerCase().includes(search.toLowerCase()) || i.base_name.toLowerCase().includes(search.toLowerCase()))
    : inventory;

  const selectItem = (item) => {
    setSelected(item);
    if (onSelect) onSelect(item);
  };

  if (loading) {
    return (
      <div className="panel no-hover" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading your inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel no-hover" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="panel no-hover" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Your inventory is empty. Items placed in rooms won&apos;t show here.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search your inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Item count */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        {filtered.length} item type{filtered.length !== 1 ? 's' : ''} in inventory ({inventory.reduce((a, b) => a + b.count, 0)} total)
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: 8, maxHeight: 280, overflowY: 'auto', paddingRight: 4,
      }}>
        {filtered.map((item) => (
          <button
            key={item.base_id}
            type="button"
            onClick={() => selectItem(item)}
            style={{
              background: selected?.base_id === item.base_id ? 'rgba(52,189,89,0.15)' : 'var(--panel-inner)',
              border: selected?.base_id === item.base_id ? '2px solid var(--green)' : '2px solid transparent',
              borderRadius: 'var(--radius)', padding: 8, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all .15s', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { if (selected?.base_id !== item.base_id) e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { if (selected?.base_id !== item.base_id) e.target.style.borderColor = 'transparent'; }}
          >
            <FurniImage
              baseName={item.base_name}
              alt={item.public_name}
              style={{ width: 40, height: 40 }}
            />
            <span style={{
              fontSize: 9, fontWeight: 700, color: selected?.base_id === item.base_id ? 'var(--green)' : 'var(--text-secondary)',
              textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', width: '100%',
            }}>
              {item.public_name}
            </span>
            {item.count > 1 && (
              <span style={{
                fontSize: 8, fontWeight: 800, color: 'var(--white)',
                background: 'rgba(255,255,255,0.15)', borderRadius: 3, padding: '1px 5px',
              }}>
                x{item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
          No items match &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}
