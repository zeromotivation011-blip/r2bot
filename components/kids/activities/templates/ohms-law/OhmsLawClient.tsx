'use client'

// components/kids/activities/templates/ohms-law/OhmsLawClient.tsx
// A live circuit loop: battery → resistor (with its real colour bands) → LED
// → ammeter. Pick a battery/resistor and watch electrons speed up or slow
// down, the LED brighten, pop, or stay dark — or predict the reading first.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { LED_HEX, choicesOf, fmtOhms, isChoice, solve, truthFor, type Answer, type Params } from './logic'
import { FeedbackPanel, Readout, TemplateCard, btnGhost, btnPrimary, chip, useAnimationFrame, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const BAND_HEX = ['#111111', '#7B3F00', '#E02424', '#F97316', '#FACC15', '#16A34A', '#2563EB', '#8B5CF6', '#9CA3AF', '#F9FAFB']
const BAND_NAME = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white']
const GOLD = '#D4AF37'

/** 4-band colour code: two digits, a multiplier, gold tolerance. */
function bandsFor(ohms: number): { hex: string; name: string }[] {
  let exp = Math.floor(Math.log10(ohms)) - 1
  let digits = Math.round(ohms / Math.pow(10, exp))
  if (digits >= 100) {
    digits = Math.round(digits / 10)
    exp += 1
  }
  const d1 = Math.floor(digits / 10)
  const d2 = digits % 10
  const mult = exp < 0 ? { hex: GOLD, name: 'gold (×0.1)' } : { hex: BAND_HEX[exp], name: `${BAND_NAME[exp]} (×${Math.pow(10, exp)})` }
  return [
    { hex: BAND_HEX[d1], name: BAND_NAME[d1] },
    { hex: BAND_HEX[d2], name: BAND_NAME[d2] },
    mult,
    { hex: GOLD, name: 'gold (±5 %)' },
  ]
}

const f2 = (n: number) => +n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)

// The loop path, clockwise from the battery's + terminal.
const PATH = [
  [60, 80],
  [60, 40],
  [340, 40],
  [340, 180],
  [60, 180],
  [60, 140],
] as const
const SEGS = PATH.slice(1).map((pt, i) => {
  const a = PATH[i]
  return { a, b: pt, len: Math.hypot(pt[0] - a[0], pt[1] - a[1]) }
})
const TOTAL = SEGS.reduce((t, s) => t + s.len, 0)
function along(d: number): [number, number] {
  let x = ((d % TOTAL) + TOTAL) % TOTAL
  for (const s of SEGS) {
    if (x <= s.len) return [s.a[0] + ((s.b[0] - s.a[0]) * x) / s.len, s.a[1] + ((s.b[1] - s.a[1]) * x) / s.len]
    x -= s.len
  }
  return [PATH[0][0], PATH[0][1]]
}

export default function OhmsLawClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const young = band === 'explorers' || band === 'builders'
  const showFormula = p.showFormula ?? !young
  const liveMeter = p.liveMeter ?? young
  const showBands = p.showBands ?? true
  const vs = useMemo(() => choicesOf(p.battery), [p.battery])
  const rs = useMemo(() => choicesOf(p.resistor), [p.resistor])
  const [vi, setVi] = useState(0)
  const [ri, setRi] = useState(() => (rs.length > 6 ? Math.floor(rs.length / 2) : 0))
  const [typed, setTyped] = useState('')
  const [tested, setTested] = useState(false)
  const [phase, setPhase] = useState(0)
  const phaseRef = useRef(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const solved = !!att.result?.correct

  const volts = vs[vi]
  const ohms = rs[ri]
  const res = solve(p, volts, ohms)
  const predict = p.mode === 'predict'
  const q = p.ask?.quantity ?? 'I'
  const reveal = predict ? solved || att.attempts >= 3 : liveMeter || tested
  const flowing = reveal && res.currentMa > 0.05

  // Electron speed: proportional to current (clamped so it stays readable).
  const speed = Math.min(220, 12 + res.currentMa * 4)
  useAnimationFrame(flowing && !reduced, (dt) => {
    phaseRef.current = (phaseRef.current + dt * speed) % TOTAL
    setPhase(phaseRef.current)
  })

  const change = (fn: () => void) => {
    if (solved) return
    if (att.result) att.clear()
    setTested(false)
    playSound('click')
    fn()
  }

  const submit = () => {
    if (predict) {
      const v = Number(typed.replace(',', '.'))
      att.submit({ value: Number.isFinite(v) && typed.trim() !== '' ? v : NaN })
      return
    }
    setTested(true)
    att.submit({ ...(isChoice(p.battery) ? { volts } : {}), ...(isChoice(p.resistor) ? { ohms } : {}) })
  }

  const ledColour = p.led ? LED_HEX[p.led.colour] : '#fff'
  const glow = reveal && p.led && !res.ledBurnt ? Math.min(1, res.currentMa / 20) : 0
  const bands = bandsFor(ohms)
  const needle = Math.min(1, res.currentMa / 40)
  const needleAng = -150 + needle * 120 // degrees, -150..-30
  const hideRes = predict && q === 'R' && !reveal
  const hideV = predict && q === 'V' && !reveal
  const unitQ = q === 'I' ? 'mA' : q === 'V' ? 'V' : 'Ω'

  const electrons = Array.from({ length: 14 }, (_, i) => along(phase + (i * TOTAL) / 14))

  return (
    <TemplateCard label="Ohm's law circuit">
      <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg viewBox="0 0 400 220" className="block h-auto w-full" role="img" aria-label={`Circuit: ${hideV ? '?' : volts} volt battery, ${hideRes ? '?' : fmtOhms(ohms)} resistor${p.led ? `, ${p.led.colour} LED` : ''}.${reveal ? ` Current ${f2(res.currentMa)} milliamps.` : ''}`}>
          {/* wires */}
          <polyline points={PATH.map((pt) => pt.join(',')).join(' ')} fill="none" stroke="#6E7888" strokeWidth={4} strokeLinejoin="round" />
          {/* electrons */}
          {flowing && electrons.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#00E5FF" opacity={0.9} />)}

          {/* battery */}
          <g>
            <rect x={36} y={78} width={48} height={64} rx={8} fill="#19263F" stroke="#A7B0C0" strokeWidth={1.5} />
            <rect x={52} y={72} width={16} height={7} rx={2} fill="#A7B0C0" />
            <text x={60} y={104} textAnchor="middle" fontSize={15} fontWeight={800} fill="#FFA878" className="font-display">
              {hideV ? '?' : volts}
            </text>
            <text x={60} y={120} textAnchor="middle" fontSize={11} fontWeight={700} fill="#A7B0C0">
              volts
            </text>
            <text x={60} y={136} textAnchor="middle" fontSize={12} fontWeight={800} fill="#A7B0C0">
              + −
            </text>
          </g>

          {/* resistor */}
          <g>
            <rect x={150} y={29} width={100} height={22} rx={11} fill={res.resistorHot && reveal ? '#B45309' : '#D9C3A0'} />
            {showBands && !hideRes && bands.map((b, i) => <rect key={i} x={166 + i * 18 + (i === 3 ? 10 : 0)} y={29} width={8} height={22} fill={b.hex} />)}
            <text x={200} y={70} textAnchor="middle" fontSize={13} fontWeight={800} fill="#EEF2F8" className="font-display">
              {hideRes ? '? Ω' : fmtOhms(ohms)}
            </text>
          </g>

          {/* LED */}
          {p.led && (
            <g>
              {glow > 0 && <circle cx={340} cy={98} r={14 + glow * 26} fill={ledColour} opacity={0.12 + glow * 0.3} />}
              <path d="M326 86 L354 86 L340 108 Z" fill={res.ledBurnt && reveal ? '#3F3F46' : glow > 0 ? ledColour : '#2A3650'} stroke={ledColour} strokeWidth={1.5} />
              <line x1={326} y1={110} x2={354} y2={110} stroke={ledColour} strokeWidth={3} />
              <text x={318} y={140} textAnchor="end" fontSize={11} fontWeight={700} fill="#A7B0C0">
                {p.led.colour} LED
              </text>
              {res.ledBurnt && reveal && (
                <text x={360} y={80} fontSize={18}>
                  💥
                </text>
              )}
            </g>
          )}
          {!p.led && (
            <text x={318} y={114} textAnchor="end" fontSize={11} fontWeight={700} fill="#A7B0C0">
              wire
            </text>
          )}

          {/* ammeter */}
          <g transform="translate(200 180)">
            <circle r={26} fill="#111C32" stroke="#00B8D4" strokeWidth={2} />
            <path d="M -20 -6 A 21 21 0 0 1 20 -6" fill="none" stroke="#19263F" strokeWidth={3} />
            <line
              x1={0}
              y1={0}
              x2={18 * Math.cos((needleAng * Math.PI) / 180)}
              y2={18 * Math.sin((needleAng * Math.PI) / 180)}
              stroke="#FC6818"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={reveal ? 1 : 0.25}
              style={{ transition: reduced ? undefined : 'all 400ms cubic-bezier(.22,.61,.36,1)' }}
            />
            <circle r={3} fill="#FC6818" />
            <text y={16} textAnchor="middle" fontSize={10} fontWeight={800} fill="#00E5FF" className="font-display">
              {reveal ? `${f2(res.currentMa)} mA` : '? mA'}
            </text>
          </g>
        </svg>
      </div>

      {showBands && showFormula && !hideRes && (
        <p className="mt-2 text-sm text-[#A7B0C0]">
          Bands: {bands.map((b) => b.name).join(' · ')}
        </p>
      )}

      {/* controls */}
      {!predict && (
        <div className="mt-3 space-y-3">
          {vs.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-[#A7B0C0]">Battery</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {vs.map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={vi === i}
                    disabled={solved}
                    onClick={() => change(() => setVi(i))}
                    className={`${chip} ${vi === i ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'}`}
                  >
                    {v} V
                  </button>
                ))}
              </div>
            </div>
          )}
          {rs.length > 1 && rs.length <= 6 && (
            <div>
              <p className="text-sm font-semibold text-[#A7B0C0]">Resistor</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {rs.map((r, i) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={ri === i}
                    disabled={solved}
                    onClick={() => change(() => setRi(i))}
                    className={`${chip} gap-2 ${ri === i ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'}`}
                  >
                    {showBands && (
                      <span className="flex h-4 items-center rounded-full bg-[#D9C3A0] px-1" aria-hidden>
                        {bandsFor(r)
                          .slice(0, 3)
                          .map((b, j) => (
                            <span key={j} className="mx-px inline-block h-4 w-1.5" style={{ background: b.hex }} />
                          ))}
                      </span>
                    )}
                    {fmtOhms(r)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {rs.length > 6 && (
            <div>
              <p className="text-sm font-semibold text-[#A7B0C0]">
                Resistor (standard E12 values): <span className="font-display text-amber-300">{fmtOhms(ohms)}</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" aria-label="Smaller resistor" className={`${btnGhost} w-12 px-0`} disabled={solved || ri === 0} onClick={() => change(() => setRi((i) => Math.max(0, i - 1)))}>
                  −
                </button>
                <input
                  type="range"
                  min={0}
                  max={rs.length - 1}
                  step={1}
                  value={ri}
                  disabled={solved}
                  aria-label="Resistor value"
                  aria-valuetext={fmtOhms(ohms)}
                  onChange={(e) => change(() => setRi(Number(e.target.value)))}
                  className="h-11 w-full cursor-pointer rounded-xl accent-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                />
                <button
                  type="button"
                  aria-label="Bigger resistor"
                  className={`${btnGhost} w-12 px-0`}
                  disabled={solved || ri === rs.length - 1}
                  onClick={() => change(() => setRi((i) => Math.min(rs.length - 1, i + 1)))}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {predict && (
        <div className="mt-3">
          <label className="block">
            <span className="text-sm font-semibold text-[#A7B0C0]">
              Your prediction for {q === 'I' ? 'the current' : q === 'V' ? 'the battery voltage' : 'the resistor'} ({unitQ})
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={typed}
                disabled={solved}
                onChange={(e) => {
                  if (att.result) att.clear()
                  setTyped(e.target.value.replace(/[^0-9.,]/g, ''))
                }}
                onKeyDown={(e) => e.key === 'Enter' && typed && submit()}
                className="min-h-[48px] w-40 rounded-2xl border border-white/15 bg-[#111C32] px-4 font-display text-xl font-bold text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              />
              <span className="font-display text-lg font-bold text-[#A7B0C0]">{unitQ}</span>
            </div>
          </label>
          {predict && q === 'I' && <p className="mt-1 text-sm text-[#A7B0C0]">Known: {volts} V battery, {fmtOhms(ohms)}{p.led ? `, LED forward voltage ≈ ${res.vf} V` : ''}.</p>}
        </div>
      )}

      {(reveal || showFormula) && !predict && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Current" value={reveal ? `${f2(res.currentMa)}` : '?'} unit="mA" tone="cyan" />
          {p.led && <Readout label="LED keeps" value={`${res.vf}`} unit="V" />}
          <Readout label="Resistor gets" value={`${f2(Math.max(0, volts - res.vf))}`} unit="V" />
          {p.target?.resistorRatingW !== undefined && (
            <Readout label="Resistor heat" value={reveal ? `${f2(res.resistorW)}` : '?'} unit={`W (max ${p.target.resistorRatingW})`} tone={reveal && res.resistorHot ? 'bad' : 'plain'} />
          )}
        </div>
      )}
      {showFormula && !predict && (
        <p className="mt-2 font-mono text-[15px] text-[#EEF2F8]">
          I = {p.led ? `(${volts} V − ${res.vf} V)` : `${volts} V`} ÷ {fmtOhms(ohms)} = {reveal ? `${f2(res.currentMa)} mA` : '?'}
        </p>
      )}
      {p.target?.currentMa && !predict && (
        <p className="mt-2 text-[15px] text-[#A7B0C0]">
          Goal: {p.target.currentMa.min ?? 0}–{p.target.currentMa.max ?? '∞'} mA{p.led ? ` (LED limit ≈ ${p.led.maxMa ?? 30} mA)` : ''}.
        </p>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={submit} disabled={predict && typed.trim() === ''}>
            {predict ? 'Measure it' : liveMeter ? 'This one!' : 'Test it'}
          </button>
        </div>
      )}
      {predict && reveal && (
        <p className="mt-2 text-sm text-[#A7B0C0]">
          Meter shows {f2(q === 'I' ? res.currentMa : truthFor(p))} {unitQ}.
        </p>
      )}
      <FeedbackPanel att={att} onRetry={() => setTested(false)} />
    </TemplateCard>
  )
}
