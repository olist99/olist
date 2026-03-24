'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';

export async function togglePluginAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 6) redirect('/admin');
  const slug    = formData.get('slug')?.replace(/[^a-z0-9_-]/g, '');
  const enabled = formData.get('enabled') === '1' ? '1' : '0';
  if (!slug) redirect('/admin?tab=plugins&error=Invalid+plugin');
  await db('INSERT INTO cms_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
    [`plugin_${slug}`, enabled, enabled]);
  redirect(`/admin?tab=plugins&success=Plugin+${enabled === '1' ? 'enabled' : 'disabled'}`);
}
