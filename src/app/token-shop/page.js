import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatNumber } from '@/lib/utils';
import { isPluginEnabled } from '@/lib/plugins';
import TokenBuyModal from './TokenBuyModal';
import TokenPurchaseButton from './TokenPurchaseButton';
import TokenVoucherBox from './TokenVoucherBox';

export const metadata = { title: 'Token Shop' };

// Category display config — banner colour, label, icon
const CAT_CONFIG = {
  vip:      { label: 'VIP Rank',    icon: '', color: '#54e974', bg: 'rgba(35, 245, 98, 0.1)'  },
  diamonds: { label: 'Diamonds',    icon: '', color: '#54d2e9', bg: 'rgba(80, 235, 255, 0.1)'  },
  credits:  { label: 'Credits',     icon: '', color: '#bda434', bg: 'rgba(189, 157, 52, 0.1)'   },
  rares:    { label: 'Rare Packs',  icon: '', color: '#ff6a50', bg: 'rgba(255, 80, 80, 0.1)'  },
  general:  { label: 'General',     icon: '', color: '#cb54e9', bg: 'rgba(255, 255, 255, 0.05)' },
};

// Fixed display order for categories
const CAT_ORDER = ['vip', 'diamonds', 'credits', 'rares', 'general'];

export default async function TokenShopPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('token-shop')) redirect('/');

  const sp = await searchParams;
  const cat = sp?.cat || 'all';
  const msg = sp?.msg;
  const error = sp?.error;

  // Fetch items joined with any active flash sales
  const allItems = await query(`
    SELECT i.*,
      fs.discount_pct, fs.ends_at AS sale_ends_at
    FROM cms_token_shop_items i
    LEFT JOIN cms_flash_sales fs
      ON fs.item_id = i.id
      AND fs.active = 1
      AND fs.starts_at <= NOW()
      AND fs.ends_at > NOW()
    WHERE i.active = 1
    ORDER BY i.category, i.sort_order, i.id
  `).catch(() =>
    // Fallback if cms_flash_sales table doesn't exist yet
    query('SELECT * FROM cms_token_shop_items WHERE active = 1 ORDER BY category, sort_order, id').catch(() => [])
  );

  const packages = await query(
    'SELECT * FROM cms_token_packages WHERE active = 1 ORDER BY sort_order'
  ).catch(() => []);

  const tokenBalance = user.shop_tokens ?? 0;

  // Filter if a category tab is active, otherwise show all grouped
  const filtered = cat === 'all' ? allItems : allItems.filter(i => i.category === cat);

  // Group by category preserving CAT_ORDER
  const grouped = CAT_ORDER
    .map(key => ({ key, items: filtered.filter(i => i.category === key) }))
    .filter(g => g.items.length > 0);

  // Build unique category list for tabs
  const usedCats = CAT_ORDER.filter(k => allItems.some(i => i.category === k));

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="title-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="text-xl font-bold">
            Token Shop
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Buy tokens with crypto, then spend them on exclusive rewards
          </p>
        </div>
      </div>

      {msg   && <div className="flash flash-success" style={{ marginBottom: 16 }}>{decodeURIComponent(msg).replace(/[<>]/g, '')}</div>}
      {error && <div className="flash flash-error"   style={{ marginBottom: 16 }}>{decodeURIComponent(error).replace(/[<>]/g, '')}</div>}

      {/* Category tabs + Tokens */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="flex gap-2.5 flex-wrap">
          <a href="/token-shop?cat=all"
            className={`btn btn-sm no-underline ${cat === 'all' ? 'btn-primary' : 'btn-secondary'}`}>
            All Items
          </a>
          {usedCats.map(k => (
            <a key={k} href={`/token-shop?cat=${k}`}
              className={`btn btn-sm no-underline ${cat === k ? 'btn-primary' : 'btn-secondary'}`}>
              {CAT_CONFIG[k]?.icon} {CAT_CONFIG[k]?.label || k}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Token balance */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '8px 14px',
          }}>
            <span style={{ fontSize: 16 }}></span>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', float: 'right', fontWeight: 600 }}>YOUR TOKENS</div>
              <div style={{fontSize: 17, fontWeight: 800, color: 'var(--green)', lineHeight: 1, float: 'right', paddingRight: 4 }}>
                {formatNumber(tokenBalance)}
              </div>
            </div>
          </div>
          <TokenBuyModal packages={packages} />
        </div>
      </div>

      {/* Two-column layout: items | sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}
        className="max-md:grid-cols-1">

        {/* ── Left: grouped item list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(({ key, items }) => {
            const cfg = CAT_CONFIG[key] || { label: key, icon: '', color: '#aaa', bg: 'rgba(255,255,255,0.05)' };
            return (
              <div key={key}>
                {/* Category banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', marginBottom: 10,
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}33`,
                  borderLeft: `3px solid ${cfg.color}`,
                  borderRadius: 'var(--radius)',
                }}>
                  <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Items in this category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(item => (
                    <div key={item.id} className="card" style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: 14, position: 'relative',
                    }}>
                      {/* 100×100 image */}
                      <div style={{
                        width: 100, height: 100, flexShrink: 0,
                        borderRadius: 'var(--radius)',
                        background: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 38, overflow: 'hidden',
                        border: '1px solid var(--border)',
                      }}>
                        {item.image
                          ? <img src={item.image} alt={item.name}
                              style={{ width: 100, height: 100, objectFit: 'cover', display: 'block' }} />
                          : <span>{cfg.icon}</span>
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</span>
                          {item.stock === 0 && (
                            <span style={{ background: 'rgba(239,88,86,0.9)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>
                              SOLD OUT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {item.description}
                        </div>
                        {/* Reward pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.give_credits > 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(52,189,89,0.12)', color: 'var(--green)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                               {formatNumber(item.give_credits)} Credits
                            </span>
                          )}
                          {item.give_points > 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(80,160,255,0.12)', color: '#50a0ff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                               {formatNumber(item.give_points)} Diamonds
                            </span>
                          )}
                          {item.give_pixels > 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(95,227,94,0.12)', color: 'var(--green)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                               {formatNumber(item.give_pixels)} Duckets
                            </span>
                          )}
                          {item.give_rank > 0 && item.give_rank_days > 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(245,166,35,0.12)', color: '#f5a623', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                               VIP {item.give_rank_days} days
                            </span>
                          )}
                          {item.give_rank > 0 && item.give_rank_days === 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(245,166,35,0.12)', color: '#f5a623', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                               Rank {item.give_rank}
                            </span>
                          )}
                          {item.give_badge && (
                            <span style={{ fontSize: 10, background: 'rgba(180,80,255,0.12)', color: '#b450ff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                               Badge
                            </span>
                          )}
                          {item.stock > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 4px' }}>
                              Stock: {item.stock}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price + actions */}
                      {(() => {
                        const hasSale = item.discount_pct > 0;
                        const salePrice = hasSale
                          ? Math.floor(item.token_cost * (1 - item.discount_pct / 100))
                          : item.token_cost;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            {hasSale && (
                              <div style={{
                                background: '#EF5856', color: '#fff',
                                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                              }}>
                                 -{item.discount_pct}% SALE
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 14 }}><image src="/images/plus_token.png"></image></span>
                              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
                                {formatNumber(salePrice)}
                              </span>
                              {hasSale && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                  {formatNumber(item.token_cost)}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>tokens</span>
                            </div>
                            <TokenPurchaseButton
                              itemId={item.id}
                              itemName={item.name}
                              tokenCost={salePrice}
                              userTokens={tokenBalance}
                              disabled={item.stock === 0}
                              cat={cat}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {grouped.length === 0 && (
            <div className="card p-16 text-center text-text-muted">No items available.</div>
          )}
        </div>

        {/* ── Right: sticky sidebar (panel) ── */}
        <div className="panel" style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>

          <PolicyCard
            icon=""
            title="Payment & Donation Policy"
            items={[
              'All payments made to Habbo+ are considered voluntary donations.',
              'Donations help fund server infrastructure and development.',
              'All transactions are final and non-refundable.',
            ]}
          />
          <PolicyCard
            icon=""
            title="Activation"
            subtitle="Delivery and confirmation"
            items={[
              'Items are received after payment confirmation.',
              'Confirmation times vary by cryptocurrency (typically 3 confirmations).',
            ]}
          />
          <PolicyCard
            icon=""
            title="Support"
            subtitle="Get help with payments"
            items={[
              'For payment support, please join our Discord and create a ticket.',
              'Keep your transaction ID/hash for reference.',
            ]}
            footer={
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/habboplus'}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius)',
                  background: 'rgba(114,137,218,0.12)', border: '1px solid rgba(114,137,218,0.25)',
                  color: '#7289da', fontWeight: 700, fontSize: 11, textDecoration: 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                </svg>
                Join our Discord
              </a>
            }
          />

          {/* Accepted coins */}
          <div style={{
            padding: '12px 14px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Accepted Currencies
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[
                { sym: 'BTC',  color: '#f7931a', icon: '₿' },
                { sym: 'ETH',  color: '#627eea', icon: 'Ξ' },
                { sym: 'LTC',  color: '#bfbbbb', icon: 'Ł' },
                { sym: 'USDT', color: '#26a17b', icon: '₮' },
                { sym: 'DOGE', color: '#c2a633', icon: 'Ð' },
                { sym: 'SOL',  color: '#9945ff', icon: '◎' },
              ].map(c => (
                <span key={c.sym} style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 20,
                  padding: '2px 7px', fontSize: 9, fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ color: c.color }}>{c.icon}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.sym}</span>
                </span>
              ))}
              <span style={{ fontSize: 9, color: 'var(--text-muted)', alignSelf: 'center', fontStyle: 'italic' }}>+ 300 more</span>
            </div>
          </div>
        </div>
        <div className="panel" style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
            <TokenVoucherBox />
        </div>
      </div>
    </div>
  );
}

function PolicyCard({ icon, title, subtitle, items = [], footer }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {items.map((text, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)', marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{text}</span>
            </li>
          ))}
        </ul>
        {footer}
      </div>
    </div>
  );
}