'use client'

// components/SubmitBuildModal.tsx — Robot Project → Community Gallery submit
// Renders as a modal triggered by a "Share your build →" CTA. Posts to
// /api/community/submit. On success, shows a confirmation + link to gallery.

import { useEffect, useState } from 'react'

interface SubmitBuildModalProps {
  open: boolean
  onClose: () => void
  projectSlug: string
  projectTitle: string
  defaultTags?: string[]
}

const MAX_DESC = 500

function isValidUrl(s: string): boolean {
  if (!s) return true // empty is fine
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function SubmitBuildModal({ open, onClose, projectSlug, projectTitle, defaultTags = [] }: SubmitBuildModalProps) {
  const [title, setTitle] = useState(projectTitle)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(defaultTags)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  // Reset state on close.
  useEffect(() => {
    if (!open) {
      setTitle(projectTitle); setDescription(''); setImageUrl('')
      setGithubUrl(''); setVideoUrl(''); setTagInput('')
      setTags(defaultTags); setSubmitting(false); setError(null); setSuccessId(null)
    }
  }, [open, projectTitle, defaultTags])

  // Lock body scroll when open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (!t || tags.includes(t)) return
    setTags((prev) => [...prev, t].slice(0, 8))
    setTagInput('')
  }

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Give your build a title.'); return }
    if (description.length > MAX_DESC) { setError(`Description must be ${MAX_DESC} characters or fewer.`); return }
    if (!isValidUrl(githubUrl) || !isValidUrl(videoUrl) || !isValidUrl(imageUrl)) {
      setError('One of your links is not a valid URL.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/community/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug, title: title.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          githubUrl: githubUrl.trim() || null,
          videoUrl: videoUrl.trim() || null,
          tags,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || 'Could not submit your build.')
        setSubmitting(false)
        return
      }
      setSuccessId(json.buildId as string)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="submit-build-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640,
          background: '#0f0f17', border: '1px solid #1f1f2a',
          borderRadius: 18, padding: 26,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: 0 }}>
            Share your build
          </p>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>

        {successId ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 38, marginBottom: 8 }}>🎉</p>
            <h2 id="submit-build-title" style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
              Your build is live!
            </h2>
            <p style={{ fontSize: 14, color: '#cbd5e1', margin: '0 0 22px' }}>
              Thanks for sharing. Other learners can now see what you made.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="/community/gallery"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '12px 20px', background: '#fbbf24', color: '#1a0f00',
                  borderRadius: 12, fontWeight: 900, fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                See it in the Gallery →
              </a>
              <button
                type="button" onClick={onClose}
                style={{
                  padding: '12px 18px', background: 'rgba(255,255,255,0.06)',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="submit-build-title" style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '8px 0 18px' }}>
              Submit your {projectTitle} build
            </h2>

            <Field label="Title *">
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                required maxLength={120} style={inputStyle}
              />
            </Field>

            <Field label="Description" hint={`${description.length}/${MAX_DESC}`}>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                rows={4} placeholder="What did you build, what tripped you up, what would you do differently?"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>

            <Field label="Image URL" hint="Paste a link to your build photo">
              <input
                type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…" style={inputStyle}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field label="GitHub URL (optional)">
                <input
                  type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/…" style={inputStyle}
                />
              </Field>
              <Field label="Video URL (optional)">
                <input
                  type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/…" style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Tags" hint="Add up to 8">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {tags.map((t) => (
                  <span key={t} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
                    color: '#fbbf24', fontSize: 12, fontWeight: 700,
                  }}>
                    {t}
                    <button
                      type="button" onClick={() => removeTag(t)}
                      style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                      aria-label={`Remove tag ${t}`}
                    >×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text" value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="arduino, slam, …"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 8}
                  style={{
                    padding: '8px 14px', background: 'rgba(255,255,255,0.08)',
                    color: '#fff', border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    opacity: !tagInput.trim() || tags.length >= 8 ? 0.4 : 1,
                  }}
                >
                  Add
                </button>
              </div>
            </Field>

            {error && (
              <p style={{ marginTop: 8, marginBottom: 8, color: '#fca5a5', fontSize: 13 }}>{error}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                type="button" onClick={onClose}
                style={{
                  padding: '11px 18px', background: 'transparent',
                  color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                style={{
                  padding: '11px 22px', background: '#fbbf24', color: '#1a0f00',
                  border: 'none', borderRadius: 12,
                  fontWeight: 900, fontSize: 14, cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit build →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 800, color: '#cbd5e1' }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: '#64748b' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
}
