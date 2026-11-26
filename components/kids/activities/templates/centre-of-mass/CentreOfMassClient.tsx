'use client'

// components/kids/activities/templates/centre-of-mass/CentreOfMassClient.tsx
// Side view of a robot on a tilting test ramp. Tap a part, then tap a slot on
// the deck (or move it with the arrow buttons / arrow keys). The balance point
// and its line of gravity show where the robot's weight really goes; "Run the
// tilt tests" tips the ramp through every test and the robot falls over for
// real if the line lands outside its wheels.

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { allTests, evaluate, slotX, type Answer, type ComPlacement, type Params, type TiltTest } from './logic'
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

const VW = 400
const VH = 270
const CX = 200
const CY = 200
const ITEM_COLOURS = ['#FC6818', '#FFA878', '#F59E0B', '#FB923C']
const TEST_IN = 0.55 // seconds to tilt in
const TEST_HOLD = 0.75 // seconds to hold / fall

type Phase = 'idle' | 'testing' | 'shown'

function testLabel(t: TiltTest): string {
  if (t.label) return t.label
  const s = t.slopeDeg === 0 ? 'Flat' : `${t.slopeDeg > 0 ? 'Up' : 'Down'} ${Math.abs(t.slopeDeg)}°`
  return t.brakeG ? `${s} + brake ${t.brakeG} g` : s
}

export default function CentreOfMassClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const p = params
  const young = band === 'explorers' || band === 'builders'
  const live = p.liveCom ?? young
  const showMath = p.showMath ?? !young
  const L = p.wheelbaseCm
  const levels = p.deck.levels

  const [placed, setPlaced] = useState<ComPlacement[]>([])
  const [sel, setSel] = useState<number>(0) // item index selected
  // which test the ramp previews — start on the first real test, not the built-in "Standing still"
  const [view, setView] = useState(() => (allTests(params)[0]?.implicit ? 1 : 0))
  const [phase, setPhase] = useState<Phase>('idle')
  const [anim, setAnim] = useState({ idx: 0, t: 0 })
  const animRef = useRef({ idx: 0, t: 0 })
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const sv = useSvgScale(VW)

  const answer: Answer = useMemo(() => ({ placed }), [placed])
  const ev = useMemo(() => evaluate(p, answer), [p, answer])
  const allPlaced = placed.length === p.items.length
  const firstFail = ev.tests.findIndex((t) => !t.ok)
  const tests = ev.tests.map((r) => r.test)

  // ---- geometry (cm → px) ----
  const xs = [p.deck.fromCm, p.deck.toCm, 0, L, ...(p.fixed ?? []).map((f) => f.x)]
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const maxH = Math.max(levels[levels.length - 1] + 6, ...(p.fixed ?? []).map((f) => f.h + 4), p.chassis.h + 4)
  const s = Math.min(280 / (maxX - minX), 150 / maxH)
  const X = (x: number) => (x - (minX + maxX) / 2) * s
  const Y = (h: number) => -h * s
  const slotGap = p.deck.slots > 1 ? ((p.deck.toCm - p.deck.fromCm) / (p.deck.slots - 1)) * s : 40
  const levelGap = levels.length > 1 ? (levels[1] - levels[0]) * s : levels[0] * s
  const boxW = Math.max(14, Math.min(34, slotGap * 0.86))
  const boxH = Math.max(14, Math.min(30, levelGap * 0.8))
  const rw = Math.max(7, Math.min(20, levels[0] * s * 0.7, L * s * 0.16))
  const maxMass = Math.max(...p.items.map((i) => i.mass))

  // ---- which tilt to draw ----
  const testing = phase === 'testing'
  const shownIdx = testing ? anim.idx : phase === 'shown' && firstFail >= 0 ? firstFail : view
  const test = tests[shownIdx] ?? tests[0]
  const tiltFrac = testing ? Math.min(1, anim.t / TEST_IN) : 1
  const theta = test.slopeDeg * tiltFrac
  const res = ev.tests[shownIdx]
  const falling = (testing && !res.ok && anim.t > TEST_IN) || (phase === 'shown' && !res.ok)
  const fallFrac = testing ? Math.max(0, Math.min(1, (anim.t - TEST_IN) / TEST_HOLD)) : 1
  const tipDeg = falling ? 32 * (reduced ? 1 : fallFrac * fallFrac) : 0
  const showCom = live || phase !== 'idle'
  // Pass/fail is only revealed by running the tests — live mode shows the balance
  // point and its line, but the child still has to judge where it lands.
  const revealed = phase !== 'idle'

  useAnimationFrame(testing, (dt) => {
    const a = animRef.current
    a.t += dt
    const r = ev.tests[a.idx]
    if (a.t >= TEST_IN + TEST_HOLD) {
      if (!r.ok || a.idx >= ev.tests.length - 1) {
        setPhase('shown')
        att.submit(answer)
        return
      }
      a.idx += 1
      a.t = 0
      playSound('click')
    }
    setAnim({ ...a })
  })

  const edit = (fn: () => void) => {
    if (att.result) att.clear()
    setPhase('idle')
    fn()
  }

  const occupied = (slot: number, level: number, except: number) => placed.some((q) => q.slot === slot && q.level === level && q.item !== except)

  const placeAt = (slot: number, level: number) =>
    edit(() => {
      const other = placed.find((q) => q.slot === slot && q.level === level)
      if (other && other.item !== sel) {
        // tapping an occupied slot selects what is there
        playSound('click')
        setSel(other.item)
        return
      }
      playSound('click')
      setPlaced((ps) => [...ps.filter((q) => q.item !== sel), { item: sel, slot, level }].sort((a, b) => a.item - b.item))
      // move on to the next unplaced item
      const next = p.items.findIndex((_, i) => i !== sel && !placed.some((q) => q.item === i))
      if (next >= 0) setSel(next)
    })

  const move = (dSlot: number, dLevel: number) => {
    const cur = placed.find((q) => q.item === sel)
    if (!cur) {
      placeAt(Math.floor(p.deck.slots / 2), 0)
      return
    }
    let slot = cur.slot
    let level = cur.level
    // skip over occupied spots
    for (let k = 0; k < Math.max(p.deck.slots, levels.length); k++) {
      slot += dSlot
      level += dLevel
      if (slot < 0 || slot >= p.deck.slots || level < 0 || level >= levels.length) return
      if (!occupied(slot, level, sel)) break
    }
    if (slot < 0 || slot >= p.deck.slots || level < 0 || level >= levels.length || occupied(slot, level, sel)) return
    edit(() => {
      playSound('click')
      setPlaced((ps) => ps.map((q) => (q.item === sel ? { ...q, slot, level } : q)))
    })
  }

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }
    const m = map[e.key]
    if (!m) return
    e.preventDefault()
    move(m[0], m[1])
  }

  const runTests = () => {
    playSound('click')
    if (reduced) {
      setPhase('shown')
      att.submit(answer)
      return
    }
    animRef.current = { idx: 0, t: 0 }
    setAnim({ idx: 0, t: 0 })
    setPhase('testing')
  }

  // Robot drawn in body frame (rear contact at X(0)), inside a group rotated by the slope.
  const rear = X(0)
  const front = X(L)
  const pivotX = res.tips === 'forward' ? front : rear
  const tipRot = res.tips === 'forward' ? tipDeg : -tipDeg
  const margin = p.minMarginCm ?? 0
  const lineOk = res.ok
  const lineColour = !revealed ? '#00E5FF' : lineOk ? '#22C55E' : '#FC6818'
  const tipX = X(res.tipPoint)
  const brake = test.brakeG ?? 0

  const sceneLabel = `Robot on ${testLabel(test)}. ${allPlaced ? '' : 'Not every part is placed yet. '}${revealed ? (res.ok ? 'It stays up.' : `It tips ${res.tips}.`) : ''}`
  const names = p.items.map((i) => `the ${i.label.toLowerCase()}`)
  const itemList = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  // Tap targets: at least 44 real pixels wide and tall, even if they overlap neighbours.
  const hitW = Math.max(slotGap, sv.px(44))
  const hitH = Math.max(boxH + 4, sv.px(44))

  return (
    <TemplateCard label="Centre of mass test ramp">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">
          Place {itemList} so the robot stays on its wheels on every test
          {margin ? `, at least ${margin} cm inside the wheels` : ''}.
        </p>
      </div>

      {/* tests */}
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Tilt tests">
        {tests.map((t, i) => {
          const known = revealed && allPlaced
          const ok = ev.tests[i].ok
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={shownIdx === i}
              disabled={testing}
              onClick={() => {
                playSound('click')
                setView(i)
                if (phase === 'shown') setPhase('idle')
              }}
              className={`${chip} gap-1.5 text-sm ${shownIdx === i ? 'border-[#00E5FF] bg-[#00B8D4]/15 text-[#00E5FF]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'}`}
            >
              {testLabel(t)}
              {known && <span aria-label={ok ? 'passes' : 'fails'}>{ok ? '✓' : '✗'}</span>}
            </button>
          )
        })}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]" onKeyDown={onKey}>
        <svg ref={sv.ref} viewBox={`0 0 ${VW} ${VH}`} className="block h-auto w-full" role="img" aria-label={sceneLabel}>
          <defs>
            <pattern id="com-ground" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={10} stroke="rgba(255,255,255,.08)" strokeWidth={4} />
            </pattern>
          </defs>
          <g transform={`translate(${CX} ${CY}) rotate(${-theta})`}>
            {/* ramp */}
            <rect x={-600} y={0} width={1200} height={400} fill="#111C32" />
            <rect x={-600} y={0} width={1200} height={400} fill="url(#com-ground)" />
            <line x1={-600} y1={0} x2={600} y2={0} stroke="#6E7888" strokeWidth={2} />
            {/* support zone */}
            {showCom && <line x1={X(margin)} y1={1.5} x2={X(L - margin)} y2={1.5} stroke="#22C55E" strokeWidth={4} strokeOpacity={0.7} />}

            <g transform={`rotate(${tipRot} ${pivotX} 0)`}>
              {/* chassis */}
              <rect
                x={Math.min(X(p.deck.fromCm), rear) - 4}
                y={Y(p.chassis.h) - 4}
                width={Math.max(X(p.deck.toCm), front) - Math.min(X(p.deck.fromCm), rear) + 8}
                height={8}
                rx={4}
                fill="#19263F"
                stroke="rgba(255,255,255,.16)"
              />
              {/* shelves */}
              {levels.map((h, li) => (
                <g key={li}>
                  <line x1={X(p.deck.fromCm) - boxW / 2} y1={Y(h)} x2={X(p.deck.toCm) + boxW / 2} y2={Y(h)} stroke="#6E7888" strokeWidth={2} />
                  {li > 0 && [p.deck.fromCm, p.deck.toCm].map((x) => <line key={x} x1={X(x) - boxW / 2} y1={Y(h)} x2={X(x) - boxW / 2} y2={Y(levels[0])} stroke="#6E7888" strokeWidth={1.5} />)}
                </g>
              ))}
              {/* wheels */}
              {[rear, front].map((wx) => (
                <g key={wx}>
                  <circle cx={wx} cy={-rw} r={rw} fill="#0A1120" stroke="#EEF2F8" strokeWidth={2.5} />
                  <circle cx={wx} cy={-rw} r={rw * 0.35} fill="#A7B0C0" />
                </g>
              ))}
              {/* fixed parts */}
              {(p.fixed ?? []).map((f, i) => (
                <g key={`f${i}`}>
                  <line x1={X(Math.max(Math.min(f.x, L), 0))} y1={Y(p.chassis.h)} x2={X(f.x)} y2={Y(f.h)} stroke="#00B8D4" strokeWidth={4} strokeLinecap="round" />
                  <circle cx={X(f.x)} cy={Y(f.h)} r={8 + 6 * Math.sqrt(f.mass / Math.max(maxMass, f.mass))} fill="#00B8D4" fillOpacity={0.85} />
                  <text x={X(f.x)} y={Y(f.h) + 4} textAnchor="middle" fontSize={11}>
                    {f.emoji ?? ''}
                  </text>
                  <text x={X(f.x)} y={Y(f.h) - 16} textAnchor="middle" fontSize={sv.font(10)} fontWeight={700} fill="#A7B0C0">
                    {f.label} {f.mass} kg
                  </text>
                </g>
              ))}
              {/* slots (tap targets) */}
              {phase !== 'testing' &&
                levels.map((h, li) =>
                  Array.from({ length: p.deck.slots }, (_, si) => {
                    const x = X(slotX(p, si))
                    const taken = placed.find((q) => q.slot === si && q.level === li)
                    return (
                      <rect
                        key={`${si}-${li}`}
                        x={x - hitW / 2}
                        y={Y(h) - boxH / 2 - hitH / 2}
                        width={hitW}
                        height={hitH}
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={() => placeAt(si, li)}
                      >
                        <title>{taken ? p.items[taken.item].label : `Slot ${si + 1}, shelf ${li + 1}`}</title>
                      </rect>
                    )
                  }),
                )}
              {phase !== 'testing' &&
                levels.map((h, li) =>
                  Array.from({ length: p.deck.slots }, (_, si) =>
                    placed.some((q) => q.slot === si && q.level === li) ? null : (
                      <rect
                        key={`o${si}-${li}`}
                        x={X(slotX(p, si)) - boxW / 2}
                        y={Y(h) - boxH}
                        width={boxW}
                        height={boxH}
                        rx={4}
                        fill="none"
                        stroke="rgba(255,255,255,.22)"
                        strokeDasharray="3 3"
                        pointerEvents="none"
                      />
                    ),
                  ),
                )}
              {/* placed items */}
              {placed.map((q) => {
                const it = p.items[q.item]
                const size = Math.min(boxH, boxW) * (0.75 + 0.25 * Math.sqrt(it.mass / maxMass))
                const x = X(slotX(p, q.slot))
                const y = Y(levels[q.level])
                const active = q.item === sel
                return (
                  <g key={q.item} onClick={() => placeAt(q.slot, q.level)} className="cursor-pointer">
                    <rect x={x - size / 2} y={y - size} width={size} height={size} rx={4} fill={ITEM_COLOURS[q.item % 4]} stroke={active ? '#FFFFFF' : '#0A1120'} strokeWidth={active ? 2.5 : 1} />
                    <text x={x} y={y - size / 2 + 4} textAnchor="middle" fontSize={Math.max(9, size * 0.5)} pointerEvents="none">
                      {it.emoji ?? ''}
                    </text>
                  </g>
                )
              })}
              {/* centre of mass + line of gravity (effective gravity includes braking) */}
              {showCom && (
                <g pointerEvents="none">
                  <line x1={X(ev.x)} y1={Y(ev.h)} x2={tipX} y2={0} stroke={lineColour} strokeWidth={2} strokeDasharray="5 4" />
                  <circle cx={tipX} cy={0} r={4} fill={lineColour} />
                  <g transform={`translate(${X(ev.x)} ${Y(ev.h)})`}>
                    <circle r={8} fill="#0A1120" stroke="#00E5FF" strokeWidth={2} />
                    <path d="M0,0 L0,-8 A8,8 0 0,1 8,0 Z M0,0 L0,8 A8,8 0 0,1 -8,0 Z" fill="#00E5FF" />
                  </g>
                </g>
              )}
            </g>
          </g>
          {brake > 0 && (testing || phase === 'shown' || live) && (
            <g>
              <text x={12} y={22} fontSize={sv.font(12, 13)} fontWeight={800} fill="#FFA878">
                BRAKING {brake} g →
              </text>
              <text x={12} y={22 + sv.font(16, 18)} fontSize={sv.font(10)} fill="#A7B0C0">
                the robot “feels” gravity tilted forward
              </text>
            </g>
          )}
          {revealed && (
            <text x={VW - 10} y={22} textAnchor="end" fontSize={sv.font(12, 13)} fontWeight={800} fill={lineOk ? '#22C55E' : '#FFA878'}>
              {lineOk ? 'Stays up' : `Tips ${res.tips}!`}
            </text>
          )}
        </svg>
      </div>

      {/* tray + move controls */}
      <div className="mt-3">
        <p className="text-sm font-semibold text-[#A7B0C0]">Parts — tap one, then tap a slot on the robot (or use the arrows)</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Parts to place">
          {p.items.map((it, i) => {
            const isPlaced = placed.some((q) => q.item === i)
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={sel === i}
                onClick={() => {
                  playSound('click')
                  setSel(i)
                }}
                onKeyDown={onKey}
                className={`${chip} gap-2 ${sel === i ? 'border-amber-400 bg-amber-500/15 text-amber-300' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'}`}
              >
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: ITEM_COLOURS[i % 4] }} aria-hidden="true" />
                {it.emoji ? <span aria-hidden="true">{it.emoji}</span> : null}
                {it.label} · {it.mass} kg
                {!isPlaced && <span className="text-xs font-semibold text-[#A7B0C0]">(not placed)</span>}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Move the selected part">
          <button type="button" className={`${btnGhost} min-w-[52px] px-0`} aria-label="Move back" onClick={() => move(-1, 0)} disabled={testing}>
            ◀
          </button>
          <button type="button" className={`${btnGhost} min-w-[52px] px-0`} aria-label="Move forward" onClick={() => move(1, 0)} disabled={testing}>
            ▶
          </button>
          {levels.length > 1 && (
            <>
              <button type="button" className={`${btnGhost} min-w-[52px] px-0`} aria-label="Move down a shelf" onClick={() => move(0, -1)} disabled={testing}>
                ▼
              </button>
              <button type="button" className={`${btnGhost} min-w-[52px] px-0`} aria-label="Move up a shelf" onClick={() => move(0, 1)} disabled={testing}>
                ▲
              </button>
            </>
          )}
        </div>
      </div>

      {showMath && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Readout label="Total mass" value={(Math.round(ev.mass * 10) / 10).toString()} unit="kg" />
            <Readout label="CoM from back" value={showCom ? ev.x.toFixed(1) : '?'} unit="cm" tone="cyan" />
            <Readout label="CoM height" value={showCom ? ev.h.toFixed(1) : '?'} unit="cm" tone="cyan" />
          </div>
          <p className="mt-2 rounded-2xl bg-[#111C32] px-3 py-2 font-mono text-sm leading-relaxed text-[#A7B0C0]">
            tip point = x̄ − h̄·tan θ{brake ? ' + h̄·a/cos θ' : ''}
            {showCom ? ` = ${ev.x.toFixed(1)} − ${ev.h.toFixed(1)}·tan(${test.slopeDeg}°)${brake ? ` + ${ev.h.toFixed(1)}·${brake}/cos(${test.slopeDeg}°)` : ''} = ${res.tipPoint.toFixed(1)} cm` : ''}
            <br />
            stable if {margin} ≤ tip point ≤ {L - margin} cm
          </p>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={runTests} disabled={!allPlaced || testing || !!att.result || att.done}>
          {allPlaced ? 'Run the tilt tests' : `Place ${p.items.length - placed.length} more`}
        </button>
      </div>
      <FeedbackPanel att={att} onRetry={() => setPhase('idle')} />
    </TemplateCard>
  )
}
