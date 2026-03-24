'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';
import { sanitizeText } from '@/lib/security';

export async function saveEventAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 3) redirect('/admin');
  const id          = formData.get('id');
  const title       = sanitizeText(formData.get('title') || '', 200);
  const description = sanitizeText(formData.get('description') || '', 2000);
  const eventDate   = formData.get('event_date') || null;
  const endDate     = formData.get('end_date')   || null;
  const image       = sanitizeText(formData.get('image') || '', 500);
  if (!title) redirect('/admin?tab=events&error=Title+required');
  if (id) {
    await db('UPDATE cms_events SET title=?,description=?,event_date=?,end_date=?,image=? WHERE id=?', [title,description,eventDate,endDate,image,id]);
    redirect('/admin?tab=events&success=Event+updated');
  } else {
    await db('INSERT INTO cms_events (title,description,event_date,end_date,image,staff_id) VALUES (?,?,?,?,?,?)', [title,description,eventDate,endDate,image,u.id]);
    redirect('/admin?tab=events&success=Event+created');
  }
}

export async function deleteEventAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 3) redirect('/admin');
  const id = parseInt(formData.get('event_id'));
  if (id) await db('DELETE FROM cms_events WHERE id = ?', [id]);
  redirect('/admin?tab=events&success=Event+deleted');
}

export async function awardCurrencyAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const currency = ['credits','pixels','points'].includes(formData.get('currency')) ? formData.get('currency') : 'credits';
  const amount   = Math.max(1, Math.min(10000, parseInt(formData.get('amount')) || 0));
  const target   = formData.get('target');
  const reason   = `Event reward by ${u.username}`;
  if (!amount) redirect('/admin?tab=events&view=currency&error=Invalid+amount');
  if (target === 'all') {
    await db(`UPDATE users SET \`${currency}\` = \`${currency}\` + ? WHERE \`rank\` >= 1`, [amount]);
    await db('INSERT INTO cms_credit_log (user_id, admin_id, currency, amount, reason) SELECT id, ?, ?, ?, ? FROM users WHERE `rank` >= 1',
      [u.id, currency, amount, reason]).catch(() => {});
  } else {
    const uid = parseInt(target);
    if (uid) {
      await db(`UPDATE users SET \`${currency}\` = \`${currency}\` + ? WHERE id = ?`, [amount, uid]);
      await db('INSERT INTO cms_credit_log (user_id, admin_id, currency, amount, reason) VALUES (?,?,?,?,?)',
        [uid, u.id, currency, amount, reason]).catch(() => {});
    }
  }
  redirect('/admin?tab=events&view=currency&success=Currency+awarded');
}

export async function awardBadgeAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const badgeCode = (formData.get('badge_code') || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const target    = formData.get('target');
  const userId    = formData.get('current_user_id') ? parseInt(formData.get('current_user_id')) : null;
  if (!badgeCode) redirect('/admin?tab=events&view=badge-rewards&error=Badge+code+required');
  if (target === 'all') {
    const users = await db('SELECT id FROM users WHERE `rank` >= 1').catch(() => []);
    for (const user of users) {
      await db('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [user.id, badgeCode]).catch(() => {});
    }
  } else {
    const uid = parseInt(target);
    if (uid) await db('INSERT IGNORE INTO users_badges (user_id, badge_code) VALUES (?, ?)', [uid, badgeCode]);
  }
  const redir = userId ? `/admin?tab=events&view=badge-rewards&id=${userId}&success=Badge+${badgeCode}+awarded` : `/admin?tab=events&view=badge-rewards&success=Badge+${badgeCode}+awarded`;
  redirect(redir);
}