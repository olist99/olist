export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
import { logAdminAction, getRequestIP } from '@/lib/adminLog';

async function requireAdmin(minRank = 4) {
  const user = await getCurrentUser();
  if (!user || user.rank < minRank) return null;
  return user;
}

export async function GET(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'pages';

  if (type === 'pages') {
    const pages = await query(`
      SELECT id, parent_id, caption, icon_color, icon_image, visible, enabled, min_rank, order_num
      FROM catalog_pages
      ORDER BY parent_id ASC, order_num ASC
    `).catch(() => []);
    return NextResponse.json({ pages });
  }

  if (type === 'items') {
    const pageId = safeInt(url.searchParams.get('page_id'), 0);
    let items = [];
    let queryError = null;
    const itemsQuery = (ducketsAlias) => `
      SELECT ci.id, ci.page_id, ci.catalog_name, ci.item_ids, ci.cost_credits, ${ducketsAlias}, ci.cost_points,
             ci.amount, ci.limited_sells, ci.limited_stack, ci.have_offer,
             ib.item_name, ib.public_name
      FROM catalog_items ci
      LEFT JOIN items_base ib ON ib.sprite_id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(ci.item_ids, ',', 1), '*', 1) AS UNSIGNED)
      WHERE ci.page_id = ?
      ORDER BY ci.id ASC
    `;
    try {
      items = await query(itemsQuery('ci.cost_pixels'), [pageId]);
    } catch (err) {
      if (/cost_pixels/i.test(err?.message || '')) {
        try {
          items = await query(itemsQuery('ci.cost_duckets AS cost_pixels'), [pageId]);
        } catch (err2) {
          if (/cost_duckets/i.test(err2?.message || '')) {
            // No ducket column at all — return 0 for duckets
            try {
              items = await query(itemsQuery('0 AS cost_pixels'), [pageId]);
            } catch (err3) {
              queryError = err3?.message || String(err3);
            }
          } else {
            queryError = err2?.message || String(err2);
          }
        }
      } else {
        queryError = err?.message || String(err);
      }
    }
    return NextResponse.json({ items, error: queryError });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;
  const ip = getRequestIP(request);

  // ── Update catalog page ──
  if (action === 'update_page') {
    const id = safeInt(body.id, 1);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const caption = sanitizeText(body.caption || '', 100);
    const iconColor = sanitizeText(body.icon_color || '', 20);
    const iconImage = sanitizeText(body.icon_image || '', 100);
    const visible = body.visible ? 1 : 0;
    const enabled = body.enabled ? 1 : 0;
    const minRank = safeInt(body.min_rank, 0) || 0;
    const orderNum = safeInt(body.order_num, 0) || 0;
    await query(
      'UPDATE catalog_pages SET caption=?, icon_color=?, icon_image=?, visible=?, enabled=?, min_rank=?, order_num=? WHERE id=?',
      [caption, iconColor, iconImage, visible, enabled, minRank, orderNum, id]
    );
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'catalog_update_page', targetType: 'catalog_page', targetId: id, details: caption, ip });
    return NextResponse.json({ ok: true });
  }

  // ── Create catalog page ──
  if (action === 'create_page') {
    const parentId = safeInt(body.parent_id, 0) || -1;
    const caption = sanitizeText(body.caption || 'New Page', 100);
    const res = await query(
      'INSERT INTO catalog_pages (parent_id, caption, icon_color, icon_image, visible, enabled, min_rank, order_num, page_layout, page_headline, page_teaser, page_special, page_text1, page_text2, page_text_details, page_text_teaser, page_link, vip_only) VALUES (?,?,?,?,1,1,1,0,?,?,?,?,?,?,?,?,?,0)',
      [parentId, caption, 'catalog_sales', 'catalogue_icon_1', 'default_3x3', '', '', '', '', '', '', '', '']
    );
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'catalog_create_page', targetType: 'catalog_page', targetId: res.insertId, details: caption, ip });
    return NextResponse.json({ ok: true, id: res.insertId });
  }

  // ── Update catalog item ──
  if (action === 'update_item') {
    const id = safeInt(body.id, 1);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const costCredits = safeInt(body.cost_credits, 0) || 0;
    const costPixels  = safeInt(body.cost_pixels,  0) || 0;
    const costPoints  = safeInt(body.cost_points,  0) || 0;
    const amount      = safeInt(body.amount, 1) || 1;
    const offerActive = body.have_offer ? 1 : 0;
    try {
      await query(
        'UPDATE catalog_items SET cost_credits=?, cost_pixels=?, cost_points=?, amount=?, have_offer=? WHERE id=?',
        [costCredits, costPixels, costPoints, amount, offerActive, id]
      );
    } catch (e) {
      if (/cost_pixels/i.test(e?.message || '')) {
        await query(
          'UPDATE catalog_items SET cost_credits=?, cost_duckets=?, cost_points=?, amount=?, have_offer=? WHERE id=?',
          [costCredits, costPixels, costPoints, amount, offerActive, id]
        );
      } else throw e;
    }
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'catalog_update_item', targetType: 'catalog_item', targetId: id, details: `credits:${costCredits} pixels:${costPixels} points:${costPoints}`, ip });
    return NextResponse.json({ ok: true });
  }

  // ── Move item to different page ──
  if (action === 'move_item') {
    const id = safeInt(body.id, 1);
    const pageId = safeInt(body.page_id, 1);
    if (!id || !pageId) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    await query('UPDATE catalog_items SET page_id=? WHERE id=?', [pageId, id]);
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'catalog_move_item', targetType: 'catalog_item', targetId: id, details: `moved to page ${pageId}`, ip });
    return NextResponse.json({ ok: true });
  }

  // ── Add item to catalog ──
  if (action === 'add_item') {
    const pageId = safeInt(body.page_id, 1);
    const itemIds = (body.item_ids || '').trim();
    const catalogName = sanitizeText(body.catalog_name || '', 100);
    const costCredits = safeInt(body.cost_credits, 0) || 0;
    const costPixels  = safeInt(body.cost_pixels,  0) || 0;
    const costPoints  = safeInt(body.cost_points,  0) || 0;
    const amount      = safeInt(body.amount, 1) || 1;
    if (!pageId || !itemIds || !catalogName) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    let res;
    try {
      res = await query(
        'INSERT INTO catalog_items (page_id, item_ids, catalog_name, cost_credits, cost_pixels, cost_points, amount, limited_sells, limited_stack, have_offer) VALUES (?,?,?,?,?,?,?,0,0,1)',
        [pageId, itemIds, catalogName, costCredits, costPixels, costPoints, amount]
      );
    } catch (e) {
      if (/cost_pixels/i.test(e?.message || '')) {
        res = await query(
          'INSERT INTO catalog_items (page_id, item_ids, catalog_name, cost_credits, cost_duckets, cost_points, amount, limited_sells, limited_stack, have_offer) VALUES (?,?,?,?,?,?,?,0,0,1)',
          [pageId, itemIds, catalogName, costCredits, costPixels, costPoints, amount]
        );
      } else throw e;
    }
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'catalog_add_item', targetType: 'catalog_item', targetId: res.insertId, details: `${catalogName} to page ${pageId}`, ip });
    return NextResponse.json({ ok: true, id: res.insertId });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
