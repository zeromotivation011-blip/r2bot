import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Library — your bookmarks',
  description: 'Atlas entries, Pulse stories, and Academy lessons you saved.',
};

export const dynamic = 'force-dynamic';

type Bookmark = {
  content_type: 'atlas' | 'academy' | 'pulse';
  content_slug: string;
  content_title: string;
  created_at: string;
};

function hrefFor(b: Bookmark): string {
  if (b.content_type === 'atlas') return `/atlas/${b.content_slug}`;
  if (b.content_type === 'academy') return `/academy/${b.content_slug}`;
  return `/pulse/${b.content_slug}`;
}

function labelFor(t: Bookmark['content_type']): string {
  return { atlas: 'Atlas', academy: 'Academy', pulse: 'Pulse' }[t];
}

export default async function BookmarksPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/bookmarks');

  const { data } = await supabase
    .from('bookmarks')
    .select('content_type, content_slug, content_title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const items = (data ?? []) as Bookmark[];

  return (
    <StaticPage
      eyebrow="Your library"
      title="Saved for later"
      lede="Everything you've bookmarked across Atlas, Pulse, and Academy."
      maxWidth={720}
    >
      <p style={{ marginBottom: 24 }}>
        <a href="/dashboard" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          ← Back to dashboard
        </a>
      </p>

      {items.length === 0 ? (
        <p style={{ color: '#8893a4' }}>
          Nothing saved yet. Tap the ★ button on any Atlas entry, Pulse story, or
          Academy lesson to bookmark it.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {items.map((b) => (
            <li
              key={`${b.content_type}-${b.content_slug}`}
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'rgba(11,37,64,.35)',
              }}
            >
              <a href={hrefFor(b)} style={{ color: 'var(--mist)', display: 'block' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 10,
                    letterSpacing: '.3em',
                    color: 'var(--cyan)',
                    textTransform: 'uppercase',
                    marginRight: 12,
                  }}
                >
                  {labelFor(b.content_type)}
                </span>
                <span style={{ fontSize: 16 }}>{b.content_title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </StaticPage>
  );
}
