'use client'

// components/kids/games/robot-city/FollowGameClient.tsx
// PILOT — Safe Speed: set a self-driving car's cruise speed and following gap,
// then watch it drive a test route by itself (a lead car that brakes hard, then
// rain and fog with a broken-down van). Model in ./follow.ts.

import { useCallback, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  A_DRY,
  A_WET,
  CAR_LEN,
  FOG_RANGE,
  FOG_START,
  HUMAN_REACT,
  LATENCY,
  LEAD_EXIT,
  LEAD_SPEED,
  MARGIN_OK,
  ROUTE,
  VAN_AT,
  followStars,
  maxSafeSpeed,
  runFollow,
  safetyMargin,
  stopDist,
  type FollowResult,
  type FollowSettings,
} from './follow'
import { COL, fitCanvas, rr, useReducedMotion, useSimLoop } from './shared'
import { Debrief, GhostButton, Panel, PrimaryButton, Slider, Stat, type DebriefLine } from './UiClient'

type Phase = 'setup' | 'run' | 'debrief'

const FRAME_DT = 2 / 60

export default function FollowGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [set, setSet] = useState<FollowSettings>({ speedKmh: 30, headway: 2 })
  const [phase, setPhase] = useState<Phase>('setup')
  const [result, setResult] = useState<FollowResult | null>(null)
  const [tests, setTests] = useState(0)
  const [fast, setFast] = useState(false)
  const play = useRef({ t: 0, idx: 0, crashSounded: false })
  const [hud, setHud] = useState({ v: 0, gap: null as number | null, s: 0 })
  const reduced = useReducedMotion()

  const v = set.speedKmh / 3.6
  const dDry = stopDist(v, A_DRY)
  const dWet = stopDist(v, A_WET)
  const dHumanWet = stopDist(v, A_WET, HUMAN_REACT)
  const gapM = 2 + set.headway * Math.min(v, LEAD_SPEED)
  const safeFog = maxSafeSpeed(FOG_RANGE, A_WET)

  const start = () => {
    const r = runFollow(set)
    setResult(r)
    setTests((n) => n + 1)
    play.current = { t: 0, idx: 0, crashSounded: false }
    playSound('click')
    setPhase('run')
  }

  const step = useCallback(
    (dt: number) => {
      const r = result
      if (!r) return
      const pc = play.current
      pc.t += dt * (fast ? 6 : 2.5)
      pc.idx = Math.min(r.frames.length - 1, Math.floor(pc.t / FRAME_DT))
      const f = r.frames[pc.idx]
      if (pc.idx % 6 === 0) setHud({ v: f.v * 3.6, gap: f.gap, s: f.s })
      if (pc.idx >= r.frames.length - 1) {
        setHud({ v: f.v * 3.6, gap: f.gap, s: f.s })
        playSound(r.crashed ? 'wrong' : 'star')
        setPhase('debrief')
      }
    },
    [result, fast],
  )

  const draw = useCallback(() => {
    const fc = fitCanvas(canvas.current)
    if (!fc) return
    const { ctx, w, h } = fc
    const r = result
    const f = r ? r.frames[play.current.idx] : null
    const egoS = f ? f.s : 0
    const span = 72 // metres across the canvas
    const k = w / span
    const camS = egoS - span * 0.22
    const X = (s: number) => (s - camS) * k
    const roadY = h * 0.5
    const laneW = Math.min(h * 0.22, 4 * k)
    ctx.clearRect(0, 0, w, h)
    // verges + buildings
    ctx.fillStyle = '#16233B'
    ctx.fillRect(0, 0, w, h)
    for (let m = Math.floor(camS / 14) * 14; m < camS + span + 14; m += 14) {
      ctx.fillStyle = (m / 14) % 2 ? '#22345A' : '#1F3152'
      rr(ctx, X(m) + 4, 6, 12 * k - 8, roadY - laneW * 1.6 - 12, 8)
      ctx.fill()
      rr(ctx, X(m + 7) + 4, roadY + laneW * 1.6 + 6, 12 * k - 8, h - roadY - laneW * 1.6 - 12, 8)
      ctx.fill()
    }
    // road (two lanes: ours, and oncoming)
    ctx.fillStyle = '#2A2F3A'
    ctx.fillRect(0, roadY - laneW * 1.1, w, laneW * 2.2)
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    for (let m = Math.floor(camS / 6) * 6; m < camS + span + 6; m += 6) ctx.fillRect(X(m), roadY - 1, 3 * k, 2)
    const laneC = roadY + laneW * 0.55
    // wet road from FOG_START
    if (X(FOG_START) < w) {
      ctx.fillStyle = 'rgba(56,189,248,.12)'
      ctx.fillRect(Math.max(0, X(FOG_START)), roadY - laneW * 1.1, w, laneW * 2.2)
    }
    // section markers
    ctx.font = `bold ${Math.max(11, Math.round(h * 0.035))}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = COL.text2
    if (X(FOG_START) > 0 && X(FOG_START) < w) ctx.fillText('🌧️ rain + fog', X(FOG_START) + 4, roadY + laneW * 1.2)
    if (X(ROUTE) > 0 && X(ROUTE) < w) {
      ctx.fillStyle = COL.green
      ctx.fillRect(X(ROUTE), roadY - laneW * 1.1, 4, laneW * 2.2)
      ctx.fillText('🏁 finish', X(ROUTE) + 6, roadY - laneW * 1.1 - 18)
    }
    const carRect = (s: number, colour: string, brake: boolean) => {
      const x0 = X(s)
      const len = CAR_LEN * k
      const wid = laneW * 0.62
      ctx.fillStyle = colour
      rr(ctx, x0, laneC - wid / 2, len, wid, Math.min(6, len * 0.15))
      ctx.fill()
      ctx.fillStyle = 'rgba(10,17,32,.75)'
      ctx.fillRect(x0 + len * 0.62, laneC - wid / 2 + 3, len * 0.18, wid - 6)
      if (brake) {
        ctx.fillStyle = '#FF3B3B'
        ctx.fillRect(x0 - 2, laneC - wid / 2 + 1, 4, wid * 0.25)
        ctx.fillRect(x0 - 2, laneC + wid / 4 - 1, 4, wid * 0.25)
      }
    }
    const egoFront = egoS + CAR_LEN
    const inFog = egoFront >= FOG_START - 20
    // stopping zone of OUR car (what it needs to stop from its current speed)
    if (f && f.v > 0.2) {
      const aNow = egoFront >= FOG_START ? A_WET : A_DRY
      const react = f.v * LATENCY
      const brake = (f.v * f.v) / (2 * aNow)
      ctx.fillStyle = 'rgba(255,168,120,.22)'
      ctx.fillRect(X(egoFront), laneC - laneW * 0.45, react * k, laneW * 0.9)
      ctx.fillStyle = 'rgba(252,104,24,.38)'
      ctx.fillRect(X(egoFront + react), laneC - laneW * 0.45, brake * k, laneW * 0.9)
    }
    // the van
    if (f?.van) {
      const x0 = X(VAN_AT)
      ctx.fillStyle = '#CBD5E1'
      rr(ctx, x0, laneC - laneW * 0.36, 6 * k, laneW * 0.72, 6)
      ctx.fill()
      ctx.fillStyle = '#F59E0B'
      if (reduced || Math.floor((f.t ?? 0) * 3) % 2 === 0) {
        ctx.fillRect(x0 - 2, laneC - laneW * 0.36, 4, 6)
        ctx.fillRect(x0 - 2, laneC + laneW * 0.36 - 6, 4, 6)
      }
    }
    // lead car
    if (f && f.leadS !== null) carRect(f.leadS - CAR_LEN, '#E2E8F0', f.leadBraking || f.leadV < 0.3)
    // fog: everything beyond the sensor range fades out
    if (inFog) {
      const edge = X(egoFront + FOG_RANGE)
      const g = ctx.createLinearGradient(edge - 30, 0, edge + 20, 0)
      g.addColorStop(0, 'rgba(148,163,184,0)')
      g.addColorStop(1, 'rgba(148,163,184,.92)')
      ctx.fillStyle = g
      ctx.fillRect(edge - 30, 0, w - edge + 30, h)
      // rain
      if (!reduced) {
        ctx.strokeStyle = 'rgba(186,230,253,.35)'
        ctx.lineWidth = 1
        const seed = Math.floor((f?.t ?? 0) * 20)
        for (let i = 0; i < 60; i++) {
          const rx = ((i * 97 + seed * 31) % 1000) / 1000 * w
          const ry = ((i * 53 + seed * 47) % 1000) / 1000 * h
          ctx.beginPath()
          ctx.moveTo(rx, ry)
          ctx.lineTo(rx - 4, ry + 10)
          ctx.stroke()
        }
      }
    }
    // sensor range marker
    const rangeM = inFog ? FOG_RANGE : 60
    ctx.strokeStyle = 'rgba(0,229,255,.7)'
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(X(egoFront + rangeM), roadY - laneW * 0.1)
    ctx.lineTo(X(egoFront + rangeM), roadY + laneW * 1.1)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = COL.cyan
    ctx.fillText(inFog ? `sees ${FOG_RANGE} m` : 'sees far', X(egoFront + rangeM) + 4, roadY + laneW * 1.15)
    // our car
    carRect(egoS, COL.amber, !!f && f.a < -1)
    ctx.fillStyle = '#1A1103'
    ctx.beginPath()
    ctx.arc(X(egoS + CAR_LEN * 0.4), laneC, Math.max(3, laneW * 0.12), 0, Math.PI * 2) // lidar puck on the roof
    ctx.fill()
    // crash marker
    if (r?.crashed && play.current.idx >= r.frames.length - 1) {
      ctx.font = `bold ${Math.round(h * 0.06)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = COL.red
      ctx.fillText('💥 bump!', X(egoFront), roadY - laneW * 2.4)
    }
    // progress strip
    const py = h - 14
    ctx.fillStyle = 'rgba(255,255,255,.1)'
    rr(ctx, 12, py, w - 24, 6, 3)
    ctx.fill()
    ctx.fillStyle = 'rgba(56,189,248,.4)'
    ctx.fillRect(12 + ((w - 24) * FOG_START) / ROUTE, py, ((w - 24) * (ROUTE - FOG_START)) / ROUTE, 6)
    ctx.fillStyle = COL.amber
    ctx.beginPath()
    ctx.arc(12 + ((w - 24) * Math.min(ROUTE, egoS)) / ROUTE, py + 3, 6, 0, Math.PI * 2)
    ctx.fill()
  }, [result, reduced])

  useSimLoop(phase === 'run', step, draw, 60)

  const r = result
  const stars = r ? followStars(set, r) : 0

  const debrief = (): DebriefLine[] => {
    if (!r) return []
    const lines: DebriefLine[] = []
    if (r.crashed?.where === 'lead')
      lines.push({
        icon: '🚗',
        text: `The car ahead stopped hard and your car bumped into it at ${Math.abs(r.crashed.speedKmh).toFixed(0)} km/h. A ${set.headway.toFixed(1)} s gap left only ${gapM.toFixed(1)} m. In its ${LATENCY} s reaction time alone the car rolls ${(Math.min(v, LEAD_SPEED) * LATENCY).toFixed(1)} m — and the car ahead brakes harder than yours can. Try a bigger gap.`,
      })
    else if (r.crashed?.where === 'van')
      lines.push({
        icon: '🚐',
        text: `In the fog the car saw the van only ${FOG_RANGE} m ahead, but at ${set.speedKmh} km/h on a wet road it needs ${dWet.toFixed(0)} m to stop. It touched the van at ${r.crashed.speedKmh.toFixed(0)} km/h. The fastest speed that can stop in ${FOG_RANGE} m is about ${safeFog.toFixed(0)} km/h.`,
      })
    else {
      lines.push({ icon: '✅', text: `No bumps. The car finished the ${ROUTE} m route in ${r.time.toFixed(0)} s.` })
      lines.push({ icon: '🚗', text: `When the car ahead braked hard, your car stopped with ${r.minLeadGap.toFixed(1)} m to spare.` })
      if (r.vanMargin !== null) lines.push({ icon: '🚐', text: `In the fog it saw the van ${FOG_RANGE} m away and stopped ${r.vanMargin.toFixed(1)} m short of it, then waited and passed it slowly.` })
      if (safetyMargin(r) < MARGIN_OK) lines.push({ icon: '📏', text: `That was very close — less than ${MARGIN_OK} m. Real self-driving cars plan to keep a bigger safety margin.` })
      if (set.speedKmh < 44) lines.push({ icon: '🐢', text: `Safe! But the car could go a little faster and still stop in time. The limit in fog is about ${safeFog.toFixed(0)} km/h.` })
    }
    lines.push({ icon: '🧠', text: `A self-driving car reacts in about ${LATENCY} s; a careful person takes about ${HUMAN_REACT} s. At ${set.speedKmh} km/h on a wet road a person would need ${dHumanWet.toFixed(0)} m to stop — your car needs ${dWet.toFixed(0)} m.` })
    return lines
  }

  const finish = () => {
    if (!r) return
    onFinish({
      stars,
      score: r.crashed ? 0 : Math.round(r.time),
      scoreLabel: 's for the route',
      lowerIsBetter: true,
      attempts: tests,
      message: r.crashed
        ? r.crashed.where === 'van'
          ? `Too fast for the fog: a car must be able to stop within the distance it can see.`
          : `Too close to the car in front: the gap must cover the reaction distance plus the difference in braking.`
        : stars === 3
          ? `${set.speedKmh} km/h with a ${set.headway.toFixed(1)} s gap: quick, and it could always stop in the distance it could see.`
          : `Safe drive. ${set.speedKmh < 44 ? 'You can go a bit faster' : 'Keep a bigger safety margin'} for 3 stars.`,
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
            aria-label={`Self-driving car on the test route. Speed ${hud.v.toFixed(0)} kilometres per hour. ${hud.gap !== null ? `Gap to the car ahead ${hud.gap.toFixed(0)} metres.` : ''}`}
          />
          {phase === 'setup' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[#0A1120]/80 p-4">
              <div className="max-w-md text-center">
                <p className="text-4xl" aria-hidden>
                  🚙
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">Safe Speed</h3>
                <p className="mt-2 text-[16px] leading-snug text-[#EEF2F8]">
                  Set your self-driving car’s <b>cruise speed</b> and <b>following gap</b>, then let it drive itself. The car ahead will brake suddenly, and
                  later heavy rain and fog hide a broken-down van. Fastest settings that never bump win.
                </p>
                <p className="mt-2 text-[14px] text-[#A7B0C0]">Tests so far: {tests}</p>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Speed" value={`${hud.v.toFixed(0)} km/h`} />
          <Stat label="Gap ahead" value={hud.gap !== null ? `${Math.max(0, hud.gap).toFixed(1)} m` : '—'} tone={hud.gap !== null && hud.gap < 3 ? 'warn' : 'plain'} />
          <Stat label="Route" value={`${Math.min(ROUTE, hud.s).toFixed(0)} m`} />
        </div>
        {phase === 'debrief' && r && <Debrief title={r.crashed ? 'Bump!' : 'Route complete'} good={!r.crashed} lines={debrief()} onContinue={finish} />}
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Car settings">
          <div className="flex flex-col gap-3">
            <Slider id="rc-speed" label="Cruise speed" value={set.speedKmh} min={20} max={60} step={2} unit="km/h" disabled={phase === 'run'} onChange={(x) => setSet((p) => ({ ...p, speedKmh: x }))} />
            <Slider
              id="rc-gap"
              label="Following gap"
              value={set.headway}
              min={0.3}
              max={3}
              step={0.1}
              unit="s"
              disabled={phase === 'run'}
              hint={`At ${Math.round(Math.min(v, LEAD_SPEED) * 3.6)} km/h behind the car ahead, that is ${gapM.toFixed(1)} m.`}
              onChange={(x) => setSet((p) => ({ ...p, headway: x }))}
            />
            {phase === 'setup' && (
              <PrimaryButton onClick={start} className="w-full">
                ▶ Test drive
              </PrimaryButton>
            )}
            {phase === 'run' && (
              <GhostButton pressed={fast} onClick={() => setFast((x) => !x)}>
                {fast ? '⏩ Fast' : '▶ Normal speed'}
              </GhostButton>
            )}
            {phase === 'debrief' && (
              <GhostButton
                onClick={() => {
                  setPhase('setup')
                  setHud({ v: 0, gap: null, s: 0 })
                }}
              >
                ↺ Change settings and test again
              </GhostButton>
            )}
          </div>
        </Panel>
        <Panel title="Your stopping distance">
          <ul className="space-y-1 text-[14px] leading-snug text-[#A7B0C0]">
            <li>
              Dry road: <b className="text-[#EEF2F8]">{dDry.toFixed(1)} m</b> ({(v * LATENCY).toFixed(1)} m reacting + {(dDry - v * LATENCY).toFixed(1)} m braking)
            </li>
            <li>
              Wet road: <b className="text-[#EEF2F8]">{dWet.toFixed(1)} m</b>
            </li>
            <li>
              In fog the car can see: <b className="text-cyan-300">{FOG_RANGE} m</b>
            </li>
          </ul>
          <p className="mt-2 text-[13px] leading-snug text-[#6E7888]">Braking distance grows with speed × speed: double the speed, four times the braking distance.</p>
        </Panel>
        <p className="px-1 text-[13px] text-[#6E7888]">
          Lead car: {Math.round(LEAD_SPEED * 3.6)} km/h, turns off at {LEAD_EXIT} m. Van at {VAN_AT} m.
        </p>
      </div>
    </div>
  )
}
