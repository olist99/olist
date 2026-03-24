'use server';
import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import { query as db, queryOne as dbOne } from '@/lib/db';
import { sanitizeText, checkRateLimit } from '@/lib/security';

export async function reactAction(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');
  const articleId = parseInt(formData.get('article_id'));
  if (!articleId) return;
  const reaction = formData.get('reaction');
  if (!['like','love','laugh','wow','sad'].includes(reaction)) return;
  const ex = await dbOne('SELECT id, reaction FROM cms_news_reactions WHERE news_id = ? AND user_id = ?', [articleId, uid]);
  if (ex) {
    if (ex.reaction === reaction) await db('DELETE FROM cms_news_reactions WHERE id = ?', [ex.id]);
    else await db('UPDATE cms_news_reactions SET reaction = ? WHERE id = ?', [reaction, ex.id]);
  } else {
    await db('INSERT INTO cms_news_reactions (news_id, user_id, reaction) VALUES (?, ?, ?)', [articleId, uid, reaction]);
  }
  redirect('/news/' + articleId);
}

export async function commentAction(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');
  const articleId = parseInt(formData.get('article_id'));
  if (!articleId) return;

  const rl = await checkRateLimit(`comment:${uid}`, 5, 60000);
  if (!rl.ok) redirect('/news/' + articleId);

  const text = sanitizeText(formData.get('comment_text') || '', 1000);
  if (!text || text.length < 1) return;

  const article = await dbOne('SELECT author_id, title FROM cms_news WHERE id = ?', [articleId]);
  await db('INSERT INTO cms_news_comments (news_id, user_id, content) VALUES (?, ?, ?)', [articleId, uid, text]);

  if (article?.author_id && article.author_id !== uid) {
    const { sendNotification } = await import('@/lib/notifications');
    const commenter = await dbOne('SELECT username FROM users WHERE id = ?', [uid]);
    sendNotification(article.author_id, {
      type: 'news_comment',
      title: `${commenter?.username || 'Someone'} commented on your article`,
      message: `"${(article.title || '').slice(0, 80)}"`,
      link: '/news/' + articleId,
    });
  }

  redirect('/news/' + articleId);
}
