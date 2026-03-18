import { redirect } from 'next/navigation';
import { isPluginEnabled } from '@/lib/plugins';
import { getCurrentUser } from '@/lib/auth';
import BadgeMaker from './BadgeMaker';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Badge Maker' };

export default async function BadgePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('badges')) redirect('/');

  return <div className="animate-fade-up"><BadgeMaker /></div>;
}
