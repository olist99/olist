import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CaseOpeningGame from './CaseOpeningGame';

export const metadata = { title: 'Case Opening' };

export default async function CasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="animate-fade-up">
      <CaseOpeningGame diamonds={user.points} />
    </div>
  );
}
