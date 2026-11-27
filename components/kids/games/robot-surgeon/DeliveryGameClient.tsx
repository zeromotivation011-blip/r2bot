'use client'

// components/kids/games/robot-surgeon/DeliveryGameClient.tsx
// CADET — Medicine Run: drive the hospital delivery robot to three wards and
// back to its charger, slowing down near people. Model in ./delivery.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  CAREFUL,
  CELL_M,
  COLS,
  FAST,
  HOME,
  MAP,
  ROBOT_R,
  PERSON_R,
  ROWS,
  SLOW_FIELD,
  STOP_HALF_W,
  TIME_LIMIT,
  WARDS,
  deliveryScore,
  deliveryStars,
  makeDelivery,
  safetyEvents,
  stepDelivery,
  stopDist,
  stopField,
  type DeliveryState,
} from './delivery'
import { COL, buzz, fitCanvas, rr, useReducedMotion, useSimLoop } from './shared'
import { Debrief, GhostButton, HoldButton, Panel, PrimaryButton, Stat, type DebriefLine } from './UiClient'

type Phase = 'ready' | 'run' | 'debrief'

export default function DeliveryGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sim = useRef<DeliveryState>(makeDelivery())
  const keys = useRef({ up: false, down: false, left: false, right: false })
  const pad = useRef({ up: false, down: false, left: false, right: false })
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState({ t: 0, limit: TIME_LIMIT, delivered: 0, events: 0, fast: false })
  const reduced = useReducedMotion()
  const lastEvents = useRef(0)
  const lastDelivered = useRef(0)
  /** Several fixed steps can run in one frame: the end-of-shift block must run once. */
  const ended = useRef(false)

  const input = () => {
    const k = keys.current
    const p = pad.current
    return { x: (k.right || p.right ? 1 : 0) - (k.left || p.left ? 1 : 0), y: (k.down || p.down ? 1 : 0) - (k.up || p.up ? 1 : 0) }
  }

  const step = useCallback((dt: number) => {
    if (ended.current) return
    const s = sim.current
    stepDelivery(s, input(), dt)
    const ev = safetyEvents(s)
    const del = WARDS.filter((w) => s.delivered[w.id]).length
    if (ev > lastEvents.current) {
      lastEvents.current = ev
      playSound('wrong')
      buzz(120)
    }
    if (del > lastDelivered.current) {
      lastDelivered.current = del
      playSound('correct')
    }
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
    const cs = Math.min(w / COLS, h / ROWS)
    const ox = (w - cs * COLS) / 2
    const oy = (h - cs * ROWS) / 2
    const m2px = cs / CELL_M
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = COL.void
    ctx.fillRect(0, 0, w, h)
    // floor + walls
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const ch = MAP[y][x]
        const px = ox + x * cs
        const py = oy + y * cs
        if (ch === '#') {
          ctx.fillStyle = '#0D1729'
          ctx.fillRect(px, py, cs + 0.5, cs + 0.5)
        } else {
          ctx.fillStyle = (x + y) % 2 ? '#2A3D60' : '#2E4268'
          ctx.fillRect(px, py, cs + 0.5, cs + 0.5)
        }
      }
    // charger
    const hx = ox + HOME.x * m2px
    const hy = oy + HOME.y * m2px
    ctx.fillStyle = 'rgba(252,104,24,.22)'
    rr(ctx, hx - cs * 0.42, hy - cs * 0.42, cs * 0.84, cs * 0.84, 6)
    ctx.fill()
    ctx.font = `${Math.round(cs * 0.42)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🔌', hx, hy)
    // wards
    for (const wd of WARDS) {
      const x = ox + wd.x * m2px
      const y = oy + wd.y * m2px
      ctx.fillStyle = s.delivered[wd.id] ? 'rgba(34,197,94,.35)' : wd.colour + '55'
      rr(ctx, x - cs * 0.44, y - cs * 0.44, cs * 0.88, cs * 0.88, 8)
      ctx.fill()
      ctx.strokeStyle = s.delivered[wd.id] ? COL.green : wd.colour
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillText(s.delivered[wd.id] ? '✅' : wd.icon, x, y)
    }
    // people
    ctx.font = `${Math.round(cs * 0.5)}px system-ui, sans-serif`
    for (const p of s.people) {
      const x = ox + p.x * m2px
      const y = oy + p.y * m2px
      ctx.fillStyle = 'rgba(0,229,255,.16)'
      ctx.beginPath()
      ctx.arc(x, y, PERSON_R * m2px * 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillText(p.icon, x, y)
    }
    // robot + laser safety fields
    const rx = ox + s.x * m2px
    const ry = oy + s.y * m2px
    const speed = Math.hypot(s.vx, s.vy)
    const near = s.people.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < SLOW_FIELD)
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5
    ctx.strokeStyle = near ? 'rgba(255,168,120,.9)' : 'rgba(255,255,255,.22)'
    ctx.beginPath()
    ctx.arc(rx, ry, SLOW_FIELD * m2px, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.save()
    ctx.translate(rx, ry)
    ctx.rotate(s.heading)
    // Stop field: a box in front of the robot that grows with speed.
    const r = ROBOT_R * m2px
    const boxL = (ROBOT_R + stopField(speed)) * m2px
    const boxW = STOP_HALF_W * m2px
    ctx.fillStyle = s.stopHold > 0 ? 'rgba(239,68,68,.35)' : 'rgba(239,68,68,.14)'
    ctx.fillRect(0, -boxW, boxL, 2 * boxW)
    ctx.strokeStyle = s.stopHold > 0 ? COL.red : 'rgba(239,68,68,.7)'
    ctx.lineWidth = s.stopHold > 0 ? 3 : 1.5
    ctx.strokeRect(0, -boxW, boxL, 2 * boxW)
    ctx.fillStyle = COL.amber
    rr(ctx, -r, -r, 2 * r, 2 * r, r * 0.4)
    ctx.fill()
    ctx.fillStyle = '#1A1103'
    ctx.fillRect(r * 0.35, -r * 0.55, r * 0.4, r * 1.1) // lidar window at the front
    ctx.restore()
    // boxes still on board
    const left = WARDS.filter((wd) => !s.delivered[wd.id]).length
    ctx.fillStyle = COL.text1
    ctx.font = `bold ${Math.max(10, Math.round(cs * 0.32))}px system-ui, sans-serif`
    if (left) ctx.fillText(`💊×${left}`, rx, ry - r - cs * 0.28)
    // flash
    if (s.flash) {
      const msg = s.flash.text
      ctx.font = `bold ${Math.max(13, Math.round(cs * 0.42))}px system-ui, sans-serif`
      const tw = ctx.measureText(msg).width + 24
      const bx = w / 2 - tw / 2
      const by = oy + 6
      ctx.globalAlpha = reduced ? 1 : Math.min(1, s.flash.ttl * 2)
      ctx.fillStyle = s.flash.kind === 'good' ? 'rgba(22,101,52,.92)' : s.flash.kind === 'warn' ? 'rgba(146,64,14,.92)' : 'rgba(127,29,29,.92)'
      rr(ctx, bx, by, tw, cs * 0.75, 10)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(msg, w / 2, by + cs * 0.38)
      ctx.globalAlpha = 1
    }
  }, [reduced])

  useSimLoop(phase === 'run', step, draw, 60)

  // HUD at 5 Hz
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = sim.current
      setHud({ t: s.t, limit: s.timeLimit, delivered: WARDS.filter((w) => s.delivered[w.id]).length, events: safetyEvents(s), fast: s.fast })
    }, 200)
    return () => window.clearInterval(id)
  }, [])

  // keyboard
  useEffect(() => {
    const map: Record<string, keyof typeof keys.current> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON') && e.code === 'Space') return
      const k = map[e.code]
      if (k && phase === 'run') {
        e.preventDefault()
        keys.current[k] = true
      }
      if (e.code === 'Space' && phase === 'run') {
        e.preventDefault()
        sim.current.fast = !sim.current.fast
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = map[e.code]
      if (k) keys.current[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [phase])

  const setPad = (k: keyof typeof pad.current) => (v: boolean) => {
    pad.current[k] = v
  }

  const s = sim.current
  const finish = () => {
    const stars = deliveryStars(s)
    const ev = safetyEvents(s)
    onFinish({
      stars,
      score: deliveryScore(s),
      scoreLabel: 'points',
      message: s.done
        ? ev === 0
          ? `All three wards got their medicine in ${s.t.toFixed(0)} s with zero safety problems — a model hospital robot.`
          : `All three wards got their medicine in ${s.t.toFixed(0)} s, with ${ev} safety problem${ev === 1 ? '' : 's'}. Slow down earlier near people for more stars.`
        : `Time ran out with ${WARDS.filter((w) => s.delivered[w.id]).length} of 3 deliveries. Plan the order of the wards before you drive.`,
    })
  }

  const debrief = (): DebriefLine[] => {
    const lines: DebriefLine[] = []
    const n = WARDS.filter((w) => s.delivered[w.id]).length
    lines.push({ icon: '💊', text: `${n} of 3 wards got their medicine${s.done ? ' and the robot is back on its charger' : ''}. Time: ${s.t.toFixed(0)} s${Number.isFinite(s.timeLimit) ? ` of ${Math.round(s.timeLimit)} s` : ''}. It drove ${s.distance.toFixed(0)} m.` })
    if (s.fastNearPerson)
      lines.push({
        icon: '🐢',
        text: `You drove fast near a person ${s.fastNearPerson} time${s.fastNearPerson === 1 ? '' : 's'} (top speed near people: ${s.worstNearSpeed.toFixed(1)} m/s). A robot needs room to stop: at ${FAST} m/s it needs ${stopDist(FAST).toFixed(2)} m to brake, at ${CAREFUL} m/s only ${stopDist(CAREFUL).toFixed(2)} m.`,
      })
    else lines.push({ icon: '🐢', text: 'You always slowed down near people — exactly what real delivery robots do with their laser scanners.' })
    if (s.autoStops) lines.push({ icon: '🛑', text: `The robot made ${s.autoStops} automatic safety stop${s.autoStops === 1 ? '' : 's'}: someone was inside the red stop box in front of it. Safe — but each one cost time. Keeping to the right and driving slowly near people avoids them: people step aside for a slow robot.` })
    if (s.bumps) lines.push({ icon: '💥', text: `${s.bumps} wall bump${s.bumps === 1 ? '' : 's'}. Real robots have a soft bumper switch that stops the motors on any touch.` })
    if (!s.done) lines.push({ icon: '🗺️', text: 'Tip: the eye clinic is at the bottom left, the heart ward in the middle, the children’s ward top right. Pick an order that does not go back and forth.' })
    return lines
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <canvas
            ref={canvas}
            className="aspect-[13/9] w-full rounded-[28px] border border-white/10 bg-[#0A1120]"
            role="img"
            aria-label={`Hospital map. ${hud.delivered} of 3 deliveries done. ${hud.events} safety problems.`}
          />
          {phase === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[#0A1120]/75 p-4">
              <div className="max-w-sm text-center">
                <p className="text-4xl" aria-hidden>
                  📦
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">Medicine Run</h3>
                <p className="mt-2 text-[16px] leading-snug text-[#EEF2F8]">
                  Take medicine to the <b>three coloured ward doors</b>, then drive back to the 🔌 charger. Slow down near people — watch the dotted ring.
                </p>
                <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                  Keep to the <b className="text-[#EEF2F8]">right</b> of the corridor, like the people do. They step aside for a slow robot, so you can pass.
                </p>
                <PrimaryButton className="mt-4" onClick={() => setPhase('run')}>
                  Start the shift
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
        {phase === 'debrief' && <Debrief title={s.done ? 'Shift complete!' : 'Shift over'} good={s.done} lines={debrief()} onContinue={finish} />}
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Drive">
          <div className="flex items-center justify-between gap-3">
            <div className="grid grid-cols-3 grid-rows-3 gap-1.5" aria-label="Driving pad">
              <span />
              <HoldButton label="Drive up" onChange={setPad('up')}>
                ▲
              </HoldButton>
              <span />
              <HoldButton label="Drive left" onChange={setPad('left')}>
                ◀
              </HoldButton>
              <span className="flex items-center justify-center text-2xl" aria-hidden>
                🤖
              </span>
              <HoldButton label="Drive right" onChange={setPad('right')}>
                ▶
              </HoldButton>
              <span />
              <HoldButton label="Drive down" onChange={setPad('down')}>
                ▼
              </HoldButton>
              <span />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <GhostButton
                pressed={!hud.fast}
                onClick={() => {
                  sim.current.fast = !sim.current.fast
                  setHud((h) => ({ ...h, fast: sim.current.fast }))
                  playSound('click')
                }}
              >
                {hud.fast ? '🐇 Fast' : '🐢 Careful'}
              </GhostButton>
              <p className="text-[13px] leading-snug text-[#A7B0C0]">Tap to switch speed (Space). Arrows or WASD drive.</p>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Time" value={`${hud.t.toFixed(0)} s`} tone={hud.t > hud.limit - 20 ? 'warn' : 'plain'} />
            <Stat label="Wards" value={`${hud.delivered}/3`} tone={hud.delivered === 3 ? 'good' : 'plain'} />
            <Stat label="Safety" value={hud.events === 0 ? '✓' : `${hud.events} ⚠`} tone={hud.events === 0 ? 'good' : 'bad'} />
          </div>
        </Panel>
        <Panel>
          <ul className="space-y-1 text-[14px] leading-snug text-[#A7B0C0]">
            <li>
              <span className="font-bold text-amber-300">Dotted ring</span> — slow zone: go careful when a person is inside it.
            </li>
            <li>
              <span className="font-bold text-rose-300">Red box</span> — stop zone in front of the robot. It grows when you go fast, because a fast robot needs more room to brake.
            </li>
            <li>
              <span className="font-bold text-cyan-300">Keep right</span> — pass people on your right-hand side of the corridor. If the robot stops, steer a little to the right and go on slowly.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
