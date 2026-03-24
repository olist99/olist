'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db, queryOne as dbOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
export async function giveBadgeAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const uid = parseInt(formData.get('user_id'));
  const badgeCode = (formData.get('badge_code') || '').trim().toUpperCase();
  if (!uid || !badgeCode) redirect('/admin?tab=users&error=Invalid+input');
  await db('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [uid, badgeCode]);
  redirect(`/admin?tab=users&view=profile&id=${uid}&success=Badge+given`);
}

export async function removeBadgeAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const uid = parseInt(formData.get('user_id'));
  const badgeCode = (formData.get('badge_code') || '').trim();
  if (!uid || !badgeCode) redirect('/admin?tab=users&error=Invalid+input');
  await db('DELETE FROM users_badges WHERE user_id = ? AND badge_code = ?', [uid, badgeCode]);
  redirect(`/admin?tab=users&view=profile&id=${uid}&success=Badge+removed`);
}

export async function editUserAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');

  const targetId = parseInt(formData.get('user_id'));
  if (!targetId) redirect('/admin?tab=users&error=Invalid+user');

  const target = await dbOne('SELECT id, `rank` FROM users WHERE id = ?', [targetId]);
  if (!target) redirect('/admin?tab=users&error=User+not+found');
  if (target.rank >= u.rank) redirect('/admin?tab=users&error=Cannot+edit+users+of+equal+or+higher+rank');

  const action = formData.get('action') || 'save';

  // ── Save all fields at once (main Edit User form) ─────────────────────────
  if (action === 'save') {
    const motto   = sanitizeText(formData.get('motto') || '', 100);
    // FIX #7: parseInt('abc') returns NaN, and NaN ?? fallback returns NaN (??
    // only catches null/undefined). safeInt returns null on NaN, so the || gives
    // us the existing DB value instead of wiping the balance with 0.
    const target2 = await dbOne('SELECT credits, pixels, points FROM users WHERE id = ?', [targetId]);
    const credits = safeInt(formData.get('credits'), 0, 2147483647) ?? target2?.credits ?? 0;
    const pixels  = safeInt(formData.get('pixels'),  0, 2147483647) ?? target2?.pixels  ?? 0;
    const points  = safeInt(formData.get('points'),  0, 2147483647) ?? target2?.points  ?? 0;
    const newRank = safeInt(formData.get('rank'),    1, 10);

    if (newRank && (newRank < 1 || newRank >= u.rank)) {      redirect(`/admin?tab=users&view=profile&id=${targetId}&error=Invalid+rank`);
    }

    await db(
      'UPDATE users SET motto = ?, credits = ?, pixels = ?, points = ?' + (newRank ? ', `rank` = ?' : '') + ' WHERE id = ?',
      newRank
        ? [motto, credits, pixels, points, newRank, targetId]
        : [motto, credits, pixels, points, targetId]
    );

    if (newRank && newRank !== target.rank) {
      await db('INSERT INTO cms_rank_log (user_id, admin_id, old_rank, new_rank, reason) VALUES (?,?,?,?,?)',
        [targetId, u.id, target.rank, newRank, 'Admin edit']).catch(() => {});
    }
    redirect(`/admin?tab=users&view=profile&id=${targetId}&success=User+updated`);
  }

  if (action === 'credits') {
    const col = formData.get('currency') || 'credits';
    const validCols = ['credits','pixels','points','gotw'];
    if (!validCols.includes(col)) redirect('/admin?tab=users&view=profile&id=' + targetId);
    const amount = parseInt(formData.get('amount')) || 0;
    const reason = sanitizeText(formData.get('reason') || '', 200) || 'Admin adjustment';
    await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [amount, targetId]);
    await db('INSERT INTO cms_credit_log (user_id, admin_id, currency, amount, reason) VALUES (?,?,?,?,?)',
      [targetId, u.id, col, amount, reason]).catch(() => {});
    redirect(`/admin?tab=users&view=profile&id=${targetId}&success=Balance+updated`);
  }

  if (action === 'rank') {
    const newRank = parseInt(formData.get('rank'));
    if (!newRank || newRank < 1 || newRank >= u.rank) redirect(`/admin?tab=users&view=profile&id=${targetId}&error=Invalid+rank`);
    const oldRank = target.rank;
    await db('UPDATE users SET `rank` = ? WHERE id = ?', [newRank, targetId]);
    await db('INSERT INTO cms_rank_log (user_id, admin_id, old_rank, new_rank, reason) VALUES (?,?,?,?,?)',
      [targetId, u.id, oldRank, newRank, 'Admin rank change']).catch(() => {});
    redirect(`/admin?tab=users&view=profile&id=${targetId}&success=Rank+updated`);
  }

  if (action === 'ban') {
    const reason = sanitizeText(formData.get('reason') || '', 300) || 'Banned by staff';
    const duration = parseInt(formData.get('duration')) || 0;
    const expire = duration > 0 ? Math.floor(Date.now() / 1000) + duration * 86400 : 9999999999;
    await db("INSERT INTO bans (user_id, value, reason, ban_type, added_by, timestamp, expire) VALUES (?, ?, ?, 'account', ?, UNIX_TIMESTAMP(), ?)",
      [targetId, '', reason, u.username, expire]);
    await db('UPDATE users SET online = 0 WHERE id = ?', [targetId]);
    redirect(`/admin?tab=users&view=profile&id=${targetId}&success=User+banned`);
  }

  if (action === 'kick') {
    await db('UPDATE users SET online = 0 WHERE id = ?', [targetId]);
    redirect(`/admin?tab=users&view=profile&id=${targetId}&success=User+kicked`);
  }

  redirect(`/admin?tab=users&view=profile&id=${targetId}`);
}