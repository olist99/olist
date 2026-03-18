import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LogsClient from './LogsClient';

export const metadata = { title: 'Admin Action Log' };

export default async function LogsPage() {
  const user = await getCurrentUser();
  if (!user || user.rank < 6) redirect('/admin');
  return (
    <div className="animate-fade-up">
      <div className="title-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <h2>Admin Action Log</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Every admin action is logged here — visible to rank 6+ only
          </p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, background: 'rgba(239,88,86,0.15)', color: '#EF5856', border: '1px solid rgba(239,88,86,0.3)' }}>RANK 6+</span>
      </div>
      <LogsClient />
    </div>
  );
}
