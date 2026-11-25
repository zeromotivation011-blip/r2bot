'use client'

// components/kids/activities/templates/sequence-path/KitClient.tsx
// Small shared UI for the logic & code templates (sequence-path, debug-program,
// predict-output, flowchart-builder, logic-gates, binary-encoder): the
// submit → feedback → retry → done flow, buttons and a reduced-motion hook.
// Kept here (not in components/kids/ui) because it is private to these six.

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { CheckResult, TemplateProps } from '@/lib/kids/activities/types'
import { playSound, primeAudio } from '@/lib/kids-audio'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener?.('change', set)
    return () => mq.removeEventListener?.('change', set)
  }, [])
  return reduced
}

export interface AttemptState {
  attempts: number
  result: CheckResult | null
  submit: () => CheckResult
  /** Clear feedback so the child can try again. */
  retry: () => void
  /** Hand control back to the shell. */
  finish: () => void
  done: boolean
}

/** Submit/feedback/retry/done bookkeeping shared by the templates. */
export function useAttempts<P, A>(props: Pick<TemplateProps<P, A>, 'onSubmit' | 'onDone'>, getAnswer: () => A): AttemptState {
  const { onSubmit, onDone } = props
  const [attempts, setAttempts] = useState(0)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [done, setDone] = useState(false)
  const submit = useCallback(() => {
    primeAudio()
    const r = onSubmit(getAnswer())
    setAttempts((n) => n + 1)
    setResult(r)
    playSound(r.correct ? 'correct' : 'wrong')
    return r
  }, [onSubmit, getAnswer])
  const retry = useCallback(() => {
    playSound('click')
    setResult(null)
  }, [])
  const finish = useCallback(() => {
    if (done) return
    setDone(true)
    onDone({ correct: !!result?.correct, attempts: Math.max(attempts, 1), score: result?.correct ? (result.score ?? 1) : (result?.score ?? 0) })
  }, [done, onDone, result, attempts])
  return { attempts, result, submit, retry, finish, done }
}

type BtnTone = 'primary' | 'secondary' | 'ghost' | 'cyan'

export function Btn({
  children,
  onClick,
  tone = 'secondary',
  disabled,
  className = '',
  ariaLabel,
  ariaPressed,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  tone?: BtnTone
  disabled?: boolean
  className?: string
  ariaLabel?: string
  ariaPressed?: boolean
  type?: 'button' | 'submit'
}) {
  const tones: Record<BtnTone, string> = {
    primary: 'bg-amber-500 text-[#1A1103] hover:bg-amber-400 shadow-[0_6px_0_#B8420A] active:shadow-[0_2px_0_#B8420A] active:translate-y-[4px]',
    secondary: 'bg-[#19263F] text-[#EEF2F8] border border-white/15 hover:border-white/30',
    ghost: 'bg-transparent text-[#A7B0C0] hover:text-[#EEF2F8] border border-white/10',
    cyan: 'bg-[#00B8D4] text-[#04151A] hover:bg-[#00E5FF]',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`inline-flex min-h-12 min-w-12 select-none items-center justify-center gap-2 rounded-2xl px-4 font-display text-[16px] font-bold transition-[transform,background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

/** The verdict card: kind, specific feedback, then retry / continue. */
export function FeedbackCard({ state, giveUpAfter = 3 }: { state: AttemptState; giveUpAfter?: number }) {
  const { result, attempts, retry, finish, done } = state
  if (!result) return null
  const ok = result.correct
  return (
    <div
      role="status"
      aria-live="polite"
      className={`motion-safe:animate-[tplPop_.28s_cubic-bezier(.22,.61,.36,1)] rounded-[20px] border p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5 ${ok ? 'border-[#22C55E]/50 bg-[#0F2A1E]' : 'border-amber-400/40 bg-[#2A1A0E]'}`}
    >
      <style>{'@keyframes tplPop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}'}</style>
      <div className="flex items-start gap-3">
        <SparkFace mood={ok ? 'happy' : 'think'} />
        <div className="min-w-0 flex-1">
          <p className={`font-display text-[19px] font-bold ${ok ? 'text-[#4ADE80]' : 'text-amber-300'}`}>{ok ? 'You did it!' : result.score && result.score >= 0.5 ? 'So close!' : 'Not yet — let’s find out why'}</p>
          <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{result.feedback}</p>
        </div>
      </div>
      {!done && (
        <div className="mt-4 flex flex-wrap gap-2">
          {ok ? (
            <Btn tone="primary" onClick={finish}>Continue →</Btn>
          ) : (
            <>
              <Btn tone="primary" onClick={retry}>Try again</Btn>
              {attempts >= giveUpAfter && <Btn tone="ghost" onClick={finish}>Skip for now</Btn>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Spark, the orange guide robot, as a tiny SVG face. */
export function SparkFace({ mood }: { mood: 'happy' | 'think' }) {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden>
      <rect x="6" y="10" width="36" height="30" rx="10" fill="#FC6818" />
      <rect x="11" y="15" width="26" height="18" rx="7" fill="#0A1120" />
      <line x1="24" y1="10" x2="24" y2="4" stroke="#FC6818" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="4" r="3" fill="#00E5FF" />
      {mood === 'happy' ? (
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

/** Card surface every template sits in. */
export function Panel({ children, className = '', title }: { children: ReactNode; className?: string; title?: ReactNode }) {
  return (
    <section className={`rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-4 ${className}`}>
      {title && <h3 className="mb-2 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-[#A7B0C0]">{title}</h3>}
      {children}
    </section>
  )
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
