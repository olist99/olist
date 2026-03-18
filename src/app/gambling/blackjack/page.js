import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import BlackjackGame from './BlackjackGame';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Blackjack' };

export default async function BlackjackPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="animate-fade-up">
      <BlackjackGame points={user.points} />
    </div>
  );
}
