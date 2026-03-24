const PLUGINS = [
  { slug: 'token-shop',  name: 'Token Shop',    href: '/token-shop',  description: 'Buy tokens with real money & redeem for VIP, diamonds and more', version: '1.0', enabled: true },
  { slug: 'marketplace', name: 'Marketplace',   href: '/marketplace', description: 'Player-to-player trading marketplace',                    version: '2.0', enabled: true },
  { slug: 'auction',     name: 'Auction House', href: '/auction',     description: 'Live item auctions, bid on official and player listings',  version: '1.0', enabled: true },
  { slug: 'gambling',    name: 'Gambling',      href: '/gambling',    description: 'Casino games and case openings',                          version: '2.4', enabled: true },
  { slug: 'forum',       name: 'Forum',         href: '/forum',       description: 'Community forum, contests and discussions',               version: '1.3', enabled: true },
  { slug: 'badges',      name: 'Badge Maker',   href: '/badges',      description: 'Design and create custom hotel badges',                   version: '1.7', enabled: true },
];

export async function isPluginEnabled(slug) {
  try {
    const { queryOne } = await import('./db');
    const row = await queryOne('SELECT `value` FROM cms_settings WHERE `key` = ?', ['plugin_' + slug]);
    if (row) return row.value == 1;
  } catch {}
  const p = PLUGINS.find(p => p.slug === slug);
  return p ? p.enabled : true;
}

export function getAllPlugins() {
  return PLUGINS.map(p => ({ ...p, removable: !p.core }));
}

export default PLUGINS;
