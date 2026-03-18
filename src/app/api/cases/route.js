export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUserId, getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, sanitizeText, oneOf, checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

const FURNI_ICON_BASE = () => process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';

function enrichItem(i) {
  const base = FURNI_ICON_BASE();
  return {
    id: i.id, case_id: i.case_id,
    name: i.reward_type === 'furni' && i.furni_name ? i.furni_name : i.name,
    image: i.reward_type === 'furni' && i.furni_base_name ? `${base}${i.furni_base_name}_icon.png` : (i.image || ''),
    rarity: i.rarity, drop_chance: parseFloat(i.drop_chance),
    reward_type: i.reward_type, reward_amount: i.reward_amount || 0,
    reward_badge: i.reward_badge, reward_furni_base_id: i.reward_furni_base_id,
    furni_name: i.furni_name || null, furni_base_name: i.furni_base_name || null,
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const caseId = url.searchParams.get('id');

  if (caseId) {
    const caseData = await queryOne("SELECT * FROM cms_cases WHERE id = ? AND active = 1", [parseInt(caseId)]);
    if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const items = await query(`
      SELECT ci.*, ib.public_name AS furni_name, ib.item_name AS furni_base_name
      FROM cms_case_items ci LEFT JOIN items_base ib ON ib.id = ci.reward_furni_base_id
      WHERE ci.case_id = ? ORDER BY ci.drop_chance ASC
    `, [parseInt(caseId)]);
    return NextResponse.json({ caseData, items: items.map(enrichItem) });
  }

  const cases = await query("SELECT * FROM cms_cases WHERE active = 1 ORDER BY name");
  const allItems = await query(`
    SELECT ci.*, ib.public_name AS furni_name, ib.item_name AS furni_base_name
    FROM cms_case_items ci LEFT JOIN items_base ib ON ib.id = ci.reward_furni_base_id
    WHERE ci.case_id IN (SELECT id FROM cms_cases WHERE active = 1)
    ORDER BY ci.drop_chance ASC
  `);

  const byCase = {};
  for (const item of allItems) {
    if (!byCase[item.case_id]) byCase[item.case_id] = [];
    byCase[item.case_id].push(enrichItem(item));
  }

  return NextResponse.json({ cases: cases.map(c => ({ ...c, items: byCase[c.id] || [] })) });
}

export async function POST(request) {
  try {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { action } = body;

  // ── Open case ──
  if (action === 'open') {
    const rl = checkRateLimit(`case-open:${userId}`, 20, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast!' }, { status: 429 });

    const caseId = safeInt(body.caseId, 1);
    if (!caseId) return NextResponse.json({ error: 'Invalid case' }, { status: 400 });

    const caseData = await queryOne("SELECT * FROM cms_cases WHERE id = ? AND active = 1", [caseId]);
    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const deduct = await query('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?', [caseData.price, userId, caseData.price]);
    if (deduct.affectedRows === 0) return NextResponse.json({ error: 'Not enough diamonds' }, { status: 400 });

    const items = await query(`
      SELECT ci.*, ib.public_name AS furni_name, ib.item_name AS furni_base_name
      FROM cms_case_items ci LEFT JOIN items_base ib ON ib.id = ci.reward_furni_base_id
      WHERE ci.case_id = ? ORDER BY ci.drop_chance ASC
    `, [caseId]);

    if (items.length === 0) {
      await query('UPDATE users SET points = points + ? WHERE id = ?', [caseData.price, userId]);
      return NextResponse.json({ error: 'Case has no items' }, { status: 400 });
    }

    const totalWeight = items.reduce((s, i) => s + parseFloat(i.drop_chance), 0);
    const roll = (crypto.randomInt(0, 100000) / 100000) * totalWeight;
    let cumulative = 0, wonItem = items[items.length - 1];
    for (const item of items) {
      cumulative += parseFloat(item.drop_chance);
      if (roll <= cumulative) { wonItem = item; break; }
    }

    if (wonItem.reward_type === 'furni' && wonItem.reward_furni_base_id) {
      await query('INSERT INTO items (user_id, item_id, room_id, extra_data, limited_data) VALUES (?, ?, 0, ?, ?)',
        [userId, wonItem.reward_furni_base_id, '0', '0:0']);
    } else if (['credits','pixels','points'].includes(wonItem.reward_type) && wonItem.reward_amount > 0) {
      const col = { credits: 'credits', pixels: 'pixels', points: 'points' }[wonItem.reward_type];
      if (col) await query(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [wonItem.reward_amount, userId]);
    }
    if (wonItem.reward_badge) {
      await query('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?,?)', [userId, wonItem.reward_badge]);
    }

    const newBal = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ ok: true, items: items.map(enrichItem), won: enrichItem(wonItem), balance: newBal?.points || 0 });
  }

  // ── Search furniture (admin) ──
  if (action === 'search_furni') {
    const user = await getCurrentUser();
    if (!user || user.rank < 5) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const search = sanitizeText(body.search || '', 100);
    if (!search || search.length < 2) return NextResponse.json({ error: 'Min 2 chars' }, { status: 400 });
    const results = await query(`SELECT id, item_name, public_name, type FROM items_base WHERE public_name LIKE ? OR item_name LIKE ? ORDER BY public_name ASC`, [`%${search}%`, `%${search}%`]);
    const base = FURNI_ICON_BASE();
    return NextResponse.json({ ok: true, results: results.map(r => ({ base_id: r.id, item_name: r.item_name, public_name: r.public_name, type: r.type, icon: `${base}${r.item_name}_icon.png` })) });
  }

  // ── Save entire case + items in one batch (admin) ──
  if (action === 'save_case_full') {
    const user = await getCurrentUser();
    if (!user || user.rank < 5) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const caseName = sanitizeText(body.name || '', 100);
    const desc = sanitizeText(body.description || '', 500);
    const img = sanitizeText(body.image || '', 500);
    const priceVal = safeInt(body.price, 1, 1000000) || 50;
    const activeVal = body.active ? 1 : 0;
    const batchItems = body.items;
    const deleteIds = body.deleteItemIds || [];

    if (!caseName) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!Array.isArray(batchItems) || batchItems.length === 0) return NextResponse.json({ error: 'Add at least one item' }, { status: 400 });

    let caseId = body.caseId ? safeInt(body.caseId, 1) : null;

    // Create or update case
    if (caseId) {
      await query('UPDATE cms_cases SET name=?, description=?, image=?, price=?, active=? WHERE id=?',
        [caseName, desc, img, priceVal, activeVal, caseId]);
    } else {
      const res = await query('INSERT INTO cms_cases (name, description, image, price, active) VALUES (?,?,?,?,?)',
        [caseName, desc, img, priceVal, activeVal]);
      caseId = res.insertId;
    }

    if (!caseId) return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });

    // Delete removed items
    for (const delId of deleteIds) {
      const did = safeInt(delId, 1);
      if (did) await query('DELETE FROM cms_case_items WHERE id = ? AND case_id = ?', [did, caseId]);
    }

    // Upsert items
    for (const item of batchItems) {
      const iName = sanitizeText(item.name || '', 200);
      const iImage = sanitizeText(item.image || '', 500);
      const iRarity = oneOf(item.rarity, ['common','uncommon','rare','epic','legendary'], 'common');
      const iChance = Math.max(0.001, Math.min(100, parseFloat(item.drop_chance) || 10));
      const iType = oneOf(item.reward_type, ['credits','pixels','points','badge','furni'], 'credits');
      const iAmt = safeInt(item.reward_amount, 0, 10000000) || 0;
      const iBadge = sanitizeText(item.reward_badge || '', 50) || null;
      const iFurni = safeInt(item.reward_furni_base_id, 0) || null;

      if (item.dbId) {
        await query('UPDATE cms_case_items SET name=?,image=?,rarity=?,drop_chance=?,reward_type=?,reward_amount=?,reward_badge=?,reward_furni_base_id=? WHERE id=? AND case_id=?',
          [iName, iImage, iRarity, iChance, iType, iAmt, iBadge, iFurni, item.dbId, caseId]);
      } else {
        await query('INSERT INTO cms_case_items (case_id,name,image,rarity,drop_chance,reward_type,reward_amount,reward_badge,reward_furni_base_id) VALUES (?,?,?,?,?,?,?,?,?)',
          [caseId, iName, iImage, iRarity, iChance, iType, iAmt, iBadge, iFurni]);
      }
    }

    return NextResponse.json({ ok: true, caseId });
  }

  // ── Legacy individual admin actions ──
  const user = await getCurrentUser();
  if (!user || user.rank < 5) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if (action === 'delete_case') {
    const id = safeInt(body.id, 1);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    await query('DELETE FROM cms_case_items WHERE case_id=?', [id]);
    await query('DELETE FROM cms_cases WHERE id=?', [id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[/api/cases POST]', err);
    return NextResponse.json({ error: 'Server error: ' + (err?.message || 'Unknown') }, { status: 500 });
  }
}
