'use client'

// components/kids/present/HandsUpVoteClient.tsx — the hands-up vote for the
// check in Present mode. The question and its picture options go up big;
// children hold up one, two or three fingers; the teacher taps the count for
// each option; "Show the answer" draws the bars, marks the right option and
// reads why. No names, no scores, nothing stored or sent: counts live in this
// component and disappear with it. A prediction vote (answer null) shows only
// the tally.

import { useState } from 'react'
import type { VoteQuestion } from '@/lib/kids/teach/present'

const FINGERS = ['☝️', '✌️', '🤟', '🖐️']

export default function HandsUpVoteClient({ questions }: { questions: VoteQuestion[] }) {
  const [qi, setQi] = useState(0)
  const [counts, setCounts] = useState<number[][]>(() => questions.map((q) => q.options.map(() => 0)))
  const [shown, setShown] = useState<boolean[]>(() => questions.map(() => false))
  const q = questions[qi]
  if (!q) return null
  const c = counts[qi]
  const total = c.reduce((a, b) => a + b, 0)
  const reveal = shown[qi]

  const bump = (i: number, d: number) =>
    setCounts((all) => all.map((row, r) => (r === qi ? row.map((v, j) => (j === i ? Math.max(0, Math.min(99, v + d)) : v)) : row)))

  const btn = 'min-h-[48px] min-w-[48px] rounded-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
      <p className="text-center text-sm font-bold uppercase tracking-wider text-amber-300">
        Question {qi + 1} of {questions.length} · hold up your fingers
      </p>
      <h2 className="mt-2 text-center font-display text-[clamp(1.6rem,4vw,3.4rem)] font-bold leading-tight text-white">{q.prompt}</h2>
      <ol className={`mt-6 grid flex-1 content-start gap-4 ${q.options.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {q.options.map((o, i) => {
          const right = reveal && q.answer === i
          const pct = total ? Math.round((c[i] * 100) / total) : 0
          return (
            <li
              key={o.text}
              className={`relative flex flex-col overflow-hidden rounded-[28px] border-2 p-5 ${right ? 'border-emerald-400 bg-emerald-500/15' : 'border-white/15 bg-white/[0.04]'}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500 text-3xl" aria-hidden>{FINGERS[i] ?? i + 1}</span>
                <span className="sr-only">{i + 1} finger{i ? 's' : ''}:</span>
                {o.icon && <span className="text-[clamp(2rem,4vw,3.5rem)] leading-none" aria-hidden>{o.icon}</span>}
              </div>
              <p className="mt-3 font-display text-[clamp(1.2rem,2.4vw,2.1rem)] font-bold leading-snug text-white">
                {o.text}
                {right && <span className="ml-2 text-emerald-300" aria-label="the right answer"> ✓</span>}
              </p>
              {reveal && (
                <div className="mt-3" aria-hidden>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${right ? 'bg-emerald-400' : 'bg-cyan-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
              <div className="mt-auto flex items-center gap-2 pt-4" role="group" aria-label={`Hands for option ${i + 1}`}>
                <button type="button" onClick={() => bump(i, -1)} className={`${btn} bg-white/[0.08] text-2xl text-white hover:bg-white/15`} aria-label={`One fewer hand for option ${i + 1}`}>−</button>
                <output className="min-w-[3ch] text-center font-display text-4xl font-bold tabular-nums text-white" aria-live="polite">{c[i]}</output>
                <button type="button" onClick={() => bump(i, 1)} className={`${btn} bg-white/[0.08] text-2xl text-white hover:bg-white/15`} aria-label={`One more hand for option ${i + 1}`}>+</button>
                {reveal && <span className="ml-auto text-lg font-bold text-slate-200">{pct}%</span>}
              </div>
            </li>
          )
        })}
      </ol>
      {reveal && (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[clamp(1rem,1.8vw,1.5rem)] leading-relaxed text-slate-100" role="status">
          <strong className="text-amber-300">{q.answer === null ? 'Let’s find out. ' : 'Why? '}</strong>
          {q.why}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={qi === 0} onClick={() => setQi((i) => i - 1)} className={`${btn} bg-white/[0.06] px-4 text-white hover:bg-white/10 disabled:opacity-40`}>← Question</button>
        {!reveal ? (
          <button type="button" onClick={() => setShown((s) => s.map((v, i) => (i === qi ? true : v)))} className={`${btn} bg-amber-500 px-6 text-lg text-[#1A1103] hover:bg-amber-400`}>
            {q.answer === null ? 'Show the tally' : 'Show the answer'}
          </button>
        ) : (
          <button type="button" onClick={() => setShown((s) => s.map((v, i) => (i === qi ? false : v)))} className={`${btn} bg-white/[0.06] px-4 text-white hover:bg-white/10`}>Hide</button>
        )}
        <button type="button" disabled={qi >= questions.length - 1} onClick={() => setQi((i) => i + 1)} className={`${btn} bg-white/[0.06] px-4 text-white hover:bg-white/10 disabled:opacity-40`}>Question →</button>
      </div>
    </div>
  )
}
