import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query, queryScalar } from '@/lib/db';
import { formatNumber, avatarUrl, badgeUrl, timeAgo } from '@/lib/utils';

import NewsCarousel from '@/components/NewsCarousel';
import ReferralPanel from '@/components/ReferralPanel';
import DailyReward from '@/components/DailyReward';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Home' };

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Generate referral code if user doesn't have one
  let referralCode = '';
  try {
    const rc = await query('SELECT referral_code FROM users WHERE id = ?', [user.id]);
    if (rc[0]?.referral_code) {
      referralCode = rc[0].referral_code;
    } else {
      const crypto = require('crypto');
      referralCode = crypto.randomUUID();
      await query('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, user.id]);
    }
  } catch (e) { referralCode = 'setup-referrals'; }

  let referralCount = 0;
  let referralMax = 5;
  try {
    referralCount = parseInt(await queryScalar('SELECT COUNT(*) FROM cms_referrals WHERE referrer_id = ?', [user.id]) || '0');
    referralMax = parseInt(await queryScalar("SELECT `value` FROM cms_settings WHERE `key` = 'referral_max'") || '5');
  } catch (e) {}

  let news = [], rares = [], campaigns = [], onlineUsers = [], badges = [];
  try {
    [news, rares, campaigns, onlineUsers, badges] = await Promise.all([
      query('SELECT n.*, u.username AS author_name FROM cms_news n JOIN users u ON u.id = n.author_id ORDER BY n.pinned DESC, n.created_at DESC LIMIT 5').catch(() => []),
      query('SELECT * FROM cms_rare_values ORDER BY updated_at DESC LIMIT 4').catch(() => []),
      query('SELECT * FROM cms_campaigns WHERE active = 1 ORDER BY id DESC LIMIT 3').catch(() => []),
      query("SELECT id, username, look FROM users WHERE online = '1' ORDER BY RAND() LIMIT 10").catch(() => []),
      query('SELECT badge_code FROM users_badges WHERE user_id = ? LIMIT 5', [user.id]).catch(() => []),
    ]);
  } catch (e) {}

  const HABBO_IMG = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

  return (
    <div className="animate-fade-up">
      {/* Main Grid: Profile Card + News */}
      <div className="r-grid-home">

        {/* ── Profile Card ── */}
        <div className="user-card no-hover">
          <div className="user-card-header">
            <img className="user-card-avatar" src={avatarUrl(user.look, 'direction=2&head_direction=3&action=wlk&gesture=sml')} alt="" />
            <div className="user-card-name">{user.username}</div>
            <div className="user-card-motto">{user.motto || 'No motto set'}</div>
            <div className="user-badges-row">
              {badges.map((b, i) => (
                <div key={i} className="user-badge">
                  <img src={badgeUrl(b.badge_code)} alt={b.badge_code} />
                </div>
              ))}
              {badges.length === 0 && <span style={{ fontSize: 11, color: '#aaa' }}>No badges yet</span>}
            </div>
          </div>
          <div className="user-card-body">
            {[
              { label: 'Credits', val: user.credits, bg: '#bda75e', icon: '/images/coin.png' },
              { label: 'Duckets', val: user.pixels, bg: '#9a65af', icon: '/images/ducket.png' },
              { label: 'Diamonds', val: user.points, bg: '#7eb4a9', icon: '/images/diamond.png' },
               { label: 'GOTW', val: user.gotw, bg: '#ad5460', icon: '/images/eventpoint.png' },
            ].map((c, i) => (
              <div key={i} className="currency-row">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="currency-icon" style={{ background: c.bg }}><img src={c.icon} alt="" className="icon-pixelated" /></div>
                  <span className="currency-label">{c.label} :</span>
                </div>
                <span className="currency-value">{formatNumber(c.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div>
          {/* News Carousel */}
          <NewsCarousel news={news.slice(0, 4).map(n => ({
            id: n.id, title: n.title, short_desc: n.short_desc, tag: n.tag, image: n.image
          }))} />

          

          {/* Referral Panel */}
          <ReferralPanel referralCode={referralCode} count={referralCount} max={referralMax} />
        </div>
      </div>

        {/* Daily Reward */}
          <DailyReward />
      {/* ── Bottom Grid: Campaigns + Friends ── */}
      <div className="r-grid-2-asym" style={{ marginBottom: 30 }}>
        {/* Hot Campaigns */}
        <div className="panel no-hover" style={{ padding: '16px 24px' }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <div>
              <h5 style={{ color: '#fff', fontSize: 16, margin: 0 }}>Hot Campaigns</h5>
              <p style={{ fontSize: 12, color: '#d9d9d9' }}>New furniture lines, events, and more!</p>
            </div>
          </div>
          {campaigns.map((c) => (
            <div key={c.id} className="campaign-item">
              {c.image ? <img src={c.image} alt="" /> : <span style={{ fontSize: 28, width: 44, textAlign: 'center' }}></span>}
              <div>
                <h6>{c.name}</h6>
                <p>{c.description || 'Desc'}</p>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <p style={{ color: '#bdbdbd', fontSize: 12 }}>No active campaigns.</p>}
        </div>

        {/* Friends Online */}
        <div className="panel no-hover" style={{ padding: '16px 24px' }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <div>
              <h5 style={{ color: '#fff', fontSize: 16, margin: 0 }}>Friends Online</h5>
              <p style={{ fontSize: 12, color: '#d9d9d9' }}>Users currently online right now!</p>
            </div>
          </div>
          <div className="friends-grid">
            {onlineUsers.map((ou) => (
              <Link key={ou.id} href={`/profile/${ou.username}`} className="friend-item no-underline">
                <img src={`${HABBO_IMG}?figure=${ou.look}&action=std&direction=3&head_direction=3&img_format=png&gesture=std&headonly=1&size=s`} alt="" />
                <p>{ou.username}</p>
              </Link>
            ))}
            {onlineUsers.length === 0 && <p style={{ color: '#bdbdbd', fontSize: 12 }}>No users online.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
