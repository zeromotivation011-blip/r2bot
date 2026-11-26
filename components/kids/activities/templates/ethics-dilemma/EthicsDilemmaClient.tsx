'use client'

// components/kids/activities/templates/ethics-dilemma/EthicsDilemmaClient.tsx
// One situation at a time: read the moment and choose what the robot does.
// Live mode (young bands): the stakeholder meters move as you choose. Predict
// mode (liveMeters false): you predict where each meter ends up instead. What
// each choice LEADS TO is only shown after "Test my rules" — so the child has
// to think about effects rather than try every option. Tabs let the child
// revisit any situation. A passing policy unlocks the discussion question.

import { useMemo, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { directionOf, meters, type Answer, type Direction, type Params } from './logic'
import { FeedbackPanel, TemplateCard, btnGhost, btnPrimary, useAttempts } from '../gear-train/TemplateFrameClient'

const RANGE = 5 // meters are drawn from −5 to +5
const RANGE_MIN = 0 - RANGE
const DIR_WORD: Record<Direction, string> = { up: 'goes up', same: 'stays level', down: 'goes down' }

export default function EthicsDilemmaClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [predictions, setPredictions] = useState<Record<string, Direction>>({})
  const [at, setAt] = useState(0)
  const solved = !!att.result?.correct
  const live = p.liveMeters ?? true
  const m = useMemo(() => meters(p, { choices }), [p, choices])
  const sit = p.situations[at]
  const chosen = sit.choices.find((c) => c.id === choices[sit.id])
  const allChosen = p.situations.every((s) => choices[s.id])
  const allPredicted = live || p.stakeholders.every((s) => predictions[s.id])
  const allDone = allChosen && allPredicted
  const tested = !!att.result
  const showMeters = live || tested

  const choose = (cid: string) => {
    if (solved) return
    if (att.result) att.clear()
    playSound('click')
    setChoices((c) => ({ ...c, [sit.id]: cid }))
  }

  return (
    <TemplateCard label="Ethics dilemma">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl" aria-hidden>
          {p.robotIcon}
        </span>
        <p className="font-display text-lg font-bold leading-snug text-[#EEF2F8]">{p.scenario}</p>
      </div>

      {p.situations.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Situations">
          {p.situations.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === at}
              onClick={() => {
                playSound('click')
                setAt(i)
              }}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3 font-display text-[15px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                i === at ? 'border-amber-400 bg-amber-500/15 text-[#EEF2F8]' : 'border-white/15 bg-white/[0.04] text-[#A7B0C0]'
              }`}
            >
              <span aria-hidden>{s.icon}</span> {i + 1}
              {choices[s.id] && <span className="text-[#22C55E]" aria-label="answered">✓</span>}
            </button>
          ))}
        </div>
      )}

      <div key={sit.id} className="mt-3 rounded-[20px] border border-white/10 bg-[#111C32] p-4 motion-safe:animate-[fadeIn_.25s_ease-out]">
        <p className="flex items-start gap-2 text-[17px] leading-relaxed text-[#EEF2F8]">
          <span className="text-2xl" aria-hidden>
            {sit.icon}
          </span>
          {sit.prompt}
        </p>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">The robot should…</p>
        <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="What the robot does">
          {sit.choices.map((c) => {
            const on = choices[sit.id] === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(c.id)}
                className={`min-h-[48px] rounded-2xl border px-4 py-2.5 text-left text-[16px] font-semibold transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.98] ${
                  on ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8] hover:border-white/30'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        {chosen && tested && (
          <p className="mt-3 rounded-2xl border border-[#00B8D4]/30 bg-[#00B8D4]/[0.08] p-3 text-[16px] text-[#EEF2F8] motion-safe:animate-[fadeUp_.3s_cubic-bezier(.22,.61,.36,1)]">
            <b className="text-[#00E5FF]">What happens: </b>
            {chosen.consequence}
          </p>
        )}
        {p.situations.length > 1 && (
          <div className="mt-3 flex justify-between gap-2">
            <button type="button" className={btnGhost} disabled={at === 0} onClick={() => setAt((i) => i - 1)}>
              ← Back
            </button>
            {at < p.situations.length - 1 && (
              <button type="button" className={btnGhost} disabled={!chosen} onClick={() => setAt((i) => i + 1)}>
                Next situation →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-[20px] border border-white/10 bg-[#0A1120] p-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">Who is affected</p>
        {showMeters ? (
          <ul className="mt-2 flex flex-col gap-2" aria-live="polite">
            {p.stakeholders.map((s) => {
              const v = m[s.id]
              const floor = s.floor ?? -1
              const low = v < floor
              const w = (Math.min(RANGE, Math.abs(v)) / RANGE) * 50
              return (
                <li key={s.id} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-[#EEF2F8]">
                    {s.icon} {s.label}
                  </span>
                  <span className="relative h-4 rounded-full bg-white/10" role="meter" aria-label={s.label} aria-valuemin={RANGE_MIN} aria-valuemax={RANGE} aria-valuenow={v}>
                    <span className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
                    <span className="absolute inset-y-0 w-0.5 bg-amber-300/70" style={{ left: `${50 + (floor / RANGE) * 50}%` }} title={`Lowest OK: ${floor}`} />
                    <span
                      className={`absolute inset-y-0.5 rounded-full transition-all duration-300 ${v >= 0 ? 'bg-[#22C55E]' : low ? 'bg-amber-500' : 'bg-amber-300/70'}`}
                      style={v >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
                    />
                  </span>
                  <span className={`text-right font-display text-[15px] font-bold tabular-nums ${low ? 'text-amber-300' : v > 0 ? 'text-[#22C55E]' : 'text-[#A7B0C0]'}`}>
                    {v > 0 ? `+${v}` : v}
                  </span>
                  {!live && predictions[s.id] && (
                    <span className={`col-span-3 text-[13px] ${predictions[s.id] === directionOf(v) ? 'text-[#22C55E]' : 'text-amber-300'}`}>
                      You said it {DIR_WORD[predictions[s.id]]} — {predictions[s.id] === directionOf(v) ? 'right!' : `it actually ${DIR_WORD[directionOf(v)]}.`}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-2">
            <p className="text-[15px] text-[#A7B0C0]">The meters are hidden. Think it through: with ALL your rules together, where does each one end up? Predict, then test.</p>
            <ul className="mt-2 flex flex-col gap-2">
              {p.stakeholders.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-[#EEF2F8]">
                    {s.icon} {s.label}
                  </span>
                  <span className="flex gap-1.5" role="radiogroup" aria-label={`Prediction for ${s.label}`}>
                    {(['down', 'same', 'up'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={predictions[s.id] === d}
                        aria-label={DIR_WORD[d]}
                        onClick={() => {
                          if (att.result) att.clear()
                          playSound('click')
                          setPredictions((pr) => ({ ...pr, [s.id]: d }))
                        }}
                        className={`inline-flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl border px-2 font-display text-[17px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                          predictions[s.id] === d ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-white/[0.06] text-[#EEF2F8]'
                        }`}
                      >
                        {d === 'down' ? '↓' : d === 'same' ? '=' : '↑'}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {showMeters && <p className="mt-2 text-[13px] text-[#A7B0C0]">The thin orange mark is the lowest anyone should end up.</p>}
      </div>

      {!att.result && (
        <div className="mt-4">
          <button
            type="button"
            className={btnPrimary}
            disabled={!allDone}
            onClick={() => {
              playSound('click')
              att.submit(live ? { choices } : { choices, predictions })
            }}
          >
            {allDone ? 'Test my rules' : !allChosen ? `Decide all ${p.situations.length} situation${p.situations.length === 1 ? '' : 's'}` : 'Predict every meter'}
          </button>
        </div>
      )}
      {tested && (
        <div className="mt-3 rounded-[20px] border border-white/10 bg-[#111C32] p-4">
          <p className="font-display text-lg font-bold text-[#00E5FF]">What your rules led to</p>
          <ol className="mt-2 flex flex-col gap-2">
            {p.situations.map((s) => {
              const c = s.choices.find((x) => x.id === choices[s.id])
              return c ? (
                <li key={s.id} className="text-[16px] leading-relaxed text-[#EEF2F8]">
                  <span aria-hidden>{s.icon}</span> <b>{c.label}:</b> {c.consequence}
                </li>
              ) : null
            })}
          </ol>
        </div>
      )}
      <FeedbackPanel att={att} />
      {solved && (
        <div className="mt-3 rounded-[20px] border border-[#00B8D4]/30 bg-[#00B8D4]/[0.06] p-4 motion-safe:animate-[fadeUp_.3s_ease-out]">
          <p className="font-display text-lg font-bold text-[#00E5FF]">Talk about it</p>
          <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{p.discussion}</p>
        </div>
      )}
    </TemplateCard>
  )
}
