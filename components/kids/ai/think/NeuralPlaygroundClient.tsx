'use client'

// components/kids/ai/think/NeuralPlaygroundClient.tsx
// Neural Playground: a real neural network trains live on the child's phone,
// on dots the child places. Two modes:
//   - "Draw the line": a perceptron by hand (turn + slide one line), and the
//     perceptron learning rule doing it one mistake at a time.
//   - "Train a brain": a small multi-layer network (lib/kids/ai/think/nn.ts)
//     with live decision-boundary shading, every neuron's own picture, weights
//     drawn as coloured lines, and the loss curve.
// Everything runs on the device: no network calls, works offline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  angleFromLine,
  createNet,
  DATASETS,
  evaluate,
  featureCount,
  features,
  forward,
  lineAccuracy,
  lineFromAngle,
  makeDataset,
  perceptronStep,
  trainStep,
  type Activation,
  type DatasetId,
  type FeatureSet,
  type Label,
  type Line,
  type Net,
  type Pt,
} from '@/lib/kids/ai/think/nn'
import { neuralMissionsFor, type NeuralMission, type NeuralMode, type NeuralSnapshot } from '@/lib/kids/ai/think/neural-missions'
import { makeRng, prefersReducedMotion } from '@/lib/kids/ai/think/common'
import { playSound } from '@/lib/kids-audio'
import type { TierName } from '@/lib/kids/universe/tiers'
import { Btn, cx, fitCanvas, MissionDone, MissionList, Panel, Slider, Stat, TierTabs, useElementWidth, useThinkMissions, useTier } from './LabUiClient'

const ORANGE = [252, 104, 24] as const
const CYAN = [0, 184, 212] as const
const MAX_LAYERS: Record<TierName, number> = { Cadet: 1, Pilot: 1, Ace: 2, Legend: 3 }
const MAX_STEPS = 6000

type Tool = 1 | 0 | 'erase'

function rgba(c: readonly [number, number, number], a: number) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

/** Robot fixes allowed before the lab says the dots may not be splittable by one line. */
const MAX_ROBOT_FIXES = 150

export default function NeuralPlaygroundClient() {
  const [tier, setTier] = useTier()
  const [mode, setMode] = useState<NeuralMode>('hand')
  const [dataset, setDataset] = useState<DatasetId | 'own'>('blobs')
  const [points, setPoints] = useState<Pt[]>(() => makeDataset('blobs', 40, 11))
  const [own, setOwn] = useState({ orange: 0, cyan: 0 })
  const [tool, setTool] = useState<Tool>(1)

  // Hand mode
  const [angle, setAngle] = useState(90)
  const [offset, setOffset] = useState(0.55)
  const [lineByRobot, setLineByRobot] = useState(false)
  /** The child moved the line by hand since the dots last changed (the own-dots mission needs a real answer, not a lucky old line). */
  const [lineMoved, setLineMoved] = useState(false)
  /** Robot fixes since the dots or the line last changed by hand; capped so "keep fixing" always ends. */
  const fixesRef = useRef(0)
  const [fixStuck, setFixStuck] = useState(false)
  const [lastFixed, setLastFixed] = useState<Pt | null>(null)
  const rngRef = useRef(makeRng(5))

  // Train mode
  const [layers, setLayers] = useState(0)
  const [neurons, setNeurons] = useState(4)
  const [lrExp, setLrExp] = useState(-1.5) // learning rate = 10^lrExp
  const [act, setAct] = useState<Activation>('tanh')
  const [fs, setFs] = useState<FeatureSet>('xy')
  const [running, setRunning] = useState(false)
  const [seed, setSeed] = useState(1)
  const [stats, setStats] = useState({ loss: 0, accuracy: 0, steps: 0 })
  const netRef = useRef<Net | null>(null)
  const lossHist = useRef<number[]>([])
  const stepsRef = useRef(0)

  const missions = useMemo(() => neuralMissionsFor(tier), [tier])
  const ms = useThinkMissions<NeuralMission>('neural')

  // Default mode follows the tier.
  useEffect(() => {
    setMode(tier === 'Cadet' ? 'hand' : 'train')
    setLayers((l) => Math.min(l, MAX_LAYERS[tier]))
    if (tier !== 'Legend') {
      setFs('xy')
      setAct('tanh')
    }
  }, [tier])

  const hidden = useMemo(() => Array.from({ length: layers }, () => neurons), [layers, neurons])
  const lr = Math.pow(10, lrExp)

  const resetNet = useCallback(() => {
    netRef.current = createNet(featureCount(fs), hidden, act, seed)
    lossHist.current = []
    stepsRef.current = 0
    const ev = evaluate(netRef.current, points, fs)
    setStats({ loss: ev.loss, accuracy: ev.accuracy, steps: 0 })
    // points intentionally read fresh; a data change resets via its own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, hidden, act, seed])

  useEffect(() => {
    resetNet()
  }, [resetNet])

  // New data: keep the brain, restart the curve (training continues on the new dots).
  useEffect(() => {
    lossHist.current = []
    stepsRef.current = 0
    if (netRef.current) {
      const ev = evaluate(netRef.current, points, fs)
      setStats({ loss: ev.loss, accuracy: ev.accuracy, steps: 0 })
    }
  }, [points, fs])

  const line: Line = useMemo(() => lineFromAngle(angle, offset), [angle, offset])
  const handAcc = useMemo(() => lineAccuracy(line, points), [line, points])

  // ── Training loop ──
  const pointsRef = useRef(points)
  pointsRef.current = points
  const lrRef = useRef(lr)
  lrRef.current = lr
  const fsRef = useRef(fs)
  fsRef.current = fs

  const step = useCallback((n: number) => {
    const net = netRef.current
    if (!net) return
    let s = { loss: 0, accuracy: 0 }
    for (let i = 0; i < n; i++) {
      s = trainStep(net, pointsRef.current, fsRef.current, lrRef.current)
      stepsRef.current++
      if (stepsRef.current % 2 === 0) lossHist.current.push(s.loss)
    }
    if (lossHist.current.length > 600) lossHist.current = lossHist.current.filter((_, i) => i % 2 === 0)
    const ev = evaluate(net, pointsRef.current, fsRef.current)
    setStats({ loss: ev.loss, accuracy: ev.accuracy, steps: stepsRef.current })
  }, [])

  useEffect(() => {
    if (!running || mode !== 'train') return
    let raf = 0
    const tick = () => {
      step(3)
      if (stepsRef.current >= MAX_STEPS) {
        setRunning(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onHide = () => {
      if (document.hidden) setRunning(false)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [running, mode, step])

  // ── Missions ──
  useEffect(() => {
    const snap: NeuralSnapshot = {
      mode,
      dataset,
      ownOrange: own.orange,
      ownCyan: own.cyan,
      accuracy: mode === 'hand' ? handAcc : stats.accuracy,
      lineByRobot,
      lineMovedByChild: lineMoved,
      hiddenLayers: layers,
      totalHidden: layers * neurons,
      features: fs,
      steps: stats.steps,
      loss: stats.loss,
    }
    if (points.length < 4) return
    for (const m of missions) if (!ms.done.includes(m.id) && m.check(snap)) ms.complete(m)
  }, [mode, dataset, own, handAcc, stats, lineByRobot, lineMoved, layers, neurons, fs, points.length, missions, ms])

  // New dots: the old line is no longer an answer to them, and the robot gets a fresh fix budget.
  useEffect(() => {
    setLineMoved(false)
    fixesRef.current = 0
    setFixStuck(false)
  }, [points])

  // ── Data actions ──
  const loadData = (id: DatasetId) => {
    playSound('click')
    setDataset(id)
    setPoints(makeDataset(id, id === 'spiral' ? 160 : id === 'blobs' ? 40 : 100, 11 + id.length))
    setOwn({ orange: 0, cyan: 0 })
    setLineByRobot(false)
    setLastFixed(null)
  }
  const clearData = () => {
    playSound('click')
    setDataset('own')
    setPoints([])
    setOwn({ orange: 0, cyan: 0 })
    setLineByRobot(false)
  }

  const onPlotTap = (wx: number, wy: number) => {
    if (tool === 'erase') {
      let best = -1
      let bd = 0.1
      points.forEach((p, i) => {
        const d = Math.hypot(p.x - wx, p.y - wy)
        if (d < bd) {
          bd = d
          best = i
        }
      })
      if (best >= 0) {
        playSound('click')
        setPoints(points.filter((_, i) => i !== best))
        setDataset('own')
      }
      return
    }
    if (points.length >= 220) return
    playSound('click')
    const label: Label = tool
    setPoints([...points, { x: wx, y: wy, label }])
    setDataset('own')
    setOwn((o) => (label === 1 ? { ...o, orange: o.orange + 1 } : { ...o, cyan: o.cyan + 1 }))
  }

  const robotFix = () => {
    const r = perceptronStep(line, points, 0.5, rngRef.current)
    if (!r) {
      playSound('correct')
      return
    }
    if (fixesRef.current >= MAX_ROBOT_FIXES) {
      // Mixed-up dots (or dots right on the line) can make the rule tip back and
      // forth for ever. Stop and say why instead of running with no feedback.
      setAutoFix(false)
      setFixStuck(true)
      return
    }
    fixesRef.current++
    playSound('click')
    const { angleDeg, offset: off } = angleFromLine(r.line)
    setAngle(Math.round(angleDeg))
    setOffset(Math.max(-1.4, Math.min(1.4, Math.round(off * 100) / 100)))
    setLineByRobot(true)
    setLastFixed(r.fixed)
  }

  const [autoFix, setAutoFix] = useState(false)
  const robotFixRef = useRef(robotFix)
  robotFixRef.current = robotFix
  useEffect(() => {
    if (!autoFix) return
    const id = window.setInterval(() => robotFixRef.current(), 450)
    return () => window.clearInterval(id)
  }, [autoFix])
  useEffect(() => {
    if (autoFix && handAcc >= 1) setAutoFix(false)
  }, [autoFix, handAcc])

  const maxLayers = MAX_LAYERS[tier]

  return (
    <div className="mx-auto max-w-6xl px-3 pb-6 sm:px-4">
      <TierTabs tier={tier} onChange={setTier} />

      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode">
        <Btn pressed={mode === 'hand'} onClick={() => setMode('hand')}>
          Draw the line
        </Btn>
        <Btn
          pressed={mode === 'train'}
          onClick={() => {
            setAutoFix(false)
            setMode('train')
          }}
        >
          Train a brain
        </Btn>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel>
            <Plot
              points={points}
              mode={mode}
              line={line}
              lastFixed={lastFixed}
              net={netRef.current}
              fs={fs}
              version={stats.steps + points.length * 1e6 + seed * 7}
              onTap={onPlotTap}
            />
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="What a tap does">
              <Btn pressed={tool === 1} onClick={() => setTool(1)} className="px-2 text-sm">
                <span aria-hidden className="mr-1 inline-block h-3 w-3 rounded-full bg-[#FC6818] align-middle" />
                Orange dot
              </Btn>
              <Btn pressed={tool === 0} onClick={() => setTool(0)} className="px-2 text-sm">
                <span aria-hidden className="mr-1 inline-block h-3 w-3 rounded-full bg-[#00B8D4] align-middle" />
                Blue dot
              </Btn>
              <Btn pressed={tool === 'erase'} onClick={() => setTool('erase')} className="px-2 text-sm">
                Erase
              </Btn>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Load dots">
              {DATASETS.filter((d) => tier !== 'Cadet' || d.id === 'blobs' || d.id === 'line').map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => loadData(d.id)}
                  aria-pressed={dataset === d.id}
                  className={cx(
                    'min-h-11 flex-none rounded-full border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60',
                    dataset === d.id ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-white/15 text-slate-200',
                  )}
                >
                  {d.name}
                </button>
              ))}
              <button
                type="button"
                onClick={clearData}
                className="min-h-11 flex-none rounded-full border border-white/15 px-3 text-sm font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                Clear board
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {dataset === 'own' ? `Your own dots: ${points.length}. Tap the board to add more.` : DATASETS.find((d) => d.id === dataset)?.hint}
            </p>
          </Panel>

          {mode === 'hand' ? (
            <Panel title="Your line">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Dots right" value={`${Math.round(handAcc * points.length)}/${points.length}`} tone={handAcc >= 1 && points.length ? 'good' : 'plain'} />
                <Stat label="Accuracy" value={`${Math.round(handAcc * 100)}%`} tone={handAcc >= 1 && points.length ? 'good' : 'plain'} />
              </div>
              <div className="mt-3 space-y-2">
                <Slider
                  label="Turn the line"
                  value={angle}
                  min={0}
                  max={359}
                  step={1}
                  format={(v) => `${v}°`}
                  onChange={(v) => {
                    setAngle(v)
                    setLineByRobot(false)
                    setLineMoved(true)
                    setAutoFix(false)
                    fixesRef.current = 0
                    setFixStuck(false)
                  }}
                />
                <Slider
                  label="Slide the line"
                  value={offset}
                  min={-1.4}
                  max={1.4}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => {
                    setOffset(v)
                    setLineByRobot(false)
                    setLineMoved(true)
                    setAutoFix(false)
                    fixesRef.current = 0
                    setFixStuck(false)
                  }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Btn kind="primary" onClick={robotFix} disabled={autoFix}>
                  Robot, fix one mistake
                </Btn>
                <Btn pressed={autoFix} onClick={() => setAutoFix((a) => !a)}>
                  {autoFix ? 'Stop robot' : 'Robot, keep fixing'}
                </Btn>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                The orange side of the line says “orange”. The robot picks one dot it got wrong and tips the line toward it — the perceptron rule from 1958.
                {lastFixed && lineByRobot && !fixStuck && <span className="text-amber-300"> It just learned from the ringed dot.</span>}
              </p>
              {fixStuck && (
                <p role="status" className="mt-2 rounded-2xl bg-amber-500/10 p-3 text-[15px] text-amber-100">
                  The robot tried {MAX_ROBOT_FIXES} fixes and the line keeps tipping back and forth. Maybe no straight line can split these dots — some orange and blue
                  ones are mixed up. Move a dot, or switch to Train and give the brain a hidden layer.
                </p>
              )}
            </Panel>
          ) : (
            <Panel title="Train the brain">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} tone={stats.accuracy >= 0.95 ? 'good' : 'plain'} />
                <Stat label="Loss" value={stats.loss.toFixed(3)} />
                <Stat label="Steps" value={String(stats.steps)} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Btn kind="primary" onClick={() => setRunning((r) => !r)} disabled={points.length < 2} className="col-span-1">
                  {running ? 'Pause' : stats.steps ? 'Go on' : 'Train'}
                </Btn>
                <Btn onClick={() => step(10)} disabled={running || points.length < 2}>
                  +10 steps
                </Btn>
                <Btn
                  onClick={() => {
                    setRunning(false)
                    setSeed((s) => s + 1)
                  }}
                >
                  New brain
                </Btn>
              </div>
              <LossCurve hist={lossHist.current} version={stats.steps} />
            </Panel>
          )}
        </div>

        <div className="space-y-3">
          {mode === 'train' && (
            <Panel title="The brain">
              <NetDiagram net={netRef.current} fs={fs} version={stats.steps + seed * 7 + layers * 100 + neurons * 1000} animate={running} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Slider
                  label="Hidden layers"
                  value={layers}
                  min={0}
                  max={maxLayers}
                  step={1}
                  onChange={(v) => {
                    setRunning(false)
                    setLayers(v)
                  }}
                  hint={tier === 'Pilot' ? 'Ace level unlocks more layers.' : undefined}
                />
                <Slider
                  label="Neurons per layer"
                  value={neurons}
                  min={1}
                  max={8}
                  step={1}
                  onChange={(v) => {
                    setRunning(false)
                    setNeurons(v)
                  }}
                />
                <Slider
                  label="Learning rate"
                  value={lrExp}
                  min={-3}
                  max={0}
                  step={0.25}
                  format={(v) => Math.pow(10, v).toPrecision(2)}
                  onChange={setLrExp}
                  hint="Too small = slow. Too big = it jumps about."
                />
                {tier === 'Legend' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Btn pressed={act === 'tanh'} onClick={() => setAct('tanh')} className="text-sm">
                        tanh
                      </Btn>
                      <Btn pressed={act === 'relu'} onClick={() => setAct('relu')} className="text-sm">
                        ReLU
                      </Btn>
                    </div>
                    <Btn pressed={fs === 'xy+squares'} onClick={() => setFs((f) => (f === 'xy' ? 'xy+squares' : 'xy'))} className="w-full text-sm">
                      Extra inputs x², y², x·y
                    </Btn>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Each square is one neuron and the picture inside it is what that neuron reacts to. Lines are weights: orange pushes toward orange, blue
                pushes toward blue, thicker means stronger. Training nudges every weight a tiny bit to make the loss smaller — that is called gradient
                descent.
              </p>
            </Panel>
          )}

          <Panel title={`Missions · ${tier}`}>
            <MissionList missions={missions} done={ms.done} />
          </Panel>
        </div>
      </div>
      <MissionDone mission={ms.justDone} onClose={ms.dismiss} />
    </div>
  )
}

// ── The board ────────────────────────────────────────────────────────────

const GRID = 44

function Plot({
  points,
  mode,
  line,
  lastFixed,
  net,
  fs,
  version,
  onTap,
}: {
  points: Pt[]
  mode: NeuralMode
  line: Line
  lastFixed: Pt | null
  net: Net | null
  fs: FeatureSet
  version: number
  onTap: (x: number, y: number) => void
}) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = Math.min(width || 320, 460)

  useEffect(() => {
    const c = canvas.current
    if (!c || !size) return
    const ctx = fitCanvas(c, size, size)
    if (!ctx) return
    const S = size
    const toPx = (v: number) => ((v + 1) / 2) * S
    const toPy = (v: number) => ((1 - v) / 2) * S
    ctx.fillStyle = '#0D1628'
    ctx.fillRect(0, 0, S, S)
    const cell = S / GRID
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const x = ((gx + 0.5) / GRID) * 2 - 1
        const y = 1 - ((gy + 0.5) / GRID) * 2
        let p: number
        if (mode === 'hand') p = line.w1 * x + line.w2 * y + line.b > 0 ? 0.8 : 0.2
        else if (net) {
          const a = forward(net, features(x, y, fs))
          p = a[a.length - 1][0]
        } else p = 0.5
        const conf = Math.abs(p - 0.5) * 2
        ctx.fillStyle = rgba(p >= 0.5 ? ORANGE : CYAN, 0.08 + conf * 0.32)
        ctx.fillRect(gx * cell, gy * cell, cell + 0.6, cell + 0.6)
      }
    }
    // axes
    ctx.strokeStyle = 'rgba(255,255,255,.10)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(S / 2, 0)
    ctx.lineTo(S / 2, S)
    ctx.moveTo(0, S / 2)
    ctx.lineTo(S, S / 2)
    ctx.stroke()
    if (mode === 'hand') {
      // Draw the line w1 x + w2 y + b = 0 across the board.
      const n = Math.hypot(line.w1, line.w2) || 1
      const px = (-line.b * line.w1) / (n * n)
      const py = (-line.b * line.w2) / (n * n)
      const dx = -line.w2 / n
      const dy = line.w1 / n
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(toPx(px - dx * 3), toPy(py - dy * 3))
      ctx.lineTo(toPx(px + dx * 3), toPy(py + dy * 3))
      ctx.stroke()
      // arrow toward the orange side
      ctx.fillStyle = '#FFA878'
      ctx.beginPath()
      const ax = toPx(px + (line.w1 / n) * 0.18)
      const ay = toPy(py + (line.w2 / n) * 0.18)
      ctx.arc(ax, ay, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    const r = S < 360 ? 5 : 6
    for (const p of points) {
      const wrong = mode === 'hand' ? (line.w1 * p.x + line.w2 * p.y + line.b > 0 ? 1 : 0) !== p.label : false
      ctx.beginPath()
      ctx.arc(toPx(p.x), toPy(p.y), r, 0, Math.PI * 2)
      ctx.fillStyle = p.label === 1 ? '#FC6818' : '#00B8D4'
      ctx.fill()
      ctx.lineWidth = wrong ? 2.5 : 1.5
      ctx.strokeStyle = wrong ? '#FFFFFF' : '#0A1120'
      ctx.stroke()
    }
    if (lastFixed && mode === 'hand') {
      ctx.beginPath()
      ctx.arc(toPx(lastFixed.x), toPy(lastFixed.y), r + 7, 0, Math.PI * 2)
      ctx.strokeStyle = '#FFD166'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
  }, [points, mode, line, lastFixed, net, fs, version, size])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = 1 - ((e.clientY - rect.top) / rect.height) * 2
    onTap(Math.max(-0.98, Math.min(0.98, x)), Math.max(-0.98, Math.min(0.98, y)))
  }

  const orange = points.filter((p) => p.label === 1).length
  return (
    <div ref={wrap} className="flex justify-center">
      <canvas
        ref={canvas}
        onPointerDown={onPointerDown}
        style={{ width: size, height: size }}
        className="touch-manipulation rounded-2xl"
        role="img"
        aria-label={`Board with ${orange} orange dots and ${points.length - orange} blue dots. The shading shows which colour the robot would guess for each spot. Tap to add a dot.`}
      />
    </div>
  )
}

// ── The network drawing ─────────────────────────────────────────────────

const HEAT = 14

function NetDiagram({ net, fs, version, animate }: { net: Net | null; fs: FeatureSet; version: number; animate: boolean }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const H = 230
  const dash = useRef(0)

  const draw = useCallback(() => {
    const c = canvas.current
    if (!c || !net || !width) return
    const ctx = fitCanvas(c, width, H)
    if (!ctx) return
    ctx.clearRect(0, 0, width, H)
    const sizes = net.sizes
    // Activations of every neuron over a coarse grid, for the little pictures.
    const heat: Float64Array[][] = sizes.map((n) => Array.from({ length: n }, () => new Float64Array(HEAT * HEAT)))
    for (let gy = 0; gy < HEAT; gy++)
      for (let gx = 0; gx < HEAT; gx++) {
        const x = ((gx + 0.5) / HEAT) * 2 - 1
        const y = 1 - ((gy + 0.5) / HEAT) * 2
        const acts = forward(net, features(x, y, fs))
        acts.forEach((a, l) => a.forEach((v, j) => (heat[l][j][gy * HEAT + gx] = v)))
      }
    const cols = sizes.length
    const box = Math.max(18, Math.min(34, Math.floor((H - 20) / Math.max(...sizes)) - 6))
    const colX = (l: number) => 14 + box / 2 + (l * (width - 28 - box)) / Math.max(1, cols - 1)
    const rowY = (l: number, j: number) => {
      const n = sizes[l]
      const gap = (H - 16) / n
      return 8 + gap * (j + 0.5)
    }
    // weights
    const reduced = prefersReducedMotion()
    for (let l = 0; l < cols - 1; l++) {
      const nIn = sizes[l]
      for (let j = 0; j < sizes[l + 1]; j++)
        for (let i = 0; i < nIn; i++) {
          const w = net.W[l][j * nIn + i]
          ctx.strokeStyle = rgba(w >= 0 ? ORANGE : CYAN, Math.min(0.95, 0.25 + Math.abs(w) * 0.35))
          ctx.lineWidth = Math.min(5, 0.5 + Math.abs(w) * 1.4)
          if (animate && !reduced) {
            ctx.setLineDash([6, 6])
            ctx.lineDashOffset = -dash.current
          } else ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(colX(l) + box / 2, rowY(l, i))
          ctx.lineTo(colX(l + 1) - box / 2, rowY(l + 1, j))
          ctx.stroke()
        }
    }
    ctx.setLineDash([])
    // neurons with their pictures
    const names = fs === 'xy' ? ['x', 'y'] : ['x', 'y', 'x²', 'y²', 'x·y']
    for (let l = 0; l < cols; l++) {
      const isOut = l === cols - 1
      for (let j = 0; j < sizes[l]; j++) {
        const cxp = colX(l) - box / 2
        const cyp = rowY(l, j) - box / 2
        const hm = heat[l][j]
        let lo = Infinity
        let hi = -Infinity
        for (const v of hm) {
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
        const cs = box / HEAT
        for (let k = 0; k < HEAT * HEAT; k++) {
          const v = l === 0 || isOut ? (isOut ? hm[k] : (hm[k] - lo) / (hi - lo || 1)) : net.act === 'tanh' ? (hm[k] + 1) / 2 : hi > 0 ? hm[k] / hi : 0
          ctx.fillStyle = rgba(v >= 0.5 ? ORANGE : CYAN, 0.15 + Math.abs(v - 0.5) * 1.6)
          ctx.fillRect(cxp + (k % HEAT) * cs, cyp + Math.floor(k / HEAT) * cs, cs + 0.4, cs + 0.4)
        }
        ctx.strokeStyle = isOut ? '#FFA878' : 'rgba(255,255,255,.35)'
        ctx.lineWidth = isOut ? 2 : 1
        ctx.strokeRect(cxp, cyp, box, box)
        if (l === 0) {
          ctx.fillStyle = '#EEF2F8'
          ctx.font = '600 11px system-ui, sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText(names[j] ?? '', cxp - 3, cyp + box / 2 + 4)
        }
      }
    }
  }, [net, fs, width, animate])

  useEffect(() => {
    draw()
  }, [draw, version])

  useEffect(() => {
    if (!animate || prefersReducedMotion()) return
    let raf = 0
    const tick = () => {
      dash.current = (dash.current + 0.8) % 12
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animate])

  const label = net ? `Network: ${net.sizes.join(' → ')} neurons.` : 'Network'
  return (
    <div ref={wrap}>
      <canvas ref={canvas} style={{ width: '100%', height: H }} role="img" aria-label={label} />
      <p className="mt-1 text-center text-xs text-slate-400">
        inputs → {net && net.sizes.length > 2 ? `${net.sizes.length - 2} hidden layer${net.sizes.length > 3 ? 's' : ''} → ` : ''}output
      </p>
    </div>
  )
}

function LossCurve({ hist, version }: { hist: number[]; version: number }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const H = 90
  useEffect(() => {
    const c = canvas.current
    if (!c || !width) return
    const ctx = fitCanvas(c, width, H)
    if (!ctx) return
    ctx.fillStyle = '#0D1628'
    ctx.fillRect(0, 0, width, H)
    if (hist.length < 2) {
      ctx.fillStyle = '#6E7888'
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText('Loss curve appears when training starts', 10, H / 2 + 4)
      return
    }
    const max = Math.max(0.75, ...hist)
    ctx.strokeStyle = '#FF8A4C'
    ctx.lineWidth = 2
    ctx.beginPath()
    hist.forEach((v, i) => {
      const x = (i / (hist.length - 1)) * (width - 8) + 4
      const y = H - 6 - (v / max) * (H - 14)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [hist, version, width])
  return (
    <div ref={wrap} className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Loss (how wrong it is) — down is good</p>
      <canvas ref={canvas} style={{ width: '100%', height: H }} className="rounded-xl" role="img" aria-label={`Loss curve, latest loss ${hist.length ? hist[hist.length - 1].toFixed(3) : 'none'}`} />
    </div>
  )
}
