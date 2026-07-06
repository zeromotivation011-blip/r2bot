import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NewsAdminClient, type NewsRow } from './NewsAdminClient';

export const metadata: Metadata = {
  title: 'News · Content Manager',
  description: 'Curate the news archive.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminNewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/news');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') {
    redirect('/dashboard');
  }

  const { data, error } = await supabase
    .from('news')
    .select('url, title, source, topic, published_at, pinned, hidden, curated_summary')
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(500);

  const rows: NewsRow[] = !error && data ? (data as NewsRow[]) : [];
  const tableMissing = !!error;

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Content Manager · News</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
          {tableMissing
            ? 'The news table isn’t set up yet — run migration 0033, then the news-refresh cron (or wait for it) to fill the archive.'
            : `${rows.length} archived stories. Pin to surface, hide to remove from the feed, or rewrite a summary.`}
        </p>
        <NewsAdminClient rows={rows} />
      </main>
    </>
  );
}
