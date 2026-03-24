import { NextResponse } from 'next/server';
import { getSessionUserId, getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
import fs from 'fs';
import path from 'path';

// Returns list of badge part images from /public/images/badge-parts/
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'base';

    const dir = path.join(process.cwd(), 'public', 'images', 'badge-parts', type);
    if (!fs.existsSync(dir)) return NextResponse.json({ parts: [] });

    const files = fs.readdirSync(dir)
      .filter(f => /\.(png|gif)$/i.test(f))
      .map(f => `/images/badge-parts/${type}/${f}`);

    return NextResponse.json({ parts: files });
  } catch (e) {
    return NextResponse.json({ parts: [], error: e.message });
  }
}

export async function POST(request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { action } = body;

    // Save badge design
    if (action === 'save') {
      const name = sanitizeText(body.name || '', 100);
      const badgeCode = sanitizeText(body.badge_code || '', 50);
      const layers = body.layers;

      if (!name) return NextResponse.json({ error: 'Badge needs a name' }, { status: 400 });
      if (!badgeCode) return NextResponse.json({ error: 'Badge needs a code' }, { status: 400 });
      if (!Array.isArray(layers) || layers.length === 0) return NextResponse.json({ error: 'Add at least one layer' }, { status: 400 });

      const existing = await queryOne('SELECT id FROM cms_badge_designs WHERE id = ? AND user_id = ?', [body.id || 0, userId]);

      if (existing) {
        await query('UPDATE cms_badge_designs SET name=?, badge_code=?, layers=?, approved=0 WHERE id=? AND user_id=?',
          [name, badgeCode, JSON.stringify(layers), existing.id, userId]);
        return NextResponse.json({ ok: true, id: existing.id });
      } else {
        const res = await query('INSERT INTO cms_badge_designs (user_id, name, badge_code, layers) VALUES (?,?,?,?)',
          [userId, name, badgeCode, JSON.stringify(layers)]);
        return NextResponse.json({ ok: true, id: res.insertId });
      }
    }

    // Load user's saved designs
    if (action === 'list') {
      const designs = await query('SELECT id, name, badge_code, approved, created_at FROM cms_badge_designs WHERE user_id = ? ORDER BY created_at DESC', [userId]);
      return NextResponse.json({ ok: true, designs });
    }

    // Load a specific design
    if (action === 'load') {
      const id = safeInt(body.id, 1);
      const design = await queryOne('SELECT * FROM cms_badge_designs WHERE id = ? AND user_id = ?', [id, userId]);
      if (!design) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true, design: { ...design, layers: JSON.parse(design.layers) } });
    }

    // Delete design
    if (action === 'delete') {
      const id = safeInt(body.id, 1);
      await query('DELETE FROM cms_badge_designs WHERE id = ? AND user_id = ?', [id, userId]);
      return NextResponse.json({ ok: true });
    }

    // Admin: approve and push badge to user
    if (action === 'approve') {
      if (user.rank < 5) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const id = safeInt(body.id, 1);
      const design = await queryOne('SELECT * FROM cms_badge_designs WHERE id = ?', [id]);
      if (!design) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await query('UPDATE cms_badge_designs SET approved = 1 WHERE id = ?', [id]);
      await query('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [design.user_id, design.badge_code]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[/api/badge-maker POST]', err);
    return NextResponse.json({ error: 'Server error: ' + (err?.message || 'Unknown') }, { status: 500 });
  }
}
