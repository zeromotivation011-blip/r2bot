'use client'

// components/kids/games/robot-surgeon/RemoteAssistGameClient.tsx
// LEGEND — Remote Assist: arm a tele-operated surgical robot through a safety
// checklist (an interlock), choose its force limit, then mark four targets on
// a soft practice pad with a gentle touch — through a 0.4 s network delay,
// while the bedside team needs your attention. Model in ./assist.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { COL, buzz, fitCanvas, rr, useSimLoop } from './shared'
import {
  CHECKLIST,
  CMD_DELAY,
  KEY_SPEED,
  MARK_HOLD,
  MARK_MAX,
  MARK_MIN,
  MARK_R,
  MM_PER_PX,
  PAD_H,
  PAD_W,
  SAFE_MAX,
  TIME_LIMIT,
  VIDEO_DELAY,
  assistScore,
  assistStars,
  checklistErrors,
  lookUp,
  makeAssist,
  marked,
  missingRequired,
  safetyErrors,
  seen,
  stepAssist,
  type AssistConfig,
  type AssistState,
  type CheckId,
} from './assist'
import { Debrief, HoldButton, Panel, PrimaryButton, Slider, Stat, type DebriefLine } from './UiClient'

type Phase = 'check' | 'session' | 'debrief'

const emptyChecks = () => Object.fromEntries(CHECKLIST.map((c) => [c.id, false])) as Record<CheckId, boolean>

export default function RemoteAssistGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('check')
  const [cfg, setCfg] = useState<AssistConfig>({ checks: emptyChecks(), forceLimit: 6 })
  const sim = useRef<AssistState>(makeAssist(cfg))
  const pending = useRef({ x: 0, y: 0 })
  const keys = useRef({ up: false, down: false, left: false, right: false, press: false })
  const padPress = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [hud, setHud] = useState({ t: 0, limit: TIME_LIMIT, marked: 0, errors: 0, alert: false, looking: false, force: 0 })
  const limitNow = useRef(false)
  const markedRef = useRef(0)
  const alertRef = useRef(false)
  /** Several fixed steps can run in one frame: the end-of-session block must run once. */
  const ended = useRef(false)

  const missing = missingRequired(cfg)

  const arm = () => {
    if (missing.length) return
    sim.current = makeAssist(cfg)
    markedRef.current = 0
    ended.current = false
    setPhase('session')
    playSound('unlock')
  }

  const step = useCallback((dt: number) => {
    if (ended.current) return
    const s = sim.current
    const k = keys.current
    const kx = (k.right ? 1 : 0) - (k.left ? 1 : 0)
    const ky = (k.down ? 1 : 0) - (k.up ? 1 : 0)
    const dx = pending.current.x * MM_PER_PX + kx * KEY_SPEED * dt
    const dy = pending.current.y * MM_PER_PX + ky * KEY_SPEED * dt
    pending.current = { x: 0, y: 0 }
    stepAssist(s, dx, dy, k.press || padPress.current, dt)
    const v = seen(s)
    // Haptic + sound when the (delayed) view shows the force limit holding.
    const atLimit = s.limitOn && v.f >= s.cfg.forceLimit - 0.02 && v.f > 0
    if (atLimit && !limitNow.current) {
      buzz(60)
      playSound('click')
    }
    limitNow.current = atLimit
    const m = marked(s)
    if (m > markedRef.current) {
      markedRef.current = m
      playSound('correct')
    }
    if (s.alertOpen && !alertRef.current) playSound('unlock')
    alertRef.current = s.alertOpen
    if (s.done || s.timeUp) {
      ended.current = true
      playSound(s.done ? 'star' : 'wrong')
      setPhase('debrief')
    }
  }, [])

  const draw = useCallback(() => {
    const f = fitCanvas(canvas.current)
    if (!f) return
    const { ctx, w, h } = f
    const s = sim.current
    const v = seen(s)
    const gaugeW = 46
    const k = Math.min((w - gaugeW - 16) / PAD_W, (h - 12) / PAD_H)
    const ox = 6
    const oy = (h - PAD_H * k) / 2
    const X = (x: number) => ox + x * k
    const Y = (y: number) => oy + y * k
    ctx.fillStyle = '#0B1426'
    ctx.fillRect(0, 0, w, h)
    // the practice pad (abstract, soft)
    const g = ctx.createLinearGradient(0, oy, 0, oy + PAD_H * k)
    g.addColorStop(0, '#3A4E78')
    g.addColorStop(1, '#2A3A5E')
    ctx.fillStyle = g
    rr(ctx, X(0), Y(0), PAD_W * k, PAD_H * k, 18)
    ctx.fill()
    // gentle dent where the tool presses (seen view)
    if (v.d > 0) {
      ctx.fillStyle = `rgba(10,17,32,${Math.min(0.5, v.d * 0.12)})`
      ctx.beginPath()
      ctx.arc(X(v.x), Y(v.y), 4 + v.d * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    // targets
    for (const tg of s.targets) {
      ctx.strokeStyle = tg.done ? COL.green : COL.cyan
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(X(tg.x), Y(tg.y), MARK_R * k, 0, Math.PI * 2)
      ctx.stroke()
      if (tg.done) {
        ctx.fillStyle = COL.green
        ctx.beginPath()
        ctx.arc(X(tg.x), Y(tg.y), 3, 0, Math.PI * 2)
        ctx.fill()
      } else if (tg.hold > 0) {
        ctx.strokeStyle = COL.amber
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(X(tg.x), Y(tg.y), MARK_R * k + 5, -Math.PI / 2, -Math.PI / 2 + (tg.hold / MARK_HOLD) * Math.PI * 2)
        ctx.stroke()
      }
    }
    // your hand, live (ghost)
    ctx.strokeStyle = 'rgba(255,255,255,.45)'
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(X(s.hx), Y(s.hy), 7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    // the tool as the camera shows it (delayed)
    const lift = Math.max(0, -v.d)
    ctx.fillStyle = 'rgba(0,0,0,.35)'
    ctx.beginPath()
    ctx.arc(X(v.x) + lift * 3, Y(v.y) + lift * 3, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#D9E2F1'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(X(v.x) + 30, Y(v.y) - 30)
    ctx.lineTo(X(v.x), Y(v.y))
    ctx.stroke()
    ctx.fillStyle = v.f > SAFE_MAX ? COL.red : v.f >= MARK_MIN && v.f <= MARK_MAX ? COL.green : COL.amber
    ctx.beginPath()
    ctx.arc(X(v.x), Y(v.y), 4, 0, Math.PI * 2)
    ctx.fill()
    // force gauge (what the console shows — also delayed)
    const gx = w - gaugeW - 4
    const gy = 14
    const gh = h - 36
    const F = (n: number) => gy + gh - (Math.min(6, n) / 6) * gh
    ctx.fillStyle = 'rgba(255,255,255,.06)'
    rr(ctx, gx, gy, gaugeW - 14, gh, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(34,197,94,.35)'
    ctx.fillRect(gx, F(MARK_MAX), gaugeW - 14, F(MARK_MIN) - F(MARK_MAX))
    ctx.fillStyle = 'rgba(239,68,68,.3)'
    ctx.fillRect(gx, gy, gaugeW - 14, F(SAFE_MAX) - gy)
    ctx.fillStyle = v.f > SAFE_MAX ? COL.red : COL.amber
    ctx.fillRect(gx + 6, F(v.f), gaugeW - 26, gy + gh - F(v.f))
    if (s.limitOn) {
      ctx.strokeStyle = COL.cyan
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(gx - 3, F(s.cfg.forceLimit))
      ctx.lineTo(gx + gaugeW - 11, F(s.cfg.forceLimit))
      ctx.stroke()
    }
    ctx.fillStyle = COL.text1
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${v.f.toFixed(1)} N`, gx + (gaugeW - 14) / 2, h - 8)
    // delay badge
    ctx.fillStyle = 'rgba(10,17,32,.75)'
    rr(ctx, 12, 10, 132, 22, 8)
    ctx.fill()
    ctx.fillStyle = COL.amberSoft
    ctx.textAlign = 'left'
    ctx.font = 'bold 12px system-ui, sans-serif'
    ctx.fillText(`● video ${((CMD_DELAY + VIDEO_DELAY) * 1000).toFixed(0)} ms behind`, 20, 25)
    if (s.lookingAway) {
      ctx.fillStyle = 'rgba(10,17,32,.82)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = COL.text1
      ctx.textAlign = 'center'
      ctx.font = 'bold 18px system-ui, sans-serif'
      ctx.fillText('You are looking at the bedside team…', w / 2, h / 2 - 8)
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillStyle = s.headOn ? COL.green : COL.rose
      ctx.fillText(s.headOn ? 'Head sensor: instruments frozen in place ✓' : 'Head sensor OFF: the instruments are still moving!', w / 2, h / 2 + 18)
    }
  }, [])

  useSimLoop(phase === 'session', step, draw, 60)

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = sim.current
      setHud({ t: s.t, limit: s.timeLimit, marked: marked(s), errors: safetyErrors(s), alert: s.alertOpen, looking: s.lookingAway, force: seen(s).f })
    }, 150)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (phase !== 'session') return
    const map: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.tagName === 'INPUT') return
      if (map[e.code]) {
        e.preventDefault()
        keys.current[map[e.code]] = true
      }
      if (e.code === 'Space' && !(t && t.tagName === 'BUTTON')) {
        e.preventDefault()
        keys.current.press = true
      }
      if (e.code === 'KeyL') lookUp(sim.current)
    }
    const up = (e: KeyboardEvent) => {
      if (map[e.code]) keys.current[map[e.code]] = false
      if (e.code === 'Space') keys.current.press = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [phase])

  const s = sim.current

  const finish = () => {
    const stars = assistStars(s)
    onFinish({
      stars,
      score: assistScore(s),
      scoreLabel: 'session points',
      message:
        stars > 0
          ? `${marked(s)} of 4 targets marked in ${s.t.toFixed(0)} s with ${safetyErrors(s)} safety problem${safetyErrors(s) === 1 ? '' : 's'}. Accuracy, time and safety all counted.`
          : marked(s) === 4
            ? 'All four targets marked, but too many safety problems for a pass. In medicine, how you get there matters as much as getting there.'
            : `${marked(s)} of 4 targets marked. Read the debrief: the force limit and the delay decide this mission.`,
    })
  }

  const debrief = (): DebriefLine[] => {
    const lines: DebriefLine[] = []
    const traps = checklistErrors(s.cfg)
    lines.push({ icon: '🎯', text: `${marked(s)} of 4 targets marked${marked(s) ? `, on average ${(s.targets.filter((t) => t.done).reduce((a, t) => a + t.err, 0) / Math.max(1, marked(s))).toFixed(1)} mm from the centre` : ''}. Time ${s.t.toFixed(0)} s${Number.isFinite(s.timeLimit) ? ` of ${Math.round(s.timeLimit)} s` : ''}.` })
    if (traps.includes('nolimit')) lines.push({ icon: '⛔', text: `You switched off the force limit. Nothing stopped the tool when you pressed too long — peak force ${s.peakForce.toFixed(1)} N (the pad is stressed above ${SAFE_MAX} N). The limit works on the robot itself, with no delay, so it protects the patient even when your view is late.` })
    else if (s.cfg.forceLimit > SAFE_MAX) lines.push({ icon: '⚖️', text: `Your force limit was ${s.cfg.forceLimit.toFixed(1)} N — above the ${SAFE_MAX} N the pad can take, so it could not protect it. ${s.tissueStress ? `The pad was stressed ${s.tissueStress} time${s.tissueStress === 1 ? '' : 's'}.` : 'You were careful, but the limit was not helping.'}` })
    else if (s.cfg.forceLimit < MARK_MIN) lines.push({ icon: '⚖️', text: `Your force limit was ${s.cfg.forceLimit.toFixed(1)} N — below the ${MARK_MIN} N a mark needs, so the robot could never press hard enough. Safe, but the job could not be done.` })
    else if (s.cfg.forceLimit <= MARK_MAX) lines.push({ icon: '⚖️', text: `Smart: a limit of ${s.cfg.forceLimit.toFixed(1)} N sits inside the marking window (${MARK_MIN}–${MARK_MAX} N). The robot itself stopped at the right force, so the 0.4 s delay could not make you press too hard.` })
    else lines.push({ icon: '⚖️', text: `Your limit of ${s.cfg.forceLimit.toFixed(1)} N kept the pad safe. Because it is above ${MARK_MAX} N you had to let go at the right moment — hard when you see the force 0.4 s late. A limit inside ${MARK_MIN}–${MARK_MAX} N lets the robot do that part.` })
    if (traps.includes('nohead')) lines.push({ icon: '👀', text: `You switched off the head sensor. When you looked at the team, the instruments kept following your unwatched hand${s.movedBlind > 1 ? ` and moved ${s.movedBlind.toFixed(0)} mm` : ''}. Real consoles freeze the instruments the moment the surgeon looks away.` })
    if (s.ignoredTeam) lines.push({ icon: '🗣️', text: 'The bedside team asked for your attention and you did not look up. The team beside the patient is part of the safety system: they can see things your camera cannot.' })
    else if (s.alertHandled) lines.push({ icon: '🗣️', text: s.headOn ? 'You looked up when the team called, and the head sensor froze the instruments — exactly how it should work.' : 'You looked up when the team called — good — but the instruments kept moving.' })
    lines.push({ icon: '⏳', text: `Everything you saw was ${((CMD_DELAY + VIDEO_DELAY) * 1000).toFixed(0)} ms old. The trick with delay: move, wait for the picture to catch up, then move again. In 2001 surgeons operated across the Atlantic with about 155 ms of delay.` })
    return lines
  }

  if (phase === 'check') {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Pre-session safety checklist">
          <p className="text-[15px] leading-snug text-[#A7B0C0]">
            The robot will not arm until every safety check is done — that is an <b className="text-[#EEF2F8]">interlock</b>. Tick only what a careful team would do. Some items are not safe.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {CHECKLIST.map((c) => {
              const on = cfg.checks[c.id]
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => {
                      setCfg((p) => ({ ...p, checks: { ...p.checks, [c.id]: !p.checks[c.id] } }))
                      playSound('click')
                    }}
                    className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${on ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-[#111C32] hover:bg-white/5'}`}
                  >
                    <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 font-bold ${on ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/30'}`}>
                      {on ? '✓' : ''}
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold text-[#EEF2F8]">{c.label}</span>
                      <span className="block text-[13px] text-[#A7B0C0]">{c.detail}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
        <div className="flex flex-col gap-3">
          <Panel title="Robot force limit">
            <Slider
              id="assist-limit"
              label="Stop pushing at"
              unit="N"
              min={0.5}
              max={6}
              step={0.1}
              value={cfg.forceLimit}
              onChange={(v) => setCfg((p) => ({ ...p, forceLimit: v }))}
              hint={`A mark needs a touch of ${MARK_MIN}–${MARK_MAX} N held for ${MARK_HOLD} s. The practice pad is stressed above ${SAFE_MAX} N. The robot enforces this limit itself, with no network delay.`}
            />
          </Panel>
          <Panel>
            <p className="text-[15px] font-semibold text-[#EEF2F8]">Interlock</p>
            {missing.length ? (
              <p className="mt-1 text-[14px] text-rose-200" aria-live="polite">
                🔒 {missing.length} safety check{missing.length === 1 ? '' : 's'} still missing.
              </p>
            ) : (
              <p className="mt-1 text-[14px] text-emerald-200" aria-live="polite">
                🔓 All required checks done. Ready to arm.
              </p>
            )}
            <PrimaryButton className="mt-3 w-full" disabled={missing.length > 0} onClick={arm}>
              Arm the robot →
            </PrimaryButton>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <canvas ref={canvas} data-game-stage="" className="kids-stage-ratio aspect-[16/10] w-full rounded-[28px] border border-white/10" role="img" aria-label={`Delayed camera view. ${hud.marked} of 4 targets marked. Force ${hud.force.toFixed(1)} newtons.`} />
          {hud.alert && (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-amber-300 bg-[#0A1120]/95 p-3" role="alert">
              <span className="text-2xl" aria-hidden>
                🧑‍⚕️
              </span>
              <p className="flex-1 text-[15px] font-semibold text-[#EEF2F8]">Bedside nurse: “Please look at the monitor with me for a moment.”</p>
              <PrimaryButton onClick={() => lookUp(sim.current)}>Look up (L)</PrimaryButton>
            </div>
          )}
        </div>
        {phase === 'debrief' ? (
          <Debrief title={s.done ? 'Session complete' : 'Session over'} good={assistStars(s) > 0} lines={debrief()} onContinue={finish} />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
            <div
              role="application"
              aria-label="Hand control pad. Drag to move the tool, or use the arrow keys. Hold Space or the Press button to press."
              tabIndex={0}
              onPointerDown={(e) => {
                ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
                last.current = { x: e.clientX, y: e.clientY }
              }}
              onPointerMove={(e) => {
                if (!last.current) return
                pending.current.x += e.clientX - last.current.x
                pending.current.y += e.clientY - last.current.y
                last.current = { x: e.clientX, y: e.clientY }
              }}
              onPointerUp={() => (last.current = null)}
              onPointerCancel={() => (last.current = null)}
              style={{ touchAction: 'none' }}
              className="flex h-[150px] select-none flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-cyan-300/40 bg-[#111C32] text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              <p className="font-display text-base font-bold text-[#EEF2F8]">✋ Hand control</p>
              <p className="px-2 text-[13px] leading-snug text-[#A7B0C0]">Drag to move. Arrows / WASD. The dotted ring is your hand now; the tool follows late.</p>
            </div>
            <HoldButton label="Press the tool down" className="h-[150px] flex-col gap-1 text-base" onChange={(d) => (padPress.current = d)}>
              <span className="text-3xl" aria-hidden>
                ⬇️
              </span>
              Press
              <span className="text-xs text-[#A7B0C0]">(Space)</span>
            </HoldButton>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Panel>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Time" value={`${hud.t.toFixed(0)} s`} tone={hud.t > hud.limit - 20 ? 'warn' : 'plain'} />
            <Stat label="Marked" value={`${hud.marked}/4`} tone={hud.marked === 4 ? 'good' : 'plain'} />
            <Stat label="Safety" value={hud.errors === 0 ? '✓' : `${hud.errors} ⚠`} tone={hud.errors === 0 ? 'good' : 'bad'} />
          </div>
        </Panel>
        <Panel title="How to mark a target">
          <ol className="list-decimal space-y-1 pl-5 text-[14px] leading-snug text-[#A7B0C0]">
            <li>Move the tool over a cyan ring. Wait for the picture to catch up.</li>
            <li>Press. Watch the force bar: hold it in the green band ({MARK_MIN}–{MARK_MAX} N) until the ring fills.</li>
            <li>Let go to lift, then move to the next ring. Never into the red.</li>
          </ol>
          <p className="mt-2 text-[13px] text-[#6E7888]">
            Force limit: {s.limitOn ? `${s.cfg.forceLimit.toFixed(1)} N (cyan line)` : 'OFF'} · Head sensor: {s.headOn ? 'on' : 'OFF'}
          </p>
        </Panel>
      </div>
    </div>
  )
}
