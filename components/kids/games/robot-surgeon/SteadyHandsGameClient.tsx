'use client'

// components/kids/games/robot-surgeon/SteadyHandsGameClient.tsx
// PILOT — Steady Hands: steer a surgical tool tip along a narrow channel from
// a console. Choose the motion scaling and switch tremor filtering on or off,
// then see how each changes accuracy. Model in ./steady.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { COL, buzz, fitCanvas, rr, useSimLoop } from './shared'
import {
  BOARD_H,
  BOARD_W,
  HALF_W,
  KEY_SPEED,
  MM_PER_PX,
  PATH,
  STAR_TIME,
  TIME_LIMIT,
  TREMOR_MM,
  accuracy,
  expectedShake,
  makeSteady,
  shakeRms,
  stepSteady,
  steadyStars,
  type SteadySettings,
  type SteadyState,
} from './steady'
import { Debrief, Panel, Segmented, Stat, type DebriefLine } from './UiClient'

interface RunRecord {
  scale: number
  filter: boolean
  acc: number
  t: number
  finished: boolean
}
/** This visit's runs, so the child can compare settings across rounds. */
const HISTORY: RunRecord[] = []

export default function SteadyHandsGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [settings, setSettings] = useState<SteadySettings>({ scale: 1, filter: false })
  const sim = useRef<SteadyState>(makeSteady(settings))
  const pending = useRef({ x: 0, y: 0 })
  const keys = useRef({ up: false, down: false, left: false, right: false })
  const last = useRef<{ x: number; y: number } | null>(null)
  const [over, setOver] = useState(false)
  const [hud, setHud] = useState({ t: 0, acc: 1, started: false, progress: 0, touches: 0 })
  const lastTouches = useRef(0)
  /** Several fixed steps can run in one frame: the end-of-run block must run once. */
  const ended = useRef(false)

  const apply = (next: SteadySettings) => {
    if (sim.current.started) return
    setSettings(next)
    sim.current = makeSteady(next)
    playSound('click')
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
    stepSteady(s, dx, dy, dt)
    if (s.touches > lastTouches.current) {
      lastTouches.current = s.touches
      buzz(25)
    }
    if (s.finished || s.timeUp) {
      ended.current = true
      playSound(s.finished ? 'star' : 'wrong')
      HISTORY.push({ scale: s.settings.scale, filter: s.settings.filter, acc: accuracy(s), t: s.t, finished: s.finished })
      setOver(true)
    }
  }, [])

  const draw = useCallback(() => {
    const f = fitCanvas(canvas.current)
    if (!f) return
    const { ctx, w, h } = f
    const s = sim.current
    const k = Math.min(w / BOARD_W, h / BOARD_H)
    const ox = (w - BOARD_W * k) / 2
    const oy = (h - BOARD_H * k) / 2
    const X = (x: number) => ox + x * k
    const Y = (y: number) => oy + y * k
    // camera view: a soft, abstract practice board
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7)
    g.addColorStop(0, '#2A3B5E')
    g.addColorStop(1, '#0E1830')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // grid (1 mm minor, 5 mm major) — the "3D camera" scale
    ctx.lineWidth = 1
    for (let x = 0; x <= BOARD_W; x += 5) {
      ctx.strokeStyle = x % 10 === 0 ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.04)'
      ctx.beginPath()
      ctx.moveTo(X(x), Y(0))
      ctx.lineTo(X(x), Y(BOARD_H))
      ctx.stroke()
    }
    for (let y = 0; y <= BOARD_H; y += 5) {
      ctx.strokeStyle = y % 10 === 0 ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.04)'
      ctx.beginPath()
      ctx.moveTo(X(0), Y(y))
      ctx.lineTo(X(BOARD_W), Y(y))
      ctx.stroke()
    }
    // channel
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const trace = (lw: number, colour: string, upto = PATH.length) => {
      ctx.strokeStyle = colour
      ctx.lineWidth = lw
      ctx.beginPath()
      for (let i = 0; i < upto; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(PATH[i].x), Y(PATH[i].y))
      ctx.stroke()
    }
    trace(HALF_W * 2 * k + 4, 'rgba(0,229,255,.35)')
    trace(HALF_W * 2 * k, '#0B2B3A')
    trace(Math.max(1, HALF_W * 2 * k - 2), 'rgba(0,229,255,.10)')
    if (s.progress > 0) trace(2, 'rgba(34,197,94,.8)', s.progress + 1)
    // start / finish
    const st = PATH[0]
    const en = PATH[PATH.length - 1]
    ctx.fillStyle = COL.green
    ctx.beginPath()
    ctx.arc(X(st.x), Y(st.y), 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COL.amber
    ctx.beginPath()
    ctx.arc(X(en.x), Y(en.y), 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COL.text1
    ctx.font = 'bold 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('START', X(st.x), Y(st.y) + 18)
    ctx.fillText('FINISH', X(en.x), Y(en.y) - 14)
    // trail
    for (const p of s.trail) {
      ctx.fillStyle = p.ok ? 'rgba(255,168,120,.55)' : 'rgba(239,68,68,.9)'
      ctx.fillRect(X(p.x) - 1, Y(p.y) - 1, 2, 2)
    }
    // tool tip: two small jaws + a ring
    const tx = X(s.tx)
    const ty = Y(s.ty)
    ctx.strokeStyle = s.outNow ? COL.red : COL.amber
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(tx, ty, 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#D9E2F1'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(tx + 26, ty - 26)
    ctx.lineTo(tx + 4, ty - 4)
    ctx.stroke()
    ctx.fillStyle = COL.amber
    ctx.beginPath()
    ctx.arc(tx, ty, 2.5, 0, Math.PI * 2)
    ctx.fill()
    // scale bar
    ctx.fillStyle = 'rgba(10,17,32,.7)'
    rr(ctx, 8, h - 30, 96, 22, 8)
    ctx.fill()
    ctx.strokeStyle = COL.text1
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(16, h - 19)
    ctx.lineTo(16 + 5 * k, h - 19)
    ctx.stroke()
    ctx.fillStyle = COL.text1
    ctx.textAlign = 'left'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('5 mm', 20 + 5 * k, h - 15)
  }, [])

  useSimLoop(!over, step, draw, 120)

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = sim.current
      setHud({ t: s.t, acc: accuracy(s), started: s.started, progress: s.progress / (PATH.length - 1), touches: s.touches })
    }, 200)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const map: Record<string, keyof typeof keys.current> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
    const down = (e: KeyboardEvent) => {
      const k = map[e.code]
      if (!k || over) return
      const t = e.target as HTMLElement | null
      if (t && t.tagName === 'INPUT') return
      e.preventDefault()
      keys.current[k] = true
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
  }, [over])

  const s = sim.current
  const exp = expectedShake(settings)

  const finish = () => {
    const stars = steadyStars(s)
    const acc = accuracy(s)
    onFinish({
      stars,
      score: Math.round(acc * 1000) / 10,
      scoreLabel: '% inside the channel',
      message: s.finished
        ? `You finished in ${s.t.toFixed(1)} s at ${s.settings.scale}:1 scaling with the tremor filter ${s.settings.filter ? 'on' : 'off'}. The tool stayed inside ${Math.round(acc * 100)}% of the time.`
        : `Time ran out. Try 3:1 scaling with the filter on — steadier, and still quick enough.`,
    })
  }

  const debrief = (): DebriefLine[] => {
    const acc = accuracy(s)
    const lines: DebriefLine[] = [
      {
        icon: '🖐️',
        text: `Your hand shook about ±${TREMOR_MM} mm, 9–11 times a second (we made the shake bigger than a real surgeon’s so you can see it). The channel is only ±${HALF_W} mm wide.`,
      },
      {
        icon: '🔍',
        text: `At ${s.settings.scale}:1 scaling the shake reaching the tool was divided by ${s.settings.scale}${s.settings.filter ? ', then the filter cut out most of what was left' : ''}: about ±${exp.toFixed(2)} mm (measured: ${shakeRms(s).toFixed(2)} mm on average).`,
      },
      {
        icon: '🎯',
        text: `The tool stayed inside ${Math.round(acc * 100)}% of the time and touched the edge ${s.touches} time${s.touches === 1 ? '' : 's'}.`,
      },
    ]
    if (s.settings.scale > 1) lines.push({ icon: '⏱️', text: `The price of scaling: your hand travelled ${s.handTravel.toFixed(0)} mm, ${s.settings.scale} times further than the tool. Lift your finger and move again — like the clutch pedal real surgeons use to re-centre their hands.` })
    else lines.push({ icon: '💡', text: 'At 1:1 every tiny wobble of your finger goes straight to the tool. Try 3:1 or 5:1: big, comfortable hand moves become small, precise tool moves.' })
    if (!s.settings.filter) lines.push({ icon: '🧹', text: 'The tremor filter was off. It lets slow, meant movements through and blocks fast shakes — try it on.' })
    else lines.push({ icon: '🧹', text: 'The filter blocked the fast shake but added a tiny delay: the tool glides after your hand instead of jumping.' })
    if (s.finished && s.t > STAR_TIME && accuracy(s) >= 0.96)
      lines.push({ icon: '⭐', text: `Steady, but it took ${s.t.toFixed(0)} s — three stars need ${STAR_TIME} s or less. Real surgeons pick the scaling that is steady enough AND quick enough: often 3:1 with the filter on.` })
    return lines
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <canvas ref={canvas} className="aspect-[5/3] w-full rounded-[28px] border border-white/10" role="img" aria-label={`Camera view of the practice board. Progress ${Math.round(hud.progress * 100)}%.`} />
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#0A1120]/70 px-2 py-1 text-[12px] font-bold text-cyan-200">3D camera · ×10 zoom</span>
        </div>
        {over ? (
          <Debrief title={s.finished ? 'Channel complete!' : 'Out of time'} good={s.finished && accuracy(s) >= 0.75} lines={debrief()} onContinue={finish} />
        ) : (
          <div
            role="application"
            aria-label="Hand control pad. Drag to move your hand, or use the arrow keys."
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
            className="flex h-[170px] cursor-grab select-none flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-cyan-300/40 bg-[#111C32] text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:cursor-grabbing sm:h-[190px]"
          >
            <p className="font-display text-lg font-bold text-[#EEF2F8]">✋ Hand control</p>
            <p className="max-w-xs text-[14px] leading-snug text-[#A7B0C0]">Drag here to move your hand. Lift and drag again to keep going (that is the clutch). Keys: arrows / WASD.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Panel>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Time" value={`${hud.t.toFixed(0)} s`} tone={hud.t > TIME_LIMIT - 15 ? 'warn' : 'plain'} />
            <Stat label="Inside" value={hud.started ? `${Math.round(hud.acc * 100)}%` : '—'} tone={!hud.started ? 'plain' : hud.acc >= 0.9 ? 'good' : hud.acc >= 0.75 ? 'warn' : 'bad'} />
            <Stat label="Done" value={`${Math.round(hud.progress * 100)}%`} />
          </div>
        </Panel>
        <Panel title="Console settings">
          <div className="flex flex-col gap-3">
            <Segmented
              label="Motion scaling (hand : tool)"
              value={settings.scale}
              disabled={hud.started}
              onChange={(v) => apply({ ...settings, scale: v })}
              options={[
                { value: 1, label: '1 : 1' },
                { value: 3, label: '3 : 1' },
                { value: 5, label: '5 : 1' },
              ]}
            />
            <Segmented
              label="Tremor filter"
              value={settings.filter ? 'on' : 'off'}
              disabled={hud.started}
              onChange={(v) => apply({ ...settings, filter: v === 'on' })}
              options={[
                { value: 'off', label: 'Off' },
                { value: 'on', label: 'On' },
              ]}
            />
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-[13px] font-bold uppercase tracking-wide text-[#6E7888]">Shake reaching the tool</p>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div className={`h-full rounded-full ${exp > HALF_W * 0.8 ? 'bg-rose-400' : exp > HALF_W * 0.3 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, (exp / TREMOR_MM) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[14px] text-[#EEF2F8]">
                about ±{exp.toFixed(2)} mm <span className="text-[#A7B0C0]">(channel ±{HALF_W} mm)</span>
              </p>
            </div>
            <p className="text-[13px] leading-snug text-[#A7B0C0]">{hud.started ? 'Settings are locked while the tool is in the channel.' : 'Settings lock once the tool enters the channel. Move to the green START dot.'}</p>
            <p className="text-[13px] leading-snug text-[#A7B0C0]">⭐⭐⭐ Stay inside the channel and reach the end in {STAR_TIME} s or less.</p>
          </div>
        </Panel>
        {HISTORY.length > 0 && (
          <Panel title="Your runs this visit">
            <table className="w-full text-left text-[14px] text-[#EEF2F8]">
              <thead className="text-[12px] uppercase text-[#6E7888]">
                <tr>
                  <th className="py-1">Scale</th>
                  <th>Filter</th>
                  <th>Inside</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {HISTORY.slice(-5).map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="py-1">{r.scale}:1</td>
                    <td>{r.filter ? 'on' : 'off'}</td>
                    <td>{Math.round(r.acc * 100)}%</td>
                    <td>{r.finished ? `${r.t.toFixed(0)} s` : 'time up'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </div>
  )
}
