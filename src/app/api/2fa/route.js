import { NextResponse } from 'next/server';
import { getCurrentUser, getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { generateSecret, verifyTOTP, totpUri } from '@/lib/totp';
import { checkRateLimit } from '@/lib/security';

// Ensure 2FA table exists
async function ensure2FATable() {
  await query(`
    CREATE TABLE IF NOT EXISTS cms_user_2fa (
      user_id    INT PRIMARY KEY,
      secret     VARCHAR(64) NOT NULL,
      enabled    TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT NOW(),
      enabled_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  await ensure2FATable();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    const row = await queryOne('SELECT enabled FROM cms_user_2fa WHERE user_id = ?', [user.id]);
    return NextResponse.json({ enabled: !!row?.enabled });
  }

  if (action === 'setup') {
    // Generate a new secret (don't save yet — save only after user verifies)
    const existing = await queryOne('SELECT secret, enabled FROM cms_user_2fa WHERE user_id = ?', [user.id]);
    let secret;
    if (existing && !existing.enabled) {
      // Reuse pending secret so QR doesn't change on refresh
      secret = existing.secret;
    } else if (!existing) {
      secret = generateSecret();
      await query('INSERT INTO cms_user_2fa (user_id, secret, enabled) VALUES (?, ?, 0)', [user.id, secret]);
    } else {
      // Already enabled — return current status
      return NextResponse.json({ alreadyEnabled: true });
    }

    const uri = totpUri(secret, user.username);
    // Return the URI; frontend will render QR via a QR library or API
    return NextResponse.json({ secret, uri, username: user.username });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  await ensure2FATable();

  const rl = await checkRateLimit(`2fa:${userId}`, 10, 300000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  if (body.action === 'enable') {
    // Verify the code against the pending secret
    const row = await queryOne('SELECT secret FROM cms_user_2fa WHERE user_id = ? AND enabled = 0', [userId]);
    if (!row) return NextResponse.json({ error: '2FA setup not initiated' }, { status: 400 });
    if (!verifyTOTP(row.secret, body.code)) {
      return NextResponse.json({ error: 'Invalid code — check your authenticator app' }, { status: 400 });
    }
    await query('UPDATE cms_user_2fa SET enabled = 1, enabled_at = NOW() WHERE user_id = ?', [userId]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'disable') {
    // Require current 2FA code to disable
    const row = await queryOne('SELECT secret FROM cms_user_2fa WHERE user_id = ? AND enabled = 1', [userId]);
    if (!row) return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    if (!verifyTOTP(row.secret, body.code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }
    await query('DELETE FROM cms_user_2fa WHERE user_id = ?', [userId]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
