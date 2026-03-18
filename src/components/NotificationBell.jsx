'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const TYPE_ICONS = {
  marketplace_sold:  '/images/noti/market_sold_noti.png',
  marketplace_offer: '/images/noti/market_offer_noti.png',
  auction_outbid:    '/images/noti/auction_out_noti.png',
  auction_won:       '/images/noti/auction_won_noti.png',
  auction_sold:      '/images/noti/auction_sold_noti.png',
  auction_new:       '/images/noti/official_noti.png',
  camera_like:       '/images/noti/camera_noti.png',
  forum_reply:       '/images/noti/forum_noti.png',
  news_comment:      '/images/noti/news_noti.png',
  gift:              '/images/noti/gift_noti.png',
  daily_reward:      '/images/noti/daily_noti.png',
  general:           '/images/noti/general_noti.png',
};

function timeAgo(str) {
  if (!str) return '';
  const diff = Math.floor((Date.now() - new Date(str)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread: 0, notifications: [] });
  const [dropdownPos, setDropdownPos] = useState({ top: 70, right: 16 });
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      setData(d);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click — checks both button and dropdown
  useEffect(() => {
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(o => !o);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) });
    setData(d => ({ ...d, unread: 0, notifications: d.notifications.map(n => ({ ...n, is_read: 1 })) }));
  };

  const markRead = async (id) => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', id }) });
    setData(d => ({ ...d, unread: Math.max(0, d.unread - 1), notifications: d.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n) }));
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="header-tab-btn"
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <img src="/images/noti/bell_noti.png" alt="Notifications" style={{ width: 20, height: 20, imageRendering: 'pixelated' }} />
        {data.unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: '#EF5856', color: '#fff',
            fontSize: 9, fontWeight: 800,
            borderRadius: '50%', width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="notif-dropdown"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <div className="notif-header">
            <span>Notifications</span>
            {data.unread > 0 && (
              <button onClick={markAllRead} className="notif-mark-all">Mark all read</button>
            )}
          </div>

          {data.notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No notifications yet.
            </div>
          ) : (
            <div className="notif-list">
              {data.notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                >
                  <span className="notif-icon">
                    <img src={TYPE_ICONS[n.type] || TYPE_ICONS.general} alt="" />
                  </span>
                  <div className="notif-body">
                    {n.title && <div className="notif-title">{n.title}</div>}
                    {n.message && <div className="notif-message">{n.message}</div>}
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                  {n.link && (
                    <Link href={n.link} onClick={() => setOpen(false)} style={{ fontSize: 10, color: 'var(--green)', flexShrink: 0 }}>View →</Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
