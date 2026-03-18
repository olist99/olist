'use client';
import { useState } from 'react';

export default function ReferralPanel({ referralCode, count, max }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost';
  const link = `${siteUrl}/register?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="panel no-hover panel-referral">
      <div>
        <h5 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
          {count}/{max} Referrals
        </h5>
        <p style={{ fontSize: 12, color: '#eeedff', fontWeight: 600, margin: '4px 0 0' }}>
          Help grow by inviting your friends!
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="referral-link">{link}</span>
        <button onClick={copyLink} className="btn" style={{ fontSize: 11, padding: '8px 16px' }}>
          {copied ? ' Copied!' : ' Copy link'}
        </button>
      </div>
    </div>
  );
}
