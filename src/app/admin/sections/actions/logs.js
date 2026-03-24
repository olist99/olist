'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';

export async function giveItemAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const uid      = parseInt(formData.get('user_id'));
  const itemId   = parseInt(formData.get('item_id'));
  const qty      = Math.max(1, Math.min(10, parseInt(formData.get('qty')) || 1));
  const itemName = formData.get('item_name') || '';
  const searchVal = formData.get('search_val') || '';
  if (!uid || !itemId) redirect('/admin?tab=logs&view=rare-spawns&error=Select+a+player+first');
  for (let i = 0; i < qty; i++) {
    await db(
      'INSERT INTO items (user_id, room_id, item_id, x, y, z, rot, wall_pos, limited_data, extra_data) VALUES (?, 0, ?, 0, 0, 0, 0, "", "0:0", "")',
      [uid, itemId]
    );
  }
  await db(
    'INSERT INTO cms_rare_spawn_log (admin_id, admin_name, target_id, target_name, item_id, item_name, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [u.id, u.username, uid, '', itemId, itemName, qty]
  ).catch(() => {});
  redirect(`/admin?tab=logs&view=rare-spawns&id=${uid}${searchVal ? `&search=${encodeURIComponent(searchVal)}` : ''}&success=Gave+${qty}x+to+player`);
}
