'use client'

// components/kids/galaxy/HintLadderClient.tsx
// Roadmap #26 — the hint ladder and "Spark shows me". Shared by the Skill
// Galaxy player and Code Lab missions. It appears only after a failed try and
// climbs three steps, one tap each, never all at once:
//   1. Goal     — the goal is highlighted (the parent rings it) and read aloud.
//   2. Clue     — a targeted hint built from the last check's feedback.
//   3. Show me  — a worked solution on a TWIN problem, revealed step by step,
//                 then "Your turn!" sends the child back to their own one.
// Every step is spoken with sparkSays (silent when voice is off in Settings).
// Using any step caps the result at 2 stars; XP is still earned (the parent
// applies the cap and passes `hintsUsed` to the reward report).

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'
import { useKidsReducedMotion } from '@/lib/kids/settings'

export interface WorkedExample {
  title: string
  intro?: string
  /** What Spark did, in order. */
  steps: string[]
  /** Why it works. */
  why?: string
  /** Shown before the steps as a mono "program" block when true (Code Lab). */
  code?: boolean
}

export type LadderStep = 1 | 2 | 3

interface Props {
  /** The child has failed at least once: the ladder may show. */
  available: boolean
  /** The goal, in one or two sentences. */
  goal: string
  /** Targeted clues, most specific first (the last check's feedback). Step 2 shows them one at a time. */
  clues: string[]
  /** The worked twin; null = none (the ladder stops at the clue); 'loading' while it is fetched. */
  worked: WorkedExample | null | 'loading'
  /** Called when a step is opened (parent: mark hints used, ring the goal, fetch the twin). */
  onStep: (step: LadderStep) => void
  /** "Your turn!": back to the child's own problem. */
  onYourTurn: () => void
  /** Changes when the ladder should start again (a new activity). */
  resetKey?: string | number
  /** Name of the thing being solved, for copy ("mission"). */
  noun?: string
  /** Re-open at this step (e.g. the same ladder shown again on another screen). Read on mount and on reset. */
  initialStep?: 0 | LadderStep
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const stepBtn = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-base font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.25)] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[.97] motion-reduce:transform-none ${focusRing}`
const ghostBtn = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/[0.16] bg-white/[0.04] px-4 font-display text-[15px] font-bold text-[#EEF2F8] transition-transform duration-150 hover:-translate-y-0.5 hover:border-white/30 active:scale-[.97] motion-reduce:transform-none ${focusRing}`

const STEP_LABEL: Record<LadderStep, string> = { 1: 'Show me the goal', 2: 'Give me a clue', 3: 'Spark shows me' }
const STEP_NAME: Record<LadderStep, string> = { 1: 'Goal', 2: 'Clue', 3: 'Show me' }

function SparkFace({ happy }: { happy: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden>
      <rect x="6" y="10" width="36" height="30" rx="10" fill="#FC6818" />
      <rect x="11" y="15" width="26" height="18" rx="7" fill="#0A1120" />
      <line x1="24" y1="10" x2="24" y2="4" stroke="#FC6818" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="4" r="3" fill="#00E5FF" />
      {happy ? (
        <>
          <path d="M16 23 q3 -4 6 0" stroke="#00E5FF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M26 23 q3 -4 6 0" stroke="#00E5FF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M19 28 q5 4 10 0" stroke="#00E5FF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="19" cy="23" r="2.6" fill="#00E5FF" />
          <circle cx="29" cy="23" r="2.6" fill="#00E5FF" />
          <path d="M20 29 h8" stroke="#00E5FF" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function SpeakButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => sparkSays(text)}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-amber-300 hover:bg-white/[0.06] hover:text-amber-200 ${focusRing}`}
      aria-label="Hear it again"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    </button>
  )
}

export default function HintLadderClient({ available, goal, clues, worked, onStep, onYourTurn, resetKey, noun = 'mission', initialStep = 0 }: Props) {
  const reduced = useKidsReducedMotion()
  const [step, setStep] = useState<0 | LadderStep>(initialStep)
  const initialRef = useRef(initialStep)
  initialRef.current = initialStep
  // Speak only for steps the child opens here, not for one restored on mount.
  const restored = useRef(initialStep)
  const [clueIdx, setClueIdx] = useState(0)
  const [shown, setShown] = useState(0)
  const headingId = useId()
  const lastRef = useRef<HTMLLIElement>(null)
  const stepsListRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    setStep(initialRef.current)
    restored.current = initialRef.current
    setClueIdx(0)
    setShown(0)
  }, [resetKey])

  useEffect(() => () => cancelSparkSpeech(), [])

  const say = useCallback((text: string) => {
    if (text) sparkSays(text)
  }, [])

  const workedReady = worked !== null && worked !== 'loading'
  const maxStep: LadderStep = worked === null ? 2 : 3
  const clue = clues[Math.min(clueIdx, clues.length - 1)] ?? ''

  // Speak the step that just opened.
  useEffect(() => {
    if (step !== 0 && step === restored.current) return
    if (step === 1) say(`Here is your goal. ${goal}`)
    else if (step === 2) say(`Here is a clue. ${clue}`)
    // step 3 speaks when the worked example arrives (below)
  }, [step, goal, clue, say])

  useEffect(() => {
    if (step === 3 && workedReady && shown === 0) {
      setShown(1)
      if (restored.current !== 3) say(`Watch me solve a twin ${noun}. ${worked.title}. ${worked.intro ?? ''} First: ${worked.steps[0] ?? ''}`)
    }
  }, [step, workedReady, worked, shown, noun, say])

  useEffect(() => {
    if (shown > 1) lastRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [shown, reduced])

  if (!available) return null

  const open = (s: LadderStep) => {
    playSound('click')
    restored.current = 0
    setStep(s)
    onStep(s)
  }

  const nextWorkedStep = () => {
    if (!workedReady) return
    playSound('click')
    const n = Math.min(worked.steps.length, shown + 1)
    setShown(n)
    if (n <= worked.steps.length) say(worked.steps[n - 1] ?? '')
  }

  const allShown = workedReady && shown >= worked.steps.length
  const nextStep = step < maxStep ? ((step + 1) as LadderStep) : null

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[20px] border border-amber-400/30 bg-[#111C32] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5"
      data-testid="hint-ladder"
    >
      <div className="flex items-start gap-3">
        <SparkFace happy={step === 3 && allShown} />
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="font-display text-lg font-bold leading-tight text-[#EEF2F8]">
            {step === 0 ? 'Stuck? Spark can help.' : 'Spark is helping'}
          </h2>
          <p className="mt-0.5 text-[15px] leading-snug text-[#A7B0C0]">
            Hints are smart, not cheating. With a hint you can still win up to 2 stars and earn XP.
          </p>
        </div>
      </div>

      {/* Progress through the three steps */}
      <ol className="mt-3 flex items-center gap-2" aria-label="Hint steps">
        {([1, 2, 3] as LadderStep[]).filter((s) => s <= maxStep).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-display text-sm font-bold ${
                step >= s ? 'bg-amber-500 text-[#1A1103]' : 'border border-white/[0.16] text-[#A7B0C0]'
              }`}
              aria-current={step === s ? 'step' : undefined}
            >
              {s}
            </span>
            <span className={`text-sm font-semibold ${step >= s ? 'text-[#EEF2F8]' : 'text-[#6E7888]'}`}>{STEP_NAME[s]}</span>
            {s < maxStep && <span aria-hidden className="h-px w-4 bg-white/15 sm:w-8" />}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-col gap-3" aria-live="polite">
        {step >= 1 && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Your goal</p>
                <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{goal}</p>
              </div>
              <SpeakButton text={goal} />
            </div>
          </div>
        )}

        {step >= 2 && clue && (
          <div className="rounded-2xl border border-[#00B8D4]/40 bg-[#00B8D4]/10 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-[#67E8F9]">Clue</p>
                <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{clue}</p>
              </div>
              <SpeakButton text={clue} />
            </div>
            {clueIdx < clues.length - 1 && step === 2 && (
              <button
                type="button"
                className={`${ghostBtn} mt-2`}
                onClick={() => {
                  playSound('click')
                  setClueIdx((i) => i + 1)
                }}
              >
                Another clue
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-white/[0.16] bg-[#19263F] p-3" data-testid="worked-example">
            {worked === 'loading' || !workedReady ? (
              <div className="flex min-h-[96px] items-center gap-3" role="status">
                <span className="h-3 w-40 rounded-full bg-white/10 motion-safe:animate-pulse" aria-hidden />
                <span className="text-[15px] text-[#A7B0C0]">Spark is setting up a twin {noun}…</span>
              </div>
            ) : (
              <>
                <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Spark shows me · a twin {noun}</p>
                <h3 className="mt-1 font-display text-lg font-bold leading-tight text-[#EEF2F8]">{worked.title}</h3>
                {worked.intro && <p className="mt-1 text-[15px] leading-snug text-[#A7B0C0]">{worked.intro}</p>}
                <ol
                  ref={stepsListRef}
                  className={`mt-3 flex flex-col gap-1.5 ${worked.code ? 'rounded-xl bg-[#0A1120] p-3 font-mono text-[15px]' : ''}`}
                  aria-label="Spark’s steps"
                >
                  {worked.steps.slice(0, shown).map((s, i) => (
                    <li
                      key={i}
                      ref={i === shown - 1 ? lastRef : undefined}
                      className={`flex items-start gap-2 text-[16px] leading-relaxed text-[#EEF2F8]`}
                    >
                      {!worked.code && (
                        <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/10 px-1.5 font-display text-xs font-bold text-amber-300" aria-hidden>
                          {i + 1}
                        </span>
                      )}
                      <span className="min-w-0 whitespace-pre-wrap">{s}</span>
                    </li>
                  ))}
                </ol>
                {!allShown ? (
                  <button type="button" className={`${stepBtn} mt-3`} onClick={nextWorkedStep}>
                    Next step <span aria-hidden>→</span>
                    <span className="sr-only">
                      ({shown} of {worked.steps.length})
                    </span>
                  </button>
                ) : (
                  <>
                    {worked.why && (
                      <div className="mt-3 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-3">
                        <p className="font-display text-sm font-bold uppercase tracking-wider text-[#86EFAC]">Why it works</p>
                        <p className="mt-1 text-[16px] leading-relaxed text-[#EEF2F8]">{worked.why}</p>
                      </div>
                    )}
                    <p className="mt-3 text-[16px] font-semibold text-[#EEF2F8]">Now your {noun} is the twin. Same idea, different numbers. Your turn!</p>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {nextStep && (step < 3 || !workedReady) && (
          <button type="button" className={stepBtn} onClick={() => open(nextStep)} data-testid={`hint-step-${nextStep}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1103]/15 text-sm" aria-hidden>
              {nextStep}
            </span>
            {STEP_LABEL[nextStep]}
          </button>
        )}
        {step > 0 && (step < 3 || allShown || worked === null) && (
          <button
            type="button"
            className={step === maxStep && (allShown || worked === null) ? stepBtn : ghostBtn}
            onClick={() => {
              cancelSparkSpeech()
              playSound('click')
              if (step === 3) say(`Your turn! Try your own ${noun} now.`)
              onYourTurn()
            }}
            data-testid="hint-your-turn"
          >
            {step === 3 ? 'Your turn!' : 'Back to my try'}
          </button>
        )}
      </div>
    </section>
  )
}
