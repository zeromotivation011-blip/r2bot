'use client'

// components/kids/games/robot-city/CrossingGameClient.tsx
// CADET — Crossing Patrol: a pavement delivery robot must cross a signal
// crossing, a zebra crossing and a plain road. The robot drives itself along
// the pavement and waits at every kerb; the child is its remote helper and
// decides when it is safe to cross. Model in ./crossing.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  A_COMFORT,
  CAR_LEN,
  CAR_W,
  DOOR_X,
  LANE_W,
  PATH_Y,
  ROADS,
  ROAD_W,
  ROBOT_R,
  TIME_LIMIT,
  WORLD_H,
  WORLD_W,
  carY,
  crossingScore,
  crossingStars,
  goCross,
  hardBrakes,
  laneX,
  lights,
  makeCrossing,
  nearMisses,
  redMen,
  stepCrossing,
  stopDistance,
  type CrossingState,
} from './crossing'
import { COL, buzz, fitCanvas, rr, useReducedMotion, useSimLoop } from './shared'
import { Debrief, Panel, PrimaryButton, Stat, type DebriefLine } from './UiClient'

type Phase = 'ready' | 'run' | 'debrief'

const ZONE_REACT = 0.75

export default function CrossingGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sim = useRef<CrossingState>(makeCrossing())
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState({ t: 0, next: 0, robot: 'walk' as CrossingState['robot'], events: 0 })
  const reduced = useReducedMotion()
  const lastEvents = useRef(0)
  const lastNext = useRef(0)

  const step = useCallback((dt: number) => {
    const s = sim.current
    stepCrossing(s, dt)
    if (s.events.length > lastEvents.current) {
      lastEvents.current = s.events.length
      playSound('wrong')
      buzz(140)
    }
    if (s.next > lastNext.current) {
      lastNext.current = s.next
      playSound('correct')
    }
    if (s.robot === 'done' || s.timeUp) {
      playSound(s.robot === 'done' ? 'star' : 'wrong')
      setPhase('debrief')
    }
  }, [])

  const draw = useCallback(() => {
    const f = fitCanvas(canvas.current)
    if (!f) return
    const { ctx, w, h } = f
    const s = sim.current
    const k = Math.min(w / WORLD_W, h / WORLD_H)
    const ox = (w - k * WORLD_W) / 2
    const oy = (h - k * WORLD_H) / 2
    const X = (x: number) => ox + x * k
    const Y = (y: number) => oy + y * k
    ctx.clearRect(0, 0, w, h)
    // city blocks
    ctx.fillStyle = '#16233B'
    ctx.fillRect(X(0), Y(0), WORLD_W * k, WORLD_H * k)
    const blocks: [number, number][] = [
      [0, ROADS[0].cx - ROAD_W / 2],
      [ROADS[0].cx + ROAD_W / 2, ROADS[1].cx - ROAD_W / 2],
      [ROADS[1].cx + ROAD_W / 2, ROADS[2].cx - ROAD_W / 2],
      [ROADS[2].cx + ROAD_W / 2, WORLD_W],
    ]
    blocks.forEach(([a, b], i) => {
      for (const [y0, y1] of [
        [1.5, PATH_Y - 4],
        [PATH_Y + 4, WORLD_H - 1.5],
      ] as const) {
        ctx.fillStyle = i % 2 ? '#22345A' : '#1F3152'
        rr(ctx, X(a + 1.5), Y(y0), (b - a - 3) * k, (y1 - y0) * k, 6)
        ctx.fill()
        // windows
        ctx.fillStyle = 'rgba(255,214,150,.18)'
        for (let yy = y0 + 2; yy < y1 - 2; yy += 3.2)
          for (let xx = a + 3; xx < b - 3; xx += 3.2) ctx.fillRect(X(xx), Y(yy), 1.4 * k, 1.4 * k)
      }
    })
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // pavement
    ctx.fillStyle = '#3A4A66'
    ctx.fillRect(X(0), Y(PATH_Y - 2.6), WORLD_W * k, 5.2 * k)
    ctx.fillStyle = 'rgba(255,255,255,.06)'
    for (let x = 0; x < WORLD_W; x += 2) ctx.fillRect(X(x), Y(PATH_Y - 2.6), 0.08 * k, 5.2 * k)
    // roads
    const L = lights(s.t)
    for (const road of ROADS) {
      const x0 = road.cx - ROAD_W / 2
      ctx.fillStyle = '#2A2F3A'
      ctx.fillRect(X(x0), Y(0), ROAD_W * k, WORLD_H * k)
      // kerbs
      ctx.fillStyle = '#5B6B88'
      ctx.fillRect(X(x0 - 0.25), Y(0), 0.25 * k, WORLD_H * k)
      ctx.fillRect(X(x0 + ROAD_W), Y(0), 0.25 * k, WORLD_H * k)
      // centre line
      ctx.strokeStyle = 'rgba(255,255,255,.5)'
      ctx.lineWidth = Math.max(1, 0.15 * k)
      ctx.setLineDash([2 * k, 2 * k])
      ctx.beginPath()
      ctx.moveTo(X(road.cx), Y(0))
      ctx.lineTo(X(road.cx), Y(WORLD_H))
      ctx.stroke()
      ctx.setLineDash([])
      if (road.kind === 'zebra') {
        ctx.fillStyle = 'rgba(255,255,255,.85)'
        for (let x = x0 + 0.3; x < x0 + ROAD_W - 0.3; x += 1.2) ctx.fillRect(X(x), Y(PATH_Y - 1.6), 0.6 * k, 3.2 * k)
        // flashing beacons
        const on = reduced || Math.floor(s.t * 2) % 2 === 0
        ctx.fillStyle = on ? '#FFB020' : '#7A5A1E'
        for (const bx of [x0 - 0.9, x0 + ROAD_W + 0.9]) {
          ctx.beginPath()
          ctx.arc(X(bx), Y(PATH_Y - 2.2), 0.55 * k, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (road.kind === 'signal') {
        // crossing studs + stop lines
        ctx.strokeStyle = 'rgba(255,255,255,.7)'
        ctx.lineWidth = Math.max(1, 0.18 * k)
        ctx.setLineDash([0.5 * k, 0.5 * k])
        for (const yy of [PATH_Y - 1.5, PATH_Y + 1.5]) {
          ctx.beginPath()
          ctx.moveTo(X(x0), Y(yy))
          ctx.lineTo(X(x0 + ROAD_W), Y(yy))
          ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(255,255,255,.85)'
        ctx.fillRect(X(x0), Y(PATH_Y - 2.6), (ROAD_W / 2) * k, 0.3 * k)
        ctx.fillRect(X(road.cx), Y(PATH_Y + 2.3), (ROAD_W / 2) * k, 0.3 * k)
        // car lights (one each side)
        const carCol = L.car === 'green' ? '#22C55E' : L.car === 'amber' ? '#F59E0B' : '#EF4444'
        for (const [lx, ly] of [
          [x0 - 1.1, PATH_Y - 3.6],
          [x0 + ROAD_W + 1.1, PATH_Y + 3.6],
        ] as const) {
          ctx.fillStyle = '#0B1220'
          rr(ctx, X(lx) - 0.7 * k, Y(ly) - 1.4 * k, 1.4 * k, 2.8 * k, 3)
          ctx.fill()
          ctx.fillStyle = carCol
          ctx.beginPath()
          ctx.arc(X(lx), Y(ly), 0.5 * k, 0, Math.PI * 2)
          ctx.fill()
        }
        // walk signal at the robot's kerb
        const wx = x0 - 1.4
        const wy = PATH_Y + 3.4
        ctx.fillStyle = '#0B1220'
        rr(ctx, X(wx) - 1.1 * k, Y(wy) - 1.1 * k, 2.2 * k, 2.2 * k, 4)
        ctx.fill()
        const walkOn = L.walk === 'walk' || (L.walk === 'flash' && (reduced || Math.floor(s.t * 3) % 2 === 0))
        ctx.font = `${Math.round(k * 1.7)}px system-ui, sans-serif`
        ctx.fillText(walkOn ? '🚶' : '✋', X(wx), Y(wy))
        ctx.font = `${Math.round(k * 2.4)}px system-ui, sans-serif`
      }
    }
    // cars, with their stopping zones painted on the road ahead of them
    for (const c of s.cars) {
      const road = ROADS[c.road]
      const lx = laneX(road, c.dir)
      const { front, back } = carY(c)
      if (c.v > 0.3) {
        const react = c.v * ZONE_REACT
        const brake = (c.v * c.v) / (2 * A_COMFORT)
        const z0 = front
        const z1 = front + c.dir * react
        const z2 = z1 + c.dir * brake
        ctx.fillStyle = 'rgba(255,168,120,.28)'
        ctx.fillRect(X(lx - LANE_W / 2 + 0.3), Y(Math.min(z0, z1)), (LANE_W - 0.6) * k, Math.abs(z1 - z0) * k)
        ctx.fillStyle = 'rgba(252,104,24,.5)'
        ctx.fillRect(X(lx - LANE_W / 2 + 0.3), Y(Math.min(z1, z2)), (LANE_W - 0.6) * k, Math.abs(z2 - z1) * k)
        ctx.fillStyle = '#FFA878'
        ctx.fillRect(X(lx - LANE_W / 2 + 0.3), Y(z2) - 1, (LANE_W - 0.6) * k, 2)
      }
      const y0 = Math.min(front, back)
      ctx.fillStyle = c.colour
      rr(ctx, X(lx - CAR_W / 2), Y(y0), CAR_W * k, CAR_LEN * k, 0.5 * k)
      ctx.fill()
      // windscreen
      ctx.fillStyle = 'rgba(10,17,32,.75)'
      const wsY = c.dir === 1 ? front - 1.6 : front + 0.6
      ctx.fillRect(X(lx - CAR_W / 2 + 0.25), Y(wsY), (CAR_W - 0.5) * k, 1.0 * k)
      // brake lights
      if (c.stopAt !== null || (c.v < 0.5 && c.road === 0)) {
        ctx.fillStyle = '#FF3B3B'
        const by = c.dir === 1 ? back : back - 0.35
        ctx.fillRect(X(lx - CAR_W / 2 + 0.1), Y(by), 0.5 * k, 0.35 * k)
        ctx.fillRect(X(lx + CAR_W / 2 - 0.6), Y(by), 0.5 * k, 0.35 * k)
      }
      if (c.flash > 0) {
        ctx.strokeStyle = COL.red
        ctx.lineWidth = 3
        rr(ctx, X(lx - CAR_W / 2) - 3, Y(y0) - 3, CAR_W * k + 6, CAR_LEN * k + 6, 0.6 * k)
        ctx.stroke()
      }
    }
    // the door
    ctx.fillStyle = 'rgba(34,197,94,.25)'
    rr(ctx, X(DOOR_X - 1.6), Y(PATH_Y - 6), 3.2 * k, 3.2 * k, 6)
    ctx.fill()
    ctx.font = `${Math.round(k * 2.4)}px system-ui, sans-serif`
    ctx.fillText(s.robot === 'done' ? '🎉' : '🏠', X(DOOR_X), Y(PATH_Y - 4.4))
    // robot
    const rx = X(s.robotX)
    const ry = Y(PATH_Y)
    const r = ROBOT_R * k * 2.4
    ctx.fillStyle = '#0B1220'
    for (const dx of [-0.7, 0, 0.7]) for (const dy of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(rx + dx * r, ry + dy * r * 0.95, r * 0.28, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = COL.amber
    rr(ctx, rx - r, ry - r * 0.8, 2 * r, 1.6 * r, r * 0.35)
    ctx.fill()
    ctx.fillStyle = '#1A1103'
    ctx.fillRect(rx + r * 0.55, ry - r * 0.5, r * 0.25, r) // camera bar at the front
    // flag on a pole: real pavement robots carry one so drivers see them
    ctx.strokeStyle = COL.text1
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(rx - r * 0.6, ry - r * 0.6)
    ctx.lineTo(rx - r * 0.6, ry - r * 2.6)
    ctx.stroke()
    ctx.fillStyle = COL.amberSoft
    ctx.beginPath()
    ctx.moveTo(rx - r * 0.6, ry - r * 2.6)
    ctx.lineTo(rx + r * 0.5, ry - r * 2.25)
    ctx.lineTo(rx - r * 0.6, ry - r * 1.9)
    ctx.fill()
    if (s.robot === 'wait') {
      const bob = reduced ? 0 : Math.sin(s.t * 5) * 2
      ctx.fillStyle = COL.text1
      rr(ctx, rx - 1.6 * k, ry - r * 2.8 - 2.6 * k + bob, 3.2 * k, 2 * k, 6)
      ctx.fill()
      ctx.fillStyle = '#0A1120'
      ctx.font = `bold ${Math.round(k * 1.5)}px system-ui, sans-serif`
      ctx.fillText('GO?', rx, ry - r * 2.8 - 1.6 * k + bob)
    }
    // flash message
    if (s.flash) {
      const msg = s.flash.text
      ctx.font = `bold ${Math.max(13, Math.round(k * 1.6))}px system-ui, sans-serif`
      const tw = ctx.measureText(msg).width + 24
      ctx.globalAlpha = reduced ? 1 : Math.min(1, s.flash.ttl * 2)
      ctx.fillStyle = s.flash.kind === 'good' ? 'rgba(22,101,52,.94)' : s.flash.kind === 'warn' ? 'rgba(146,64,14,.94)' : 'rgba(127,29,29,.94)'
      rr(ctx, w / 2 - tw / 2, oy + 8, tw, 2.6 * k, 10)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(msg, w / 2, oy + 8 + 1.3 * k)
      ctx.globalAlpha = 1
    }
  }, [reduced])

  useSimLoop(phase === 'run', step, draw, 60)

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = sim.current
      setHud({ t: s.t, next: s.next, robot: s.robot, events: s.events.length })
    }, 150)
    return () => window.clearInterval(id)
  }, [])

  const go = useCallback(() => {
    if (goCross(sim.current)) {
      playSound('click')
      setHud((h) => ({ ...h, robot: 'cross' }))
    }
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phase !== 'run') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON')) return
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault()
        go()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [phase, go])

  const s = sim.current
  const road = ROADS[hud.next]

  const finish = () => {
    const stars = crossingStars(s)
    const nm = nearMisses(s)
    onFinish({
      stars,
      score: crossingScore(s),
      scoreLabel: 'points',
      message:
        s.robot === 'done'
          ? nm === 0 && hardBrakes(s) + redMen(s) === 0
            ? `Parcel delivered in ${s.t.toFixed(0)} s, and not one car had to brake hard. That is exactly how a safe robot crosses.`
            : nm > 0
              ? `Not safe yet: there ${nm === 1 ? 'was a near miss' : `were ${nm} near misses`}. A safe robot only goes when no car’s orange stopping zone reaches the crossing. Try again.`
              : redMen(s) > 0
                ? `Not safe yet: the robot started on the red “don’t walk” signal. At a signal crossing, wait for the green walk signal. Try again.`
                : `Parcel delivered in ${s.t.toFixed(0)} s. A car had to brake hard — wait a little longer for a bigger gap for 3 stars.`
          : 'Time ran out before the parcel arrived. Watch the cars’ stopping zones and go as soon as they are all clear.',
    })
  }

  const debrief = (): DebriefLine[] => {
    const lines: DebriefLine[] = []
    lines.push({ icon: '📦', text: s.robot === 'done' ? `The parcel arrived after ${s.t.toFixed(0)} s. The robot waited ${s.waited.map((x) => x.toFixed(0)).join(' s, ')} s at the three kerbs.` : `The robot crossed ${s.next} of 3 roads before time ran out.` })
    for (const e of s.events) {
      const rd = ROADS[e.road]
      if (e.kind === 'near-miss')
        lines.push({ icon: '⚠️', text: `${rd.name}: a car was inside its stopping distance when the robot stepped out. At ${Math.round(rd.v0 * 3.6)} km/h a car needs about ${stopDistance(rd.v0).toFixed(0)} m to stop — it simply could not.` })
      else if (e.kind === 'hard-brake') lines.push({ icon: '🛑', text: `${rd.name}: a car had to brake hard for the robot. It stopped in time, but the robot should have waited for a bigger gap.` })
      else lines.push({ icon: '✋', text: `${rd.name}: the robot started on the “don’t walk” signal. Right-of-way belonged to the cars, even though the road looked clear.` })
    }
    if (s.events.length === 0 && s.robot === 'done') lines.push({ icon: '✅', text: 'No car ever had to brake hard: every time the robot went, the cars’ stopping zones were clear of the crossing.' })
    if (s.gaveWay > 0) lines.push({ icon: '🦓', text: `${s.gaveWay} car${s.gaveWay === 1 ? '' : 's'} gave way calmly at the zebra crossing, because the robot stepped out while they still had room to stop.` })
    lines.push({ icon: '🧮', text: `Stopping distance = reaction distance + braking distance. At 30 km/h that is about ${stopDistance(30 / 3.6).toFixed(0)} m; at 40 km/h about ${stopDistance(40 / 3.6).toFixed(0)} m — speed up a third and the distance grows by more than half.` })
    return lines
  }

  const status =
    hud.robot === 'done'
      ? 'Delivered!'
      : hud.robot === 'wait' && road
        ? road.kind === 'signal'
          ? 'Signal crossing: wait for the walk signal 🚶'
          : road.kind === 'zebra'
            ? 'Zebra crossing: go when cars still have room to stop'
            : 'No crossing here: wait for a gap both ways'
        : hud.robot === 'cross'
          ? 'Crossing…'
          : 'Driving along the pavement…'

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <canvas
            ref={canvas}
            data-game-stage=""
            className="kids-stage-ratio aspect-[13/9] w-full rounded-[28px] border border-white/10 bg-[#0A1120]"
            role="img"
            aria-label={`City street seen from above. ${status}. Crossings done: ${hud.next} of 3.`}
          />
          {phase === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[#0A1120]/80 p-4">
              <div className="max-w-sm text-center">
                <p className="text-4xl" aria-hidden>
                  📦
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">Crossing Patrol</h3>
                <p className="mt-2 text-[16px] leading-snug text-[#EEF2F8]">
                  You are the delivery robot’s remote helper. It stops at every kerb and asks <b>“GO?”</b> Tap <b>Cross now</b> only when it is safe: no car’s
                  orange stopping zone may reach the crossing.
                </p>
                <PrimaryButton className="mt-4" onClick={() => setPhase('run')}>
                  Start the delivery
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
        <p className="rounded-2xl bg-white/5 px-3 py-2 text-[15px] font-semibold text-[#EEF2F8]" aria-live="polite">
          {status}
        </p>
        {phase === 'debrief' && <Debrief title={s.robot !== 'done' ? 'Out of time' : crossingStars(s) === 0 ? 'Delivered, but not safely' : 'Parcel delivered!'} good={s.robot === 'done' && s.events.length === 0} lines={debrief()} onContinue={finish} />}
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Your call">
          <button
            type="button"
            onClick={go}
            disabled={phase !== 'run' || hud.robot !== 'wait'}
            className="min-h-[72px] w-full rounded-2xl bg-amber-500 font-display text-2xl font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 disabled:bg-white/10 disabled:text-[#6E7888] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
          >
            {hud.robot === 'wait' ? 'Cross now ▶' : hud.robot === 'cross' ? 'Crossing…' : 'Wait…'}
          </button>
          <p className="mt-2 text-[13px] leading-snug text-[#A7B0C0]">Space or Enter works too. Not sure? Wait — a robot is never in a hurry.</p>
        </Panel>
        <Panel>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Time" value={`${hud.t.toFixed(0)} s`} tone={hud.t > TIME_LIMIT - 20 ? 'warn' : 'plain'} />
            <Stat label="Roads" value={`${Math.min(3, hud.next)}/3`} tone={hud.next >= 3 ? 'good' : 'plain'} />
            <Stat label="Safety" value={hud.events === 0 ? '✓' : `${hud.events} ⚠`} tone={hud.events === 0 ? 'good' : 'bad'} />
          </div>
        </Panel>
        <Panel>
          <ul className="space-y-1.5 text-[14px] leading-snug text-[#A7B0C0]">
            <li>
              <span className="font-bold text-amber-300">Orange zone</span> — the road a car needs to stop: pale for thinking time, bright for braking. Faster cars
              have much longer zones.
            </li>
            <li>
              <span className="font-bold text-[#EEF2F8]">🚶 / ✋</span> — the walk signal at the first crossing. Only start on 🚶.
            </li>
            <li>
              <span className="font-bold text-[#EEF2F8]">Zebra stripes</span> — cars must give way to someone on the crossing, but only if they still can.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
