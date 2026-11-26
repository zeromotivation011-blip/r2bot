'use client'

// components/kids/course/CodeStepClient.tsx
// Beat 3 of a session: Code. The new block(s) of the day, then a worked example
// — the curriculum's guided program — built block by block by Spark in the
// same picture blocks the child will use in the challenge, each read aloud.
// Spark's three hints come one at a time (nudge first, near-answer last).

import { useEffect, useMemo, useState } from 'react'
import type { BlockId, CodeChallenge } from '@/lib/kids/curriculum/types'
import { toPalette } from '@/lib/kids/sim/arenas/level1'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'
import { countExample, exampleBlocks, type ExampleBlock } from './worked-example'

interface Props {
  code: CodeChallenge
  challenge: CodeChallenge
  newBlocks: BlockId[]
  onNext: () => void
}

function Speaker({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => sparkSays(text)}
      aria-label={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#EEF2F8]" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export default function CodeStepClient({ code, challenge, newBlocks, onNext }: Props) {
  const palette = useMemo(() => toPalette([...code.allowedBlocks, ...challenge.allowedBlocks]), [code, challenge])
  const blocks = useMemo(() => exampleBlocks(code.exampleSolution, toPalette(code.allowedBlocks)), [code])
  const total = countExample(blocks)
  const [shown, setShown] = useState(0)
  const [hints, setHints] = useState(0)

  useEffect(() => () => cancelSparkSpeech(), [])

  const fresh = useMemo(() => {
    const seen = new Set<string>()
    const out: { label: string; icon: string }[] = []
    for (const id of newBlocks) {
      for (const b of palette) {
        if (b.op !== id || seen.has(b.label)) continue
        seen.add(b.label)
        out.push({ label: b.label, icon: b.icon })
      }
    }
    return out
  }, [newBlocks, palette])

  // The n-th block in reading order, for speaking it as it appears.
  const nth = (n: number): ExampleBlock | null => {
    let i = 0
    let hit: ExampleBlock | null = null
    const walk = (bs: ExampleBlock[]) => {
      for (const b of bs) {
        if (hit) return
        if (i === n) {
          hit = b
          return
        }
        i++
        if (b.children) walk(b.children)
      }
    }
    walk(blocks)
    return hit
  }

  const showNext = () => {
    if (shown >= total) return
    const b = nth(shown)
    setShown(shown + 1)
    playSound('click')
    if (b) sparkSays(b.container ? `${b.text}. The next blocks go inside it.` : b.text)
  }

  let counter = 0
  const render = (bs: ExampleBlock[], depth: number): React.ReactNode =>
    bs.map((b, k) => {
      const idx = counter++
      const visible = idx < shown
      const childNodes = b.children ? render(b.children, depth + 1) : null
      if (!visible) return <li key={`${depth}-${k}`} className="hidden" aria-hidden />
      return (
        <li key={`${depth}-${k}`} className="motion-safe:animate-[course-pop_.3s_cubic-bezier(.22,.61,.36,1)]">
          <div className={`rounded-2xl border px-2 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,.35)] ${b.container ? 'border-cyan-400/30 bg-cyan-400/[0.07]' : 'border-white/15 bg-[#19263F]'} ${idx === shown - 1 ? 'ring-4 ring-amber-400/40' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 text-xl" aria-hidden>
                {b.icon}
              </span>
              <span className="min-w-0 flex-1 text-[16px] font-bold leading-tight text-[#EEF2F8]">{b.text}</span>
            </div>
            {b.note && <p className="mt-1 pl-12 text-[13px] font-semibold text-cyan-200">💡 {b.note}</p>}
            {b.children && (
              <ol className="mt-1.5 flex flex-col gap-1.5 rounded-xl border-l-4 border-cyan-400/50 bg-black/20 py-1.5 pl-2 pr-1">{childNodes}</ol>
            )}
          </div>
        </li>
      )
    })

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">Learn it with Spark</p>
              <h2 className="font-display text-2xl font-bold leading-tight text-[#EEF2F8]">{code.title}</h2>
              <p className="mt-1 text-[17px] leading-snug text-[#A7B0C0]">{code.mission}</p>
            </div>
            <Speaker text={code.mission} label="Read the task aloud" />
          </div>
          <p className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-[15px] text-[#A7B0C0]">
            📍 <span className="font-semibold text-[#EEF2F8]">{code.arena.name}:</span> {code.arena.description}
          </p>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
          <h3 className="font-display text-lg font-bold text-[#EEF2F8]">{fresh.length ? (fresh.length === 1 ? 'New block today' : 'New blocks today') : 'No new blocks today'}</h3>
          {fresh.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {fresh.map((b) => (
                <li key={b.label}>
                  <button
                    type="button"
                    onClick={() => sparkSays(b.label)}
                    className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-3 font-bold text-amber-100 hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    <span className="text-2xl" aria-hidden>
                      {b.icon}
                    </span>
                    {b.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[15px] text-[#A7B0C0]">You know every block you need. Today is about using them in your own way.</p>
          )}
        </div>

        <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
          <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Stuck? Ask Spark</h3>
          <ol className="mt-2 flex flex-col gap-2">
            {code.hints.slice(0, hints).map((h, i) => (
              <li key={i} className="flex items-start gap-2 rounded-2xl bg-amber-400/10 px-3 py-2 text-[15px] font-semibold text-amber-100">
                <span aria-hidden>💡</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>
          {hints < 3 && (
            <button
              type="button"
              onClick={() => {
                sparkSays(code.hints[hints])
                setHints(hints + 1)
              }}
              className="mt-2 min-h-[48px] rounded-2xl border border-amber-400/50 px-4 text-sm font-black text-amber-300 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {hints === 0 ? 'Give me a hint' : 'Another hint'} ({hints + 1} of 3)
            </button>
          )}
        </div>
      </div>

      <div role="region" aria-label="Spark’s program" className="flex flex-col gap-3">
        <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-3" data-testid="worked-example">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-[#EEF2F8]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-[#1A1103]" aria-hidden>
              ▶
            </span>
            When I press Go
          </p>
          <ol className="flex min-h-[120px] flex-col gap-1.5" aria-live="polite">
            {render(blocks, 0)}
          </ol>
          {shown === 0 && <p className="px-2 py-6 text-center text-[15px] text-[#6E7888]">Tap “Show the next block” and Spark builds the program with you.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {shown < total ? (
            <>
              <button
                type="button"
                onClick={showNext}
                data-testid="example-next"
                className="min-h-[52px] flex-1 rounded-2xl bg-cyan-400 px-5 font-display text-lg font-bold text-[#0A1120] hover:bg-cyan-300 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                Show the next block ({shown + 1} of {total})
              </button>
              <button
                type="button"
                onClick={() => setShown(total)}
                className="min-h-[52px] rounded-2xl bg-white/[0.08] px-4 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                Show all
              </button>
            </>
          ) : (
            <p className="flex-1 rounded-2xl bg-emerald-400/10 px-4 py-3 text-[15px] font-semibold text-emerald-200">
              That’s Spark’s program. Now the challenge is a little different — can you build your own?
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          data-testid="beat-next"
          className={`min-h-[52px] rounded-2xl px-6 font-display text-lg font-bold transition-transform active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
            shown >= total ? 'bg-amber-500 text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] hover:bg-amber-400' : 'bg-white/[0.08] text-[#EEF2F8] hover:bg-white/15'
          }`}
        >
          Now you try: the Challenge →
        </button>
      </div>
    </div>
  )
}
