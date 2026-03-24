import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import HighCardGame from './HighCardGame';

export const metadata = { title: 'High Card' };

export default async function HighCardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="animate-fade-up">
      <HighCardGame points={user.points} userId={user.id} />
    </div>
  );
}
