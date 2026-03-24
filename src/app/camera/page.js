import { getCurrentUser } from '@/lib/auth';
import CameraClient from './CameraClient';

export const metadata = { title: 'Camera Gallery' };

export default async function CameraPage() {
  const user = await getCurrentUser();
  return (
    <div className="animate-fade-up">
      <div className="title-header" style={{ display: 'flex' }}>
        <div>
          <h2>Camera Gallery</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Share and like your favourite in-game moments</p>
        </div>
      </div>
      <CameraClient userId={user?.id || null} username={user?.username || null} />
    </div>
  );
}
