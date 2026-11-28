'use client'

// components/kids/activities/templates/number-box/NumberBoxClient.tsx
// A robot's box holds ONE number; picture cards change it. Ages 5–7 first:
// every number is also drawn as that many pictures, every card has an icon
// AND words (never colour alone), and "Hear the cards" reads the whole puzzle
// aloud. Tap-only: every control is a real <button> (keyboard, switch
// scanning), tap targets 48px+. No timers, no drag, motion only when allowed.

import { useEffect, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { useKidsReducedMotion } from '@/lib/kids/settings'
import { canSpeak, speakNatural, stopSpeaking } from '../../speech'
import { FeedbackPanel, TemplateCard, btnGhost, btnPrimary, useAttempts } from '../gear-train/TemplateFrameClient'
import { IconBox } from '../spot-in-scene/glyphs'
import { BOX_MAX, CARD_ICON, cardWords, count, runCards, type Answer, type Card, type Params } from './logic'

/** n pictures of the thing, with the numeral beside them. */
function Amount({ p, n, size = 22 }: { p: Params; n: number; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2" role="img" aria-label={count(p, n)}>
      <span className="font-display text-2xl font-bold tabular-nums text-[#EEF2F8]">{n}</span>
      <span className="flex max-w-[150px] flex-wrap gap-0.5" aria-hidden>
        {Array.from({ length: n }, (_, i) => (
          <IconBox key={i} icon={p.thing.icon} px={size} />
        ))}
        {n === 0 && <span className="text-sm font-semibold text-[#A7B0C0]">empty</span>}
      </span>
    </span>
  )
}

/** One picture card: ➕ / ➖ / 🔄, the words, and the pictures it puts in. */
function CardFace({ p, card }: { p: Params; card: Card }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="flex items-center gap-1.5">
        <span className="text-2xl" aria-hidden>
          {CARD_ICON[card.op]}
        </span>
        <span className="font-display text-[16px] font-bold leading-tight text-[#EEF2F8]">{cardWords(card)}</span>
      </span>
      <span className="flex flex-wrap gap-0.5" aria-hidden>
        {Array.from({ length: card.n }, (_, i) => (
          <IconBox key={i} icon={p.thing.icon} px={18} />
        ))}
      </span>
    </span>
  )
}

const cardShell = 'flex min-h-[88px] min-w-[140px] flex-1 flex-col justify-between gap-2 rounded-2xl border-2 p-3 text-left'
const stepBtn =
  'inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border-2 border-white/15 bg-[#19263F] font-display text-2xl font-bold text-[#EEF2F8] transition-transform duration-150 active:scale-[.95] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function NumberBoxClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const reduced = useKidsReducedMotion()
  const ask = p.ask
  const n = p.cards.length
  const [value, setValue] = useState<number | null>(null)
  const [trace, setTrace] = useState<(number | null)[]>(() => Array.from({ length: n }, () => null))
  const [option, setOption] = useState<number | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const solved = !!att.result?.correct
  const locked = solved || att.done
  const fade = reduced ? '' : 'motion-safe:animate-[fadeUp_.35s_ease-out]'

  useEffect(() => () => stopRef.current?.(), [])

  // The cards actually in play (the chosen option fills the gap).
  const shown: (Card | null)[] = p.cards.map((c, i) => (ask.kind === 'missing' && i === ask.gap ? (option === null ? null : ask.options[option]) : c))
  // After a right answer (or at the end), the box under each card shows its number.
  const reveal = solved || att.done
  const revealed = reveal ? runCards(p.start, shown.map((c, i) => c ?? p.cards[i])) : null

  // The number the box must end with (the 'missing' puzzle's goal): said aloud AND drawn.
  const end = runCards(p.start, p.cards)[n - 1]

  const question =
    ask.kind === 'end'
      ? `How many ${p.thing.many} are in the ${p.box.name} at the end?`
      : ask.kind === 'trace'
        ? `Show the ${p.box.name} after every card.`
        : `Which card goes in the gap so the ${p.box.name} ends with ${count(p, end)}?`

  const story = [
    `The ${p.box.name} has ${count(p, p.start)}.`,
    ...p.cards.map((c, i) => (ask.kind === 'missing' && i === ask.gap ? `Card ${i + 1} is missing.` : `Card ${i + 1}: ${cardWords(c)}.`)),
    question,
  ].join(' ')

  const hear = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    stopRef.current = speakNatural(story, () => setSpeaking(false))
  }

  const touch = () => {
    if (att.result) att.clear()
  }

  const bump = (i: number, d: 1 | -1) => {
    if (locked) return
    touch()
    playSound('click')
    setTrace((t) => {
      const prev = i === 0 ? p.start : (t[i - 1] ?? p.start)
      const cur = t[i] ?? prev
      const next = Math.max(0, Math.min(BOX_MAX, cur + d))
      const out = [...t]
      out[i] = next
      return out
    })
  }

  const ready = ask.kind === 'end' ? value !== null : ask.kind === 'trace' ? trace.every((v) => v !== null) : option !== null

  const submit = () => {
    if (!ready || locked) return
    playSound('click')
    if (ask.kind === 'end') att.submit({ value: value ?? undefined })
    else if (ask.kind === 'trace') att.submit({ values: trace.map((v) => v ?? 0) })
    else att.submit({ option: option ?? undefined })
  }

  return (
    <TemplateCard label="Number box">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-lg font-bold text-[#EEF2F8]">{question}</p>
        {canSpeak() && (
          <button type="button" onClick={hear} aria-pressed={speaking} className={`${btnGhost} min-h-[48px] px-3 text-sm`}>
            <span aria-hidden>{speaking ? '■' : '🔊'}</span> {speaking ? 'Stop' : 'Hear the cards'}
          </button>
        )}
      </div>

      {/* The box before the first card. */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#00B8D4]/40 bg-[#111C32] p-3">
        <span className="text-4xl" aria-hidden>
          {p.box.icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#A7B0C0]">At the start, the {p.box.name} has</span>
          <Amount p={p} n={p.start} />
        </span>
      </div>

      {/* The cards, in order, each with the box after it. */}
      <ol className="mt-3 flex flex-wrap gap-2" aria-label="The cards, in order">
        {shown.map((c, i) => {
          const isGap = ask.kind === 'missing' && i === ask.gap
          return (
            <li key={i} className={`${cardShell} ${isGap ? 'border-dashed border-amber-400/70 bg-amber-500/10' : 'border-white/10 bg-[#19263F]'}`}>
              <span className="text-xs font-bold uppercase tracking-wide text-[#A7B0C0]">Card {i + 1}</span>
              {c ? (
                <CardFace p={p} card={c} />
              ) : (
                <span className="flex items-center gap-2 font-display text-[16px] font-bold text-amber-300">
                  <span className="text-2xl" aria-hidden>
                    ❔
                  </span>
                  Gap: pick a card below
                </span>
              )}

              {ask.kind === 'trace' && !reveal && (
                <span className="flex flex-col gap-1 rounded-xl bg-[#111C32] p-2">
                  <span className="text-xs font-semibold text-[#A7B0C0]">
                    <span aria-hidden>{p.box.icon}</span> {p.box.name} now
                  </span>
                  <span className="flex items-center gap-2">
                    <button type="button" className={stepBtn} onClick={() => bump(i, -1)} disabled={locked} aria-label={`One fewer ${p.thing.many} after card ${i + 1}`}>
                      −
                    </button>
                    {trace[i] === null ? <span className="text-sm font-semibold text-[#A7B0C0]">Tap − or +</span> : <Amount p={p} n={trace[i] as number} size={16} />}
                    <button type="button" className={stepBtn} onClick={() => bump(i, 1)} disabled={locked} aria-label={`One more ${p.thing.many} after card ${i + 1}`}>
                      +
                    </button>
                  </span>
                </span>
              )}

              {revealed && (
                <span className={`flex items-center gap-2 rounded-xl bg-[#22C55E]/10 p-2 ${fade}`}>
                  <span className="text-xl" aria-hidden>
                    {p.box.icon}
                  </span>
                  <Amount p={p} n={revealed[i]} size={16} />
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {ask.kind === 'end' && (
        <div className="mt-4" role="group" aria-label={`Choose how many ${p.thing.many} are in the ${p.box.name} at the end`}>
          <p className="mb-2 text-[15px] text-[#A7B0C0]">Tap the {p.box.name} you think is right.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ask.options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={value === o}
                disabled={locked}
                onClick={() => {
                  touch()
                  playSound('click')
                  setValue(o)
                }}
                className={`flex min-h-[64px] items-center gap-3 rounded-2xl border-2 p-3 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 enabled:active:scale-[.98] ${
                  value === o ? 'border-amber-400 bg-amber-500/15' : 'border-white/10 bg-[#19263F]'
                }`}
              >
                <span className="text-3xl" aria-hidden>
                  {p.box.icon}
                </span>
                <Amount p={p} n={o} />
                {value === o && (
                  <span className="ml-auto text-xl text-amber-300" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {ask.kind === 'missing' && (
        <div className="mt-4" role="group" aria-label={`Cards to try in gap ${ask.gap + 1}`}>
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-[#111C32] p-3">
            <span className="text-4xl" aria-hidden>
              {p.box.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#A7B0C0]">At the end, the {p.box.name} must have</span>
              <Amount p={p} n={end} />
            </span>
          </div>
          <p className="mb-2 text-[15px] text-[#A7B0C0]">Tap a card to put in the gap.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ask.options.map((c, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={option === i}
                disabled={locked}
                onClick={() => {
                  touch()
                  playSound('click')
                  setOption(i)
                }}
                className={`flex min-h-[64px] items-center gap-2 rounded-2xl border-2 p-3 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 enabled:active:scale-[.98] ${
                  option === i ? 'border-amber-400 bg-amber-500/15' : 'border-white/10 bg-[#19263F]'
                }`}
              >
                <CardFace p={p} card={c} />
                {option === i && (
                  <span className="ml-auto text-xl text-amber-300" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={submit} disabled={!ready || locked}>
            {ready ? 'Check' : ask.kind === 'trace' ? 'Fill every box first' : ask.kind === 'end' ? 'Tap a number first' : 'Tap a card first'}
          </button>
        </div>
      )}
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}
