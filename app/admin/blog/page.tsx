import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BlogAdminClient, type BlogListItem } from './BlogAdminClient';

export const metadata: Metadata = {
  title: 'Blog · Content Manager',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/blog');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') redirect('/dashboard');

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, date, status')
    .order('date', { ascending: false })
    .limit(1000);

  const items: BlogListItem[] = !error && data ? (data as BlogListItem[]) : [];

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Content Manager · Blog</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
          {error ? 'The blog_posts table isn’t set up yet — run migration 0034.' : `${items.length} posts. Write new ones or edit any post.`}
        </p>
        <BlogAdminClient items={items} />
      </main>
    </>
  );
}
