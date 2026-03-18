export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.rank < 5) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const dir = path.join(process.cwd(), 'public', 'images', 'cases');
    if (!fs.existsSync(dir)) return NextResponse.json({ images: [] });

    const files = fs.readdirSync(dir)
      .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
      .map(f => `/images/cases/${f}`);

    return NextResponse.json({ images: files });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
