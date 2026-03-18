import { redirect } from 'next/navigation';
import { getSessionUserId, generateSSOTicket } from '@/lib/auth';

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  const ticket = await generateSSOTicket(userId);
  const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000/client';

  // Redirect to client with SSO ticket
  redirect(`${clientUrl}?sso=${ticket}`);
}
