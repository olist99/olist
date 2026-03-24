import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CoinFlipGame from './CoinFlipGame';

export const metadata = { title: 'Coin Toss' };

export default async function CoinFlipPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="animate-fade-up">
      <CoinFlipGame credits={user.credits} pixels={user.pixels} points={user.points} userId={user.id} />
    </div>
  );
}
