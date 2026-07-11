import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Project, shortAuthor } from '@/lib/projects';
import { ShowcaseClient } from './ShowcaseClient';

export const metadata: Metadata = {
  title: 'Project Showcase',
  description:
    'Real robots built by R2BOT learners — from line followers and Arduino kits to ROS2 stacks and autonomous drones.',
};

export const dynamic = 'force-dynamic';

type ProfileLite = { id: string; email: string | null; display_name: string | null };

export default async function ShowcasePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: initial, count: total }, { data: featured }] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, user_id, title, description, track, video_url, github_url, demo_url, thumbnail_url, tags, upvotes, status, featured, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('projects')
      .select(
        'id, user_id, title, description, track, video_url, github_url, demo_url, thumbnail_url, tags, upvotes, status, featured, created_at, updated_at',
      )
      .eq('status', 'approved')
      .eq('featured', true)
      .order('upvotes', { ascending: false })
      .limit(8),
  ]);

  const initialProjects = (initial ?? []) as unknown as Project[];
  const featuredProjects = (featured ?? []) as unknown as Project[];

  // Resolve author display labels in one round-trip.
  const authorIds = Array.from(
    new Set([...initialProjects, ...featuredProjects].map((p) => p.user_id)),
  );
  let authorMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', authorIds);
    const rows = (profiles ?? []) as unknown as ProfileLite[];
    authorMap = Object.fromEntries(
      rows.map((p) => [p.id, shortAuthor(p.email, p.display_name)]),
    );
  }

  // Builder count (distinct user_ids of approved projects).
  const { data: builders } = await supabase
    .from('projects')
    .select('user_id')
    .eq('status', 'approved')
    .limit(500);
  const builderCount = new Set((builders ?? []).map((b) => b.user_id)).size;

  // Current user's existing upvotes — so cards render in the right state.
  let upvotedIds: string[] = [];
  if (user) {
    const ids = [...initialProjects, ...featuredProjects].map((p) => p.id);
    if (ids.length > 0) {
      const { data: votes } = await supabase
        .from('project_upvotes')
        .select('project_id')
        .eq('user_id', user.id)
        .in('project_id', ids);
      upvotedIds = (votes ?? []).map((v) => v.project_id as string);
    }
  }

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 90, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 1180 }}>
          <div className="section-eyebrow">Community</div>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 64px)',
              lineHeight: 1.05,
              margin: '0 0 14px',
            }}
          >
            Project Showcase 🚀
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#B0B8C5',
              maxWidth: 700,
              margin: '0 0 18px',
              lineHeight: 1.55,
            }}
          >
            Real robots built by R2BOT learners — from line followers and Arduino kits to ROS2
            stacks and autonomous drones. Upvote the ones that wow you.
          </p>

          <div
            style={{
              display: 'inline-flex',
              gap: 14,
              alignItems: 'center',
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(0,229,255,.06)',
              border: '1px solid rgba(0,229,255,.25)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              color: 'var(--mist)',
              letterSpacing: '.05em',
            }}
          >
            <span style={{ color: 'var(--cyan)' }}>● {total ?? 0}</span>
            <span>projects submitted</span>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span>{builderCount} builders</span>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span>From Spark to Edge</span>
          </div>

          <ShowcaseClient
            initialProjects={initialProjects}
            featuredProjects={featuredProjects}
            signedIn={!!user}
            upvotedIds={upvotedIds}
            authorMap={authorMap}
            total={total ?? 0}
          />
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
