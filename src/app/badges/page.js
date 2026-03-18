import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import BadgeMaker from './BadgeMaker';

export const metadata = { title: 'Badge Maker' };

export default async function BadgePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <div className="animate-fade-up"><BadgeMaker /></div>;
}
