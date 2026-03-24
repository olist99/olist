'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';

export async function deleteCaseAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('id'));
  if (id) {
    await db('DELETE FROM cms_case_items WHERE case_id = ?', [id]);
    await db('DELETE FROM cms_cases WHERE id = ?', [id]);
  }
  redirect('/admin?tab=gambling&view=cases&success=Case+deleted');
}
