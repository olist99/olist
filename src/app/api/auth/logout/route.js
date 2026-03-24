// app/api/logout/route.ts
import { clearSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  // Clear session cookie via your helper
  await clearSession();

  // Return a JSON response; client will handle redirect
  return NextResponse.json({ success: true });
}