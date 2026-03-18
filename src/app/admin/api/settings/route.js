import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.rank < 6) {
    return NextResponse.redirect(new URL('/admin?error=Unauthorized', request.url));
  }

  const formData = await request.formData();
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('setting_')) {
      const settingKey = key.replace('setting_', '');
      await query(
        'INSERT INTO cms_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [settingKey, value, value]
      );
    }
  }

  return NextResponse.redirect(new URL('/admin?tab=settings&success=Settings+saved', request.url));
}
