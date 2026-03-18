import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import NewThreadForm from './NewThreadForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'New Thread' };

export default async function NewThreadPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const p = await params;
  const categoryId = parseInt(p.categoryId);

  const category = await queryOne('SELECT * FROM cms_forum_categories WHERE id = ?', [categoryId]).catch(() => null);
  if (!category) notFound();
  if (user.rank < category.min_rank) redirect('/forum');
  if (user.rank < category.post_min_rank) redirect(`/forum/${categoryId}`);

  return <NewThreadForm categoryId={categoryId} categoryName={category.name} categoryIcon={category.icon} />;
}
