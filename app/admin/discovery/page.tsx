import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DiscoveryActions, type DiscoveryItem } from './DiscoveryActions';

export const metadata: Metadata = {
  title: 'Discovery queue · Admin',
  description: 'Auto-discovered robotics topics from arXiv, Reddit, HN, and GitHub.',
};

export const dynamic = 'force-dynamic';

export default async function AdminDiscoveryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/discovery');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') {
    redirect('/dashboard');
  }

  const { data, error } = await supabase
    .from('discovery_queue')
    .select('id, source, source_url, raw_title, extracted_topics, atlas_gaps, status, discovered_at')
    .order('discovered_at', { ascending: false })
    .limit(200);

  const items: DiscoveryItem[] = !error && data ? (data as DiscoveryItem[]) : [];

  const totalPending = items.filter((i) => i.status === 'pending').length;
  const totalGaps = items.reduce((acc, i) => acc + (i.atlas_gaps?.length ?? 0), 0);
  const totalAdded = items.filter((i) => i.status === 'added_to_atlas').length;
  const totalDismissed = items.filter((i) => i.status === 'dismissed').length;
  const sourceCounts: Record<string, number> = { arxiv: 0, reddit: 0, hn: 0, github: 0 };
  for (const i of items) sourceCounts[i.source] = (sourceCounts[i.source] ?? 0) + 1;

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 80, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="section-eyebrow">Admin · Discovery</div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(36px, 4.6vw, 54px)', margin: '0 0 22px', color: 'var(--mist)' }}
          >
            Discovery queue
          </h1>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
              marginBottom: 26,
            }}
          >
            <Tile label="Pending" value={totalPending} />
            <Tile label="Atlas gaps" value={totalGaps} accent />
            <Tile label="Added to atlas" value={totalAdded} />
            <Tile label="Dismissed" value={totalDismissed} />
          </div>

          <DiscoveryActions items={items} sourceCounts={sourceCounts} />
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 12,
        border: '1px solid ' + (accent ? 'rgba(255,176,32,.5)' : 'var(--border)'),
        background: accent ? 'rgba(255,176,32,.08)' : 'rgba(11,37,64,.4)',
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontFamily: 'var(--font-display), sans-serif',
          fontWeight: 700,
          color: accent ? 'var(--amber)' : 'var(--cyan)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono), monospace',
          letterSpacing: '.15em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}
