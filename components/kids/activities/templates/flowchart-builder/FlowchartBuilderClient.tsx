'use client'

// flowchart-builder — fill the empty boxes of a robot's flowchart with action
// and question cards, then run it on every test situation and watch a token
// follow the arrows.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { Btn, FeedbackCard, Panel, useAttempts, useReducedMotion } from '../sequence-path/KitClient'
import { type Answer, type Card, type FlowNode, type Params, type RunResult, type Value, fmtVal, runCase, slotIds, trayOf } from './logic'

const CW = 180 // column width
const RH = 100 // row height
const NW = 156 // node width
const NH = 58 // node height
const LANE = 14 // gap between loop-back lanes
const SVG_MIN_SCALE = 0.86 // never draw below this, so 14-unit labels stay ≥12px; wide charts scroll on phones

interface Pt { x: number; y: number }

export default function FlowchartBuilderClient({ params, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const reduced = useReducedMotion()
  const slots = useMemo(() => slotIds(params), [params])
  const tray = useMemo(() => trayOf(params), [params])
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [swapped, setSwapped] = useState<string[]>([])
  const [sel, setSel] = useState<string | null>(slots[0] ?? null)
  const [caseIdx, setCaseIdx] = useState(0)
  const [run, setRun] = useState<{ r: RunResult; i: number; caseIdx: number } | null>(null)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const answer: Answer = useMemo(() => ({ slots: filled, swapped: params.allowSwap ? swapped : undefined }), [filled, swapped, params.allowSwap])
  const getAnswer = useCallback(() => answer, [answer])
  const state = useAttempts<Params, Answer>({ onSubmit, onDone }, getAnswer)
  const locked = running || !!state.result?.correct || state.done

  const byId = useMemo(() => new Map(params.nodes.map((n) => [n.id, n])), [params.nodes])
  const cardOf = (n: FlowNode): Card | undefined => params.cards.find((c) => c.id === (n.card ?? filled[n.id]))
  const label = (k: string) => params.varLabels?.[k] ?? k

  const edit = () => {
    setRun(null)
    if (state.result && !state.result.correct) state.retry()
  }
  const place = (cardId: string) => {
    if (locked || !sel) return
    const node = byId.get(sel)
    const card = params.cards.find((c) => c.id === cardId)
    if (!node || !card) return
    primeAudio()
    if (card.kind !== node.kind) { playSound('wrong'); return }
    playSound('click')
    setFilled((f) => ({ ...f, [sel]: cardId }))
    edit()
    const nextEmpty = slots.find((s) => s !== sel && !filled[s])
    if (nextEmpty) setSel(nextEmpty)
  }
  const clearSlot = (id: string) => {
    playSound('click')
    setFilled((f) => { const c = { ...f }; delete c[id]; return c })
    edit()
  }
  const toggleSwap = (id: string) => {
    playSound('click')
    setSwapped((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    edit()
  }

  const animate = (indices: number[], submitAfter: boolean) => {
    if (running) return
    primeAudio()
    playSound('click')
    setRunning(true)
    const stepMs = reduced ? 160 : 420
    let k = 0
    const playCase = () => {
      const ci = indices[k]
      setCaseIdx(ci)
      const r = runCase(params, answer, params.cases[ci])
      let i = 0
      setRun({ r, i, caseIdx: ci })
      const tick = () => {
        if (i < r.steps.length - 1) {
          i++
          setRun({ r, i, caseIdx: ci })
          const st = r.steps[i]
          if (st.answer !== undefined) playSound('click')
          timer.current = setTimeout(tick, stepMs)
          return
        }
        const ok = caseOk(r, ci)
        playSound(ok ? 'star' : 'wrong')
        if (ok && k < indices.length - 1) {
          k++
          timer.current = setTimeout(playCase, stepMs * 2)
          return
        }
        setRunning(false)
        if (submitAfter) state.submit()
      }
      timer.current = setTimeout(tick, stepMs)
    }
    playCase()
  }
  const caseOk = (r: RunResult, ci: number) => {
    const c = params.cases[ci]
    return r.outcome === 'end' && (!c.expectEnd || r.end === c.expectEnd) && Object.entries(c.expect).every(([k, v]) => r.vars[k] === v)
  }
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    setRunning(false)
  }

  // ── Layout + routing ──
  const cols = Math.max(...params.nodes.map((n) => n.at[0])) + 1
  const rowsN = Math.max(...params.nodes.map((n) => n.at[1])) + 1
  const center = (n: FlowNode): Pt => ({ x: n.at[0] * CW + CW / 2, y: n.at[1] * RH + RH / 2 })
  const isBack = (from: FlowNode, to: FlowNode) => !(to.at[1] > from.at[1]) && !(to.at[1] === from.at[1] && from.kind === 'decision')
  const H = rowsN * RH
  const route = (from: FlowNode, to: FlowNode, lane = 0): { d: string; port: Pt } => {
    const a = center(from)
    const b = center(to)
    const top = { x: b.x, y: b.y - NH / 2 }
    const sameCol = from.at[0] === to.at[0]
    const below = to.at[1] > from.at[1]
    if (below && sameCol) {
      const p = { x: a.x, y: a.y + NH / 2 }
      return { d: `M${p.x} ${p.y} V${top.y}`, port: p }
    }
    if (to.at[1] === from.at[1] && from.kind === 'decision') {
      const right = b.x > a.x
      const p = { x: a.x + (right ? NW / 2 : -NW / 2), y: a.y }
      return { d: `M${p.x} ${p.y} H${b.x + (right ? -NW / 2 : NW / 2)}`, port: p }
    }
    if (below && from.kind === 'decision') {
      const right = b.x > a.x
      const p = { x: a.x + (right ? NW / 2 : -NW / 2), y: a.y }
      return { d: `M${p.x} ${p.y} H${b.x} V${top.y}`, port: p }
    }
    if (below) {
      const p = { x: a.x, y: a.y + NH / 2 }
      const midY = top.y - 16
      return { d: `M${p.x} ${p.y} V${midY} H${b.x} V${top.y}`, port: p }
    }
    // Back edge (loop): down, out to a lane right of both, up above the target, into its top.
    const p = { x: a.x, y: a.y + NH / 2 }
    // Each loop gets its own lane (and its own height), so two loops never share a line.
    const laneX = Math.max(from.at[0], to.at[0]) * CW + CW / 2 + NW / 2 + 12 + lane * LANE
    const downY = p.y + 14 + lane * 8
    const upY = top.y - 16 - lane * 6
    return { d: `M${p.x} ${p.y} V${downY} H${laneX} V${upY} H${b.x} V${top.y}`, port: p }
  }

  const edges: { from: FlowNode; to: FlowNode; kind: 'next' | 'yes' | 'no' }[] = []
  params.nodes.forEach((n) => {
    const swap = params.allowSwap && swapped.includes(n.id)
    const push = (t: string | undefined, k: 'next' | 'yes' | 'no') => { const to = t ? byId.get(t) : undefined; if (to) edges.push({ from: n, to, kind: k }) }
    if (n.kind === 'decision') { push(swap ? n.no : n.yes, 'yes'); push(swap ? n.yes : n.no, 'no') } else push(n.next, 'next')
  })

  let backCount = 0
  const lanes = edges.map((e) => (isBack(e.from, e.to) ? backCount++ : 0))
  const W = cols * CW + 30 + Math.max(0, backCount - 1) * LANE
  const step = run ? run.r.steps[run.i] : null
  const token = step ? byId.get(step.node) : null
  const tokenPt = token ? center(token) : null
  const visited = new Set(run ? run.r.steps.slice(0, run.i + 1).map((s) => s.node) : [])
  const c = params.cases[caseIdx]
  const liveVars: Record<string, Value> = step ? step.state : { ...(params.vars ?? {}), ...(c.vars ?? {}) }
  const runDone = run && !running && run.i === run.r.steps.length - 1
  const selNode = sel ? byId.get(sel) : undefined

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <Panel title="The robot's flowchart" className="lg:sticky lg:top-20">
        <div className="overflow-x-auto rounded-xl bg-[#060B16]">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" style={{ minWidth: Math.round(W * SVG_MIN_SCALE) }} role="img" aria-label={`Flowchart with ${params.nodes.length} boxes${step && token ? `. The robot is at ${nodeText(token)}` : ''}.`}>
            <defs>
              <marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 Z" fill="#6E7888" />
              </marker>
              <marker id="fc-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 Z" fill="#00E5FF" />
              </marker>
            </defs>
            {edges.map((e, k) => {
              const { d, port } = route(e.from, e.to, lanes[k])
              const hot = run ? run.r.steps.slice(0, run.i + 1).some((s, j, arr) => s.node === e.from.id && arr[j + 1]?.node === e.to.id) : false
              return (
                <g key={k}>
                  <path d={d} fill="none" strokeWidth={hot ? 3.5 : 2.5} strokeLinejoin="round" className={hot ? 'stroke-[#00E5FF]' : 'stroke-[#3A4A66]'} markerEnd={hot ? 'url(#fc-arrow-hot)' : 'url(#fc-arrow)'} />
                  {e.kind !== 'next' && (() => {
                    const down = port.y > center(e.from).y
                    const right = port.x > center(e.from).x
                    const lx = down ? port.x + 6 : right ? port.x + 4 : port.x - 34
                    const ly = down ? port.y + 4 : port.y - 22
                    return (
                      <g>
                        <rect x={lx} y={ly} width={30} height={18} rx={9} className="fill-[#060B16]" />
                        <text x={lx + 15} y={ly + 13} textAnchor="middle" className={`font-display text-[14px] font-bold ${e.kind === 'yes' ? 'fill-[#4ADE80]' : 'fill-red-300'}`}>
                          {e.kind}
                        </text>
                      </g>
                    )
                  })()}
                </g>
              )
            })}
            {params.nodes.map((n) => {
              const ct = center(n)
              const isSlot = slots.includes(n.id)
              const card = cardOf(n)
              const isSel = sel === n.id && !locked
              const active = step?.node === n.id
              const done = visited.has(n.id)
              const lines = isSlot && !card
                ? [`Box ${slots.indexOf(n.id) + 1}`, n.kind === 'decision' ? '+ question' : '+ action']
                : wrap(n.kind === 'start' ? n.label ?? 'Start' : n.kind === 'end' ? n.label ?? 'End' : card ? `${card.icon ? card.icon + ' ' : ''}${card.label}` : '', n.kind === 'decision' ? 13 : 17)
              const base = active ? 'fill-[#0E3245] stroke-[#00E5FF]' : isSlot && !card ? 'fill-[#0A1120] stroke-amber-400' : n.kind === 'decision' ? 'fill-[#2A2003] stroke-[#EAB308]' : n.kind === 'action' ? 'fill-[#19263F] stroke-amber-400/70' : 'fill-[#0F2A1E] stroke-[#22C55E]'
              const shape =
                n.kind === 'decision' ? (
                  <path d={`M${ct.x} ${ct.y - NH / 2 - 4} L${ct.x + NW / 2} ${ct.y} L${ct.x} ${ct.y + NH / 2 + 4} L${ct.x - NW / 2} ${ct.y} Z`} className={base} strokeWidth={active || isSel ? 3.5 : 2.5} strokeDasharray={isSlot && !card ? '7 5' : undefined} />
                ) : n.kind === 'action' ? (
                  <rect x={ct.x - NW / 2} y={ct.y - NH / 2} width={NW} height={NH} rx={10} className={base} strokeWidth={active || isSel ? 3.5 : 2.5} strokeDasharray={isSlot && !card ? '7 5' : undefined} />
                ) : (
                  <rect x={ct.x - NW / 2 + 14} y={ct.y - NH / 2 + 6} width={NW - 28} height={NH - 12} rx={(NH - 12) / 2} className={base} strokeWidth={active ? 3.5 : 2.5} />
                )
              return (
                <g
                  key={n.id}
                  onClick={() => { if (isSlot && !locked) { playSound('click'); setSel(n.id) } }}
                  data-keyboard-twin="Box tab buttons"
                  className={isSlot && !locked ? 'cursor-pointer' : ''}
                  opacity={run && !done && !active ? 0.75 : 1}
                >
                  {isSel && isSlot && <rect x={ct.x - NW / 2 - 7} y={ct.y - NH / 2 - 9} width={NW + 14} height={NH + 18} rx={14} className="fill-amber-500/10 stroke-amber-300" strokeWidth={2} strokeDasharray="4 4" />}
                  {shape}
                  {lines.map((l, k) => (
                    <text key={k} x={ct.x} y={ct.y + 5 + (k - (lines.length - 1) / 2) * 16} textAnchor="middle" className={`pointer-events-none font-display text-[14px] font-bold ${isSlot && !card ? 'fill-amber-300' : 'fill-[#EEF2F8]'}`}>
                      {l}
                    </text>
                  ))}
                  {params.allowSwap && n.kind === 'decision' && swapped.includes(n.id) && (
                    <text x={ct.x + NW / 2 - 10} y={ct.y - NH / 2 + 4} className="fill-amber-300 text-[12px] font-bold">⇄</text>
                  )}
                </g>
              )
            })}
            {tokenPt && (
              <g style={{ transform: `translate(${tokenPt.x - NW / 2 + 4}px, ${tokenPt.y - NH / 2 - 2}px)`, transition: reduced ? 'none' : 'transform 300ms cubic-bezier(.22,.61,.36,1)' }}>
                <circle r={11} className="fill-amber-500 stroke-[#FFA878]" strokeWidth={2} />
                <circle cx={-3.5} cy={-1.5} r={2} fill="#0A1120" />
                <circle cx={3.5} cy={-1.5} r={2} fill="#0A1120" />
              </g>
            )}
          </svg>
        </div>

        {/* Slot chooser + tray */}
        {!locked && (
          <div className="mt-3 rounded-xl border border-white/10 bg-[#0A1120]/60 p-3">
            <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Empty boxes">
              {slots.map((s, k) => {
                const n = byId.get(s) as FlowNode
                const cd = cardOf(n)
                return (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={sel === s}
                    onClick={() => { playSound('click'); setSel(s) }}
                    className={`min-h-11 max-w-full truncate rounded-xl px-3 text-left font-display text-[14px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${sel === s ? 'bg-amber-500 text-[#1A1103]' : 'bg-[#19263F] text-[#A7B0C0]'}`}
                  >
                    {n.kind === 'decision' ? '◇' : '▭'} Box {k + 1}{cd ? `: ${cd.label}` : ''}
                  </button>
                )
              })}
            </div>
            {selNode && (
              <>
                <p className="mb-2 text-[14px] text-[#A7B0C0]">
                  Pick {selNode.kind === 'decision' ? 'a question (diamond)' : 'an action (rectangle)'} for Box {slots.indexOf(selNode.id) + 1}:
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Cards">
                  {tray.map((cd) => {
                    const fits = cd.kind === selNode.kind
                    const chosen = filled[selNode.id] === cd.id
                    return (
                      <button
                        key={cd.id}
                        type="button"
                        disabled={!fits}
                        aria-pressed={chosen}
                        onClick={() => place(cd.id)}
                        className={`flex min-h-12 items-center gap-2 px-3 font-display text-[15px] font-bold transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97] disabled:opacity-30 ${cd.kind === 'decision' ? 'rounded-[18px] border-2 border-[#EAB308] bg-[#2A2003] text-[#FDE047]' : 'rounded-lg border-2 border-amber-400/70 bg-[#19263F] text-[#EEF2F8]'} ${chosen ? 'ring-4 ring-amber-300' : ''}`}
                      >
                        {cd.icon && <span aria-hidden>{cd.icon}</span>}
                        {cd.label}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filled[selNode.id] && <Btn tone="ghost" onClick={() => clearSlot(selNode.id)}>Empty this box</Btn>}
                  {params.allowSwap && selNode.kind === 'decision' && (
                    <Btn tone="ghost" ariaPressed={swapped.includes(selNode.id)} onClick={() => toggleSwap(selNode.id)}>⇄ Swap yes / no</Btn>
                  )}
                </div>
              </>
            )}
            {params.allowSwap && params.nodes.some((n) => n.kind === 'decision' && !slots.includes(n.id)) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {params.nodes.filter((n) => n.kind === 'decision' && !slots.includes(n.id)).map((n) => (
                  <Btn key={n.id} tone="ghost" ariaPressed={swapped.includes(n.id)} onClick={() => toggleSwap(n.id)}>⇄ Swap “{cardOf(n)?.label}”</Btn>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel title="Test cases">
          <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Test cases">
            {params.cases.map((tc, i) => {
              const res = run && run.caseIdx === i && runDone ? (caseOk(run.r, i) ? ' ✓' : ' ✗') : ''
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={caseIdx === i}
                  disabled={running}
                  onClick={() => { playSound('click'); setCaseIdx(i); setRun(null) }}
                  className={`min-h-11 rounded-xl px-3 font-display text-[14px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${caseIdx === i ? 'bg-[#00B8D4] text-[#04151A]' : 'bg-[#19263F] text-[#A7B0C0]'}`}
                >
                  {tc.name}{res}
                </button>
              )
            })}
          </div>
          {Object.keys(c.sensors ?? {}).length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              {Object.entries(c.sensors ?? {}).map(([k, series]) => (
                <div key={k} className="flex flex-wrap items-center gap-1 text-[14px]">
                  <span className="mr-1 font-semibold text-[#A7B0C0]">{label(k)}:</span>
                  {series.map((v, i) => {
                    const now = step ? Math.min(step.tick, series.length - 1) === i : i === 0
                    return (
                      <span key={i} className={`rounded-md px-1.5 py-0.5 font-mono ${now ? 'bg-[#00B8D4] text-[#04151A]' : 'bg-[#0A1120] text-[#C9D4E5]'}`}>{fmtVal(v)}</span>
                    )
                  })}
                  {series.length > 1 && <span className="text-[12px] text-[#6E7888]">(over time)</span>}
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-[14px]">
            <div className="rounded-lg bg-[#0A1120] p-2">
              <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[#6E7888]">{step ? 'Now' : 'At the start'}</p>
              {Object.keys(c.expect).map((k) => (
                <p key={k} className="text-[#C9D4E5]">{label(k)}: <span className="font-bold text-[#EEF2F8]">{fmtVal(liveVars[k])}</span></p>
              ))}
            </div>
            <div className="rounded-lg bg-[#0A1120] p-2">
              <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[#6E7888]">Must end with</p>
              {Object.entries(c.expect).map(([k, v]) => (
                <p key={k} className="text-[#C9D4E5]">{label(k)}: <span className="font-bold text-[#4ADE80]">{fmtVal(v)}</span></p>
              ))}
            </div>
          </div>
          {runDone && run && run.r.outcome === 'loop' && <p className="mt-2 text-[14px] font-semibold text-red-300">Stopped: the robot was going round forever.</p>}
        </Panel>
        {!state.result && !state.done && (
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Btn tone="secondary" onClick={stop}>■ Stop</Btn>
            ) : (
              <>
                <Btn tone="primary" className="flex-1" onClick={() => animate(params.cases.map((_, i) => i), true)} disabled={slots.some((s) => !filled[s])}>▶ Run all tests</Btn>
                <Btn tone="cyan" onClick={() => animate([caseIdx], false)} disabled={slots.some((s) => !filled[s])}>Try this case</Btn>
              </>
            )}
          </div>
        )}
        <FeedbackCard state={state} />
      </div>
    </div>
  )

  function nodeText(n: FlowNode): string {
    if (n.kind === 'start') return n.label ?? 'Start'
    if (n.kind === 'end') return n.label ?? 'End'
    return cardOf(n)?.label ?? 'an empty box'
  }
}

/** Split a label into at most 3 lines of ~17 characters for the SVG boxes. */
function wrap(s: string, max = 17): string[] {
  const words = s.split(' ')
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
  }
  if (cur) out.push(cur)
  return out.slice(0, 3)
}
