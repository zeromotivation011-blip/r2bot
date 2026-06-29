'use client';

import { useCallback, useState } from 'react';
import { type Project, TRACK_ACCENT, TRACK_LABEL } from '@/lib/projects';

export function AdminProjectsClient({ initial }: { initial: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = useCallback(
    async (id: string, body: { status?: 'approved' | 'rejected'; featured?: boolean }) => {
      setBusyId(id);
      setError(null);
      try {
        const res = await fetch('/api/admin/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...body }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) {
          setError(json.error ?? 'Could not save.');
          return;
        }
        // Once moderated, remove the card from this view.
        setProjects((curr) => curr.filter((p) => p.id !== id));
      } catch {
        setError('Network error.');
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  if (projects.length === 0) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: '36px 24px',
          borderRadius: 14,
          border: '1px dashed var(--border-2)',
          background: 'rgba(11,37,64,.2)',
          textAlign: 'center',
          color: 'var(--muted)',
        }}
      >
        No projects pending review — inbox zero ✅
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
      {error && (
        <p style={{ color: '#ff7a7a', fontSize: 13 }} role="alert">
          {error}
        </p>
      )}
      {projects.map((p) => {
        const accent = TRACK_ACCENT[p.track];
        const busy = busyId === p.id;
        return (
          <article
            key={p.id}
            style={{
              padding: 18,
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'rgba(11,37,64,.4)',
              color: 'var(--mist)',
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.35 }}>{p.title}</h3>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: `${accent}1c`,
                  border: `1px solid ${accent}`,
                  color: accent,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono), monospace',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {TRACK_LABEL[p.track]}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#C8D0DC', whiteSpace: 'pre-wrap' }}>
              {p.description}
            </p>

            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                fontSize: 12,
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              {p.video_url && (
                <a href={p.video_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>
                  ▶ video
                </a>
              )}
              {p.github_url && (
                <a href={p.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>
                  github
                </a>
              )}
              {p.demo_url && (
                <a href={p.demo_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>
                  demo
                </a>
              )}
              {p.tags.length > 0 && <span>tags: {p.tags.join(', ')}</span>}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch(p.id, { status: 'approved' })}
                style={btnApprove}
              >
                ✅ Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch(p.id, { status: 'rejected' })}
                style={btnReject}
              >
                ✖ Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch(p.id, { featured: true })}
                style={btnFeature}
              >
                ⭐ Feature
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const btnApprove: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(0,229,255,.16)',
  border: '1px solid var(--cyan-bright)',
  color: 'var(--cyan-bright)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
};
const btnReject: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(255,87,87,.1)',
  border: '1px solid #ff5757',
  color: '#ff7a7a',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
};
const btnFeature: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(255,184,0,.12)',
  border: '1px solid #FFB800',
  color: '#FFB800',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
};
