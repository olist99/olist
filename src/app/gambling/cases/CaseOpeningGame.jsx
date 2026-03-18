'use client';
import { useState, useEffect, useRef } from 'react';

const RARITY_COLORS = { common: '#8b949e', uncommon: '#4ade80', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
const CURRENCY_ICONS = { credits: '/images/coin.png', pixels: '/images/ducket.png', points: '/images/diamond.png' };

export default function CaseOpeningGame({ diamonds }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [balance, setBalance] = useState(diamonds);
  const [spinning, setSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState([]);
  const [wonItem, setWonItem] = useState(null);
  const [offset, setOffset] = useState(0);
  const [showContents, setShowContents] = useState(false);

  useEffect(() => { fetch('/api/cases').then(r => r.json()).then(d => setCases(d.cases || [])).catch(() => {}); }, []);

  const openCase = async () => {
    if (spinning || !selectedCase || balance < selectedCase.price) return;
    setSpinning(true); setWonItem(null); setShowContents(false);
    setBalance(prev => prev - selectedCase.price);

    const res = await fetch('/api/cases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open', caseId: selectedCase.id }),
    });
    const data = await res.json();
    if (!data.ok) { setSpinning(false); alert(data.error); return; }

    const items = data.items;
    const strip = [];
    for (let i = 0; i < 45; i++) strip.push(items[Math.floor(Math.random() * items.length)]);
    strip[35] = data.won;
    setSpinItems(strip);

    const itemWidth = 120; // item (116px) + gap (4px)
    // paddingLeft:'50%' puts item 0's LEFT edge at the viewport center (where the line is).
    // To get item 35's CENTER under the line: move 35 full items + half item width.
    const targetOffset = (35 * itemWidth) + (116 / 2);
    setOffset(0);

    requestAnimationFrame(() => { requestAnimationFrame(() => { setOffset(targetOffset); }); });
    setTimeout(() => { setWonItem(data.won); setBalance(data.balance); setSpinning(false); }, 4500);
  };

  const selectCase = (c) => {
    setSelectedCase(c);
    setWonItem(null); setSpinItems([]); setOffset(0); setShowContents(false);
  };

  // Sort items: rarest first
  const sortedItems = (items) => [...items].sort((a, b) => {
    const ai = RARITY_ORDER.indexOf(a.rarity);
    const bi = RARITY_ORDER.indexOf(b.rarity);
    return ai - bi || a.drop_chance - b.drop_chance;
  });

  return (
    <div>
      {/* Header bar */}
      <div className="panel no-hover" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}><img style={{ display: 'inline-block', marginRight: '10px', marginLeft: '-5px' }} src="/images/gambling/case_icon.png"></img>Case Opening</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
          <img src="/images/diamond.png" alt="" className="icon-inline" style={{ marginRight: 4 }} />{balance.toLocaleString()}
        </div>
      </div>

      {!selectedCase ? (
        /* ── Case grid ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {cases.map(c => (
            <div key={c.id} className="panel" onClick={() => selectCase(c)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
              {c.image && <div style={{ textAlign: "center",
      padding: "16px 16px 10px",
      background: "url(/images/Floor_StartroomWhite.png) 22px 30px" }}><img src={c.image} alt="" style={{ maxHeight: 80, imageRendering: 'pixelated', margin: '0px auto' }} /></div>}
              <div style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{c.name}</div>
                {c.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{c.description}</div>}
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
                  <img src="/images/diamond.png" alt="" className="icon-inline" /> {c.price}
                </div>
                {/* Item preview strip */}
                {c.items && c.items.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {sortedItems(c.items).slice(0, 6).map((item, i) => (
                      <div key={i} style={{ width: 32, height: 32, borderRadius: 4, background: `${RARITY_COLORS[item.rarity]}22`, border: `1px solid ${RARITY_COLORS[item.rarity]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} title={`${item.name} (${item.drop_chance}%)`}>
                        {item.image ? <img src={item.image} alt="" style={{ maxWidth: 28, maxHeight: 28, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} /> : CURRENCY_ICONS[item.reward_type] ? <img src={CURRENCY_ICONS[item.reward_type]} alt="" style={{ width: 20, height: 20, imageRendering: 'pixelated' }} /> : <span style={{ fontSize: 8, color: RARITY_COLORS[item.rarity] }}>?</span>}
                      </div>
                    ))}
                    {c.items.length > 6 && <div style={{ width: 32, height: 32, borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>+{c.items.length - 6}</div>}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>{c.items?.length || 0} items</div>
              </div>
            </div>
          ))}
          {cases.length === 0 && <div className="panel no-hover" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>No cases available.</div>}
        </div>
      ) : (
        <div>
          <button onClick={() => { setSelectedCase(null); setWonItem(null); setSpinItems([]); setOffset(0); }}
            style={{ marginBottom: 16, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
            ← Back to cases
          </button>

          {/* ── Spinner ── */}
          <div className="panel no-hover" style={{ padding: 24, marginBottom: 20, overflow: 'hidden', position: 'relative' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>{selectedCase.name}</h2>

            <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', width: 2, height: 110, background: 'var(--green)', zIndex: 10, boxShadow: '0 0 10px var(--green)' }} />

            <div style={{ overflow: 'hidden', position: 'relative', height: 110, margin: '0 -24px' }}>
              <div style={{
                display: 'flex', gap: 4,
                transform: `translateX(-${offset}px)`,
                transition: offset > 0 ? 'transform 4s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none',
                paddingLeft: '50%',
              }}>
                {spinItems.map((item, i) => (
                  <div key={i} style={{
                    width: 116, height: 100, flexShrink: 0, borderRadius: 8,
                    background: 'var(--panel-inner)', border: `2px solid ${RARITY_COLORS[item.rarity] || '#555'}44`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {item.image ? <img src={item.image} alt="" style={{ maxHeight: 40, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} /> : CURRENCY_ICONS[item.reward_type] ? <img src={CURRENCY_ICONS[item.reward_type]} alt="" style={{ width: 32, height: 32, imageRendering: 'pixelated' }} /> : <div style={{ width: 40, height: 40, borderRadius: 4, background: `${RARITY_COLORS[item.rarity]}22` }} />}
                    <div style={{ fontSize: 9, fontWeight: 700, color: RARITY_COLORS[item.rarity], textTransform: 'uppercase' }}>{item.rarity}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{item.name}</div>
                    {item.reward_amount > 0 && item.reward_type !== 'furni' && (
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)' }}>+{item.reward_amount.toLocaleString()}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Win result */}
            {wonItem && (
              <div style={{
                marginTop: 20, padding: 20, borderRadius: 'var(--radius)', textAlign: 'center',
                background: `${RARITY_COLORS[wonItem.rarity]}15`, border: `2px solid ${RARITY_COLORS[wonItem.rarity]}44`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: RARITY_COLORS[wonItem.rarity], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{wonItem.rarity}</div>
                {wonItem.image && <img src={wonItem.image} alt="" style={{ maxHeight: 48, imageRendering: 'pixelated', margin: '0 auto 8px', display: 'block' }} onError={e => e.target.style.display='none'} />}
                <div style={{ fontSize: 18, fontWeight: 800 }}>{wonItem.name}</div>
                {wonItem.reward_type === 'furni' && wonItem.reward_furni && (
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>Furniture added to your inventory!</div>
                )}
                {wonItem.reward_amount > 0 && wonItem.reward_type !== 'furni' && (
                  <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 6 }}>+{wonItem.reward_amount.toLocaleString()} {wonItem.reward_type}</div>
                )}
                {wonItem.reward_badge && <div style={{ fontSize: 12, color: '#f5a623', marginTop: 4 }}>Badge: {wonItem.reward_badge}</div>}
              </div>
            )}
          </div>

          {/* Open button */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button onClick={openCase} disabled={spinning || balance < selectedCase.price} className="btn-enterhotel"
              style={{ fontSize: 15, padding: '14px 40px', opacity: spinning ? 0.5 : 1 }}>
              {spinning ? 'Opening...' : `Open for ${selectedCase.price} Diamonds`}
            </button>
          </div>

          {/* ── Case Contents ── */}
          <div className="panel no-hover" style={{ padding: 20 }}>
            <button onClick={() => setShowContents(!showContents)} style={{
              width: '100%', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Case Contents ({selectedCase.items?.length || 0} items)</span>
              <span style={{ fontSize: 18, lineHeight: 1, transform: showContents ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {showContents && selectedCase.items && selectedCase.items.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {/* Rarity legend */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {RARITY_ORDER.filter(r => selectedCase.items.some(i => i.rarity === r)).map(r => (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: RARITY_COLORS[r] }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: RARITY_COLORS[r], textTransform: 'capitalize' }}>{r}</span>
                    </div>
                  ))}
                </div>

                {/* Items grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {sortedItems(selectedCase.items).map(item => {
                    const totalChance = selectedCase.items.reduce((s, i) => s + i.drop_chance, 0);
                    const pct = ((item.drop_chance / totalChance) * 100).toFixed(2);
                    return (
                      <div key={item.id} style={{
                        padding: 12, borderRadius: 'var(--radius)',
                        background: `${RARITY_COLORS[item.rarity]}08`,
                        border: `1px solid ${RARITY_COLORS[item.rarity]}33`,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                          background: `${RARITY_COLORS[item.rarity]}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {item.image ? <img src={item.image} alt="" style={{ maxWidth: 38, maxHeight: 38, imageRendering: 'pixelated' }} onError={e => e.target.style.display='none'} /> : CURRENCY_ICONS[item.reward_type] ? <img src={CURRENCY_ICONS[item.reward_type]} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} /> : <span style={{ fontSize: 16, color: RARITY_COLORS[item.rarity] }}>?</span>}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}{item.reward_amount > 0 && item.reward_type !== 'furni' ? ` +${item.reward_amount.toLocaleString()}` : ''}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: RARITY_COLORS[item.rarity], textTransform: 'uppercase' }}>{item.rarity}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct}%</span>
                          </div>
                          {/* Drop chance bar */}
                          <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: RARITY_COLORS[item.rarity], borderRadius: 2 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {showContents && (!selectedCase.items || selectedCase.items.length === 0) && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20, marginTop: 12 }}>This case has no items configured.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
