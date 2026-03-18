import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import SecurityClient from './SecurityClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Security Monitor' };

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) redirect('/');
  return (
    <div className="animate-fade-up">
      <div className="title-header" style={{ display: 'flex' }}>
        <div>
          <h2>Security Monitor</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Suspicious activity, economy heatmap and item duplication detection</p>
        </div>
      </div>
      <SecurityClient />
    </div>
  );
}
