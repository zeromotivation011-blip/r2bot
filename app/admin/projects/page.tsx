import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Project } from '@/lib/projects';
import { AdminProjectsClient } from './AdminProjectsClient';

export const metadata: Metadata = {
  title: 'Project moderation · R2BOT admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/projects');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data } = await supabase
    .from('projects')
    .select(
      'id, user_id, title, description, track, video_url, github_url, demo_url, thumbnail_url, tags, upvotes, status, featured, created_at, updated_at',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const pending = (data ?? []) as unknown as Project[];

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 90, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="section-eyebrow">Admin · Moderation</div>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(34px, 4.4vw, 48px)',
              margin: '0 0 12px',
              color: 'var(--mist)',
            }}
          >
            Pending project submissions
          </h1>
          <p style={{ color: '#B0B8C5', fontSize: 15, lineHeight: 1.55, margin: '0 0 6px' }}>
            {pending.length} project{pending.length === 1 ? '' : 's'} awaiting review.
          </p>

          <AdminProjectsClient initial={pending} />
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
