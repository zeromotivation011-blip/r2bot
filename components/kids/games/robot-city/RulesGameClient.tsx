'use client'

// components/kids/games/robot-city/RulesGameClient.tsx
// LEGEND — Rulebook: write an autonomous car's behaviour rules (IF … THEN …,
// first match wins), run a six-scenario safety test suite, watch any test as a
// replay, and fix the rules until every test passes. Model in ./rules.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  ACTIONS,
  CAR_LEN,
  CONDITIONS,
  MAX_RULES,
  SCENARIOS,
  STARTER,
  rulesStars,
  runSuite,
  type ActionId,
  type CondId,
  type Frame,
  type Rule,
  type ScenarioResult,
} from './rules'
import { COL, fitCanvas, rr, useReducedMotion, useSimLoop } from './shared'
import { Debrief, GhostButton, Panel, PrimaryButton, type DebriefLine } from './UiClient'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const FRAME_DT = 0.1
const condOf = (id: CondId) => CONDITIONS.find((c) => c.id === id)!
const actOf = (id: ActionId) => ACTIONS.find((a) => a.id === id)!

export default function RulesGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [rules, setRules] = useState<Rule[]>(STARTER)
  const [results, setResults] = useState<ScenarioResult[] | null>(null)
  const [runs, setRuns] = useState(0)
  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)
  const [dirty, setDirty] = useState(true)
  const play = useRef({ t: 0, idx: 0 })
  const [hudRule, setHudRule] = useState<{ rule: number; action: ActionId }>({ rule: -1, action: 'cruise' })
  const reduced = useReducedMotion()
  const firstFail = useRef<number | null>(null)

  const runTests = () => {
    const r = runSuite(rules)
    setResults(r)
    setRuns((n) => n + 1)
    setDirty(false)
    const fail = r.findIndex((x) => !x.pass)
    firstFail.current = fail
    const show = fail >= 0 ? fail : 0
    setSel(show)
    play.current = { t: 0, idx: 0 }
    setPlaying(true)
    playSound(fail < 0 ? 'star' : 'wrong')
    if (fail < 0) setDone(true)
  }

  const pick = (i: number) => {
    setSel(i)
    play.current = { t: 0, idx: 0 }
    setPlaying(true)
  }

  const step = useCallback(
    (dt: number) => {
      const r = results?.[sel]
      if (!r) return
      const pc = play.current
      pc.t += dt * 2
      pc.idx = Math.min(r.frames.length - 1, Math.floor(pc.t / FRAME_DT))
      const f = r.frames[pc.idx]
      if (pc.idx % 3 === 0) setHudRule({ rule: f.rule, action: f.action })
      if (pc.idx >= r.frames.length - 1) {
        setHudRule({ rule: f.rule, action: f.action })
        setPlaying(false)
      }
    },
    [results, sel],
  )

  const draw = useCallback(() => {
    const fc = fitCanvas(canvas.current)
    if (!fc) return
    const { ctx, w, h } = fc
    const r = results?.[sel]
    const sc = SCENARIOS[sel]
    const f: Frame | null = r ? r.frames[Math.min(play.current.idx, r.frames.length - 1)] : null
    const span = 52
    const k = w / span
    const carS = f ? f.s : 0
    const cam = carS - span * 0.3
    const X = (s: number) => (s - cam) * k
    const yMid = h * 0.52
    const Y = (y: number) => yMid + y * k * 0.9
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#16233B'
    ctx.fillRect(0, 0, w, h)
    // pavement, parking strip, lanes
    ctx.fillStyle = '#3A4A66'
    ctx.fillRect(0, Y(4.2), w, Y(7.5) - Y(4.2))
    ctx.fillRect(0, Y(-8.4), w, Y(-5.3) - Y(-8.4))
    ctx.fillStyle = '#2A2F3A'
    ctx.fillRect(0, Y(-5.3), w, Y(4.2) - Y(-5.3))
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    for (let m = Math.floor(cam / 6) * 6; m < cam + span + 6; m += 6) ctx.fillRect(X(m), Y(-1.75) - 1, 3 * k, 2)
    ctx.fillStyle = 'rgba(255,255,255,.3)'
    ctx.fillRect(0, Y(1.85), w, 1.5)
    // finish
    if (X(sc.length) < w) {
      ctx.fillStyle = COL.green
      ctx.fillRect(X(sc.length), Y(-5.3), 4, Y(4.2) - Y(-5.3))
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // traffic light
    if (sc.light && f) {
      const lx = X(sc.light.at)
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.fillRect(lx, Y(-1.75), 3, Y(1.75) - Y(-1.75))
      ctx.fillStyle = '#0B1220'
      rr(ctx, lx - 0.6 * k, Y(4.6), 1.4 * k, 2.4 * k, 4)
      ctx.fill()
      ctx.fillStyle = f.light === 'red' ? COL.red : COL.green
      ctx.beginPath()
      ctx.arc(lx + 0.1 * k, Y(5.8), 0.5 * k, 0, Math.PI * 2)
      ctx.fill()
    }
    const sirenOn = reduced || Math.floor((f?.t ?? 0) * 4) % 2 === 0
    if (f)
      for (const o of f.objs) {
        const x = X(o.s)
        if (x < -60 || x > w + 60) continue
        if (o.kind === 'parked' || o.kind === 'follower' || o.kind === 'ambulance') {
          const col = o.kind === 'parked' ? '#64748B' : o.kind === 'follower' ? '#E2E8F0' : '#F8FAFC'
          ctx.fillStyle = col
          rr(ctx, x, Y(o.y) - 0.85 * k, o.len * k, 1.7 * k, 4)
          ctx.fill()
          if (o.kind === 'ambulance') {
            ctx.fillStyle = COL.red
            ctx.fillRect(x + o.len * k * 0.35, Y(o.y) - 0.2 * k, o.len * k * 0.3, 0.4 * k)
            ctx.fillStyle = sirenOn ? '#3B82F6' : '#1E3A8A'
            ctx.fillRect(x + o.len * k * 0.75, Y(o.y) - 0.8 * k, 0.5 * k, 1.6 * k)
          }
        } else if (o.kind === 'cone') {
          ctx.fillStyle = '#FB923C'
          ctx.beginPath()
          ctx.moveTo(x, Y(o.y) - 0.6 * k)
          ctx.lineTo(x + 0.5 * k, Y(o.y) + 0.5 * k)
          ctx.lineTo(x - 0.5 * k, Y(o.y) + 0.5 * k)
          ctx.fill()
        } else {
          const icon = o.kind === 'ball' ? '⚽' : o.kind === 'child' ? '🧒' : o.kind === 'bag' ? '🛍️' : o.kind === 'worker' ? '👷' : '🚶'
          ctx.font = `${Math.round(k * (o.kind === 'ball' || o.kind === 'bag' ? 1.1 : 1.7))}px system-ui, sans-serif`
          ctx.fillText(icon, x, Y(o.y))
        }
      }
    // our robotaxi
    if (f) {
      const x0 = X(f.s - CAR_LEN)
      ctx.fillStyle = COL.amber
      rr(ctx, x0, Y(f.y) - 0.9 * k, CAR_LEN * k, 1.8 * k, 5)
      ctx.fill()
      ctx.fillStyle = '#1A1103'
      ctx.beginPath()
      ctx.arc(x0 + CAR_LEN * k * 0.45, Y(f.y), 0.35 * k, 0, Math.PI * 2)
      ctx.fill()
      if (f.action === 'brake-hard' || f.action === 'stop-gently' || f.action === 'remote-help' || f.action === 'pull-over') {
        ctx.fillStyle = '#FF3B3B'
        ctx.fillRect(x0 - 2, Y(f.y) - 0.8 * k, 3, 0.5 * k)
        ctx.fillRect(x0 - 2, Y(f.y) + 0.3 * k, 3, 0.5 * k)
      }
    }
    // glare
    if (f?.glare) {
      const g = ctx.createRadialGradient(w * 0.95, h * 0.2, 4, w * 0.95, h * 0.2, w * 0.7)
      g.addColorStop(0, 'rgba(255,250,220,.95)')
      g.addColorStop(0.35, 'rgba(255,230,150,.45)')
      g.addColorStop(1, 'rgba(255,230,150,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    // HUD
    if (f) {
      ctx.textAlign = 'left'
      ctx.font = `bold ${Math.max(12, Math.round(h * 0.04))}px system-ui, sans-serif`
      const tags: string[] = [`${(f.v * 3.6).toFixed(0)} km/h`]
      if (f.glare) tags.push('☀️ camera blinded')
      if (f.siren) tags.push('🚨 siren')
      if (f.remote === 'asked') tags.push('🎧 asking for help…')
      if (f.remote === 'answered') tags.push('🎧 plan: go round slowly')
      const txt = tags.join('   ')
      const tw = ctx.measureText(txt).width + 18
      ctx.fillStyle = 'rgba(10,17,32,.85)'
      rr(ctx, 8, 8, tw, h * 0.07, 8)
      ctx.fill()
      ctx.fillStyle = COL.text1
      ctx.fillText(txt, 17, 8 + h * 0.035)
    }
    if (r && f && play.current.idx >= r.frames.length - 1) {
      ctx.textAlign = 'center'
      ctx.font = `bold ${Math.round(h * 0.06)}px system-ui, sans-serif`
      ctx.fillStyle = r.pass ? COL.green : COL.red
      ctx.fillText(r.pass ? '✓ PASS' : '✗ FAIL', w / 2, h * 0.88)
    }
    if (!r) {
      ctx.textAlign = 'center'
      ctx.fillStyle = COL.text2
      ctx.font = `${Math.max(14, Math.round(h * 0.045))}px system-ui, sans-serif`
      ctx.fillText('Write your rules, then run the safety tests.', w / 2, h * 0.86)
    }
  }, [results, sel, reduced])

  useSimLoop(playing, step, draw, 60)
  // draw once when nothing plays (selection changes, first paint)
  useEffect(() => {
    const id = requestAnimationFrame(() => draw())
    return () => cancelAnimationFrame(id)
  }, [draw, playing])

  const update = (i: number, patch: Partial<Rule>) => {
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setDirty(true)
  }
  const move = (i: number, d: -1 | 1) => {
    setRules((rs) => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const out = rs.slice()
      ;[out[i], out[j]] = [out[j], out[i]]
      return out
    })
    setDirty(true)
    playSound('click')
  }
  const remove = (i: number) => {
    setRules((rs) => rs.filter((_, j) => j !== i))
    setDirty(true)
  }
  const add = () => {
    if (rules.length >= MAX_RULES) return
    const used = new Set(rules.map((r) => r.when))
    const next = CONDITIONS.find((c) => !used.has(c.id))?.id ?? 'person-ahead'
    setRules((rs) => [...rs, { when: next, then: 'stop-gently' }])
    setDirty(true)
    playSound('click')
  }

  const passed = results ? results.filter((r) => r.pass).length : 0
  const allPass = !!results && passed === SCENARIOS.length && !dirty
  const stars = rulesStars(allPass, runs)

  const finish = () => {
    onFinish({
      stars,
      score: passed,
      scoreLabel: `of ${SCENARIOS.length} safety tests`,
      attempts: runs,
      message: allPass
        ? `Your ${rules.length}-rule rulebook passed all ${SCENARIOS.length} safety tests after ${runs} test run${runs === 1 ? '' : 's'}.`
        : `${passed} of ${SCENARIOS.length} tests passed. A self-driving car needs every safety test to pass before it may carry passengers.`,
    })
  }

  const debrief = (): DebriefLine[] => {
    const lines: DebriefLine[] = [{ icon: '✅', text: `All ${SCENARIOS.length} scenarios passed with ${rules.length} rules after ${runs} test run${runs === 1 ? '' : 's'}.` }]
    lines.push({ icon: '🔝', text: 'Order matters: the first true rule wins, so the rules that protect people must sit above the ones that keep the car moving.' })
    lines.push({ icon: '⚖️', text: 'Over-reacting is dangerous too: an emergency stop for a plastic bag can cause a crash behind you. Good rules are proportionate.' })
    lines.push({ icon: '🎧', text: 'When the car does not understand a scene, it stops safely and asks a person. Real robotaxi companies run remote assistance centres for exactly this.' })
    lines.push({ icon: '🧪', text: 'Six passing tests is not proof of safety: real teams run millions of simulated scenarios and still test on closed tracks and with safety drivers before going driverless.' })
    return lines
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-2">
        <canvas
          ref={canvas}
          className="aspect-[13/9] w-full rounded-[28px] border border-white/10 bg-[#0A1120]"
          role="img"
          aria-label={`Test replay: ${SCENARIOS[sel].name}. ${results ? (results[sel].pass ? 'Passed' : `Failed: ${results[sel].reason}`) : 'Not run yet.'}`}
        />
        <div className="rounded-2xl bg-white/5 px-3 py-2 text-[15px] text-[#EEF2F8]" aria-live="polite">
          <b>{SCENARIOS[sel].icon} {SCENARIOS[sel].name}:</b> {SCENARIOS[sel].story}
          {results && (
            <p className={`mt-1 font-semibold ${results[sel].pass ? 'text-emerald-300' : 'text-rose-300'}`}>
              {results[sel].pass ? '✓ ' : '✗ '}
              {results[sel].reason}
            </p>
          )}
          {results && (
            <p className="mt-1 text-[13px] text-[#A7B0C0]">
              In control now: {hudRule.rule >= 0 ? `rule ${hudRule.rule + 1} → ${actOf(hudRule.action).label}` : 'no rule → drive normally'}
            </p>
          )}
        </div>
        <div role="tablist" aria-label="Safety tests" className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {SCENARIOS.map((sc, i) => {
            const r = results?.[i]
            return (
              <button
                key={sc.id}
                type="button"
                role="tab"
                aria-selected={sel === i}
                onClick={() => pick(i)}
                disabled={!results}
                className={`min-h-[52px] rounded-xl border px-1 text-[12px] font-bold leading-tight transition disabled:opacity-50 ${FOCUS} ${sel === i ? 'border-amber-300 bg-amber-400/15 text-white' : 'border-white/15 bg-white/5 text-[#A7B0C0]'}`}
              >
                <span className="block text-lg" aria-hidden>
                  {sc.icon}
                </span>
                {r ? (r.pass ? '✓ ' : '✗ ') : ''}
                {sc.name}
              </button>
            )
          })}
        </div>
        {done && allPass && <Debrief title="Certified for the test track!" good lines={debrief()} onContinue={finish} />}
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Rulebook">
          <p className="text-[13px] leading-snug text-[#A7B0C0]">Checked top to bottom, 20 times a second. The first rule that is true decides.</p>
          <ol className="mt-2 flex flex-col gap-2">
            {rules.map((r, i) => (
              <li key={i} className="rounded-2xl border border-white/10 bg-[#111C32] p-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-amber-300">{i + 1}</span>
                  <label className="sr-only" htmlFor={`rc-when-${i}`}>
                    Rule {i + 1} condition
                  </label>
                  <select
                    id={`rc-when-${i}`}
                    value={r.when}
                    onChange={(e) => update(i, { when: e.target.value as CondId })}
                    className={`min-h-[44px] w-full rounded-xl border border-white/15 bg-[#19263F] px-2 text-[14px] text-[#EEF2F8] ${FOCUS}`}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        IF {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 pl-5">
                  <label className="sr-only" htmlFor={`rc-then-${i}`}>
                    Rule {i + 1} action
                  </label>
                  <select
                    id={`rc-then-${i}`}
                    value={r.then}
                    onChange={(e) => update(i, { then: e.target.value as ActionId })}
                    className={`min-h-[44px] w-full rounded-xl border border-amber-300/30 bg-[#19263F] px-2 text-[14px] text-amber-100 ${FOCUS}`}
                  >
                    {ACTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        THEN {a.icon} {a.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" aria-label={`Move rule ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={`h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-white/5 font-bold text-white disabled:opacity-30 ${FOCUS}`}>
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move rule ${i + 1} down`}
                    disabled={i === rules.length - 1}
                    onClick={() => move(i, 1)}
                    className={`h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-white/5 font-bold text-white disabled:opacity-30 ${FOCUS}`}
                  >
                    ↓
                  </button>
                  <button type="button" aria-label={`Delete rule ${i + 1}`} onClick={() => remove(i)} className={`h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-white/5 font-bold text-rose-300 ${FOCUS}`}>
                    ✕
                  </button>
                </div>
                <p className="mt-1 pl-5 text-[12px] leading-snug text-[#6E7888]">{condOf(r.when).detail}</p>
              </li>
            ))}
          </ol>
          <p className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-[13px] text-[#A7B0C0]">Otherwise → ➡️ drive normally at 50 km/h in my lane.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <GhostButton onClick={add} disabled={rules.length >= MAX_RULES}>
              + Add rule ({rules.length}/{MAX_RULES})
            </GhostButton>
            <PrimaryButton onClick={runTests} className="flex-1">
              ▶ Run safety tests
            </PrimaryButton>
          </div>
          {results && (
            <p className="mt-2 text-[14px] font-semibold text-[#EEF2F8]">
              {passed}/{SCENARIOS.length} passed · test runs: {runs}
              {dirty ? <span className="text-amber-300"> · rules changed: run again</span> : null}
            </p>
          )}
          {results && !allPass && runs >= 2 && (
            <button type="button" onClick={finish} className={`mt-2 min-h-[44px] text-[13px] font-semibold text-[#A7B0C0] underline underline-offset-4 ${FOCUS}`}>
              Hand in the rulebook as it is
            </button>
          )}
        </Panel>
        <Panel>
          <details>
            <summary className="min-h-[44px] cursor-pointer py-2 text-[15px] font-bold text-[#EEF2F8]">What each action does</summary>
            <ul className="mt-1 space-y-1 text-[13px] leading-snug text-[#A7B0C0]">
              {ACTIONS.map((a) => (
                <li key={a.id}>
                  <b className="text-[#EEF2F8]">
                    {a.icon} {a.label}:
                  </b>{' '}
                  {a.detail}
                </li>
              ))}
            </ul>
          </details>
        </Panel>
      </div>
    </div>
  )
}
