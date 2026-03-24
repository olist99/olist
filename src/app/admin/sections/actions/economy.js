'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';
import { sanitizeText } from '@/lib/security';

export async function deleteCaseAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('case_id'));
  if (id) {
    await db('DELETE FROM cms_case_items WHERE case_id = ?', [id]);
    await db('DELETE FROM cms_cases WHERE id = ?', [id]);
  }
  redirect('/admin?tab=economy&view=cases&success=Case+deleted');
}

export async function addRareAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const item_name = (formData.get('item_name') || '').trim();
  const value     = (formData.get('value') || '').trim();
  const trend     = ['up','down','stable'].includes(formData.get('trend')) ? formData.get('trend') : 'stable';
  const category  = (formData.get('category') || 'Rares').trim();
  if (!item_name || !value) redirect('/admin?tab=economy&view=rare-releases&error=Item+name+and+value+required');
  await db('INSERT INTO cms_rare_values (item_name, value, trend, category) VALUES (?,?,?,?)',
    [item_name, value, trend, category]);
  redirect('/admin?tab=economy&view=rare-releases&success=Rare+added');
}

export async function deleteRareAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('id'));
  if (id) await db('DELETE FROM cms_rare_values WHERE id = ?', [id]);
  redirect('/admin?tab=economy&view=rare-releases&success=Rare+deleted');
}

export async function deleteShopItemAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id = parseInt(formData.get('item_id'));
  if (id) await db('DELETE FROM cms_shop_items WHERE id = ?', [id]);
  redirect('/admin?tab=economy&success=Item+deleted');
}

export async function saveShopItemAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 5) redirect('/admin');
  const id          = formData.get('id');
  const name        = sanitizeText(formData.get('name') || '', 200);
  const description = sanitizeText(formData.get('description') || '', 500);
  const category    = sanitizeText(formData.get('category') || 'General', 50);
  const price       = parseInt(formData.get('price')) || 0;
  const currency    = ['credits','pixels','points'].includes(formData.get('currency')) ? formData.get('currency') : 'credits';
  const active      = formData.get('active') === 'on' ? 1 : 0;
  const give_badge  = sanitizeText(formData.get('give_badge') || '', 50);
  const give_credits = parseInt(formData.get('give_credits')) || 0;
  const give_pixels  = parseInt(formData.get('give_pixels'))  || 0;
  const give_points  = parseInt(formData.get('give_points'))  || 0;
  if (!name) redirect('/admin?tab=economy&error=Name+required');
  if (id) {
    await db('UPDATE cms_shop_items SET name=?,description=?,category=?,price=?,currency=?,active=?,give_badge=?,give_credits=?,give_pixels=?,give_points=? WHERE id=?',
      [name,description,category,price,currency,active,give_badge,give_credits,give_pixels,give_points,id]);
    redirect('/admin?tab=economy&success=Item+updated');
  } else {
    await db('INSERT INTO cms_shop_items (name,description,category,price,currency,active,give_badge,give_credits,give_pixels,give_points) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [name,description,category,price,currency,active,give_badge,give_credits,give_pixels,give_points]);
    redirect('/admin?tab=economy&success=Item+created');
  }
}
