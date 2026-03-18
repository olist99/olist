import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { queryScalar } from '@/lib/db';
import DashboardSection from './sections/DashboardSection';
import UsersSection from './sections/UsersSection';
import ModerationSection from './sections/ModerationSection';
import EconomySection from './sections/EconomySection';
import HotelContentSection from './sections/HotelContentSection';
import RoomsSection from './sections/RoomsSection';
import EventsSection from './sections/EventsSection';
import CommunitySection from './sections/CommunitySection';
import PluginsSection from './sections/PluginsSection';
import GamblingSection from './sections/GamblingSection';
import LogsSection from './sections/LogsSection';
import SettingsSection from './sections/SettingsSection';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Housekeeping' };

// Legacy tab → new section/view mapping
const TAB_MAP = {
  'news':         { tab: 'community',  view: null },
  'news-create':  { tab: 'community',  view: 'news-create' },
  'news-edit':    { tab: 'community',  view: 'news-edit' },
  'referrals':    { tab: 'community',  view: 'referrals' },
  'tickets':      { tab: 'moderation', view: 'reports' },
  'shop':         { tab: 'economy',    view: null },
  'shop-create':  { tab: 'economy',    view: 'shop-create' },
  'shop-edit':    { tab: 'economy',    view: 'shop-edit' },
  'cases':        { tab: 'economy',    view: 'cases' },
  'case-create':  { tab: 'economy',    view: 'case-create' },
  'case-edit':    { tab: 'economy',    view: 'case-edit' },
  'events':       { tab: 'events',     view: null },
  'event-create': { tab: 'events',     view: 'create' },
  'event-edit':   { tab: 'events',     view: 'edit' },
  'user-profile': { tab: 'users',      view: 'profile' },
  'plugins':      { tab: 'plugins',    view: null },
  'settings':     { tab: 'settings',   view: null },
};

const SECTIONS = [
  { label: 'Dashboard',            key: 'dashboard',     minRank: 3, views: [
    { label: 'Overview',                  view: null },
    { label: 'Users Online',              view: 'users-online' },
    { label: 'New Registrations (24h)',   view: 'registrations' },
    { label: 'Credits Generated Today',   view: 'credits-today' },
    { label: 'Marketplace Volume',        view: 'marketplace-vol' },
    { label: 'Active Rooms',             view: 'active-rooms' },
    { label: 'Open Support Tickets',      view: 'open-tickets' },
    { label: 'Auction House',             view: 'auction-house' },
    { label: 'Forum Posts Volume',        view: 'forum-volume' },
    { label: 'Plugin Volume',             view: 'plugin-volume' },
  ]},
  { label: 'User Management',      key: 'users',         minRank: 4, views: [
    { label: 'Search Users',              view: null },
    { label: 'Edit User Profiles',        view: 'profile' },
    { label: 'Change Ranks',              view: 'ranks' },
    { label: 'Give Credits',              view: 'give-credits' },
    { label: 'Give Badges',               view: 'give-badges' },
    { label: 'Ban / Unban',               view: 'bans' },
    { label: 'View Inventory',            view: 'inventory' },
    { label: 'View Login History',        view: 'login-history' },
    { label: 'Multi-Account Detection',   view: 'multi-accounts' },
    { label: 'IP History',                view: 'ip-history' },
    { label: 'Device Fingerprint',        view: 'fingerprint' },
  ]},
  { label: 'Moderation Tools',     key: 'moderation',    minRank: 4, views: [
    { label: 'Chat Logs',                 view: null },
    { label: 'Room Logs',                 view: 'room-logs' },
    { label: 'Report Center',             view: 'reports' },
    { label: 'Warning System',            view: 'warnings' },
    { label: 'Ban Management',            view: 'bans' },
    { label: 'Word Filter Manager',       view: 'word-filter' },
    { label: 'Auto Spam Detection',       view: 'spam-detection' },
  ]},
  { label: 'Economy Management',   key: 'economy',       minRank: 5, views: [
    { label: 'Shop Manager',              view: null },
    { label: 'Rare Releases',             view: 'rare-releases' },
    { label: 'Marketplace Listings',      view: 'marketplace' },
    { label: 'Auction House',             href: '/auction' },
    { label: 'Credit Statistics',         view: 'credit-stats' },
    { label: 'Item Circulation',          view: 'item-circulation' },
    { label: 'Rare Value Tracker',        href: '/rares' },
    { label: 'Marketplace Analytics',     view: 'analytics' },
    { label: 'Economy Alerts',            view: 'alerts' },
  ]},
  { label: 'Hotel Content',        key: 'hotel-content', minRank: 5, views: [
    { label: 'Catalog Editor',            href: '/admin/catalog' },
    { label: 'Furniture Manager',         href: '/admin/furniture' },
    { label: 'Badge Manager',             view: 'badges' },
    { label: 'Navigator Categories',      view: 'navigator' },
    { label: 'Achievements Manager',      view: 'achievements' },
  ]},
  { label: 'Room Management',      key: 'rooms',         minRank: 4, views: [
    { label: 'Search Rooms',              view: null },
    { label: 'Delete Rooms',              view: 'delete' },
    { label: 'Edit Room Settings',        view: 'edit' },
    { label: 'View Room Logs',            view: 'logs' },
    { label: 'Feature Rooms',             view: 'feature' },
  ]},
  { label: 'Event Management',     key: 'events',        minRank: 3, views: [
    { label: 'Schedule Events',           view: null },
    { label: 'Create Competition',        view: 'create' },
    { label: 'Event Currency Control',    view: 'currency' },
    { label: 'Quest Editor',              view: 'quests' },
    { label: 'Badge Rewards',             view: 'badge-rewards' },
  ]},
  { label: 'Community Management', key: 'community',     minRank: 4, views: [
    { label: 'News',                      view: null },
    { label: 'Referrals',                 view: 'referrals' },
    { label: 'Forum Moderation',          view: 'forum' },
    { label: 'Report Posts',              view: 'report-posts' },
    { label: 'User Guestbooks',           view: 'guestbooks' },
    { label: 'Community Contests',        view: 'contests' },
  ]},
  { label: 'Gambling',             key: 'gambling',      minRank: 5, views: [
    { label: 'Statistics',                view: null },
    { label: 'Case Builder',              view: 'cases' },
    { label: 'Recent Logs',              view: 'logs' },
  ]},
  { label: 'Plugins',              key: 'plugins',       minRank: 6, views: [
    { label: 'Plugin Manager',            view: null },
  ]},
  { label: 'Logs & Auditing',      key: 'logs',          minRank: 4, views: [
    { label: 'Staff Actions',             view: null },
    { label: 'Credit Edits',              view: 'credit-edits' },
    { label: 'Rank Changes',              view: 'rank-changes' },
    { label: 'Rare Spawns',               view: 'rare-spawns' },
  ]},
  { label: 'Settings',             key: 'settings',      minRank: 6, views: [
    { label: 'Site Settings',             view: null },
  ]},
];

export default async function AdminPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user || user.rank < 4) redirect('/');

  const sp = await searchParams;
  const rawTab = sp?.tab || 'dashboard';
  const rawView = sp?.view ?? null;

  const mapped = TAB_MAP[rawTab];
  const tab  = mapped ? mapped.tab  : rawTab;
  const view = mapped ? (mapped.view ?? rawView) : rawView;

  const success = sp?.success;
  const error   = sp?.error;

  const [onlineUsers, openTickets] = await Promise.all([
    queryScalar("SELECT COUNT(*) FROM users WHERE online = '1'"),
    queryScalar("SELECT COUNT(*) FROM cms_tickets WHERE status = 'open'").catch(() => 0),
  ]);

  return (
    <div className="animate-fade-up">
      <div className="title-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Housekeeping</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Welcome back, {user.username} · Rank {user.rank}{user.rank_name ? ` — ${user.rank_name}` : ''}
          </p>
        </div>
      </div>

      {success && <div className="flash flash-success" style={{ marginBottom: 16 }}>{decodeURIComponent(success).replace(/[<>]/g, '')}</div>}
      {error   && <div className="flash flash-error"   style={{ marginBottom: 16 }}>{decodeURIComponent(error).replace(/[<>]/g, '')}</div>}

      <div className="adm-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Sidebar ── */}
        <div>
          <details className="adm-sidebar-toggle">
            <summary className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              ☰ Menu — {SECTIONS.find(s => s.key === tab)?.label || 'Navigation'}
            </summary>
            <div className="bg-bg-secondary border border-border rounded-lg" style={{ marginTop: 8, overflow: 'hidden' }}>
              {SECTIONS.filter(s => user.rank >= s.minRank).map(s => {
                const isActive = s.key === tab;
                return (
                  <div key={s.key}>
                    <Link href={`/admin?tab=${s.key}`} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                      color: isActive ? 'var(--green)' : 'var(--text-primary)',
                      background: isActive ? 'rgba(52,189,89,0.07)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--green)' : '2px solid transparent',
                    }}>
                      {s.label}
                    </Link>
                    {isActive && (
                      <div style={{ background: 'rgba(0,0,0,0.15)', paddingBottom: 4 }}>
                        {s.views.map((sv, i) => {
                          if (sv.href) return (
                            <a key={i} href={sv.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 6px 22px', fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                              {sv.label} <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>↗</span>
                            </a>
                          );
                          const isViewActive = view === sv.view || (sv.view === null && view === null);
                          return (
                            <Link key={i} href={`/admin?tab=${s.key}${sv.view ? `&view=${sv.view}` : ''}`} style={{
                              display: 'block', padding: '6px 14px 6px 22px', fontSize: 11, textDecoration: 'none',
                              fontWeight: isViewActive ? 700 : 500,
                              color: isViewActive ? 'var(--green)' : 'var(--text-secondary)',
                            }}>
                              {sv.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                );
              })}
            </div>
          </details>
          <div className="bg-bg-secondary border border-border rounded-lg adm-sidebar-desktop" style={{ position: 'sticky', top: 20, overflow: 'hidden' }}>
          {SECTIONS.filter(s => user.rank >= s.minRank).map(s => {
            const isActive = s.key === tab;
            return (
              <div key={s.key}>
                <Link href={`/admin?tab=${s.key}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                  color: isActive ? 'var(--green)' : 'var(--text-primary)',
                  background: isActive ? 'rgba(52,189,89,0.07)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--green)' : '2px solid transparent',
                  transition: 'all .12s',
                }}>
                  {s.label}
                  {s.key === 'moderation' && openTickets > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#f5a623', color: '#000', padding: '1px 6px', borderRadius: 10 }}>{openTickets}</span>
                  )}
                  {s.key === 'dashboard' && onlineUsers > 0 && !isActive && (
                    <span style={{ fontSize: 9, color: 'var(--green)', opacity: 0.8 }}>{onlineUsers} online</span>
                  )}
                </Link>

                {isActive && (
                  <div style={{ background: 'rgba(0,0,0,0.15)', paddingBottom: 4 }}>
                    {s.views.map((sv, i) => {
                      if (sv.href) return (
                        <a key={i} href={sv.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 6px 22px', fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                          {sv.label} <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>↗</span>
                        </a>
                      );
                      const isViewActive = view === sv.view || (sv.view === null && view === null);
                      return (
                        <Link key={i} href={`/admin?tab=${s.key}${sv.view ? `&view=${sv.view}` : ''}`} style={{
                          display: 'block', padding: '6px 14px 6px 22px', fontSize: 11, textDecoration: 'none',
                          fontWeight: isViewActive ? 700 : 500,
                          color: isViewActive ? 'var(--green)' : 'var(--text-secondary)',
                          background: isViewActive ? 'rgba(52,189,89,0.06)' : 'transparent',
                        }}>
                          {sv.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            );
          })}
          </div>
        </div>

        {/* ── Main content ── */}
        <div>
          {tab === 'dashboard'     && <DashboardSection    view={view} sp={sp} user={user} />}
          {tab === 'users'         && <UsersSection         view={view} sp={sp} user={user} />}
          {tab === 'moderation'    && <ModerationSection    view={view} sp={sp} user={user} />}
          {tab === 'economy'       && <EconomySection       view={view} sp={sp} user={user} />}
          {tab === 'hotel-content' && <HotelContentSection  view={view} sp={sp} user={user} />}
          {tab === 'rooms'         && <RoomsSection         view={view} sp={sp} user={user} />}
          {tab === 'events'        && <EventsSection        view={view} sp={sp} user={user} />}
          {tab === 'community'     && <CommunitySection     view={view} sp={sp} user={user} />}
          {tab === 'gambling'      && <GamblingSection      view={view} sp={sp} user={user} />}
          {tab === 'plugins'       && <PluginsSection       view={view} sp={sp} user={user} />}
          {tab === 'logs'          && <LogsSection          view={view} sp={sp} user={user} />}
          {tab === 'settings'      && <SettingsSection      view={view} sp={sp} user={user} />}
        </div>
      </div>
    </div>
  );
}
