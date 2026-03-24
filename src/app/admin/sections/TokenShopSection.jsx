import { query, queryOne } from '@/lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { logAdminAction } from '@/lib/adminLog';
import { createVoucherAction, deleteVoucherAction, toggleVoucherAction,
         createFlashSaleAction, deleteFlashSaleAction } from './actions/settings';

// ── Server actions ────────────────────────────────────────────────────────────
async function saveTokenItemAction(formData) {
  'use server';
  const id             = formData.get('id') ? parseInt(formData.get('id')) : null;
  const name           = formData.get('name')?.trim();
  const description    = formData.get('description')?.trim() || '';
  const category       = formData.get('category') || 'general';
  const token_cost     = parseInt(formData.get('token_cost')) || 100;
  const image          = formData.get('image')?.trim() || null;
  const give_credits   = parseInt(formData.get('give_credits')) || 0;
  const give_pixels    = parseInt(formData.get('give_pixels'))  || 0;
  const give_points    = parseInt(formData.get('give_points'))  || 0;
  const give_rank      = parseInt(formData.get('give_rank'))    || 0;
  const give_rank_days = parseInt(formData.get('give_rank_days')) || 0;
  const give_badge     = formData.get('give_badge')?.trim() || null;
  const stock          = parseInt(formData.get('stock') ?? '-1');
  const active         = formData.get('active') === '1' ? 1 : 0;
  if (!name) redirect('/admin?tab=token-shop&error=Name+is+required');
  try {
    if (id) {
      await query(
        `UPDATE cms_token_shop_items SET name=?,description=?,category=?,token_cost=?,
         give_credits=?,give_pixels=?,give_points=?,give_rank=?,give_rank_days=?,
         give_badge=?,stock=?,active=?,image=? WHERE id=?`,
        [name,description,category,token_cost,give_credits,give_pixels,give_points,
         give_rank,give_rank_days,give_badge,stock,active,image,id]
      );
    } else {
      await query(
        `INSERT INTO cms_token_shop_items
         (name,description,category,token_cost,give_credits,give_pixels,give_points,
          give_rank,give_rank_days,give_badge,stock,active,image)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name,description,category,token_cost,give_credits,give_pixels,give_points,
         give_rank,give_rank_days,give_badge,stock,active,image]
      );
    }
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') redirect('/admin?tab=token-shop&error=Run+sql%2Ftokens_setup.sql+first');
    throw e;
  }
  revalidatePath('/token-shop');
  redirect('/admin?tab=token-shop&view=items&success=Item+saved!');
}

async function deleteTokenItemAction(formData) {
  'use server';
  const id = parseInt(formData.get('id'));
  if (id) await query('DELETE FROM cms_token_shop_items WHERE id = ?', [id]);
  revalidatePath('/token-shop');
  redirect('/admin?tab=token-shop&view=items&success=Item+deleted');
}

async function saveTokenPackageAction(formData) {
  'use server';
  const id          = formData.get('id') ? parseInt(formData.get('id')) : null;
  const name        = formData.get('name')?.trim();
  const tokens      = parseInt(formData.get('tokens')) || 100;
  const price_pence = parseInt(formData.get('price_pence')) || 99;
  const currency    = formData.get('currency') || 'gbp';
  const bonus_pct   = parseInt(formData.get('bonus_pct')) || 0;
  const popular     = formData.get('popular') === '1' ? 1 : 0;
  const active      = formData.get('active') === '1' ? 1 : 0;
  if (!name) redirect('/admin?tab=token-shop&view=packages&error=Name+required');
  try {
    if (id) {
      await query(
        'UPDATE cms_token_packages SET name=?,tokens=?,price_pence=?,currency=?,bonus_pct=?,popular=?,active=? WHERE id=?',
        [name,tokens,price_pence,currency,bonus_pct,popular,active,id]
      );
    } else {
      await query(
        'INSERT INTO cms_token_packages (name,tokens,price_pence,currency,bonus_pct,popular,active) VALUES (?,?,?,?,?,?,?)',
        [name,tokens,price_pence,currency,bonus_pct,popular,active]
      );
    }
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') redirect('/admin?tab=token-shop&error=Run+sql%2Ftokens_setup.sql+first');
    throw e;
  }
  redirect('/admin?tab=token-shop&view=packages&success=Package+saved!');
}

async function deleteTokenPackageAction(formData) {
  'use server';
  const id = parseInt(formData.get('id'));
  if (id) await query('DELETE FROM cms_token_packages WHERE id = ?', [id]);
  redirect('/admin?tab=token-shop&view=packages&success=Package+deleted');
}

async function grantTokensAction(formData) {
  'use server';
  const username = formData.get('username')?.trim();
  const amount   = parseInt(formData.get('amount')) || 0;
  if (!username || amount <= 0) redirect('/admin?tab=token-shop&view=grant&error=Invalid+input');

  const target = await queryOne('SELECT id, username FROM users WHERE username = ?', [username]);
  if (!target) redirect('/admin?tab=token-shop&view=grant&error=User+not+found');

  await query('UPDATE users SET shop_tokens = shop_tokens + ? WHERE id = ?', [amount, target.id]);

  // Log to staff actions
  const admin = await getCurrentUser();
  await logAdminAction({
    adminId:    admin?.id,
    adminName:  admin?.username,
    action:     'Grant Tokens',
    targetType: 'user',
    targetId:   target.id,
    details:    `Granted ${amount} token${amount !== 1 ? 's' : ''} to ${target.username}`,
  });

  redirect(`/admin?tab=token-shop&view=grant&success=Granted+${amount}+tokens+to+${encodeURIComponent(username)}`);
}

const L = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };
const sym = { gbp: '£', usd: '$', eur: '€' };

export default async function TokenShopSection({ view, sp, user }) {
  // ── Tables check ──────────────────────────────────────────────────────────
  const tablesExist = await query("SHOW TABLES LIKE 'cms_token_packages'")
    .then(r => r.length > 0).catch(() => false);

  if (!tablesExist) {
    return (
      <div>
        <SH title="Token Shop" sub="Setup required" />
        <div className="panel no-hover" style={{ padding: 24, borderLeft: '3px solid #f5a623' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#f5a623', marginBottom: 8 }}>Database tables not set up yet</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Run the following command once to create the token shop tables:
          </p>
          <code style={{ display: 'block', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', fontSize: 12, fontFamily: 'monospace', color: 'var(--green)', marginBottom: 16 }}>
            mysql -u root -p arcturus {'<'} sql/tokens_setup.sql
          </code>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Or import <strong>sql/tokens_setup.sql</strong> via phpMyAdmin / HeidiSQL.
          </p>
        </div>
      </div>
    );
  }

  // ── Purchase Logs ─────────────────────────────────────────────────────────
  if (!view || view === 'purchases') {
    const page   = Math.max(1, parseInt(sp?.page || '1'));
    const limit  = 30;
    const offset = (page - 1) * limit;
    const [purchases, total] = await Promise.all([
      query(
        `SELECT p.*, u.username, pkg.name AS package_name
         FROM cms_token_purchases p
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN cms_token_packages pkg ON pkg.id = p.package_id
         ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      ).catch(() => []),
      query('SELECT COUNT(*) AS c FROM cms_token_purchases').catch(() => [{c:0}]),
    ]);
    const totalPages = Math.ceil((total[0]?.c || 0) / limit);
    const statusColor = { pending: '#f5a623', completed: 'var(--green)', failed: '#EF5856', refunded: '#888' };

    return (
      <div>
        <SH title="Real-Money Purchases" sub="Log of all token purchases made with crypto" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {purchases.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No purchases yet.</p>
          ) : (
            <table className="table-panel">
              <thead>
                <tr><th>Date</th><th>User</th><th>Package</th><th>Tokens</th><th>Paid</th><th>Status</th><th>Payment ID</th></tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleString('en-GB', { day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' })}
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.username || `#${p.user_id}`}</td>
                    <td>{p.package_name || `#${p.package_id}`}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>🪙 {Number(p.tokens_amount).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{sym[p.currency]||''}{(p.amount_paid/100).toFixed(2)}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                        background: `${statusColor[p.status]}22`, color: statusColor[p.status] || 'var(--text-secondary)' }}>
                        {p.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.payment_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <a key={i} href={`/admin?tab=token-shop&page=${i+1}`}
                  style={{ padding: '3px 10px', fontSize: 11, borderRadius: 6, textDecoration: 'none',
                    background: page === i+1 ? 'var(--green)' : 'rgba(255,255,255,0.06)',
                    color: page === i+1 ? '#000' : 'var(--text-secondary)', fontWeight: 700 }}>
                  {i+1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Token Orders ──────────────────────────────────────────────────────────
  if (view === 'orders') {
    const orders = await query(
      `SELECT o.*, u.username AS buyer, g.username AS gifted_to_name, i.name AS item_name
       FROM cms_token_orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN users g ON g.id = o.gifted_to
       LEFT JOIN cms_token_shop_items i ON i.id = o.item_id
       ORDER BY o.created_at DESC LIMIT 100`
    ).catch(() => []);

    return (
      <div>
        <SH title="Token Shop Orders" sub="Items purchased or gifted with tokens" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {orders.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No orders yet.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Date</th><th>Buyer</th><th>Item</th><th>Tokens</th><th>Gifted To</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(o.created_at).toLocaleString('en-GB', { day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit' })}
                    </td>
                    <td style={{ fontWeight: 700 }}>{o.buyer || `#${o.user_id}`}</td>
                    <td>{o.item_name || `#${o.item_id}`}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>🪙 {o.tokens_spent}</td>
                    <td>{o.gifted_to
                      ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>🎁 {o.gifted_to_name}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Token Packages ────────────────────────────────────────────────────────
  if (view === 'packages') {
    const editId  = sp?.id ? parseInt(sp.id) : null;
    const editPkg = editId ? await queryOne('SELECT * FROM cms_token_packages WHERE id = ?', [editId]).catch(() => null) : null;
    const packages = await query('SELECT * FROM cms_token_packages ORDER BY sort_order, id').catch(() => []);

    return (
      <div>
        <SH title="Token Packages" sub="Configure the real-money bundles players can buy with crypto" />

        {/* ── Create / Edit form ── */}
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{editPkg ? 'Edit Package' : 'New Package'}</h4>
          <form action={saveTokenPackageAction}>
            {editPkg && <input type="hidden" name="id" value={editPkg.id} />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={L}>Name *</label>
                <input type="text" name="name" defaultValue={editPkg?.name||''} required />
              </div>
              <div>
                <label style={L}>Tokens Given</label>
                <input type="number" name="tokens" defaultValue={editPkg?.tokens||100} />
              </div>
              <div>
                <label style={L}>Price (pence/cents)</label>
                <input type="number" name="price_pence" defaultValue={editPkg?.price_pence||99} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>e.g. 99 = £0.99</span>
              </div>
              <div>
                <label style={L}>Bonus % (display)</label>
                <input type="number" name="bonus_pct" defaultValue={editPkg?.bonus_pct||0} />
              </div>
              <div>
                <label style={L}>Currency</label>
                <select name="currency" defaultValue={editPkg?.currency||'gbp'}>
                  <option value="gbp">GBP (£)</option>
                  <option value="usd">USD ($)</option>
                  <option value="eur">EUR (€)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" name="popular" value="1" defaultChecked={editPkg?.popular === 1} />
                Best Value badge
              </label>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" name="active" value="1" defaultChecked={editPkg?.active !== 0} />
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">{editPkg ? 'Save Changes' : 'Create Package'}</button>
              {editPkg && <a href="/admin?tab=token-shop&view=packages" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>Cancel</a>}
            </div>
          </form>
        </div>

        {/* ── Packages table ── */}
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Packages ({packages.length})</h4>
          {packages.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No packages yet.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Name</th><th>Tokens</th><th>Price</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {packages.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.name} {p.popular ? '⭐' : ''}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>🪙 {Number(p.tokens).toLocaleString()}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{sym[p.currency]||''}{(p.price_pence/100).toFixed(2)}</td>
                    <td><span style={{ fontSize: 10, color: p.active ? 'var(--green)' : '#EF5856', fontWeight: 700 }}>{p.active ? 'Active' : 'Hidden'}</span></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <a href={`/admin?tab=token-shop&view=packages&id=${p.id}`} className="btn btn-secondary btn-sm">Edit</a>
                      <form action={deleteTokenPackageAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="btn btn-sm btn-delete">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Token Shop Items ──────────────────────────────────────────────────────
  if (view === 'items' || view === 'item-create' || view === 'item-edit') {
    const editId   = sp?.id ? parseInt(sp.id) : null;
    const editItem = editId ? await queryOne('SELECT * FROM cms_token_shop_items WHERE id = ?', [editId]).catch(() => null) : null;
    const items    = await query('SELECT * FROM cms_token_shop_items ORDER BY category, sort_order, id').catch(() => []);
    const showForm = view !== 'items';
    const catLabels = { vip: 'VIP', diamonds: 'Diamonds', credits: 'Credits', rares: 'Rares', general: 'General' };

    return (
      <div>
        <SH title="Token Shop Items" sub="Items players can buy or receive as gifts with tokens" />

        {/* ── Create / Edit form ── */}
        {showForm ? (
          <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{editItem ? 'Edit Item' : 'New Item'}</h4>
            <form action={saveTokenItemAction}>
              {editItem && <input type="hidden" name="id" value={editItem.id} />}

              {/* Row 1: basic fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={L}>Name *</label>
                  <input type="text" name="name" defaultValue={editItem?.name||''} required />
                </div>
                <div>
                  <label style={L}>Token Cost</label>
                  <input type="number" name="token_cost" defaultValue={editItem?.token_cost||100} />
                </div>
                <div>
                  <label style={L}>Category</label>
                  <select name="category" defaultValue={editItem?.category||'general'}>
                    {Object.entries(catLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={L}>Stock (-1 = unlimited)</label>
                  <input type="number" name="stock" defaultValue={editItem?.stock ?? -1} min={-1} />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 12 }}>
                <label style={L}>Description</label>
                <input type="text" name="description" defaultValue={editItem?.description||''} style={{ width: '100%' }} />
              </div>

              {/* Image */}
              <div style={{ marginBottom: 12 }}>
                <label style={L}>Image URL (100×100)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="text" name="image" defaultValue={editItem?.image||''} placeholder="https://... or /images/..." style={{ flex: 1 }} />
                  {editItem?.image && (
                    <img src={editItem.image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0 }} />
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Leave blank to use the category icon.</span>
              </div>

              {/* Rewards row */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>REWARDS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Credits',       name: 'give_credits',    val: editItem?.give_credits||0 },
                  { label: 'Duckets',        name: 'give_pixels',     val: editItem?.give_pixels||0 },
                  { label: 'Diamonds',       name: 'give_points',     val: editItem?.give_points||0 },
                  { label: 'Give Rank #',    name: 'give_rank',       val: editItem?.give_rank||0 },
                  { label: 'Rank Days (0=∞)',name: 'give_rank_days',  val: editItem?.give_rank_days||0 },
                ].map(f => (
                  <div key={f.name}>
                    <label style={L}>{f.label}</label>
                    <input type="number" name={f.name} defaultValue={f.val} min={0} />
                  </div>
                ))}
                <div>
                  <label style={L}>Badge Code</label>
                  <input type="text" name="give_badge" defaultValue={editItem?.give_badge||''} placeholder="e.g. ADM" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" name="active" value="1" defaultChecked={editItem?.active !== 0} />
                  Active (visible in shop)
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary btn-sm">{editItem ? 'Save Changes' : 'Create Item'}</button>
                <a href="/admin?tab=token-shop&view=items" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>Cancel</a>
              </div>
            </form>
          </div>
        ) : null}

        {/* ── Items table ── */}
        <div className="panel no-hover" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700 }}>All Items ({items.length})</h4>
            {!showForm && <a href="/admin?tab=token-shop&view=item-create" className="btn btn-primary btn-sm">+ New Item</a>}
          </div>
          <table className="table-panel">
            <thead>
              <tr><th>Img</th><th>Name</th><th>Cat</th><th>Cost</th><th>Rewards</th><th>Stock</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>
                    {i.image
                      ? <img src={i.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                      : <span style={{ fontSize: 18 }}>🎁</span>
                    }
                  </td>
                  <td style={{ fontWeight: 700 }}>{i.name}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{catLabels[i.category]||i.category}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}><image src="/images/plus_token.png"></image> {i.token_cost}</td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {[
                      i.give_credits>0 && `${i.give_credits} Credits`,
                      i.give_points>0  && `${i.give_points} Duckets`,
                      i.give_rank>0    && `Rank ${i.give_rank}${i.give_rank_days>0?` (${i.give_rank_days}d)`:''}`,
                      i.give_badge     && `Badge`,
                    ].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td>{i.stock === -1 ? '∞' : i.stock}</td>
                  <td><span style={{ color: i.active ? 'var(--green)' : '#EF5856', fontWeight: 700, fontSize: 11 }}>{i.active ? 'Yes' : 'No'}</span></td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <a href={`/admin?tab=token-shop&view=item-edit&id=${i.id}`} className="btn btn-secondary btn-sm">Edit</a>
                    <form action={deleteTokenItemAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="btn btn-sm btn-delete">Del</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Voucher Codes ─────────────────────────────────────────────────────────
  if (view === 'vouchers') {
    const vouchers = await query(`
      SELECT v.*, COUNT(r.id) AS redemptions
      FROM cms_vouchers v
      LEFT JOIN cms_voucher_redemptions r ON r.voucher_id = v.id
      GROUP BY v.id ORDER BY v.created_at DESC LIMIT 100
    `).catch(() => null);

    return (
      <div>
        <SH title="Voucher Codes" sub="Create redeemable reward codes for the token shop" back="token-shop" />
        {vouchers === null && (
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 16, borderColor: 'rgba(245,166,35,0.3)' }}>
            <p style={{ fontSize: 12, color: '#f5a623', fontWeight: 700 }}>Run the SQL below to enable vouchers:</p>
            <pre style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{`CREATE TABLE cms_vouchers (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) UNIQUE NOT NULL, give_credits INT DEFAULT 0, give_pixels INT DEFAULT 0, give_points INT DEFAULT 0, give_tokens INT DEFAULT 0, give_badge VARCHAR(50), max_uses INT DEFAULT 0, uses_count INT DEFAULT 0, message VARCHAR(200), active TINYINT DEFAULT 1, expires_at DATETIME, created_at DATETIME DEFAULT NOW());\nCREATE TABLE cms_voucher_redemptions (id INT AUTO_INCREMENT PRIMARY KEY, voucher_id INT NOT NULL, user_id INT NOT NULL, redeemed_at DATETIME DEFAULT NOW(), UNIQUE KEY uk_redeem (voucher_id, user_id));`}</pre>
          </div>
        )}

        {/* ── Create form ── */}
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Create Voucher</h4>
          <form action={createVoucherAction}>
            <div style={{ marginBottom: 12 }}>
              <label style={L}>Code (blank = auto-generate)</label>
              <input type="text" name="code" placeholder="e.g. SUMMER2024" maxLength={32}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: 1, maxWidth: 300 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
              <div><label style={L}>Credits</label><input type="number" name="give_credits" defaultValue={0} min={0} /></div>
              <div><label style={L}>Duckets</label><input type="number" name="give_pixels" defaultValue={0} min={0} /></div>
              <div><label style={L}>Diamonds</label><input type="number" name="give_points" defaultValue={0} min={0} /></div>
              <div><label style={L}>Tokens</label><input type="number" name="give_tokens" defaultValue={0} min={0} /></div>
              <div><label style={L}>Max Uses 0 = ∞</label><input type="number" name="max_uses" defaultValue={0} min={0} /></div>
              <div><label style={L}>Expires At</label><input style={{maxWidth: 120 }} type="datetime-local" name="expires_at" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={L}>Badge Code (optional)</label>
                <input type="text" name="give_badge" placeholder="e.g. EVENT2024" maxLength={50} />
              </div>
              <div>
                <label style={L}>Message (shown on redeem)</label>
                <input type="text" name="message" placeholder="Thanks for participating!" maxLength={200} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Create Voucher</button>
          </form>
        </div>

        {/* ── Vouchers table ── */}
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Vouchers ({vouchers?.length ?? 0})</h4>
          {!vouchers || vouchers.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No vouchers yet.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Code</th><th>Rewards</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {vouchers.map(v => {
                  const rewards = [
                    v.give_credits > 0 && `${v.give_credits.toLocaleString()} Credits`,
                    v.give_pixels > 0  && `${v.give_pixels.toLocaleString()} Duckets`,
                    v.give_points > 0  && `${v.give_points.toLocaleString()} Diamonds`,
                    v.give_tokens > 0  && `${v.give_tokens.toLocaleString()} Tokens`,
                    v.give_badge       && v.give_badge,
                  ].filter(Boolean).join(', ');
                  const expired = v.expires_at && new Date(v.expires_at) < new Date();
                  return (
                    <tr key={v.id}>
                      <td><code style={{ fontSize: 12, letterSpacing: 1 }}>{v.code}</code></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rewards || '—'}</td>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{v.redemptions}{v.max_uses > 0 && ` / ${v.max_uses}`}</td>
                      <td style={{ fontSize: 11, color: expired ? '#EF5856' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {v.expires_at ? new Date(v.expires_at).toLocaleDateString() : '∞'}
                      </td>
                      <td>
                        <form action={toggleVoucherAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="active" value={v.active ? '1' : '0'} />
                          <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px',
                            color: v.active && !expired ? 'var(--green)' : '#EF5856',
                            background: v.active && !expired ? 'rgba(52,189,89,0.1)' : 'rgba(239,88,86,0.1)' }}>
                            {v.active && !expired ? 'Active' : 'Inactive'}
                          </button>
                        </form>
                      </td>
                      <td>
                        <form action={deleteVoucherAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={v.id} />
                          <button type="submit" className="btn btn-sm btn-delete" style={{ fontSize: 9 }}>Del</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Flash Sales ───────────────────────────────────────────────────────────
  if (view === 'flash-sales') {
    const [sales, tokenItems] = await Promise.all([
      query(`
        SELECT fs.*, i.name AS item_name, i.token_cost AS base_price
        FROM cms_flash_sales fs
        JOIN cms_token_shop_items i ON i.id = fs.item_id
        ORDER BY fs.ends_at DESC LIMIT 50
      `).catch(() => null),
      query('SELECT id, name, token_cost FROM cms_token_shop_items WHERE active = 1 ORDER BY name').catch(() => []),
    ]);
    const now = new Date();

    return (
      <div>
        <SH title="Flash Sales" sub="Set time-limited token discounts on token shop items" back="token-shop" />
        {sales === null && (
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 16, borderColor: 'rgba(245,166,35,0.3)' }}>
            <p style={{ fontSize: 12, color: '#f5a623', fontWeight: 700 }}>Run this SQL to enable flash sales:</p>
            <pre style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{`CREATE TABLE cms_flash_sales (id INT AUTO_INCREMENT PRIMARY KEY, item_id INT NOT NULL, discount_pct TINYINT NOT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, active TINYINT DEFAULT 1);`}</pre>
          </div>
        )}

        {/* ── Create form ── */}
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Create Flash Sale</h4>
          <form action={createFlashSaleAction}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={L}>Token Shop Item *</label>
                <select name="item_id" required>
                  <option value="">— Select item —</option>
                  {tokenItems.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.token_cost.toLocaleString()} tokens)</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={L}>Discount %</label>
                <input type="number" name="discount_pct" defaultValue={20} min={1} max={99} required />
              </div>
              <div>
                <label style={L}>Starts At</label>
                <input type="datetime-local" name="starts_at" defaultValue={new Date().toISOString().slice(0,16)} />
              </div>
              <div>
                <label style={L}>Ends At *</label>
                <input type="datetime-local" name="ends_at" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Start Sale</button>
          </form>
        </div>

        {/* ── Sales table ── */}
        <div className="panel no-hover" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Active & Scheduled Sales</h4>
          {!sales || sales.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No flash sales yet.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>Item</th><th>Discount</th><th>Sale Price</th><th>Ends</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {sales.map(s => {
                  const salePrice = Math.floor(s.base_price * (1 - s.discount_pct / 100));
                  const isActive  = s.active && new Date(s.starts_at) <= now && new Date(s.ends_at) > now;
                  const isPast    = new Date(s.ends_at) <= now;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.item_name}</td>
                      <td style={{ color: '#EF5856', fontWeight: 700, whiteSpace: 'nowrap' }}>-{s.discount_pct}%</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <image src="/images/plus_token.png"></image> {salePrice.toLocaleString()}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 4 }}>{s.base_price?.toLocaleString()}</span>
                      </td>
                      <td style={{ fontSize: 11, color: isPast ? '#EF5856' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(s.ends_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: isActive ? 'rgba(52,189,89,0.12)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#34bd59' : isPast ? '#EF5856' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {isActive ? 'Live' : isPast ? 'Ended' : 'Scheduled'}
                        </span>
                      </td>
                      <td>
                        <form action={deleteFlashSaleAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="btn btn-sm btn-delete" style={{ fontSize: 9 }}>Del</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Grant Tokens ──────────────────────────────────────────────────────────
  if (view === 'grant') {
    return (
      <div>
        <SH title="Grant Tokens" sub="Manually add tokens to any user's balance" />
        <div className="panel no-hover" style={{ padding: 24, maxWidth: 400 }}>
          <form action={grantTokensAction}>
            <div style={{ marginBottom: 14 }}>
              <label style={L}>Username *</label>
              <input type="text" name="username" required placeholder="Enter username..." />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={L}>Token Amount *</label>
              <input type="number" name="amount" required min={1} placeholder="e.g. 500" />
            </div>
            <button type="submit" className="btn btn-primary">Grant Tokens</button>
          </form>
        </div>
      </div>
    );
  }

  // ── VIP Subscriptions ─────────────────────────────────────────────────────
  if (view === 'vip') {
    const subs = await query(
      `SELECT v.*, u.username FROM cms_vip_subscriptions v LEFT JOIN users u ON u.id = v.user_id ORDER BY v.expires_at ASC`
    ).catch(() => []);

    return (
      <div>
        <SH title="Active VIP Subscriptions" sub="Time-limited VIP ranks from token shop purchases" />
        <div className="panel no-hover" style={{ padding: 20 }}>
          {subs.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No active VIP subscriptions.</p>
          ) : (
            <table className="table-panel">
              <thead><tr><th>User</th><th>VIP Rank</th><th>Prev Rank</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {subs.map(s => {
                  const expired = new Date(s.expires_at) < new Date();
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>{s.username || `#${s.user_id}`}</td>
                      <td>Rank {s.vip_rank}</td>
                      <td>Rank {s.prev_rank}</td>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(s.expires_at).toLocaleString('en-GB', { day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' })}
                      </td>
                      <td><span style={{ fontSize: 10, fontWeight: 800, color: expired ? '#EF5856' : 'var(--green)' }}>{expired ? 'EXPIRED' : 'ACTIVE'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function SH({ title, sub, back }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>}
      </div>
      {back && <a href={`/admin?tab=${back}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>← Back</a>}
    </div>
  );
}
