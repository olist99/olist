import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const itemName = searchParams.get('item_name');
  const baseId = searchParams.get('base_id');

  if (!itemName && !baseId) {
    return NextResponse.json({ error: 'Missing item_name or base_id' }, { status: 400 });
  }

  try {
    let where, params;
    if (baseId) {
      where = 'item_base_id = ?';
      params = [parseInt(baseId)];
    } else {
      where = 'item_name = ?';
      params = [itemName];
    }

    const history = await query(`
      SELECT price, currency, sold_at
      FROM cms_marketplace_price_history
      WHERE ${where}
      ORDER BY sold_at DESC
      LIMIT 30
    `, params);

    // Also get avg, min, max
    const stats = await query(`
      SELECT 
        AVG(price) AS avg_price,
        MIN(price) AS min_price,
        MAX(price) AS max_price,
        COUNT(*) AS total_sales
      FROM cms_marketplace_price_history
      WHERE ${where}
    `, params);

    return NextResponse.json({
      ok: true,
      history: history.reverse(), // oldest first for chart
      stats: stats[0] || { avg_price: 0, min_price: 0, max_price: 0, total_sales: 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
