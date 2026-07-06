import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin · Content Manager',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const TOOLS: { href: string; icon: string; title: string; desc: string }[] = [
  { href: '/admin/atlas', icon: '🧠', title: 'Atlas', desc: 'Create & edit robotics concept entries.' },
  { href: '/admin/news', icon: '📰', title: 'News', desc: 'Curate the news archive — pin, hide, rewrite.' },
  { href: '/admin/blog', icon: '📝', title: 'Blog', desc: 'Write and publish long-form posts.' },
  { href: '/admin/lens', icon: '🔭', title: 'Lens', desc: 'Curate the best robotics video summaries.' },
  { href: '/admin/leads', icon: '🎯', title: 'Leads', desc: 'Captured email + phone. Search & export CSV.' },
  { href: '/admin/discovery', icon: '🔭', title: 'Discovery', desc: 'Auto-discovered topics from arXiv, HN, Reddit.' },
  { href: '/admin/projects', icon: '🤖', title: 'Projects', desc: 'Manage robot build projects.' },
];

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') redirect('/dashboard');

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '120px 20px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Content Manager</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 28px' }}>Run R2BOT from the browser.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {TOOLS.map((t) => (
            <Link
              key={t.href} href={t.href} className="r2-lift"
              style={{
                display: 'block', padding: 22, borderRadius: 16, textDecoration: 'none',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
              <div style={{ color: '#f4f4f5', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{t.title}</div>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{t.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
