'use client';

import { useState } from 'react';
import {
  type Project,
  TRACK_ACCENT,
  TRACK_LABEL,
  shortAuthor,
  timeAgo,
} from '@/lib/projects';

export function ProjectCard({
  project,
  initialUpvoted = false,
  authorLabel,
}: {
  project: Project;
  initialUpvoted?: boolean;
  /** Pre-resolved display label; pass null/undefined to fall back to "Anonymous". */
  authorLabel?: string | null;
}) {
  const accent = TRACK_ACCENT[project.track];
  const [count, setCount] = useState(project.upvotes);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [busy, setBusy] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpvote = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/upvote`, { method: 'POST' });
      const json = (await res.json()) as { upvoted?: boolean; count?: number; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login?next=/showcase';
          return;
        }
        setError(json.error ?? 'Could not save your vote.');
      } else {
        setUpvoted(!!json.upvoted);
        if (typeof json.count === 'number') setCount(json.count);
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  const descTooLong = project.description.length > 220;

  return (
    <article
      style={{
        position: 'relative',
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Thumbnail project={project} accent={accent} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.35,
              color: 'var(--mist)',
              fontWeight: 600,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.title}
          </h3>
          <span
            style={{
              flexShrink: 0,
              padding: '4px 10px',
              borderRadius: 999,
              background: `${accent}1c`,
              border: `1px solid ${accent}`,
              color: accent,
              fontSize: 10.5,
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            {TRACK_LABEL[project.track]}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            color: '#C8D0DC',
            fontSize: 14,
            lineHeight: 1.55,
            display: expandedDesc ? 'block' : '-webkit-box',
            WebkitLineClamp: expandedDesc ? undefined : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.description}
        </p>
        {descTooLong && !expandedDesc && (
          <button
            type="button"
            onClick={() => setExpandedDesc(true)}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--cyan)',
              fontSize: 12.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Read more
          </button>
        )}

        {project.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {project.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(0,229,255,.06)',
                  border: '1px solid rgba(0,229,255,.25)',
                  color: '#C8D0DC',
                  fontSize: 11.5,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleUpvote}
              disabled={busy}
              aria-pressed={upvoted}
              aria-label={`${upvoted ? 'Remove upvote' : 'Upvote'} (${count})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: upvoted ? 'rgba(0,229,255,.18)' : 'transparent',
                border: `1px solid ${upvoted ? 'var(--cyan-bright)' : 'var(--border-2)'}`,
                color: upvoted ? 'var(--cyan-bright)' : 'var(--mist)',
                fontSize: 13,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span aria-hidden="true">▲</span>
              <span>{count}</span>
            </button>

            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                style={iconLink}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.18.08 1.8 1.21 1.8 1.21 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.67 0-1.25.44-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.17a11 11 0 0 1 5.79 0c2.2-1.48 3.17-1.17 3.17-1.17.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.7 5.37-5.27 5.66.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.5 11.5 0 0 0 12 .5z" />
                </svg>
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Live demo"
                style={iconLink}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.41 1.41" />
                  <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.41-1.41" />
                </svg>
              </a>
            )}
          </div>

          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono), monospace' }}>
            by {authorLabel ?? shortAuthor(null, null)} · {timeAgo(project.created_at)}
          </span>
        </div>

        {error && (
          <p style={{ margin: 0, color: '#ff7a7a', fontSize: 12 }} role="alert">
            {error}
          </p>
        )}
      </div>

      {project.featured && (
        <div
          aria-label="Featured project"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(255,184,0,.18)',
            border: '1px solid #FFB800',
            color: '#FFB800',
            fontSize: 11,
            fontFamily: 'var(--font-mono), monospace',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
          }}
        >
          ★ Featured
        </div>
      )}
    </article>
  );
}

const iconLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid var(--border-2)',
  color: 'var(--mist)',
  textDecoration: 'none',
};

function Thumbnail({ project, accent }: { project: Project; accent: string }) {
  return (
    <a
      href={project.video_url ?? project.demo_url ?? project.github_url ?? '#'}
      target={project.video_url || project.demo_url || project.github_url ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{
        position: 'relative',
        display: 'block',
        aspectRatio: '16 / 9',
        background: project.thumbnail_url
          ? `center / cover no-repeat url(${project.thumbnail_url})`
          : `linear-gradient(135deg, ${accent}33, rgba(11,37,64,.6))`,
        textDecoration: 'none',
      }}
      aria-label={project.video_url ? `Watch ${project.title}` : project.title}
    >
      {!project.thumbnail_url && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12,
            letterSpacing: '.3em',
            textTransform: 'uppercase',
          }}
        >
          {TRACK_LABEL[project.track]} project
        </div>
      )}
      {project.video_url && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,8,16,.32)',
          }}
        >
          <span
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'var(--cyan-bright)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 22px rgba(0,229,255,.45)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#001318" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      )}
    </a>
  );
}
