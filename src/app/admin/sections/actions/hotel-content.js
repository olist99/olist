'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';

export async function toggleNavCatAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('id'));
  const current = formData.get('enabled') === '1' ? 1 : 0;
  if (id) await db('UPDATE navigator_publiccats SET enabled = ? WHERE id = ?', [current ? 0 : 1, id]);
  redirect('/admin?tab=hotel-content&view=navigator&success=Category+updated');
}

export async function updateNavCatRankAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('id'));
  const minRank = Math.max(0, parseInt(formData.get('min_rank')) || 0);
  if (id) await db('UPDATE navigator_publiccats SET min_rank = ? WHERE id = ?', [minRank, id]);
  redirect('/admin?tab=hotel-content&view=navigator&success=Min+rank+updated');
}
