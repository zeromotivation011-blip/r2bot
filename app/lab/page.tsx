import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { LabFeed } from '@/components/lab/LabFeed';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'The Lab — R2BOT community',
  description:
    'Ask questions, share projects, discuss concepts with other robotics learners. Threaded discussions, attached to every Atlas entry and Academy lesson.',
  alternates: { canonical: `${BASE_URL}/lab` },
};

export const dynamic = 'force-dynamic';

type ContributorRow = { author_display: string; count: number };
type MostDiscussedRow = { id: string; title: string; reply_count: number; content_type: string };

async function getSidebarData(): Promise<{
  contributors: ContributorRow[];
  mostDiscussed: MostDiscussedRow[];
}> {
  const supabase = await createSupabaseServerClient();
  // Pull the most recent 200 posts and bucket by author client-side — cheap
  // and avoids a custom RPC for the "top contributors" rollup.
  const { data: recent } = await supabase
    .from('lab_posts')
    .select('author_display')
    .order('created_at', { ascending: false })
    .limit(200);
  const tally = new Map<string, number>();
  for (const r of recent ?? []) {
    const name = (r.author_display as string) || 'Anonymous';
    tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  const contributors: ContributorRow[] = [...tally.entries()]
    .map(([author_display, count]) => ({ author_display, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const { data: hot } = await supabase
    .from('lab_posts')
    .select('id, title, reply_count, content_type')
    .order('reply_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);
  const mostDiscussed: MostDiscussedRow[] = (hot ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    reply_count: (r.reply_count as number) ?? 0,
    content_type: r.content_type as string,
  }));

  return { contributors, mostDiscussed };
}

export default async function LabPage() {
  const { contributors, mostDiscussed } = await getSidebarData();

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 90, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <div className="section-eyebrow">Community</div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', margin: '0 0 14px' }}
          >
            The Lab 🧪
          </h1>
          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 700, margin: '0 0 36px' }}>
            Ask questions, share projects, discuss concepts with other robotics learners.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 260px',
              gap: 36,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <LabFeed />
            </div>
            <aside style={{ position: 'sticky', top: 100, display: 'grid', gap: 18 }}>
              <SidebarCard title="Top contributors">
                {contributors.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                    No posts yet.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                    {contributors.map((c) => (
                      <li
                        key={c.author_display}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: 'var(--mist)' }}>{c.author_display}</span>
                        <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono), monospace' }}>
                          {c.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SidebarCard>
              <SidebarCard title="Most discussed">
                {mostDiscussed.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                    No discussions yet.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                    {mostDiscussed.map((m) => (
                      <li key={m.id} style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--mist)' }}>{m.title}</span>
                        <span
                          style={{
                            marginLeft: 6,
                            color: 'var(--muted)',
                            fontFamily: 'var(--font-mono), monospace',
                            fontSize: 11,
                          }}
                        >
                          · {m.reply_count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SidebarCard>
            </aside>
          </div>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.4)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11,
          letterSpacing: '.3em',
          color: 'var(--cyan)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
