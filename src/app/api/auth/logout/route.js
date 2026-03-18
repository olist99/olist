import { clearSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  // clearSession now also bumps the token version, so the old token
  // is immediately invalid even if someone cached it.
  await clearSession();
  return NextResponse.json({ success: true });
}
