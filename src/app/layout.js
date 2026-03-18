import '@/styles/globals.css';
import { getCurrentUser } from '@/lib/auth';
import { queryScalar } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: { default: 'OCMS', template: '%s - OCMS' },
  description: 'The best Habbo retro experience, powered by Arcturus Emulator',
};

export default async function RootLayout({ children }) {
  let user = null;
  let onlineCount = 0;

  try {
    user = await getCurrentUser();
    onlineCount = await queryScalar("SELECT COUNT(*) FROM users WHERE online = '1'") || 0;
  } catch (e) {}

  return (
    <html lang="en">
      <link rel="icon" type="image/x-icon" href="/images/favicon.ico"></link>
      <body>
        <Header user={user} onlineCount={onlineCount} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
