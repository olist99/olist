import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sanitizeText, safeInt, checkRateLimit } from '@/lib/security';
import { sendNotification } from '@/lib/notifications';
import fs from 'fs';
import path from 'path';

// ── Ensure tables exist ──────────────────────────────────────────────────────

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS cms_guestbook (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      profile_id  INT NOT NULL,
      author_id   INT NOT NULL,
      message     TEXT NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT NOW(),
      INDEX idx_profile (profile_id),
      INDEX idx_author  (author_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS cms_profile_stickers (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      profile_id  INT NOT NULL UNIQUE,
      stickers    TEXT NOT NULL DEFAULT '[]',
      updated_at  DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      INDEX idx_profile (profile_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}

// ── GET — fetch guestbook entries, stickers, or sticker list ────────────────

export async function GET(request) {
  const url   = new URL(request.url);
  const type  = url.searchParams.get('type') || 'guestbook';
  const profileId = safeInt(url.searchParams.get('profile_id'), 1);

  await ensureTables();

  // Return list of available sticker filenames from /images/stickers/
  if (type === 'sticker_list') {
    try {
      const dir = path.join(process.cwd(), 'public', 'images', 'stickers');
      const files = fs.readdirSync(dir).filter(f =>
        /\.(png|gif|webp|jpg|jpeg)$/i.test(f)
      );
      return NextResponse.json({ stickers: files });
    } catch {
      return NextResponse.json({ stickers: [] });
    }
  }

  if (!profileId) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 });

  // Guestbook entries
  if (type === 'guestbook') {
    const page    = Math.max(1, safeInt(url.searchParams.get('page'), 1) || 1);
    const perPage = 10;
    const offset  = (page - 1) * perPage;

    const [entries, totalRow] = await Promise.all([
      query(`
        SELECT g.id, g.message, g.created_at,
               u.username AS author_name, u.look AS author_look, u.id AS author_id
        FROM cms_guestbook g
        JOIN users u ON u.id = g.author_id
        WHERE g.profile_id = ?
        ORDER BY g.created_at DESC
        LIMIT ? OFFSET ?
      `, [profileId, perPage, offset]).catch(() => []),
      query('SELECT COUNT(*) AS c FROM cms_guestbook WHERE profile_id = ?', [profileId])
        .then(r => r[0]?.c || 0).catch(() => 0),
    ]);

    return NextResponse.json({ entries, total: totalRow, page, perPage });
  }

  // Placed stickers for a profile
  if (type === 'stickers') {
    const row = await queryOne(
      'SELECT stickers FROM cms_profile_stickers WHERE profile_id = ?', [profileId]
    ).catch(() => null);
    let stickers = [];
    try { stickers = row ? JSON.parse(row.stickers) : []; } catch {}
    return NextResponse.json({ stickers });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// ── POST — write guestbook entry, save stickers, delete entry ───────────────

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await ensureTables();

  const { action } = body;

  // ── Write guestbook entry ──
  if (action === 'guestbook_post') {
    const rl = checkRateLimit(`guestbook:${user.id}`, 5, 60000);
    if (!rl.ok) return NextResponse.json({ error: 'You\'re posting too fast. Wait a moment.' }, { status: 429 });

    const profileId = safeInt(body.profile_id, 1);
    if (!profileId) return NextResponse.json({ error: 'Invalid profile' }, { status: 400 });

    const profile = await queryOne('SELECT id, username FROM users WHERE id = ?', [profileId]).catch(() => null);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const message = sanitizeText(body.message || '', 500);
    if (!message || message.trim().length < 2) {
      return NextResponse.json({ error: 'Message is too short' }, { status: 400 });
    }

    await query(
      'INSERT INTO cms_guestbook (profile_id, author_id, message) VALUES (?,?,?)',
      [profileId, user.id, message.trim()]
    );

    // Notify profile owner (not if posting on own profile)
    if (profileId !== user.id) {
      await sendNotification(profileId, {
        type: 'general',
        title: `${user.username} signed your guestbook!`,
        message: message.trim().slice(0, 80) + (message.length > 80 ? '…' : ''),
        link: `/profile/${profile.username}`,
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Delete guestbook entry ──
  if (action === 'guestbook_delete') {
    const entryId = safeInt(body.entry_id, 1);
    if (!entryId) return NextResponse.json({ error: 'Invalid entry' }, { status: 400 });

    const entry = await queryOne(
      'SELECT g.*, u.username AS profile_username FROM cms_guestbook g JOIN users u ON u.id = g.profile_id WHERE g.id = ?',
      [entryId]
    ).catch(() => null);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    // Allow: profile owner, the author, or admins (rank >= 4)
    const isOwner  = user.id === entry.profile_id;
    const isAuthor = user.id === entry.author_id;
    const isAdmin  = user.rank >= 4;
    if (!isOwner && !isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    await query('DELETE FROM cms_guestbook WHERE id = ?', [entryId]);
    return NextResponse.json({ ok: true });
  }

  // ── Save sticker layout (profile owner only) ──
  if (action === 'save_stickers') {
    const profileId = safeInt(body.profile_id, 1);
    if (!profileId) return NextResponse.json({ error: 'Invalid profile' }, { status: 400 });
    if (user.id !== profileId) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });

    // Validate stickers array
    let stickers = [];
    try {
      stickers = Array.isArray(body.stickers) ? body.stickers : [];
      // Clamp to max 20 stickers, each must have file/x/y/scale
      stickers = stickers.slice(0, 20).map(s => ({
        file:  String(s.file  || '').replace(/[^a-zA-Z0-9._\-]/g, '').slice(0, 100),
        x:     Math.max(0, parseFloat(s.x)  || 0),
        y:     Math.max(0, parseFloat(s.y)  || 0),
        scale: Math.min(3,   Math.max(0.3, parseFloat(s.scale) || 1)),
        rot:   Math.min(360, Math.max(-360, parseFloat(s.rot) || 0)),
      })).filter(s => s.file);
    } catch {
      return NextResponse.json({ error: 'Invalid stickers data' }, { status: 400 });
    }

    await query(`
      INSERT INTO cms_profile_stickers (profile_id, stickers)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE stickers = VALUES(stickers)
    `, [profileId, JSON.stringify(stickers)]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
