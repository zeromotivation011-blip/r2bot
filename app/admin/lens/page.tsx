import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LensAdminClient, type LensListItem } from './LensAdminClient';

export const metadata: Metadata = {
  title: 'Lens · Content Manager',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLensPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/lens');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') redirect('/dashboard');

  const { data, error } = await supabase
    .from('lens_entries')
    .select('slug, title, topic, status, published_at')
    .order('published_at', { ascending: false })
    .limit(1000);

  const items: LensListItem[] = !error && data ? (data as LensListItem[]) : [];

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Content Manager · Lens</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
          {error ? 'The lens_entries table isn’t set up yet — run migration 0035.' : `${items.length} curated video summaries.`}
        </p>
        <LensAdminClient items={items} />
      </main>
    </>
  );
}
