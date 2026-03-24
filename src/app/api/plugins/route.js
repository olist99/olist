import { NextResponse } from 'next/server';
import { getAllPlugins } from '@/lib/plugins';
import { queryOne } from '@/lib/db';

export async function GET() {
  const all = getAllPlugins();
  const enabled = [];
  for (const p of all) {
    try {
      const row = await queryOne(
        'SELECT `value` FROM cms_settings WHERE `key` = ?',
        ['plugin_' + p.slug]
      );
      if (row ? row.value === '1' : p.enabled) {
        enabled.push(p.slug);
      }
    } catch {
      if (p.enabled) enabled.push(p.slug);
    }
  }
  return NextResponse.json({ enabled });
}
