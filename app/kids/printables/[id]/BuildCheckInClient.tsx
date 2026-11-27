'use client'

// app/kids/printables/[id]/BuildCheckInClient.tsx — the "I built it" check-in
// for one Make It at Home build (roadmap #44). A question, never a photo:
//   1. Spark's question about the build (a wrong answer gets the hint, no penalty);
//   2. the right answer saves the check-in (lib/kids/builds/store.ts) and reports
//      kind 'project' through reportBestRun — first finish only, so re-checking
//      never farms XP; the global reward toast celebrates;
//   3. optional: what the "try one change" test showed, and for Inventors and
//      Engineers a one-line reflection, checked on the device (checkReflection;
//      a child who says they are hurt sees the helpline card, nothing is saved).
// Everything stays on this device.

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useId, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { BUILDS_EVENT, readBuilds, saveCheckIn, type BuildCheckIn } from '@/lib/kids/builds/store'
import { checkReflection, REFLECTION_MAX_CHARS } from '@/lib/kids/builds/reflection'
import { reportBestRun } from '@/lib/kids/universe/rewards'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'
import { playSound } from '@/lib/kids-audio'

const HelplineCardClient = dynamic(() => import('@/components/kids/ai/spark/HelplineCardClient'), { ssr: false })

export interface BuildCheckInProps {
  id: string
  rewardId: string
  title: string
  question: string
  options: [string, string, string]
  answer: number
  why: string
  change: string
  outcomes: [string, string, string]
  robodexHref: string
  robodexName: string
}

function isTeen(): boolean {
  const p = getProgress()
  return p.band === 'inventors' || p.band === 'engineers' || (p.age !== null && p.age >= 11)
}

function prettyDay(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

const optionBase =
  'flex min-h-[52px] w-full items-center rounded-2xl border px-4 py-2 text-left text-[17px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.98] motion-reduce:transform-none'

export default function BuildCheckInClient(props: BuildCheckInProps) {
  const { id, rewardId, title, question, options, answer, why, change, outcomes, robodexHref, robodexName } = props
  const [rec, setRec] = useState<BuildCheckIn | null | undefined>(undefined)
  const [teen, setTeen] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [tries, setTries] = useState(0)
  const [reflection, setReflection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [crisis, setCrisis] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const inputId = useId()

  useEffect(() => {
    const load = () => {
      const r = readBuilds()[id] ?? null
      setRec(r)
      setReflection(r?.r ?? '')
      setTeen(isTeen())
    }
    load()
    window.addEventListener(BUILDS_EVENT, load)
    window.addEventListener(KIDS_PROFILE_EVENT, load)
    window.addEventListener(KIDS_PROGRESS_EVENT, load)
    return () => {
      window.removeEventListener(BUILDS_EVENT, load)
      window.removeEventListener(KIDS_PROFILE_EVENT, load)
      window.removeEventListener(KIDS_PROGRESS_EVENT, load)
    }
  }, [id])

  function choose(i: number) {
    if (rec) return
    const attempts = tries + 1
    setTries(attempts)
    setPicked(i)
    if (i !== answer) {
      playSound('wrong')
      return
    }
    playSound('correct')
    const next = saveCheckIn(id, { attempts })
    if (!next) {
      setError('This device would not save your check-in (storage may be full or switched off). Ask a grown-up to check the browser settings.')
      return
    }
    // First finish only: re-checking a build never pays twice.
    reportBestRun({ kind: 'project', id: rewardId, score: 1, stars: attempts === 1 ? 3 : 2, attempts })
    setRec(next)
  }

  function pickOutcome(i: number) {
    const next = saveCheckIn(id, { test: i })
    if (next) {
      setRec(next)
      setSaved('Your test result is in your portfolio.')
    }
  }

  function saveReflection(e: React.FormEvent) {
    e.preventDefault()
    const c = checkReflection(reflection)
    if (!c.ok) {
      setError(c.error)
      setCrisis(c.crisis)
      return
    }
    setError(null)
    setCrisis(false)
    const next = saveCheckIn(id, { reflection: c.text })
    if (next) {
      setRec(next)
      setSaved(c.text ? 'Reflection saved to your portfolio.' : 'Reflection cleared.')
    }
  }

  // Same size before and after mount: no layout shift.
  if (rec === undefined) return <div className="no-print min-h-[320px] rounded-[28px] bg-white/[0.03]" aria-hidden />

  return (
    <section aria-labelledby={`${inputId}-h`} className="no-print rounded-[28px] border border-amber-400/40 bg-gradient-to-b from-amber-500/[0.12] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <h2 id={`${inputId}-h`} className="font-display text-2xl font-bold text-[#EEF2F8]">
        {rec ? 'You built it! ✓' : 'I built it!'}
      </h2>

      {!rec && (
        <>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Built your {title.toLowerCase()}? Answer Spark’s question to add it to your portfolio.</p>
          <p className="mt-4 font-display text-lg font-bold text-[#EEF2F8]">{question}</p>
          <div className="mt-3 grid gap-2" role="group" aria-label="Pick an answer">
            {options.map((o, i) => {
              const wrong = picked === i && i !== answer
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => choose(i)}
                  aria-pressed={picked === i}
                  className={`${optionBase} ${wrong ? 'border-amber-400/60 bg-amber-500/10 text-amber-100' : 'border-white/15 bg-[#111C32] text-[#EEF2F8] hover:border-amber-400/60'}`}
                >
                  {o}
                </button>
              )
            })}
          </div>
          <div aria-live="polite" className="min-h-[28px]">
            {picked !== null && picked !== answer && (
              <p data-cue="no" className="mt-3 text-[16px] font-semibold text-amber-200">
                Not quite — have another look. Hint: {why}
              </p>
            )}
          </div>
        </>
      )}

      {rec && (
        <>
          <p data-cue="ok" role="status" className="mt-1 text-[17px] font-semibold text-emerald-200">
            Checked in on {prettyDay(rec.d)}. It is a project in your portfolio. {why}
          </p>

          <div className="mt-5">
            <p className="font-display text-lg font-bold text-[#EEF2F8]">Did you try one change? ({change})</p>
            <p className="text-[15px] text-[#A7B0C0]">There is no wrong answer: it is your result.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3" role="group" aria-label="What happened in your test">
              {outcomes.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => pickOutcome(i)}
                  aria-pressed={rec.t === i}
                  className={`${optionBase} text-[15px] ${rec.t === i ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-50' : 'border-white/15 bg-[#111C32] text-[#EEF2F8] hover:border-cyan-400/60'}`}
                >
                  {rec.t === i ? '✓ ' : ''}
                  {o}
                </button>
              ))}
            </div>
          </div>

          {teen && (
            <form onSubmit={saveReflection} className="mt-5" noValidate>
              <label htmlFor={inputId} className="font-display text-lg font-bold text-[#EEF2F8]">
                One-line reflection
              </label>
              <p className="text-[15px] text-[#A7B0C0]">What worked, what surprised you, or what you would change next time. No names or places.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id={inputId}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  maxLength={REFLECTION_MAX_CHARS}
                  autoComplete="off"
                  placeholder="e.g. A stiffer spring needed a harder bump"
                  className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-[17px] text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
                />
                <button type="submit" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  Save
                </button>
              </div>
            </form>
          )}

          <div aria-live="polite" className="min-h-[24px]">
            {saved && !error && <p className="mt-3 text-[15px] font-semibold text-emerald-200">{saved}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={robodexHref} className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 font-display font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              Meet the real robot: {robodexName} →
            </Link>
            <Link href="/kids/portfolio" className="inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-4 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              See my portfolio →
            </Link>
          </div>
        </>
      )}

      {error && (
        <div role="alert" className="mt-3">
          <p className="text-[15px] font-semibold text-red-200">{error}</p>
          {crisis && (
            <div className="mt-3">
              <HelplineCardClient />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
