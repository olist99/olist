import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';


const FURNI_RENDER = process.env.NEXT_PUBLIC_FURNI_RENDER_URL || '/swf/dcr/hof_furni/';
const FURNI_ICON = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';
const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

const CURRENCY_ICONS = {
  credits: '/images/coin.png',
  pixels: '/images/ducket.png',
  points: '/images/diamond.png',
};

function parseUtc(dateStr) {
  if (!dateStr) return new Date(NaN);
  const s = dateStr.toString().trim().replace(' UTC', '').replace(' ', 'T');
  return new Date(s.endsWith('Z') ? s : s + 'Z');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  let then;
  if (dateStr instanceof Date) {
    then = dateStr;
  } else if (typeof dateStr === 'number') {
    then = new Date(dateStr * 1000);
  } else {
    const s = String(dateStr).trim().replace(' UTC', '');
    // Handle "YYYY-MM-DD HH:MM:SS" from mysql2 dateStrings
    const normalized = s.replace(' ', 'T');
    then = new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
  }
  if (!then || isNaN(then.getTime())) return '';
  const diff = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function formatDt(date) {
  const d = parseUtc(date);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export async function generateMetadata({ params }) {
  const p = await params;
  const auction = await queryOne('SELECT title FROM cms_auctions WHERE id = ?', [parseInt(p.id)]).catch(() => null);
  return { title: auction ? `Auction: ${auction.title}` : 'Auction' };
}

export default async function AuctionProfilePage({ params }) {
  const p = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const auctionId = parseInt(p.id);
  if (!auctionId) redirect('/auction');

  const auction = await query(`
    SELECT a.*,
           u.username AS creator_name, u.look AS creator_look,
           b.user_id AS top_bidder_id, b.amount AS top_bid,
           bu.username AS top_bidder_name, bu.look AS top_bidder_look
    FROM cms_auctions a
    LEFT JOIN users u ON u.id = a.created_by
    LEFT JOIN cms_auction_bids b ON b.id = (
      SELECT id FROM cms_auction_bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1
    )
    LEFT JOIN users bu ON bu.id = b.user_id
    WHERE a.id = ?
  `, [auctionId]).then(r => r[0] || null).catch(() => null);

  if (!auction) redirect('/auction');

  const timeline = await query(`
    SELECT b.amount, b.created_at, u.username, u.look, u.id AS user_id
    FROM cms_auction_bids b
    JOIN users u ON u.id = b.user_id
    WHERE b.auction_id = ?
    ORDER BY b.created_at ASC
  `, [auctionId]).catch(() => []);

  const isEnded = auction.status === 'ended' || parseUtc(auction.end_time) <= new Date();
  const currIcon = CURRENCY_ICONS[auction.currency] || '/images/coin.png';

  return (
    <div className="animate-fade-up">
      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/auction" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← Back to Auction House
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Left: Main info + timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Auction card */}
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden', borderLeft: auction.is_official ? '3px solid var(--green)' : undefined }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {auction.is_official && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,189,89,0.15)', color: 'var(--green)', flexShrink: 0 }}>OFFICIAL</span>
              )}
              <h1 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>{(auction.title || '').replace(/^\d+\s+/, '')}</h1>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: isEnded ? 'rgba(255,255,255,0.06)' : 'rgba(52,189,89,0.1)',
                color: isEnded ? 'var(--text-muted)' : 'var(--green)',
              }}>
                {isEnded ? 'Ended' : 'Active'}
              </span>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                {/* Item image */}
                {auction.item_name && (
                  <div style={{ width: 96, height: 96, background: 'var(--panel-inner)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img
                      src={`${FURNI_RENDER}${auction.item_name}/${auction.item_name}_64.png`}
                      alt={auction.title}
                      style={{ maxWidth: 84, maxHeight: 84, imageRendering: 'pixelated', objectFit: 'contain' }}
                      onError={() => {}}
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  {auction.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{auction.description}</p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>STARTING BID</div>
                      <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <img src={currIcon} alt="" style={{ width: 13 }} />
                        {parseInt(auction.start_bid).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>TOP BID</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <img src={currIcon} alt="" style={{ width: 14 }} />
                        {auction.top_bid ? parseInt(auction.top_bid).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL BIDS</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{timeline.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Winner banner */}
            {isEnded && auction.top_bidder_name && (
              <div style={{ padding: '10px 18px', background: 'rgba(52,189,89,0.08)', borderTop: '1px solid rgba(52,189,89,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)' }}>WINNER</span>
                <img src={`${HABBO_IMG}?figure=${auction.top_bidder_look}&headonly=1&size=s`} alt="" style={{ width: 24, borderRadius: '50%' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{auction.top_bidder_name}</span>
                {auction.top_bidder_id === user.id && <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--green)', color: '#000', padding: '1px 7px', borderRadius: 10 }}>YOU</span>}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  <img src={currIcon} alt="" style={{ width: 12, verticalAlign: 'middle', marginRight: 3 }} />
                  {parseInt(auction.top_bid).toLocaleString()} {auction.currency}
                </span>
              </div>
            )}
            {isEnded && !auction.top_bidder_name && (
              <div style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'var(--text-muted)' }}>
                No bids — auction ended with no winner
              </div>
            )}
          </div>

          {/* Bid Timeline */}
          <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Bid Timeline</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{timeline.length} bid{timeline.length !== 1 ? 's' : ''}</span>
            </div>

            {timeline.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No bids were placed on this auction.</div>
            ) : (
              <div style={{ padding: '8px 18px 16px' }}>
                <div style={{ position: 'relative', paddingLeft: 28 }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 10, top: 16, bottom: 16, width: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />

                  {timeline.map((bid, i) => {
                    const isTop = i === timeline.length - 1;
                    const isMe = bid.user_id === user.id;
                    const prevAmount = i > 0 ? timeline[i - 1].amount : auction.start_bid;
                    const increase = parseInt(bid.amount) - parseInt(prevAmount);

                    return (
                      <div key={i} style={{ position: 'relative', paddingTop: i === 0 ? 8 : 0, paddingBottom: 16 }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: -28 + 6, top: i === 0 ? 16 : 8,
                          width: 10, height: 10, borderRadius: '50%',
                          background: isTop ? 'var(--green)' : 'rgba(255,255,255,0.2)',
                          border: `2px solid ${isTop ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
                          zIndex: 1,
                        }} />

                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px',
                          background: isTop ? 'rgba(52,189,89,0.07)' : 'var(--panel-inner)',
                          borderRadius: 'var(--radius)',
                          border: `1px solid ${isTop ? 'rgba(52,189,89,0.2)' : 'rgba(255,255,255,0.04)'}`,
                        }}>
                          <img
                            src={`${HABBO_IMG}?figure=${bid.look}&headonly=1&size=s`}
                            alt=""
                            style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Link href={`/profile/${bid.username}`} style={{ fontSize: 12, fontWeight: 700, color: isMe ? 'var(--green)' : 'var(--text-primary)', textDecoration: 'none' }}>
                                {bid.username}
                              </Link>
                              {isMe && <span style={{ fontSize: 9, fontWeight: 800, color: '#000', background: 'var(--green)', padding: '1px 5px', borderRadius: 8 }}>YOU</span>}
                              {isTop && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)' }}>TOP BID</span>}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{formatDt(bid.created_at)}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: isTop ? 'var(--green)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <img src={currIcon} alt="" style={{ width: 12 }} />
                              {parseInt(bid.amount).toLocaleString()}
                            </div>
                            {i > 0 && (
                              <div style={{ fontSize: 10, color: 'rgba(52,189,89,0.7)', marginTop: 1 }}>
                                +{increase.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Meta info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Timing */}
          <div className="panel no-hover" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Auction Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ fontWeight: 700, color: isEnded ? 'var(--text-muted)' : 'var(--green)' }}>{isEnded ? 'Ended' : 'Active'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <span style={{ fontWeight: 700, color: auction.is_official ? 'var(--green)' : 'var(--text-secondary)' }}>{auction.is_official ? 'Official' : 'Player'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Currency</span>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <img src={currIcon} alt="" style={{ width: 12 }} />
                  {auction.currency === 'points' ? 'Diamonds' : auction.currency === 'pixels' ? 'Duckets' : 'Credits'}
                </span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ended</span>
                <span style={{ fontWeight: 600 }}>{formatDt(auction.end_time)}</span>
              </div>
            </div>
          </div>

          {/* Listed by */}
          <div className="panel no-hover" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Listed by</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={`${HABBO_IMG}?figure=${auction.creator_look}&headonly=1&size=s`}
                alt=""
                style={{ width: 36, borderRadius: '50%' }}
              />
              <div>
                <Link href={`/profile/${auction.creator_name}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {auction.creator_name}
                </Link>
                {auction.is_official && <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 1 }}>Hotel Staff</div>}
              </div>
            </div>
          </div>

          {/* Bidder leaderboard */}
          {timeline.length > 0 && (
            <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 700 }}>
                Bidder Leaderboard
              </div>
              {[...timeline].reverse().slice(0, 5).map((bid, i) => (
                <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-muted)', width: 14, textAlign: 'center' }}>#{i + 1}</span>
                  <img src={`${HABBO_IMG}?figure=${bid.look}&headonly=1&size=s`} alt="" style={{ width: 22, borderRadius: '50%' }} />
                  <Link href={`/profile/${bid.username}`} style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }} className="ellipsis">
                    {bid.username}
                  </Link>
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <img src={currIcon} alt="" style={{ width: 10 }} />
                    {parseInt(bid.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
