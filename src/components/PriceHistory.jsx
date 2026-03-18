'use client';
import { useState, useEffect } from 'react';



export default function PriceHistory({ itemName, baseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = baseId ? `base_id=${baseId}` : `item_name=${encodeURIComponent(itemName)}`;
    fetch(`/api/marketplace/price-history?${params}`)
      .then(r => r.json())
      .then(d => { setData(d.ok ? d : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [itemName, baseId]);

  if (loading) return <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>Loading price history...</div>;
  if (!data || data.stats.total_sales === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No sales history yet for this item.</p>
      </div>
    );
  }

  const { history, stats } = data;
  const prices = history.map(h => h.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  // SVG chart
  const w = 400, h = 120, pad = 20;
  const chartW = w - pad * 2, chartH = h - pad * 2;
  const points = history.map((d, i) => {
    const x = pad + (i / Math.max(1, history.length - 1)) * chartW;
    const y = pad + chartH - ((d.price - minP) / range) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const trend = lastPrice > firstPrice ? 'up' : lastPrice < firstPrice ? 'down' : 'stable';
  const trendColor = trend === 'up' ? '#34bd59' : trend === 'down' ? '#EF5856' : '#f5a623';

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Average', val: Math.round(stats.avg_price), color: 'var(--text-secondary)' },
          { label: 'Lowest', val: stats.min_price, color: '#34bd59' },
          { label: 'Highest', val: stats.max_price, color: '#EF5856' },
          { label: 'Sales', val: stats.total_sales, color: 'var(--text-secondary)' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>
              {i < 3 ? Number(s.val).toLocaleString() : s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--panel-inner)', borderRadius: 'var(--radius)', padding: 12, position: 'relative' }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line key={i}
              x1={pad} y1={pad + chartH * (1 - pct)} x2={pad + chartW} y2={pad + chartH * (1 - pct)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}

          {/* Area fill */}
          {history.length > 1 && (
            <polygon
              points={`${pad},${pad + chartH} ${points} ${pad + chartW},${pad + chartH}`}
              fill={`url(#areaGrad)`} opacity="0.3" />
          )}

          {/* Line */}
          {history.length > 1 && (
            <polyline points={points} fill="none" stroke={trendColor} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots */}
          {history.map((d, i) => {
            const x = pad + (i / Math.max(1, history.length - 1)) * chartW;
            const y = pad + chartH - ((d.price - minP) / range) * chartH;
            return <circle key={i} cx={x} cy={y} r="3.5" fill={trendColor} stroke="var(--panel-bg)" strokeWidth="1.5" />;
          })}

          {/* Price labels at edges */}
          <text x={pad} y={pad - 4} fontSize="9" fill="var(--text-muted)" fontFamily="Montserrat">{maxP.toLocaleString()}</text>
          <text x={pad} y={pad + chartH + 14} fontSize="9" fill="var(--text-muted)" fontFamily="Montserrat">{minP.toLocaleString()}</text>

          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Trend indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: trendColor,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'}
            {trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            ({history.length} sale{history.length !== 1 ? 's' : ''} tracked)
          </span>
        </div>
      </div>
    </div>
  );
}
