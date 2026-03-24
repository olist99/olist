import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
import { logAdminAction, getRequestIP } from '@/lib/adminLog';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const CATALOG_PAGE_ID = 952;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) return null;
  return user;
}

async function saveFile(buffer, filename, subdir) {
  const publicDir = path.join(process.cwd(), 'public', subdir);
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, filename), buffer);
}

export async function GET(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const url  = new URL(request.url);
  const type = url.searchParams.get('type') || 'list';

  if (type === 'list') {
    const search = (url.searchParams.get('q') || '').trim();
    const page   = Math.max(1, safeInt(url.searchParams.get('page'), 1) || 1);
    const offset = (page - 1) * 50;
    const where  = search ? 'WHERE public_name LIKE ? OR item_name LIKE ?' : '';
    const params = search ? ['%' + search + '%', '%' + search + '%'] : [];
    const furniture = await query(
      'SELECT id, item_name, public_name, width, length, stack_height, allow_stack, allow_sit, allow_lay, allow_walk, sprite_id, interaction_type, multiheight, type FROM items_base ' + where + ' ORDER BY id DESC LIMIT 50 OFFSET ?',
      [...params, offset]
    ).catch(() => []);
    const total = await query('SELECT COUNT(*) AS c FROM items_base ' + where, params).then(r => r[0]?.c || 0).catch(() => 0);
    return NextResponse.json({ furniture, total, page });
  }

  if (type === 'interactions') {
    const types = await query('SELECT DISTINCT interaction_type FROM items_base ORDER BY interaction_type').catch(() => []);
    return NextResponse.json({ types: types.map(t => t.interaction_type) });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const ip = getRequestIP(request);

  const contentType = request.headers.get('content-type') || '';

  // ── Multipart — file uploads ──────────────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const fd     = await request.formData();
    const action = fd.get('action');

    if (action === 'add_with_files') {
      const itemName    = (fd.get('item_name') || '').replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 150);
      const publicName  = sanitizeText(fd.get('public_name') || '', 100);
      const type        = ['s','i','e','r'].includes(fd.get('type')) ? fd.get('type') : 's';
      const width       = Math.max(1, parseInt(fd.get('width'))  || 1);
      const length      = Math.max(1, parseInt(fd.get('length')) || 1);
      const stackHeight = parseFloat(fd.get('stack_height')) || 1.0;
      const spriteId    = parseInt(fd.get('sprite_id')) || 0;
      const allowStack  = fd.get('allow_stack') === '1' ? 1 : 0;
      const allowSit    = fd.get('allow_sit')   === '1' ? 1 : 0;
      const allowLay    = fd.get('allow_lay')   === '1' ? 1 : 0;
      const allowWalk   = fd.get('allow_walk')  === '1' ? 1 : 0;
      const interType   = sanitizeText(fd.get('interaction_type') || 'default', 50);
      const interModes  = parseInt(fd.get('interaction_modes_count')) || 1;
      const multiheight = (fd.get('multiheight') || '').replace(/[^0-9,.]/g, '').slice(0, 200) || '0';
      const costCredits = parseInt(fd.get('cost_credits')) || 0;
      const costPixels  = parseInt(fd.get('cost_pixels'))  || 0;
      const costPoints  = parseInt(fd.get('cost_points'))  || 0;
      const addToCatalog= fd.get('add_to_catalog') === '1';

      if (!itemName || !publicName) return NextResponse.json({ error: 'Item name and public name are required' }, { status: 400 });

      const exists = await queryOne('SELECT id FROM items_base WHERE item_name = ?', [itemName]).catch(() => null);
      if (exists) return NextResponse.json({ error: 'item_name "' + itemName + '" already exists (ID: ' + exists.id + ')' }, { status: 400 });

      // Save .nitro file → public/swf/dcr/hof_furni/<itemName>/<itemName>.nitro
      const nitroFile = fd.get('nitro_file');
      if (nitroFile && nitroFile.size > 0) {
        const buf = Buffer.from(await nitroFile.arrayBuffer());
        await saveFile(buf, itemName + '.nitro', 'swf/dcr/hof_furni/' + itemName).catch(() => {});
      }

      // Save icon → public/swf/dcr/hof_furni/icons/<itemName>_icon.<ext>
      const iconFile = fd.get('icon_file');
      if (iconFile && iconFile.size > 0) {
        const buf     = Buffer.from(await iconFile.arrayBuffer());
        const ext     = (iconFile.name || 'png').split('.').pop().replace(/[^a-z0-9]/gi, '') || 'png';
        await saveFile(buf, itemName + '_icon.' + ext, 'swf/dcr/hof_furni/icons').catch(() => {});
      }

      // Insert items_base
      const res = await query(
        "INSERT INTO items_base (item_name, public_name, width, length, stack_height, allow_stack, allow_sit, allow_lay, allow_walk, sprite_id, interaction_type, interaction_modes_count, multiheight, type, vending_ids, clothing_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'',0)",
        [itemName, publicName, width, length, stackHeight, allowStack, allowSit, allowLay, allowWalk, spriteId, interType, interModes, multiheight, type]
      );
      const newId = res.insertId;

      // Insert catalog_items at page 952
      if (addToCatalog) {
        const itemIdStr = String(spriteId || newId);
        try {
          await query(
            'INSERT INTO catalog_items (page_id, item_ids, catalog_name, cost_credits, cost_pixels, cost_points, amount, limited_sells, limited_stack, have_offer) VALUES (?,?,?,?,?,?,1,0,0,1)',
            [CATALOG_PAGE_ID, itemIdStr, publicName, costCredits, costPixels, costPoints]
          );
        } catch (e) {
          if (/cost_pixels/i.test(e?.message || '')) {
            await query(
              'INSERT INTO catalog_items (page_id, item_ids, catalog_name, cost_credits, cost_duckets, cost_points, amount, limited_sells, limited_stack, have_offer) VALUES (?,?,?,?,?,?,1,0,0,1)',
              [CATALOG_PAGE_ID, itemIdStr, publicName, costCredits, costPixels, costPoints]
            ).catch(() => {});
          }
        }
      }

      await logAdminAction({ adminId: user.id, adminName: user.username, action: 'furniture_add', targetType: 'items_base', targetId: newId, details: itemName + ' (' + publicName + ')', ip });
      return NextResponse.json({ ok: true, id: newId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // ── JSON body ─────────────────────────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { action } = body;

  if (action === 'add') {
    const itemName    = (body.item_name || '').replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 150);
    const publicName  = sanitizeText(body.public_name || '', 100);
    const type        = ['s','i','e','r'].includes(body.type) ? body.type : 's';
    const width       = Math.max(1, safeInt(body.width, 1) || 1);
    const length      = Math.max(1, safeInt(body.length, 1) || 1);
    const stackHeight = parseFloat(body.stack_height) || 1.0;
    const spriteId    = safeInt(body.sprite_id, 0) || 0;
    const allowStack  = body.allow_stack ? 1 : 0;
    const allowSit    = body.allow_sit   ? 1 : 0;
    const allowLay    = body.allow_lay   ? 1 : 0;
    const allowWalk   = body.allow_walk  ? 1 : 0;
    const interType   = sanitizeText(body.interaction_type || 'default', 50);
    const interModes  = safeInt(body.interaction_modes_count, 1) || 1;
    const multiheight = (body.multiheight || '').replace(/[^0-9,.]/g, '').slice(0, 200) || '0';

    if (!itemName || !publicName) return NextResponse.json({ error: 'Item name and public name required' }, { status: 400 });
    const exists = await queryOne('SELECT id FROM items_base WHERE item_name = ?', [itemName]).catch(() => null);
    if (exists) return NextResponse.json({ error: 'item_name "' + itemName + '" already exists (ID: ' + exists.id + ')' }, { status: 400 });

    const res = await query(
      "INSERT INTO items_base (item_name, public_name, width, length, stack_height, allow_stack, allow_sit, allow_lay, allow_walk, sprite_id, interaction_type, interaction_modes_count, multiheight, type, vending_ids, clothing_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'',0)",
      [itemName, publicName, width, length, stackHeight, allowStack, allowSit, allowLay, allowWalk, spriteId, interType, interModes, multiheight, type]
    );
    await logAdminAction({ adminId: user.id, adminName: user.username, action: 'furniture_add', targetType: 'items_base', targetId: res.insertId, details: itemName + ' (' + publicName + ')', ip });
    return NextResponse.json({ ok: true, id: res.insertId });
  }

  if (action === 'update') {
    const id          = safeInt(body.id, 1);
    const publicName  = sanitizeText(body.public_name || '', 100);
    const width       = Math.max(1, safeInt(body.width, 1) || 1);
    const length      = Math.max(1, safeInt(body.length, 1) || 1);
    const stackHeight = parseFloat(body.stack_height) || 1.0;
    const allowStack  = body.allow_stack ? 1 : 0;
    const allowSit    = body.allow_sit   ? 1 : 0;
    const allowLay    = body.allow_lay   ? 1 : 0;
    const allowWalk   = body.allow_walk  ? 1 : 0;
    const interType   = sanitizeText(body.interaction_type || 'default', 50);
    const interModes  = safeInt(body.interaction_modes_count, 1) || 1;
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
