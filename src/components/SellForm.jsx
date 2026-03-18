'use client';
import { useState } from 'react';
import InventoryPicker from './InventoryPicker';
import FurniImage from './FurniImage';

export default function SellForm() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('credits');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !price || parseInt(price) < 1) return;
    setSubmitting(true);

    const form = new FormData();
    form.append('item_id', selectedItem.items[0].item_id);
    form.append('base_id', selectedItem.base_id);
    form.append('base_name', selectedItem.base_name);
    form.append('public_name', selectedItem.public_name);
    form.append('price', price);
    form.append('currency', currency);

    const res = await fetch('/api/marketplace/create', { method: 'POST', body: form });
    const data = await res.json();

    if (data.ok) {
      window.location.href = '/marketplace?tab=my&msg=Listing+created!+Item+moved+from+inventory.';
    } else {
      alert(data.error || 'Failed to create listing');
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Step 1: Pick item */}
      <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
           Step 1: Pick an item from your inventory
        </h3>
        <InventoryPicker onSelect={setSelectedItem} />
      </div>

      {/* Step 2: Set price */}
      {selectedItem && (
        <div className="panel no-hover animate-fade-up" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
             Step 2: Set your price
          </h3>

          {/* Selected item preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'var(--panel-inner)', borderRadius: 'var(--radius)',
            padding: 16, marginBottom: 16, border: '1px solid rgba(52,189,89,0.2)',
          }}>
            <FurniImage
              baseName={selectedItem.base_name}
              style={{ width: 48, height: 48 }}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)' }}>{selectedItem.public_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {selectedItem.base_name} • {selectedItem.count} in inventory
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
              }}
            >
              ✕ Change
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Price *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price..."
                  min={1}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Currency
                </label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ height: 38 }}>
                  <option value="points">Diamonds</option>
                  <option value="credits">Credits</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(52,189,89,0.06)', border: '1px solid rgba(52,189,89,0.15)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                 The item will be <strong style={{ color: 'var(--green)' }}>removed from your inventory</strong> when listed.
                If you cancel the listing before it sells, it will be returned.
                When someone buys it, it goes to their inventory and you receive the payment.
              </p>
            </div>

            <button
              type="submit"
              className="btn-enterhotel"
              disabled={submitting}
              style={{ width: '100%', textAlign: 'center', fontSize: 14, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Creating listing...' : `List ${selectedItem.public_name} for sale`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
