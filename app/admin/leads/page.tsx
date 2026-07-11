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

  const { data, error } = await supabase
    .from('leads')
    .select('id, email, phone, source, page, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  const leads: Lead[] = !error && data ? (data as Lead[]) : [];

  return (
    <CopilotProvider>
      <Nav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Leads</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
          Email + phone captured from the site popup. {leads.length} total.
        </p>
        <LeadsClient leads={leads} />
      </main>
    </CopilotProvider>
  );
}
