'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';

export async function editRoomAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id          = parseInt(formData.get('room_id'));
  const name        = (formData.get('name') || '').trim().slice(0, 64);
  const description = (formData.get('description') || '').trim().slice(0, 256);
  const maxUsers    = Math.max(1, Math.min(100, parseInt(formData.get('users_max')) || 25));
  if (!id) redirect('/admin?tab=rooms&error=Invalid+room');
  await db('UPDATE rooms SET name=?,description=?,users_max=? WHERE id=?', [name,description,maxUsers,id]);
  redirect('/admin?tab=rooms&success=Room+updated');
}

export async function deleteRoomAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('room_id'));
  if (id) await db('DELETE FROM rooms WHERE id = ?', [id]);
  redirect('/admin?tab=rooms&success=Room+deleted');
}

export async function boostScoreAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('room_id'));
  const amount = Math.max(1, Math.min(10000, parseInt(formData.get('amount')) || 100));
  if (id) await db('UPDATE rooms SET score = score + ? WHERE id = ?', [amount, id]);
  redirect('/admin?tab=rooms&success=Score+boosted');
}

export async function resetScoreAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('room_id'));
  if (id) await db('UPDATE rooms SET score = 0 WHERE id = ?', [id]);
  redirect('/admin?tab=rooms&success=Score+reset');
}
