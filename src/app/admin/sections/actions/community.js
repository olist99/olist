'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query as db } from '@/lib/db';
import { sanitizeText } from '@/lib/security';

export async function createNewsAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/');
  const title     = formData.get('title')?.trim();
  const content   = formData.get('content')?.trim();
  const shortDesc = formData.get('short_desc')?.trim();
  const tag       = formData.get('tag')?.trim() || 'NEWS';
  const image     = formData.get('image')?.trim();
  const pinned    = formData.get('pinned') === 'on' ? 1 : 0;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  if (!title || !content) redirect('/admin?tab=community&view=news-create&error=Title+and+content+required');
  await db('INSERT INTO cms_news (title,slug,content,short_desc,image,tag,author_id,pinned) VALUES (?,?,?,?,?,?,?,?)',
    [title,slug,content,shortDesc||null,image||null,tag,u.id,pinned]);
  redirect('/admin?tab=community&success=Article+created');
}

export async function editNewsAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/');
  const id      = formData.get('id');
  const title   = formData.get('title')?.trim();
  const content = formData.get('content')?.trim();
  const shortDesc = formData.get('short_desc')?.trim();
  const tag     = formData.get('tag')?.trim() || 'NEWS';
  const image   = formData.get('image')?.trim();
  const pinned  = formData.get('pinned') === 'on' ? 1 : 0;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  if (!title || !content) redirect(`/admin?tab=community&view=news-edit&id=${id}&error=Title+and+content+required`);
  await db('UPDATE cms_news SET title=?,slug=?,content=?,short_desc=?,image=?,tag=?,pinned=? WHERE id=?',
    [title,slug,content,shortDesc||null,image||null,tag,pinned,id]);
  redirect('/admin?tab=community&success=Article+updated');
}

export async function deleteNewsAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/');
  const id = parseInt(formData.get('news_id'));
  if (id) {
    await db('DELETE FROM cms_news_comments WHERE news_id = ?', [id]);
    await db('DELETE FROM cms_news_reactions WHERE news_id = ?', [id]);
    await db('DELETE FROM cms_news WHERE id = ?', [id]);
  }
  redirect('/admin?tab=community&success=Article+deleted');
}

export async function deleteThreadAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('thread_id'));
  if (id) {
    await db('DELETE FROM cms_forum_replies WHERE thread_id = ?', [id]);
    await db('DELETE FROM cms_forum_threads WHERE id = ?', [id]);
  }
  redirect('/admin?tab=community&view=forum&success=Thread+deleted');
}

export async function deletePostAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('post_id'));
  if (id) await db('DELETE FROM cms_forum_replies WHERE id = ?', [id]);
  redirect('/admin?tab=community&view=forum&success=Post+deleted');
}

export async function togglePinAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('thread_id'));
  const pinned = formData.get('pinned') === '1';
  if (id) await db('UPDATE cms_forum_threads SET pinned = ? WHERE id = ?', [pinned ? 0 : 1, id]);
  redirect('/admin?tab=community&view=forum&success=Thread+updated');
}

export async function toggleLockAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('thread_id'));
  const locked = formData.get('locked') === '1';
  if (id) await db('UPDATE cms_forum_threads SET locked = ? WHERE id = ?', [locked ? 0 : 1, id]);
  redirect('/admin?tab=community&view=forum&success=Thread+updated');
}

export async function resolveReportAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('report_id'));
  const action = formData.get('action');
  if (id) await db("UPDATE cms_content_reports SET status = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?",
    [action === 'dismiss' ? 'dismissed' : 'resolved', u.id, id]);
  redirect('/admin?tab=community&view=report-posts&success=Report+updated');
}

export async function deleteEntryAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('entry_id'));
  if (id) await db('DELETE FROM cms_guestbook_entries WHERE id = ?', [id]);
  redirect('/admin?tab=community&view=guestbooks&success=Entry+deleted');
}

export async function createContestAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const title = sanitizeText(formData.get('title') || '', 200);
  const description = sanitizeText(formData.get('description') || '', 1000);
  const prize = sanitizeText(formData.get('prize') || '', 200);
  const endDate = formData.get('end_date') || null;
  if (!title) redirect('/admin?tab=community&view=contests&error=Title+required');
  await db('INSERT INTO cms_contests (title, description, prize, end_date, created_by, status) VALUES (?,?,?,?,?,?)',
    [title, description, prize, endDate, u.id, 'active']);
  redirect('/admin?tab=community&view=contests&success=Contest+created');
}

export async function closeContestAction(formData) {
  const u = await getCurrentUser();
  if (!u || u.rank < 4) redirect('/admin');
  const id = parseInt(formData.get('contest_id'));
  if (id) await db("UPDATE cms_contests SET status = 'closed' WHERE id = ?", [id]);
  redirect('/admin?tab=community&view=contests&success=Contest+closed');
}
