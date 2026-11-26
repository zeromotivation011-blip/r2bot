'use client'

// logic-gates — build the robot's decision circuit. Flip the input switches to
// test it live (wires glow when they carry a 1), compare with the truth table,
// then check every combination.

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { Btn, FeedbackCard, Panel, useAttempts, useReducedMotion } from '../sequence-path/KitClient'
import {
  type Answer,
  type GateType,
  type InputKind,
  type OutputKind,
  type Params,
  type PlacedGate,
  evalExpr,
  fitsSlot,
  gateRule,
  layoutCols,
  onOff,
  paletteOf,
  parseTarget,
  resolve,
  rows as tableRows,
  simulate,
  sourcesFor,
} from './logic'

const CW = 150 // column width (svg units)
const RH = 92 // row height
const GW = 64 // gate body width
const GH = 46 // gate body height
const SVG_MIN_SCALE = 0.85 // smallest on-screen scale of the circuit drawing

const INPUT_ICON: Record<InputKind, string> = { switch: '🔘', button: '🟠', bumper: '🛡️', light: '💡', sensor: '📡', battery: '🔋' }
const OUTPUT_ICON: Record<OutputKind, string> = { motor: '⚙️', led: '💡', buzzer: '🔔', door: '🚪', pump: '💧' }

export default function LogicGatesClient({ params, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const reduced = useReducedMotion()
  const notation = params.notation ?? 'words'
  const palette = paletteOf(params)
  const choose = params.wiring === 'choose'
  const [placed, setPlaced] = useState<Record<string, PlacedGate>>(() =>
    Object.fromEntries(params.gates.filter((g) => !g.fixed).map((g) => [g.id, { type: null, inputs: choose ? [...g.inputs] : undefined }])),
  )
  const [env, setEnv] = useState<Record<string, boolean>>(() => Object.fromEntries(params.inputs.map((i) => [i.id, false])))
  const [sel, setSel] = useState<string | null>(params.gates.find((g) => !g.fixed)?.id ?? null)

  const answer: Answer = useMemo(() => ({ gates: placed }), [placed])
  const getAnswer = useCallback(() => answer, [answer])
  const state = useAttempts<Params, Answer>({ onSubmit, onDone }, getAnswer)
  const locked = !!state.result?.correct || state.done

  const circuit = useMemo(() => resolve(params, answer), [params, answer])
  const sig = useMemo(() => simulate(params, circuit, env), [params, circuit, env])
  const targets = useMemo(() => params.outputs.map((o) => parseTarget(o.target)), [params.outputs])
  const allRows = useMemo(() => tableRows(params), [params])
  const showTarget = params.showTable === undefined || params.showTable === true || (params.showTable === 'after-check' && state.attempts > 0)

  const touch = () => { if (state.result && !state.result.correct) state.retry() }
  const flip = (id: string) => {
    primeAudio()
    playSound('click')
    setEnv((e) => ({ ...e, [id]: !e[id] }))
  }
  const setRow = (row: Record<string, boolean>) => { playSound('click'); setEnv(row) }
  const placeGate = (gid: string, t: GateType) => {
    if (locked) return
    primeAudio()
    playSound('click')
    setPlaced((p) => ({ ...p, [gid]: { ...p[gid], type: t } }))
    touch()
  }
  const wire = (gid: string, pin: number, src: string) => {
    playSound('click')
    setPlaced((p) => {
      const cur = p[gid]?.inputs ?? params.gates.find((g) => g.id === gid)?.inputs ?? []
      const next = [...cur]
      next[pin] = src
      return { ...p, [gid]: { ...p[gid], inputs: next } }
    })
    touch()
  }

  // ── Layout ──
  const cols = layoutCols(params)
  const maxCol = Math.max(1, ...params.gates.map((g) => cols[g.id]))
  const byCol: Record<number, string[]> = {}
  params.gates.forEach((g) => { (byCol[cols[g.id]] ??= []).push(g.id) })
  const tallest = Math.max(params.inputs.length, params.outputs.length, ...Object.values(byCol).map((l) => l.length))
  const H = tallest * RH
  const pos: Record<string, { x: number; y: number }> = {}
  const place = (ids: string[], x: number) => ids.forEach((id, k) => { pos[id] = { x, y: (H / ids.length) * (k + 0.5) } })
  place(params.inputs.map((i) => i.id), 0)
  Object.entries(byCol).forEach(([c, ids]) => place(ids, Number(c) * CW))
  const outX = (maxCol + 1) * CW
  const outPos = (k: number) => ({ x: outX, y: (H / params.outputs.length) * (k + 0.5) })
  const W = outX + 110
  const rightPort = (id: string) => {
    const p = pos[id]
    if (!p) return { x: 0, y: 0 }
    const isInput = params.inputs.some((i) => i.id === id)
    if (isInput) return { x: p.x + 92, y: p.y }
    const g = circuit.find((c) => c.id === id)
    const bubble = g?.type === 'NOT' || g?.type === 'NAND' || g?.type === 'NOR'
    return { x: p.x + GW + (bubble ? 10 : 0), y: p.y }
  }
  const pinPos = (gid: string, pin: number, arity: number) => {
    const p = pos[gid]
    return { x: p.x - 2, y: arity === 1 ? p.y : p.y + (pin === 0 ? -12 : 12) }
  }
  const wirePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const mx = Math.max(24, (b.x - a.x) / 2)
    return `M${a.x} ${a.y} C${a.x + mx} ${a.y} ${b.x - mx} ${b.y} ${b.x} ${b.y}`
  }
  const wireCls = (v: boolean | null | undefined) =>
    v === true ? 'stroke-[#00E5FF]' : v === false ? 'stroke-[#3A4A66]' : 'stroke-[#3A4A66] [stroke-dasharray:6_6]'

  const selGate = params.gates.find((g) => g.id === sel)
  const selIdx = params.gates.findIndex((g) => g.id === sel)
  const sigLabel = (id: string) => params.inputs.find((i) => i.id === id)?.label ?? `Gate ${params.gates.findIndex((g) => g.id === id) + 1}`

  return (
    <div className="flex flex-col gap-3">
      {params.story && (
        <Panel>
          <p className="text-[17px] leading-relaxed text-[#EEF2F8]">{params.story}</p>
        </Panel>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <Panel title="The circuit">
          <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Inputs — tap to switch">
            {params.inputs.map((i) => (
              <button
                key={i.id}
                type="button"
                role="switch"
                aria-checked={env[i.id]}
                onClick={() => flip(i.id)}
                className={`flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 text-left font-display text-[15px] font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${env[i.id] ? 'border-[#00E5FF] bg-[#00B8D4]/20 text-[#EEF2F8]' : 'border-white/15 bg-[#19263F] text-[#A7B0C0]'}`}
              >
                <span aria-hidden className={`relative inline-block h-6 w-11 rounded-full transition-colors ${env[i.id] ? 'bg-[#00B8D4]' : 'bg-[#0A1120]'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] duration-150 ${env[i.id] ? 'left-[22px]' : 'left-0.5'}`} />
                </span>
                <span>{i.id}: {i.label}</span>
                <span className={`ml-1 rounded-md px-1.5 text-[13px] ${env[i.id] ? 'bg-[#00E5FF] text-[#04151A]' : 'bg-[#0A1120] text-[#6E7888]'}`}>{onOff(env[i.id], notation)}</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto overscroll-x-contain rounded-xl bg-[#060B16]">
            {/* Never drawn below 0.85 scale, so the smallest caption (15 units) stays ≥12px; wide circuits scroll on phones. */}
            <svg viewBox={`-10 -6 ${W + 20} ${H + 12}`} className="block h-auto w-full" style={{ minWidth: Math.round((W + 20) * SVG_MIN_SCALE) }} role="img" aria-label={describe()}>
              <defs>
                <filter id="lg-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* wires into gates */}
              {params.gates.map((g) => {
                const r = circuit.find((c) => c.id === g.id)
                const ins = r?.inputs ?? g.inputs
                return ins.map((s, pin) => (
                  <path key={`${g.id}-${pin}`} d={wirePath(rightPort(s), pinPos(g.id, pin, g.inputs.length))} fill="none" strokeWidth={4} strokeLinecap="round" className={`${wireCls(sig[s])} transition-[stroke] duration-200`} filter={sig[s] && !reduced ? 'url(#lg-glow)' : undefined} />
                ))
              })}
              {/* wires into outputs */}
              {params.outputs.map((o, k) => (
                <path key={o.id} d={wirePath(rightPort(o.from), { x: outPos(k).x - 4, y: outPos(k).y })} fill="none" strokeWidth={4} strokeLinecap="round" className={`${wireCls(sig[o.from])} transition-[stroke] duration-200`} filter={sig[o.from] && !reduced ? 'url(#lg-glow)' : undefined} />
              ))}
              {/* inputs */}
              {params.inputs.map((i) => {
                const p = pos[i.id]
                return (
                  <g key={i.id} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer" onClick={() => flip(i.id)}>
                    <rect x={0} y={-24} width={92} height={48} rx={12} className={env[i.id] ? 'fill-[#0E3245] stroke-[#00E5FF]' : 'fill-[#19263F] stroke-white/20'} strokeWidth={2} />
                    <text x={14} y={7} className="fill-[#EEF2F8] font-display text-[22px] font-bold">{i.id}</text>
                    <text x={40} y={6} className="text-[18px]">{INPUT_ICON[i.kind ?? 'switch']}</text>
                    <circle cx={92} cy={0} r={5} className={env[i.id] ? 'fill-[#00E5FF]' : 'fill-[#3A4A66]'} />
                  </g>
                )
              })}
              {/* gates */}
              {params.gates.map((g, gi) => {
                const r = circuit[gi]
                const p = pos[g.id]
                const on = sig[g.id]
                const isSel = sel === g.id
                return (
                  <g
                    key={g.id}
                    transform={`translate(${p.x} ${p.y - GH / 2})`}
                    className={g.fixed ? '' : 'cursor-pointer'}
                    onClick={() => { if (!g.fixed && !locked) { playSound('click'); setSel(g.id) } }}
                  >
                    {isSel && !g.fixed && <rect x={-10} y={-10} width={GW + 26} height={GH + 20} rx={12} className="fill-amber-500/10 stroke-amber-400" strokeWidth={2} strokeDasharray="5 4" />}
                    <GateShape type={r.type} on={on} fixed={!!g.fixed} />
                    <text x={GW / 2 - (r.type === 'NOT' ? 8 : 2)} y={GH / 2 + 5} textAnchor="middle" className={`pointer-events-none font-display text-[17px] font-bold ${r.type ? (on ? 'fill-[#04151A]' : 'fill-[#EEF2F8]') : 'fill-amber-300'}`}>
                      {r.type ?? '?'}
                    </text>
                    <text x={GW / 2} y={GH + 20} textAnchor="middle" className="pointer-events-none fill-[#8D97A8] text-[15px] font-semibold">Gate {gi + 1}{g.fixed ? ' 🔒' : ''}</text>
                  </g>
                )
              })}
              {/* outputs */}
              {params.outputs.map((o, k) => {
                const p = outPos(k)
                const on = sig[o.from]
                return (
                  <g key={o.id} transform={`translate(${p.x} ${p.y})`}>
                    <circle cx={26} cy={0} r={24} className={on ? 'fill-amber-500 stroke-amber-300' : 'fill-[#19263F] stroke-white/20'} strokeWidth={2} filter={on && !reduced ? 'url(#lg-glow)' : undefined} />
                    <text x={26} y={8} textAnchor="middle" className={`text-[22px] ${on && !reduced && (o.kind ?? 'led') === 'motor' ? 'motion-safe:animate-spin [transform-box:fill-box] [transform-origin:center]' : ''}`}>{OUTPUT_ICON[o.kind ?? 'led']}</text>
                    <text x={26} y={42} textAnchor="middle" className="fill-[#A7B0C0] text-[15px] font-semibold">{o.label.length > 16 ? o.label.slice(0, 15) + '…' : o.label}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          {(W + 20) * SVG_MIN_SCALE > 340 && (
            <p className="mt-1 text-[13px] text-[#8D97A8] sm:hidden" aria-hidden>Swipe the circuit sideways to see all of it →</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-semibold text-[#A7B0C0]" aria-live="polite">
            {params.outputs.map((o) => (
              <span key={o.id}>
                {OUTPUT_ICON[o.kind ?? 'led']} {o.label}: <span className={sig[o.from] ? 'text-amber-300' : 'text-[#EEF2F8]'}>{onOff(sig[o.from] ?? null, notation)}</span>
              </span>
            ))}
          </div>

          {/* Gate picker */}
          {!locked && (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#0A1120]/60 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Gate slots">
                {params.gates.map((g, gi) => !g.fixed && (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={sel === g.id}
                    onClick={() => { playSound('click'); setSel(g.id) }}
                    className={`min-h-11 rounded-xl px-3 font-display text-[14px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${sel === g.id ? 'bg-amber-500 text-[#1A1103]' : 'bg-[#19263F] text-[#A7B0C0]'}`}
                  >
                    Gate {gi + 1}: {placed[g.id]?.type ?? '—'}
                  </button>
                ))}
              </div>
              {selGate && !selGate.fixed && (
                <>
                  <p className="mb-2 text-[14px] text-[#A7B0C0]">Choose a gate for Gate {selIdx + 1} ({selGate.inputs.length === 1 ? 'one input' : 'two inputs'}):</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Gate type for gate ${selIdx + 1}`}>
                    {palette.filter((t) => fitsSlot(t, selGate.inputs.length)).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={placed[selGate.id]?.type === t}
                        onClick={() => placeGate(selGate.id, t)}
                        title={gateRule(t)}
                        className={`flex min-h-12 min-w-[76px] flex-col items-center justify-center rounded-xl border-2 px-2 py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${placed[selGate.id]?.type === t ? 'border-amber-400 bg-amber-500/15' : 'border-white/10 bg-[#19263F]'}`}
                      >
                        <svg viewBox="-4 -4 84 56" className="h-7 w-12" aria-hidden><GateShape type={t} on={false} fixed={false} mini /></svg>
                        <span className="font-display text-[13px] font-bold text-[#EEF2F8]">{t}</span>
                      </button>
                    ))}
                  </div>
                  {placed[selGate.id]?.type && <p className="mt-2 text-[14px] text-[#A7B0C0]">{gateRule(placed[selGate.id].type as GateType)}.</p>}
                  {choose && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {selGate.inputs.map((_, pin) => (
                        <label key={pin} className="flex items-center gap-2 text-[14px] font-semibold text-[#A7B0C0]">
                          {selGate.inputs.length === 1 ? 'Input' : `Input ${pin + 1}`}
                          <select
                            value={placed[selGate.id]?.inputs?.[pin] ?? selGate.inputs[pin]}
                            onChange={(e) => wire(selGate.id, pin, e.target.value)}
                            className="min-h-11 rounded-xl border border-white/15 bg-[#19263F] px-2 font-display text-[15px] text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                          >
                            {sourcesFor(params, selIdx).map((s) => (
                              <option key={s} value={s}>{sigLabel(s)}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title={showTarget ? 'Truth table — tap a row to test it' : 'Test table — tap a row to test it'}>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-1 text-center font-display text-[15px]">
                <thead>
                  <tr className="text-[13px] text-[#A7B0C0]">
                    {params.inputs.map((i) => <th key={i.id} className="px-1 font-bold">{i.id}</th>)}
                    {params.outputs.map((o) => (
                      <Th key={o.id}>{params.outputs.length > 1 ? o.label : 'Output'}</Th>
                    ))}
                  </tr>
                  <tr className="text-[11px] text-[#6E7888]">
                    {params.inputs.map((i) => <th key={i.id} />)}
                    {params.outputs.map((o) => (
                      <th key={o.id} className="px-1 font-semibold">{showTarget ? 'need · yours' : 'yours'}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((row, r) => {
                    const s = simulate(params, circuit, row)
                    const current = params.inputs.every((i) => env[i.id] === row[i.id])
                    return (
                      <tr key={r} onClick={() => setRow(row)} className={`cursor-pointer ${current ? 'outline outline-2 outline-amber-400' : ''}`}>
                        {params.inputs.map((i, ii) => (
                          <td key={i.id} className={`rounded-md p-0 ${row[i.id] ? 'bg-[#00B8D4]/20 text-[#00E5FF]' : 'bg-[#0A1120] text-[#6E7888]'}`}>
                            {/* The whole row is the 44px tap target (tr onClick); one button per row carries keyboard focus. */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRow(row) }}
                              tabIndex={ii === 0 ? 0 : -1}
                              aria-hidden={ii === 0 ? undefined : true}
                              className="min-h-11 w-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                              aria-label={ii === 0 ? `Test row ${r + 1}: ${params.inputs.map((x) => `${x.id} ${onOff(row[x.id], notation)}`).join(', ')}` : undefined}
                            >
                              {onOff(row[i.id], notation)}
                            </button>
                          </td>
                        ))}
                        {params.outputs.map((o, k) => {
                          const want = evalExpr(targets[k], row)
                          const got = s[o.from] ?? null
                          return (
                            <td key={o.id} className="h-11 rounded-md bg-[#0A1120] px-1 py-1">
                              {showTarget && <span className="text-[#EEF2F8]">{onOff(want, notation)}</span>}
                              {showTarget && <span className="text-[#6E7888]"> · </span>}
                              <span className={got === null ? 'text-[#6E7888]' : !showTarget ? 'text-[#EEF2F8]' : got === want ? 'text-[#4ADE80]' : 'text-red-400'}>
                                {onOff(got, notation)}
                                {showTarget && got !== null && (got === want ? ' ✓' : ' ✗')}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          {!state.result && !locked && (
            <Btn tone="primary" onClick={() => state.submit()} disabled={circuit.some((g) => !g.type)}>
              Test every combination
            </Btn>
          )}
          <FeedbackCard state={state} />
        </div>
      </div>
    </div>
  )

  function describe(): string {
    const gates = circuit.map((g, k) => `Gate ${k + 1} is ${g.type ?? 'empty'} reading ${g.inputs.map(sigLabel).join(' and ')}`).join('. ')
    const outs = params.outputs.map((o) => `${o.label} is ${onOff(sig[o.from] ?? null, notation)}`).join(', ')
    return `Circuit. ${gates}. Right now ${outs}.`
  }
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-1 font-bold">{children}</th>
}

/** Standard (ANSI) gate symbols, drawn in a 64×46 box. */
export function GateShape({ type, on, fixed, mini }: { type: GateType | null; on: boolean | null; fixed: boolean; mini?: boolean }) {
  const fill = mini ? 'fill-[#0E3245] stroke-[#00E5FF]' : on ? 'fill-[#00E5FF] stroke-[#E0FCFF]' : fixed ? 'fill-[#223152] stroke-white/40' : 'fill-[#19263F] stroke-amber-300'
  const bubble = (x: number) => <circle cx={x} cy={GH / 2} r={5} className={fill} strokeWidth={2.5} />
  const and = `M0 0 H${GW / 2} A${GH / 2} ${GH / 2} 0 0 1 ${GW / 2} ${GH} H0 Z`
  const or = `M0 0 Q${GW * 0.28} ${GH / 2} 0 ${GH} Q${GW * 0.65} ${GH} ${GW} ${GH / 2} Q${GW * 0.65} 0 0 0 Z`
  switch (type) {
    case null:
      return <rect x={0} y={0} width={GW} height={GH} rx={10} className="fill-[#0A1120] stroke-amber-400" strokeWidth={2.5} strokeDasharray="6 5" />
    case 'AND':
      return <path d={and} className={fill} strokeWidth={2.5} />
    case 'NAND':
      return <><path d={and} className={fill} strokeWidth={2.5} />{bubble(GW + 5)}</>
    case 'OR':
      return <path d={or} className={fill} strokeWidth={2.5} />
    case 'NOR':
      return <><path d={or} className={fill} strokeWidth={2.5} />{bubble(GW + 5)}</>
    case 'XOR':
      return <><path d={`M-8 0 Q${GW * 0.28 - 8} ${GH / 2} -8 ${GH}`} className={`fill-none ${fill.split(' ').filter((c) => c.startsWith('stroke')).join(' ')}`} strokeWidth={2.5} /><path d={or} className={fill} strokeWidth={2.5} /></>
    case 'NOT':
      return <><path d={`M0 2 L${GW - 6} ${GH / 2} L0 ${GH - 2} Z`} className={fill} strokeWidth={2.5} />{bubble(GW - 1)}</>
  }
}
