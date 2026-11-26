'use client'

// components/kids/games/arm-factory/ArmFactoryClient.tsx
// Arm Factory: a 3-joint robot arm beside a conveyor. Owns the simulation
// (sim.ts), the 3D view (scene.ts) and the round logic for the four tiers:
//   Cadet  — forward kinematics: move each joint yourself, grab a still part.
//   Pilot  — a moving belt: teach poses, time the grab.
//   Ace    — inverse kinematics: tap a point, pick elbow-up/down, plan waypoints round a pillar.
//   Legend — write a looping pick-and-place program under payload, torque and cycle-time limits.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { FactoryScene, type CamPreset, type GhostSpec, type SceneExtras } from './scene'
import {
  ArmSim,
  BINS,
  COLOR_HEX,
  COLOR_SYMBOL,
  DT,
  GRASP_Y,
  LEGEND_PARTS,
  PART_HALF,
  tierConfig,
  type PartColor,
  type PlanStep,
  type ProgStep,
  type SimEvent,
} from './sim'
import { DEG, GRIP_MAX_FORCE, HOME, SHOULDER_MAX_TORQUE, collide, ik, planMove, type Joints, type V3 } from './kinematics'
import { COLOR_TEXT, GripButton, JointJog, Panel, Pendant, PlanEditor, ProgramEditor, type QueueItem, type SolutionView } from './ArmControlsClient'

const STARTER: ProgStep[] = [
  { kind: 'wait', when: 'always' },
  { kind: 'move', pose: 'abovePick', speed: 100, when: 'always' },
  { kind: 'move', pose: 'pick', speed: 100, when: 'always' },
  { kind: 'grip', when: 'always' },
  { kind: 'move', pose: 'abovePick', speed: 100, when: 'always' },
  { kind: 'move', pose: 'aboveBin', speed: 100, when: 'always' },
  { kind: 'release', when: 'always' },
  { kind: 'move', pose: 'home', speed: 100, when: 'always' },
]
/** Calibrated on the fixed Legend stream: the best programs we found finish in about 33.5 s. */
const TARGET3 = 35
const TARGET2 = 45
const ACE_SPEED = 0.6

interface Snap {
  j: Joints
  targets: Joints
  tip: V3
  gripClosed: boolean
  held: { color: PartColor; heavy: boolean } | null
  sorted: number
  wrong: number
  dropped: number
  rejected: number
  crashes: number
  running: boolean
  pc: number
  torque: number
  gripForce: number
  peakTorque: number
  peakGrip: number
  runTime: number
  time: number
  graspDist: number | null
  queue: QueueItem[]
  partsTotal: number
}

interface Coach {
  id: number
  text: string
  tone: 'good' | 'bad' | 'info'
}

function takeSnap(sim: ArmSim): Snap {
  const p = sim.activePart()
  const queue: QueueItem[] = sim.cfg.parts.map((spec, i) => {
    const part = sim.parts[i]
    let state: QueueItem['state'] = 'next'
    if (part) {
      if (part.state === 'binned' && part.bin === part.color) state = 'done'
      else if (part.state === 'binned' || part.state === 'floor' || part.state === 'rejected') state = 'lost'
      else if (part.state === 'held' || sim.partAtSensor() === part) state = 'now'
    }
    return { color: spec.color, heavy: spec.heavy, state }
  })
  return {
    j: [...sim.j] as Joints,
    targets: [...sim.targets] as Joints,
    tip: sim.tip,
    gripClosed: sim.gripDir === 1 || (sim.grip >= 1 && sim.gripDir === 0),
    held: sim.held ? { color: sim.held.color, heavy: sim.held.heavy } : null,
    sorted: sim.stats.sorted,
    wrong: sim.stats.wrong,
    dropped: sim.stats.dropped,
    rejected: sim.stats.rejected,
    crashes: sim.stats.crashes,
    running: sim.running,
    pc: sim.pc,
    torque: sim.liveTorque,
    gripForce: sim.liveGrip,
    peakTorque: sim.peakTorque,
    peakGrip: sim.peakGrip,
    runTime: sim.running ? sim.time - sim.runStart : sim.runEnd >= 0 ? sim.runEnd - sim.runStart : 0,
    time: sim.time,
    graspDist: p && !sim.held ? sim.graspDistance(p) : null,
    queue,
    partsTotal: sim.cfg.parts.length,
  }
}

const cm = (v: number) => Math.round(v * 100)
const r1 = (v: number) => Math.round(v * 10) / 10

interface Props {
  tier: number
  round: number
  onFinish: (r: RoundResult) => void
}

export default function ArmFactoryClient({ tier, round, onFinish }: Props) {
  const cfg = useMemo(() => tierConfig(tier, round), [tier, round])
  const simRef = useRef<ArmSim | null>(null)
  if (!simRef.current) {
    simRef.current = new ArmSim(cfg)
    if (cfg.mode === 'program' || cfg.pendant) simRef.current.beltOn = false
  }
  /** Holds the WebGL <canvas>, which the render effect creates and removes itself. */
  const glHostRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<FactoryScene | null>(null)
  const [snap, setSnap] = useState<Snap>(() => takeSnap(simRef.current as ArmSim))
  const [coach, setCoach] = useState<Coach | null>(null)
  const [cam, setCam] = useState<CamPreset>('front')
  const [started, setStarted] = useState(false)
  const [hint, setHint] = useState(false)
  const [slots, setSlots] = useState<(Joints | null)[]>([null, null, null, null])
  // Ace
  const [aim, setAim] = useState<{ x: number; z: number; label: string | null } | null>(null)
  const [height, setHeight] = useState(0.3)
  const [plan, setPlan] = useState<PlanStep[]>([])
  const [armVersion, setArmVersion] = useState(0)
  // Legend
  const [program, setProgram] = useState<ProgStep[]>(STARTER)
  const [timeScale, setTimeScale] = useState(1)
  const [report, setReport] = useState<{ ok: boolean; title: string; body: string } | null>(null)

  const timeScaleRef = useRef(1)
  timeScaleRef.current = cfg.mode === 'program' ? timeScale : 1
  const finishedRef = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const runsRef = useRef(0)
  const aceMotionRef = useRef(0)
  const aceSortedAtRunRef = useRef(0)
  const coachId = useRef(0)
  const extrasRef = useRef<Omit<SceneExtras, 'graspReady' | 'dropLine' | 'gate'>>({ ghosts: [], target: null, ringHeight: null, path: null })

  const say = useCallback((text: string, tone: Coach['tone'] = 'info') => {
    coachId.current++
    setCoach({ id: coachId.current, text, tone })
  }, [])

  useEffect(() => {
    if (!coach) return
    const t = setTimeout(() => setCoach((c) => (c && c.id === coach.id ? null : c)), coach.tone === 'bad' ? 9000 : 6000)
    return () => clearTimeout(t)
  }, [coach])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  const refresh = useCallback(() => {
    if (simRef.current) setSnap(takeSnap(simRef.current))
  }, [])

  // ── Finishing a round ─────────────────────────────────────────────────────

  const finishRound = useCallback(
    (r: RoundResult) => {
      if (finishedRef.current) return
      finishedRef.current = true
      later(() => onFinish(r), 900)
    },
    [later, onFinish],
  )

  const onDone = useCallback(
    (sim: ArmSim) => {
      const st = sim.stats
      if (tier === 0) {
        const mistakes = st.wrong + st.dropped
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
        finishRound({
          stars,
          score: r1(sim.time - Math.max(0, sim.firstInput)),
          scoreLabel: 'seconds',
          lowerIsBetter: true,
          message:
            mistakes === 0
              ? 'All three parts sorted with no slips! You chose every joint angle yourself and the hand ended up exactly on the part — that is forward kinematics: angles in, hand position out.'
              : `All three parts sorted, with ${mistakes} oops along the way. Each joint moves the hand in a circle around that joint, so small angle changes near the base swing the hand a long way.`,
          badges: ['arm-artist'],
          attempts: 1 + mistakes,
        })
      } else if (tier === 1) {
        const c = st.sorted
        const stars = c >= 6 ? 3 : c === 5 ? 2 : c === 4 ? 1 : 0
        finishRound({
          stars,
          score: c,
          scoreLabel: 'of 6 sorted',
          message:
            stars > 0
              ? `${c} of 6 sorted on a moving belt. The belt slid each part 8 cm every second, so you had to close the fingers just as the part arrived — real lines use "conveyor tracking" so the arm follows the belt.`
              : `Only ${c} of 6 made it. The belt never waits: a part moves 2 cm in the quarter-second the fingers take to close. Park the open gripper low over the belt and close it as the part slides in.`,
          badges: stars > 0 ? ['arm-artist'] : undefined,
          attempts: 1,
        })
      } else if (tier === 2) {
        const crashes = st.crashes
        const stars = crashes === 0 ? 3 : crashes <= 2 ? 2 : 1
        finishRound({
          stars,
          score: r1(aceMotionRef.current),
          scoreLabel: 's of arm motion',
          lowerIsBetter: true,
          message:
            crashes === 0
              ? 'Three parts round the pillar with zero crashes! The arm solved its own joint angles (inverse kinematics) and you chose waypoints so its curving path stayed clear.'
              : `Done, with ${crashes} crash${crashes === 1 ? '' : 'es'}. A joint move turns every joint at once, so the hand swings along a curve, not a straight line — that curve is what hit the pillar. High waypoints or a tucked arm fix it.`,
          badges: ['arm-artist'],
          attempts: runsRef.current,
        })
      } else {
        const t = sim.time - sim.runStart
        if (st.sorted < LEGEND_PARTS) {
          setReport({
            ok: false,
            title: `Shift over: ${st.sorted} of ${LEGEND_PARTS} in the right bin`,
            body: `${st.wrong} part(s) went to the wrong bin. "Above its bin" reads the colour of the part in the gripper — make sure you grip before you move there.`,
          })
          return
        }
        const stars = t <= TARGET3 ? 3 : t <= TARGET2 ? 2 : 1
        finishRound({
          stars,
          score: r1(t),
          scoreLabel: 'second shift',
          lowerIsBetter: true,
          message: `All ${LEGEND_PARTS} sorted in ${t.toFixed(1)} s (⭐⭐⭐ needs ≤ ${TARGET3} s). Your grip never needed more than ${sim.peakGrip.toFixed(1)} N of the ${GRIP_MAX_FORCE.toFixed(1)} N the fingers can hold, and the shoulder peaked at ${sim.peakTorque.toFixed(1)} of ${SHOULDER_MAX_TORQUE} N·m. ${
            stars < 3 ? 'Fewer moves and faster light-part moves cut the cycle time.' : 'That is how real cells are tuned: fast where it is safe, gentle where it is heavy.'
          }`,
          badges: ['arm-artist', 'gear-head'],
          attempts: runsRef.current,
        })
      }
    },
    [finishRound, tier],
  )

  // ── Events from the simulation ────────────────────────────────────────────

  const handleEvents = (sim: ArmSim, evs: SimEvent[]) => {
    const scene = sceneRef.current
    for (const e of evs) {
      switch (e.type) {
        case 'grip':
          playSound('click')
          if (cfg.mode === 'jog')
            say(
              `Got it! A ${e.part.color} part. Lift it up before you turn — the bin walls are in the way.`,
              'good',
            )
          break
        case 'missGrip':
          playSound('click')
          if (cfg.mode === 'jog')
            say(
              tier === 1
                ? `Too early or too late — the part was ${cm(e.dist)} cm from the fingers when they closed. Open, and try again as the next one slides in.`
                : `The fingers closed on air: the part was ${cm(e.dist)} cm away. Get the white dot onto the part and wait for the green ring.`,
              'bad',
            )
          break
        case 'release':
          playSound('click')
          break
        case 'sorted':
          playSound('correct')
          scene?.burst({ x: e.part.pos.x, y: e.part.pos.y + 0.05, z: e.part.pos.z }, COLOR_HEX[e.part.color], 46, 1.3)
          if (cfg.mode !== 'program') say(`Sorted! ${COLOR_SYMBOL[e.part.color]} ${e.part.color} part → ${e.part.color} bin.`, 'good')
          break
        case 'wrong':
          playSound('wrong')
          say(
            `Oops — a ${e.part.color} part landed in the ${e.bin} bin.${cfg.returnMistakes ? ' A helper puts it back on the belt.' : ''}`,
            'bad',
          )
          break
        case 'drop':
          playSound('wrong')
          scene?.burst({ x: e.part.pos.x, y: e.part.pos.y, z: e.part.pos.z }, 0x94a3b8, 16, 0.6)
          if (cfg.mode !== 'program')
            say(`The part fell on the floor. Open the gripper only when the white dot is inside a bin.${cfg.returnMistakes ? ' A helper puts it back.' : ''}`, 'bad')
          break
        case 'reject':
          playSound('wrong')
          say('A part rode off the end of the belt into the MISSED chute.', 'bad')
          break
        case 'bump':
          playSound('click')
          say(`Bump! The ${e.hit.armPart} touched the ${e.hit.obstacle}, so that joint stopped. Move a different joint to go around it.`, 'bad')
          break
        case 'crash': {
          playSound('wrong')
          scene?.shake()
          const t = sim.tip
          scene?.burst({ x: t.x, y: t.y, z: t.z }, 0xef4444, 30, 1)
          if (tier === 2) {
            aceMotionRef.current += sim.time - sim.runStart
            say(
              `Crash at step ${e.step + 1}! The ${e.hit.armPart} hit the ${e.hit.obstacle}. All joints turn together, so the hand swings in a curve — add a higher waypoint, or tuck the arm in.`,
              'bad',
            )
            later(() => {
              simRef.current?.resetArm()
              setArmVersion((v) => v + 1)
              refresh()
            }, 1700)
          } else {
            setReport({
              ok: false,
              title: `Crash at step ${e.step + 1}`,
              body: `The ${e.hit.armPart} hit the ${e.hit.obstacle}. A joint move swings the hand along a curve; add an "Above …" step so it stays high.`,
            })
          }
          break
        }
        case 'slip':
          playSound('wrong')
          scene?.shake()
          setReport({
            ok: false,
            title: `Step ${e.step + 1}: the heavy part slipped out!`,
            body: `Speeding up at ${e.accel.toFixed(1)} m/s² while holding ${e.part.mass} kg needed ${e.need.toFixed(1)} N of grip, but the rubber fingers can hold only ${GRIP_MAX_FORCE.toFixed(1)} N (friction = 2 fingers × 0.6 × 15.5 N squeeze). Slow that move for heavy parts — use "heavy only" steps.`,
          })
          break
        case 'overload':
          playSound('wrong')
          scene?.shake()
          setReport({
            ok: false,
            title: `Step ${e.step + 1}: shoulder motor overload`,
            body: `The shoulder needed ${e.torque.toFixed(1)} N·m but the motor tops out at ${SHOULDER_MAX_TORQUE} N·m. Torque = holding the arm up against gravity + speeding it up (I × α). A heavy part far out, moved fast, asks for both.`,
          })
          break
        case 'fault':
          playSound('wrong')
          if (cfg.mode === 'program') setReport({ ok: false, title: 'Program stopped', body: e.msg })
          else say(e.msg, 'bad')
          break
        case 'planDone':
          if (tier === 2) {
            aceMotionRef.current += sim.time - sim.runStart
            if (sim.stats.sorted > aceSortedAtRunRef.current) {
              if (!sim.done) {
                say('Part sorted! A new part is on the belt — change the moves that need to change (the pick spot, which bin) and run again.', 'good')
                setAim(null)
              }
            } else if (sim.held) {
              say('The plan finished, but the part is still in the gripper. Add a Release over its bin.', 'info')
            } else {
              say('The plan finished, but the part is not in its bin yet. Check each step: move → grip → lift → over the bin → release.', 'info')
            }
            setArmVersion((v) => v + 1)
          }
          break
        case 'done':
          onDone(sim)
          break
      }
    }
  }
  const handleRef = useRef(handleEvents)
  handleRef.current = handleEvents

  // ── Ace: IK for the aimed point, ghosts and path preview ─────────────────

  const aimPoint: V3 | null = aim ? { x: aim.x, y: height, z: aim.z } : null
  const plannedHolding = useMemo(() => {
    let h = !!simRef.current?.held
    for (const s of plan) {
      if (s.kind === 'grip') h = true
      if (s.kind === 'release') h = false
    }
    return h
  }, [plan, armVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const ikView = useMemo(() => {
    if (!aimPoint || cfg.mode !== 'plan') return null
    const sim = simRef.current as ArmSim
    const res = ik(aimPoint, sim.j[0])
    const sols: SolutionView[] = res.solutions.map((sol) => {
      const hit = collide(sol.joints, sim.obstacles, plannedHolding ? PART_HALF : null)
      return { sol, hit: hit ? hit.obstacle : null }
    })
    return { reach: res.reachable ? ('ok' as const) : (res.reason ?? 'far'), sols }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aim, height, cfg.mode, plannedHolding])

  const preview = useMemo(() => {
    if (cfg.mode !== 'plan' || !plan.length) return { path: null, bad: new Set<number>() }
    const sim = simRef.current as ArmSim
    let cur: Joints = [...sim.j] as Joints
    let holding = !!sim.held
    const pts: V3[] = []
    const badPts: boolean[] = []
    const bad = new Set<number>()
    plan.forEach((s, i) => {
      if (s.kind === 'grip') holding = true
      else if (s.kind === 'release') holding = false
      else {
        const mv = planMove(cur, s.joints, ACE_SPEED)
        const n = Math.max(8, Math.ceil(mv.T * 40))
        for (let k = 0; k <= n; k++) {
          const j = mv.at((k / n) * mv.T)
          const hit = collide(j, sim.obstacles, holding ? PART_HALF : null)
          if (hit) bad.add(i)
          const P = sim.tipOf(j)
          pts.push(P)
          badPts.push(!!hit)
        }
        cur = s.joints
      }
    })
    return { path: { pts, bad: badPts }, bad }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, armVersion, cfg.mode])

  // Feed the 3D view.
  useEffect(() => {
    const ghosts: GhostSpec[] = []
    if (ikView && ikView.reach === 'ok') {
      for (const v of ikView.sols) {
        const ok = v.sol.violated.length === 0 && !v.hit
        ghosts.push({ joints: v.sol.joints, color: !ok ? 0xef4444 : v.sol.elbow === 'up' ? 0x22d3ee : 0xffa878 })
      }
    }
    if (hint && cfg.mode === 'jog') {
      const sim = simRef.current as ArmSim
      let goal: V3 | null = null
      if (sim.held) {
        const bin = BINS.find((b) => b.color === sim.held?.color)
        if (bin) goal = { x: bin.x, y: 0.3, z: bin.z }
      } else {
        const p = sim.activePart()
        if (p) goal = { x: p.pos.x, y: GRASP_Y, z: p.pos.z }
      }
      const sol = goal ? ik(goal).solutions.find((s) => s.elbow === 'up' && s.violated.length === 0) : undefined
      if (sol) ghosts.push({ joints: sol.joints, color: 0x4ade80 })
    }
    extrasRef.current = {
      ghosts,
      target: aimPoint ? { p: aimPoint, ok: !!ikView && ikView.reach === 'ok' && ikView.sols.some((v) => v.sol.violated.length === 0 && !v.hit) } : null,
      ringHeight: cfg.mode === 'plan' ? height : cfg.mode === 'jog' && tier === 0 ? GRASP_Y : null,
      path: preview.path,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ikView, preview, hint, snap.held, snap.sorted, height, aim, cfg.mode, tier])

  // ── Render loop ───────────────────────────────────────────────────────────

  useEffect(() => {
    const host = glHostRef.current
    const wrap = wrapRef.current
    if (!host || !wrap) return
    // A fresh <canvas> per scene: dispose() force-loses its WebGL context (so
    // GPU memory is freed on every round change), and a lost context can never
    // be reused, so the next scene (or a Strict Mode re-run) must not share it.
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 block h-full w-full'
    host.appendChild(canvas)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let scene: FactoryScene
    try {
      scene = new FactoryScene(canvas, { pillar: cfg.pillar, reducedMotion: reduced })
    } catch (err) {
      canvas.remove()
      console.error('Arm Factory: 3D view failed to start', err)
      say('This device could not start 3D graphics. Try another browser.', 'bad')
      return
    }
    sceneRef.current = scene
    const fit = () => scene.resize(wrap.clientWidth, wrap.clientHeight)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    let raf = 0
    let last = performance.now()
    let acc = 0
    let snapT = 0
    const gate: SceneExtras['gate'] = cfg.mode === 'program' ? 'sensor' : tier === 1 ? 'zone' : 'none'
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const real = Math.min(0.05, (now - last) / 1000)
      last = now
      if (document.hidden) return
      const sim = simRef.current
      if (!sim) return
      acc += real * timeScaleRef.current
      let n = 0
      while (acc >= DT && n < 2000) {
        sim.step(DT)
        acc -= DT
        n++
      }
      if (sim.events.length) {
        const evs = sim.events
        sim.events = []
        handleRef.current(sim, evs)
      }
      let graspReady: number | null = null
      if (cfg.mode === 'jog' && !sim.held && sim.grip < 0.5) {
        const p = sim.activePart()
        if (p && sim.graspDistance(p) <= cfg.graspTol) graspReady = p.id
      }
      scene.update(sim, { ...extrasRef.current, graspReady, dropLine: cfg.mode === 'jog', gate }, real)
      snapT += real
      if (snapT > 0.08) {
        snapT = 0
        setSnap(takeSnap(sim))
      }
    }
    raf = requestAnimationFrame(frame)
    const onVis = () => {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      scene.dispose()
      canvas.remove()
      sceneRef.current = null
    }
  }, [cfg, say, tier])

  useEffect(() => {
    sceneRef.current?.setCamera(cam)
  }, [cam])

  // ── Commands ──────────────────────────────────────────────────────────────

  const sim = simRef.current as ArmSim
  const setJoint = useCallback(
    (i: number, rad: number) => {
      simRef.current?.setTarget(i, rad)
      refresh()
    },
    [refresh],
  )
  const toggleGrip = useCallback(() => {
    simRef.current?.toggleGrip()
    refresh()
  }, [refresh])
  const goSlot = useCallback(
    (i: number) => {
      const s = slots[i]
      if (s) simRef.current?.setTargets(s)
    },
    [slots],
  )
  const saveSlot = useCallback((i: number) => {
    const s = simRef.current
    if (!s) return
    setSlots((prev) => prev.map((v, k) => (k === i ? ([...s.j] as Joints) : v)))
    playSound('click')
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && (el as HTMLInputElement).type !== 'range')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const s = simRef.current
      if (!s || finishedRef.current) return
      const k = e.key.toLowerCase()
      if (cfg.mode === 'jog') {
        const map: Record<string, [number, number]> = { q: [0, 1], a: [0, -1], w: [1, 1], s: [1, -1], e: [2, 1], d: [2, -1] }
        if (map[k]) {
          const [i, d] = map[k]
          s.setTarget(i, s.targets[i] + d * 4 * DEG)
          e.preventDefault()
          return
        }
        if (k === ' ' && tag !== 'BUTTON') {
          e.preventDefault()
          s.toggleGrip()
          return
        }
        if (cfg.pendant && ['1', '2', '3', '4', '!', '@', '#', '$'].includes(e.key)) {
          const idx = ['1', '2', '3', '4'].indexOf(e.key)
          const sidx = ['!', '@', '#', '$'].indexOf(e.key)
          if (e.shiftKey || sidx >= 0) saveSlot(sidx >= 0 ? sidx : idx)
          else goSlot(idx)
        }
      } else if (cfg.mode === 'plan' && tag !== 'INPUT') {
        const nud: Record<string, [number, number]> = { arrowleft: [-0.02, 0], arrowright: [0.02, 0], arrowup: [0, -0.02], arrowdown: [0, 0.02] }
        if (nud[k]) {
          e.preventDefault()
          setAim((a) => (a ? { x: a.x + nud[k][0], z: a.z + nud[k][1], label: null } : a))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cfg.mode, cfg.pendant, goSlot, saveSlot])

  // Ace: tap to aim
  const down = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (cfg.mode !== 'plan' || !down.current) return
    const moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y)
    down.current = null
    if (moved > 10) return
    const c = glHostRef.current
    const scene = sceneRef.current
    if (!c || !scene) return
    const r = c.getBoundingClientRect()
    const hit = scene.pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    if (!hit) return
    aimAt(hit.x, hit.z)
  }

  const aimAt = (x: number, z: number) => {
    const s = simRef.current as ArmSim
    // Snap to a part or a bin when the tap is close: small fingers, small screens.
    const part = s.parts.find((p) => p.state === 'belt' && Math.hypot(p.pos.x - x, p.pos.z - z) < 0.08)
    if (part) {
      setAim({ x: part.pos.x, z: part.pos.z, label: `the ${part.color} part` })
      setHeight(GRASP_Y)
      say(`Aimed at the ${part.color} part. Hand height set to grab it (${cm(GRASP_Y)} cm).`, 'info')
      playSound('click')
      return
    }
    const bin = BINS.find((b) => Math.hypot(b.x - x, b.z - z) < 0.13)
    if (bin) {
      setAim({ x: bin.x, z: bin.z, label: `over the ${bin.color} bin` })
      if (height < 0.25) setHeight(0.3)
      playSound('click')
      return
    }
    setAim({ x, z, label: null })
    playSound('click')
  }

  const addMove = (elbow: 'up' | 'down') => {
    if (!aimPoint || !ikView) return
    const v = ikView.sols.find((s) => s.sol.elbow === elbow)
    if (!v) return
    const where = aim?.label ?? `(${cm(aimPoint.x)}, ${cm(aimPoint.z) * -1}) cm`
    setPlan((p) => [...p, { kind: 'move', joints: v.sol.joints, label: `${where} · ${cm(aimPoint.y)} cm high · elbow ${elbow}` }])
    playSound('click')
  }

  const runPlan = () => {
    const s = simRef.current
    if (!s || !plan.length) return
    if (preview.bad.size) say(`Heads up: step ${[...preview.bad][0] + 1} is drawn red — that path hits something. Running anyway…`, 'info')
    aceSortedAtRunRef.current = s.stats.sorted
    runsRef.current++
    s.runPlan(plan)
    refresh()
  }

  const runShift = () => {
    const fresh = new ArmSim(cfg)
    fresh.beltOn = true
    simRef.current = fresh
    runsRef.current++
    setReport(null)
    fresh.runProgram(program)
    refresh()
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  const left = snap.partsTotal - snap.queue.filter((q) => q.state === 'done' || q.state === 'lost').length
  const goal =
    tier === 0
      ? `Sort the parts · ${snap.sorted}/3`
      : tier === 1
        ? `Sorted ${snap.sorted} · Missed ${snap.rejected + snap.wrong + snap.dropped} · Left ${left}`
        : tier === 2
          ? `Part ${Math.min(3, snap.sorted + 1)} of 3 · Crashes ${snap.crashes}`
          : `Sorted ${snap.sorted}/${LEGEND_PARTS} · ${snap.runTime.toFixed(1)} s`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div
        ref={wrapRef}
        className="relative aspect-[4/3] w-full self-start overflow-hidden rounded-3xl border border-white/10 bg-slate-950 lg:sticky lg:top-3 lg:aspect-auto lg:h-[600px]"
      >
        <div
          ref={glHostRef}
          className={`absolute inset-0 touch-manipulation ${cfg.mode === 'plan' ? 'cursor-crosshair' : ''}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          aria-label="3D view of the robot arm, the conveyor belt and three coloured bins"
          role="img"
        />
        <div className="pointer-events-none absolute left-2 top-2 rounded-xl bg-slate-950/75 px-2.5 py-1.5 text-xs font-black text-white sm:text-sm" aria-live="polite">
          {goal}
        </div>
        <div className="absolute right-2 top-2 flex gap-1 rounded-xl bg-slate-950/75 p-1" role="radiogroup" aria-label="Camera">
          {(['front', 'top', 'side'] as CamPreset[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cam === c}
              onClick={() => setCam(c)}
              className={`min-h-[44px] min-w-[44px] rounded-lg px-2 text-xs font-black capitalize ${cam === c ? 'bg-amber-400 text-slate-900' : 'text-white/75 hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div
          className={`pointer-events-none absolute left-2 rounded-xl bg-slate-950/75 px-2.5 py-1.5 font-mono text-[10px] leading-tight text-cyan-200 sm:text-xs ${
            cfg.mode === 'jog' ? 'top-11 lg:bottom-2 lg:top-auto' : 'bottom-2'
          }`}
        >
          <div>
            B {Math.round(snap.j[0] / DEG)}° · S {Math.round(snap.j[1] / DEG)}° · E {Math.round(snap.j[2] / DEG)}°
          </div>
          <div>
            hand x {cm(snap.tip.x)} · y {cm(snap.tip.y)} · z {cm(-snap.tip.z)} cm
          </div>
          {snap.held && (
            <div className={COLOR_TEXT[snap.held.color]}>
              holding {COLOR_SYMBOL[snap.held.color]} {snap.held.heavy ? '1.6 kg' : '0.4 kg'}
            </div>
          )}
          {cfg.mode === 'jog' && snap.graspDist !== null && <div className="text-white/80">part {cm(snap.graspDist)} cm away</div>}
        </div>
        {coach && (
          <div
            key={coach.id}
            role="status"
            className={`pointer-events-none absolute inset-x-2 bottom-14 mx-auto max-w-lg rounded-2xl px-3 py-2 text-center text-sm font-bold shadow-xl sm:bottom-16 ${
              coach.tone === 'good' ? 'bg-emerald-500/90 text-white' : coach.tone === 'bad' ? 'bg-rose-600/90 text-white' : 'bg-slate-800/95 text-white'
            }`}
          >
            {coach.text}
          </div>
        )}
        {cfg.mode === 'jog' && (
          // Phones: the side panel scrolls away under the 3D view, so the buttons
          // needed mid-move ride on the view itself.
          <div className="absolute bottom-2 right-2 flex gap-1.5 lg:hidden" aria-label="Quick controls">
            {cfg.pendant && (
              <>
                <button
                  type="button"
                  onClick={() => sim.setTargets(HOME)}
                  aria-label="Go home"
                  className="h-11 w-11 rounded-xl bg-slate-900/90 text-lg font-black text-white ring-1 ring-white/20 active:bg-white/20"
                >
                  ⌂
                </button>
                {slots.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!s}
                    onClick={() => goSlot(i)}
                    aria-label={`Go to saved pose ${i + 1}`}
                    className="h-11 w-11 rounded-xl bg-amber-400 text-base font-black text-slate-900 active:bg-amber-300 disabled:bg-slate-900/80 disabled:text-white/30"
                  >
                    {i + 1}
                  </button>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={toggleGrip}
              aria-label={snap.gripClosed ? 'Open gripper' : 'Close gripper'}
              className={`h-11 min-w-[44px] rounded-xl px-2 text-xl font-black shadow-lg ${snap.gripClosed ? 'bg-cyan-400 text-slate-900' : 'bg-emerald-400 text-slate-900'}`}
            >
              {snap.gripClosed ? '✋' : '✊'}
            </button>
          </div>
        )}
        {cfg.pendant && !started && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
            <div className="max-w-xs rounded-3xl bg-slate-900/95 p-4 text-center shadow-2xl">
              <p className="text-sm text-white/80">Six parts are coming. Save your poses first if you like — the belt waits until you start it.</p>
              <button
                type="button"
                onClick={() => {
                  sim.beltOn = true
                  setStarted(true)
                  playSound('click')
                }}
                className="mt-3 min-h-[52px] w-full rounded-2xl bg-emerald-400 text-lg font-black text-slate-900"
              >
                ▶ Start the belt
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {cfg.mode === 'jog' && (
          <>
            <Panel title={tier === 0 ? 'Move each joint (forward kinematics)' : 'Jog the joints'}>
              <JointJog targets={snap.targets} actual={snap.j} onSet={setJoint} />
            </Panel>
            <GripButton closed={snap.gripClosed} onToggle={toggleGrip} />
            {tier === 0 && (
              <Panel title="Mission">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-white/80">
                  <li>Turn the base to face the part on the belt.</li>
                  <li>Use shoulder and elbow to bring the white dot onto the part. The ring turns green when the fingers are around it.</li>
                  <li>Grab, lift up high, turn to the bin with the same colour and symbol, then let go.</li>
                </ol>
                <button
                  type="button"
                  onClick={() => setHint((h) => !h)}
                  aria-pressed={hint}
                  className={`mt-2 min-h-[44px] w-full rounded-xl text-sm font-black ${hint ? 'bg-emerald-400 text-slate-900' : 'border border-white/15 text-white/80 hover:bg-white/10'}`}
                >
                  {hint ? '👻 Hide the helper ghost' : '👻 Show me a pose that works'}
                </button>
              </Panel>
            )}
            {tier === 1 && (
              <Panel title="Teach pendant">
                <Pendant slots={slots} onSave={saveSlot} onGo={goSlot} onHome={() => sim.setTargets(HOME)} />
              </Panel>
            )}
          </>
        )}
        {cfg.mode === 'plan' && (
          <PlanEditor
            target={aimPoint}
            height={height}
            setHeight={setHeight}
            nudge={(dx, dz) => setAim((a) => (a ? { x: a.x + dx, z: a.z + dz, label: null } : a))}
            reach={ikView ? ikView.reach : null}
            solutions={ikView ? ikView.sols : []}
            onAddMove={addMove}
            onAddGrip={() => setPlan((p) => [...p, { kind: 'grip' }])}
            onAddRelease={() => setPlan((p) => [...p, { kind: 'release' }])}
            plan={plan}
            badSteps={preview.bad}
            onRemove={(i) => setPlan((p) => p.filter((_, k) => k !== i))}
            onMoveStep={(i, d) =>
              setPlan((p) => {
                const k = i + d
                if (k < 0 || k >= p.length) return p
                const n = [...p]
                ;[n[i], n[k]] = [n[k], n[i]]
                return n
              })
            }
            onClear={() => setPlan([])}
            onRun={runPlan}
            onStop={() => {
              simRef.current?.stop()
              setArmVersion((v) => v + 1)
            }}
            running={snap.running}
            pc={snap.pc}
          />
        )}
        {cfg.mode === 'program' && (
          <ProgramEditor
            program={program}
            setProgram={setProgram}
            onRun={runShift}
            onStop={() => {
              simRef.current?.stop()
              refresh()
            }}
            onStarter={() => setProgram(STARTER)}
            running={snap.running}
            pc={snap.pc}
            timeScale={timeScale}
            setTimeScale={setTimeScale}
            torque={snap.torque}
            grip={snap.gripForce}
            peakTorque={snap.peakTorque}
            peakGrip={snap.peakGrip}
            runTime={snap.runTime}
            sorted={snap.sorted}
            total={LEGEND_PARTS}
            target3={TARGET3}
            target2={TARGET2}
            queue={snap.queue}
            report={report}
          />
        )}
      </div>
    </div>
  )
}
