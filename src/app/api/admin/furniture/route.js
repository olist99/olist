import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
import { logAdminAction, getRequestIP } from '@/lib/adminLog';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) return null;
  return user;
}

export async function GET(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'list';

  if (type === 'list') {
    const search = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, safeInt(url.searchParams.get('page'), 1) || 1);
    const offset = (page - 1) * 50;
    const where = search ? 'WHERE public_name LIKE ? OR item_name LIKE ?' : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];
    const furniture = await query(
      `SELECT id, item_name, public_name, width, length, stack_height, allow_stack, allow_sit, allow_lay, allow_walk, sprite_id, interaction_type, multiheight, type FROM items_base ${where} ORDER BY id DESC LIMIT 50 OFFSET ?`,
      [...params, offset]
    ).catch(() => []);
    const total = await query(`SELECT COUNT(*) AS c FROM items_base ${where}`, params).then(r => r[0]?.c || 0).catch(() => 0);
    return NextResponse.json({ furniture, total, page });
  }

  if (type === 'interactions') {
    // Return distinct interaction types for dropdown
    const types = await query('SELECT DISTINCT interaction_type FROM items_base ORDER BY interaction_type').catch(() => []);
    return NextResponse.json({ types: types.map(t => t.interaction_type) });
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

  if (action === 'add') {
    const itemName    = (body.item_name || '').replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 150);
    const publicName  = sanitizeText(body.public_name || '', 100);
    const type        = ['s', 'i', 'e', 'r'].includes(body.type) ? body.type : 's';
    const width       = Math.max(1, safeInt(body.width, 1) || 1);
    const length      = Math.max(1, safeInt(body.length, 1) || 1);
    const stackHeight = parseFloat(body.stack_height) || 1.0;
    const spriteId    = safeInt(body.sprite_id, 0) || 0;
    const allowStack  = body.allow_stack ? 1 : 0;
    const allowSit    = body.allow_sit ? 1 : 0;
    const allowLay    = body.allow_lay ? 1 : 0;
    const allowWalk   = body.allow_walk ? 1 : 0;
    const interType   = sanitizeText(body.interaction_type || 'default', 50);
    const interModes  = safeInt(body.interaction_modes_count, 1) || 1;
    const multiheight = (body.multiheight || '').replace(/[^0-9,\.]/g, '').slice(0, 200) || '0';

    if (!itemName || !publicName) return NextResponse.json({ error: 'Item name and public name required' }, { status: 400 });

    // Check duplicate
    const exists = await queryOne('SELECT id FROM items_base WHERE item_name = ?', [itemName]).catch(() => null);
    if (exists) return NextResponse.json({ error: `item_name "${itemName}" already exists (ID: ${exists.id})` }, { status: 400 });

    const res = await query(
      `INSERT INTO items_base (item_name, public_name, width, length, stack_height, allow_stack, allow_sit, allow_lay, allow_walk, sprite_id, interaction_type, interaction_modes_count, multiheight, type, vending_ids, clothing_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      [itemName, publicName, width, length, stackHeight, allowStack, allowSit, allowLay, allowWalk, spriteId, interType, interModes, multiheight, type]
    );
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'furniture_add', targetType: 'items_base', targetId: res.insertId, details: `${itemName} (${publicName})`, ip });
    return NextResponse.json({ ok: true, id: res.insertId });
  }

  if (action === 'update') {
    const id         = safeInt(body.id, 1);
    const publicName = sanitizeText(body.public_name || '', 100);
    const width      = Math.max(1, safeInt(body.width, 1) || 1);
    const length     = Math.max(1, safeInt(body.length, 1) || 1);
    const stackHeight= parseFloat(body.stack_height) || 1.0;
    const allowStack = body.allow_stack ? 1 : 0;
    const allowSit   = body.allow_sit ? 1 : 0;
    const allowLay   = body.allow_lay ? 1 : 0;
    const allowWalk  = body.allow_walk ? 1 : 0;
    const interType  = sanitizeText(body.interaction_type || 'default', 50);
    const interModes = safeInt(body.interaction_modes_count, 1) || 1;
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    await query(
      'UPDATE items_base SET public_name=?, width=?, length=?, stack_height=?, allow_stack=?, allow_sit=?, allow_lay=?, allow_walk=?, interaction_type=?, interaction_modes_count=? WHERE id=?',
      [publicName, width, length, stackHeight, allowStack, allowSit, allowLay, allowWalk, interType, interModes, id]
    );
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'furniture_update', targetType: 'items_base', targetId: id, details: publicName, ip });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
