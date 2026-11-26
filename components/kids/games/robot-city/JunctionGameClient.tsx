'use client'

// components/kids/games/robot-city/JunctionGameClient.tsx
// ACE — Junction Timer: set the green times of a busy crossroads (and whether
// the lights are smart), then watch three minutes of mixed human and
// self-driving traffic. Model in ./junction.ts.

import { useCallback, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  ALL_RED,
  AMBER,
  APPROACHES,
  HUMAN,
  LOST,
  MAX_WAIT_OK,
  RATE,
  ROBOT,
  SIM_T,
  STAR3_AVG,
  junctionStars,
  runJunction,
  type Approach,
  type JunctionFrame,
  type JunctionResult,
  type JunctionSettings,
  type Light,
} from './junction'
import { COL, fitCanvas, rr, useReducedMotion, useSimLoop } from './shared'
import { Debrief, GhostButton, Panel, PrimaryButton, Slider, Stat, type DebriefLine } from './UiClient'

type Phase = 'setup' | 'run' | 'debrief'
const ROBOT_SHARE = 0.3
const FRAME_DT = 0.2

/** Webster's (1958) optimum cycle for this junction, and the matching green split. */
function webster() {
  const h = (1 - ROBOT_SHARE) * HUMAN.headway + ROBOT_SHARE * ROBOT.headway
  const sat = 1 / h
  const yNS = Math.max(RATE.N, RATE.S) / sat
  const yEW = Math.max(RATE.E, RATE.W) / sat
  const Y = yNS + yEW
  const startup = (1 - ROBOT_SHARE) * HUMAN.startup + ROBOT_SHARE * ROBOT.startup
  const L = 2 * (LOST + startup - h)
  const C = (1.5 * L + 5) / (1 - Y)
  const g = C - L
  return { C, ns: (g * yNS) / Y, ew: (g * yEW) / Y, Y }
}

export default function JunctionGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [set, setSet] = useState<JunctionSettings>({ greenNS: 12, greenEW: 30, smart: false, robotShare: ROBOT_SHARE })
  const [phase, setPhase] = useState<Phase>('setup')
  const [result, setResult] = useState<JunctionResult | null>(null)
  const [tests, setTests] = useState(0)
  const [best, setBest] = useState<number | null>(null)
  const play = useRef({ t: 0, idx: 0 })
  const [hud, setHud] = useState({ t: 0, served: 0, queued: 0 })
  const reduced = useReducedMotion()
  const W = useMemo(webster, [])

  const start = () => {
    const r = runJunction(set)
    setResult(r)
    setTests((n) => n + 1)
    play.current = { t: 0, idx: 0 }
    playSound('click')
    setPhase('run')
  }

  const end = useCallback(() => {
    if (!result) return
    const f = result.frames[result.frames.length - 1]
    play.current.idx = result.frames.length - 1
    setHud({ t: SIM_T, served: result.served, queued: APPROACHES.reduce((n, a) => n + f.queues[a].length, 0) })
    setBest((b) => (b === null ? result.avgWait : Math.min(b, result.avgWait)))
    playSound(junctionStars(result) > 0 ? 'star' : 'wrong')
    setPhase('debrief')
  }, [result])

  const step = useCallback(
    (dt: number) => {
      const r = result
      if (!r) return
      const pc = play.current
      pc.t += dt * 6
      pc.idx = Math.min(r.frames.length - 1, Math.floor(pc.t / FRAME_DT))
      const f = r.frames[pc.idx]
      if (pc.idx % 3 === 0) setHud({ t: f.t, served: f.served, queued: APPROACHES.reduce((n, a) => n + f.queues[a].length, 0) })
      if (pc.idx >= r.frames.length - 1) end()
    },
    [result, end],
  )

  const draw = useCallback(() => {
    const fc = fitCanvas(canvas.current)
    if (!fc) return
    const { ctx, w, h } = fc
    const r = result
    const f: JunctionFrame | null = r ? r.frames[play.current.idx] : null
    const cx = w / 2
    const cy = h / 2
    const u = Math.min(w, h) / 30 // one car length-ish unit
    const half = u * 3 // half road width
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#16233B'
    ctx.fillRect(0, 0, w, h)
    // corner blocks
    ctx.fillStyle = '#1F3152'
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const x0 = sx < 0 ? 8 : cx + half + u * 1.2
      const y0 = sy < 0 ? 8 : cy + half + u * 1.2
      rr(ctx, x0, y0, cx - half - u * 1.2 - 8, cy - half - u * 1.2 - 8, 10)
      ctx.fill()
    }
    // roads
    ctx.fillStyle = '#2A2F3A'
    ctx.fillRect(cx - half, 0, half * 2, h)
    ctx.fillRect(0, cy - half, w, half * 2)
    ctx.strokeStyle = 'rgba(255,255,255,.5)'
    ctx.setLineDash([u * 0.7, u * 0.7])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, cy - half)
    ctx.moveTo(cx, cy + half)
    ctx.lineTo(cx, h)
    ctx.moveTo(0, cy)
    ctx.lineTo(cx - half, cy)
    ctx.moveTo(cx + half, cy)
    ctx.lineTo(w, cy)
    ctx.stroke()
    ctx.setLineDash([])
    // stop lines
    ctx.fillStyle = 'rgba(255,255,255,.85)'
    ctx.fillRect(cx - half, cy - half - 3, half, 3) // N approach (cars come down on the left of centre)
    ctx.fillRect(cx, cy + half, half, 3) // S
    ctx.fillRect(cx + half, cy - half, 3, half) // E
    ctx.fillRect(cx - half - 3, cy, 3, half) // W
    const lightCol = (l: Light) => (l === 'green' ? COL.green : l === 'amber' ? '#F59E0B' : COL.red)
    const ns = f?.lightNS ?? 'red'
    const ew = f?.lightEW ?? 'red'
    const lamp = (x: number, y: number, l: Light) => {
      ctx.fillStyle = '#0B1220'
      ctx.beginPath()
      ctx.arc(x, y, u * 0.75, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = lightCol(l)
      ctx.beginPath()
      ctx.arc(x, y, u * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    lamp(cx - half - u, cy - half - u, ns)
    lamp(cx + half + u, cy + half + u, ns)
    lamp(cx + half + u, cy - half - u, ew)
    lamp(cx - half - u, cy + half + u, ew)
    // queued cars
    const carLen = u * 1.15
    const carW = u * 1.0
    const drawCar = (x: number, y: number, vertical: boolean, robot: boolean) => {
      const cw = vertical ? carW : carLen
      const ch = vertical ? carLen : carW
      ctx.fillStyle = robot ? '#00B8D4' : '#E2E8F0'
      rr(ctx, x - cw / 2, y - ch / 2, cw, ch, 3)
      ctx.fill()
      if (robot) {
        ctx.fillStyle = '#0A1120'
        ctx.beginPath()
        ctx.arc(x, y, u * 0.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (f) {
      const gapPx = carLen + u * 0.35
      const laneOff = half / 2
      const place: Record<Approach, (i: number) => [number, number, boolean]> = {
        N: (i) => [cx - laneOff, cy - half - u * 0.9 - i * gapPx, true],
        S: (i) => [cx + laneOff, cy + half + u * 0.9 + i * gapPx, true],
        E: (i) => [cx + half + u * 0.9 + i * gapPx, cy - laneOff, false],
        W: (i) => [cx - half - u * 0.9 - i * gapPx, cy + laneOff, false],
      }
      for (const a of APPROACHES) f.queues[a].forEach((v, i) => {
        const [x, y, vert] = place[a](i)
        if (x > -carLen && x < w + carLen && y > -carLen && y < h + carLen) drawCar(x, y, vert, v.robot)
      })
      // cars moving through the junction
      for (const c of f.crossing) {
        const p = c.age / 2.4
        const dist = (half * 2 + u * 6) * p
        const [x0, y0, vert] = place[c.a](0)
        const dx = c.a === 'N' ? 0 : c.a === 'S' ? 0 : c.a === 'E' ? -1 : 1
        const dy = c.a === 'N' ? 1 : c.a === 'S' ? -1 : 0
        drawCar(x0 + dx * dist, y0 + dy * dist, vert, c.robot)
      }
      // queue badges (true length, even beyond the screen)
      ctx.font = `bold ${Math.max(11, Math.round(u * 0.9))}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const badge = (a: Approach, x: number, y: number) => {
        const n = f.queues[a].length
        ctx.fillStyle = n >= 10 ? 'rgba(127,29,29,.9)' : 'rgba(10,17,32,.85)'
        rr(ctx, x - u * 1.6, y - u * 0.7, u * 3.2, u * 1.4, 6)
        ctx.fill()
        ctx.fillStyle = COL.text1
        ctx.fillText(`${a} ${n}`, x, y)
      }
      badge('N', cx - half - u * 2.6, u * 1.2)
      badge('S', cx + half + u * 2.6, h - u * 1.2)
      badge('E', w - u * 2, cy - half - u * 1.4)
      badge('W', u * 2, cy + half + u * 1.4)
    }
    // clock
    ctx.fillStyle = 'rgba(10,17,32,.85)'
    rr(ctx, 10, 10, u * 6, u * 1.8, 8)
    ctx.fill()
    ctx.fillStyle = COL.text1
    ctx.textAlign = 'left'
    ctx.font = `bold ${Math.max(12, Math.round(u * 0.95))}px system-ui, sans-serif`
    ctx.fillText(`⏱ ${Math.floor(f?.t ?? 0)} / ${SIM_T} s`, 10 + u * 0.4, 10 + u * 0.9)
    void reduced
  }, [result, reduced])

  useSimLoop(phase === 'run', step, draw, 60)

  const r = result
  const stars = r ? junctionStars(r) : 0

  const debrief = (): DebriefLine[] => {
    if (!r) return []
    const lines: DebriefLine[] = []
    lines.push({ icon: '🚦', text: `${r.served} cars crossed in ${SIM_T / 60} minutes. Average wait: ${r.avgWait.toFixed(1)} s. Longest wait: ${r.maxWait.toFixed(0)} s.` })
    const lostShare = (2 * LOST) / r.cycleLen
    if (!set.smart)
      lines.push({
        icon: '🔁',
        text: `Your cycle is ${r.cycleLen} s, and ${(lostShare * 100).toFixed(0)}% of it is amber and all-red time when nobody moves. ${lostShare > 0.3 ? 'Short cycles waste a lot of time changing.' : r.cycleLen > 90 ? 'Long cycles make the red road wait a long time.' : 'A good balance.'}`,
      })
    else lines.push({ icon: '📡', text: `Smart mode: sensors ended a green early when its road was empty, so the other road got its turn sooner. Your greens were the maximums.` })
    if (r.maxWait > MAX_WAIT_OK) lines.push({ icon: '⚖️', text: `Someone waited ${r.maxWait.toFixed(0)} s — over the ${MAX_WAIT_OK} s fairness limit. A junction must be fair to the quiet road too.` })
    const ratio = set.greenNS / Math.max(1, set.greenEW)
    if (ratio < 1.2 && !set.smart) lines.push({ icon: '📊', text: `North–south has about twice the traffic of east–west, so it needs a longer green — not ${ratio < 0.9 ? 'a shorter' : 'the same'} one.` })
    const all = runJunction({ ...set, robotShare: 1 }, 7, false)
    const none = runJunction({ ...set, robotShare: 0 }, 7, false)
    lines.push({
      icon: '🤖',
      text: `30% of these cars were self-driving: they start the moment the light turns green and follow closer. Same lights with no robot cars: ${none.avgWait.toFixed(1)} s average wait; with all robot cars: ${all.avgWait.toFixed(1)} s.`,
    })
    lines.push({ icon: '📐', text: `Traffic engineers use Webster’s formula. Here it suggests a cycle of about ${W.C.toFixed(0)} s: roughly ${W.ns.toFixed(0)} s north–south and ${W.ew.toFixed(0)} s east–west.` })
    return lines
  }

  const finish = () => {
    if (!r) return
    onFinish({
      stars,
      score: Number(r.avgWait.toFixed(1)),
      scoreLabel: 's average wait',
      lowerIsBetter: true,
      attempts: tests,
      message:
        stars === 3
          ? `Average wait ${r.avgWait.toFixed(1)} s and nobody waited over ${MAX_WAIT_OK} s: a well-timed junction.`
          : stars > 0
            ? `Average wait ${r.avgWait.toFixed(1)} s. Get it to ${STAR3_AVG} s or less, with nobody over ${MAX_WAIT_OK} s, for 3 stars.`
            : `Queues grew and grew (average wait ${r.avgWait.toFixed(0)} s). Give the busy road more green and avoid very short or very long cycles.`,
    })
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <canvas
            ref={canvas}
            className="aspect-[13/9] w-full rounded-[28px] border border-white/10 bg-[#0A1120]"
            role="img"
            aria-label={`Crossroads seen from above. ${hud.served} cars have crossed, ${hud.queued} are waiting.`}
          />
          {phase === 'setup' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[#0A1120]/80 p-4">
              <div className="max-w-md text-center">
                <p className="text-4xl" aria-hidden>
                  🚦
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">Junction Timer</h3>
                <p className="mt-2 text-[16px] leading-snug text-[#EEF2F8]">
                  You run the traffic lights at a busy crossroads. North–south is about twice as busy as east–west, and 3 in 10 cars drive themselves (
                  <span className="text-cyan-300">cyan</span>). Set the greens, run 3 minutes of traffic, and get the average wait down — fairly.
                </p>
                {best !== null && <p className="mt-2 text-[14px] text-[#A7B0C0]">Your best so far: {best.toFixed(1)} s</p>}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Time" value={`${Math.floor(hud.t)} s`} />
          <Stat label="Crossed" value={hud.served} tone="good" />
          <Stat label="Waiting" value={hud.queued} tone={hud.queued > 20 ? 'bad' : hud.queued > 10 ? 'warn' : 'plain'} />
        </div>
        {phase === 'debrief' && r && <Debrief title={stars === 3 ? 'Traffic flowing!' : stars > 0 ? 'Not bad — can you do better?' : 'Gridlock'} good={stars === 3} lines={debrief()} onContinue={finish} />}
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Light timing">
          <div className="flex flex-col gap-3">
            <Slider
              id="rc-ns"
              label={set.smart ? 'North–south green (max)' : 'North–south green'}
              value={set.greenNS}
              min={5}
              max={60}
              step={1}
              unit="s"
              disabled={phase === 'run'}
              onChange={(x) => setSet((p) => ({ ...p, greenNS: x }))}
            />
            <Slider
              id="rc-ew"
              label={set.smart ? 'East–west green (max)' : 'East–west green'}
              value={set.greenEW}
              min={5}
              max={60}
              step={1}
              unit="s"
              disabled={phase === 'run'}
              onChange={(x) => setSet((p) => ({ ...p, greenEW: x }))}
            />
            <GhostButton pressed={set.smart} disabled={phase === 'run'} onClick={() => setSet((p) => ({ ...p, smart: !p.smart }))}>
              {set.smart ? '📡 Smart sensors: ON' : '📡 Smart sensors: off'}
            </GhostButton>
            <p className="text-[13px] leading-snug text-[#A7B0C0]">
              Cycle: {set.greenNS + set.greenEW + 2 * LOST} s ({AMBER} s amber + {ALL_RED} s all-red at each change). {set.smart ? 'Smart: a green ends early once its road is empty for 2.5 s.' : ''}
            </p>
            {phase === 'setup' && (
              <PrimaryButton onClick={start} className="w-full">
                ▶ Run 3 minutes
              </PrimaryButton>
            )}
            {phase === 'run' && <GhostButton onClick={end}>⏭ Skip to the end</GhostButton>}
            {phase === 'debrief' && (
              <GhostButton
                onClick={() => {
                  setPhase('setup')
                  setHud({ t: 0, served: 0, queued: 0 })
                }}
              >
                ↺ Change timing and test again
              </GhostButton>
            )}
          </div>
        </Panel>
        <Panel>
          <ul className="space-y-1 text-[14px] leading-snug text-[#A7B0C0]">
            <li>
              <span className="font-bold text-[#EEF2F8]">White car</span> — human driver: about {HUMAN.headway} s between cars, {HUMAN.startup} s to get going.
            </li>
            <li>
              <span className="font-bold text-cyan-300">Cyan car</span> — self-driving: {ROBOT.headway} s between cars, {ROBOT.startup} s to start.
            </li>
            <li>Goal: average wait ≤ {STAR3_AVG} s, nobody over {MAX_WAIT_OK} s.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
