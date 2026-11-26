'use client'

// components/kids/activities/templates/classify-sort/ClassifySortClient.tsx
// Stage 1 (sort): drag cards into bins — or tap a card, then tap a bin
// (keyboard: Tab to a card, Enter, then Enter on a bin). Stage 2 (rule):
// pick a feature; numbers get a number line with every example plotted and a
// draggable threshold, words get value chips. Every example card shows live
// where the robot would put it. "Run the robot" then sorts brand-new cards
// it has never seen, one by one, and checks.

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { applyRule, logic, runRule, thresholdsFor, wordValues, type Answer, type Item, type Params, type Rule } from './logic'
import { FeedbackPanel, TemplateCard, btnGhost, btnPrimary, chip, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'
import { IconBox } from '../spot-in-scene/glyphs'

const BIN_TINT = ['#FC6818', '#00B8D4', '#22C55E', '#FFD166']

export default function ClassifySortClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const reduced = useReducedMotion()
  const hasSort = p.mode !== 'rule'
  const hasRule = p.mode !== 'sort'
  const [stage, setStage] = useState<'sort' | 'rule'>(hasSort ? 'sort' : 'rule')
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [sortNote, setSortNote] = useState<{ ok: boolean; text: string } | null>(null)
  const solved = !!att.result?.correct

  // ── drag state ──
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const dragStart = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null)

  const place = (itemId: string, binId: string | null) => {
    if (solved) return
    setSortNote(null)
    if (att.result) att.clear()
    setPlacements((pl) => {
      const n = { ...pl }
      if (binId) n[itemId] = binId
      else delete n[itemId]
      return n
    })
    playSound('click')
  }

  const placeRef = useRef(place)
  placeRef.current = place

  const onCardPointerDown = (e: RPointerEvent<HTMLButtonElement>, id: string) => {
    if (solved || stage !== 'sort') return
    dragStart.current = { id, x: e.clientX, y: e.clientY, moved: false }
  }
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragStart.current
      if (!d) return
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return
      d.moved = true
      setDrag({ id: d.id, x: e.clientX, y: e.clientY })
    }
    const up = (e: PointerEvent) => {
      const d = dragStart.current
      dragStart.current = null
      if (!d) return
      if (d.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-bin]') as HTMLElement | null
        if (el) placeRef.current(d.id, el.dataset.bin === '__tray' ? null : el.dataset.bin ?? null)
        setDrag(null)
        setSelected(null)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  const onCardClick = (id: string) => {
    if (dragStart.current?.moved) return
    if (solved || stage !== 'sort') return
    playSound('click')
    setSelected((s) => (s === id ? null : id))
  }
  const onBinClick = (binId: string | null) => {
    if (!selected) return
    place(selected, binId)
    setSelected(null)
  }

  // ── rule state ──
  const numericFeatures = p.features.filter((f) => f.kind === 'number')
  const firstFeature = p.features[0]
  const [ruleFeature, setRuleFeature] = useState<string>(firstFeature.key)
  const feat = p.features.find((f) => f.key === ruleFeature) ?? firstFeature
  const [cA, cB] = [p.categories[0]?.id, p.categories[1]?.id]
  const range = useMemo(() => {
    const vs = [...p.items, ...(p.testItems ?? [])].map((i) => i.features[feat.key]).filter((v): v is number => typeof v === 'number')
    if (!vs.length) return { min: 0, max: 1 }
    const lo = Math.min(...vs)
    const hi = Math.max(...vs)
    const pad = (hi - lo || 1) * 0.12
    return { min: lo - pad, max: hi + pad }
  }, [p.items, p.testItems, feat.key])
  const [thresholds, setThresholds] = useState<Record<string, number>>(() =>
    Object.fromEntries(numericFeatures.map((f) => [f.key, thresholdsFor(p, f.key)[0] ?? 0])),
  )
  const [equals, setEquals] = useState<Record<string, string>>(() => Object.fromEntries(p.features.filter((f) => f.kind === 'word').map((f) => [f.key, wordValues(p, f.key)[0] ?? ''])))
  const [flip, setFlip] = useState(false)
  const rule: Rule = useMemo(
    () => ({
      feature: feat.key,
      ...(feat.kind === 'number' ? { threshold: thresholds[feat.key] } : { equals: equals[feat.key] }),
      ifTrue: flip ? cA : cB,
      ifFalse: flip ? cB : cA,
    }),
    [feat, thresholds, equals, flip, cA, cB],
  )
  const preview = useMemo(() => (stage === 'rule' && p.categories.length === 2 ? runRule(p, rule) : null), [stage, p, rule])
  const [testShown, setTestShown] = useState(0)
  const [running, setRunning] = useState(false)

  const editRule = (fn: () => void) => {
    if (solved || running) return
    if (att.result) att.clear()
    setTestShown(0)
    fn()
  }

  const answer = (): Answer => ({ ...(hasSort ? { placements } : {}), ...(hasRule ? { rule } : {}) })

  const checkSort = () => {
    playSound('click')
    if (!hasRule) {
      att.submit({ placements })
      return
    }
    // 'both': the hand sort is checked locally first (pure logic), then the rule stage opens.
    const r = logic.check({ ...p, mode: 'sort' }, { placements })
    setSortNote({ ok: r.correct, text: r.correct ? 'All sorted! Now teach the robot a RULE so it can sort new things by itself.' : r.feedback })
    playSound(r.correct ? 'correct' : 'wrong')
    if (r.correct) setStage('rule')
  }

  const runRobot = () => {
    playSound('click')
    const n = p.testItems?.length ?? 0
    if (reduced || n === 0) {
      setTestShown(n)
      att.submit(answer())
      return
    }
    setRunning(true)
    setTestShown(0)
    let i = 0
    const tick = () => {
      i++
      setTestShown(i)
      playSound('click')
      if (i < n) timer.current = window.setTimeout(tick, 550)
      else
        timer.current = window.setTimeout(() => {
          setRunning(false)
          att.submit(answer())
        }, 450)
    }
    timer.current = window.setTimeout(tick, 350)
  }
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const cat = (id: string) => p.categories.find((c) => c.id === id)
  const tint = (id: string) => BIN_TINT[Math.max(0, p.categories.findIndex((c) => c.id === id))]
  const tray = p.items.filter((i) => !placements[i.id])
  const showFeat = p.showFeatures ?? true
  const fmt = (v: number | string, unit?: string) => (typeof v === 'number' ? `${Math.round(v * 100) / 100}${unit ? ' ' + unit : ''}` : v)

  const card = (item: Item, compact?: boolean, verdict?: { got: string; ok: boolean }) => (
    <button
      key={item.id}
      type="button"
      data-item={item.id}
      onPointerDown={(e) => onCardPointerDown(e, item.id)}
      onClick={() => onCardClick(item.id)}
      aria-pressed={selected === item.id}
      disabled={stage !== 'sort' && !verdict}
      className={`relative flex min-h-[48px] touch-none select-none flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-1.5 text-center transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] ${
        selected === item.id ? 'border-amber-400 bg-amber-500/20 motion-safe:-translate-y-0.5' : 'border-white/15 bg-[#19263F]'
      } ${drag?.id === item.id ? 'opacity-40' : ''} ${compact ? 'w-[88px]' : 'w-[104px]'}`}
    >
      <IconBox icon={item.icon} px={compact ? 28 : 34} />
      <span className="text-[13px] font-semibold leading-tight text-[#EEF2F8]">{item.label}</span>
      {(showFeat || stage === 'rule') && (
        <span className="text-[11px] leading-tight text-[#A7B0C0]">
          {p.features.map((f) => fmt(item.features[f.key], f.unit)).join(' · ')}
        </span>
      )}
      {verdict && (
        <span
          className={`absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-bold ${verdict.ok ? 'bg-[#22C55E] text-[#04150A]' : 'bg-amber-500 text-[#1A1103]'}`}
          title={`Robot says: ${cat(verdict.got)?.label}`}
        >
          {cat(verdict.got)?.icon}
        </span>
      )}
    </button>
  )

  return (
    <TemplateCard label="Classify and sort">
      <p className="font-display text-lg font-bold text-[#EEF2F8]">{p.task}</p>
      {hasSort && hasRule && (
        <ol className="mt-2 flex gap-2 text-sm font-semibold" aria-label="Stages">
          <li className={`rounded-full px-3 py-1 ${stage === 'sort' ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/10 text-[#A7B0C0]'}`}>1 · Sort by hand</li>
          <li className={`rounded-full px-3 py-1 ${stage === 'rule' ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/10 text-[#A7B0C0]'}`}>2 · Teach the robot a rule</li>
        </ol>
      )}

      {stage === 'sort' && (
        <>
          <p className="mt-2 text-[15px] text-[#A7B0C0]">Drag each card into a bin — or tap a card, then tap a bin.</p>
          <div
            data-bin="__tray"
            onClick={() => onBinClick(null)}
            className="mt-3 flex min-h-[72px] flex-wrap justify-center gap-2 rounded-[20px] border border-dashed border-white/15 bg-[#0A1120]/60 p-2"
            aria-label="Cards to sort"
          >
            {tray.length === 0 ? <p className="self-center text-sm text-[#6E7888]">All cards are in bins.</p> : tray.map((it) => card(it))}
          </div>
          <div className={`mt-3 grid gap-2 ${p.categories.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
            {p.categories.map((c, ci) => {
              const inBin = p.items.filter((i) => placements[i.id] === c.id)
              return (
                <div
                  key={c.id}
                  data-bin={c.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Bin: ${c.label}${selected ? ' — put the selected card here' : ''}`}
                  onClick={() => onBinClick(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onBinClick(c.id)
                    }
                  }}
                  className={`flex min-h-[132px] flex-col rounded-[20px] border-2 p-2 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${selected ? 'border-dashed' : ''}`}
                  style={{ borderColor: `${BIN_TINT[ci]}${selected ? 'CC' : '55'}`, background: `${BIN_TINT[ci]}12` }}
                >
                  <p className="flex items-center gap-1.5 font-display text-[15px] font-bold" style={{ color: BIN_TINT[ci] }}>
                    <span aria-hidden className="text-xl">{c.icon}</span> {c.label}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {inBin.map((it) => card(it, true))}
                  </div>
                </div>
              )
            })}
          </div>
          {sortNote && !sortNote.ok && (
            <p role="status" className="mt-3 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-3 text-[16px] text-[#EEF2F8]">
              {sortNote.text}
            </p>
          )}
          {!att.result && (
            <div className="mt-4">
              <button type="button" className={btnPrimary} disabled={tray.length > 0} onClick={checkSort}>
                {tray.length > 0 ? `${tray.length} card${tray.length === 1 ? '' : 's'} left` : 'Check my sorting'}
              </button>
            </div>
          )}
        </>
      )}

      {stage === 'rule' && (
        <>
          {sortNote?.ok && <p className="mt-2 rounded-2xl bg-[#22C55E]/10 p-2 text-[15px] text-[#22C55E]">{sortNote.text}</p>}
          <div className="mt-3 rounded-[20px] border border-white/10 bg-[#111C32] p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">The robot looks at…</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Feature">
              {p.features.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={ruleFeature === f.key}
                  onClick={() => editRule(() => setRuleFeature(f.key))}
                  className={`${chip} ${ruleFeature === f.key ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-white/[0.06] text-[#EEF2F8]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {feat.kind === 'number' ? (
              <NumberLine
                items={p.items}
                featKey={feat.key}
                unit={feat.unit}
                min={range.min}
                max={range.max}
                threshold={thresholds[feat.key]}
                tint={tint}
                disabled={solved || running}
                onChange={(v) => editRule(() => setThresholds((t) => ({ ...t, [feat.key]: v })))}
              />
            ) : (
              <div className="mt-3">
                <p className="text-[15px] text-[#EEF2F8]">If {feat.label.toLowerCase()} is…</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`${feat.label} value`}>
                  {wordValues(p, feat.key).map((w) => (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={equals[feat.key] === w}
                      onClick={() => editRule(() => setEquals((e) => ({ ...e, [feat.key]: w })))}
                      className={`${chip} ${equals[feat.key] === w ? 'border-[#00B8D4] bg-[#00B8D4] text-[#04151A]' : 'border-white/15 bg-white/[0.06] text-[#EEF2F8]'}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <RuleSide label={feat.kind === 'number' ? `Above ${fmt(thresholds[feat.key] ?? 0, feat.unit)}` : `Is “${equals[feat.key]}”`} cat={cat(rule.ifTrue)} colour={tint(rule.ifTrue)} />
              <button type="button" className={btnGhost} onClick={() => editRule(() => setFlip((f) => !f))} aria-label="Swap which bin each side goes to">
                ⇄ Swap
              </button>
              <RuleSide label={feat.kind === 'number' ? 'Otherwise' : 'Anything else'} cat={cat(rule.ifFalse)} colour={tint(rule.ifFalse)} />
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold text-[#A7B0C0]">
              Examples — the badge shows where your rule puts each one{' '}
              {preview && (
                <span className={preview.trainAccuracy > 0.999 ? 'text-[#22C55E]' : 'text-amber-300'}>
                  ({preview.train.filter((r) => r.ok).length}/{preview.train.length} right)
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.items.map((it) => (
                card(it, true, { got: applyRule(rule, it), ok: applyRule(rule, it) === it.category })
              ))}
            </div>
          </div>

          {(p.testItems?.length ?? 0) > 0 && (
            <div className="mt-3 rounded-[20px] border border-[#00B8D4]/30 bg-[#00B8D4]/[0.06] p-3">
              <p className="text-sm font-semibold text-[#00E5FF]">New cards the robot has never seen</p>
              <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                {(p.testItems ?? []).map((it, i) =>
                  i < testShown ? (
                    <div key={it.id} className="motion-safe:animate-[fadeUp_.3s_cubic-bezier(.22,.61,.36,1)]">
                      {card(it, true, { got: applyRule(rule, it), ok: applyRule(rule, it) === it.category })}
                    </div>
                  ) : (
                    <div key={it.id} className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl border border-dashed border-white/15 text-2xl text-[#6E7888]" aria-label="Hidden card">
                      ?
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {!att.result && (
            <div className="mt-4">
              <button type="button" className={btnPrimary} onClick={runRobot} disabled={running}>
                {running ? 'Robot is sorting…' : 'Run the robot'}
              </button>
            </div>
          )}
        </>
      )}

      <FeedbackPanel att={att} onRetry={() => setTestShown(0)} />

      {drag && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-400 bg-[#19263F] p-2 shadow-[0_8px_24px_rgba(0,0,0,.45)]" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <IconBox icon={p.items.find((i) => i.id === drag.id)?.icon ?? '?'} px={40} />
        </div>
      )}
    </TemplateCard>
  )
}

function RuleSide({ label, cat, colour }: { label: string; cat?: { label: string; icon: string }; colour: string }) {
  return (
    <div className="rounded-2xl border-2 p-2" style={{ borderColor: `${colour}88`, background: `${colour}14` }}>
      <p className="text-[13px] font-semibold text-[#A7B0C0]">{label} →</p>
      <p className="font-display text-[16px] font-bold" style={{ color: colour }}>
        {cat?.icon} {cat?.label}
      </p>
    </div>
  )
}

/** 1-D plot of every example on the chosen feature, with a draggable threshold. */
function NumberLine(props: {
  items: Item[]
  featKey: string
  unit?: string
  min: number
  max: number
  threshold: number
  tint: (cat: string) => string
  disabled: boolean
  onChange: (v: number) => void
}) {
  const { items, featKey, unit, min, max, threshold, tint, disabled, onChange } = props
  const W = 400
  const H = 96
  const X = (v: number) => 16 + ((W - 32) * (v - min)) / (max - min)
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const span = max - min
  const step = span > 50 ? 1 : span > 5 ? 0.5 : 0.1
  const snap = (v: number) => Math.round(Math.max(min, Math.min(max, v)) / step) * step
  const fromEvent = (clientX: number) => {
    const b = svg.current?.getBoundingClientRect()
    if (!b) return
    const x = ((clientX - b.left) * W) / b.width
    onChange(snap(min + ((x - 16) * (max - min)) / (W - 32)))
  }
  // Stack dots that share a value.
  const seen = new Map<number, number>()
  const dots = items.map((it) => {
    const v = it.features[featKey] as number
    const n = seen.get(v) ?? 0
    seen.set(v, n + 1)
    return { it, v, row: n }
  })
  const ticks = 5
  return (
    <div className="mt-3">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full touch-none select-none ${disabled ? '' : 'cursor-ew-resize'}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Threshold"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={threshold}
        aria-valuetext={`${threshold}${unit ? ' ' + unit : ''}`}
        onPointerDown={(e) => {
          if (disabled) return
          dragging.current = true
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          fromEvent(e.clientX)
        }}
        onPointerMove={(e) => dragging.current && fromEvent(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (disabled) return
          const d = (e.shiftKey ? 10 : 1) * step
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(snap(threshold + d))
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(snap(threshold - d))
          }
        }}
      >
        <rect x={16} y={0} width={Math.max(0, X(threshold) - 16)} height={70} fill="#ffffff" opacity={0.03} />
        <line x1={16} x2={W - 16} y1={60} y2={60} stroke="#6E7888" strokeWidth={2} />
        {Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i) / ticks).map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={57} y2={63} stroke="#6E7888" />
            <text x={X(v)} y={78} fill="#A7B0C0" fontSize={11} textAnchor="middle">
              {Math.round(v * 10) / 10}
            </text>
          </g>
        ))}
        {dots.map(({ it, v, row }) => (
          <g key={it.id}>
            <circle cx={X(v)} cy={48 - row * 15} r={7} fill={tint(it.category)} stroke="#0A1120" strokeWidth={1.5} />
          </g>
        ))}
        <line x1={X(threshold)} x2={X(threshold)} y1={2} y2={68} stroke="#FFA878" strokeWidth={3} strokeDasharray="5 4" />
        <rect x={X(threshold) - 14} y={0} width={28} height={16} rx={6} fill="#FC6818" />
        <text x={X(threshold)} y={12} fontSize={10} fontWeight={700} fill="#1A1103" textAnchor="middle">
          ⇔
        </text>
        <text x={W - 16} y={94} fill="#A7B0C0" fontSize={11} textAnchor="end">
          {unit ?? ''}
        </text>
      </svg>
      <p className="text-[13px] text-[#A7B0C0]">
        Dots = examples (colour = their real bin). Drag the orange line, or use the arrow keys. Threshold:{' '}
        <b className="font-display text-amber-300">
          {Math.round(threshold * 100) / 100}
          {unit ? ' ' + unit : ''}
        </b>
      </p>
    </div>
  )
}
