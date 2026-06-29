'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SchoolSideNav } from '../_components/SchoolSideNav'
import {
  MISSIONS,
  getMission,
  type SimMission,
  type Difficulty,
} from '@/lib/school-curriculum'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
type Cmd =
  | { op: 'forward'; seconds: number }
  | { op: 'backward'; seconds: number }
  | { op: 'turn'; degrees: number }
  | { op: 'stop' }
  | { op: 'wait'; seconds: number }
  | { op: 'arm'; action: 'open' | 'close' | 'lift' | 'lower' }
  | { op: 'if-distance-lt'; cm: number; then: Cmd[] }
  | { op: 'if-colour'; colour: string; then: Cmd[] }
  | { op: 'repeat'; times: number; body: Cmd[] }

type Block = {
  id: string
  type: 'forward' | 'backward' | 'turn-left' | 'turn-right' | 'stop' | 'wait' | 'open' | 'close' | 'lift' | 'lower' | 'if-dist' | 'if-colour' | 'repeat'
  n?: number       // numeric input
  colour?: string  // for if-colour
}

type EditorTab = 'blocks' | 'python'

// ────────────────────────────────────────────────────────────────────────────
// Arena geometry
// ────────────────────────────────────────────────────────────────────────────
const CW = 600   // canvas width
const CH = 500   // canvas height
const CELL = 25  // for maze grid

type Wall = { x: number; y: number; w: number; h: number }
type Marker = { x: number; y: number; r: number; colour: string; label?: string }

interface ArenaSpec {
  walls: Wall[]
  start: { x: number; y: number; heading: number }
  goal?: { x: number; y: number; r: number }
  markers?: Marker[]
  line?: { from: { x: number; y: number }; to: { x: number; y: number }; cps?: { x: number; y: number }[] }
  description?: string
}

function arenaFor(m: SimMission): ArenaSpec {
  const border: Wall[] = [
    { x: 0, y: 0, w: CW, h: 6 },
    { x: 0, y: CH - 6, w: CW, h: 6 },
    { x: 0, y: 0, w: 6, h: CH },
    { x: CW - 6, y: 0, w: 6, h: CH },
  ]
  switch (m.arena) {
    case 'empty':
      return {
        walls: border,
        start: { x: 80, y: 250, heading: 0 },
        goal: { x: 500, y: 250, r: 30 },
      }
    case 'wall':
      return {
        walls: [...border, { x: 450, y: 100, w: 20, h: 300 }],
        start: { x: 80, y: 250, heading: 0 },
        goal: { x: 420, y: 250, r: 30 },
      }
    case 'line':
      return {
        walls: border,
        start: { x: 80, y: 100, heading: 0 },
        goal: { x: 520, y: 400, r: 25 },
        line: {
          from: { x: 80, y: 100 },
          to: { x: 520, y: 400 },
          cps: [{ x: 200, y: 100 }, { x: 300, y: 250 }, { x: 400, y: 400 }, { x: 520, y: 400 }],
        },
      }
    case 'maze': {
      const walls: Wall[] = [...border]
      const grid = [
        '111111111111111111111111',
        '100000001000000010000001',
        '101110101011110010111101',
        '101010001000010010100001',
        '101010111110010010101111',
        '100010000000010010100001',
        '111110111111110010111101',
        '100000000000000010000001',
        '101111111111111111111101',
        '101000000010000000000001',
        '101011110010111111111101',
        '100010000010100000000001',
        '101110111110101111111101',
        '101000100000000000000001',
        '101011101111111111110001',
        '101010001000000010010001',
        '101010101111110010011101',
        '101000100000010000000001',
        '101111101010011111110101',
        '100000001010000000000001',
        '111111111111111111111111',
      ]
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === '1') {
            walls.push({ x: c * CELL, y: r * CELL, w: CELL, h: CELL })
          }
        }
      }
      return { walls, start: { x: CELL * 1.5, y: CELL * 1.5, heading: 0 }, goal: { x: CW - 50, y: CH - 50, r: 18 } }
    }
    case 'hospital': {
      const walls: Wall[] = [
        ...border,
        // Corridor walls + rooms
        { x: 0, y: 200, w: 400, h: 6 },
        { x: 200, y: 200, w: 6, h: 100 },
        { x: 0, y: 350, w: 400, h: 6 },
        { x: 400, y: 0, w: 6, h: 200 },
        { x: 400, y: 350, w: 6, h: 150 },
      ]
      return {
        walls,
        start: { x: 60, y: 60, heading: 0 },
        goal: { x: 520, y: 420, r: 24 },
        markers: [
          { x: 60, y: 60, r: 12, colour: '#10b981', label: 'Pharmacy' },
          { x: 520, y: 420, r: 12, colour: '#ef4444', label: 'Bed 3' },
          { x: 100, y: 280, r: 8, colour: '#94a3b8', label: 'Bed 1' },
          { x: 280, y: 280, r: 8, colour: '#94a3b8', label: 'Bed 2' },
        ],
      }
    }
    case 'factory':
      return {
        walls: [
          ...border,
          { x: 100, y: 100, w: 6, h: 300 },
          { x: 500, y: 100, w: 6, h: 300 },
        ],
        start: { x: 50, y: 250, heading: 0 },
        markers: [
          { x: 150, y: 120, r: 10, colour: '#f59e0b', label: 'Part A' },
          { x: 150, y: 250, r: 10, colour: '#06b6d4', label: 'Part B' },
          { x: 150, y: 380, r: 10, colour: '#a855f7', label: 'Part C' },
          { x: 540, y: 250, r: 20, colour: '#10b981', label: 'Assembly' },
        ],
      }
    case 'farm':
      return {
        walls: border,
        start: { x: 60, y: 60, heading: 0 },
        markers: [
          { x: 200, y: 120, r: 18, colour: '#22c55e', label: 'Zone 1' },
          { x: 450, y: 120, r: 18, colour: '#22c55e', label: 'Zone 2' },
          { x: 200, y: 380, r: 18, colour: '#22c55e', label: 'Zone 3' },
          { x: 450, y: 380, r: 18, colour: '#22c55e', label: 'Zone 4' },
        ],
      }
    case 'sort':
      return {
        walls: [...border, { x: 200, y: 100, w: 200, h: 6 }, { x: 200, y: 400, w: 200, h: 6 }],
        start: { x: 80, y: 250, heading: 0 },
        markers: [
          { x: 300, y: 250, r: 14, colour: '#ef4444', label: 'Red box' },
          { x: 530, y: 80, r: 18, colour: '#ef4444', label: 'Red bin' },
          { x: 530, y: 420, r: 18, colour: '#3b82f6', label: 'Blue bin' },
        ],
      }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Block → command compiler
// ────────────────────────────────────────────────────────────────────────────
function compileBlocks(blocks: Block[]): Cmd[] {
  const cmds: Cmd[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'forward':    cmds.push({ op: 'forward', seconds: b.n ?? 1 }); break
      case 'backward':   cmds.push({ op: 'backward', seconds: b.n ?? 1 }); break
      case 'turn-left':  cmds.push({ op: 'turn', degrees: -(b.n ?? 90) }); break
      case 'turn-right': cmds.push({ op: 'turn', degrees: (b.n ?? 90) }); break
      case 'stop':       cmds.push({ op: 'stop' }); break
      case 'wait':       cmds.push({ op: 'wait', seconds: b.n ?? 1 }); break
      case 'open':       cmds.push({ op: 'arm', action: 'open' }); break
      case 'close':      cmds.push({ op: 'arm', action: 'close' }); break
      case 'lift':       cmds.push({ op: 'arm', action: 'lift' }); break
      case 'lower':      cmds.push({ op: 'arm', action: 'lower' }); break
    }
  }
  return cmds
}

// ────────────────────────────────────────────────────────────────────────────
// Python pseudo-parser: extracts robot.* calls in order
// (NOT eval — just regex pattern matching)
// ────────────────────────────────────────────────────────────────────────────
function compilePython(src: string): Cmd[] {
  const cmds: Cmd[] = []
  const lines = src.split('\n')
  const reCall = /robot\.(\w+(?:\.\w+)?)\s*\(([^)]*)\)/g

  for (const raw of lines) {
    const line = raw.split('#')[0]  // strip inline comments
    let m: RegExpExecArray | null
    reCall.lastIndex = 0
    while ((m = reCall.exec(line)) !== null) {
      const fn = m[1]
      const arg = m[2].trim()
      const numArg = parseFloat(arg) || 0
      const strArg = arg.replace(/['"]/g, '').toUpperCase()
      if (fn === 'move_forward' || fn === 'forward') cmds.push({ op: 'forward', seconds: numArg || 1 })
      else if (fn === 'move_backward' || fn === 'backward') cmds.push({ op: 'backward', seconds: numArg || 1 })
      else if (fn === 'turn' || fn === 'turn_right') cmds.push({ op: 'turn', degrees: numArg || 90 })
      else if (fn === 'turn_left') cmds.push({ op: 'turn', degrees: -(numArg || 90) })
      else if (fn === 'stop')  cmds.push({ op: 'stop' })
      else if (fn === 'wait' || fn === 'sleep') cmds.push({ op: 'wait', seconds: numArg || 1 })
      else if (fn === 'arm.open')   cmds.push({ op: 'arm', action: 'open' })
      else if (fn === 'arm.close')  cmds.push({ op: 'arm', action: 'close' })
      else if (fn === 'arm.lift')   cmds.push({ op: 'arm', action: 'lift' })
      else if (fn === 'arm.lower')  cmds.push({ op: 'arm', action: 'lower' })
    }
  }

  return cmds
}

// ────────────────────────────────────────────────────────────────────────────
// Default code per mission
// ────────────────────────────────────────────────────────────────────────────
function starterPython(m: SimMission): string {
  const header = `# Mission: ${m.title}
# robot.move_forward(seconds)
# robot.turn(degrees)         (negative = left)
# robot.stop()
# robot.sensor.distance()      cm to nearest wall
# robot.sensor.colour()        "RED" | "BLUE" | "GREEN" | "BLACK" | "WHITE"
`
  switch (m.id) {
    case 'drive-straight':
      return `${header}
robot.move_forward(3)
robot.stop()
`
    case 'u-turn':
      return `${header}
robot.move_forward(2)
robot.turn(180)
robot.move_forward(2)
robot.stop()
`
    case 'stop-before-wall':
      return `${header}
robot.move_forward(2.5)
robot.stop()
`
    case 'follow-line':
      return `${header}
robot.move_forward(1)
robot.turn(30)
robot.move_forward(2)
robot.turn(45)
robot.move_forward(2)
robot.stop()
`
    case 'maze':
      return `${header}
robot.move_forward(2)
robot.turn(90)
robot.move_forward(2)
robot.turn(-90)
robot.move_forward(2)
robot.stop()
`
    default:
      return `${header}
robot.move_forward(2)
robot.stop()
`
  }
}

function starterBlocks(m: SimMission): Block[] {
  switch (m.id) {
    case 'u-turn':
      return [
        { id: 'b1', type: 'forward', n: 2 },
        { id: 'b2', type: 'turn-right', n: 180 },
        { id: 'b3', type: 'forward', n: 2 },
        { id: 'b4', type: 'stop' },
      ]
    case 'follow-line':
      return [
        { id: 'b1', type: 'forward', n: 1 },
        { id: 'b2', type: 'turn-right', n: 30 },
        { id: 'b3', type: 'forward', n: 2 },
        { id: 'b4', type: 'stop' },
      ]
    default:
      return [
        { id: 'b1', type: 'forward', n: 2 },
        { id: 'b2', type: 'stop' },
      ]
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
export default function SimulatorClient() {
  const sp = useSearchParams()
  const initialMissionId = sp?.get('m') || 'drive-straight'
  const [missionId, setMissionId] = useState<string>(initialMissionId)
  const mission = useMemo(() => getMission(missionId) ?? MISSIONS[0], [missionId])

  // Layout
  const [tab, setTab] = useState<EditorTab>('blocks')
  const [robotType, setRobotType] = useState<'car' | 'arm' | 'drone'>('car')
  const [speedMul, setSpeedMul] = useState<number>(1)
  const [sensors, setSensors] = useState<{ ultrasonic: boolean; camera: boolean; colour: boolean; touch: boolean }>(
    { ultrasonic: true, camera: false, colour: true, touch: false }
  )

  // Editor state
  const [blocks, setBlocks] = useState<Block[]>(() => starterBlocks(mission))
  const [code, setCode] = useState<string>(() => starterPython(mission))

  // Sim state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const arena = useMemo(() => arenaFor(mission), [mission])

  const robotState = useRef({ x: 0, y: 0, heading: 0, alive: true })
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [currentCmdIdx, setCurrentCmdIdx] = useState<number | null>(null)
  const [result, setResult] = useState<{ success: boolean; xp: number; time: number; collisions: number } | null>(null)
  const cancelRef = useRef<{ cancel: boolean }>({ cancel: false })

  // Default grade-based tab
  useEffect(() => {
    try {
      const grade = window.localStorage.getItem('r2bot_school_grade')
      if (grade === 'grade-10' || grade === 'grade-11-12') setTab('python')
    } catch {}
  }, [])

  // When mission changes, reset editors + state
  useEffect(() => {
    setBlocks(starterBlocks(mission))
    setCode(starterPython(mission))
    resetRobot()
    setLogs([])
    setResult(null)
  }, [mission])

  const resetRobot = useCallback(() => {
    robotState.current.x = arena.start.x
    robotState.current.y = arena.start.y
    robotState.current.heading = arena.start.heading
    robotState.current.alive = true
    drawScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena])

  // Reset on arena change
  useEffect(() => { resetRobot() }, [resetRobot])

  // ── Drawing ──
  function drawScene() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, CW, CH)

    // Grid
    ctx.strokeStyle = '#111827'
    for (let x = 0; x < CW; x += 25) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke()
    }
    for (let y = 0; y < CH; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke()
    }

    // Line (if any)
    if (arena.line?.cps) {
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 14
      ctx.beginPath()
      const cps = arena.line.cps
      ctx.moveTo(cps[0].x, cps[0].y)
      for (let i = 1; i < cps.length; i++) ctx.lineTo(cps[i].x, cps[i].y)
      ctx.stroke()
    }

    // Walls
    ctx.fillStyle = '#374151'
    arena.walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h))

    // Markers
    arena.markers?.forEach(m => {
      ctx.fillStyle = m.colour
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
      ctx.fill()
      if (m.label) {
        ctx.fillStyle = '#cbd5e1'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(m.label, m.x, m.y + m.r + 12)
      }
    })

    // Goal
    if (arena.goal) {
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.arc(arena.goal.x, arena.goal.y, arena.goal.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#10b981'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GOAL', arena.goal.x, arena.goal.y + 4)
    }

    // Robot
    const r = robotState.current
    ctx.save()
    ctx.translate(r.x, r.y)
    ctx.rotate((r.heading * Math.PI) / 180)

    // Sensor cone (ultrasonic)
    if (sensors.ultrasonic) {
      const d = raycast(r.x, r.y, r.heading)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(d, 0)
      ctx.stroke()
    }

    // Robot body
    ctx.fillStyle = robotState.current.alive ? '#f59e0b' : '#7f1d1d'
    ctx.fillRect(-15, -10, 30, 20)
    // Direction arrow
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.moveTo(15, 0); ctx.lineTo(8, -6); ctx.lineTo(8, 6); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  function raycast(x: number, y: number, headingDeg: number, maxDist = 400): number {
    const rad = (headingDeg * Math.PI) / 180
    for (let d = 1; d < maxDist; d += 2) {
      const tx = x + Math.cos(rad) * d
      const ty = y + Math.sin(rad) * d
      if (tx < 0 || tx > CW || ty < 0 || ty > CH) return d
      for (const w of arena.walls) {
        if (tx >= w.x && tx <= w.x + w.w && ty >= w.y && ty <= w.y + w.h) return d
      }
    }
    return maxDist
  }

  function collides(x: number, y: number): boolean {
    // robot bounding box approx 30x20 around centre
    const hw = 15, hh = 10
    for (const w of arena.walls) {
      if (x + hw > w.x && x - hw < w.x + w.w && y + hh > w.y && y - hh < w.y + w.h) return true
    }
    return false
  }

  function distanceToGoal(): number | null {
    if (!arena.goal) return null
    const r = robotState.current
    return Math.hypot(r.x - arena.goal.x, r.y - arena.goal.y)
  }

  // ── Execution loop ──
  const log = (s: string) => setLogs(L => [...L, s].slice(-50))

  async function sleep(ms: number, cancel: { cancel: boolean }) {
    const step = 40
    let t = 0
    while (t < ms) {
      if (cancel.cancel) throw new Error('cancelled')
      await new Promise(r => setTimeout(r, Math.min(step, ms - t)))
      t += step
    }
  }

  async function stepForward(seconds: number, dir: 1 | -1, cancel: { cancel: boolean }) {
    const totalMs = Math.max(0, seconds * 1000)
    const slice = 40   // ms per integration step
    const speedPxPerSec = 80 * speedMul
    const dx = Math.cos((robotState.current.heading * Math.PI) / 180) * (speedPxPerSec / 1000) * dir
    const dy = Math.sin((robotState.current.heading * Math.PI) / 180) * (speedPxPerSec / 1000) * dir
    let t = 0
    let collisions = 0
    while (t < totalMs) {
      if (cancel.cancel) throw new Error('cancelled')
      const nx = robotState.current.x + dx * slice
      const ny = robotState.current.y + dy * slice
      if (collides(nx, ny)) {
        collisions++
        robotState.current.alive = false
        log(`💥 COLLISION at t=${(t / 1000).toFixed(1)}s`)
        drawScene()
        break
      }
      robotState.current.x = nx
      robotState.current.y = ny
      drawScene()
      await sleep(slice, cancel)
      t += slice
    }
    return collisions
  }

  async function stepTurn(degrees: number, cancel: { cancel: boolean }) {
    const totalMs = Math.abs(degrees) * 6 / speedMul   // 6ms per degree
    const slice = 25
    let t = 0
    const rate = degrees / Math.max(totalMs, 1)
    while (t < totalMs) {
      if (cancel.cancel) throw new Error('cancelled')
      robotState.current.heading = (robotState.current.heading + rate * slice) % 360
      drawScene()
      await sleep(slice, cancel)
      t += slice
    }
  }

  async function run() {
    if (running) return
    cancelRef.current = { cancel: false }
    setLogs([])
    setResult(null)
    resetRobot()
    setRunning(true)

    const cmds = tab === 'blocks' ? compileBlocks(blocks) : compilePython(code)
    if (cmds.length === 0) {
      log('⚠️ No commands to run. Add some blocks or code first.')
      setRunning(false)
      return
    }

    const startTime = performance.now()
    let totalCollisions = 0

    try {
      for (let i = 0; i < cmds.length; i++) {
        setCurrentCmdIdx(i)
        const c = cmds[i]
        switch (c.op) {
          case 'forward':
            log(`▶ forward ${c.seconds}s`)
            totalCollisions += await stepForward(c.seconds, 1, cancelRef.current)
            break
          case 'backward':
            log(`◀ backward ${c.seconds}s`)
            totalCollisions += await stepForward(c.seconds, -1, cancelRef.current)
            break
          case 'turn':
            log(`↻ turn ${c.degrees}°`)
            await stepTurn(c.degrees, cancelRef.current)
            break
          case 'stop':
            log('■ stop')
            break
          case 'wait':
            log(`⏱ wait ${c.seconds}s`)
            await sleep(c.seconds * 1000 / speedMul, cancelRef.current)
            break
          case 'arm':
            log(`🦾 arm ${c.action}`)
            await sleep(300, cancelRef.current)
            break
        }
        if (!robotState.current.alive) break
      }
    } catch (e) {
      // cancelled
    } finally {
      setCurrentCmdIdx(null)
    }

    const timeSec = (performance.now() - startTime) / 1000
    const dGoal = distanceToGoal()
    const success = robotState.current.alive && (dGoal === null || (arena.goal && dGoal <= arena.goal.r + 12))

    const score = success
      ? Math.max(50, mission.xp - totalCollisions * 10 - Math.floor(timeSec * 2))
      : Math.max(0, 20 - totalCollisions * 5)

    setResult({ success: !!success, xp: success ? mission.xp : 0, time: timeSec, collisions: totalCollisions })

    if (success) {
      log(`✅ Mission complete · +${mission.xp} XP`)
      try {
        const done = JSON.parse(window.localStorage.getItem('r2bot_school_completed_missions') || '[]')
        if (!done.includes(mission.id)) {
          done.push(mission.id)
          window.localStorage.setItem('r2bot_school_completed_missions', JSON.stringify(done))
          const xp = parseInt(window.localStorage.getItem('r2bot_school_xp') || '0', 10) || 0
          window.localStorage.setItem('r2bot_school_xp', String(xp + mission.xp))
        }
      } catch {}
    } else {
      log(`❌ Mission not complete. Score: ${score}.`)
    }

    setRunning(false)
  }

  function stop() {
    cancelRef.current.cancel = true
    setRunning(false)
  }

  // Initial render
  useEffect(() => { drawScene() })

  // ── UI ──
  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <div className="flex-1 min-w-0 pb-24 md:pb-6">
        <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link href="/schools/student" className="text-amber-400 text-sm hover:underline">← Dashboard</Link>
              <h1 className="font-semibold text-base md:text-lg">🔬 Robot Simulator</h1>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-3">
              <span>{mission.emoji} {mission.title}</span>
              <DifficultyBadge d={mission.difficulty} />
            </div>
          </div>
        </header>

        {/* Mobile note */}
        <div className="md:hidden bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300">
          📱 The simulator runs best on a desktop. Code on mobile, then preview on a bigger screen.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-3 p-3">
          {/* LEFT: missions + config */}
          <aside className="rounded-2xl border border-gray-800 bg-gray-900 p-3 max-h-[88vh] overflow-y-auto">
            <p className="text-xs uppercase tracking-wide text-amber-400 mb-2">Missions</p>
            <ul className="space-y-1.5">
              {MISSIONS.map(m => {
                const active = m.id === mission.id
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => setMissionId(m.id)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 border ${
                        active
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-gray-800 bg-gray-950 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold">{m.emoji} {m.title}</p>
                        <span className="text-[10px] text-amber-300">+{m.xp}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{m.story}</p>
                      <DifficultyBadge d={m.difficulty} mini />
                    </button>
                  </li>
                )
              })}
            </ul>

            <p className="mt-5 text-xs uppercase tracking-wide text-amber-400 mb-2">Robot config</p>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select value={robotType} onChange={e => setRobotType(e.target.value as 'car' | 'arm' | 'drone')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm">
              <option value="car">Car (4 wheels)</option>
              <option value="arm">Robotic Arm</option>
              <option value="drone">Drone</option>
            </select>
            <label className="mt-3 block text-xs text-gray-400 mb-1">Speed</label>
            <div className="flex gap-1">
              {[0.5, 1, 2].map(s => (
                <button key={s} onClick={() => setSpeedMul(s)}
                  className={`flex-1 text-xs py-1.5 rounded-lg ${speedMul === s ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300'}`}>
                  {s === 0.5 ? 'Slow' : s === 1 ? 'Normal' : 'Fast'}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs text-gray-400 mb-1">Sensors</label>
            <div className="space-y-1 text-sm">
              {(['ultrasonic', 'camera', 'colour', 'touch'] as const).map(k => {
                const required = mission.requiresSensors?.includes(k as 'ultrasonic' | 'colour' | 'camera' | 'touch')
                return (
                  <label key={k} className={`flex items-center gap-2 ${required ? 'text-amber-300' : 'text-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={sensors[k]}
                      onChange={() => setSensors(s => ({ ...s, [k]: !s[k] }))}
                      className="accent-amber-500"
                    />
                    {k}{required && <span className="text-[10px] ml-auto">(needed)</span>}
                  </label>
                )
              })}
            </div>
          </aside>

          {/* CENTER: canvas */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <p className="text-sm text-gray-300"><span className="text-amber-400 font-semibold">Objective:</span> {mission.objective}</p>
                <p className="text-xs text-gray-500">{mission.story}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetRobot}
                  disabled={running}
                  className="text-xs rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-gray-200 disabled:opacity-40"
                >Reset</button>
                {running ? (
                  <button onClick={stop} className="text-xs rounded-lg bg-red-500 px-3 py-1.5 font-semibold text-white">■ Stop</button>
                ) : (
                  <button onClick={run} className="text-xs rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-black">▶ Run</button>
                )}
              </div>
            </div>

            <div className="relative overflow-auto bg-gray-950 rounded-xl border border-gray-800">
              <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                className="block mx-auto max-w-full"
                style={{ imageRendering: 'pixelated' }}
              />
              {result && (
                <div className={`absolute inset-x-3 top-3 rounded-xl border p-3 text-sm ${
                  result.success
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-red-500/40 bg-red-500/15 text-red-200'
                }`}>
                  <p className="font-semibold">{result.success ? '✅ Mission complete!' : '❌ Try again'}</p>
                  <p className="text-xs">Time: {result.time.toFixed(1)}s · Collisions: {result.collisions} · XP: +{result.xp}</p>
                </div>
              )}
            </div>

            <p className="mt-2 text-[10px] text-gray-500 text-center">Click <strong>Run</strong> to execute your code. Hit <strong>Reset</strong> to start over.</p>
          </div>

          {/* RIGHT: editor */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 flex flex-col max-h-[88vh]">
            <div className="flex border-b border-gray-800">
              <button onClick={() => setTab('blocks')}
                className={`flex-1 py-2.5 text-sm font-medium ${tab === 'blocks' ? 'bg-amber-500 text-black' : 'text-gray-300'}`}>
                🧩 BLOCKS
              </button>
              <button onClick={() => setTab('python')}
                className={`flex-1 py-2.5 text-sm font-medium ${tab === 'python' ? 'bg-amber-500 text-black' : 'text-gray-300'}`}>
                🐍 PYTHON
              </button>
            </div>

            {tab === 'blocks' ? (
              <BlocksEditor blocks={blocks} setBlocks={setBlocks} currentIdx={currentCmdIdx} />
            ) : (
              <PythonEditor code={code} setCode={setCode} />
            )}

            {/* Output console */}
            <div className="border-t border-gray-800 bg-gray-950 p-2 max-h-40 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Output</p>
              {logs.length === 0 ? (
                <p className="text-[11px] text-gray-600">— logs will appear here as the robot runs —</p>
              ) : (
                <ul className="text-[11px] font-mono text-gray-300 space-y-0.5">
                  {logs.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              )}
            </div>

            {result && !result.success && (
              <div className="border-t border-gray-800 bg-amber-500/10 p-3 text-xs text-amber-200">
                <p className="font-semibold mb-1">💡 What went wrong?</p>
                {result.collisions > 0
                  ? 'Your robot hit a wall. Try shorter forward moves, or add a turn earlier.'
                  : 'Your robot stopped before reaching the goal. Try increasing the forward time.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DifficultyBadge({ d, mini }: { d: Difficulty; mini?: boolean }) {
  const map: Record<Difficulty, string> = {
    Beginner: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Advanced: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    Expert: 'bg-red-500/15 text-red-300 border-red-500/30',
  }
  return (
    <span className={`inline-block ${mini ? 'mt-1 text-[9px]' : 'text-[10px]'} font-semibold uppercase tracking-wide border rounded-full px-1.5 py-0.5 ${map[d]}`}>
      {d}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// BLOCK EDITOR
// ────────────────────────────────────────────────────────────────────────────
const BLOCK_PALETTE: { category: string; colour: string; items: { type: Block['type']; label: string; hasN?: boolean; defaultN?: number }[] }[] = [
  {
    category: 'Move', colour: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
    items: [
      { type: 'forward',    label: 'Forward _ s',     hasN: true, defaultN: 2 },
      { type: 'backward',   label: 'Backward _ s',    hasN: true, defaultN: 1 },
      { type: 'turn-left',  label: 'Turn Left _°',    hasN: true, defaultN: 90 },
      { type: 'turn-right', label: 'Turn Right _°',   hasN: true, defaultN: 90 },
      { type: 'stop',       label: 'Stop' },
    ],
  },
  {
    category: 'Arm', colour: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
    items: [
      { type: 'open',  label: 'Open Arm' },
      { type: 'close', label: 'Close Arm' },
      { type: 'lift',  label: 'Lift Arm' },
      { type: 'lower', label: 'Lower Arm' },
    ],
  },
  {
    category: 'Logic', colour: 'bg-pink-500/20 border-pink-500/40 text-pink-200',
    items: [
      { type: 'wait', label: 'Wait _ s', hasN: true, defaultN: 1 },
    ],
  },
]

function BlocksEditor({ blocks, setBlocks, currentIdx }: { blocks: Block[]; setBlocks: (b: Block[]) => void; currentIdx: number | null }) {
  const dragSrc = useRef<{ kind: 'palette' | 'workspace'; payload: Block | { type: Block['type']; defaultN?: number } } | null>(null)

  const addBlock = (type: Block['type'], defaultN?: number) => {
    const b: Block = { id: 'b' + Date.now() + Math.random(), type, n: defaultN }
    setBlocks([...blocks, b])
  }

  return (
    <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0 overflow-y-auto">
      {/* Palette */}
      <div className="border border-gray-800 rounded-xl bg-gray-950 p-2 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">Palette</p>
        {BLOCK_PALETTE.map(cat => (
          <div key={cat.category} className="mb-3">
            <p className="text-[10px] text-gray-400 mb-1">{cat.category}</p>
            <div className="space-y-1">
              {cat.items.map(it => (
                <div
                  key={it.type}
                  draggable
                  onDragStart={() => { dragSrc.current = { kind: 'palette', payload: { type: it.type, defaultN: it.defaultN } } }}
                  onClick={() => addBlock(it.type, it.defaultN)}
                  className={`rounded-lg border px-2 py-1.5 cursor-grab text-xs font-medium ${cat.colour}`}
                >{it.label}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Workspace */}
      <div
        className="border border-gray-800 rounded-xl bg-gray-950 p-2 overflow-y-auto"
        onDragOver={e => e.preventDefault()}
        onDrop={() => {
          const src = dragSrc.current
          if (src?.kind === 'palette') {
            const { type, defaultN } = src.payload as { type: Block['type']; defaultN?: number }
            addBlock(type, defaultN)
          }
          dragSrc.current = null
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Workspace</p>
          <button onClick={() => setBlocks([])} className="text-[10px] text-gray-500 hover:text-red-400">Clear</button>
        </div>
        {blocks.length === 0 && <p className="text-[11px] text-gray-600">Click or drag blocks here</p>}
        <ul className="space-y-1.5">
          {blocks.map((b, i) => (
            <li
              key={b.id}
              className={`rounded-lg border px-2 py-1.5 text-xs flex items-center gap-2 ${
                currentIdx === i ? 'border-amber-500 bg-amber-500/20' : 'border-gray-800 bg-gray-900'
              }`}
            >
              <span className="text-gray-500 w-5">{i + 1}.</span>
              <span className="flex-1 text-gray-100">{labelFor(b)}</span>
              {hasN(b.type) && (
                <input
                  type="number"
                  value={b.n ?? 0}
                  onChange={e => setBlocks(blocks.map(x => x.id === b.id ? { ...x, n: parseFloat(e.target.value) || 0 } : x))}
                  className="w-14 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs text-right"
                />
              )}
              <button
                onClick={() => setBlocks(blocks.filter(x => x.id !== b.id))}
                className="text-gray-500 hover:text-red-400 text-base leading-none"
              >×</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function labelFor(b: Block): string {
  switch (b.type) {
    case 'forward': return `Forward`
    case 'backward': return `Backward`
    case 'turn-left': return `Turn Left`
    case 'turn-right': return `Turn Right`
    case 'stop': return 'Stop'
    case 'wait': return 'Wait'
    case 'open': return 'Open Arm'
    case 'close': return 'Close Arm'
    case 'lift': return 'Lift Arm'
    case 'lower': return 'Lower Arm'
    case 'if-dist': return 'If distance <'
    case 'if-colour': return 'If colour ='
    case 'repeat': return 'Repeat'
  }
}

function hasN(t: Block['type']): boolean {
  return t === 'forward' || t === 'backward' || t === 'turn-left' || t === 'turn-right' || t === 'wait' || t === 'repeat'
}

// ────────────────────────────────────────────────────────────────────────────
// PYTHON EDITOR (textarea + lightweight syntax styling via highlight.js CDN)
// ────────────────────────────────────────────────────────────────────────────
function PythonEditor({ code, setCode }: { code: string; setCode: (s: string) => void }) {
  // Lazy-load highlight.js from CDN on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = 'r2bot-hljs-css'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      document.head.appendChild(link)
    }
  }, [])

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full bg-gray-950 text-amber-100 font-mono text-xs p-3 border-0 outline-none resize-none"
        style={{ minHeight: '300px' }}
      />
      <p className="text-[10px] text-gray-500 px-3 py-1 border-t border-gray-800">
        Available: <code className="text-amber-300">robot.move_forward(s)</code> · <code className="text-amber-300">robot.turn(deg)</code> · <code className="text-amber-300">robot.stop()</code>
      </p>
    </div>
  )
}
