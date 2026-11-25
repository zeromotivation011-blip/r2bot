'use client'

// components/kids/codelab/CodeLabIndexClient.tsx
// The mission list. Renders on the server with every mission linked; after
// hydration it reads local progress to show stars, locks (missions open in
// order within a band) and whether the child's robot has the parts needed.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { capabilitiesOf, loadDesign, ROBOT_CHANGED_EVENT, type Capability } from '@/lib/kids/robot-design'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { CAPABILITY_LABEL } from '@/lib/kids/code-lab/labels'

export interface IndexMission {
  id: string
  title: string
  emoji: string
  task: string
  learningGoal: string
  needs: Capability[]
}

export interface IndexBand {
  id: string
  name: string
  emoji: string
  ages: string
  gradient: string
  promise: string
  missions: IndexMission[]
}

export default function CodeLabIndexClient({ bands }: { bands: IndexBand[] }) {
  const [stars, setStars] = useState<Record<string, number> | null>(null)
  const [caps, setCaps] = useState<Set<Capability> | null>(null)
  const [robotName, setRobotName] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => {
      setStars(getProgress().codeMissions)
      const d = loadDesign()
      setCaps(capabilitiesOf(d))
      setRobotName(d.name)
    }
    refresh()
    window.addEventListener(KIDS_PROGRESS_EVENT, refresh)
    window.addEventListener(ROBOT_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, refresh)
      window.removeEventListener(ROBOT_CHANGED_EVENT, refresh)
    }
  }, [])

  return (
    <div className="space-y-10">
      {robotName && (
        <p className="rounded-2xl bg-white/5 p-4 text-purple-100">
          🤖 You are coding <strong className="text-white">{robotName}</strong>, the robot from your{' '}
          <Link href="/kids/workshop" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Workshop
          </Link>
          . Missions that need a new part show 🔧 — you can add it with one tap.
        </p>
      )}
      {bands.map((band) => {
        const done = stars ? band.missions.filter((m) => (stars[m.id] ?? 0) > 0).length : 0
        return (
          <section key={band.id} aria-labelledby={`band-${band.id}`} className="py-0">
            <div className={`rounded-3xl bg-gradient-to-r ${band.gradient} p-4`}>
              <h2 id={`band-${band.id}`} className="text-2xl font-black text-white">
                <span aria-hidden>{band.emoji}</span> {band.name} <span className="text-base font-bold opacity-90">· ages {band.ages}</span>
              </h2>
              <p className="text-sm font-bold text-white/90">{band.promise}</p>
              {stars && (
                <p className="mt-1 text-xs font-black text-white/90">
                  {done} of {band.missions.length} missions solved
                </p>
              )}
            </div>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {band.missions.map((m, i) => {
                const best = stars?.[m.id] ?? 0
                const prev = band.missions[i - 1]
                const isLocked = stars !== null && i > 0 && !(stars[prev.id] > 0)
                const needsPart = caps !== null && m.needs.some((c) => !caps.has(c))
                const body = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-black text-white">
                        <span aria-hidden>{isLocked ? '🔒' : m.emoji}</span> {i + 1}. {m.title}
                      </h3>
                      <span className="shrink-0 text-sm" aria-label={`${best} of 3 stars`}>
                        {'⭐'.repeat(best)}
                        <span className="opacity-30">{'☆'.repeat(3 - best)}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-purple-100">{m.task}</p>
                    <p className="mt-1 text-xs text-purple-300">Learn: {m.learningGoal}</p>
                    {m.needs.filter((c) => c !== 'move').length > 0 && (
                      <p className="mt-2 text-xs font-bold text-amber-200">
                        {needsPart ? '🔧 ' : '✓ '}Robot must {m.needs.filter((c) => c !== 'move').map((c) => CAPABILITY_LABEL[c]).join(' and ')}
                      </p>
                    )}
                    {isLocked && <p className="mt-2 text-xs font-bold text-purple-200">Finish “{prev.title}” to unlock</p>}
                  </>
                )
                return (
                  <li key={m.id}>
                    {isLocked ? (
                      <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">{body}</div>
                    ) : (
                      <Link
                        href={`/kids/code-lab/${m.id}`}
                        className="block h-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-400/60 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
