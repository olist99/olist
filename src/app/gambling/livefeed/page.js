import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LiveFeedClient from './LiveFeedClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Live Feed & Leaderboard' };

export default async function LiveFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <div className="animate-fade-up"><LiveFeedClient /></div>;
}
