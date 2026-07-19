import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LeadsClient, type Lead } from './LeadsClient';

export const metadata: Metadata = {
  title: 'Leads · Admin',
  description: 'Captured leads (email required, phone optional) from the site.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/leads');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') {
    redirect('/dashboard');
  }

  // Read the append-only event log, not the deduplicated person table: one
  // person may have joined three course waitlists, and each of those signals
  // matters more than the fact that they are one person. Falls back to `leads`
  // if migration 0036 has not been applied yet.
  const { data: events, error: eventsErr } = await supabase
    .from('lead_events')
    .select('id, email, name, phone, source, page, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  let leads: Lead[] = [];
  let migrationMissing = false;

  if (!eventsErr && events) {
    leads = events as Lead[];
  } else {
    migrationMissing = true;
    const { data, error } = await supabase
      .from('leads')
      .select('id, email, phone, source, page, created_at')
      .order('created_at', { ascending: false })
      .limit(2000);
    leads = !error && data ? (data as Lead[]) : [];
  }

  return (
    <CopilotProvider>
      <Nav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Leads</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
          Every email captured across the site — popup, course waitlists, school pilots,
          newsletter. {leads.length} signal{leads.length === 1 ? '' : 's'}.
        </p>
        {migrationMissing && (
          <p style={{
            margin: '0 0 20px', padding: '12px 16px', borderRadius: 10, fontSize: 13,
            color: '#fbbf24', background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.3)',
          }}>
            Showing the legacy <code>leads</code> table — migration{' '}
            <code>0036_lead_events.sql</code> has not been applied yet. Course-waitlist and
            school-pilot context will not appear until you run it.
          </p>
        )}
        <LeadsClient leads={leads} />
      </main>
    </CopilotProvider>
  );
}
