import { notFound, redirect } from 'next/navigation';
import { buyAction, sendOffer, acceptOffer } from './actions';
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

  // Send offer

  // Accept offer (with item transfer)

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
