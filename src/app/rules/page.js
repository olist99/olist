import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Rules' };

export default async function RulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'OCMS';

  const rules = [
    { title: 'Respect All Users', desc: 'Treat everyone with respect. Harassment, bullying, and discrimination will not be tolerated.' },
    { title: 'No Scamming', desc: 'Scamming other users of their items, currencies, or accounts is strictly prohibited. All trades must be fair.' },
    { title: 'No Inappropriate Content', desc: 'Keep chat and room content family-friendly. No explicit, offensive, or illegal content.' },
    { title: 'No Account Sharing', desc: 'Your account is your responsibility. Do not share login credentials with anyone.' },
    { title: 'No Exploiting Bugs', desc: 'If you find a bug, report it via a support ticket. Exploiting bugs will result in a ban.' },
    { title: 'No Real Money Trading', desc: `Trading ${siteName} items or currencies for real money is not allowed.` },
    { title: 'No Advertising', desc: 'Do not advertise other hotels, websites, or services in chat or rooms.' },
    { title: 'Follow Staff Instructions', desc: 'Staff members are here to help. Follow their instructions and do not argue publicly.' },
    { title: 'Fair Gambling', desc: 'Gambling is for entertainment only. Do not harass users over gambling outcomes.' },
    { title: 'One Account Per Person', desc: 'Multi-accounting is not allowed. Maximum of one account per person.' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="panel no-hover" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{siteName} Rules</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Please read and follow all rules. Breaking them may result in mutes, bans, or account termination.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rules.map((r, i) => (
          <div key={i} className="panel no-hover" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(52,189,89,0.1)', border: '2px solid rgba(52,189,89,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: 'var(--green)',
            }}>{i + 1}</div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{r.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
