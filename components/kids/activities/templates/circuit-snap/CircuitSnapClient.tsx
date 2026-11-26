'use client'

// components/kids/activities/templates/circuit-snap/CircuitSnapClient.tsx
// A schematic with gaps. Pick a part from the tray, tap a gap to snap it in;
// the real solver lights bulbs and LEDs, spins the motor and streams current
// dots at a speed that follows the current. Short circuits glow red-hot.
// Every action is also available from the button list below (keyboard).

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { evaluate, partName, type Answer, type EdgeDef, type EdgeState, type Params, type PartSpec, type Placement } from './logic'
import { LED_HEX, bandsFor } from '../ohms-law/logic'
import { FeedbackPanel, TemplateCard, btnGhost, btnPrimary, useAnimationFrame, useAttempts, useReducedMotion, useSvgScale } from '../gear-train/TemplateFrameClient'

// Grid → viewBox units. The viewBox is fitted to the nodes actually used (plus
// room for labels), so a phone shows the circuit as big as it can.
const CX = 42
const CY = 38
const GX = (x: number) => x * CX
const GY = (y: number) => y * CY
/** Layout assumes text up to this many viewBox units (what 13 px needs on a 340 px phone). */
const F_LAYOUT = 15
const SLOT_HALF = 30
const textW = (t: string, f = F_LAYOUT) => t.length * 0.58 * f
const isVertical = (ang: number) => Math.abs(ang) > 45 && Math.abs(ang) < 135
/** Split a label into at most two lines (so a vertical part's label stays narrow). */
function labelLines(t: string): string[] {
  const w = t.split(' ')
  if (w.length < 2 || t.length <= 7) return [t]
  const half = Math.ceil(w.length / 2)
  return [w.slice(0, half).join(' '), w.slice(half).join(' ')]
}
function labelOf(part: PartSpec): string {
  const l = part.label ?? ''
  return part.kind === 'battery' ? `${l ? `${l} ` : ''}${part.volts ?? 3} V` : l
}

function icon(part: PartSpec): string {
  switch (part.kind) {
    case 'battery':
      return '🔋'
    case 'bulb':
      return '💡'
    case 'led':
      return '🔆'
    case 'resistor':
      return '〰️'
    case 'motor':
      return '⚙️'
    case 'wire':
      return '➖'
    default:
      return '🚫'
  }
}

export default function CircuitSnapClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const showMeters = p.showMeters ?? !(band === 'explorers' || band === 'builders')
  const live = p.liveSim ?? true
  const slots = useMemo(() => p.edges.filter((e) => e.slot), [p.edges])
  const [placed, setPlaced] = useState<Record<string, Placement | null>>({})
  const [sel, setSel] = useState<string | null>(null)
  const [powered, setPowered] = useState(live)
  const [phase, setPhase] = useState(0)
  const phaseRef = useRef(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const solved = !!att.result?.correct

  const answer: Answer = useMemo(() => ({ placed }), [placed])
  const ev = useMemo(() => evaluate(p, answer), [p, answer])
  const on = powered
  const stateOf = (id: string): EdgeState | undefined => (on ? ev.state.edges.find((e) => e.id === id) : undefined)

  const used = (itemId: string) => Object.values(placed).filter((pl) => pl?.item === itemId).length
  const left = (itemId: string) => (p.inventory.find((i) => i.id === itemId)?.count ?? 0) - used(itemId)

  useAnimationFrame(on && !reduced, (dt) => {
    phaseRef.current = (phaseRef.current + dt) % 1000
    setPhase(phaseRef.current)
  })

  const changed = () => {
    if (att.result) att.clear()
    if (!live) setPowered(false)
  }

  const placeInto = (slotId: string, itemId: string) => {
    if (solved) return
    const cur = placed[slotId]
    if (cur?.item !== itemId && left(itemId) <= 0) {
      playSound('wrong')
      return
    }
    playSound('click')
    changed()
    setPlaced((pl) => ({ ...pl, [slotId]: { item: itemId } }))
    if (left(itemId) - (cur?.item === itemId ? 0 : 1) <= 0) setSel(null)
  }
  const remove = (slotId: string) => {
    if (solved) return
    playSound('click')
    changed()
    setPlaced((pl) => ({ ...pl, [slotId]: null }))
  }
  const flip = (slotId: string) => {
    if (solved) return
    playSound('click')
    changed()
    setPlaced((pl) => (pl[slotId] ? { ...pl, [slotId]: { ...pl[slotId]!, flipped: !pl[slotId]!.flipped } } : pl))
  }
  const tapSlot = (slotId: string) => {
    if (sel) placeInto(slotId, sel)
    else if (placed[slotId]) remove(slotId)
    else playSound('wrong')
  }

  const submit = () => {
    if (!live) setPowered(true)
    att.submit(answer)
  }

  const itemOf = (slotId: string) => {
    const pl = placed[slotId]
    return pl ? p.inventory.find((i) => i.id === pl.item) : undefined
  }

  const nodeAt = (id: string) => p.nodes.find((n) => n.id === id)!
  const short = on && ev.state.short

  // Fit the viewBox to the circuit: label room on the outer sides only.
  const box = useMemo(() => {
    const xs = p.nodes.map((n) => n.x)
    const ys = p.nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    let left = SLOT_HALF + 6
    let right = SLOT_HALF + 6
    for (const e of p.edges) {
      const A = p.nodes.find((n) => n.id === e.a)!
      const B = p.nodes.find((n) => n.id === e.b)!
      if (A.x !== B.x) continue // horizontal: label above, meter below
      const parts = e.slot ? p.inventory.map((i) => i.part) : e.part ? [e.part] : []
      const w = Math.max(0, ...parts.map((pt) => Math.max(0, ...labelLines(labelOf(pt)).map((l) => (l ? textW(l) : 0)))))
      const meterW = textW('888 mA')
      if (A.x === minX) {
        left = Math.max(left, w ? 26 + w + 6 : 0)
        right = Math.max(right, minX === maxX ? 30 + meterW : 0)
      } else if (A.x === maxX) right = Math.max(right, 26 + Math.max(w, meterW) + 6)
    }
    const x0 = GX(minX) - left
    const y0 = GY(Math.min(...ys)) - (SLOT_HALF + 2 + F_LAYOUT)
    const w = GX(maxX) - GX(minX) + left + right
    const h = GY(Math.max(...ys)) - GY(Math.min(...ys)) + SLOT_HALF + 2 + F_LAYOUT + 34 + F_LAYOUT
    return { x0, y0, w, h, minX, maxX }
  }, [p.nodes, p.edges, p.inventory])
  const { ref: svgRef, font } = useSvgScale<SVGSVGElement>(box.w)
  const fs = font(11, 13)
  /**
   * Meter baseline for a vertical part: always on its right. On the right-hand
   * edge the label is there too, so the meter goes under the label (it used to
   * sit on the left and collide with the middle branch's meter).
   */
  const meterY = (part: PartSpec, my: number, labelRight: boolean) => {
    const n = labelLines(labelOf(part)).filter(Boolean).length
    if (!n || !labelRight) return my + fs * 0.35
    const first = my + fs * 0.35 - ((n - 1) * fs * 1.1) / 2
    return first + (n - 1) * fs * 1.1 + fs * 1.15
  }

  return (
    <TemplateCard label="Circuit snap">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">{p.job}</p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120] px-1 py-2">
        {(short || !on) && (
          <p
            className={`absolute right-2 top-2 z-10 rounded-full px-3 py-1 font-display text-sm font-bold ${short ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/10 text-[#A7B0C0]'}`}
            aria-hidden
          >
            {short ? '⚠ Short circuit' : 'Power off'}
          </p>
        )}
        <svg
          ref={svgRef}
          viewBox={`${box.x0} ${box.y0} ${box.w} ${box.h}`}
          className="mx-auto block h-auto w-full max-w-[560px] select-none"
          role="img"
          aria-label={`Circuit diagram. ${on ? (short ? 'Short circuit!' : 'Power is on.') : 'Power is off.'}`}
        >
          {p.edges.map((e) => {
            const A = nodeAt(e.a)
            const B = nodeAt(e.b)
            const x1 = GX(A.x)
            const y1 = GY(A.y)
            const x2 = GX(B.x)
            const y2 = GY(B.y)
            const st = stateOf(e.id)
            const hot = short && st && Math.abs(st.currentMa) > 300
            return (
              <line key={`l${e.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? '#FC6818' : e.slot && !placed[e.id] ? 'transparent' : '#6E7888'} strokeWidth={hot ? 5 : 3.5} strokeLinecap="round" />
            )
          })}

          {/* current dots */}
          {on &&
            p.edges.map((e) => {
              const st = stateOf(e.id)
              if (!st || Math.abs(st.currentMa) < 0.5) return null
              const A = nodeAt(e.a)
              const B = nodeAt(e.b)
              const x1 = GX(A.x)
              const y1 = GY(A.y)
              const x2 = GX(B.x)
              const y2 = GY(B.y)
              const len = Math.hypot(x2 - x1, y2 - y1)
              const speed = Math.min(90, 10 + Math.abs(st.currentMa) / 8)
              const dir = st.currentMa >= 0 ? 1 : -1
              const gap = 16
              const n = Math.max(1, Math.floor(len / gap))
              const off = (((phase * speed * dir) % gap) + gap) % gap
              return Array.from({ length: n }, (_, i) => {
                const d = (i * gap + off) % len
                return <circle key={`c${e.id}${i}`} cx={x1 + ((x2 - x1) * d) / len} cy={y1 + ((y2 - y1) * d) / len} r={2.3} fill="#00E5FF" opacity={0.85} />
              })
            })}

          {/* parts + slots */}
          {p.edges.map((e) => {
            const A = nodeAt(e.a)
            const B = nodeAt(e.b)
            const mx = (GX(A.x) + GX(B.x)) / 2
            const my = (GY(A.y) + GY(B.y)) / 2
            const ang = (Math.atan2(GY(B.y) - GY(A.y), GX(B.x) - GX(A.x)) * 180) / Math.PI
            const pl = e.slot ? placed[e.id] : null
            const item = e.slot ? itemOf(e.id) : undefined
            const part = e.slot ? (item?.part ?? null) : (e.part ?? null)
            const st = stateOf(e.id)
            const flipped = !!pl?.flipped
            return (
              <g key={`p${e.id}`}>
                {part && (
                  <PartSymbol
                    part={part}
                    x={mx}
                    y={my}
                    ang={ang + (flipped ? 180 : 0)}
                    st={st}
                    phase={phase}
                    short={short}
                    fs={fs}
                    labelSide={isVertical(ang) && A.x === box.maxX && box.maxX !== box.minX ? 'right' : 'left'}
                  />
                )}
                {part && showMeters && on && st && part.kind !== 'wire' && part.kind !== 'insulator' && (
                  <text
                    x={isVertical(ang) ? mx + 24 : mx}
                    y={isVertical(ang) ? meterY(part, my, A.x === box.maxX && box.maxX !== box.minX) : my + 22 + fs * 0.8}
                    textAnchor={isVertical(ang) ? 'start' : 'middle'}
                    fontSize={fs}
                    fontWeight={800}
                    fill="#00E5FF"
                    stroke="#0A1120"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {Math.round(Math.abs(st.currentMa))} mA
                  </text>
                )}
                {e.slot && (
                  <g
                    role="button"
                    tabIndex={-1}
                    aria-label={`Gap ${slots.indexOf(e) + 1}`}
                    onClick={() => tapSlot(e.id)}
                    className="cursor-pointer"
                  >
                    <rect x={mx - SLOT_HALF} y={my - SLOT_HALF} width={SLOT_HALF * 2} height={SLOT_HALF * 2} rx={12} fill="transparent" />
                    {!part && (
                      <>
                        <line x1={GX(A.x)} y1={GY(A.y)} x2={GX(B.x)} y2={GY(B.y)} stroke="#FC6818" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
                        <circle cx={mx} cy={my} r={Math.max(15, fs)} fill="#19263F" stroke={sel ? '#FC6818' : '#A7B0C0'} strokeWidth={2} strokeDasharray="4 3" className={sel && !reduced ? 'animate-pulse' : undefined} />
                        <text x={mx} y={my + Math.max(16, fs * 1.2) * 0.35} textAnchor="middle" fontSize={Math.max(16, fs * 1.2)} fontWeight={800} fill={sel ? '#FFA878' : '#A7B0C0'}>
                          {slots.indexOf(e) + 1}
                        </text>
                      </>
                    )}
                    {part && <rect x={mx - SLOT_HALF + 2} y={my - SLOT_HALF + 2} width={SLOT_HALF * 2 - 4} height={SLOT_HALF * 2 - 4} rx={12} fill="none" stroke={sel ? '#FC6818' : '#FFA878'} strokeOpacity={0.5} strokeDasharray="4 3" />}
                  </g>
                )}
              </g>
            )
          })}
          {p.nodes.map((n) => (
            <circle key={n.id} cx={GX(n.x)} cy={GY(n.y)} r={3.2} fill="#A7B0C0" />
          ))}
        </svg>
      </div>

      {/* tray */}
      <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-wide text-[#A7B0C0]">Parts tray — pick one, then tap a gap</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {p.inventory.map((it) => {
          const n = left(it.id)
          const active = sel === it.id
          return (
            <button
              key={it.id}
              type="button"
              aria-pressed={active}
              disabled={solved || n <= 0}
              onClick={() => {
                playSound('click')
                setSel(active ? null : it.id)
              }}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl border px-3 font-semibold transition-transform duration-150 active:scale-[.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                active ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8] hover:border-white/30'
              }`}
            >
              <span aria-hidden>{icon(it.part)}</span>
              {it.part.label ?? partName(it.part)}
              <span className={`rounded-full px-1.5 text-xs font-bold ${active ? 'bg-[#1A1103]/15' : 'bg-white/10'}`}>×{n}</span>
            </button>
          )
        })}
      </div>

      {/* gap list (keyboard + precise control) */}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {slots.map((s: EdgeDef, i) => {
          const item = itemOf(s.id)
          const pl = placed[s.id]
          const flippable = item && (item.part.kind === 'led' || item.part.kind === 'battery')
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2">
              <span className="font-display font-bold text-amber-300">Gap {i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-[#EEF2F8]">
                {item ? `${item.part.label ?? partName(item.part)}${pl?.flipped ? ' (flipped)' : ''}` : 'empty'}
              </span>
              {sel && (
                <button type="button" className={`${btnGhost} min-h-[44px] px-3 text-sm`} onClick={() => placeInto(s.id, sel)} disabled={solved}>
                  Place here
                </button>
              )}
              {flippable && (
                <button type="button" className={`${btnGhost} min-h-[44px] px-3 text-sm`} onClick={() => flip(s.id)} disabled={solved}>
                  Flip ⇄
                </button>
              )}
              {item && (
                <button type="button" className={`${btnGhost} min-h-[44px] px-3 text-sm`} onClick={() => remove(s.id)} disabled={solved}>
                  Remove
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={submit}>
            {live ? 'Check my circuit' : 'Switch on'}
          </button>
        </div>
      )}
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}

function PartSymbol({
  part,
  x,
  y,
  ang,
  st,
  phase,
  short,
  fs,
  labelSide,
}: {
  part: PartSpec
  x: number
  y: number
  ang: number
  st?: EdgeState
  phase: number
  short: boolean
  fs: number
  labelSide: 'left' | 'right'
}) {
  const vertical = isVertical(ang)
  const lines = labelLines(labelOf(part))
  const k = part.kind
  const bands = k === 'resistor' ? bandsFor(part.ohms ?? 100) : []
  const glow = st?.brightness ?? 0
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`rotate(${ang})`}>
        {k !== 'wire' && <rect x={-20} y={-14} width={40} height={28} fill="#0A1120" />}
        {k === 'battery' && (
          <g>
            <line x1={-20} y1={0} x2={-4} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={4} y1={0} x2={20} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={-4} y1={-13} x2={-4} y2={13} stroke={short ? '#FC6818' : '#EEF2F8'} strokeWidth={3} />
            <line x1={4} y1={-7} x2={4} y2={7} stroke={short ? '#FC6818' : '#EEF2F8'} strokeWidth={5} />
            <text x={-14} y={-8} fontSize={fs} fontWeight={800} fill="#FFA878" textAnchor="middle" transform={`rotate(${-ang} -14 -8)`}>
              +
            </text>
          </g>
        )}
        {k === 'resistor' && (
          <g>
            <line x1={-20} y1={0} x2={-14} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={14} y1={0} x2={20} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <rect x={-14} y={-6} width={28} height={12} rx={4} fill="#D9C3A0" />
            {/* the real 4-band colour code for this value */}
            {bands.map((b, i) => (
              <rect key={i} x={-10 + i * 5 + (i === 3 ? 3 : 0)} y={-6} width={3} height={12} fill={b.hex} />
            ))}
          </g>
        )}
        {k === 'led' && (
          <g>
            <line x1={-20} y1={0} x2={-8} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={8} y1={0} x2={20} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            {glow > 0 && !st?.burnt && <circle r={10 + glow * 14} fill={LED_HEX[part.colour ?? 'red']} opacity={0.15 + glow * 0.35} />}
            <path d="M -8 -9 L -8 9 L 8 0 Z" fill={st?.burnt ? '#3F3F46' : glow > 0 ? LED_HEX[part.colour ?? 'red'] : '#2A3650'} stroke={LED_HEX[part.colour ?? 'red']} strokeWidth={1.5} />
            <line x1={8} y1={-9} x2={8} y2={9} stroke={LED_HEX[part.colour ?? 'red']} strokeWidth={2.5} />
          </g>
        )}
        {k === 'bulb' && (
          <g>
            <line x1={-20} y1={0} x2={-12} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={12} y1={0} x2={20} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            {glow > 0.02 && <circle r={12 + glow * 16} fill="#FFD43B" opacity={0.12 + glow * 0.4} />}
            <circle r={12} fill={st?.on ? '#FFE58A' : '#19263F'} stroke="#EEF2F8" strokeWidth={1.5} />
            <path d="M -7 -7 L 7 7 M -7 7 L 7 -7" stroke={st?.on ? '#B45309' : '#A7B0C0'} strokeWidth={1.5} />
          </g>
        )}
        {k === 'motor' && (
          <g>
            <line x1={-20} y1={0} x2={-12} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={12} y1={0} x2={20} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <circle r={12} fill="#19263F" stroke={st?.on ? '#22C55E' : '#EEF2F8'} strokeWidth={2} />
            <g transform={`rotate(${st?.on ? (phase * 360 * (0.5 + glow * 2)) % 360 : 0})`}>
              <line x1={-8} y1={0} x2={8} y2={0} stroke={st?.on ? '#22C55E' : '#A7B0C0'} strokeWidth={2} />
              <line x1={0} y1={-8} x2={0} y2={8} stroke={st?.on ? '#22C55E' : '#A7B0C0'} strokeWidth={2} />
            </g>
          </g>
        )}
        {k === 'insulator' && (
          <g>
            <line x1={-20} y1={0} x2={-12} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <line x1={12} y1={0} x2={20} y2={0} stroke="#6E7888" strokeWidth={3.5} />
            <rect x={-12} y={-6} width={24} height={12} rx={3} fill="#6E7888" opacity={0.5} stroke="#A7B0C0" />
          </g>
        )}
      </g>
      {lines[0] && (
        <text
          x={vertical ? (labelSide === 'right' ? 24 : -24) : 0}
          y={vertical ? fs * 0.35 - ((lines.length - 1) * fs * 1.1) / 2 : -18 - (lines.length - 1) * fs * 1.1}
          textAnchor={vertical ? (labelSide === 'right' ? 'start' : 'end') : 'middle'}
          fontSize={fs}
          fontWeight={700}
          fill="#C9D1DE"
        >
          {lines.map((l, i) => (
            <tspan key={i} x={vertical ? (labelSide === 'right' ? 24 : -24) : 0} dy={i === 0 ? 0 : fs * 1.1}>
              {l}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}
