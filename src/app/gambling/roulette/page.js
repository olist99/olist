import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import RouletteGame from './RouletteGame';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Roulette' };

export default async function GamblingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="animate-fade-up">
      <RouletteGame
        credits={user.credits}
        pixels={user.pixels}
        points={user.points}
      />
    </div>
  );
}
