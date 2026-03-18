// src/app/forum/[categoryId]/page.js
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import ForumThreadList from '@/components/ForumThreadList'; // client component

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  return { title: 'Forum' };
}

export default async function ForumCategoryPage({ params, searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const categoryId = parseInt(params.categoryId);
  const page = Math.max(1, parseInt(searchParams?.page || 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const category = await queryOne('SELECT * FROM cms_forum_categories WHERE id = ?', [categoryId]).catch(() => null);
  if (!category) notFound();
  if (user.rank < category.min_rank) redirect('/forum');

  const [threads, totalCount] = await Promise.all([
    query(`
      SELECT t.*, u.username, u.look,
        lu.username AS last_reply_username
      FROM cms_forum_threads t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN users lu ON lu.id = t.last_reply_user_id
      WHERE t.category_id = ?
      ORDER BY t.pinned DESC, t.last_reply_at DESC
      LIMIT ? OFFSET ?
    `, [categoryId, perPage, offset]).catch(() => []),
    query('SELECT COUNT(*) as cnt FROM cms_forum_threads WHERE category_id = ?', [categoryId])
      .then(r => r[0]?.cnt || 0).catch(() => 0),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);
  const canPost = user.rank >= category.post_min_rank;

  return (
    <ForumThreadList
      category={category}
      threads={threads}
      page={page}
      totalPages={totalPages}
      canPost={canPost}
      categoryId={categoryId}
    />
  );
}