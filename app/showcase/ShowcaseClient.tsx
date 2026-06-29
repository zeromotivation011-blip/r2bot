'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProjectCard } from '@/components/ProjectCard';
import { SubmitProjectForm } from '@/components/SubmitProjectForm';
import {
  type Project,
  type ProjectTrack,
  TRACK_LABEL,
} from '@/lib/projects';

type SortKey = 'newest' | 'top';

const TRACK_TABS: Array<{ key: 'all' | ProjectTrack; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'spark', label: 'Spark' },
  { key: 'wire', label: 'Wire' },
  { key: 'forge', label: 'Forge' },
  { key: 'edge', label: 'Edge' },
];

export function ShowcaseClient({
  initialProjects,
  featuredProjects,
  signedIn,
  upvotedIds,
  authorMap,
  total,
}: {
  initialProjects: Project[];
  featuredProjects: Project[];
  signedIn: boolean;
  upvotedIds: string[];
  authorMap: Record<string, string>;
  total: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [track, setTrack] = useState<'all' | ProjectTrack>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialProjects.length < total);

  const upvotedSet = useMemo(() => new Set(upvotedIds), [upvotedIds]);

  const reload = useCallback(
    async (nextTrack: 'all' | ProjectTrack, nextSort: SortKey) => {
      setLoading(true);
      const url = new URL('/api/projects', window.location.origin);
      if (nextTrack !== 'all') url.searchParams.set('track', nextTrack);
      url.searchParams.set('sort', nextSort);
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '12');
      try {
        const res = await fetch(url.toString());
        const json = (await res.json()) as { projects?: Project[]; total?: number };
        const list = json.projects ?? [];
        setProjects(list);
        setPage(1);
        setHasMore(list.length < (json.total ?? 0));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadMore = useCallback(async () => {
    setLoading(true);
    const next = page + 1;
    const url = new URL('/api/projects', window.location.origin);
    if (track !== 'all') url.searchParams.set('track', track);
    url.searchParams.set('sort', sort);
    url.searchParams.set('page', String(next));
    url.searchParams.set('limit', '12');
    try {
      const res = await fetch(url.toString());
      const json = (await res.json()) as { projects?: Project[]; total?: number };
      const list = json.projects ?? [];
      const newAll = [...projects, ...list];
      setProjects(newAll);
      setPage(next);
      setHasMore(newAll.length < (json.total ?? 0));
    } finally {
      setLoading(false);
    }
  }, [page, projects, sort, track]);

  // Honor /showcase?track=spark deep-links.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get('track');
    if (t === 'spark' || t === 'wire' || t === 'forge' || t === 'edge') {
      setTrack(t);
      void reload(t, sort);
    }
    // intentional one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = (k: 'all' | ProjectTrack) => {
    setTrack(k);
    void reload(k, sort);
  };
  const handleSort = (k: SortKey) => {
    setSort(k);
    void reload(track, k);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
          style={{ padding: '12px 22px', fontSize: 14 }}
        >
          {signedIn ? 'Submit your project →' : 'Sign in to submit →'}
        </button>
      </div>

      {featuredProjects.length > 0 && (
        <section style={{ marginTop: 38 }}>
          <h2
            className="display"
            style={{
              fontSize: 22,
              margin: '0 0 14px',
              color: 'var(--mist)',
            }}
          >
            ⭐ Featured
          </h2>
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollSnapType: 'x mandatory',
            }}
          >
            {featuredProjects.map((p) => (
              <div
                key={p.id}
                style={{
                  flex: '0 0 320px',
                  scrollSnapAlign: 'start',
                }}
              >
                <ProjectCard
                  project={p}
                  initialUpvoted={upvotedSet.has(p.id)}
                  authorLabel={authorMap[p.user_id]}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          marginTop: 38,
          marginBottom: 6,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          role="tablist"
          aria-label="Filter by track"
          style={{
            display: 'inline-flex',
            padding: 3,
            borderRadius: 999,
            background: 'rgba(11,37,64,.55)',
            border: '1px solid var(--border)',
          }}
        >
          {TRACK_TABS.map((t) => {
            const isActive = track === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTrack(t.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background: isActive ? 'var(--cyan)' : 'transparent',
                  color: isActive ? '#001318' : '#C8D0DC',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              letterSpacing: '.15em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
            }}
          >
            Sort
          </span>
          <select
            aria-label="Sort projects"
            value={sort}
            onChange={(e) => handleSort(e.target.value as SortKey)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'rgba(11,37,64,.5)',
              color: 'var(--mist)',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Newest</option>
            <option value="top">Most upvoted</option>
          </select>
        </label>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            marginTop: 30,
            padding: '36px 24px',
            borderRadius: 14,
            border: '1px dashed var(--border-2)',
            background: 'rgba(11,37,64,.2)',
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          {track === 'all'
            ? "No approved projects yet. Be the first — click 'Submit your project' above."
            : `No ${TRACK_LABEL[track]} projects yet — try another track.`}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 18,
            marginTop: 24,
          }}
        >
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              initialUpvoted={upvotedSet.has(p.id)}
              authorLabel={authorMap[p.user_id]}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            style={{
              padding: '12px 26px',
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid var(--border-2)',
              color: 'var(--mist)',
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
            }}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      <SubmitProjectForm open={showForm} onClose={() => setShowForm(false)} signedIn={signedIn} />
    </>
  );
}
