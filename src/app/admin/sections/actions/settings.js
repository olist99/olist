'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db, queryOne } from '@/lib/db';
import { sanitizeText, safeInt } from '@/lib/security';
import crypto from 'crypto';

// ── Announcement Banner ──────────────────────────────────────────────────────

export async function saveAnnouncementAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 6) redirect('/admin');
  const text = sanitizeText(formData.get('announcement_text') || '', 300);
  const type = ['info','warning','success','danger'].includes(formData.get('announcement_type'))
    ? formData.get('announcement_type') : 'info';
  await db("INSERT INTO cms_settings (`key`,`value`) VALUES ('announcement_text',?) ON DUPLICATE KEY UPDATE `value`=?", [text, text]);
  await db("INSERT INTO cms_settings (`key`,`value`) VALUES ('announcement_type',?) ON DUPLICATE KEY UPDATE `value`=?", [type, type]);
  redirect('/admin?tab=settings&success=Announcement+saved');
}

export async function clearAnnouncementAction() {
  const u = await getCurrentUser();
  if (!u || u.rank < 6) redirect('/admin');
  await db("INSERT INTO cms_settings (`key`,`value`) VALUES ('announcement_text','') ON DUPLICATE KEY UPDATE `value`=''");
  redirect('/admin?tab=settings&success=Announcement+cleared');
}

// ── Vouchers ─────────────────────────────────────────────────────────────────

export async function createVoucherAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const code = sanitizeText((formData.get('code') || crypto.randomBytes(4).toString('hex').toUpperCase()), 32).toUpperCase();
  const give_credits = safeInt(formData.get('give_credits'), 0) || 0;
  const give_pixels  = safeInt(formData.get('give_pixels'),  0) || 0;
  const give_points  = safeInt(formData.get('give_points'),  0) || 0;
  const give_badge   = sanitizeText(formData.get('give_badge') || '', 50);
  const give_tokens  = safeInt(formData.get('give_tokens'),  0) || 0;
  const max_uses     = safeInt(formData.get('max_uses'),     0) || 0;
  const message      = sanitizeText(formData.get('message') || '', 200);
  const expires_at   = formData.get('expires_at') || null;
  if (give_credits === 0 && give_pixels === 0 && give_points === 0 && !give_badge && give_tokens === 0)
    redirect('/admin?tab=token-shop&view=vouchers&error=Must+give+at+least+one+reward');
  try {
    await db(
      'INSERT INTO cms_vouchers (code,give_credits,give_pixels,give_points,give_badge,give_tokens,max_uses,message,active,expires_at) VALUES (?,?,?,?,?,?,?,?,1,?)',
      [code, give_credits, give_pixels, give_points, give_badge||null, give_tokens, max_uses, message, expires_at||null]
    );
  } catch {
    redirect('/admin?tab=token-shop&view=vouchers&error=Code+already+exists');
  }
  redirect('/admin?tab=token-shop&view=vouchers&success=Voucher+' + encodeURIComponent(code) + '+created');
}

export async function deleteVoucherAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = safeInt(formData.get('id'), 1);
  if (id) await db('DELETE FROM cms_vouchers WHERE id = ?', [id]);
  redirect('/admin?tab=token-shop&view=vouchers&success=Voucher+deleted');
}

export async function toggleVoucherAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = safeInt(formData.get('id'), 1);
  const active = formData.get('active') === '1' ? 0 : 1;
  if (id) await db('UPDATE cms_vouchers SET active = ? WHERE id = ?', [active, id]);
  redirect('/admin?tab=token-shop&view=vouchers&success=Voucher+updated');
}

// ── Flash Sales ───────────────────────────────────────────────────────────────

export async function createFlashSaleAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const item_id     = safeInt(formData.get('item_id'), 1);
  const discount_pct = Math.max(1, Math.min(99, safeInt(formData.get('discount_pct'), 1) || 10));
  const starts_at   = formData.get('starts_at') || new Date().toISOString().slice(0,16);
  const ends_at     = formData.get('ends_at');
  if (!item_id || !ends_at)
    redirect('/admin?tab=token-shop&view=flash-sales&error=Item+and+end+date+required');
  // Deactivate any existing sale on this item
  await db('UPDATE cms_flash_sales SET active = 0 WHERE item_id = ?', [item_id]);
  await db(
    'INSERT INTO cms_flash_sales (item_id, discount_pct, starts_at, ends_at, active) VALUES (?,?,?,?,1)',
    [item_id, discount_pct, starts_at, ends_at]
  );
  redirect('/admin?tab=token-shop&view=flash-sales&success=Flash+sale+created');
}

export async function deleteFlashSaleAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = safeInt(formData.get('id'), 1);
  if (id) await db('DELETE FROM cms_flash_sales WHERE id = ?', [id]);
  redirect('/admin?tab=token-shop&view=flash-sales&success=Flash+sale+deleted');
}

// ── Polls ─────────────────────────────────────────────────────────────────────

export async function createPollAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const question    = sanitizeText(formData.get('question') || '', 300);
  const description = sanitizeText(formData.get('description') || '', 1000);
  const expires_at  = formData.get('expires_at') || null;
  const options     = [];
  let i = 0;
  while (formData.get(`option_${i}`)) {
    const txt = sanitizeText(formData.get(`option_${i}`), 200);
    if (txt) options.push(txt);
    i++;
  }
  if (!question || options.length < 2)
    redirect('/admin?tab=community&view=polls&error=Need+question+and+at+least+2+options');
  const result = await db(
    'INSERT INTO cms_polls (question, description, created_by, active, is_open, expires_at) VALUES (?,?,?,1,1,?)',
    [question, description, u.id, expires_at || null]
  );
  const pollId = result.insertId;
  for (let j = 0; j < options.length; j++) {
    await db('INSERT INTO cms_poll_options (poll_id, option_text, sort_order) VALUES (?,?,?)', [pollId, options[j], j]);
  }
  redirect('/admin?tab=community&view=polls&success=Poll+created');
}

export async function deletePollAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = safeInt(formData.get('poll_id'), 1);
  if (id) {
    await db('DELETE FROM cms_poll_votes WHERE poll_id = ?', [id]);
    await db('DELETE FROM cms_poll_options WHERE poll_id = ?', [id]);
    await db('DELETE FROM cms_polls WHERE id = ?', [id]);
  }
  redirect('/admin?tab=community&view=polls&success=Poll+deleted');
}

export async function togglePollAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id      = safeInt(formData.get('poll_id'), 1);
  const field   = formData.get('field') === 'active' ? 'active' : 'is_open';
  const current = formData.get('current') === '1' ? 1 : 0;
  if (id) await db(`UPDATE cms_polls SET ${field} = ? WHERE id = ?`, [current ? 0 : 1, id]);
  redirect('/admin?tab=community&view=polls&success=Poll+updated');
}
