'use client'

// app/community/CommunityGalleryClient.tsx — interactive layer for /community
// Initial data comes from the server. Filter + sort + like are client-only.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { SubmitBuildModal } from '@/components/SubmitBuildModal'

export interface CommunityBuild {
  id: string
  title: string
  description: string
  image_url: string | null
  track: string | null
  project_slug: string | null
  github_url: string | null
  video_url: string | null
  tags: string[]
  likes: number
  created_at: string
}

type TrackFilter = 'all' | 'spark' | 'wire' | 'forge' | 'edge'
type SortMode = 'recent' | 'liked'

const TRACK_PILL: Record<NonNullable<CommunityBuild['track']>, { bg: string; border: string; text: string }> = {
  spark:  { bg: 'rgba(0,184,212,0.10)',   border: 'rgba(0,184,212,0.4)',   text: '#00b8d4' },
  wire:   { bg: 'rgba(165,107,255,0.10)', border: 'rgba(165,107,255,0.4)', text: '#a56bff' },
  forge:  { bg: 'rgba(0,229,255,0.10)',   border: 'rgba(0,229,255,0.4)',   text: '#00e5ff' },
  edge:   { bg: 'rgba(255,184,0,0.10)',   border: 'rgba(255,184,0,0.4)',   text: '#ffb800' },
}

const LIKED_LS_KEY = 'r2bot_community_liked'

interface Props {
  initialBuilds: CommunityBuild[]
}

export function CommunityGalleryClient({ initialBuilds }: Props) {
  const [builds, setBuilds] = useState<CommunityBuild[]>(initialBuilds)
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIKED_LS_KEY)
      const arr = raw ? (JSON.parse(raw) as unknown) : []
      if (Array.isArray(arr)) setLikedSet(new Set(arr.filter((x): x is string => typeof x === 'string')))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled) setAuthed(!!user)
      } catch { if (!cancelled) setAuthed(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const list = trackFilter === 'all' ? builds : builds.filter((b) => b.track === trackFilter)
    if (sortMode === 'liked') return [...list].sort((a, b) => b.likes - a.likes)
    return [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [builds, trackFilter, sortMode])

  const handleLike = useCallback(async (id: string) => {
    if (likedSet.has(id)) return
    setLikedSet((prev) => {
      const next = new Set(prev)
      next.add(id)
      try { window.localStorage.setItem(LIKED_LS_KEY, JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
    setBuilds((prev) => prev.map((b) => (b.id === id ? { ...b, likes: b.likes + 1 } : b)))
    try { await fetch(`/api/community/like/${encodeURIComponent(id)}`, { method: 'POST' }) } catch { /* ignore */ }
  }, [likedSet])

  const handleSubmitClick = () => {
    if (authed === false) {
      setToast('Sign in to submit your build.')
      window.setTimeout(() => setToast(null), 3000)
      return
    }
    setShowSubmit(true)
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(['all', 'spark', 'wire', 'forge', 'edge'] as TrackFilter[]).map((t) => (
            <button
              key={t} type="button"
              onClick={() => setTrackFilter(t)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', textTransform: 'capitalize',
                background: trackFilter === t ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${trackFilter === t ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: trackFilter === t ? '#fbbf24' : '#cbd5e1',
              }}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', padding: 3 }}>
            {(['recent', 'liked'] as SortMode[]).map((m) => (
              <button
                key={m} type="button"
                onClick={() => setSortMode(m)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: sortMode === m ? '#fbbf24' : 'transparent',
                  color: sortMode === m ? '#1a0f00' : '#94a3b8',
                }}
              >
                {m === 'recent' ? 'Most recent' : 'Most liked'}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={handleSubmitClick}
            style={{
              padding: '8px 18px', background: '#fbbf24', color: '#1a0f00',
              border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(245,158,11,0.25)',
            }}
          >
            📸 Submit Your Build
          </button>
        </div>
      </div>

      {/* Empty state or grid */}
      {filtered.length === 0 ? (
        <div style={{
          maxWidth: 520, margin: '60px auto', textAlign: 'center',
          padding: '40px 24px', background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 18,
        }}>
          <p style={{ fontSize: 44, lineHeight: 1, marginBottom: 12 }}>🤖</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', color: '#fff' }}>
            Be the first to share your build!
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 22px', lineHeight: 1.6 }}>
            Complete a <Link href="/build" style={{ color: '#fbbf24', textDecoration: 'underline' }}>Robot Project</Link> to submit here.
          </p>
          <button
            type="button" onClick={handleSubmitClick}
            style={{
              padding: '10px 22px', background: '#fbbf24', color: '#1a0f00',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 900, cursor: 'pointer',
            }}
          >
            Submit a build →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((b) => {
            const pill = b.track && TRACK_PILL[b.track as keyof typeof TRACK_PILL]
            const liked = likedSet.has(b.id)
            return (
              <article
                key={b.id}
                style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                {b.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt={b.title} loading="lazy"
                       style={{ width: '100%', borderRadius: 12, aspectRatio: '16/10', objectFit: 'cover', background: '#0f0f17' }} />
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '16/10', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: 38, opacity: 0.5 }} aria-hidden>🤖</span>
                  </div>
                )}

                {pill && (
                  <span style={{
                    alignSelf: 'flex-start', fontSize: 10, fontWeight: 900,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    padding: '3px 10px', borderRadius: 999,
                    background: pill.bg, border: `1px solid ${pill.border}`, color: pill.text,
                  }}>
                    {b.track}
                  </span>
                )}

                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{b.title}</h3>
                <p style={{
                  margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.55,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {b.description}
                </p>

                {b.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {b.tags.slice(0, 5).map((t) => (
                      <span key={t} style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        background: 'rgba(245,158,11,0.10)', color: '#fbbf24',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    type="button" onClick={() => handleLike(b.id)} disabled={liked}
                    aria-label={liked ? 'Liked' : 'Like build'}
                    style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                      cursor: liked ? 'default' : 'pointer',
                      background: liked ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.06)',
                      border: '1px solid rgba(249,115,22,0.3)', color: '#f97316',
                    }}
                  >
                    {liked ? '❤️' : '🤍'} {b.likes}
                  </button>
                  {(b.github_url || b.video_url || b.project_slug) && (
                    <a
                      href={b.github_url || b.video_url || (b.project_slug ? `/build/${b.project_slug}` : '#')}
                      target={b.github_url || b.video_url ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textDecoration: 'none' }}
                    >
                      View project →
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#111118', border: '1px solid rgba(245,158,11,0.4)',
          color: '#fbbf24', padding: '12px 22px', borderRadius: 12,
          fontSize: 13, fontWeight: 700, zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {toast} <Link href="/login" style={{ color: '#fff', textDecoration: 'underline', marginLeft: 8 }}>Sign in →</Link>
        </div>
      )}

      <SubmitBuildModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        projectSlug=""
        projectTitle="My build"
      />
    </>
  )
}
