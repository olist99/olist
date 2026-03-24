'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth';
import { query as dbQuery, queryOne } from '@/lib/db';
import { sanitizeText } from '@/lib/security';

export async function updateProfile(formData) {
  const u = await getCurrentUser();
  if (!u) redirect('/login');

  const motto = sanitizeText(formData.get('motto') || '', 127);
  const rawEmail = formData.get('email')?.trim() || '';

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) redirect('/settings?tab=general&error=Invalid+email');
  const email = rawEmail.slice(0, 254);

  await dbQuery('UPDATE users SET motto = ?, mail = ? WHERE id = ?', [motto, email, u.id]);
  redirect('/settings?tab=general&msg=Profile+updated!');
}

export async function updateLook(formData) {
  const u = await getCurrentUser();
  if (!u) redirect('/login');

  const look = formData.get('look')?.trim() || '';
  if (!look || !/^[a-zA-Z0-9\-\.]+$/.test(look)) redirect('/settings?tab=avatar&error=Invalid+look+string');

  await dbQuery('UPDATE users SET look = ? WHERE id = ?', [look, u.id]);
  redirect('/settings?tab=avatar&msg=Look+updated!');
}

export async function changePassword(formData) {
  const u = await getCurrentUser();
  if (!u) redirect('/login');

  const current = formData.get('current_password');
  const newPass = formData.get('new_password');
  const confirm = formData.get('confirm_password');

  const fullUser = await queryOne('SELECT password FROM users WHERE id = ?', [u.id]);
  if (!fullUser || !(await verifyPassword(current, fullUser.password))) {
    redirect('/settings?tab=security&error=Current+password+is+incorrect');
  }
  if (!newPass || newPass.length < 6) redirect('/settings?tab=security&error=Password+must+be+6%2B+characters');
  if (newPass !== confirm) redirect('/settings?tab=security&error=Passwords+do+not+match');

  const hashed = await hashPassword(newPass);
  await dbQuery('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
  redirect('/settings?tab=security&msg=Password+changed!');
}
