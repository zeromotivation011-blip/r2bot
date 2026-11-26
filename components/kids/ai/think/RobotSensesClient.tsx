'use client'

// components/kids/ai/think/RobotSensesClient.tsx
// Robot Senses: see one room the way a robot does. A single ray-caster
// (lib/kids/ai/think/senses.ts) drives six views of the same room — the map,
// a camera, a depth camera, a spinning 2-D lidar, an ultrasonic cone and a
// five-eye line sensor — so the child can compare where each sensor works and
// where it is blind (dark, glass, a low step, noise). "Find the obstacle"
// missions turn the comparison into a game. Low-resolution software
// rendering on purpose: no WebGL, fast on a cheap Android phone, offline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  blocked,
  CAM_FOV,
  CAM_HEIGHT,
  castAll,
  DEPTH_RANGE,
  lidarScan,
  lineRead,
  lineSensorPoints,
  LIDAR_HEIGHT,
  LIDAR_RANGE,
  ROBOT_R,
  ROOM_H,
  ROOM_W,
  SONAR_HALF_ANGLE,
  sonarRead,
  TAPE,
  TAPE_HALF,
  WALL_H,
  type LidarPoint,
  type Pose,
  type RoomObject,
} from '@/lib/kids/ai/think/senses'
import {
  BASE_ROOM,
  MYSTERY_ID,
  mysteryBox,
  sensesMissionsFor,
  START_POSE,
  type SensesMission,
} from '@/lib/kids/ai/think/senses-missions'
import { clamp, gauss, makeRng, prefersReducedMotion } from '@/lib/kids/ai/think/common'
import { playSound } from '@/lib/kids-audio'
import { Btn, cx, fitCanvas, MissionDone, MissionList, Panel, Slider, TierTabs, useElementWidth, useThinkMissions, useTier } from './LabUiClient'

const FREE_EXTRA: RoomObject[] = [{ id: 'crate', name: 'Crate', kind: 'box', x: 3.1, y: 2.6, hx: 0.3, hy: 0.3, h: 0.6, color: '#D9A441', material: 'solid' }]
const GLASS_DOOR: RoomObject = { id: 'glass', name: 'Glass door', kind: 'box', x: 4.2, y: 2.6, hx: 0.04, hy: 0.8, h: 2.1, color: '#9FD8F5', material: 'glass' }
const LOW_STEP: RoomObject = { id: 'step', name: 'Low step', kind: 'box', x: 2.2, y: 2.6, hx: 0.3, hy: 0.6, h: 0.1, color: '#C97B2A', material: 'solid' }

const IMG_W = 128
const IMG_H = 80
const SPEED = 0.7 // m/s
const TURN = Math.PI * 0.6 // rad/s

type Drive = { f: number; t: number }

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Distance from a floor point to the tape, for the camera's floor. */
function onTape(x: number, y: number): boolean {
  for (const [x1, y1, x2, y2] of TAPE) {
    const vx = x2 - x1
    const vy = y2 - y1
    const l2 = vx * vx + vy * vy
    const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / l2))
    if (Math.hypot(x - (x1 + vx * t), y - (y1 + vy * t)) < TAPE_HALF) return true
  }
  return false
}

/** Elements where arrow keys already mean something; the lab never steals them there. */
const ARROW_OWNERS =
  'input, select, textarea, [contenteditable="true"], [role="tablist"], [role="tab"], [role="radiogroup"], [role="radio"], [role="slider"], [role="listbox"], [role="option"], [role="menu"], [role="menuitem"], [role="toolbar"], [role="group"], [role="spinbutton"], [role="combobox"]'

export default function RobotSensesClient() {
  const [tier, setTier] = useTier()
  const missions = useMemo(() => sensesMissionsFor(tier), [tier])
  const ms = useThinkMissions<SensesMission>('sensors')

  const [active, setActive] = useState<SensesMission | null>(null)
  const [pose, setPose] = useState<Pose>(START_POSE)
  const [lights, setLights] = useState(0.9)
  const [noise, setNoise] = useState(0)
  const [keep, setKeep] = useState(false)
  const [glass, setGlass] = useState(false)
  const [step, setStep] = useState(false)
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [guess, setGuess] = useState(1.5)
  const [spin, setSpin] = useState(0)
  const rng = useRef(makeRng(3))
  const attempts = useRef(0)

  const objects = useMemo<RoomObject[]>(() => {
    const extra = active ? active.extra : [...FREE_EXTRA, ...(glass ? [GLASS_DOOR] : []), ...(step ? [LOW_STEP] : [])]
    const list = [...BASE_ROOM, ...extra]
    if (spot) list.push(mysteryBox(spot))
    return list
  }, [active, glass, step, spot])

  const startMission = useCallback((m: SensesMission | null) => {
    playSound('click')
    setActive(m)
    setFeedback(null)
    setRevealed(false)
    setKeep(false)
    attempts.current = 0
    if (m) {
      setPose(m.pose)
      setLights(m.lights)
      setNoise(m.noise)
      setSpot(m.type === 'locate' ? m.spots[Math.floor(Math.random() * m.spots.length)] : null)
      setGuess(1.5)
    } else {
      setPose(START_POSE)
      setLights(0.9)
      setNoise(0)
      setSpot(null)
    }
  }, [])

  // Lidar spins once a second; noise is re-sampled each spin.
  const [scans, setScans] = useState<LidarPoint[][]>([])
  useEffect(() => {
    const id = window.setInterval(() => setSpin((s) => s + 1), 1000)
    const onHide = () => {
      if (document.hidden) window.clearInterval(id)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
  useEffect(() => {
    const scan = lidarScan(objects, pose, 240, noise, rng.current)
    setScans((old) => (keep ? [...old.slice(-11), scan] : [scan]))
  }, [objects, pose, noise, keep, spin])

  const sonar = useMemo(() => sonarRead(objects, pose, noise, rng.current), [objects, pose, noise, spin]) // eslint-disable-line react-hooks/exhaustive-deps
  const trueSonar = useMemo(() => sonarRead(objects, pose, 0, makeRng(1)), [objects, pose])
  const lineVals = useMemo(() => lineRead(pose, noise, rng.current), [pose, noise, spin]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Driving ──
  const drive = useRef<Drive>({ f: 0, t: 0 })
  const [driving, setDriving] = useState(false)
  const objectsRef = useRef(objects)
  objectsRef.current = objects
  useEffect(() => {
    if (!driving) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { f, t } = drive.current
      if (f || t) {
        setPose((p) => {
          const a = p.a + t * TURN * dt
          const nx = p.x + Math.cos(a) * f * SPEED * dt
          const ny = p.y + Math.sin(a) * f * SPEED * dt
          if (blocked(objectsRef.current, nx, ny)) return { ...p, a }
          return { x: nx, y: ny, a }
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [driving])
  const setDrive = useCallback((d: Partial<Drive>) => {
    drive.current = { ...drive.current, ...d }
    setDriving(drive.current.f !== 0 || drive.current.t !== 0)
  }, [])
  const labRef = useRef<HTMLDivElement | null>(null)
  const labOnScreen = useRef(false)
  const [labVisible, setLabVisible] = useState(false)
  useEffect(() => {
    const el = labRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      labOnScreen.current = true
      setLabVisible(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => {
      labOnScreen.current = !!entry?.isIntersecting
      setLabVisible(labOnScreen.current)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const keys: Record<string, Partial<Drive>> = { ArrowUp: { f: 1 }, ArrowDown: { f: -1 }, ArrowLeft: { t: -1 }, ArrowRight: { t: 1 } }
    const down = (e: KeyboardEvent) => {
      const k = keys[e.key]
      if (!k || e.altKey || e.ctrlKey || e.metaKey) return
      // Arrow keys drive only while the lab is on screen. Inside a text field,
      // slider, select or any option group (level tabs, radio groups, menus)
      // they keep their normal job of moving between options, so keyboard
      // users are never trapped. Off screen the page scrolls as usual.
      if (!labOnScreen.current) return
      const tgt = e.target instanceof HTMLElement ? e.target : null
      if (tgt && !tgt.closest('[data-drive]') && tgt.closest(ARROW_OWNERS)) return
      e.preventDefault()
      setDrive(k)
    }
    const up = (e: KeyboardEvent) => {
      const k = keys[e.key]
      if (!k) return
      setDrive('f' in k ? { f: 0 } : { t: 0 })
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [setDrive])

  // ── Mission checks ──
  const succeed = useCallback(
    (m: SensesMission, text: string) => {
      setFeedback({ ok: true, text })
      ms.complete(m)
    },
    [ms],
  )

  const answerChoice = (id: string) => {
    if (!active || active.type !== 'choice') return
    attempts.current++
    if (id === active.answer) {
      playSound('correct')
      succeed(active, active.explain)
    } else {
      playSound('wrong')
      setFeedback({ ok: false, text: 'Not that one — compare the views again. Which one shows nothing where the others show the obstacle?' })
    }
  }

  const onMapTap = (x: number, y: number) => {
    if (!active || active.type !== 'locate' || !spot || revealed) return
    attempts.current++
    if (Math.hypot(x - spot.x, y - spot.y) < 0.5) {
      playSound('correct')
      setRevealed(true)
      succeed(active, 'Found it! The lidar dots made its outline where the map showed empty floor.')
    } else {
      playSound('wrong')
      setFeedback({ ok: false, text: 'Not there. Look for a short straight row of dots in the middle of the room, where the map shows nothing.' })
    }
  }

  const checkDistance = () => {
    if (!active || active.type !== 'distance' || trueSonar.range === null) return
    attempts.current++
    const err = Math.abs(guess - trueSonar.range)
    if (err <= active.tolerance) {
      playSound('correct')
      succeed(active, `Yes! It is ${trueSonar.range.toFixed(2)} m. Sound went there and back in ${((2 * trueSonar.range) / 343 * 1000).toFixed(1)} ms.`)
    } else {
      playSound('wrong')
      setFeedback({ ok: false, text: guess < trueSonar.range ? 'A bit further than that. Read the ultrasonic number again.' : 'A bit closer than that. Read the ultrasonic number again.' })
    }
  }

  const lineOk = lineVals[2] < 0.45 && lineVals[0] > 0.6 && lineVals[4] > 0.6 && lineVals[2] <= Math.min(...lineVals)
  useEffect(() => {
    if (active?.type === 'line' && lineOk && !ms.done.includes(active.id)) {
      playSound('correct')
      succeed(active, 'Lined up! Only the middle eye sees black — a line follower keeps it that way.')
    }
  }, [active, lineOk, ms.done, succeed])

  const showMystery = !active || active.type !== 'locate' || revealed

  return (
    <div className="mx-auto max-w-6xl px-3 pb-6 sm:px-4">
      <TierTabs tier={tier} onChange={setTier} />

      {active ? (
        <Panel className="mt-3 border-amber-400/40">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Mission</p>
              <h3 className="font-display text-lg font-bold text-white">{active.title}</h3>
              <p className="text-[15px] text-slate-200">{active.goal}</p>
            </div>
            <Btn kind="ghost" onClick={() => startMission(null)} className="flex-none text-sm">
              Free play
            </Btn>
          </div>
          {active.type === 'choice' && (
            <div className="mt-3">
              <p className="font-semibold text-slate-100">{active.question}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {active.options.map((o) => (
                  <Btn key={o.id} onClick={() => answerChoice(o.id)} className="text-sm">
                    {o.label}
                  </Btn>
                ))}
              </div>
            </div>
          )}
          {active.type === 'distance' && (
            <div className="mt-3 space-y-2">
              <Slider label="My answer" value={guess} min={0.2} max={4} step={0.05} format={(v) => `${v.toFixed(2)} m`} onChange={setGuess} />
              <Btn kind="primary" onClick={checkDistance} className="w-full">
                Check
              </Btn>
            </div>
          )}
          {active.type === 'locate' && <p className="mt-2 text-sm font-semibold text-amber-200">Tap the map where you think the hidden box is.</p>}
          {active.type === 'line' && <p className="mt-2 text-sm font-semibold text-amber-200">Use the drive buttons. Watch the line sensor bars.</p>}
          {feedback && (
            <p role="status" className={cx('mt-3 rounded-2xl p-3 text-[15px]', feedback.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/10 text-rose-100')}>
              {feedback.text}
            </p>
          )}
        </Panel>
      ) : (
        <p className="mt-3 text-[15px] text-slate-300">Free play: drive the robot, turn the lights down, add noise. Or pick a mission below.</p>
      )}

      {/* Phone (below lg): map, then the sensor views, with the drive pad floating
          at the bottom of the screen (fixed, while the lab is on screen) so a child
          can hold a button and watch every sensor at once. The left column dissolves (contents) so its panels can
          be ordered around the sensors. Desktop: map + controls left, sensors right. */}
      <div ref={labRef} className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="contents lg:block lg:space-y-3">
          <Panel title="Map (what is really there)" className="order-1">
            <MapView
              objects={objects}
              pose={pose}
              scans={scans}
              sonar={sonar}
              showMystery={showMystery}
              lights={lights}
              onTap={onMapTap}
              tapMode={active?.type === 'locate' && !revealed}
            />
            <DrivePad setDrive={setDrive} className="mt-3 hidden lg:grid" />
          </Panel>
          <Panel title="World controls" className="order-4">
            <div className="space-y-3">
              <Slider label="Room lights" value={lights} min={0} max={1} step={0.02} format={(v) => (v < 0.1 ? 'off' : `${Math.round(v * 100)}%`)} onChange={setLights} />
              <Slider label="Sensor noise" value={noise} min={0} max={1} step={0.05} format={(v) => (v === 0 ? 'clean' : `${Math.round(v * 100)}%`)} onChange={setNoise} hint="Real sensors are never perfect. Turn this up and watch every reading wobble." />
              <div className="grid grid-cols-3 gap-2">
                <Btn pressed={keep} onClick={() => setKeep((k) => !k)} className="px-2 text-sm">
                  Keep old spins
                </Btn>
                <Btn pressed={glass} onClick={() => setGlass((g) => !g)} disabled={!!active} className="px-2 text-sm">
                  Glass door
                </Btn>
                <Btn pressed={step} onClick={() => setStep((s) => !s)} disabled={!!active} className="px-2 text-sm">
                  Low step
                </Btn>
              </div>
            </div>
          </Panel>
        </div>

        <div className="order-2 grid grid-cols-2 gap-2 self-start sm:gap-3 xl:grid-cols-3">
          <SensorCard title="Camera" says="Colour pictures. Needs light.">
            <ViewCanvas kind="camera" objects={objects} pose={pose} lights={lights} noise={noise} spin={spin} />
          </SensorCard>
          <SensorCard title="Depth camera" says="Its own infrared light. Bright = near.">
            <ViewCanvas kind="depth" objects={objects} pose={pose} lights={lights} noise={noise} spin={spin} />
          </SensorCard>
          <SensorCard title="Lidar" says="A spinning laser, 240 distances per turn, 20 cm up.">
            <LidarView scans={scans} />
          </SensorCard>
          <SensorCard title="Ultrasonic" says="Times an echo of sound.">
            <SonarReadout range={sonar.range} />
          </SensorCard>
          <SensorCard title="Line sensor" says="Five infrared eyes on the floor." className="col-span-2 xl:col-span-1">
            <LineBars vals={lineVals} />
          </SensorCard>
        </div>

        {/* Room for the floating pad, so it never covers the last sensor card. */}
        <div aria-hidden className="order-3 h-[72px] lg:hidden" />
      </div>
      {labVisible && (
        <div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-30 mx-auto max-w-md rounded-[20px] border border-white/10 bg-[#0A1120]/95 p-2 shadow-[0_-8px_24px_rgba(0,0,0,.45)] backdrop-blur min-[901px]:bottom-3 lg:hidden">
          <DrivePad setDrive={setDrive} />
        </div>
      )}

      <Panel title={`Find the obstacle · ${tier}`} className="mt-3">
        <MissionList missions={missions} done={ms.done} activeId={active?.id ?? null} onPick={(m) => startMission(m)} />
      </Panel>
      <MissionDone mission={ms.justDone} onClose={ms.dismiss} />
    </div>
  )
}

function SensorCard({ title, says, children, className }: { title: string; says: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-2 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-3', className)}>
      <h3 className="font-display text-sm font-bold text-white sm:text-base">{title}</h3>
      <p className="mb-1.5 text-xs leading-snug text-slate-400">{says}</p>
      {children}
    </section>
  )
}

// ── Drive pad (hold to move) ──────────────────────────────────────────

function DrivePad({ setDrive, className = 'grid' }: { setDrive: (d: Partial<Drive>) => void; className?: string }) {
  const hold = (d: Partial<Drive>, release: Partial<Drive>) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      setDrive(d)
    },
    onPointerUp: () => setDrive(release),
    onPointerCancel: () => setDrive(release),
    onLostPointerCapture: () => setDrive(release),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setDrive(d)
      }
    },
    onKeyUp: () => setDrive(release),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })
  const base =
    'min-h-14 select-none touch-none rounded-2xl border border-white/15 bg-white/[0.06] font-display text-lg font-bold text-white active:scale-[.97] active:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  return (
    <div role="group" data-drive className={cx(className, 'grid-cols-4 gap-2')} aria-label="Drive the robot (hold a button, or use the arrow keys)">
      <button type="button" className={base} aria-label="Turn left" {...hold({ t: -1 }, { t: 0 })}>
        ⟲
      </button>
      <button type="button" className={base} aria-label="Drive forward" {...hold({ f: 1 }, { f: 0 })}>
        ▲
      </button>
      <button type="button" className={base} aria-label="Drive backward" {...hold({ f: -1 }, { f: 0 })}>
        ▼
      </button>
      <button type="button" className={base} aria-label="Turn right" {...hold({ t: 1 }, { t: 0 })}>
        ⟳
      </button>
    </div>
  )
}

// ── Top-down map ──────────────────────────────────────────────────────

function MapView({
  objects,
  pose,
  scans,
  sonar,
  showMystery,
  lights,
  onTap,
  tapMode,
}: {
  objects: RoomObject[]
  pose: Pose
  scans: LidarPoint[][]
  sonar: { range: number | null; angle: number }
  showMystery: boolean
  lights: number
  onTap: (x: number, y: number) => void
  tapMode: boolean
}) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const W = Math.min(width || 320, 520)
  const k = W / ROOM_W
  const H = ROOM_H * k
  useEffect(() => {
    const c = canvas.current
    if (!c || !W) return
    const ctx = fitCanvas(c, W, H)
    if (!ctx) return
    ctx.fillStyle = `rgb(${Math.round(24 + 40 * lights)},${Math.round(34 + 40 * lights)},${Math.round(56 + 36 * lights)})`
    ctx.fillRect(0, 0, W, H)
    // Grid every metre.
    ctx.strokeStyle = 'rgba(255,255,255,.06)'
    ctx.lineWidth = 1
    for (let m = 1; m < ROOM_W; m++) {
      ctx.beginPath()
      ctx.moveTo(m * k, 0)
      ctx.lineTo(m * k, H)
      ctx.stroke()
    }
    for (let m = 1; m < ROOM_H; m++) {
      ctx.beginPath()
      ctx.moveTo(0, m * k)
      ctx.lineTo(W, m * k)
      ctx.stroke()
    }
    // Tape.
    ctx.strokeStyle = '#05080F'
    ctx.lineWidth = Math.max(2, TAPE_HALF * 2 * k)
    ctx.lineJoin = 'round'
    ctx.beginPath()
    TAPE.forEach(([x1, y1, x2, y2], i) => {
      if (i === 0) ctx.moveTo(x1 * k, y1 * k)
      ctx.lineTo(x2 * k, y2 * k)
    })
    ctx.stroke()
    // Camera field of view.
    ctx.fillStyle = 'rgba(255,209,102,.08)'
    ctx.beginPath()
    ctx.moveTo(pose.x * k, pose.y * k)
    ctx.arc(pose.x * k, pose.y * k, 2.2 * k, pose.a - CAM_FOV / 2, pose.a + CAM_FOV / 2)
    ctx.closePath()
    ctx.fill()
    // Ultrasonic cone.
    ctx.fillStyle = 'rgba(74,222,128,.18)'
    ctx.beginPath()
    ctx.moveTo(pose.x * k, pose.y * k)
    ctx.arc(pose.x * k, pose.y * k, (sonar.range ?? 4) * k, pose.a - SONAR_HALF_ANGLE, pose.a + SONAR_HALF_ANGLE)
    ctx.closePath()
    ctx.fill()
    // Objects.
    for (const o of objects) {
      if (o.id === MYSTERY_ID && !showMystery) continue
      ctx.fillStyle = o.material === 'glass' ? 'rgba(159,216,245,.45)' : o.color
      if (o.kind === 'box') ctx.fillRect((o.x - o.hx) * k, (o.y - o.hy) * k, o.hx * 2 * k, o.hy * 2 * k)
      else {
        ctx.beginPath()
        ctx.arc(o.x * k, o.y * k, o.hx * k, 0, Math.PI * 2)
        ctx.fill()
      }
      if (o.h < LIDAR_HEIGHT) {
        ctx.strokeStyle = 'rgba(255,255,255,.5)'
        ctx.setLineDash([3, 3])
        ctx.strokeRect((o.x - o.hx) * k, (o.y - o.hy) * k, o.hx * 2 * k, o.hy * 2 * k)
        ctx.setLineDash([])
      }
    }
    // Lidar points.
    scans.forEach((scan, si) => {
      ctx.fillStyle = si === scans.length - 1 ? 'rgba(0,229,255,.95)' : 'rgba(0,229,255,.35)'
      for (const p of scan) ctx.fillRect(p.x * k - 1.5, p.y * k - 1.5, 3, 3)
    })
    // Line sensor spots.
    ctx.fillStyle = '#FFD166'
    for (const p of lineSensorPoints(pose)) ctx.fillRect(p.x * k - 1, p.y * k - 1, 2, 2)
    // Robot.
    ctx.fillStyle = '#FC6818'
    ctx.beginPath()
    ctx.arc(pose.x * k, pose.y * k, ROBOT_R * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1A1103'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(pose.x * k, pose.y * k)
    ctx.lineTo((pose.x + Math.cos(pose.a) * ROBOT_R) * k, (pose.y + Math.sin(pose.a) * ROBOT_R) * k)
    ctx.stroke()
  }, [objects, pose, scans, sonar, showMystery, lights, W, H, k])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onTap(((e.clientX - r.left) / r.width) * ROOM_W, ((e.clientY - r.top) / r.height) * ROOM_H)
  }
  return (
    <div ref={wrap} className="flex justify-center">
      <canvas
        ref={canvas}
        onPointerDown={onPointerDown}
        style={{ width: W, height: H }}
        className={cx('touch-manipulation rounded-2xl', tapMode && 'ring-2 ring-amber-400/70')}
        role="img"
        aria-label={`Top-down map of a ${ROOM_W} by ${ROOM_H} metre room. Robot at ${pose.x.toFixed(1)}, ${pose.y.toFixed(1)} metres. Cyan dots are lidar returns, the green wedge is the ultrasonic cone, the yellow wedge is what the camera sees.`}
      />
    </div>
  )
}

// ── Camera and depth camera (software ray casting) ────────────────────

function ViewCanvas({ kind, objects, pose, lights, noise, spin }: { kind: 'camera' | 'depth'; objects: RoomObject[]; pose: Pose; lights: number; noise: number; spin: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const rng = useRef(makeRng(kind === 'camera' ? 9 : 13))
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    if (c.width !== IMG_W) {
      c.width = IMG_W
      c.height = IMG_H
    }
    const ctx = c.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(IMG_W, IMG_H)
    const d = img.data
    const f = IMG_W / 2 / Math.tan(CAM_FOV / 2)
    const hor = IMG_H / 2
    const r = rng.current
    const light = 0.06 + 0.94 * lights
    const put = (x: number, y: number, R: number, G: number, B: number, a = 1) => {
      const i = (y * IMG_W + x) * 4
      d[i] = d[i] * (1 - a) + R * a
      d[i + 1] = d[i + 1] * (1 - a) + G * a
      d[i + 2] = d[i + 2] * (1 - a) + B * a
      d[i + 3] = 255
    }
    for (let x = 0; x < IMG_W; x++) {
      const rel = Math.atan((x + 0.5 - IMG_W / 2) / f)
      const ang = pose.a + rel
      const cosRel = Math.cos(rel)
      const ca = Math.cos(ang)
      const sa = Math.sin(ang)
      // Ceiling and floor.
      for (let y = 0; y < IMG_H; y++) {
        if (y < hor) {
          if (kind === 'camera') put(x, y, 70 * light, 76 * light, 92 * light)
          else put(x, y, 0, 0, 0)
        } else {
          const dist = (f * CAM_HEIGHT) / (y + 0.5 - hor) // perpendicular distance
          const along = dist / cosRel
          if (kind === 'camera') {
            const wx = pose.x + ca * along
            const wy = pose.y + sa * along
            const tape = wx > 0 && wy > 0 && wx < ROOM_W && wy < ROOM_H && onTape(wx, wy)
            const base = tape ? 18 : 150
            put(x, y, base * light, (base - 6) * light, (base - 18) * light)
          } else {
            const [R, G, B] = depthColour(dist, noise, r)
            put(x, y, R, G, B)
          }
        }
      }
      // Surfaces, far to near (painter's algorithm).
      const hits = castAll(objects, pose.x, pose.y, ang)
      for (let h = hits.length - 1; h >= 0; h--) {
        const hit = hits[h]
        const o = hit.obj
        if (kind === 'depth' && o?.material === 'glass') continue // infrared passes through clear glass
        const dp = hit.dist * cosRel
        const top = o ? o.h : WALL_H
        const yTop = Math.max(0, Math.floor(hor + (f * (CAM_HEIGHT - top)) / dp))
        const yBot = Math.min(IMG_H, Math.ceil(hor + (f * CAM_HEIGHT) / dp))
        if (kind === 'camera') {
          const [R0, G0, B0] = o ? hexRgb(o.color) : [196, 202, 214]
          const s = hit.shade * light
          const alpha = o?.material === 'glass' ? 0.18 : 1
          for (let y = yTop; y < yBot; y++) put(x, y, R0 * s, G0 * s, B0 * s, alpha)
        } else {
          for (let y = yTop; y < yBot; y++) {
            const [R, G, B] = depthColour(dp, noise, r)
            put(x, y, R, G, B)
          }
        }
      }
    }
    // Camera grain: darker scenes are noisier (like a phone camera at night).
    if (kind === 'camera') {
      const grain = 4 + (1 - lights) * 26 + noise * 60
      for (let i = 0; i < d.length; i += 4) {
        const g = gauss(r) * grain
        d[i] = clamp(d[i] + g, 0, 255)
        d[i + 1] = clamp(d[i + 1] + g, 0, 255)
        d[i + 2] = clamp(d[i + 2] + g, 0, 255)
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [kind, objects, pose, lights, noise, spin])
  return (
    <canvas
      ref={canvas}
      width={IMG_W}
      height={IMG_H}
      className="aspect-[8/5] w-full rounded-xl bg-black [image-rendering:pixelated]"
      role="img"
      aria-label={kind === 'camera' ? 'What the robot camera sees' : 'Depth camera image: brighter means closer, black means too far or nothing seen'}
    />
  )
}

/** Near = bright orange-white, far = deep blue, beyond range = black. Noise grows with distance squared. */
function depthColour(dist: number, noise: number, r: () => number): [number, number, number] {
  const dn = dist + gauss(r) * (0.004 + noise * 0.08) * dist * dist
  if (dn > DEPTH_RANGE || dn <= 0) return [0, 0, 0]
  const t = clamp(1 - dn / DEPTH_RANGE, 0, 1)
  // Navy (far) → green → amber (near): bright = near, and no purple (docs/kids-design.md).
  return [20 + 235 * t * t, 30 + 170 * t, 60 + 40 * t - 60 * t * t]
}

// ── Lidar (robot-centred, spinning) ──────────────────────────────────

function LidarView({ scans }: { scans: LidarPoint[][] }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const S = Math.max(100, width)
  useEffect(() => {
    const c = canvas.current
    if (!c || !width) return
    const reduced = prefersReducedMotion()
    let raf = 0
    const start = performance.now()
    const range = 4.5
    const draw = (now: number) => {
      const ctx = fitCanvas(c, S, S)
      if (!ctx) return
      const k = S / 2 / range
      ctx.fillStyle = '#050A14'
      ctx.fillRect(0, 0, S, S)
      ctx.strokeStyle = 'rgba(0,229,255,.15)'
      ctx.lineWidth = 1
      for (let m = 1; m <= 4; m++) {
        ctx.beginPath()
        ctx.arc(S / 2, S / 2, m * k, 0, Math.PI * 2)
        ctx.stroke()
      }
      const sweep = reduced ? Math.PI * 2 : (((now - start) / 1000) % 1) * Math.PI * 2
      // Robot faces up in this view.
      const toXY = (p: LidarPoint) => {
        const a = p.angle - Math.PI / 2
        return [S / 2 + Math.cos(a) * p.range * k, S / 2 + Math.sin(a) * p.range * k]
      }
      scans.forEach((scan, si) => {
        const latest = si === scans.length - 1
        for (const p of scan) {
          if (latest && p.angle > sweep) continue
          const [x, y] = toXY(p)
          ctx.fillStyle = latest ? '#00E5FF' : 'rgba(0,229,255,.3)'
          ctx.fillRect(x - 1, y - 1, 2.2, 2.2)
        }
      })
      if (!reduced) {
        ctx.strokeStyle = 'rgba(0,229,255,.6)'
        ctx.beginPath()
        ctx.moveTo(S / 2, S / 2)
        ctx.lineTo(S / 2 + Math.cos(sweep - Math.PI / 2) * S, S / 2 + Math.sin(sweep - Math.PI / 2) * S)
        ctx.stroke()
      }
      ctx.fillStyle = '#FC6818'
      ctx.beginPath()
      ctx.moveTo(S / 2, S / 2 - 7)
      ctx.lineTo(S / 2 - 5, S / 2 + 5)
      ctx.lineTo(S / 2 + 5, S / 2 + 5)
      ctx.fill()
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [scans, width, S])
  const n = scans.length ? scans[scans.length - 1].length : 0
  return (
    <div ref={wrap}>
      <canvas ref={canvas} style={{ width: '100%', height: S }} className="rounded-xl" role="img" aria-label={`Lidar view from the robot, facing up. ${n} returns this spin; rings are 1 metre apart. Range up to ${LIDAR_RANGE} metres.`} />
    </div>
  )
}

function SonarReadout({ range }: { range: number | null }) {
  return (
    <div className="flex aspect-square flex-col items-center justify-center rounded-xl bg-[#050A14] p-2 text-center" aria-live="polite">
      {range === null ? (
        <>
          <span className="font-display text-2xl font-bold text-slate-300">no echo</span>
          <span className="mt-1 text-xs text-slate-400">nothing within 4 m (or something soft)</span>
        </>
      ) : (
        <>
          <span className="font-display text-4xl font-bold tabular-nums text-emerald-300">{range.toFixed(2)}</span>
          <span className="text-sm font-semibold text-emerald-200">metres</span>
          <span className="mt-2 text-xs text-slate-400">echo after {((2 * range) / 343 * 1000).toFixed(1)} ms</span>
          <span className="text-[11px] text-slate-500">sound: 343 m/s, there and back</span>
        </>
      )}
    </div>
  )
}

function LineBars({ vals }: { vals: number[] }) {
  const names = ['L2', 'L1', 'Mid', 'R1', 'R2']
  return (
    <div className="flex items-end justify-between gap-1.5 rounded-xl bg-[#050A14] p-2" role="img" aria-label={`Line sensor readings left to right: ${vals.map((v) => v.toFixed(2)).join(', ')}. Low means black tape.`}>
      {vals.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="relative h-20 w-full overflow-hidden rounded-lg bg-white/[0.06]">
            <div className={cx('absolute inset-x-0 bottom-0 rounded-lg', v < 0.45 ? 'bg-slate-500' : 'bg-amber-300')} style={{ height: `${Math.round(v * 100)}%` }} />
          </div>
          <span className="mt-1 font-display text-xs font-bold tabular-nums text-white">{v.toFixed(2)}</span>
          <span className="text-[11px] text-slate-400">{names[i]}</span>
          <span className={cx('text-[11px] font-semibold', v < 0.45 ? 'text-slate-200' : 'text-slate-500')}>{v < 0.45 ? 'black' : 'floor'}</span>
        </div>
      ))}
    </div>
  )
}
