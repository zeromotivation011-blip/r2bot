import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AtlasAdminClient, type AtlasListItem } from './AtlasAdminClient';

export const metadata: Metadata = {
  title: 'Atlas · Content Manager',
  description: 'Create and edit Atlas entries.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminAtlasPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/atlas');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') {
    redirect('/dashboard');
  }

  const { data, error } = await supabase
    .from('atlas_entries')
    .select('id, type, slug, title, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(3000);

  const items: AtlasListItem[] = !error && data ? (data as AtlasListItem[]) : [];
  const tableMissing = !!error;

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Content Manager · Atlas</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
          {tableMissing
            ? 'The atlas_entries table isn’t set up yet — run migration 0032, then `npm run migrate:atlas`.'
            : `${items.length} entries. Create new ones or edit any entry below.`}
        </p>
        <AtlasAdminClient items={items} />
      </main>
    </>
  );
}
