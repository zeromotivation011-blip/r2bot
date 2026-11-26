'use client'

// components/kids/ai/talk/UnderstandingClient.tsx
// "How I understood you": every piece of the child's sentence as
//   words (each word coloured by what it means to the robot)
//   → intent (what the robot thinks you want)
//   → blocks (what it will actually run)
// plus the guesses it made and the questions it still has. The step whose
// block is running lights up.

import type { ParseResult, Question, Role } from '@/lib/kids/ai/talk/parser'

const ROLE_STYLE: Record<Role, string> = {
  action: 'bg-amber-400/20 text-amber-200 ring-amber-300/40',
  direction: 'bg-cyan-400/15 text-cyan-200 ring-cyan-300/40',
  amount: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/40',
  unit: 'bg-emerald-400/10 text-emerald-100 ring-emerald-200/30',
  condition: 'bg-sky-400/15 text-sky-200 ring-sky-300/40',
  loop: 'bg-rose-400/15 text-rose-200 ring-rose-300/40',
  object: 'bg-yellow-300/15 text-yellow-100 ring-yellow-200/40',
  speed: 'bg-lime-400/15 text-lime-200 ring-lime-300/40',
  words: 'bg-white/10 text-white ring-white/30',
  filler: 'text-slate-500 ring-transparent',
}

const INDENT = ['', 'ml-3.5', 'ml-7', 'ml-10']

export const ROLE_LEGEND: { role: Role; label: string }[] = [
  { role: 'action', label: 'action' },
  { role: 'direction', label: 'direction' },
  { role: 'amount', label: 'number' },
  { role: 'unit', label: 'unit' },
  { role: 'condition', label: 'sensor / condition' },
  { role: 'loop', label: 'loop' },
  { role: 'filler', label: 'ignored' },
]

interface Props {
  result: ParseResult
  activeId: string | null
  /** Step index where the last failed run was when it went wrong. */
  failedStep: number | null
  onAnswer: (q: Question, value: string) => void
  /** Engineers see the blocks as code-like text by default. */
  compact?: boolean
}

export function stepOfBlock(result: ParseResult, id: string | null): number | null {
  if (!id) return null
  // Inner blocks belong to the deepest step that lists them; fall back to the first step that contains the id.
  for (let i = result.steps.length - 1; i >= 0; i--) if (result.steps[i].stmtIds.includes(id)) return i
  return null
}

export default function UnderstandingClient({ result, activeId, failedStep, onAnswer, compact }: Props) {
  const running = stepOfBlock(result, activeId)
  return (
    <div className="space-y-3" data-testid="understanding">
      {result.questions.length > 0 && (
        <div className="space-y-2" role="group" aria-label="Questions from your robot">
          {result.questions.map((q) => (
            <div key={q.id} className="rounded-[20px] border border-amber-300/50 bg-amber-300/10 p-3" data-testid="question">
              <p className="font-display text-lg font-bold text-amber-100">🤔 {q.ask}</p>
              <p className="mt-0.5 text-sm text-slate-300">{q.why}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onAnswer(q, o.value)}
                    className="min-h-[48px] rounded-2xl bg-amber-400 px-4 text-base font-bold text-[#1A1103] shadow transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ol className="space-y-2" aria-label="How your robot understood you">
        {result.steps.map((st, i) => {
          const isRunning = running === i
          const isFailed = failedStep === i && running === null
          return (
            <li
              key={i}
              className={`${INDENT[Math.min(st.depth, 3)]} rounded-[20px] border p-3 transition ${
                isRunning
                  ? 'border-amber-300 bg-amber-300/10 shadow-[0_0_0_3px_rgba(252,104,24,.25)]'
                  : isFailed
                    ? 'border-rose-300/70 bg-rose-400/10'
                    : !st.understood
                      ? 'border-rose-300/40 bg-rose-400/[0.06]'
                      : 'border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02]'
              }`}
              data-testid="step"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                {/* Words */}
                <div className="min-w-0 sm:w-[38%]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your words</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {st.tokens.map((t, k) => (
                      <span key={k} className={`rounded-md px-1.5 py-0.5 text-[15px] ring-1 ${ROLE_STYLE[t.role]}`}>
                        {t.role === 'words' ? '“…”' : t.t}
                      </span>
                    ))}
                  </p>
                </div>
                <span aria-hidden className="hidden pt-6 text-slate-500 sm:block">
                  →
                </span>
                {/* Intent */}
                <div className="min-w-0 sm:w-[26%]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">I think you mean</p>
                  <p className={`mt-1 font-display text-[15px] font-bold ${st.understood ? 'text-white' : 'text-rose-200'}`}>{st.understood ? st.intent : 'I don’t understand this yet'}</p>
                </div>
                <span aria-hidden className="hidden pt-6 text-slate-500 sm:block">
                  →
                </span>
                {/* Blocks */}
                <div className="min-w-0 sm:flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Blocks</p>
                  {st.blocks.length > 0 ? (
                    <ul className={`mt-1 space-y-1 ${compact ? 'font-mono text-[13px]' : 'text-[15px]'}`}>
                      {st.blocks.map((b, k) => (
                        <li key={k} className="rounded-lg bg-[#19263F] px-2 py-1 text-slate-100">
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">{st.understood ? '—' : 'none'}</p>
                  )}
                </div>
              </div>
              {st.notes.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-white/[0.08] pt-2">
                  {st.notes.map((n, k) => (
                    <li key={k} className="text-sm leading-snug text-slate-300">
                      💡 {n}
                    </li>
                  ))}
                </ul>
              )}
              {isFailed && <p className="mt-2 text-sm font-bold text-rose-200">🐞 The robot was doing this step when things went wrong.</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
