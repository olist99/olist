import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CatalogManager from './CatalogManager';

export const metadata = { title: 'Catalog Manager' };

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) redirect('/');
  return (
    <div className="animate-fade-up">
      <div className="title-header" style={{ display: 'flex' }}>
        <div>
          <h2>Catalog Manager</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Edit catalog pages, items and prices</p>
        </div>
      </div>
      <CatalogManager />
    </div>
  );
}
