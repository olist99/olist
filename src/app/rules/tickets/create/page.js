import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import TicketForm from './TicketForm';

export const metadata = { title: 'Create Ticket' };

export default async function CreateTicketPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="animate-fade-up">
      <div className="panel no-hover" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Create Support Ticket</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Describe your issue and our staff will respond as soon as possible.</p>
      </div>
      <TicketForm />
    </div>
  );
}
