import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DiceDuelGame from './DiceDuelGame';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Dice Duel' };

export default async function DiceDuelPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="animate-fade-up">
      <DiceDuelGame points={user.points} userId={user.id} />
    </div>
  );
}
