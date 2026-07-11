'use client'

// app/academy/AcademyHomeClient.tsx
// Academy home — inline styles throughout (no styled-jsx)

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { AcademyTrack, Course, CourseLevel } from '@/lib/academy'
import { useAcademyProgress } from '@/lib/academy/progress'
import { SpacedRepetitionBanner } from '@/components/academy/SpacedRepetitionBanner'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isFreeCourse } from '@/lib/free-courses'

type TrackFilter = 'all' | AcademyTrack
type LevelFilter = 'all' | CourseLevel

const TRACK_ACCENT: Record<AcademyTrack, string> = {
  spark: '#00B8D4',
  wire:  '#A56BFF',
  forge: '#00E5FF',
  edge:  '#FFB800',
}

const TRACK_META: Record<AcademyTrack, { label: string; emoji: string; desc: string }> = {
  spark: { label: 'Spark', emoji: '⚡', desc: 'Foundations of robotics — no hardware needed. Start here.' },
  wire:  { label: 'Wire',  emoji: '🔌', desc: 'Real circuits, real Arduino code, real robot you build yourself.' },
  forge: { label: 'Forge', emoji: '🔥', desc: 'ROS2, Gazebo, Nav2 — the full professional robotics stack.' },
  edge:  { label: 'Edge',  emoji: '🧠', desc: 'AI robotics: vision, SLAM, reinforcement learning, edge inference.' },
}

export function AcademyHomeClient({ courses }: { courses: Course[] }) {
  const { state, hydrated } = useAcademyProgress()
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [recommendedTrack, setRecommendedTrack] = useState<AcademyTrack | null>(null)

  // Client-side personalization: fetch the user's diagnostic_track if signed in,
  // falling back to localStorage for anonymous users. Stays out of SSR so the
  // page can be statically generated.
  useEffect(() => {
    let cancelled = false
    const fromLocal = (() => {
      try {
        const v = window.localStorage.getItem('r2bot_track')
        if (v === 'spark' || v === 'wire' || v === 'forge' || v === 'edge') return v as AcademyTrack
      } catch { /* ignore */ }
      return null
    })()
    if (fromLocal) setRecommendedTrack(fromLocal)
    ;(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('diagnostic_track')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        const t = data?.diagnostic_track
        if (t === 'spark' || t === 'wire' || t === 'forge' || t === 'edge') {
          setRecommendedTrack(t)
        }
      } catch { /* silent — personalization is best-effort */ }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => courses.filter(c => {
    if (trackFilter !== 'all' && c.track !== trackFilter) return false
    if (levelFilter !== 'all' && c.level !== levelFilter) return false
    return true
  }), [courses, trackFilter, levelFilter])

  const inProgress = useMemo(() => {
    if (!hydrated) return null
    const enrolled = Object.values(state.enrollments)
    if (enrolled.length === 0) return null
    const latest = enrolled
      .map(e => ({ enroll: e, lessons: Object.values(state.lessons).filter(l => l.courseId === e.courseId) }))
      .sort((a, b) => {
        const ta = a.lessons.reduce((m, l) => Math.max(m, l.completedAt ? new Date(l.completedAt).getTime() : 0), 0)
        const tb = b.lessons.reduce((m, l) => Math.max(m, l.completedAt ? new Date(l.completedAt).getTime() : 0), 0)
        return tb - ta
      })[0]
    if (!latest) return null
    const course = courses.find(c => c.id === latest.enroll.courseId)
    if (!course) return null
    const completedIds = new Set(Object.values(state.lessons).filter(l => l.courseId === course.id && l.completedAt).map(l => l.lessonId))
    const flat = course.modules.flatMap(m => m.lessons)
    const next = flat.find(l => !completedIds.has(l.id)) ?? flat[0]
    const pct = flat.length > 0 ? Math.round((completedIds.size / flat.length) * 100) : 0
    return { course, nextLesson: next, pct }
  }, [hydrated, state, courses])

  const liveCourses = filtered.filter(c => !c.coming_soon)
  const comingSoonCourses = filtered.filter(c => c.coming_soon)
  const featured = !inProgress ? (courses.find(c => !c.coming_soon) ?? null) : null

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '110px 18px 80px', color: '#f4f4f5' }}>

      {/* ── HEADER ────────────────────────────────────────── */}
      <header style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 8px' }}>
          R2BOT · Academy
        </p>
        <h1 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.05 }}>
          Build robots. Properly.
        </h1>
        <p style={{ color: '#c4b5fd', fontSize: 17, maxWidth: 720, lineHeight: 1.55, margin: 0 }}>
          Project-based robotics courses for learners everywhere. Spark to Edge.{' '}
          <Link href="/diagnostic" style={{ color: '#00E5FF', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Not sure where to start? Take the 5-minute placement test →
          </Link>
        </p>
      </header>

      {/* ── SPACED REPETITION BANNER ─────────────────────── */}
      {hydrated && <SpacedRepetitionBanner />}

      {/* ── CONTINUE WHERE YOU LEFT OFF ──────────────────── */}
      {inProgress && inProgress.nextLesson && (
        <section style={{ margin: '28px 0' }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, margin: '0 0 10px' }}>
            Continue where you left off
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center',
            padding: 20,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(165,107,255,0.08))',
            border: '1px solid rgba(0,229,255,0.3)', borderRadius: 16,
          }}>
            <div>
              <h2 style={{ fontSize: 22, color: '#fff', margin: '0 0 4px', fontWeight: 900 }}>{inProgress.course.title}</h2>
              <p style={{ color: '#c4b5fd', fontSize: 14, margin: '0 0 10px' }}>
                {inProgress.pct}% complete · Next: {inProgress.nextLesson.title}
              </p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${inProgress.pct}%`, height: '100%', background: 'linear-gradient(90deg,#00E5FF,#A56BFF)' }} />
              </div>
            </div>
            <Link href={`/academy/c/${inProgress.course.slug}/learn/${inProgress.nextLesson.slug}`}
              style={{ minHeight: 50, padding: '0 22px', background: 'linear-gradient(135deg,#00E5FF,#A56BFF)', color: '#0f0a1e', fontWeight: 900, fontSize: 15, borderRadius: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Resume →
            </Link>
          </div>
        </section>
      )}

      {/* ── FEATURED COURSE ──────────────────────────────── */}
      {featured && !inProgress && (
        <section style={{ margin: '28px 0' }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 10px' }}>Start here</p>
          <div style={{
            padding: 28,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(0,184,212,0.08))',
            border: `2px solid ${TRACK_ACCENT[featured.track]}`, borderRadius: 18,
          }}>
            <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px', color: TRACK_ACCENT[featured.track] }}>
              {TRACK_META[featured.track].emoji} {TRACK_META[featured.track].label} Track
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>{featured.title}</h2>
            <p style={{ color: '#c4b5fd', fontSize: 15, margin: '0 0 14px' }}>{featured.subtitle}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: '#d6f1ff', fontWeight: 700 }}>
              <li>📚 {featured.total_lessons} lessons</li>
              {featured.duration_hours && <li>⏱ {featured.duration_hours}h</li>}
              <li>⭐ {featured.total_xp} XP</li>
              {featured.cbse_aligned && <li>🇮🇳 CBSE</li>}
            </ul>
            <Link href={`/academy/c/${featured.slug}`}
              style={{ minHeight: 50, padding: '0 26px', background: `linear-gradient(135deg, ${TRACK_ACCENT[featured.track]}, #A56BFF)`, color: '#0f0a1e', fontWeight: 900, fontSize: 15, borderRadius: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Start now →
            </Link>
          </div>
        </section>
      )}

      {/* ── TRACK ROADMAP ────────────────────────────────── */}
      <section style={{ margin: '32px 0' }}>
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, margin: '0 0 14px' }}>Learning roadmap</p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))' }}>
          {(Object.keys(TRACK_META) as AcademyTrack[]).map((track, i) => {
            const meta = TRACK_META[track]
            const accent = TRACK_ACCENT[track]
            const hasLive = courses.filter(c => c.track === track).some(c => !c.coming_soon)
            const isRecommended = recommendedTrack === track
            return (
              <div key={track} style={{
                position: 'relative',
                border: isRecommended ? `2px solid #fbbf24` : `1px solid ${accent}44`,
                background: isRecommended ? 'rgba(251,191,36,0.08)' : `${accent}0d`,
                boxShadow: isRecommended ? '0 0 0 4px rgba(251,191,36,0.12)' : 'none',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                {isRecommended && (
                  <span style={{
                    position: 'absolute', top: -10, left: 14,
                    fontSize: 9, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 999,
                    background: '#fbbf24', color: '#1a0f00',
                  }}>
                    Your recommended track
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{meta.emoji}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 900, margin: '0 0 2px', color: accent }}>{meta.label}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.45 }}>{meta.desc}</p>
                  </div>
                  {!hasLive && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, border: `1px solid ${accent}44`, background: `${accent}11`, color: accent, whiteSpace: 'nowrap' }}>
                      Coming soon
                    </span>
                  )}
                </div>
                <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50%', background: `${accent}22`, color: accent, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                  {i + 1}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FILTERS ──────────────────────────────────────── */}
      <section style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '28px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 800 }}>Track:</span>
          {(['all', 'spark', 'wire', 'forge', 'edge'] as TrackFilter[]).map(t => {
            const active = trackFilter === t
            const accent = t !== 'all' ? TRACK_ACCENT[t as AcademyTrack] : null
            return (
              <button key={t} type="button" onClick={() => setTrackFilter(t)}
                style={{
                  padding: '6px 14px',
                  background: active && accent ? `linear-gradient(135deg, ${accent}, #A56BFF)` : active ? 'linear-gradient(135deg,#00E5FF,#A56BFF)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                  color: active ? '#0f0a1e' : '#c4b5fd',
                  borderRadius: 999, fontWeight: 700, fontSize: 13, textTransform: 'capitalize', cursor: 'pointer',
                }}>
                {t === 'all' ? 'All Tracks' : `${TRACK_META[t as AcademyTrack].emoji} ${TRACK_META[t as AcademyTrack].label}`}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 800 }}>Level:</span>
          {(['all', 'beginner', 'intermediate', 'advanced', 'research'] as LevelFilter[]).map(l => {
            const active = levelFilter === l
            return (
              <button key={l} type="button" onClick={() => setLevelFilter(l as LevelFilter)}
                style={{
                  padding: '6px 14px',
                  background: active ? 'linear-gradient(135deg,#00E5FF,#A56BFF)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                  color: active ? '#0f0a1e' : '#c4b5fd',
                  borderRadius: 999, fontWeight: 700, fontSize: 13, textTransform: 'capitalize', cursor: 'pointer',
                }}>
                {l === 'all' ? 'All Levels' : l}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── COURSE GRID ──────────────────────────────────── */}
      <section style={{ marginTop: 14 }}>
        {liveCourses.length === 0 && comingSoonCourses.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No courses match those filters yet. More launching soon.</p>
        ) : (
          <>
            {liveCourses.length > 0 && (
              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))' }}>
                {liveCourses.map(c => <CourseCard key={c.id} course={c} />)}
              </div>
            )}
            {comingSoonCourses.length > 0 && (
              <>
                <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, margin: '36px 0 14px' }}>
                  In development
                </p>
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))' }}>
                  {comingSoonCourses.map(c => <CourseCard key={c.id} course={c} />)}
                </div>
              </>
            )}
          </>
        )}
      </section>

    </main>
  )
}

function CourseCard({ course }: { course: Course }) {
  const accent = TRACK_ACCENT[course.track]
  const isComing = Boolean(course.coming_soon)
  const free = isFreeCourse(course.slug)
  return (
    <Link href={`/academy/c/${course.slug}`}
      style={{
        position: 'relative',
        padding: 20,
        background: 'rgba(15,18,32,0.6)',
        border: `1px solid ${isComing ? `${accent}33` : accent}`,
        borderRadius: 14, textDecoration: 'none', color: '#f4f4f5',
        display: 'flex', flexDirection: 'column', gap: 10,
        opacity: isComing ? 0.85 : 1,
        transition: 'transform .15s, box-shadow .15s',
      }}
    >
      {/* Free / Pro badge — top-right corner */}
      {!isComing && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 999,
          background: free ? 'rgba(16,185,129,0.18)' : 'rgba(251,191,36,0.18)',
          border: `1px solid ${free ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.5)'}`,
          color: free ? '#34d399' : '#fbbf24',
        }}>
          {free ? 'Free' : <>🔒 Pro</>}
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 64 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, fontWeight: 900, color: accent }}>
          {TRACK_META[course.track].emoji} {course.track.toUpperCase()}
        </span>
        {isComing ? (
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, border: `1px solid ${accent}44`, color: accent }}>
            Coming soon
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'capitalize' }}>{course.level}</span>
        )}
      </div>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{course.title}</h3>
      {course.subtitle && <p style={{ margin: 0, fontSize: 13, color: '#c4b5fd', lineHeight: 1.45 }}>{course.subtitle}</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 'auto 0 0', display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
        <li>📚 {course.total_lessons}</li>
        {course.duration_hours && <li>⏱ {course.duration_hours}h</li>}
        <li>⭐ {course.total_xp}</li>
        {course.language === 'both' && <li>🌐 Hi+En</li>}
      </ul>
      {isComing && <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 1 }}>Join the list →</p>}
    </Link>
  )
}
