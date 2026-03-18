import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatNumber, timeAgo, RANK_COLORS, CURRENCY_ICONS } from '@/lib/utils';

const CIcon = ({ type, size = 14 }) => <img src={CURRENCY_ICONS[type] || '/images/coin.png'} alt="" style={{ width: size, height: size, imageRendering: 'pixelated', verticalAlign: 'middle' }} />;
import PriceHistory from '@/components/PriceHistory';


const CURRENCY_LABEL = { credits: 'Credits', pixels: 'Duckets', points: 'Diamonds' };

export async function generateMetadata({ params }) {
  const p = await params;
  const listing = await queryOne('SELECT title FROM cms_marketplace WHERE id = ?', [p.id]);
  return { title: listing?.title || 'Listing' };
}

export default async function MarketplaceDetailPage({ params, searchParams }) {
  const p = await params;
  const sp = await searchParams;
  const listingId = parseInt(p.id);
  const msg = sp?.msg;
  const error = sp?.error;

  const listing = await queryOne(`
    SELECT ml.*, u.username AS seller_name, u.look AS seller_look, u.rank AS seller_rank, u.motto AS seller_motto,
           p.rank_name AS seller_rank_name
    FROM cms_marketplace ml
    JOIN users u ON u.id = ml.seller_id
    LEFT JOIN permissions p ON p.id = u.\`rank\`
    WHERE ml.id = ?
  `, [listingId]);

  if (!listing) notFound();

  const user = await getCurrentUser();
  const isMine = user && user.id === listing.seller_id;

  const offers = await query(`
    SELECT o.*, u.username AS buyer_name, u.look AS buyer_look
    FROM cms_marketplace_offers o
    JOIN users u ON u.id = o.buyer_id
    WHERE o.listing_id = ?
    ORDER BY o.created_at DESC
  `, [listingId]);

  let buyer = null;
  if (listing.buyer_id) {
    buyer = await queryOne('SELECT username, look FROM users WHERE id = ?', [listing.buyer_id]);
  }

  const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

  // Buy action (with item transfer)
  async function buyAction(formData) {
    'use server';
    const { getSessionUserId: getId } = await import('@/lib/auth');
    const { query: db, queryOne: dbOne } = await import('@/lib/db');
    const { safeInt, safeCurrencyColumn, checkRateLimit } = await import('@/lib/security');
    const uid = await getId();
    if (!uid) redirect('/login');

    const rl = checkRateLimit(`market-buy:${uid}`, 20, 60000);
    if (!rl.ok) redirect('/marketplace?error=Too+many+actions');

    const lid = safeInt(formData.get('listing_id'), 1);
    if (!lid) redirect('/marketplace?error=Invalid+listing');

    const item = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND status = ?', [lid, 'active']);
    if (!item) redirect(`/marketplace/${lid}?error=Listing+unavailable`);
    if (item.seller_id === uid) redirect(`/marketplace/${lid}?error=Cannot+buy+own+listing`);

    const col = safeCurrencyColumn(item.currency);
    if (!col) redirect(`/marketplace/${lid}?error=Invalid+currency`);

    // Atomic deduct
    const deduct = await db(
      `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
      [item.price, uid, item.price]
    );
    if (deduct.affectedRows === 0) redirect(`/marketplace/${lid}?error=Not+enough+diamonds`);

    // Atomic sell (prevents race)
    const sold = await db(
      "UPDATE cms_marketplace SET status = 'sold', buyer_id = ?, sold_at = NOW() WHERE id = ? AND status = 'active'",
      [uid, lid]
    );
    if (sold.affectedRows === 0) {
      await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [item.price, uid]);
      redirect(`/marketplace/${lid}?error=Already+sold`);
    }

    await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [item.price, item.seller_id]);
    if (item.item_id) await db('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [uid, item.item_id]);
    await db("UPDATE cms_marketplace_offers SET status = 'rejected' WHERE listing_id = ? AND status = 'pending'", [lid]);

    try {
      await db('INSERT INTO cms_marketplace_price_history (item_base_id, item_name, price, currency, listing_id, sold_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [item.item_base_id || 0, item.item_name, item.price, item.currency, lid]);
    } catch(e) {}

    const { sendNotification } = await import('@/lib/notifications');
    sendNotification(item.seller_id, {
      type: 'marketplace_sold',
      title: 'Your listing sold!',
      message: `"${item.item_name || item.title}" sold for ${item.price.toLocaleString()} ${item.currency}.`,
      link: '/marketplace?tab=my',
    });

    redirect(`/marketplace/${lid}?msg=Purchase+successful!`);
  }

  // Send offer
  async function sendOffer(formData) {
    'use server';
    const { getSessionUserId: getId } = await import('@/lib/auth');
    const { query: db, queryOne: dbOne } = await import('@/lib/db');
    const { safeInt, sanitizeText, checkRateLimit } = await import('@/lib/security');
    const uid = await getId();
    if (!uid) redirect('/login');

    const rl = checkRateLimit(`market-offer:${uid}`, 15, 60000);
    if (!rl.ok) redirect('/marketplace?error=Too+many+offers');

    const lid = safeInt(formData.get('listing_id'), 1);
    const amount = safeInt(formData.get('offer_amount'), 1, 100000000);
    const message = sanitizeText(formData.get('offer_message') || '', 500);

    if (!lid || !amount) redirect(`/marketplace?error=Invalid+offer`);

    const item = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND status = ?', [lid, 'active']);
    if (!item) redirect(`/marketplace/${lid}?error=Listing+unavailable`);
    if (item.seller_id === uid) redirect(`/marketplace/${lid}?error=Cannot+offer+on+own`);

    await db('INSERT INTO cms_marketplace_offers (listing_id, buyer_id, amount, currency, message) VALUES (?,?,?,?,?)',
      [lid, uid, amount, item.currency, message]);

    const { sendNotification } = await import('@/lib/notifications');
    const buyer = await dbOne('SELECT username FROM users WHERE id = ?', [uid]);
    sendNotification(item.seller_id, {
      type: 'marketplace_offer',
      title: 'New offer on your listing!',
      message: `${buyer?.username || 'Someone'} offered ${amount.toLocaleString()} ${item.currency} for "${item.item_name || item.title}".`,
      link: `/marketplace/${lid}`,
    });

    redirect(`/marketplace/${lid}?msg=Offer+sent!`);
  }

  // Accept offer (with item transfer)
  async function acceptOffer(formData) {
    'use server';
    const { getSessionUserId: getId } = await import('@/lib/auth');
    const { query: db, queryOne: dbOne } = await import('@/lib/db');
    const { safeInt, safeCurrencyColumn } = await import('@/lib/security');
    const uid = await getId();
    if (!uid) redirect('/login');

    const offerId = safeInt(formData.get('offer_id'), 1);
    if (!offerId) redirect('/marketplace?error=Invalid+offer');

    const offer = await dbOne(`
      SELECT o.*, ml.seller_id, ml.currency, ml.item_id, ml.item_base_id, ml.item_name, ml.price AS listing_price
      FROM cms_marketplace_offers o
      JOIN cms_marketplace ml ON ml.id = o.listing_id
      WHERE o.id = ? AND o.status = 'pending'
    `, [offerId]);
    if (!offer || offer.seller_id !== uid) redirect('/marketplace?error=Invalid+offer');

    const col = safeCurrencyColumn(offer.currency);
    if (!col) redirect('/marketplace?error=Invalid+currency');

    // Atomic deduct from buyer
    const deduct = await db(
      `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
      [offer.amount, offer.buyer_id, offer.amount]
    );
    if (deduct.affectedRows === 0) redirect('/marketplace?error=Buyer+insufficient+funds');

    await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [offer.amount, uid]);
    if (offer.item_id) await db('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [offer.buyer_id, offer.item_id]);
    await db('UPDATE cms_marketplace SET status = ?, buyer_id = ?, sold_at = NOW() WHERE id = ?', ['sold', offer.buyer_id, offer.listing_id]);
    await db("UPDATE cms_marketplace_offers SET status = 'accepted' WHERE id = ?", [offerId]);
    await db("UPDATE cms_marketplace_offers SET status = 'rejected' WHERE listing_id = ? AND id != ? AND status = 'pending'", [offer.listing_id, offerId]);

    // Record price history (with offer amount)
    try {
      await db('INSERT INTO cms_marketplace_price_history (item_base_id, item_name, price, currency, listing_id, sold_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [offer.item_base_id || 0, offer.item_name, offer.amount, offer.currency, offer.listing_id]);
    } catch(e) {}

    redirect(`/marketplace/${listingId}?msg=Offer+accepted!+Item+sold.`);
  }

  const rankColor = RANK_COLORS[listing.seller_rank] || '#8b949e';

  return (
    <div className="animate-fade-up">
      <Link href="/marketplace" className="btn btn-secondary btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>← Back to Marketplace</Link>

      {msg && <div className="flash flash-success">{decodeURIComponent(msg).replace(/[<>]/g, "")}</div>}
      {error && <div className="flash flash-error">{decodeURIComponent(error).replace(/[<>]/g, "")}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Main Content */}
        <div>
          <div className="panel no-hover" style={{ overflow: 'hidden' }}>
            {/* Item image */}
            <div style={{
              height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--panel-inner), #22213a)', position: 'relative', fontSize: 64,
            }}>
              {listing.item_image ? (
                <img src={listing.item_image} alt="" style={{ maxHeight: 100, imageRendering: 'pixelated' }} />
              ) : <img src="/images/icon-package.png" alt="" style={{ width: 64, height: 64 }} />}
              {listing.quantity > 1 && (
                <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--green)', color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>x{listing.quantity}</span>
              )}
              <span className={`listing-status ${listing.status}`} style={{ position: 'absolute', top: 12, left: 12 }}>
                {listing.status === 'active' && listing.item_id ? '✓ VERIFIED' : listing.status.toUpperCase()}
              </span>
            </div>

            <div style={{ padding: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{listing.title}</h1>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                <span style={{ background: 'var(--panel-inner)', padding: '3px 10px', borderRadius: 'var(--radius)' }}>{listing.category}</span>
                <Link href={`/marketplace/item?name=${encodeURIComponent(listing.item_name)}${listing.item_base_id ? `&base_id=${listing.item_base_id}` : ''}`}
                  style={{ color: 'var(--green)' }}> {listing.item_name}</Link>
                <span>📅 {timeAgo(listing.created_at)}</span>
                {listing.item_id && <span style={{ color: 'var(--green)' }}>✓ Real inventory item</span>}
              </div>

              {listing.description && (
                <div style={{
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line',
                  padding: 16, background: 'var(--panel-inner)', borderRadius: 'var(--radius)', marginBottom: 16,
                }}>
                  {listing.description}
                </div>
              )}

              {/* Price box */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                background: 'var(--panel-inner)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Asking Price</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CIcon type={listing.currency} size={22} /> {formatNumber(listing.price)}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{CURRENCY_LABEL[listing.currency]}</span>
                  </div>
                </div>
                {listing.status === 'active' && user && !isMine && (
                  <form action={buyAction} style={{ marginLeft: 'auto' }}>
                    <input type="hidden" name="listing_id" value={listing.id} />
                    <button type="submit" className="btn-enterhotel" style={{ fontSize: 14 }}>Buy Now</button>
                  </form>
                )}
              </div>

              {listing.status === 'sold' && buyer && (
                <div style={{
                  marginTop: 16, padding: 16, background: 'rgba(52,189,89,0.05)', border: '1px solid rgba(52,189,89,0.2)',
                  borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 18 }}></span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Sold to</div>
                    <Link href={`/profile/${buyer.username}`} style={{ fontSize: 13 }}>{buyer.username}</Link>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(listing.sold_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Price History */}
          <div className="panel no-hover" style={{ padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Price History — {listing.item_name}</h3>
            <PriceHistory itemName={listing.item_name} baseId={listing.item_base_id} />
          </div>

          {/* Make Offer */}
          {listing.status === 'active' && user && !isMine && (
            <div className="panel no-hover" style={{ padding: 20, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Make an Offer</h3>
              <form action={sendOffer}>
                <input type="hidden" name="listing_id" value={listing.id} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Your Offer (<CIcon type={listing.currency} />)
                    </label>
                    <input type="number" name="offer_amount" min={1} required placeholder="Amount..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Message (optional)
                    </label>
                    <input type="text" name="offer_message" maxLength={200} placeholder="e.g. Would you take less?" />
                  </div>
                </div>
                <button type="submit" className="btn btn-secondary">Send Offer</button>
              </form>
            </div>
          )}

          {/* Offers (for seller) */}
          {isMine && offers.length > 0 && (
            <div className="panel no-hover" style={{ padding: 20, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Offers ({offers.length})</h3>
              {offers.map(o => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  background: 'var(--panel-inner)', borderRadius: 'var(--radius)', marginBottom: 8,
                }}>
                  <img src={`${HABBO_IMG}?figure=${o.buyer_look}&headonly=1&size=s&direction=3`} alt=""
                    style={{ width: 20, imageRendering: 'pixelated' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link href={`/profile/${o.buyer_name}`} style={{ fontSize: 12, fontWeight: 700 }}>{o.buyer_name}</Link>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(o.created_at)}</span>
                      <span className={`listing-status ${o.status === 'pending' ? 'active' : o.status === 'accepted' ? 'active' : ''}`}
                        style={{ background: o.status === 'pending' ? 'rgba(231,166,41,0.15)' : undefined, color: o.status === 'pending' ? '#E7A629' : undefined }}>
                        {o.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}><CIcon type={o.currency} /> {formatNumber(o.amount)}</div>
                    {o.message && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{o.message}</div>}
                  </div>
                  {o.status === 'pending' && listing.status === 'active' && (
                    <form action={acceptOffer}>
                      <input type="hidden" name="offer_id" value={o.id} />
                      <button type="submit" className="btn btn-primary btn-sm">Accept</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="panel no-hover" style={{ padding: 20, textAlign: 'center', position: 'sticky', top: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Listed by</div>
            <img src={`${HABBO_IMG}?figure=${listing.seller_look}&direction=2&size=l&gesture=sml`} alt=""
              style={{ imageRendering: 'pixelated', margin: '0 auto' }} />
            <Link href={`/profile/${listing.seller_name}`}
              style={{ display: 'block', fontSize: 16, fontWeight: 700, marginTop: 8, color: 'var(--white)' }}>
              {listing.seller_name}
            </Link>
            <div style={{ fontSize: 11, marginTop: 4, color: rankColor }}>{listing.seller_rank_name || 'Member'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
              &ldquo;{listing.seller_motto}&rdquo;
            </div>
            <Link href={`/profile/${listing.seller_name}`} className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }}>
              View Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
