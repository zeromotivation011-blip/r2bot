'use client'

// components/kids/games/circuit-city/CircuitCityGameClient.tsx
// Circuit City — the playable game (loaded with next/dynamic, ssr:false).
// The child builds a real circuit on a breadboard grid; ./circuit solves it
// (nodal analysis) every time anything changes and the city reacts to the real
// currents: LEDs glow by current, motors spin, too much current pops an LED,
// a short circuit drains the battery.

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import {
  COLS,
  LED_BURN_A,
  RESISTOR_VALUES,
  ROWS,
  TINY_A,
  areNeighbours,
  buzzerOn,
  edgeKey,
  formatAmps,
  formatOhms,
  formatVolts,
  formatWatts,
  ldrOhms,
  ledGlow,
  ledVf,
  motorSpeed,
  nodeXY,
  partCurrent,
  solve,
  type Part,
  type PartKind,
} from './circuit'
import { TIERS, applyMod, findLoad, liveGoals, nearestResistor, runTest, type TestReport } from './levels'
import { burst, draw, makeView, nodePx, pickEdge, pickNode, smokePuff, stepParticles, type Edge, type Particle, type View } from './render'
import CitySceneClient, { type SceneLoads } from './CitySceneClient'
import PartIcon, { type ToolKind } from './PartIcon'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

type Probe = { kind: 'node'; n: number } | { kind: 'part'; id: string }
type Tone = 'info' | 'warn' | 'good'

const PART_INFO: Record<PartKind, { name: string; plain: string }> = {
  wire: { name: 'Wire', plain: 'A path for current with almost no resistance. Drag from dot to dot to draw.' },
  battery: { name: 'Battery', plain: 'Pushes current out of its + end, round the loop, back into −. Each cell gives 1.5 V.' },
  switch: { name: 'Switch', plain: 'Open = a gap in the loop. Closed = a path. Tap it to flip.' },
  button: { name: 'Push button', plain: 'Closed only while you hold it down.' },
  led: { name: 'LED', plain: 'Light-emitting diode. Current flows only from its + leg to its − leg, and it needs a resistor.' },
  lamp: { name: 'Streetlight', plain: 'An LED lamp with its own 220 Ω resistor inside. Still one-way: + to +.' },
  resistor: { name: 'Resistor', plain: 'Slows the current down. Bigger Ω = less current. The bands are its colour code.' },
  motor: { name: 'Motor', plain: 'Turns electricity into spinning. Needs a lot of current (150 mA+) to start.' },
  buzzer: { name: 'Buzzer', plain: 'Beeps when it gets about 2 V or more.' },
  ldr: { name: 'Light sensor (LDR)', plain: 'A resistor that changes with light: low in bright light, very high in the dark.' },
  comparator: { name: 'Comparator switch', plain: 'A chip that compares the voltage at its sense lead with a threshold and closes its switch when the test is true.' },
}

const TOOL_ORDER: PartKind[] = ['wire', 'switch', 'button', 'lamp', 'led', 'resistor', 'motor', 'buzzer', 'ldr', 'comparator']

export default function CircuitCityGameClient({ tier, onFinish }: Props) {
  const def = TIERS[Math.max(0, Math.min(3, tier))]

  const [parts, setPartsState] = useState<Part[]>(() => def.initial.map((p) => ({ ...p })))
  const partsRef = useRef(parts)
  const commit = useCallback((next: Part[]) => {
    partsRef.current = next
    setPartsState(next)
  }, [])

  const [tool, setTool] = useState<ToolKind>(def.tier === 0 ? 'wire' : 'select')
  const [selected, setSelected] = useState<string | null>(null)
  const [lux, setLux] = useState(def.lux)
  const [ohms, setOhms] = useState(def.defaultOhms)
  const [probe, setProbe] = useState<Probe | null>(null)
  const [sensePick, setSensePick] = useState<string | null>(null)
  const [spark, setSpark] = useState<{ tone: Tone; text: string }>({ tone: 'info', text: def.steps[0] })
  const [mistakes, setMistakes] = useState({ shorts: 0, burns: 0 })
  const [tests, setTests] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [testRun, setTestRun] = useState<{ report: TestReport; idx: number } | null>(null)
  const [debrief, setDebrief] = useState<TestReport | null>(null)
  const [cursor, setCursor] = useState<Edge>({ a: 2 * COLS + 2, b: 2 * COLS + 3 })
  const [kbd, setKbd] = useState(false)
  const [drag, setDrag] = useState<{ kind: PartKind; x: number; y: number } | null>(null)

  const idCounter = useRef(0)
  const timers = useRef<number[]>([])
  const finished = useRef(false)

  // What is on screen: during a test the steps override switches / light.
  const step = testRun ? testRun.report.steps[Math.min(testRun.idx, testRun.report.steps.length - 1)] : null
  const displayParts = useMemo(() => (step ? applyMod(parts, step.mod) : parts), [parts, step])
  const displayLux = step ? step.lux : lux
  const sol = useMemo(() => solve(displayParts, displayLux), [displayParts, displayLux])
  const goals = useMemo(() => liveGoals(def, parts, sol, displayLux), [def, parts, sol, displayLux])

  // ── Canvas + loop ────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>(makeView(600))
  const hoverRef = useRef<{ edge: Edge; ok: boolean } | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const phaseRef = useRef(new Map<string, number>())
  const spinRef = useRef(new Map<string, number>())
  const burnTimers = useRef(new Map<string, number>())
  const shortRef = useRef({ active: false, acc: 0, sparkT: 0 })
  const wireDrag = useRef<{ last: number } | null>(null)
  const pressed = useRef<string | null>(null)
  const live = useRef({ parts: displayParts, sol, selected, tool, probe, sensePick, cursor, kbd, testing: false })

  useEffect(() => {
    live.current = { parts: displayParts, sol, selected, tool, probe, sensePick, cursor, kbd, testing: !!testRun }
  })

  const events = useRef<{ burn: (p: Part, amps: number) => void; shortStart: (amps: number) => void; drain: (amount: number) => void }>({
    burn: () => {},
    shortStart: () => {},
    drain: () => {},
  })
  useEffect(() => {
    events.current = {
      burn: (p, amps) => {
        commit(partsRef.current.map((q) => (q.id === p.id ? { ...q, burnt: true } : q)))
        const a = nodePx(viewRef.current, p.a)
        const b = nodePx(viewRef.current, p.b)
        burst(particlesRef.current, (a.x + b.x) / 2, (a.y + b.y) / 2, 26, ['#fde68a', '#fb923c', '#ffffff', '#f87171'], 220)
        smokePuff(particlesRef.current, (a.x + b.x) / 2, (a.y + b.y) / 2)
        playSound('wrong')
        setMistakes((m) => ({ ...m, burns: m.burns + 1 }))
        setSelected(p.id)
        setSpark({
          tone: 'warn',
          text: `Pop! That LED got ${formatAmps(amps)}. An LED is made for about 20 mA — much more and its tiny chip overheats and breaks. A resistor in its path limits the current. Select it and press “Replace LED” to try again.`,
        })
      },
      shortStart: (amps) => {
        playSound('wrong')
        setMistakes((m) => ({ ...m, shorts: m.shorts + 1 }))
        setSpark({
          tone: 'warn',
          text: `Short circuit! A path joins + straight to − with nothing to slow the current, so ${formatAmps(amps)} rushes through. The battery heats up and drains fast. Find that wire and remove it.`,
        })
      },
      drain: (amount) => {
        commit(partsRef.current.map((q) => (q.kind === 'battery' ? { ...q, charge: Math.max(0, (q.charge ?? 1) - amount) } : q)))
      },
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const view = makeView(wrap.clientWidth)
      viewRef.current = view
      canvas.width = Math.round(view.w * dpr)
      canvas.height = Math.round(view.h * dpr)
      canvas.style.width = `${view.w}px`
      canvas.style.height = `${view.h}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    let last = performance.now()
    let time = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (document.hidden) return
      time += dt
      const d = live.current
      const view = viewRef.current

      // Dots: speed proportional to current (clamped so it stays readable).
      for (const p of d.parts) {
        const i = partCurrent(d.sol, p.id)
        if (Math.abs(i) < TINY_A || p.burnt) continue
        const cellsPerSec = Math.min(5, Math.max(0.12, Math.abs(i) * 40))
        if (!reduced) phaseRef.current.set(p.id, (phaseRef.current.get(p.id) ?? 0) + Math.sign(i) * cellsPerSec * view.cell * dt)
        if (p.kind === 'motor' && !reduced) spinRef.current.set(p.id, (spinRef.current.get(p.id) ?? 0) + motorSpeed(d.sol, p) * dt * 14)
      }

      if (!d.testing) {
        // LEDs overheat if over-driven for a moment.
        for (const p of d.parts) {
          if ((p.kind !== 'led' && p.kind !== 'lamp') || p.burnt) continue
          const i = partCurrent(d.sol, p.id)
          if (i > LED_BURN_A) {
            const t = (burnTimers.current.get(p.id) ?? 0) + dt
            burnTimers.current.set(p.id, t)
            if (t > 0.45) {
              burnTimers.current.delete(p.id)
              events.current.burn(p, i)
            }
          } else burnTimers.current.delete(p.id)
        }
        // Short circuit: warn once, drain while it lasts, throw sparks.
        const sh = shortRef.current
        if (d.sol.shorted) {
          if (!sh.active) {
            sh.active = true
            events.current.shortStart(d.sol.batteryA)
          }
          sh.acc += dt
          sh.sparkT += dt
          if (sh.acc > 0.25) {
            events.current.drain(sh.acc * 0.18)
            sh.acc = 0
          }
          const bat = d.parts.find((p) => p.kind === 'battery')
          if (bat && sh.sparkT > 0.18 && !reduced) {
            sh.sparkT = 0
            const a = nodePx(view, bat.a)
            burst(particlesRef.current, a.x, a.y, 8, ['#fde68a', '#fb923c', '#ffffff'], 140)
          }
        } else {
          sh.active = false
          sh.acc = 0
        }
      }

      particlesRef.current = stepParticles(particlesRef.current, dt)

      let vmax = 0
      for (const v of d.sol.v.values()) vmax = Math.max(vmax, v)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const hv = hoverRef.current
      draw(ctx, view, {
        parts: d.parts,
        sol: d.sol,
        selected: d.selected,
        hover: hv ? hv.edge : null,
        ghost: d.tool !== 'select' && d.tool !== 'probe' ? (d.tool as PartKind) : null,
        ghostOk: hv ? hv.ok : false,
        cursor: d.cursor,
        showCursor: d.kbd,
        probe: d.probe,
        sensePick: !!d.sensePick,
        phase: phaseRef.current,
        spin: spinRef.current,
        particles: particlesRef.current,
        time,
        reduced,
        vmax,
      })
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const t = timers.current
    return () => {
      for (const id of t) window.clearTimeout(id)
    }
  }, [])

  // ── Celebrate loads lighting up for the first time ───────────────────────
  const litBefore = useRef(new Set<string>())
  useEffect(() => {
    if (testRun) return
    const now = new Set<string>()
    for (const p of parts) {
      if (!p.loadId) continue
      const on = p.kind === 'motor' ? motorSpeed(sol, p) > 0 : ledGlow(sol, p) > 0
      if (on) now.add(p.loadId)
    }
    let fresh: Part | null = null
    for (const id of now) if (!litBefore.current.has(id)) fresh = parts.find((p) => p.loadId === id) ?? null
    litBefore.current = now
    if (fresh) {
      playSound('correct')
      const a = nodePx(viewRef.current, fresh.a)
      const b = nodePx(viewRef.current, fresh.b)
      burst(particlesRef.current, (a.x + b.x) / 2, (a.y + b.y) / 2, 18, ['#fde68a', '#86efac', '#67e8f9', '#ffa878'], 150)
      const i = Math.abs(partCurrent(sol, fresh.id))
      setSpark({ tone: 'good', text: `${loadName(fresh.loadId ?? '')} is on — ${formatAmps(i)} is flowing through it. ${i > 0.02 && fresh.kind !== 'motor' ? 'That is more than an LED likes (20 mA)!' : 'Look at the dots: that is the current going round the loop.'}` })
    }
  }, [sol, parts, testRun])

  // ── Placing and editing parts ────────────────────────────────────────────
  const remaining = useCallback(
    (kind: PartKind): number => {
      const total = def.inventory[kind] ?? 0
      const used = partsRef.current.filter((p) => p.kind === kind && !p.locked).length
      return total - used
    },
    [def],
  )

  const partAt = (e: Edge): Part | undefined => partsRef.current.find((p) => edgeKey(p.a, p.b) === edgeKey(e.a, e.b))

  const place = useCallback(
    (kind: PartKind, e: Edge, quiet = false): boolean => {
      const cur = partsRef.current
      if (cur.some((p) => edgeKey(p.a, p.b) === edgeKey(e.a, e.b))) return false
      if (remaining(kind) <= 0) {
        if (!quiet) setSpark({ tone: 'info', text: `No ${PART_INFO[kind].name.toLowerCase()}s left in this mission’s parts box.` })
        return false
      }
      const id = `p${++idCounter.current}`
      const a = Math.min(e.a, e.b)
      const b = Math.max(e.a, e.b)
      const part: Part = { id, kind, a, b }
      if (kind === 'resistor') part.ohms = ohms
      if (kind === 'switch' || kind === 'button') part.on = false
      if (kind === 'led') part.color = 'red'
      if (kind === 'lamp') {
        part.color = 'yellow'
        part.ohms = 220
        part.loadId = ['L1', 'L2', 'L3'].find((l) => !cur.some((p) => p.loadId === l))
      }
      if (kind === 'motor') part.loadId = 'M'
      if (kind === 'comparator') {
        part.threshold = 2.5
        part.mode = 'below'
        part.sense = null
        setSensePick(id)
        setSpark({ tone: 'info', text: 'Now tap a dot on the board: that is where the comparator’s sense lead will measure the voltage.' })
      }
      commit([...cur, part])
      playSound('click')
      if (kind !== 'wire') setSelected(id)
      if (kind === 'switch') setSpark({ tone: 'info', text: 'Switch placed — it starts OFF (open). Tap it to close it.' })
      return true
    },
    [commit, ohms, remaining],
  )

  const update = useCallback(
    (id: string, patch: Partial<Part>) => {
      commit(partsRef.current.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    },
    [commit],
  )

  const remove = useCallback(
    (id: string) => {
      const p = partsRef.current.find((q) => q.id === id)
      if (!p || p.locked) return
      commit(partsRef.current.filter((q) => q.id !== id))
      if (selected === id) setSelected(null)
      if (probe?.kind === 'part' && probe.id === id) setProbe(null)
      if (sensePick === id) setSensePick(null)
      playSound('click')
    },
    [commit, probe, selected, sensePick],
  )

  const interact = (p: Part) => {
    setSelected(p.id)
    if (p.kind === 'switch') {
      update(p.id, { on: !p.on })
      playSound('click')
    } else if (p.kind === 'button') {
      pressed.current = p.id
      update(p.id, { on: true })
    }
  }

  const releaseButton = () => {
    if (pressed.current) {
      update(pressed.current, { on: false })
      pressed.current = null
    }
  }

  // ── Pointer input on the board ───────────────────────────────────────────
  const localXY = (ev: { clientX: number; clientY: number }) => {
    const r = canvasRef.current?.getBoundingClientRect()
    return r ? { x: ev.clientX - r.left, y: ev.clientY - r.top } : { x: -1, y: -1 }
  }

  const onPointerDown = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    primeAudio()
    setKbd(false)
    if (testRun) return
    ev.currentTarget.setPointerCapture(ev.pointerId)
    const { x, y } = localXY(ev)
    const view = viewRef.current
    if (sensePick) {
      const n = pickNode(view, x, y, 0.45)
      if (n != null) {
        update(sensePick, { sense: n })
        setSensePick(null)
        playSound('click')
        setSpark({ tone: 'info', text: 'Sense lead connected. Now set the threshold and the mode in the panel.' })
      }
      return
    }
    if (tool === 'probe') {
      const n = pickNode(view, x, y, 0.3)
      if (n != null) setProbe({ kind: 'node', n })
      else {
        const e = pickEdge(view, x, y)
        const p = e ? partAt(e) : undefined
        if (p) setProbe({ kind: 'part', id: p.id })
      }
      playSound('click')
      return
    }
    const near = pickNode(view, x, y, 0.3)
    if (tool === 'wire' && near != null) {
      wireDrag.current = { last: near }
      return
    }
    const e = pickEdge(view, x, y)
    if (!e) return
    const p = partAt(e)
    if (p) interact(p)
    else if (tool !== 'select') place(tool as PartKind, e)
    else setSelected(null)
  }

  const onPointerMove = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const { x, y } = localXY(ev)
    const view = viewRef.current
    if (wireDrag.current) {
      const n = pickNode(view, x, y, 0.42)
      if (n != null && n !== wireDrag.current.last) {
        // Each step to a neighbouring dot lays one wire; a diagonal jump just moves the pen.
        if (areNeighbours(n, wireDrag.current.last)) place('wire', { a: n, b: wireDrag.current.last }, true)
        wireDrag.current.last = n
      }
      hoverRef.current = null
      return
    }
    if (ev.pointerType === 'mouse' && tool !== 'select' && tool !== 'probe' && !sensePick) {
      const e = pickEdge(view, x, y)
      hoverRef.current = e ? { edge: e, ok: !partAt(e) && remaining(tool as PartKind) > 0 } : null
    } else hoverRef.current = null
  }

  const onPointerUp = () => {
    wireDrag.current = null
    releaseButton()
  }

  // ── Drag from the palette ────────────────────────────────────────────────
  const paletteDrag = useRef<{ kind: PartKind; sx: number; sy: number; moved: boolean } | null>(null)
  const placeRef = useRef(place)
  useEffect(() => {
    placeRef.current = place
  }, [place])
  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const d = paletteDrag.current
      if (!d) return
      if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 10) d.moved = true
      if (!d.moved) return
      setDrag({ kind: d.kind, x: ev.clientX, y: ev.clientY })
      const { x, y } = localXY(ev)
      const view = viewRef.current
      if (x >= 0 && y >= 0 && x <= view.w && y <= view.h) {
        const e = pickEdge(view, x, y)
        hoverRef.current = e ? { edge: e, ok: !partsRef.current.some((p) => edgeKey(p.a, p.b) === edgeKey(e.a, e.b)) } : null
      } else hoverRef.current = null
    }
    const up = (ev: PointerEvent) => {
      const d = paletteDrag.current
      paletteDrag.current = null
      setDrag(null)
      if (!d || !d.moved) return
      const { x, y } = localXY(ev)
      const view = viewRef.current
      hoverRef.current = null
      if (x >= 0 && y >= 0 && x <= view.w && y <= view.h) {
        const e = pickEdge(view, x, y)
        if (e) placeRef.current(d.kind, e)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const onKeyDown = (ev: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (testRun) return
    const k = ev.key
    const horiz = cursor.b - cursor.a === 1
    const { x, y } = nodeXY(cursor.a)
    const setC = (nx: number, ny: number, h: boolean) => {
      const maxX = h ? COLS - 2 : COLS - 1
      const maxY = h ? ROWS - 1 : ROWS - 2
      const cx = Math.max(0, Math.min(maxX, nx))
      const cy = Math.max(0, Math.min(maxY, ny))
      const a = cy * COLS + cx
      setCursor({ a, b: h ? a + 1 : a + COLS })
    }
    let handled = true
    if (k === 'ArrowLeft') setC(x - 1, y, horiz)
    else if (k === 'ArrowRight') setC(x + 1, y, horiz)
    else if (k === 'ArrowUp') setC(x, y - 1, horiz)
    else if (k === 'ArrowDown') setC(x, y + 1, horiz)
    else if (k === 'r' || k === 'R') setC(x, y, !horiz)
    else if (k === 'Enter' || k === ' ') {
      primeAudio()
      if (sensePick) {
        update(sensePick, { sense: cursor.a })
        setSensePick(null)
      } else if (tool === 'probe') {
        const p = partAt(cursor)
        setProbe(p ? { kind: 'part', id: p.id } : { kind: 'node', n: cursor.a })
      } else {
        const p = partAt(cursor)
        if (p) {
          if (p.kind === 'button') update(p.id, { on: !p.on })
          else interact(p)
        } else if (tool !== 'select') place(tool as PartKind, cursor)
      }
    } else if ((k === 'Delete' || k === 'Backspace') && selected) remove(selected)
    else if ((k === 'f' || k === 'F') && selected) flip(selected)
    else handled = false
    if (handled) {
      ev.preventDefault()
      setKbd(true)
    }
  }

  const flip = (id: string) => {
    const p = partsRef.current.find((q) => q.id === id)
    if (!p || p.locked) return
    update(id, { a: p.b, b: p.a })
    playSound('click')
  }

  const clearBoard = () => {
    const bat = partsRef.current.find((p) => p.kind === 'battery')
    commit(def.initial.map((p) => (p.kind === 'battery' && bat ? { ...p, charge: bat.charge } : { ...p })))
    setSelected(null)
    setProbe(null)
    setSensePick(null)
    setDebrief(null)
  }

  // ── Test ─────────────────────────────────────────────────────────────────
  const runTestNow = () => {
    if (testRun || finished.current) return
    primeAudio()
    setDebrief(null)
    setSelected(null)
    const report = runTest(def, partsRef.current)
    const attempts = tests + 1
    setTests(attempts)
    setTestRun({ report, idx: 0 })
    const STEP_MS = 1300
    report.steps.forEach((s, k) => {
      timers.current.push(
        window.setTimeout(() => {
          setTestRun({ report, idx: k })
          playSound(s.ok ? 'star' : 'wrong')
        }, k * STEP_MS + 150),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        setTestRun(null)
        if (!report.pass) {
          setDebrief(report)
          setSpark({ tone: 'warn', text: report.why })
          return
        }
        finished.current = true
        const m = mistakes.shorts + mistakes.burns
        let stars = m === 0 ? 3 : m <= 2 ? 2 : 1
        if (report.quality < 0.99) stars = Math.min(stars, report.quality >= 0.6 ? 2 : 1)
        const placed = partsRef.current.filter((p) => !p.locked).length
        const score = Math.max(
          100,
          Math.min(1000, Math.round(1000 * (0.5 + 0.5 * report.quality) - 120 * m - 40 * (attempts - 1) - 10 * Math.max(0, placed - def.minParts))),
        )
        onFinish({
          stars,
          score,
          scoreLabel: `points · ${report.metric}`,
          message: report.why,
          badges: def.tier >= 2 ? ['circuit-closer', 'ohms-friend'] : ['circuit-closer'],
          attempts,
        })
      }, report.steps.length * STEP_MS + 400),
    )
  }

  // ── Derived UI data ──────────────────────────────────────────────────────
  const sel = selected ? displayParts.find((p) => p.id === selected) ?? null : null
  const sceneLoads: SceneLoads = useMemo(() => {
    const glow: Record<string, number> = {}
    const burnt: Record<string, boolean> = {}
    let motor = 0
    let buzz = false
    for (const p of displayParts) {
      if (p.loadId) {
        glow[p.loadId] = p.kind === 'motor' ? 0 : ledGlow(sol, p)
        burnt[p.loadId] = !!p.burnt
      }
      if (p.kind === 'motor') motor = Math.max(motor, motorSpeed(sol, p))
      if (p.kind === 'buzzer' && buzzerOn(sol, p)) buzz = true
    }
    return { glow, burnt, motor, buzzer: buzz }
  }, [displayParts, sol])

  const tools: ToolKind[] = ['select', ...TOOL_ORDER.filter((k) => def.inventory[k] !== undefined), 'probe']
  const signLed = findLoad(parts, def.tier === 3 ? 'N' : 'S')
  const stormOn = !!step?.mod.knockOut

  return (
    <div className="grid select-none gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-2">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">
            {def.name} mission · Circuit City
          </p>
          <h2 className="font-display text-xl font-black text-white sm:text-2xl">{def.title}</h2>
          <p className="mt-1 text-sm text-white/75">{def.story}</p>
        </section>

        <div className="overflow-hidden rounded-[20px] border border-white/10">
          <CitySceneClient scene={def.scene} loads={sceneLoads} lux={displayLux} storm={stormOn} />
        </div>

        <SparkBar tone={spark.tone} text={sensePick ? 'Tap a dot on the board for the comparator’s sense lead.' : spark.text} />

        <div ref={wrapRef} className="relative w-full">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label={`Breadboard, ${COLS} by ${ROWS} dots. Arrow keys move the cursor, R turns it, Enter places or uses a part, F flips, Delete removes.`}
            className="mx-auto block touch-none select-none rounded-[18px] outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => {
              hoverRef.current = null
            }}
            onKeyDown={onKeyDown}
          />
          {testRun && step && (
            <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-center" aria-live="polite">
              <div className={`rounded-2xl px-4 py-2 text-center font-black shadow-lg ${step.ok ? 'bg-emerald-500/90 text-slate-950' : 'bg-rose-500/90 text-white'}`}>
                <span className="mr-2">Test {testRun.idx + 1}/{testRun.report.steps.length}:</span>
                {step.label} {step.ok ? '✓' : '✗'}
                <span className="block text-xs font-bold opacity-80">{step.detail}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Parts box">
          {tools.map((k) => {
            const isPart = k !== 'select' && k !== 'probe'
            const left = isPart ? remaining(k as PartKind) : 0
            const label = k === 'select' ? 'Select' : k === 'probe' ? 'Multimeter' : PART_INFO[k as PartKind].name
            return (
              <button
                key={k}
                type="button"
                aria-pressed={tool === k}
                title={isPart ? PART_INFO[k as PartKind].plain : k === 'probe' ? 'Tap a dot to measure voltage, or a part to measure current.' : 'Tap parts to select them.'}
                onPointerDown={(ev) => {
                  primeAudio()
                  setTool(k)
                  setSensePick(null)
                  if (k !== 'probe') setProbe(null)
                  if (isPart) paletteDrag.current = { kind: k as PartKind, sx: ev.clientX, sy: ev.clientY, moved: false }
                }}
                onClick={() => setTool(k)}
                className={`flex min-h-[48px] touch-none items-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold transition-transform active:scale-95 ${
                  tool === k ? 'border-amber-300 bg-amber-400/20 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                } ${isPart && left <= 0 ? 'opacity-40' : ''}`}
              >
                <PartIcon kind={k} className="h-6 w-6" />
                <span>{label}</span>
                {isPart && Number.isFinite(left) && <span className="rounded-md bg-black/30 px-1.5 text-xs text-amber-200">×{Math.max(0, left)}</span>}
              </button>
            )
          })}
          <button type="button" onClick={clearBoard} className="min-h-[48px] rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-white/70 hover:bg-white/10">
            Clear board
          </button>
        </div>
        <p className="text-xs text-white/50">
          {tool === 'wire' ? 'Drag from dot to dot to draw wires, or tap a gap between two dots.' : 'Tap a gap between two dots to place, or drag a part from the box onto the board.'} Wire colour shows voltage: blue = 0 V, orange-red = high. Faster dots = more current.
        </p>
      </div>

      <aside className="flex flex-col gap-3">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-display text-lg font-black text-white">Mission goals</h3>
          <ul className="mt-2 space-y-1.5">
            {goals.map((g) => (
              <li key={g.label} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-black ${g.ok ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white/40'}`} aria-hidden>
                  {g.ok ? '✓' : ''}
                </span>
                <span className={g.ok ? 'text-white' : 'text-white/70'}>
                  {g.label}
                  {g.detail && <span className="ml-1 font-mono text-xs text-cyan-300">{g.detail}</span>}
                  <span className="sr-only">{g.ok ? ' — done' : ' — not yet'}</span>
                </span>
              </li>
            ))}
          </ul>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-white/60">
            {def.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <button
            type="button"
            onClick={runTestNow}
            disabled={!!testRun}
            className="mt-3 min-h-[52px] w-full rounded-2xl bg-amber-400 text-lg font-black text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60"
          >
            {testRun ? 'Testing…' : 'Test it!'}
          </button>
          {debrief && (
            <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm" role="status">
              <p className="font-black text-rose-200">Not yet — here is why</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {debrief.steps.map((s) => (
                  <li key={s.label} className={s.ok ? 'text-emerald-300' : 'text-rose-200'}>
                    {s.ok ? '✓' : '✗'} {s.label}: {s.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-white/85">{debrief.why}</p>
            </div>
          )}
        </section>

        {sel && <Inspector part={sel} sol={sol} onUpdate={update} onRemove={remove} onFlip={flip} onSense={() => setSensePick(sel.id)} setOhms={setOhms} />}

        {(tool === 'probe' || probe) && <Multimeter probe={probe} parts={displayParts} sol={sol} />}

        {def.skySlider && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label htmlFor="cc-lux" className="font-display text-lg font-black text-white">
              Sky light: <span className="font-mono text-cyan-300">{Math.round(displayLux)} lux</span>
            </label>
            <input
              id="cc-lux"
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={Math.log10(Math.max(1, lux))}
              disabled={!!testRun}
              onChange={(e) => setLux(Math.round(Math.pow(10, Number(e.target.value))))}
              className="mt-2 h-11 w-full accent-amber-400"
            />
            <div className="flex justify-between text-xs text-white/50">
              <span>midnight 1</span>
              <span>dusk 100</span>
              <span>day 1000</span>
            </div>
            <p className="mt-1 text-xs text-white/70">
              The LDR is now <b className="text-white">{formatOhms(Math.round(ldrOhms(displayLux)))}</b>. Circuit power: <b className="text-white">{formatWatts(sol.power)}</b>
            </p>
          </section>
        )}

        {(def.tier === 2 || def.tier === 3) && signLed && <OhmHelper v={sol.battV} vf={ledVf(signLed)} name={def.tier === 3 ? 'white night-light LED' : 'red sign LED'} />}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-black text-white">Need a hint?</h3>
            <button
              type="button"
              disabled={hintLevel >= def.hints.length}
              onClick={() => setHintLevel((h) => Math.min(def.hints.length, h + 1))}
              className="min-h-[44px] rounded-xl border border-amber-300/50 px-3 font-bold text-amber-200 disabled:opacity-40"
            >
              {hintLevel === 0 ? 'Show hint' : 'Next hint'}
            </button>
          </div>
          {hintLevel > 0 && (
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-white/80">
              {def.hints.slice(0, hintLevel).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-xs text-white/50">
            Shorts: {mistakes.shorts} · LEDs popped: {mistakes.burns} · Tests: {tests}
          </p>
        </section>
      </aside>

      {drag && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-amber-300 bg-slate-900/90 p-1.5 shadow-xl" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <PartIcon kind={drag.kind} className="h-8 w-8" />
        </div>
      )}
    </div>
  )
}

function loadName(id: string): string {
  if (id === 'H') return 'The house light'
  if (id.startsWith('L')) return `Streetlight ${id.slice(1)}`
  if (id === 'S') return 'The shop sign'
  if (id === 'M') return 'The Ferris wheel'
  if (id === 'N') return 'The night-light'
  return 'It'
}

function SparkBar({ tone, text }: { tone: Tone; text: string }) {
  const ring = tone === 'warn' ? 'border-rose-400/40 bg-rose-500/10' : tone === 'good' ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'
  return (
    <div className={`flex min-h-[60px] items-center gap-3 rounded-2xl border px-3 py-2 ${ring}`} aria-live="polite">
      <svg viewBox="0 0 40 40" className="h-10 w-10 flex-none" aria-hidden="true">
        <rect x="6" y="9" width="28" height="24" rx="9" fill="#FC6818" />
        <rect x="10" y="14" width="20" height="11" rx="5" fill="#0A1120" />
        <circle cx="16" cy="19.5" r="2.6" fill="#22d3ee" />
        <circle cx="24" cy="19.5" r="2.6" fill="#22d3ee" />
        <path d="M20 9 L20 3" stroke="#FFA878" strokeWidth="2.5" />
        <circle cx="20" cy="3" r="2.5" fill="#fde68a" />
      </svg>
      <p className="text-sm text-white/90">
        <span className="font-black text-amber-300">Spark: </span>
        {text}
      </p>
    </div>
  )
}

function Inspector({
  part,
  sol,
  onUpdate,
  onRemove,
  onFlip,
  onSense,
  setOhms,
}: {
  part: Part
  sol: ReturnType<typeof solve>
  onUpdate: (id: string, patch: Partial<Part>) => void
  onRemove: (id: string) => void
  onFlip: (id: string) => void
  onSense: () => void
  setOhms: (r: number) => void
}) {
  const info = PART_INFO[part.kind]
  const i = partCurrent(sol, part.id)
  const vd = sol.vd.get(part.id) ?? 0
  const polar = part.kind === 'led' || part.kind === 'lamp' || part.kind === 'motor'
  const ri = RESISTOR_VALUES.indexOf(part.ohms ?? 1000)
  const setR = (k: number) => {
    const r = RESISTOR_VALUES[Math.max(0, Math.min(RESISTOR_VALUES.length - 1, k))]
    onUpdate(part.id, { ohms: r })
    setOhms(r)
    playSound('click')
  }
  const btn = 'min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-bold text-white hover:bg-white/10'
  return (
    <section className="rounded-2xl border border-amber-300/30 bg-white/5 p-4" aria-label={`${info.name} settings`}>
      <div className="flex items-center gap-2">
        <PartIcon kind={part.kind} className="h-8 w-8" />
        <h3 className="font-display text-lg font-black text-white">
          {part.loadId ? loadName(part.loadId).replace(/^The /, '') : info.name}
          {part.locked && <span className="ml-2 text-xs font-bold text-white/40">fixed</span>}
        </h3>
      </div>
      <p className="mt-1 text-sm text-white/70">{info.plain}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
        <dt className="text-white/50">Current</dt>
        <dd className="text-cyan-300">{part.kind === 'battery' ? formatAmps(-i) : formatAmps(i)}</dd>
        <dt className="text-white/50">Voltage across</dt>
        <dd className="text-cyan-300">{formatVolts(Math.abs(vd))}</dd>
        {part.kind === 'battery' && (
          <>
            <dt className="text-white/50">Charge</dt>
            <dd className="text-cyan-300">{Math.round((part.charge ?? 1) * 100)}%</dd>
          </>
        )}
      </dl>

      {part.kind === 'switch' && (
        <button type="button" className={`${btn} mt-3 w-full`} onClick={() => onUpdate(part.id, { on: !part.on })}>
          Turn {part.on ? 'OFF (open the gap)' : 'ON (close the gap)'}
        </button>
      )}
      {part.kind === 'button' && (
        <button
          type="button"
          className={`${btn} mt-3 w-full`}
          onPointerDown={() => onUpdate(part.id, { on: true })}
          onPointerUp={() => onUpdate(part.id, { on: false })}
          onPointerLeave={() => part.on && onUpdate(part.id, { on: false })}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onUpdate(part.id, { on: true })}
          onKeyUp={() => onUpdate(part.id, { on: false })}
        >
          Hold to press
        </button>
      )}
      {part.kind === 'resistor' && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-white/50">Resistance</p>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" className={btn} aria-label="Smaller resistor" onClick={() => setR(ri - 1)}>
              −
            </button>
            <span className="flex-1 text-center font-display text-2xl font-black text-amber-200">{formatOhms(part.ohms ?? 1000)}</span>
            <button type="button" className={btn} aria-label="Bigger resistor" onClick={() => setR(ri + 1)}>
              +
            </button>
          </div>
          {Math.abs(i) > 1e-5 && (
            <p className="mt-1 text-xs text-white/60">
              Ohm’s law check: V ÷ I = {Math.abs(vd).toFixed(2)} V ÷ {formatAmps(i)} = {formatOhms(Math.round(Math.abs(vd / i)))}
            </p>
          )}
        </div>
      )}
      {part.kind === 'comparator' && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-white/80">
            Sense point:{' '}
            <b className="font-mono text-cyan-300">{part.sense == null ? 'not connected' : formatVolts(sol.v.get(part.sense) ?? 0)}</b> · switch{' '}
            <b className={sol.conducting.has(part.id) ? 'text-emerald-300' : 'text-white/60'}>{sol.conducting.has(part.id) ? 'CLOSED' : 'open'}</b>
          </p>
          <label className="block text-sm text-white/80" htmlFor={`th-${part.id}`}>
            Threshold: <b className="font-mono text-amber-200">{formatVolts(part.threshold ?? 2.5)}</b>
          </label>
          <input
            id={`th-${part.id}`}
            type="range"
            min={0.2}
            max={4.4}
            step={0.05}
            value={part.threshold ?? 2.5}
            onChange={(e) => onUpdate(part.id, { threshold: Number(e.target.value) })}
            className="h-11 w-full accent-amber-400"
          />
          <div className="flex gap-2">
            {(['below', 'above'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={part.mode === m} onClick={() => onUpdate(part.id, { mode: m })} className={`${btn} flex-1 ${part.mode === m ? 'border-amber-300 bg-amber-400/20' : ''}`}>
                ON when {m.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className={`${btn} w-full`} onClick={onSense}>
            Move sense lead
          </button>
        </div>
      )}
      {part.kind === 'battery' && (part.charge ?? 1) < 0.95 && (
        <button type="button" className={`${btn} mt-3 w-full`} onClick={() => onUpdate(part.id, { charge: 1 })}>
          Fit fresh batteries
        </button>
      )}
      {part.burnt && (
        <button type="button" className={`${btn} mt-3 w-full border-amber-300/60`} onClick={() => onUpdate(part.id, { burnt: false })}>
          Replace LED
        </button>
      )}
      {!part.locked && (
        <div className="mt-3 flex gap-2">
          {polar && (
            <button type="button" className={`${btn} flex-1`} onClick={() => onFlip(part.id)}>
              Flip ⇄
            </button>
          )}
          <button type="button" className={`${btn} flex-1 border-rose-400/40 text-rose-200`} onClick={() => onRemove(part.id)}>
            Remove
          </button>
        </div>
      )}
    </section>
  )
}

function Multimeter({ probe, parts, sol }: { probe: Probe | null; parts: Part[]; sol: ReturnType<typeof solve> }) {
  let main = '— — —'
  let sub = 'Tap a dot for voltage, or a part for current.'
  if (probe?.kind === 'node') {
    const v = sol.v.get(probe.n)
    main = v === undefined ? '0.00 V' : formatVolts(v)
    sub = v === undefined ? 'Nothing is connected to this dot.' : 'Voltage here, measured from the battery’s − end (black probe).'
  } else if (probe?.kind === 'part') {
    const p = parts.find((q) => q.id === probe.id)
    if (p) {
      const i = partCurrent(sol, p.id)
      main = formatAmps(p.kind === 'battery' ? -i : i)
      const vd = Math.abs(sol.vd.get(p.id) ?? 0)
      sub = `${PART_INFO[p.kind].name}: ${formatVolts(vd)} across it, ${formatWatts(Math.abs(i) * vd)} used.`
    }
  }
  return (
    <section className="rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-yellow-500/20 to-yellow-700/10 p-4" aria-live="polite">
      <h3 className="font-display text-lg font-black text-white">Multimeter</h3>
      <div className="mt-2 rounded-xl border-2 border-slate-900 bg-[#c5d6a0] px-3 py-2 text-right font-mono text-3xl font-black tracking-wider text-[#1a2e05] shadow-inner">{main}</div>
      <p className="mt-2 text-sm text-white/80">{sub}</p>
    </section>
  )
}

function OhmHelper({ v, vf, name }: { v: number; vf: number; name: string }) {
  const [ma, setMa] = useState(15)
  const r = (v - vf) / (ma / 1000)
  const near = nearestResistor(Math.max(1, r), RESISTOR_VALUES)
  return (
    <section className="rounded-2xl border border-cyan-400/30 bg-cyan-500/5 p-4">
      <h3 className="font-display text-lg font-black text-white">Ohm’s law helper</h3>
      <p className="mt-1 text-sm text-white/75">For the {name}: the resistor takes the voltage the LED doesn’t need.</p>
      <label htmlFor="cc-ma" className="mt-2 block text-sm text-white/80">
        Target current: <b className="font-mono text-amber-200">{ma} mA</b>
      </label>
      <input id="cc-ma" type="range" min={10} max={20} step={1} value={ma} onChange={(e) => setMa(Number(e.target.value))} className="h-11 w-full accent-amber-400" />
      <p className="mt-1 rounded-xl bg-black/30 p-2 text-center font-mono text-sm text-cyan-200">
        R = (V − Vf) ÷ I = ({v > 0.1 ? v.toFixed(2) : '?'} − {vf.toFixed(1)}) ÷ {(ma / 1000).toFixed(3)} ≈ {v > vf ? `${Math.round(r)} Ω` : '?'}
      </p>
      {v > vf && <p className="mt-1 text-xs text-white/60">Closest value in the parts box: {formatOhms(near)}. V is the battery’s voltage right now.</p>}
    </section>
  )
}
