import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

async function ensureTable() {
  // Create table with all columns
  await query(`
    CREATE TABLE IF NOT EXISTS cms_staff_positions (
      user_id        INT PRIMARY KEY,
      x_pct          FLOAT NOT NULL DEFAULT 50,
      y_pct          FLOAT NOT NULL DEFAULT 50,
      direction      TINYINT NOT NULL DEFAULT 2,
      head_direction TINYINT NOT NULL DEFAULT 2,
      sitting        TINYINT NOT NULL DEFAULT 0,
      updated_at     DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});

  // Add missing columns for existing tables (runs silently if already exists)
  await query(`ALTER TABLE cms_staff_positions ADD COLUMN direction TINYINT NOT NULL DEFAULT 2`).catch(() => {});
  await query(`ALTER TABLE cms_staff_positions ADD COLUMN head_direction TINYINT NOT NULL DEFAULT 2`).catch(() => {});
  await query(`ALTER TABLE cms_staff_positions ADD COLUMN sitting TINYINT NOT NULL DEFAULT 0`).catch(() => {});
}

let migrated = false;
async function ensureOnce() {
  if (migrated) return;
  await ensureTable();
  migrated = true;
}

export async function GET() {
  await ensureOnce();
  const rows = await query('SELECT user_id, x_pct, y_pct, direction, head_direction, sitting FROM cms_staff_positions').catch(() => []);
  const map = {};
  for (const p of rows) {
    map[p.user_id] = {
      x: p.x_pct,
      y: p.y_pct,
      direction: p.direction ?? 2,
      head_direction: p.head_direction ?? 2,
      sitting: p.sitting ?? 0,
    };
  }
  return NextResponse.json({ positions: map });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.rank < 7) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { positions, background, foreground } = body;

  if (typeof background === 'string') {
    const val = background.trim().slice(0, 500);
    await query("INSERT INTO cms_settings (`key`,`value`) VALUES ('staff_background',?) ON DUPLICATE KEY UPDATE `value`=?", [val, val]);
    return NextResponse.json({ ok: true });
  }

  if (typeof foreground === 'string') {
    const val = foreground.trim().slice(0, 500);
    await query("INSERT INTO cms_settings (`key`,`value`) VALUES ('staff_foreground',?) ON DUPLICATE KEY UPDATE `value`=?", [val, val]);
    return NextResponse.json({ ok: true });
  }

  if (body.fg_pos !== undefined) {
    const { fg_x, fg_y, fg_width, fg_height } = body.fg_pos;
    const save = async (key, val) => query(
      "INSERT INTO cms_settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?",
      [key, String(val), String(val)]
    );
    await Promise.all([
      save('staff_fg_x',      parseFloat(fg_x)      || 0),
      save('staff_fg_y',      parseFloat(fg_y)      || 0),
      save('staff_fg_width',  parseFloat(fg_width)  || 100),
      save('staff_fg_height', parseFloat(fg_height) || 100),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (!positions || typeof positions !== 'object') return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  await ensureOnce();

  for (const [userId, pos] of Object.entries(positions)) {
    const uid = parseInt(userId);
    if (!uid) continue;
    const x   = Math.max(2, Math.min(95, parseFloat(pos.x) || 50));
    const y   = Math.max(2, Math.min(90, parseFloat(pos.y) || 50));
    const dir = [0,1,2,3,4,5,6,7].includes(Number(pos.direction)) ? Number(pos.direction) : 2;
    const hd  = [0,1,2,3,4,5,6,7].includes(Number(pos.head_direction)) ? Number(pos.head_direction) : 2;
    const sit = pos.sitting ? 1 : 0;
    await query(
      `INSERT INTO cms_staff_positions (user_id, x_pct, y_pct, direction, head_direction, sitting)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE x_pct=?, y_pct=?, direction=?, head_direction=?, sitting=?, updated_at=NOW()`,
      [uid, x, y, dir, hd, sit, x, y, dir, hd, sit]
    );
  }

  return NextResponse.json({ ok: true });
}
