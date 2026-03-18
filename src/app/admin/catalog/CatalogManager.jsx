'use client';
import { useState, useEffect } from 'react';
import FurniImage from '@/components/FurniImage';

function buildTree(pages) {
  const map = {};
  const roots = [];
  for (const p of pages) map[p.id] = { ...p, children: [] };
  for (const p of pages) {
    if (p.parent_id >= 0 && map[p.parent_id]) map[p.parent_id].children.push(map[p.id]);
    else roots.push(map[p.id]);
  }
  return roots;
}

function flattenTree(nodes, depth = 0, result = []) {
  for (const n of nodes) {
    result.push({ ...n, depth });
    if (n.children?.length) flattenTree(n.children, depth + 1, result);
  }
  return result;
}

function EditItemModal({ item, pages, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--panel-bg)', borderRadius: 'var(--radius)', padding: 24, width: '100%', maxWidth: 480 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Edit Item: {item.catalog_name}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[['cost_credits', 'Credits'], ['cost_pixels', 'Duckets'], ['cost_points', 'Diamonds']].map(([k, l]) => (
            <div key={k}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>{l}</label>
              <input type="number" value={form[k] ?? 0} onChange={e => set(k, parseInt(e.target.value) || 0)} min={0} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Amount</label>
            <input type="number" value={form.amount ?? 1} onChange={e => set('amount', parseInt(e.target.value) || 1)} min={1} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.offer_active} onChange={e => set('offer_active', e.target.checked)} />
              Offer Active
            </label>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Move to Page</label>
          <select value={form.page_id} onChange={e => set('page_id', parseInt(e.target.value))}>
            {flattenTree(buildTree(pages)).map(p => (
              <option key={p.id} value={p.id}>{'  '.repeat(p.depth)}{p.caption}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function CatalogManager() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [addItemForm, setAddItemForm] = useState(null);
  const [editPageId, setEditPageId] = useState(null);
  const [editPageForm, setEditPageForm] = useState(null);

  useEffect(() => {
    fetch('/api/admin/catalog?type=pages').then(r => r.json()).then(d => setPages(d.pages || []));
  }, []);

  const loadItems = async (pageId) => {
    setSelectedPage(pageId); setLoadingItems(true); setItems([]);
    const d = await fetch(`/api/admin/catalog?type=items&page_id=${pageId}`).then(r => r.json());
    if (d.error) showMsg(`Query error: ${d.error}`, 'error');
    setItems(d.items || []);
    setLoadingItems(false);
  };

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const saveItem = async (form) => {
    const pageChanged = form.page_id !== editItem.page_id;
    if (pageChanged) {
      await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move_item', id: form.id, page_id: form.page_id }) });
    }
    await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_item', ...form }) });
    showMsg('Item saved!');
    setEditItem(null);
    if (pageChanged) setItems(items.filter(i => i.id !== form.id));
    else setItems(items.map(i => i.id === form.id ? { ...i, ...form } : i));
  };

  const addItem = async () => {
    if (!addItemForm?.catalog_name || !addItemForm?.item_ids) { showMsg('Name and Item IDs required', 'error'); return; }
    const res = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_item', page_id: selectedPage, ...addItemForm }) }).then(r => r.json());
    if (res.ok) { showMsg('Item added!'); setAddItemForm(null); loadItems(selectedPage); }
    else showMsg(res.error || 'Failed', 'error');
  };

  const savePage = async () => {
    const res = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_page', id: editPageId, ...editPageForm }) }).then(r => r.json());
    if (res.ok) { showMsg('Page saved!'); setEditPageId(null); fetch('/api/admin/catalog?type=pages').then(r => r.json()).then(d => setPages(d.pages || [])); }
    else showMsg(res.error || 'Failed', 'error');
  };

  const flatPages = flattenTree(buildTree(pages));
  const filteredItems = search ? items.filter(i =>
    i.catalog_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.public_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(i.item_ids).includes(search)
  ) : items;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
      {editItem && <EditItemModal item={editItem} pages={pages} onSave={saveItem} onClose={() => setEditItem(null)} />}

      {/* Page Tree */}
      <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Catalog Pages</span>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            const res = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_page', parent_id: selectedPage || -1, caption: 'New Page' }) }).then(r => r.json());
            if (res.ok) { showMsg('Page created!'); fetch('/api/admin/catalog?type=pages').then(r => r.json()).then(d => setPages(d.pages || [])); }
          }}>+ Add</button>
        </div>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {flatPages.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div onClick={() => loadItems(p.id)}
                style={{ flex: 1, padding: `8px 16px 8px ${16 + p.depth * 16}px`, cursor: 'pointer', fontSize: 12, fontWeight: selectedPage === p.id ? 700 : 500, background: selectedPage === p.id ? 'var(--panel-inner)' : 'transparent', color: p.enabled ? 'var(--text-primary)' : 'var(--text-muted)', borderLeft: selectedPage === p.id ? '2px solid var(--green)' : '2px solid transparent', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                {!p.visible && <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>hidden</span>}
                {p.caption}
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>#{p.id}</span>
              </div>
              <button onClick={() => { setEditPageId(p.id); setEditPageForm({ caption: p.caption, icon_color: p.icon_color, icon_image: p.icon_image, visible: p.visible, enabled: p.enabled, min_rank: p.min_rank, order_num: p.order_num }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '4px 8px' }}>✎</button>
            </div>
          ))}
        </div>
      </div>

      {/* Items Panel */}
      <div>
        {msg && <div className={`flash flash-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 12, fontSize: 11 }}>{msg.text}</div>}

        {/* Edit page modal inline */}
        {editPageId && editPageForm && (
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 16, borderLeft: '3px solid var(--green)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Edit Page #{editPageId}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Caption</label>
                <input type="text" value={editPageForm.caption} onChange={e => setEditPageForm(f => ({ ...f, caption: e.target.value }))} /></div>
              <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Order</label>
                <input type="number" value={editPageForm.order_num} onChange={e => setEditPageForm(f => ({ ...f, order_num: parseInt(e.target.value) || 0 }))} /></div>
              <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Min Rank</label>
                <input type="number" value={editPageForm.min_rank} onChange={e => setEditPageForm(f => ({ ...f, min_rank: parseInt(e.target.value) || 0 }))} /></div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editPageForm.visible} onChange={e => setEditPageForm(f => ({ ...f, visible: e.target.checked }))} /> Visible
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editPageForm.enabled} onChange={e => setEditPageForm(f => ({ ...f, enabled: e.target.checked }))} /> Enabled
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={savePage} className="btn btn-primary btn-sm">Save Page</button>
              <button onClick={() => setEditPageId(null)} className="btn btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        )}

        {selectedPage ? (
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={() => setAddItemForm({ catalog_name: '', item_ids: '', cost_credits: 0, cost_pixels: 0, cost_points: 0, amount: 1 })}>+ Add Item</button>
            </div>

            {addItemForm && (
              <div style={{ padding: 16, background: 'var(--panel-inner)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Catalog Name *</label>
                    <input type="text" value={addItemForm.catalog_name} onChange={e => setAddItemForm(f => ({ ...f, catalog_name: e.target.value }))} placeholder="e.g. throne" /></div>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Item IDs * (comma separated)</label>
                    <input type="text" value={addItemForm.item_ids} onChange={e => setAddItemForm(f => ({ ...f, item_ids: e.target.value }))} placeholder="e.g. 179" /></div>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Credits</label>
                    <input type="number" value={addItemForm.cost_credits} onChange={e => setAddItemForm(f => ({ ...f, cost_credits: parseInt(e.target.value) || 0 }))} min={0} /></div>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Duckets</label>
                    <input type="number" value={addItemForm.cost_pixels} onChange={e => setAddItemForm(f => ({ ...f, cost_pixels: parseInt(e.target.value) || 0 }))} min={0} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addItem} className="btn btn-primary btn-sm">Add Item</button>
                  <button onClick={() => setAddItemForm(null)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            )}

            {loadingItems ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No items on this page.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, padding: 16 }}>
                {filteredItems.map(item => (
                  <div key={item.id} style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'border-color .15s' }}
                    onClick={() => setEditItem(item)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                    <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FurniImage baseName={item.item_name} style={{ maxWidth: 48, maxHeight: 48 }} />
                    </div>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.catalog_name}>
                        {item.public_name || item.catalog_name}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>ID: {item.item_ids}</div>
                    </div>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {item.cost_credits > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span style={{ color: 'var(--text-muted)' }}>Credits</span><span style={{ fontWeight: 700 }}>{item.cost_credits}</span></div>}
                      {item.cost_pixels > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span style={{ color: 'var(--text-muted)' }}>Duckets</span><span style={{ fontWeight: 700 }}>{item.cost_pixels}</span></div>}
                      {item.cost_points > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span style={{ color: 'var(--text-muted)' }}>Diamonds</span><span style={{ fontWeight: 700 }}>{item.cost_points}</span></div>}
                      {item.cost_credits === 0 && item.cost_pixels === 0 && item.cost_points === 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>Free</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, width: '100%', justifyContent: 'center' }}>
                      {item.amount > 1 && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 5px', color: 'var(--text-secondary)' }}>×{item.amount}</span>}
                      <span style={{ fontSize: 9, borderRadius: 4, padding: '2px 5px', fontWeight: 800, background: item.offer_active ? 'rgba(52,189,89,0.12)' : 'rgba(255,255,255,0.05)', color: item.offer_active ? 'var(--green)' : 'var(--text-muted)' }}>
                        {item.offer_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="panel no-hover" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Select a catalog page to view and edit its items.</div>
        )}
      </div>
    </div>
  );
}
