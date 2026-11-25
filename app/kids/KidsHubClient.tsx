'use client'

// app/kids/KidsHubClient.tsx
// "Who's playing?" band picker + a personal next-step strip for the kids hub.
// Renders the same markup on the server (no band chosen), so there is no layout
// shift; after hydration it reads local progress and highlights the child's band.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { KIDS_BANDS, getBand, type BandId } from '@/lib/kids/bands'
import { getProgress, saveProgress, KIDS_PROGRESS_EVENT, type KidsProgress } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'

interface NextStep {
  href: string
  label: string
  why: string
}

function nextStepFor(p: KidsProgress): NextStep {
  const episodes = Object.keys(p.episodesDone).length
  const missions = Object.keys(p.codeMissions).length
  if (episodes === 0) return { href: '/kids/stories', label: 'Watch your first story', why: 'Meet Spark and find out what makes a robot a robot.' }
  if (p.robotsBuilt === 0) return { href: '/kids/workshop', label: 'Build your robot', why: 'Choose its body, wheels, eyes and tools.' }
  if (missions === 0) return { href: '/kids/code-lab', label: 'Drive your robot with code', why: 'Your first Code Lab mission is waiting.' }
  if (missions < 5) return { href: '/kids/code-lab', label: 'Next Code Lab mission', why: `You have solved ${missions}. Keep going!` }
  return { href: '/kids/stories', label: 'Watch a new episode', why: 'New ideas unlock harder missions.' }
}

export function KidsHubClient() {
  const [progress, setProgress] = useState<KidsProgress | null>(null)

  useEffect(() => {
    const read = () => setProgress(getProgress())
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, read)
  }, [])

  const band = getBand(progress?.band)
  const step = progress ? nextStepFor(progress) : null

  const choose = (id: BandId) => {
    primeAudio()
    playSound('correct')
    const b = getBand(id)
    saveProgress({ band: id, age: b ? Math.round((b.minAge + b.maxAge) / 2) : null })
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6" aria-labelledby="who-h">
      {/* Personal strip: fixed height so nothing jumps after hydration. */}
      <div className="flex min-h-[88px] flex-col justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {progress && band && step ? (
          <>
            <div>
              <p className="text-sm font-bold text-white/60">
                {band.emoji} {band.name} · ⭐ {progress.totalStars} stars
              </p>
              <p className="text-lg font-black text-white">{step.label}</p>
              <p className="text-sm text-white/60">{step.why}</p>
            </div>
            <Link
              href={step.href}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-2xl bg-amber-400 px-5 font-black text-slate-900 transition hover:scale-[1.03]"
            >
              Go →
            </Link>
          </>
        ) : (
          <div>
            <p className="text-lg font-black text-white">Who’s playing today?</p>
            <p className="text-sm text-white/60">Pick your group and we’ll show you where to start.</p>
          </div>
        )}
      </div>

      <h2 id="who-h" className="sr-only">
        Choose an age group
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Age group">
        {KIDS_BANDS.map((b) => {
          const on = band?.id === b.id
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(b.id)}
              className={`relative min-h-[112px] overflow-hidden rounded-3xl border-2 p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-300 ${
                on ? 'border-amber-300 bg-white/[0.12] shadow-lg shadow-amber-500/20' : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${b.gradient}`} aria-hidden />
              <span className="text-3xl" aria-hidden>
                {b.emoji}
              </span>
              <span className="mt-1 block text-lg font-black text-white">{b.name}</span>
              <span className="block text-sm font-semibold text-white/60">Ages {b.ages}</span>
              {on && (
                <span className="absolute right-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-black text-slate-900">
                  You!
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
