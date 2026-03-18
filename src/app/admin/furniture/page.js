import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import FurnitureManager from './FurnitureManager';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Furniture Manager' };

export default async function FurniturePage() {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) redirect('/');
  return (
    <div className="animate-fade-up">
      <div className="title-header" style={{ display: 'flex' }}>
        <div>
          <h2>Furniture Manager</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Add and edit Nitro furniture definitions in items_base</p>
        </div>
      </div>
      <FurnitureManager />
    </div>
  );
}
