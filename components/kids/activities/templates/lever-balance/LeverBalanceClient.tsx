'use client'

// components/kids/activities/templates/lever-balance/LeverBalanceClient.tsx
// A beam on a pivot. Tap a tray item to put it on the beam, drag it (or tap
// the beam, or use the arrows) to choose its peg, slide the pivot if allowed,
// and watch the beam tip by the real moment balance.

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { netMoment, type Answer, type Params, type Placement } from './logic'
import {
  FeedbackPanel,
  Readout,
  TemplateCard,
  btnGhost,
  btnPrimary,
  chip,
  useAnimationFrame,
  useAttempts,
  useReducedMotion,
  useSvgScale,
} from '../gear-train/TemplateFrameClient'

const W = 400
const M = 26
const BEAM_Y = 150
const MAX_TILT = 14

const FIXED_COLOURS = ['#00B8D4', '#22C55E', '#38BDF8', '#2DD4BF']
const TRAY_COLOURS = ['#FC6818', '#FFA878', '#F59E0B', '#FB923C']

export default function LeverBalanceClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const p = params
  const L = p.beamLength
  const sp = (W - 2 * M) / L
  const px = (pos: number) => M + pos * sp
  const young = band === 'explorers' || band === 'builders'
  const live = p.liveTilt ?? young
  const showMoments = p.showMoments ?? !young

  const [fulcrum, setFulcrum] = useState(p.fulcrum)
  const [placed, setPlaced] = useState<Placement[]>([])
  const [sel, setSel] = useState<number | null>(null) // tray index of the selected placed item
  const [released, setReleased] = useState(live)
  const [angle, setAngle] = useState(0)
  const angleRef = useRef(0)
  const velRef = useRef(0)
  const sv = useSvgScale(W)
  const svgRef = sv.ref
  const dragRef = useRef<number | null>(null)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)

  const answer: Answer = useMemo(() => ({ fulcrum, placed }), [fulcrum, placed])
  const mom = useMemo(() => netMoment(p, answer), [p, answer])
  const scale = Math.max(1, ...p.fixed.map((f) => f.mass * L), ...p.tray.map((t) => t.mass * L)) / 3
  const targetAngle = released ? Math.max(-MAX_TILT, Math.min(MAX_TILT, (mom.net / scale) * MAX_TILT * 1.5)) : 0
  // tiny imbalances still show a visible tilt so "nearly" is honest
  const shownTarget = released && Math.abs(mom.net) > 1e-9 && Math.abs(targetAngle) < 2 ? Math.sign(mom.net) * 2 : targetAngle

  // springy beam
  useAnimationFrame(!reduced, (dt) => {
    const k = 60
    const c = 9
    const a = angleRef.current
    const acc = k * (shownTarget - a) - c * velRef.current
    velRef.current += acc * dt
    angleRef.current = a + velRef.current * dt
    if (Math.abs(angleRef.current - angle) > 0.01) setAngle(angleRef.current)
  })
  const shownAngle = reduced ? shownTarget : angle

  const edited = () => {
    if (att.result) att.clear()
    if (!live) setReleased(false)
  }

  const defaultPeg = () => {
    // drop new items on the lighter side, half-way out, so something visible happens
    const side = mom.net > 0 ? -1 : 1
    const target = side < 0 ? Math.floor(fulcrum / 2) : Math.ceil((fulcrum + L) / 2)
    return Math.max(0, Math.min(L, target === fulcrum ? (side < 0 ? 0 : L) : target))
  }

  const addFromTray = (idx: number) => {
    edited()
    playSound('click')
    if (placed.some((pl) => pl.item === idx)) {
      setSel(idx)
      return
    }
    setPlaced((ps) => [...ps, { item: idx, pos: defaultPeg() }])
    setSel(idx)
  }
  const moveSel = (pos: number) => {
    if (sel === null) return
    const clamped = Math.max(0, Math.min(L, pos))
    setPlaced((ps) => ps.map((pl) => (pl.item === sel ? { ...pl, pos: clamped } : pl)))
  }
  const nudge = (d: number) => {
    const cur = placed.find((pl) => pl.item === sel)
    if (!cur) return
    edited()
    playSound('click')
    moveSel(cur.pos + d)
  }
  const removeSel = () => {
    if (sel === null) return
    edited()
    playSound('click')
    setPlaced((ps) => ps.filter((pl) => pl.item !== sel))
    setSel(null)
  }
  const moveFulcrum = (d: number) => {
    edited()
    playSound('click')
    setFulcrum((f) => Math.max(0, Math.min(L, f + d)))
  }

  const pegFromEvent = (e: PointerEvent<SVGElement>) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const loc = pt.matrixTransform(ctm.inverse())
    return Math.round((loc.x - M) / sp)
  }

  const onItemKey = (e: KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setSel(idx)
      const cur = placed.find((pl) => pl.item === idx)
      if (!cur) return
      edited()
      playSound('click')
      setPlaced((ps) => ps.map((pl) => (pl.item === idx ? { ...pl, pos: Math.max(0, Math.min(L, pl.pos + (e.key === 'ArrowLeft' ? -1 : 1))) } : pl)))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      setSel(idx)
      edited()
      setPlaced((ps) => ps.filter((pl) => pl.item !== idx))
      setSel(null)
    }
  }

  // stack items per peg
  type Drawn = { key: string; pos: number; mass: number; label?: string; emoji?: string; colour: string; tray: number | null }
  const drawn: Drawn[] = [
    ...p.fixed.map((f, i) => ({ key: `f${i}`, pos: f.pos, mass: f.mass, label: f.label, emoji: f.emoji, colour: FIXED_COLOURS[i % 4], tray: null })),
    ...placed.map((pl) => {
      const t = p.tray[pl.item]
      return { key: `t${pl.item}`, pos: pl.pos, mass: t.mass, label: t.label, emoji: t.emoji, colour: TRAY_COLOURS[pl.item % 4], tray: pl.item }
    }),
  ]
  const maxMass = Math.max(...drawn.map((d) => d.mass), ...p.tray.map((t) => t.mass), 1)
  const itemW = Math.max(14, Math.min(44, sp * 0.86))
  const stackY: Record<number, number> = {}
  const fx = px(fulcrum)

  const loadSide = p.goal === 'lift' ? p.fixed[p.liftIndex ?? 0] : null

  return (
    <TemplateCard label="Lever balance">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">
          {p.goal === 'balance'
            ? 'Make the beam balance — perfectly level.'
            : `Lift the ${loadSide?.label ?? 'load'} ${loadSide?.emoji ?? ''} off the ground.`}
          {p.mustUseAll ? (p.tray.length === 1 ? ` Use the ${(p.tray[0].label ?? 'weight').toLowerCase()}.` : ` Use all ${p.tray.length} items.`) : ''}
        </p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} 210`}
          className="block h-auto w-full touch-none select-none"
          role="group"
          aria-label={`Beam with ${L} pegs, pivot at peg ${fulcrum}. ${released ? (Math.abs(mom.net) < 1e-9 ? 'Level.' : `${mom.net > 0 ? 'Right' : 'Left'} side down.`) : 'Held level until you let go.'}`}
          onPointerDown={(e) => {
            if (sel === null) return
            const peg = pegFromEvent(e)
            if (peg === null) return
            edited()
            moveSel(peg)
            playSound('click')
          }}
          onPointerMove={(e) => {
            if (dragRef.current === null) return
            const peg = pegFromEvent(e)
            if (peg !== null) moveSel(peg)
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          {/* ground */}
          <rect x={0} y={196} width={W} height={14} fill="#111C32" />
          {/* support jack when held */}
          {!released && (
            <g>
              <rect x={M - 6} y={BEAM_Y + 8} width={12} height={188 - BEAM_Y} fill="#6E7888" />
              <rect x={W - M - 6} y={BEAM_Y + 8} width={12} height={188 - BEAM_Y} fill="#6E7888" />
            </g>
          )}
          {/* fulcrum */}
          <polygon points={`${fx},${BEAM_Y + 6} ${fx - 18},196 ${fx + 18},196`} fill="#FC6818" stroke="#1A1103" strokeWidth={1.5} />
          <g transform={`rotate(${shownAngle.toFixed(2)} ${fx} ${BEAM_Y})`}>
            <rect x={M - 10} y={BEAM_Y - 3} width={W - 2 * M + 20} height={10} rx={4} fill="#A7B0C0" />
            {Array.from({ length: L + 1 }, (_, i) => (
              <g key={i}>
                <circle cx={px(i)} cy={BEAM_Y + 2} r={2.2} fill="#0A1120" />
                {(showMoments || i === fulcrum) && (L <= 12 || i % 2 === 0) && (
                  <text x={px(i)} y={BEAM_Y + 10 + sv.font(9)} textAnchor="middle" fontSize={sv.font(9)} fontWeight={700} fill={i === fulcrum ? '#FFA878' : '#A7B0C0'}>
                    {showMoments ? Math.abs(i - fulcrum) : ''}
                  </text>
                )}
              </g>
            ))}
            {drawn.map((d) => {
              const h = 14 + 34 * Math.sqrt(d.mass / maxMass)
              const base = stackY[d.pos] ?? BEAM_Y - 3
              stackY[d.pos] = base - h - 1
              const isSel = d.tray !== null && d.tray === sel
              const x = px(d.pos) - itemW / 2
              return (
                <g
                  key={d.key}
                  role={d.tray !== null ? 'button' : undefined}
                  tabIndex={d.tray !== null ? 0 : undefined}
                  aria-label={d.tray !== null ? `${d.label ?? 'Weight'} ${d.mass} kg on peg ${d.pos}. Arrow keys move it, Delete removes it.` : undefined}
                  onKeyDown={d.tray !== null ? (e) => onItemKey(e, d.tray as number) : undefined}
                  onFocus={d.tray !== null ? () => setSel(d.tray) : undefined}
                  onPointerDown={(e) => {
                    if (d.tray === null) return
                    e.stopPropagation()
                    setSel(d.tray)
                    dragRef.current = d.tray
                    edited()
                    ;(e.currentTarget.ownerSVGElement ?? e.currentTarget).setPointerCapture?.(e.pointerId)
                  }}
                  className={d.tray !== null ? 'cursor-grab outline-none' : ''}
                >
                  <rect
                    x={x}
                    y={base - h}
                    width={itemW}
                    height={h}
                    rx={4}
                    fill={d.colour}
                    stroke={isSel ? '#FFFFFF' : '#0A1120'}
                    strokeWidth={isSel ? 2.5 : 1}
                    strokeDasharray={d.tray === null ? '0' : undefined}
                  />
                  {itemW >= 22 && d.emoji && (
                    <text x={px(d.pos)} y={base - h / 2 + 5} textAnchor="middle" fontSize={Math.min(16, h - 4)}>
                      {d.emoji}
                    </text>
                  )}
                  <text x={px(d.pos)} y={base - h - 3} textAnchor="middle" fontSize={sv.font(10)} fontWeight={700} fill="#EEF2F8">
                    {d.mass}
                  </text>
                </g>
              )
            })}
          </g>
          {loadSide && (
            <text x={8} y={18} fontSize={sv.font(11)} fill="#A7B0C0">
              Lift: {loadSide.label ?? 'load'} ({loadSide.mass} kg)
            </text>
          )}
          <text x={W - 8} y={loadSide ? 18 + sv.font(11) + 4 : 18} textAnchor="end" fontSize={sv.font(11)} fill="#A7B0C0">
            numbers = kg{showMoments ? ' · pegs from pivot' : ''}
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="w-full text-sm font-semibold text-[#A7B0C0]">Tray — tap to put on the beam, then drag it or use the arrows.</p>
        {p.tray.map((t, i) => {
          const on = placed.some((pl) => pl.item === i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => addFromTray(i)}
              aria-pressed={sel === i}
              className={`${chip} gap-1 ${sel === i ? 'border-amber-400 bg-amber-500/15 text-amber-300' : on ? 'border-white/10 bg-white/[0.03] text-[#6E7888]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'}`}
            >
              <span aria-hidden="true">{t.emoji ?? '■'}</span>
              {t.label ?? 'Weight'} · {t.mass} kg{on ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      {sel !== null && placed.some((pl) => pl.item === sel) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={`${btnGhost} min-w-[48px]`} onClick={() => nudge(-1)} aria-label="Move left one peg">
            ◀
          </button>
          <span className="min-w-[96px] text-center font-display font-bold">
            {p.tray[sel].label ?? 'Weight'}: peg {placed.find((pl) => pl.item === sel)?.pos}
          </span>
          <button type="button" className={`${btnGhost} min-w-[48px]`} onClick={() => nudge(1)} aria-label="Move right one peg">
            ▶
          </button>
          <button type="button" className={btnGhost} onClick={removeSel}>
            Back to tray
          </button>
        </div>
      )}
      {p.fulcrumMovable && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={`${btnGhost} min-w-[48px]`} onClick={() => moveFulcrum(-1)} aria-label="Move pivot left">
            ◀
          </button>
          <span className="min-w-[96px] text-center font-display font-bold text-amber-300">Pivot: peg {fulcrum}</span>
          <button type="button" className={`${btnGhost} min-w-[48px]`} onClick={() => moveFulcrum(1)} aria-label="Move pivot right">
            ▶
          </button>
        </div>
      )}

      {showMoments && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Readout label="Left turning push" value={(Math.round(mom.left * 10) / 10).toString()} unit="kg·pegs" tone="cyan" />
          <Readout label="Right turning push" value={(Math.round(mom.right * 10) / 10).toString()} unit="kg·pegs" tone="cyan" />
        </div>
      )}
      {p.beamMass ? <p className="mt-2 text-sm text-[#A7B0C0]">The beam itself weighs {p.beamMass} kg — its weight acts at its middle (peg {L / 2}).</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!!att.result || att.done}
          onClick={() => {
            setReleased(true)
            att.submit(answer)
          }}
        >
          {live ? 'Check balance' : 'Let go!'}
        </button>
      </div>
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}
