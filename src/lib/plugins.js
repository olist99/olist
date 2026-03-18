// Plugin registry — controls what appears in the Admin > Plugins tab.
// Nav items are now managed directly in src/components/Header.jsx.

const PLUGINS = [
  { slug: 'shop',        name: 'Shop',          href: '/shop',        description: 'Purchase items with in-game currency',        version: '1.2', enabled: true },
  { slug: 'marketplace', name: 'Marketplace',   href: '/marketplace', description: 'Player-to-player trading marketplace',        version: '2.0', enabled: true },
  { slug: 'auction',     name: 'Auction House', href: '/auction',     description: 'Live item auctions — bid on official and player listings', version: '1.0', enabled: true },
  { slug: 'gambling',    name: 'Gambling',      href: '/gambling',    description: 'Casino games and case openings',              version: '2.4', enabled: true },
  { slug: 'forum',       name: 'Forum',         href: '/forum',       description: 'Community forum, contests and discussions',   version: '1.3', enabled: true },
  { slug: 'badges',      name: 'Badge Maker',   href: '/badges',      description: 'Design and create custom hotel badges',       version: '1.7', enabled: true },
  { slug: 'help',        name: 'Rules & Help',  href: '/rules',       description: 'Hotel rules and support tickets',             version: '1.1', enabled: true },
];

// Async — checks cms_settings for DB-backed toggle, falls back to static config
export async function isPluginEnabled(slug) {
  try {
    const { queryOne } = await import('@/lib/db');
    const row = await queryOne('SELECT `value` FROM cms_settings WHERE `key` = ?', [`plugin_${slug}`]);
    if (row) return row.value === '1';
  } catch {}
  const p = PLUGINS.find(p => p.slug === slug);
  return p ? p.enabled : false;
}

export function getAllPlugins() {
  return PLUGINS.map(p => ({ ...p, removable: !p.core }));
}

export default PLUGINS;
