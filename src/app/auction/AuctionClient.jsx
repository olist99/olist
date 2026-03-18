'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const CURRENCY_ICONS = { credits: '/images/coin.png', pixels: '/images/ducket.png', points: '/images/diamond.png' };
const CURRENCY_LABELS = { credits: 'Credits', pixels: 'Duckets', points: 'Diamonds' };

const FURNI_RENDER = process.env.NEXT_PUBLIC_FURNI_RENDER_URL || '/swf/dcr/hof_furni/';
const FURNI_ICON = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';

function FurniImg({ name, size = 64 }) {
  const [src, setSrc] = useState(`${FURNI_RENDER}${name}/${name}_64.png`);
  const [failed, setFailed] = useState(false);
  if (!name || failed) return <span style={{ fontSize: size * 0.5 }}>📦</span>;
  return (
    <img src={src} alt={name} style={{ maxWidth: size, maxHeight: size, imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={() => {
        if (src.includes('_64.png')) setSrc(`${FURNI_ICON}${name}_icon.png`);
        else setFailed(true);
      }}
    />
  );
}

function parseUtc(dateStr) {
  if (!dateStr) return new Date(NaN);
  const s = dateStr.toString().trim().replace(' UTC', '').replace(' ', 'T');
  return new Date(s.endsWith('Z') ? s : s + 'Z');
}

function timeLeft(endTime) {
  const diff = parseUtc(endTime) - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function AuctionCard({ auction, userId, userRank, onBid }) {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [bids, setBids] = useState([]);
  const [tick, setTick] = useState(0);

  const isEnded = parseUtc(auction.end_time) <= Date.now();
  const isOwner = auction.created_by === userId;
  const minBid = auction.top_bid ? auction.top_bid + 1 : auction.start_bid;

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const loadBids = async () => {
    try {
      const res = await fetch(`/api/auction?type=bids&id=${auction.id}`);
      const data = await res.json();
      setBids(data.bids || []);
    } catch {}
  };

  const handleExpand = () => {
    setExpanded(e => !e);
    if (!expanded) loadBids();
  };

  const handleDelete = async () => {
    if (!confirm('Cancel this auction? All bids will be refunded.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: auction.id }),
      });
      const data = await res.json();
      if (data.ok) onBid();
      else setMsg({ type: 'error', text: data.error || 'Failed to cancel' });
    } catch { setMsg({ type: 'error', text: 'Connection error' }); }
    setDeleting(false);
  };

  const handleBid = async () => {
    const amt = parseInt(bidAmount);
    if (!amt || amt < minBid) { setMsg({ type: 'error', text: `Minimum bid: ${minBid.toLocaleString()}` }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bid', auction_id: auction.id, amount: amt }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'success', text: `Bid of ${amt.toLocaleString()} placed!` });
        setBidAmount('');
        onBid();
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed' });
      }
    } catch { setMsg({ type: 'error', text: 'Connection error' }); }
    setLoading(false);
  };

  const tl = timeLeft(auction.end_time);
  const isUrgent = !isEnded && parseUtc(auction.end_time) - Date.now() < 3600000;

  return (
    <div style={{ background: 'var(--panel-bg)', border: `1px solid ${auction.is_official ? 'rgba(52,189,89,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {auction.is_official && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: 'rgba(52,189,89,0.15)', color: 'var(--green)', flexShrink: 0 }}>OFFICIAL</span>}
          <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(auction.title || '').replace(/^\d+\s+/, '')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isEnded ? 'var(--text-muted)' : isUrgent ? '#EF5856' : 'var(--green)', padding: '2px 8px', borderRadius: 20, background: isEnded ? 'rgba(255,255,255,0.04)' : isUrgent ? 'rgba(239,88,86,0.1)' : 'rgba(52,189,89,0.1)', whiteSpace: 'nowrap' }}>
            {isEnded ? 'Ended' : `⏱ ${tl}`}
          </div>
          {(isOwner || userRank >= 4) && (
            <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>
              {deleting ? '...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Winner banner */}
      {isEnded && auction.top_bidder_name && (
        <div style={{ padding: '7px 14px', background: 'rgba(95,227,94,0.1)', borderBottom: '1px solid rgba(95,227,94,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/images/noti/auction_won_noti.png" alt="Winner" style={{ width: 20, height: 20, imageRendering: 'pixelated', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase' }}>Winner:</span>
            <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${auction.top_bidder_look}&headonly=1&size=s`} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)' }}>{auction.top_bidder_name}</span>
            {auction.top_bidder_id === userId && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--green)', padding: '1px 6px', borderRadius: 10 }}>YOU</span>}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {parseInt(auction.top_bid).toLocaleString()} {auction.currency}</span>
            {!auction.is_official && <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>sent to inventory</span>}
          </div>
        </div>
      )}
      {isEnded && !auction.top_bidder_name && (
        <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'var(--text-muted)' }}>
          No bids — auction ended with no winner
        </div>
      )}

      {/* Body */}
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          {auction.item_name && (
            <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--panel-inner)', borderRadius: 'var(--radius)', flexShrink: 0 }}>
              <FurniImg name={auction.item_name} size={52} />
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Starting</div>
                <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <img src={CURRENCY_ICONS[auction.currency]} alt="" style={{ width: 12, height: 12 }} />
                  {parseInt(auction.start_bid).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Top bid</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <img src={CURRENCY_ICONS[auction.currency]} alt="" style={{ width: 13, height: 13 }} />
                  {auction.top_bid ? parseInt(auction.top_bid).toLocaleString() : '—'}
                </div>
              </div>
              {auction.top_bidder_name && !isEnded && (
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Leading</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${auction.top_bidder_look}&headonly=1&size=s`} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{auction.top_bidder_name}</span>
                    {auction.top_bidder_id === userId && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)' }}>YOU</span>}
                  </div>
                </div>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>By</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{auction.creator_name}</div>
              </div>
            </div>
            {auction.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{auction.description}</div>}
          </div>
        </div>

        {/* Bid input */}
        {!isEnded && !isOwner && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder={`Min: ${minBid.toLocaleString()}`}
              min={minBid}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button onClick={handleBid} disabled={loading} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Place Bid'}
            </button>
          </div>
        )}

        {msg && <div className={`flash flash-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 6, fontSize: 10, padding: '5px 8px' }}>{msg.text}</div>}

        <button onClick={handleExpand} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          {expanded ? '▲ Hide bids' : '▼ Show bid history'}
        </button>

        {expanded && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {bids.length === 0
              ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No bids yet.</div>
              : bids.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--panel-inner)', borderRadius: 6 }}>
                  <img src={`https://www.habbo.com/habbo-imaging/avatarimage?figure=${b.look}&headonly=1&size=s`} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{b.username}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                    <img src={CURRENCY_ICONS[auction.currency]} alt="" style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> {parseInt(b.amount).toLocaleString()}
                  </span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuctionClient({ userId, userRank, initialAuctions }) {
  const [auctions, setAuctions] = useState(initialAuctions || []);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateOfficial, setShowCreateOfficial] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const isMounted = useRef(true);

  // Form state — user auction
  const [uStep, setUStep] = useState(1); // 1=pick item, 2=configure
  const [uInvSearch, setUInvSearch] = useState('');
  const [uItem, setUItem] = useState('');
  const [uBid, setUBid] = useState('');
  const [uCurrency, setUCurrency] = useState('credits');
  const [uHours, setUHours] = useState('24');
  const [uDesc, setUDesc] = useState('');
  const [uLoading, setULoading] = useState(false);
  const [uMsg, setUMsg] = useState(null);

  // Form state — official auction
  const [oTitle, setOTitle] = useState('');
  const [oDesc, setODesc] = useState('');
  const [oBid, setOBid] = useState('');
  const [oCurrency, setOCurrency] = useState('credits');
  const [oEnd, setOEnd] = useState('');
  const [oItemName, setOItemName] = useState(''); // sprite base name
  const [oItemSearch, setOItemSearch] = useState('');
  const [oItemResults, setOItemResults] = useState([]);
  const [oItemLoading, setOItemLoading] = useState(false);
  const [oLoading, setOLoading] = useState(false);
  const [oMsg, setOMsg] = useState(null);
  const oSearchRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadAuctions = async () => {
    try {
      const res = await fetch('/api/auction?type=list');
      const data = await res.json();
      if (isMounted.current) setAuctions(data.auctions || []);
    } catch {}
  };

  useEffect(() => {
    const t = setInterval(loadAuctions, 5000);
    return () => clearInterval(t);
  }, []);

  const loadInventory = async () => {
    if (inventoryLoaded) return;
    try {
      const res = await fetch('/api/auction?type=inventory');
      const data = await res.json();
      setInventory(data.items || []);
      setInventoryLoaded(true);
    } catch {}
  };

  const searchOfficialItem = async (q) => {
    setOItemSearch(q);
    if (q.length < 2) { setOItemResults([]); return; }
    setOItemLoading(true);
    try {
      const res = await fetch(`/api/auction?type=search_items&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setOItemResults(data.items || []);
    } catch {}
    setOItemLoading(false);
  };

  const handleOpenUserCreate = () => {
    setShowCreateUser(s => !s);
    if (!showCreateUser) { loadInventory(); setUStep(1); setUItem(''); setUInvSearch(''); }
  };

  const handleCreateUserAuction = async () => {
    setULoading(true); setUMsg(null);
    try {
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_user', item_id: parseInt(uItem), start_bid: parseInt(uBid), currency: uCurrency, end_hours: parseInt(uHours), description: uDesc }),
      });
      const data = await res.json();
      if (data.ok) {
        setUMsg({ type: 'success', text: 'Auction created!' });
        setShowCreateUser(false);
        setUItem(''); setUBid(''); setUDesc(''); setUStep(1); setUInvSearch('');
        loadAuctions();
      } else {
        setUMsg({ type: 'error', text: data.error || 'Failed' });
      }
    } catch { setUMsg({ type: 'error', text: 'Connection error' }); }
    setULoading(false);
  };

  const handleCreateOfficialAuction = async () => {
    setOLoading(true); setOMsg(null);
    try {
      // datetime-local gives local time — convert to UTC for storage
      const endTimeUtc = oEnd ? new Date(oEnd).toISOString().slice(0, 19).replace('T', ' ') : '';
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_official', title: oTitle, description: oDesc, start_bid: parseInt(oBid), currency: oCurrency, end_time: endTimeUtc, item_name: oItemName || null }),
      });
      const data = await res.json();
      if (data.ok) {
        setOMsg({ type: 'success', text: 'Auction created!' });
        setShowCreateOfficial(false);
        setOTitle(''); setODesc(''); setOBid(''); setOEnd(''); setOItemName(''); setOItemSearch(''); setOItemResults([]);
        loadAuctions();
      } else {
        setOMsg({ type: 'error', text: data.error || 'Failed' });
      }
    } catch { setOMsg({ type: 'error', text: 'Connection error' }); }
    setOLoading(false);
  };

  const official = auctions.filter(a => a.is_official);
  const userAuctions = auctions.filter(a => !a.is_official);

  const infoPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/images/noti/auction_won_noti.png" alt="" style={{ width: 20, height: 20, imageRendering: 'pixelated' }} />
          <span style={{ fontWeight: 800, fontSize: 13 }}>How it works</span>
        </div>
        {[
          { icon: '/images/auction/auction_placebid_icon.png', title: 'Place a bid', desc: 'Beat the current top bid to take the lead. Each bid must be higher than the last.' },
          { icon: '/images/auction/auction_time_icon.png', title: 'Win at end time', desc: 'The highest bidder when the auction ends wins the item automatically.' },
          { icon: '/images/auction/auction_delivered_icon.png', title: 'Item delivery', desc: 'Won items are sent to your inventory. No action needed, it\'s automatic.' },
          { icon: '/images/auction/auction_paid_icon.png', title: 'Seller gets paid', desc: 'Winning bid amount is credited to the seller when the auction closes.' },
          { icon: '/images/auction/auction_nowinner_icon.png', title: 'No winner?', desc: 'If nobody bids, your item is returned to your inventory untouched.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}><img src={icon} ></img></span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel no-hover" style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10 }}>Official vs Player</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(52,189,89,0.08)', border: '1px solid rgba(52,189,89,0.2)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', marginBottom: 3 }}>OFFICIAL</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>Created by hotel staff. Win exclusive or rare items unavailable elsewhere.</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 3 }}>PLAYER</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>Listed by other players. Item is held in escrow until the auction ends.</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start' }}>
    <div>
      {/* Header actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={handleOpenUserCreate} className={showCreateUser ? 'btn btn-secondary' : 'btn btn-primary'}>
          {showCreateUser ? 'Cancel' : '+ List an Item'}
        </button>
        {userRank >= 4 && (
          <button onClick={() => setShowCreateOfficial(s => !s)} className={showCreateOfficial ? 'btn btn-secondary' : 'btn btn-secondary'}>
            {showCreateOfficial ? 'Cancel' : 'Create Official Auction'}
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', lineHeight: '36px' }}>Updates every 5s</div>
      </div>

      {/* Create user auction form */}
      {showCreateUser && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 20 }}>
          {uStep === 1 ? (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Select Item to Auction</h3>
              <div style={{ marginBottom: 12 }}>
                <input type="text" value={uInvSearch} onChange={e => setUInvSearch(e.target.value)} placeholder="Search your inventory..." />
              </div>
              {inventoryLoaded && inventory.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No items in your inventory.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                  {inventory
                    .filter(i => !uInvSearch || i.public_name.toLowerCase().includes(uInvSearch.toLowerCase()))
                    .map(i => (
                      <div key={i.id}
                        onClick={() => { setUItem(String(i.id)); setUStep(2); }}
                        style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', border: '2px solid transparent', transition: 'border-color .15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FurniImg name={i.item_name} size={56} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{i.public_name}</span>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <>
              {(() => {
                const sel = inventory.find(i => String(i.id) === String(uItem));
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '12px 14px', background: 'var(--panel-inner)', borderRadius: 'var(--radius)', border: '2px solid var(--green)' }}>
                    <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FurniImg name={sel?.item_name} size={52} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{sel?.public_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Selected item</div>
                    </div>
                    <button onClick={() => { setUItem(''); setUStep(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
                  </div>
                );
              })()}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Starting Bid *</label>
                  <input type="number" value={uBid} onChange={e => setUBid(e.target.value)} placeholder="e.g. 100" min={1} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Currency</label>
                  <select value={uCurrency} onChange={e => setUCurrency(e.target.value)}>
                    <option value="credits">Credits</option>
                    <option value="pixels">Duckets</option>
                    <option value="points">Diamonds</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Duration</label>
                  <select value={uHours} onChange={e => setUHours(e.target.value)}>
                    {[1,3,6,12,24,48,72].map(h => <option key={h} value={h}>{h < 24 ? `${h}h` : `${h/24}d`}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Description (optional)</label>
                  <input type="text" value={uDesc} onChange={e => setUDesc(e.target.value)} placeholder="Condition, trades, etc." />
                </div>
              </div>
              {uMsg && <div className={`flash flash-${uMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 10, fontSize: 11 }}>{uMsg.text}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>The item will be held until the auction ends. If no one bids, it will be returned to you.</div>
              <button onClick={handleCreateUserAuction} disabled={uLoading || !uBid} className="btn btn-primary">
                {uLoading ? 'Creating...' : 'Start Auction'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Create official auction form (staff) */}
      {showCreateOfficial && userRank >= 4 && (
        <div className="panel no-hover" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--green)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Create Official Auction</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Item Image (optional)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, position: 'relative' }} ref={oSearchRef}>
                <input
                  type="text"
                  value={oItemSearch}
                  onChange={e => searchOfficialItem(e.target.value)}
                  placeholder="Search items_base by name..."
                  style={{ width: '100%' }}
                />
                {oItemResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--panel-inner)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {oItemResults.map(item => (
                      <div key={item.id} onClick={() => { setOItemName(item.item_name); setOItemSearch(item.public_name); setOItemResults([]); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FurniImg name={item.item_name} size={28} />
                        </div>
                        <span style={{ fontSize: 12 }}>{item.public_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {oItemName && (
                <div style={{ width: 56, height: 56, background: 'var(--panel-inner)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                  <FurniImg name={oItemName} size={48} />
                  <button onClick={() => { setOItemName(''); setOItemSearch(''); }} style={{ position: 'absolute', top: -6, right: -6, background: '#EF5856', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Title *</label>
              <input type="text" value={oTitle} onChange={e => setOTitle(e.target.value)} placeholder="What is being auctioned?" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>End Date & Time *</label>
              <input type="datetime-local" value={oEnd} onChange={e => setOEnd(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Starting Bid *</label>
              <input type="number" value={oBid} onChange={e => setOBid(e.target.value)} placeholder="Min bid" min={1} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Currency</label>
              <select value={oCurrency} onChange={e => setOCurrency(e.target.value)}>
                <option value="credits">Credits</option>
                <option value="pixels">Duckets</option>
                <option value="points">Diamonds</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea value={oDesc} onChange={e => setODesc(e.target.value)} rows={2} placeholder="Describe what the winner will receive..." />
          </div>
          {oMsg && <div className={`flash flash-${oMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 10, fontSize: 11 }}>{oMsg.text}</div>}
          <button onClick={handleCreateOfficialAuction} disabled={oLoading || !oTitle || !oBid || !oEnd} className="btn btn-primary">
            {oLoading ? 'Creating...' : 'Create Auction'}
          </button>
        </div>
      )}

      {/* Official Auctions */}
      {official.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(52,189,89,0.15)', color: 'var(--green)' }}>OFFICIAL AUCTIONS</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(52,189,89,0.2)' }} />
          </div>
          <div className="auction-grid">
            {official.map(a => <AuctionCard key={a.id} auction={a} userId={userId} userRank={userRank} onBid={loadAuctions} />)}
          </div>
        </div>
      )}

      {/* User Auctions */}
      <div>
        {official.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Player Auctions</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}
        {userAuctions.length === 0 && official.length === 0 && (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No active auctions. Be the first to list an item!
          </div>
        )}
        {userAuctions.length === 0 && official.length > 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No player auctions yet.</div>
        )}
        <div className="auction-grid">
          {userAuctions.map(a => <AuctionCard key={a.id} auction={a} userId={userId} userRank={userRank} onBid={loadAuctions} />)}
        </div>
      </div>
    </div>
    {infoPanel}
    </div>
  );
}
