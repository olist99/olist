import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isPluginEnabled } from '@/lib/plugins';
import SummerSlotsGame from './SummerSlotsGame';

export const metadata = { title: 'Summer Slots' };

export default async function SummerSlotsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('gambling')) redirect('/');
  return (
    <div className="animate-fade-up">
      <SummerSlotsGame points={user.points} />
    </div>
  );
}
