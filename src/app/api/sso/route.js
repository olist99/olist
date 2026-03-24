import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getSessionUserId, generateSSOTicket } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  // FIX #11: Rate limit SSO ticket generation — 10 per minute prevents
  // concurrent request races against the token version table.
  const rl = await checkRateLimit(`sso:${userId}`, 10, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const ticket = await generateSSOTicket(userId);
  const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://nitro.habbo.plus';

  // Redirect to client with SSO ticket
  redirect(`${clientUrl}?sso=${ticket}`);
}
