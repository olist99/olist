import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isPluginEnabled } from '@/lib/plugins';
import SlotsGame from './SlotsGame';

export const metadata = { title: 'Lucky Slots' };

export default async function SlotsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('gambling')) redirect('/');
  return (
    <div className="animate-fade-up">
      <SlotsGame points={user.points} />
    </div>
  );
}
