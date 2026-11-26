'use client'

// components/kids/activities/templates/spot-in-scene/SpotInSceneClient.tsx
// A painted SVG scene. Tap (or Tab + Enter) objects to find every target:
// a target gets a green ring and its name; anything else shows a kind note
// explaining why it isn't one (and counts as a wrong tap). Label mode adds a
// "what is it?" chip row for every found target. Hit areas are at least
// 44 px on screen whatever the scene's size.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { SCENE_H, SCENE_W, type Answer, type Params, type SceneObject } from './logic'
import { Glyph, IconBox } from './glyphs'
import { FeedbackPanel, TemplateCard, btnPrimary, chip, useAttempts } from '../gear-train/TemplateFrameClient'

export default function SpotInSceneClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const [found, setFound] = useState<string[]>([])
  const [wrongTaps, setWrongTaps] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [last, setLast] = useState<SceneObject | null>(null)
  const [pxPerUnit, setPxPerUnit] = useState(6)
  const wrap = useRef<HTMLDivElement>(null)
  const solved = !!att.result?.correct
  const targets = p.objects.filter((o) => o.target)
  const allFound = targets.every((o) => found.includes(o.id))
  const allLabelled = !p.kinds || targets.every((o) => labels[o.id])

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setPxPerUnit(el.clientWidth / SCENE_W))
    ro.observe(el)
    setPxPerUnit(el.clientWidth / SCENE_W)
    return () => ro.disconnect()
  }, [])

  const tap = (o: SceneObject) => {
    if (solved) return
    if (att.result) att.clear()
    setLast(o)
    if (o.target) {
      if (!found.includes(o.id)) {
        setFound((f) => [...f, o.id])
        playSound(found.length + 1 === targets.length ? 'star' : 'correct')
      } else playSound('click')
    } else {
      if (!missed.includes(o.id)) setMissed((m) => [...m, o.id])
      setWrongTaps((w) => w + 1)
      playSound('wrong')
    }
  }

  const reset = () => {
    setFound([])
    setWrongTaps(0)
    setMissed([])
    setLabels({})
    setLast(null)
  }

  const submit = () => {
    playSound('click')
    att.submit({ found, wrongTaps, ...(p.kinds ? { labels } : {}) })
  }

  const minR = 22 / Math.max(0.5, pxPerUnit) // 44 px diameter
  const limit = p.maxWrongTaps
  const ordered = useMemo(() => [...p.objects].sort((a, b) => a.y - b.y), [p.objects])

  return (
    <TemplateCard label="Spot in the scene">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-lg font-bold text-[#EEF2F8]">{p.prompt}</p>
        <p className="flex gap-2 text-sm font-semibold" aria-live="polite">
          <span className="rounded-full bg-[#22C55E]/15 px-3 py-1 text-[#22C55E]">
            Found {found.length}/{targets.length}
          </span>
          {limit !== undefined && (
            <span className={`rounded-full px-3 py-1 ${wrongTaps > limit ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-[#A7B0C0]'}`}>
              Wrong taps {wrongTaps}/{limit}
            </span>
          )}
        </p>
      </div>

      <div ref={wrap} className="mt-3 overflow-hidden rounded-[20px] border border-white/10">
        <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="block w-full select-none" role="group" aria-label="Scene">
          <Backdrop kind={p.backdrop} />
          {(p.decor ?? []).map((d, i) => (
            <Glyph key={i} icon={d.icon} x={d.x} y={d.y} size={d.size} />
          ))}
          {ordered.map((o) => {
            const isFound = found.includes(o.id)
            const isMiss = missed.includes(o.id)
            const r = Math.max(o.size / 2 + 0.6, minR)
            return (
              <g
                key={o.id}
                role="button"
                tabIndex={0}
                aria-label={isFound ? `${o.label} (found)` : isMiss ? `${o.label} (not one)` : 'Something in the scene'}
                aria-pressed={isFound}
                onClick={() => tap(o)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    tap(o)
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-amber-400 [&:focus-visible>circle.ring]:opacity-100"
              >
                <circle cx={o.x} cy={o.y} r={r} fill="transparent" />
                <circle className="ring" cx={o.x} cy={o.y} r={o.size / 2 + 1} fill="none" stroke="#FFA878" strokeWidth={0.6} opacity={0} />
                <Glyph icon={o.icon} x={o.x} y={o.y} size={o.size} />
                {isFound && (
                  <g className="motion-safe:animate-[fadeIn_.2s_ease-out]" pointerEvents="none">
                    <circle cx={o.x} cy={o.y} r={o.size / 2 + 1.2} fill="none" stroke="#22C55E" strokeWidth={0.9} />
                    <rect x={o.x - 9} y={o.y + o.size / 2 + 0.6} width={18} height={4} rx={1.5} fill="#22C55E" />
                    <text x={o.x} y={o.y + o.size / 2 + 3.5} fontSize={2.6} fontWeight={700} fill="#04150A" textAnchor="middle">
                      {o.label.length > 14 ? o.label.slice(0, 13) + '…' : o.label}
                    </text>
                  </g>
                )}
                {isMiss && !isFound && (
                  <g pointerEvents="none">
                    <line x1={o.x - o.size / 2.6} y1={o.y - o.size / 2.6} x2={o.x + o.size / 2.6} y2={o.y + o.size / 2.6} stroke="#FFA878" strokeWidth={0.7} opacity={0.8} />
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {last && (
        <p
          key={`${last.id}-${found.length}-${wrongTaps}`}
          role="status"
          className={`mt-3 rounded-2xl border p-3 text-[16px] text-[#EEF2F8] motion-safe:animate-[fadeIn_.2s_ease-out] ${
            last.target ? 'border-[#22C55E]/40 bg-[#22C55E]/10' : 'border-amber-400/40 bg-amber-500/10'
          }`}
        >
          <b className={last.target ? 'text-[#22C55E]' : 'text-amber-300'}>{last.target ? `Found: ${last.label}! ` : `${last.label} — not one. `}</b>
          {last.target ? last.fact : `It’s not, because ${last.fact}`}
        </p>
      )}

      {p.kinds && found.length > 0 && (
        <div className="mt-3 rounded-[20px] border border-white/10 bg-[#111C32] p-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">What is each one?</p>
          <ul className="mt-2 flex flex-col gap-2">
            {targets
              .filter((o) => found.includes(o.id))
              .map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2">
                  <span className="flex min-w-[9rem] items-center gap-2 text-[15px] font-semibold text-[#EEF2F8]">
                    <IconBox icon={o.icon} px={26} /> {o.label}
                  </span>
                  <span className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Kind of ${o.label}`}>
                    {p.kinds!.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        role="radio"
                        aria-checked={labels[o.id] === k.id}
                        disabled={solved}
                        onClick={() => {
                          if (att.result) att.clear()
                          playSound('click')
                          setLabels((l) => ({ ...l, [o.id]: k.id }))
                        }}
                        className={`${chip} text-[14px] ${labels[o.id] === k.id ? 'border-[#00B8D4] bg-[#00B8D4] text-[#04151A]' : 'border-white/15 bg-white/[0.06] text-[#EEF2F8]'}`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={submit} disabled={found.length === 0}>
            {allFound && allLabelled ? 'Check' : allFound ? 'Check (labels missing)' : found.length === 0 ? 'Find one first' : 'I’m done looking'}
          </button>
        </div>
      )}
      <FeedbackPanel
        att={att}
        onRetry={() => {
          // Too many wrong taps means a fresh, careful search.
          if (limit !== undefined && wrongTaps > limit) reset()
        }}
      />
    </TemplateCard>
  )
}

/** Painted backgrounds, all on the 100 × 62.5 canvas. */
function Backdrop({ kind }: { kind: Params['backdrop'] }) {
  const W = SCENE_W
  const H = SCENE_H
  switch (kind) {
    case 'home':
      return (
        <g>
          <rect width={W} height={H} fill="#2B3A5A" />
          <rect y={40} width={W} height={H - 40} fill="#6E5440" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={i * 13} x2={i * 13 - 6} y1={40} y2={H} stroke="#5D4636" strokeWidth={0.5} />
          ))}
          <rect x={68} y={8} width={30} height={32} fill="#7CC4E8" />
          <rect x={68} y={30} width={30} height={10} fill="#4CAF50" />
          <rect x={68} y={40} width={30} height={22.5} fill="#3E8E41" />
          <rect x={67} y={7} width={32} height={55.5} fill="none" stroke="#C9D4E5" strokeWidth={1.2} />
          <line x1={83} x2={83} y1={7} y2={62.5} stroke="#C9D4E5" strokeWidth={0.8} />
          <rect x={38} y={15} width={24} height={17} rx={1} fill="#19263F" opacity={0.5} />
        </g>
      )
    case 'warehouse':
      return (
        <g>
          <rect width={W} height={H} fill="#1C2740" />
          <rect y={36} width={W} height={H - 36} fill="#4A5568" />
          <path d={`M0 47 H${W}`} stroke="#FFD166" strokeWidth={0.8} strokeDasharray="3 2" />
          {[10, 50].map((x) => (
            <g key={x}>
              <rect x={x} y={8} width={34} height={26} fill="#2A3A5C" />
              {[14, 22, 30].map((y) => (
                <rect key={y} x={x} y={y} width={34} height={1} fill="#6E7888" />
              ))}
            </g>
          ))}
        </g>
      )
    case 'street':
      return (
        <g>
          <rect width={W} height={H} fill="#2C4A78" />
          <rect y={24} width={W} height={10} fill="#3A4F6E" />
          {[4, 20, 76, 90].map((x, i) => (
            <rect key={x} x={x} y={6 + (i % 2) * 6} width={10} height={20} fill="#22324F" />
          ))}
          <rect y={34} width={W} height={H - 34} fill="#3B4252" />
          <path d={`M0 58 H${W}`} stroke="#EEF2F8" strokeWidth={0.8} strokeDasharray="5 4" />
        </g>
      )
    case 'farm':
      return (
        <g>
          <rect width={W} height={H} fill="#8ED1F0" />
          <rect y={30} width={W} height={H - 30} fill="#5C8A3A" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M0 ${36 + i * 5} Q50 ${33 + i * 5} ${W} ${36 + i * 5}`} stroke="#4A7330" strokeWidth={1} fill="none" />
          ))}
        </g>
      )
    case 'mars':
      return (
        <g>
          <rect width={W} height={H} fill="#E3A27A" />
          <path d={`M0 30 Q20 22 40 28 T80 26 T${W} 30 V${H} H0 Z`} fill="#B4532A" />
          <path d={`M0 42 Q30 36 60 42 T${W} 40 V${H} H0 Z`} fill="#9C4221" />
        </g>
      )
    case 'ocean':
      return (
        <g>
          <rect width={W} height={H} fill="#0B3D63" />
          <rect width={W} height={12} fill="#1E6FA8" />
          <path d={`M0 52 Q25 46 50 52 T${W} 50 V${H} H0 Z`} fill="#C2A878" />
        </g>
      )
    case 'hospital':
      return (
        <g>
          <rect width={W} height={H} fill="#DDE7EE" />
          <rect y={40} width={W} height={H - 40} fill="#B8C7D4" />
          <rect x={6} y={8} width={20} height={14} rx={1} fill="#FFFFFF" />
          <path d="M14 12 h4 v3 h3 v4 h-3 v3 h-4 v-3 h-3 v-4 h3 Z" fill="#EF4444" transform="translate(-0.5 -1) scale(1)" />
        </g>
      )
    case 'factory':
    default:
      return (
        <g>
          <rect width={W} height={H} fill="#262F3F" />
          <rect y={38} width={W} height={H - 38} fill="#55606F" />
          <rect x={0} y={34} width={W} height={4} fill="#FFD166" opacity={0.6} />
        </g>
      )
  }
}
