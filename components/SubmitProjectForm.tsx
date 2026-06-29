'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ProjectTrack,
  TRACK_LABEL,
  isAllowedVideoUrl,
  youtubeThumbnailUrl,
  youtubeVideoId,
} from '@/lib/projects';

type State = 'idle' | 'submitting' | 'success';

export function SubmitProjectForm({
  open,
  onClose,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
}) {
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState<ProjectTrack>('spark');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the modal closes.
  useEffect(() => {
    if (!open) {
      setError(null);
      if (state === 'success') {
        setTitle('');
        setTrack('spark');
        setDescription('');
        setVideoUrl('');
        setGithubUrl('');
        setDemoUrl('');
        setTagsRaw('');
        setState('idle');
      }
    }
  }, [open, state]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const youTubeId = useMemo(() => (videoUrl ? youtubeVideoId(videoUrl) : null), [videoUrl]);
  const videoUrlValid = !videoUrl || isAllowedVideoUrl(videoUrl);
  const tags = useMemo(
    () =>
      tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 20)
        .slice(0, 5),
    [tagsRaw],
  );

  const submit = useCallback(async () => {
    setError(null);
    if (title.trim().length < 5) {
      setError('Title needs at least 5 characters.');
      return;
    }
    if (description.trim().length < 50) {
      setError('Description needs at least 50 characters.');
      return;
    }
    if (!videoUrlValid) {
      setError('Video URL must be YouTube or Loom.');
      return;
    }
    setState('submitting');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          track,
          video_url: videoUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          demo_url: demoUrl.trim() || null,
          tags,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login?next=/showcase';
          return;
        }
        setError(json.error ?? 'Submission failed.');
        setState('idle');
        return;
      }
      setState('success');
    } catch {
      setError('Network error. Try again.');
      setState('idle');
    }
  }, [title, description, track, videoUrl, githubUrl, demoUrl, tags, videoUrlValid]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Submit your project"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,8,16,.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '6vh 16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'rgba(11,37,64,.85)',
          border: '1px solid var(--border-2)',
          borderRadius: 18,
          padding: 28,
          color: 'var(--mist)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 22 }}>
            Submit your project 🚀
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mist)',
              fontSize: 22,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {state === 'success' ? (
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              background: 'rgba(0,229,255,.08)',
              border: '1px solid rgba(0,229,255,.4)',
              color: 'var(--cyan-bright)',
              fontSize: 15,
              lineHeight: 1.55,
              marginBottom: 18,
            }}
          >
            ✅ Submitted! We review projects within 24 hours. You&apos;ll see it on the
            showcase once approved.
          </div>
        ) : !signedIn ? (
          <div>
            <p style={{ color: '#C8D0DC', fontSize: 15, lineHeight: 1.6, marginTop: 0 }}>
              Show what you built. Sign in to submit a project for the R2BOT showcase.
            </p>
            <a
              href="/login?next=/showcase"
              className="btn btn-primary"
              style={{ padding: '12px 22px', fontSize: 14 }}
            >
              Sign in to submit your project →
            </a>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            style={{ display: 'grid', gap: 14 }}
          >
            <Field label="Title" hint={`${title.length}/100`} hintColor={title.length > 100 ? '#ff7a7a' : 'var(--muted)'}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                style={inputStyle}
                placeholder="Self-balancing two-wheel robot"
              />
            </Field>

            <Field label="Track">
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value as ProjectTrack)}
                style={inputStyle}
              >
                {(['spark', 'wire', 'forge', 'edge'] as ProjectTrack[]).map((t) => (
                  <option key={t} value={t}>
                    {TRACK_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Description"
              hint={`${description.length}/2000`}
              hintColor={description.length > 2000 ? '#ff7a7a' : 'var(--muted)'}
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={6}
                required
                placeholder="What does your robot do? What did you learn? What challenges did you face?"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
              />
            </Field>

            <Field
              label="Video URL (YouTube or Loom)"
              hint={videoUrl && !videoUrlValid ? 'Not a YouTube or Loom URL' : 'Optional'}
              hintColor={videoUrl && !videoUrlValid ? '#ff7a7a' : 'var(--muted)'}
            >
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                style={inputStyle}
              />
              {youTubeId && (
                <img
                  src={youtubeThumbnailUrl(youTubeId)}
                  alt="YouTube preview"
                  style={{
                    marginTop: 8,
                    borderRadius: 10,
                    maxWidth: 240,
                    border: '1px solid var(--border)',
                  }}
                />
              )}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="GitHub URL" hint="Optional">
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/…"
                  style={inputStyle}
                />
              </Field>
              <Field label="Live demo URL" hint="Optional">
                <input
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://…"
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field
              label="Tags (comma separated, max 5)"
              hint={`${tags.length}/5`}
              hintColor={tags.length > 5 ? '#ff7a7a' : 'var(--muted)'}
            >
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="arduino, line-follower, pid"
                style={inputStyle}
              />
            </Field>

            {error && (
              <p style={{ margin: 0, color: '#ff7a7a', fontSize: 13 }} role="alert">
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid var(--border-2)',
                  color: 'var(--mist)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={state === 'submitting'}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                {state === 'submitting' ? 'Submitting…' : 'Submit for review →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'rgba(5,8,16,.5)',
  color: 'var(--mist)',
  fontSize: 14,
  fontFamily: 'inherit',
  lineHeight: 1.45,
};

function Field({
  label,
  hint,
  hintColor = 'var(--muted)',
  children,
}: {
  label: string;
  hint?: string;
  hintColor?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          fontFamily: 'var(--font-mono), monospace',
          color: 'var(--muted)',
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
        {hint && <span style={{ color: hintColor, textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
