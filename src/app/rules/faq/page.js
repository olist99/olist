import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = { title: 'FAQ' };

export default async function FAQPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'OCMS';

  const faqs = [
    { q: 'How do I earn credits?', a: 'You earn credits by being online in the hotel, participating in events, and trading with other users.' },
    { q: 'What are diamonds used for?', a: 'Diamonds are the premium currency used in the Marketplace and Gambling sections.' },
    { q: 'How does the Marketplace work?', a: 'You can sell items from your in-game inventory on the Marketplace. Buyers pay in diamonds and the item is transferred to their inventory.' },
    { q: 'Is gambling fair?', a: 'Yes! All gambling outcomes are generated server-side using random number generation. The house does not have an unfair edge.' },
    { q: 'How do I become staff?', a: 'Staff positions are offered to trusted and active members of the community. Do not ask to be staff.' },
    { q: 'I found a bug, what do I do?', a: 'Create a support ticket under Rules & Help > Create Ticket and select the "Bug Report" category.' },
    { q: 'Can I get a refund on a purchase?', a: 'Refunds are handled on a case-by-case basis. Create a support ticket with details of your purchase.' },
    { q: 'How do I change my username?', a: 'Username changes are not currently supported. Contact staff via a ticket for special circumstances.' },
    { q: 'What are VIP packages?', a: 'VIP packages give you exclusive perks, badges, and extra features in the hotel.' },
    { q: 'How do I report a user?', a: 'Create a support ticket with the username and evidence (screenshots) of the rule violation.' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="panel no-hover" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Frequently Asked Questions</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Can&apos;t find your answer? Create a support ticket.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {faqs.map((f, i) => (
          <details key={i} className="panel no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <summary style={{
              padding: '16px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 12, listStyle: 'none',
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                background: 'rgba(52,189,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, color: 'var(--green)',
              }}>?</span>
              {f.q}
            </summary>
            <div style={{
              padding: '0 20px 16px 56px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7,
            }}>{f.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
