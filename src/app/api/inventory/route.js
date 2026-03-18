import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    // Arcturus stores inventory in `items` table
    // items.user_id = owner, items.room_id = 0 means in inventory (not placed in room)
    // items_base has the furniture definition (name, type, etc.)
    const items = await query(`
      SELECT 
        i.id AS item_id,
        i.item_id AS base_id,
        ib.item_name AS base_name,
        ib.public_name,
        ib.type,
        ib.width,
        ib.length,
        ib.stack_height,
        ib.interaction_type,
        i.extra_data,
        i.limited_data
      FROM items i
      JOIN items_base ib ON ib.id = i.item_id
      WHERE i.user_id = ? AND i.room_id = 0
      ORDER BY ib.public_name ASC
    `, [userId]);

    // Group by base item to show count
    const grouped = {};
    for (const item of items) {
      const key = item.base_id;
      if (!grouped[key]) {
        grouped[key] = {
          base_id: item.base_id,
          base_name: item.base_name,
          public_name: item.public_name || item.base_name,
          type: item.type,
          interaction_type: item.interaction_type,
          count: 0,
          items: [],
        };
      }
      grouped[key].count++;
      grouped[key].items.push({
        item_id: item.item_id,
        extra_data: item.extra_data,
        limited_data: item.limited_data,
      });
    }

    return NextResponse.json({
      ok: true,
      inventory: Object.values(grouped).sort((a, b) => a.public_name.localeCompare(b.public_name)),
      total: items.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
