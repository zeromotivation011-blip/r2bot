'use client'

// components/kids/course/CheckStepClient.tsx
// Beat 5 of a session: Check. The three questions, read aloud, with picture
// options in a fresh order for every child and every attempt (unless a
// question's options have a natural order — keepOrder). Whatever the child
// picks, the "why" is shown and spoken. Never a score, never "wrong!".

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Quiz } from '@/lib/kids/curriculum/types'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'
import { shuffledOrder } from './course-state'

interface Props {
  quiz: Quiz
  checked: boolean
  onChecked: () => void
  onNext: () => void
}

export default function CheckStepClient({ quiz, checked, onChecked, onNext }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [q, setQ] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const whyRef = useRef<HTMLDivElement>(null)
  // A fresh order per attempt; computed after mount so server and client agree.
  const [orders, setOrders] = useState<number[][] | null>(null)
  useEffect(() => {
    setOrders(quiz.map((x) => shuffledOrder(x.options.length, x.keepOrder)))
  }, [quiz, attempt])

  const question = quiz[q]
  const order = useMemo(() => orders?.[q] ?? question.options.map((_, i) => i), [orders, q, question])

  useEffect(() => {
    if (finished) return
    const t = window.setTimeout(() => sparkSays(question.prompt), 250)
    return () => window.clearTimeout(t)
  }, [question, finished])
  useEffect(() => () => cancelSparkSpeech(), [])

  const choose = (optIndex: number) => {
    if (picked !== null) return
    setPicked(optIndex)
    const right = optIndex === question.answer
    playSound(right ? 'correct' : 'wrong')
    sparkSays(`${right ? 'Yes!' : 'Let’s see why.'} ${question.why}`)
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => whyRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }), 60)
  }

  const next = () => {
    cancelSparkSpeech()
    if (q < quiz.length - 1) {
      setQ(q + 1)
      setPicked(null)
    } else {
      setFinished(true)
      playSound('star')
      sparkSays('You thought about all three. Great thinking!')
      onChecked()
    }
  }

  const again = () => {
    setAttempt((a) => a + 1)
    setQ(0)
    setPicked(null)
    setFinished(false)
  }

  if (finished) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <span className="text-6xl motion-safe:animate-[course-badge-in_.6s_cubic-bezier(.22,.61,.36,1)]" aria-hidden>
          🧠
        </span>
        <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">You thought about all three!</h2>
        <p className="text-[17px] text-[#A7B0C0]">Thinking about why is how engineers learn. Ready for your badge?</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={again}
            className="min-h-[52px] rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            ↺ Ask me again
          </button>
          <button
            type="button"
            onClick={onNext}
            data-testid="beat-next"
            className="min-h-[52px] rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Get my badge →
          </button>
        </div>
      </div>
    )
  }

  const right = picked !== null && picked === question.answer
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" data-testid="quiz">
      <div className="flex items-center gap-2" aria-label={`Question ${q + 1} of ${quiz.length}`}>
        {quiz.map((_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full ${i < q ? 'bg-amber-500' : i === q ? 'bg-amber-300' : 'bg-white/10'}`} aria-hidden />
        ))}
      </div>
      <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">
              Question {q + 1} of {quiz.length}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-[#EEF2F8] sm:text-3xl" data-testid="quiz-prompt">
              {question.prompt}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => sparkSays(question.prompt)}
            aria-label="Read the question aloud"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#EEF2F8]" aria-hidden>
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ul className={`mt-4 grid gap-2 ${question.options.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {order.map((oi) => {
            const o = question.options[oi]
            const isAnswer = oi === question.answer
            const isPicked = picked === oi
            const state =
              picked === null
                ? 'border-white/15 bg-[#19263F] hover:border-amber-300/70 hover:bg-[#1F2E4B]'
                : isAnswer
                  ? 'border-emerald-300 bg-emerald-400/15'
                  : isPicked
                    ? 'border-amber-400/70 bg-amber-400/10'
                    : 'border-white/10 bg-[#19263F] opacity-50'
            return (
              <li key={`${attempt}-${oi}`}>
                <button
                  type="button"
                  onClick={() => choose(oi)}
                  disabled={picked !== null}
                  data-testid="quiz-option"
                  data-answer={isAnswer ? 'yes' : 'no'}
                  className={`flex h-full min-h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-3 text-center transition-transform enabled:active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${state}`}
                >
                  <span className="text-4xl" aria-hidden>
                    {o.icon}
                  </span>
                  <span className="text-[16px] font-bold leading-snug text-[#EEF2F8]">{o.text}</span>
                  {picked !== null && isAnswer && <span className="text-xs font-black uppercase text-emerald-200">✓ This one</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {picked !== null && (
        <div
          ref={whyRef}
          role="status"
          className={`scroll-mb-24 rounded-[20px] p-4 motion-safe:animate-[course-pop_.3s_cubic-bezier(.22,.61,.36,1)] ${right ? 'bg-emerald-400/10 ring-2 ring-emerald-400/60' : 'bg-amber-400/10 ring-2 ring-amber-400/50'}`}
        >
          <p className={`font-display text-lg font-bold ${right ? 'text-emerald-200' : 'text-amber-200'}`}>{right ? '🎉 Yes!' : '🤔 Not quite — let’s see why…'}</p>
          <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]" data-testid="quiz-why">
            {question.why}
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={next}
              data-testid="quiz-next"
              className="min-h-[52px] rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {q < quiz.length - 1 ? 'Next question →' : 'Done →'}
            </button>
          </div>
        </div>
      )}
      {checked && picked === null && q === 0 && (
        <button type="button" onClick={onNext} className="min-h-[44px] self-end rounded-xl px-2 text-sm font-bold text-[#A7B0C0] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          I’ve done these already — go to my badge
        </button>
      )}
    </div>
  )
}
