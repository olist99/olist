'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { formatNumber } from '@/lib/utils';
import { Suspense, useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';

// ── Top nav items — edit here to add/remove/reorder ──
// slug matches the plugin slug in plugins.js — null means always shown (core page)
const NAV_ITEMS = [
  { href: '/community',   label: 'Community',    icon: '/images/nav-community.png',    slug: null },
  { href: '/shop',        label: 'Shop',         icon: '/images/nav-shop.png',         slug: 'shop' },
  { href: '/marketplace', label: 'Marketplace',  icon: '/images/nav-marketplace.png',  slug: 'marketplace' },
  { href: '/auction',     label: 'Auction',      icon: '/images/nav-marketplace.png',  slug: 'auction' },
  { href: '/gambling',    label: 'Gambling',     icon: '/images/nav-gambling.png',     slug: 'gambling' },
  { href: '/forum',       label: 'Forum',        icon: '/images/nav-forum.png',        slug: 'forum' },
  { href: '/rules',       label: 'Rules & Help', icon: '/images/nav-help.png',         slug: 'help' },
];

const COMMUNITY_ITEMS = [
  { href: '/community',    label: 'Overview',     exact: true },
  { href: '/news',         label: 'News' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/online',       label: 'Online' },
  { href: '/staff',        label: 'Staff' },
  { href: '/rares',        label: 'Rare Values' },
  { href: '/badges',       label: 'Badge Maker' },
  { href: '/camera',       label: 'Camera' },
];

const SUB_NAVS = {
  '/': [
    { href: '/',         label: 'Home',       exact: true },
    { href: '/profile',  label: 'My Profile', useUsername: true },
    { href: '/settings', label: 'Settings' },
  ],
  '/profile':      [{ href: '/', label: 'Home' }, { href: '/profile', label: 'My Profile', useUsername: true }, { href: '/settings', label: 'Settings' }],
  '/settings':     [{ href: '/', label: 'Home' }, { href: '/profile', label: 'My Profile', useUsername: true }, { href: '/settings', label: 'Settings' }],
  '/badges':       COMMUNITY_ITEMS,
  '/community':    COMMUNITY_ITEMS,
  '/news':         COMMUNITY_ITEMS,
  '/leaderboards': COMMUNITY_ITEMS,
  '/online':       COMMUNITY_ITEMS,
  '/staff':        COMMUNITY_ITEMS,
  '/rares':        COMMUNITY_ITEMS,
  '/forum': [
    { href: '/forum', label: 'Forum', exact: true },
  ],
  '/shop': [
    { href: '/shop', label: 'All Items', exact: true },
  ],
  '/marketplace': [
    { href: '/marketplace',          label: 'Browse' },
    { href: '/marketplace?tab=my',   label: 'My Listings', param: 'tab', paramVal: 'my' },
    { href: '/marketplace?tab=sell', label: 'Sell Item',   param: 'tab', paramVal: 'sell' },
  ],
  '/auction': [
    { href: '/auction', label: 'Auction House', exact: true },
  ],
  '/gambling': [
    { href: '/gambling',           label: 'Live Feed', exact: true },
    { href: '/gambling/roulette',  label: 'Roulette' },
    { href: '/gambling/coinflip',  label: 'Coin Toss' },
    { href: '/gambling/blackjack', label: 'Blackjack' },
    { href: '/gambling/dice',      label: 'Dice Duel' },
    { href: '/gambling/highcard',  label: 'High Card' },
    { href: '/gambling/cases',     label: 'Cases' },
  ],
  '/rules': [
    { href: '/rules',                label: 'Rules',         exact: true },
    { href: '/rules/faq',            label: 'FAQ' },
    { href: '/rules/tickets',        label: 'My Tickets' },
    { href: '/rules/tickets/create', label: 'Create Ticket' },
  ],
  '/admin': [
    { href: '/admin',            label: 'Housekeeping' },
    { href: '/admin/catalog',    label: 'Catalog' },
    { href: '/admin/furniture',  label: 'Furniture' },
    { href: '/admin/security',   label: 'Security' },
    { href: '/admin/logs',       label: 'Action Log' },
  ],
};

const COMMUNITY_PATHS = ['/community', '/news', '/leaderboards', '/online', '/staff', '/rares', '/badges', '/camera'];

function getSubNav(path) {
  if (SUB_NAVS[path]) return SUB_NAVS[path];
  const keys = Object.keys(SUB_NAVS).sort((a, b) => b.length - a.length);
  for (const key of keys) { if (key !== '/' && path.startsWith(key)) return SUB_NAVS[key]; }
  return SUB_NAVS['/'];
}

function getActiveNav(path) {
  if (COMMUNITY_PATHS.some(p => path.startsWith(p))) return '/community';
  if (path.startsWith('/shop'))        return '/shop';
  if (path.startsWith('/marketplace')) return '/marketplace';
  if (path.startsWith('/auction'))     return '/auction';
  if (path.startsWith('/gambling'))    return '/gambling';
  if (path.startsWith('/forum'))       return '/forum';
  if (path.startsWith('/rules'))       return '/rules';
  if (path.startsWith('/admin'))       return '/admin';
  return null;
}

function AvatarHead({ look, size = 34 }) {
  if (!look) return <img src="/images/nav-profile.png" alt="" style={{ imageRendering: 'pixelated', width: size, height: size }} />;
  const url = `https://www.habbo.com/habbo-imaging/avatarimage?figure=${encodeURIComponent(look)}&direction=2&head_direction=2&gesture=sml&action=std&headonly=1&size=s`;
  return (
    <img src={url} alt="" width={size} height={size}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={e => { e.target.src = '/images/nav-profile.png'; }} />
  );
}

function SubNavInner({ user, path }) {
  const searchParams = useSearchParams();
  const subNavItems = getSubNav(path);
  const isActive = (item) => {
    if (item.useUsername) return path.startsWith('/profile');
    if (item.param) return path.startsWith(item.href.split('?')[0]) && searchParams.get(item.param) === item.paramVal;
    if (item.exact) return path === item.href;
    const basePath = item.href.split('?')[0];
    if (path === basePath || path.startsWith(basePath + '/')) {
      const firstSibling = subNavItems.find(s => s.param && s.href.split('?')[0] === basePath);
      if (firstSibling) return !searchParams.get(firstSibling.param);
      return true;
    }
    return false;
  };
  return subNavItems.map((item, i) => {
    const href = item.useUsername && user ? `/profile/${user.username}` : item.href;
    return <Link key={i} href={href} className={isActive(item) ? 'active' : ''}>{item.label}</Link>;
  });
}

export default function Header({ user, onlineCount, enabledPlugins = null }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [path]);

  // Filter nav items based on enabled plugins (null slug = always shown)
  const visibleNavItems = enabledPlugins
    ? NAV_ITEMS.filter(item => item.slug === null || enabledPlugins.includes(item.slug))
    : NAV_ITEMS;

  const activeNav = getActiveNav(path);
  const isNavActive = (href) => {
    if (COMMUNITY_PATHS.some(p => href === p)) return COMMUNITY_PATHS.some(p => path.startsWith(p)) && href === '/community';
    if (href === '/') return false;
    return path.startsWith(href);
  };
  const isUserTabActive = activeNav === null && user;
  const subNavItems = getSubNav(path);

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    if (res.ok) window.location.href = '/login';
  };

  return (
    <>
      <div className="header-background" />
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <header className="header-top">
          <div>
            <Link href="/" className="header-logo"><img src="/images/logo.png" /></Link>
            <div style={{ marginTop: 8 }}>
              <span className="users-online-badge"><b>{formatNumber(onlineCount || 0)}</b> User&apos;s Online</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* Desktop-only actions */}
            <div className="header-desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {user ? (
                <>
                  {user.rank >= 4 && (
                    <Link href="/admin" className="header-tab-btn hk-btn" title="Housekeeping">
                      <img src="/images/icon-housekeeping.png" alt="" style={{ imageRendering: 'pixelated' }} />
                    </Link>
                  )}
                  <NotificationBell />
                  <button className="header-tab-btn logout-btn" onClick={handleLogout}>
                    <img src="/images/icon-logout.png" alt="" style={{ imageRendering: 'pixelated' }} />
                  </button>
                  <form action="/api/sso" method="POST" style={{ display: 'inline', marginLeft: 8 }}>
                    <button type="submit" className="btn-enterhotel">Enter Hotel</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-login">Log In</Link>
                  <Link href="/register" className="btn-enterhotel" style={{ marginLeft: 8 }}>Register</Link>
                </>
              )}
            </div>
            {/* Hamburger button — mobile only */}
            <button className="hamburger-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
              <span className={mobileOpen ? 'open' : ''} />
              <span className={mobileOpen ? 'open' : ''} />
              <span className={mobileOpen ? 'open' : ''} />
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mobile-nav-menu animate-fade-up">
            {user && (
              <Link href="/" className="mobile-nav-user" onClick={() => setMobileOpen(false)}>
                <AvatarHead look={user.look} size={36} />
                <span>{user.username}</span>
              </Link>
            )}
            <div className="mobile-nav-divider">Pages</div>
            {visibleNavItems.map(item => (
              <Link key={item.href} href={item.href}
                className={`mobile-nav-item${isNavActive(item.href) ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}>
                {item.icon && <img src={item.icon} alt="" />}
                {item.label}
              </Link>
            ))}
            {subNavItems.length > 1 && (
              <>
                <div className="mobile-nav-divider">Section</div>
                {subNavItems.map((item, i) => {
                  const href = item.useUsername && user ? `/profile/${user.username}` : item.href;
                  return (
                    <Link key={i} href={href} className="mobile-nav-subitem" onClick={() => setMobileOpen(false)}>
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
            <div className="mobile-nav-divider" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }} />
            <div className="mobile-nav-actions">
              {user ? (
                <>
                  <form action="/api/sso" method="POST">
                    <button type="submit" className="btn-enterhotel" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Enter Hotel</button>
                  </form>
                  {user.rank >= 4 && (
                    <Link href="/admin" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', marginTop: 8 }} onClick={() => setMobileOpen(false)}>Housekeeping</Link>
                  )}
                  <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-login" style={{ width: '100%', textAlign: 'center' }} onClick={() => setMobileOpen(false)}>Log In</Link>
                  <Link href="/register" className="btn-enterhotel" style={{ width: '100%', textAlign: 'center', display: 'block', marginTop: 8 }} onClick={() => setMobileOpen(false)}>Register</Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Desktop nav */}
        <nav className="navigation-bar animate-fade-up">
          <ul>
            {user && (
              <li style={isUserTabActive ? { background: 'rgba(26,25,36,0.37)', boxShadow: 'inset 0 -2px var(--green)' } : {}}>
                <Link href="/">
                  <div className="nav-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <AvatarHead look={user.look} size={34} />
                  </div>
                  <div>{user.username}</div>
                </Link>
              </li>
            )}
            {visibleNavItems.map(item => (
              <li key={item.href} style={isNavActive(item.href) ? { background: 'rgba(26,25,36,0.37)', boxShadow: 'inset 0 -2px var(--green)' } : {}}>
                <Link href={item.href}>
                  <div className="nav-icon">
                    {item.icon && <img src={item.icon} alt="" style={{ imageRendering: 'pixelated' }} />}
                  </div>
                  <div>{item.label}</div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sub-navbar animate-fade-up">
          {user
            ? <Suspense fallback={null}><SubNavInner user={user} path={path} /></Suspense>
            : (
              <>
                <Link href="/login"    className={path === '/login'    ? 'active' : ''}>Login</Link>
                <Link href="/register" className={path === '/register' ? 'active' : ''}>Register</Link>
              </>
            )
          }
        </div>
      </div>
    </>
  );
}
