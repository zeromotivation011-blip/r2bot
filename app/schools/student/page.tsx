'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SchoolSideNav } from '../_components/SchoolSideNav'
import {
  SCHOOL_GRADES,
  SCHOOL_TRACKS,
  SCHOOL_CURRICULUM,
  MISSIONS,
  PROJECTS,
  type SchoolGradeId,
  type SchoolTrackId,
} from '@/lib/school-curriculum'

const LS_GRADE = 'r2bot_school_grade'
const LS_TRACK = 'r2bot_school_track'
const LS_XP = 'r2bot_school_xp'
const LS_COMPLETED_LESSONS = 'r2bot_school_completed_lessons'
const LS_COMPLETED_MISSIONS = 'r2bot_school_completed_missions'

function safeGet(k: string): string | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(k) } catch { return null }
}
function safeSet(k: string, v: string) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(k, v) } catch {}
}

export default function StudentPortalPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const showProgress = sp?.get('progress') === '1'

  const [grade, setGrade] = useState<SchoolGradeId | null>(null)
  const [track, setTrack] = useState<SchoolTrackId | null>(null)
  const [xp, setXp] = useState(0)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [completedMissions, setCompletedMissions] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setGrade((safeGet(LS_GRADE) as SchoolGradeId) || null)
    setTrack((safeGet(LS_TRACK) as SchoolTrackId) || null)
    setXp(parseInt(safeGet(LS_XP) || '0', 10) || 0)
    try {
      setCompletedLessons(JSON.parse(safeGet(LS_COMPLETED_LESSONS) || '[]'))
      setCompletedMissions(JSON.parse(safeGet(LS_COMPLETED_MISSIONS) || '[]'))
    } catch {}
    setReady(true)
  }, [])

  // Next-unit / next-mission / next-project derivations
  const grading = grade ? SCHOOL_CURRICULUM[grade] : undefined
  const nextUnit = useMemo(() => {
    if (!grading) return undefined
    return grading.units.find(u => !completedLessons.includes(u.id)) ?? grading.units[0]
  }, [grading, completedLessons])

  const nextMission = useMemo(() => {
    return MISSIONS.find(m => !completedMissions.includes(m.id)) ?? MISSIONS[0]
  }, [completedMissions])

  const currentProject = PROJECTS[0]

  // Grade selection handler
  const handleSelectGrade = (g: SchoolGradeId) => {
    safeSet(LS_GRADE, g)
    setGrade(g)
    if (!track) router.push('/schools/diagnostic')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Initial grade picker
  if (!grade) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Header xp={0} grade={null} track={null} />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Pick your grade to begin</h1>
          <p className="mt-2 text-gray-400">We&apos;ll personalise everything — lessons, simulator missions, projects.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {SCHOOL_GRADES.map(g => {
              const units = SCHOOL_CURRICULUM[g.id].units.length
              const missions = MISSIONS.length
              return (
                <button
                  key={g.id}
                  onClick={() => handleSelectGrade(g.id)}
                  className="text-left rounded-2xl border border-gray-800 bg-gray-900 p-6 hover:border-amber-500/50 hover:bg-gray-900/80 transition-colors"
                >
                  <div className="text-5xl">{g.emoji}</div>
                  <h2 className="mt-3 text-xl font-bold text-white">{g.label}</h2>
                  <p className="text-sm text-gray-400 mt-1">{g.tagline}</p>
                  <p className="mt-4 text-xs text-gray-500">{units} units · {missions} missions</p>
                  <div className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black">
                    Start Learning →
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Dashboard
  const gradeMeta = SCHOOL_GRADES.find(g => g.id === grade)!
  const trackMeta = track ? SCHOOL_TRACKS.find(t => t.id === track) : null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <div className="flex-1 min-w-0 pb-20 md:pb-6">
        <Header xp={xp} grade={gradeMeta.label} track={trackMeta?.label ?? null} />

        <main className="mx-auto max-w-6xl px-4 py-6">
          {/* Banner if no track */}
          {!track && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-amber-300 font-semibold">Take the 20-question placement test</p>
                <p className="text-xs text-gray-400">Get matched to Beginner, Explorer, or Builder.</p>
              </div>
              <Link href="/schools/diagnostic" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black">Take diagnostic →</Link>
            </div>
          )}

          {/* 3-column dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Continue Learning */}
            <DashCard
              eyebrow="📚 Continue Learning"
              title={nextUnit?.title || 'Pick a unit'}
              body={nextUnit?.tagline || '—'}
              progress={completedLessons.length / Math.max(grading!.units.length, 1)}
              progressLabel={`${completedLessons.length} / ${grading!.units.length} units complete`}
              cta={{
                label: 'Resume',
                href: nextUnit ? `/schools/learn/${grade}/${nextUnit.id}` : '/schools/learn',
              }}
            />

            {/* Next Mission */}
            <DashCard
              eyebrow="🔬 Next Mission"
              title={`${nextMission.emoji} ${nextMission.title}`}
              body={nextMission.story}
              badge={nextMission.difficulty}
              cta={{
                label: 'Launch Simulator',
                href: `/schools/simulate?m=${nextMission.id}`,
              }}
            />

            {/* Current Project */}
            <DashCard
              eyebrow="🚀 Current Project"
              title={`${currentProject.emoji} ${currentProject.title}`}
              body={currentProject.tagline}
              ringPercent={Math.round((completedMissions.length / MISSIONS.length) * 100)}
              cta={{
                label: 'Open Lab',
                href: `/schools/projects/${currentProject.id}`,
              }}
            />
          </div>

          {/* Quick access bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <QuickLink icon="📚" label="Lessons"   href={`/schools/learn/${grade}/${grading!.units[0].id}`} />
            <QuickLink icon="🔬" label="Simulator" href="/schools/simulate" />
            <QuickLink icon="🚀" label="Projects"  href="/schools/projects" />
            <QuickLink icon="🎥" label="Videos"    href="/schools/videos" />
            <QuickLink icon="🏆" label="Progress"  href="/schools/student?progress=1" />
          </div>

          {/* Progress modal */}
          {showProgress && (
            <ProgressModal
              xp={xp}
              completedLessons={completedLessons.length}
              completedMissions={completedMissions.length}
              totalLessons={grading!.units.length}
              totalMissions={MISSIONS.length}
              onClose={() => router.push('/schools/student')}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function Header({ xp, grade, track }: { xp: number; grade: string | null; track: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/schools" className="text-amber-400 font-semibold text-sm hover:underline">← Schools</Link>
          <span className="hidden md:inline text-gray-700">|</span>
          <p className="text-sm md:text-base text-gray-200">
            <span className="text-white font-semibold">Welcome back 👋</span>
            {grade && <span className="ml-3 text-gray-400">Grade {grade}</span>}
            {track && <span className="ml-3 text-gray-400">{track} track</span>}
          </p>
        </div>
        <div className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-mono text-amber-300">
          ⚡ {xp} XP
        </div>
      </div>
    </header>
  )
}

function DashCard(props: {
  eyebrow: string
  title: string
  body: string
  cta: { label: string; href: string }
  progress?: number
  progressLabel?: string
  badge?: string
  ringPercent?: number
}) {
  const { eyebrow, title, body, cta, progress, progressLabel, badge, ringPercent } = props
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex flex-col">
      <p className="text-xs uppercase tracking-wide text-gray-500">{eyebrow}</p>
      <h3 className="mt-2 font-bold text-white text-lg leading-tight">{title}</h3>
      <p className="text-sm text-gray-400 mt-1.5 line-clamp-3">{body}</p>

      <div className="mt-3 flex items-center gap-3">
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
            {badge}
          </span>
        )}
        {typeof ringPercent === 'number' && (
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1f2937" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="3"
                strokeDasharray={`${ringPercent}, 100`}
                transform="rotate(-90 18 18)" strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-amber-400">{ringPercent}%</span>
          </div>
        )}
      </div>

      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          {progressLabel && <p className="mt-1 text-[10px] text-gray-500">{progressLabel}</p>}
        </div>
      )}

      <Link
        href={cta.href}
        className="mt-auto inline-block rounded-xl bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black hover:bg-amber-400 transition-colors mt-4"
      >
        {cta.label} →
      </Link>
    </div>
  )
}

function QuickLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3 py-3 text-sm font-medium text-gray-200 hover:border-amber-500/40 transition-colors"
    >
      <span className="text-lg">{icon}</span>{label}
    </Link>
  )
}

function ProgressModal({ xp, completedLessons, completedMissions, totalLessons, totalMissions, onClose }:
  { xp: number; completedLessons: number; completedMissions: number; totalLessons: number; totalMissions: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold">🏆 Your progress</h2>
        <div className="mt-4 space-y-3 text-sm">
          <Row label="XP earned"          value={`${xp}`} />
          <Row label="Lessons completed"  value={`${completedLessons} / ${totalLessons}`} />
          <Row label="Missions completed" value={`${completedMissions} / ${totalMissions}`} />
          <Row label="Badges"             value={badgesFor(xp)} />
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-black">Close</button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-amber-400 font-mono">{value}</span>
    </div>
  )
}

function badgesFor(xp: number): string {
  const list: string[] = []
  if (xp >= 50) list.push('🥉 First steps')
  if (xp >= 200) list.push('🥈 Mission ace')
  if (xp >= 500) list.push('🥇 Builder')
  if (xp >= 1000) list.push('🏆 Sensei')
  return list.length ? list.join(' · ') : '—'
}
