import { redirect } from 'next/navigation';
import { isPluginEnabled } from '@/lib/plugins';
import { getCurrentUser } from '@/lib/auth';
import LiveFeedClient from './LiveFeedClient';

export const metadata = { title: 'Live Feed & Leaderboard' };

export default async function LiveFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('gambling')) redirect('/');
  return <div className="animate-fade-up"><LiveFeedClient /></div>;
}
