'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';
import { sanitizeText } from '@/lib/security';

export async function issueWarningAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const uid = parseInt(formData.get('user_id'));
  const reason = sanitizeText(formData.get('reason') || '', 300);
  if (!uid || !reason) redirect('/admin?tab=moderation&view=warnings&error=User+and+reason+required');
  await db('INSERT INTO cms_user_warnings (user_id, issued_by, reason) VALUES (?, ?, ?)', [uid, u.id, reason]);
  redirect(`/admin?tab=moderation&view=warnings&id=${uid}&success=Warning+issued`);
}

export async function addWordAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const word = formData.get('word')?.toLowerCase().trim();
  const replacement = formData.get('replacement')?.trim() || '***';
  if (!word) redirect('/admin?tab=moderation&view=word-filter&error=Word+required');
  await db('INSERT IGNORE INTO cms_word_filter (word, replacement, active) VALUES (?, ?, 1)', [word, replacement]);
  redirect('/admin?tab=moderation&view=word-filter&success=Word+added');
}

export async function deleteWordAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('id'));
  if (id) await db('DELETE FROM cms_word_filter WHERE id = ?', [id]);
  redirect('/admin?tab=moderation&view=word-filter&success=Word+removed');
}
