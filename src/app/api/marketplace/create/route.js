export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, sanitizeText, checkRateLimit } from '@/lib/security';

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Rate limit: 10 listings per 5 minutes
  const rl = checkRateLimit(`market-create:${userId}`, 10, 300000);
  if (!rl.ok) return NextResponse.json({ error: `Too many listings. Try again in ${rl.retryAfter}s` }, { status: 429 });

  let form;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const itemId = safeInt(form.get('item_id'), 1);
  const baseId = safeInt(form.get('base_id'), 1);
  const baseName = sanitizeText(form.get('base_name') || '', 100);
  const publicName = sanitizeText(form.get('public_name') || '', 200);
  const price = safeInt(form.get('price'), 1, 100000000);

  if (!itemId || !baseId || !publicName || !price) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  const rawCurrency = form.get('currency') || 'points';
  const currency = ['credits', 'points'].includes(rawCurrency) ? rawCurrency : 'points';

  try {
    // Verify item belongs to user, is in inventory (room_id = 0), NOT already listed
    const item = await queryOne(
      `SELECT i.id, i.item_id, i.user_id, i.room_id, ib.public_name, ib.item_name, ib.type
       FROM items i
       JOIN items_base ib ON ib.id = i.item_id
       WHERE i.id = ? AND i.user_id = ? AND i.room_id = 0`,
      [itemId, userId]
    );

    if (!item) {
      return NextResponse.json({ error: 'Item not found in your inventory or already listed.' }, { status: 400 });
    }

    // Prevent double-listing: check if item is already on marketplace
    const existingListing = await queryOne(
      "SELECT id FROM cms_marketplace WHERE item_id = ? AND status = 'active'",
      [itemId]
    );
    if (existingListing) {
      return NextResponse.json({ error: 'This item is already listed on the marketplace.' }, { status: 400 });
    }

    const renderBase = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '');
    const furniUrl = `${renderBase}${safeBaseName}_icon.png`;

    await query(
      `INSERT INTO cms_marketplace (seller_id, title, description, item_name, item_image, item_id, item_base_id, price, currency, category, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId,
        sanitizeText(`Selling ${item.public_name}`, 200),
        sanitizeText(`${item.public_name} — listed from inventory.`, 500),
        sanitizeText(item.public_name, 200),
        furniUrl,
        itemId,
        baseId,
        price,
        currency,
        item.type === 's' ? 'Floor Items' : item.type === 'i' ? 'Wall Items' : 'Furni',
      ]
    );

    await query('UPDATE items SET room_id = -1 WHERE id = ? AND user_id = ?', [itemId, userId]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Marketplace create error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
