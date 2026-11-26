'use client'

// components/kids/activities/templates/simple-machines/SimpleMachinesClient.tsx
// Pick a machine, tune it with the slider, press Lift. Live meters show the
// push needed against the robot's strength and the distance against the rope
// or room available; the scene then plays the lift (or the strain).

import { useMemo, useRef, useState, type ReactElement } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { G, forceText, simulate, weight, type Answer, type MachineKind, type MachineOption, type Params } from './logic'
import {
  FeedbackPanel,
  TemplateCard,
  btnGhost,
  btnPrimary,
  useAnimationFrame,
  useAttempts,
  useReducedMotion,
} from '../gear-train/TemplateFrameClient'

const LABEL: Record<MachineKind, { name: string; setting: string; unit: string; icon: string }> = {
  ramp: { name: 'Ramp', setting: 'Ramp length', unit: 'm', icon: '📐' },
  pulley: { name: 'Pulley', setting: 'Rope strands', unit: '', icon: '🪢' },
  lever: { name: 'Lever', setting: 'Effort arm', unit: 'm', icon: '🪵' },
  'wheel-axle': { name: 'Wheel & axle', setting: 'Wheel radius', unit: 'cm', icon: '☸️' },
}

type Phase = 'idle' | 'running' | 'shown'

export default function SimpleMachinesClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const p = params
  const young = band === 'explorers' || band === 'builders'
  const showMath = p.showMath ?? !young
  const [kind, setKind] = useState<MachineKind>(p.machines[0].kind)
  const opt = p.machines.find((m) => m.kind === kind) as MachineOption
  const [settings, setSettings] = useState<Record<string, number>>(() => Object.fromEntries(p.machines.map((m) => [m.kind, m.min])))
  const setting = settings[kind]
  const [phase, setPhase] = useState<Phase>('idle')
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)

  const answer: Answer = useMemo(() => ({ machine: kind, setting }), [kind, setting])
  const r = useMemo(() => simulate(p, answer), [p, answer])
  const W = weight(p)
  const tooWeak = r.effort > p.maxEffort + 1e-9
  const tooFar = p.maxDistance !== undefined && r.distance > p.maxDistance + 1e-9
  const stopAt = tooWeak ? 0 : tooFar && p.maxDistance ? p.maxDistance / r.distance : 1

  const edit = (fn: () => void) => {
    if (att.result) att.clear()
    setPhase('idle')
    tRef.current = 0
    setT(0)
    fn()
  }

  const finishRun = () => {
    setPhase('shown')
    att.submit(answer)
  }

  const run = () => {
    playSound('click')
    tRef.current = 0
    setT(0)
    if (reduced) {
      setT(stopAt)
      finishRun()
    } else setPhase('running')
  }

  useAnimationFrame(phase === 'running', (dt) => {
    const speed = 0.6
    const target = tooWeak ? 0.06 : stopAt
    tRef.current = Math.min(target, tRef.current + dt * speed)
    setT(tRef.current)
    if (tRef.current >= target - 1e-6) {
      if (tooWeak) {
        tRef.current = 0
        setT(0)
      }
      finishRun()
    }
  })

  // keyboard on the slider is native; also support +/- buttons
  const nudge = (d: number) =>
    edit(() => {
      playSound('click')
      const v = Math.round((setting + d * opt.step) * 1e6) / 1e6
      setSettings((s) => ({ ...s, [kind]: Math.max(opt.min, Math.min(opt.max, v)) }))
    })

  const effortPct = Math.min(1.25, r.effort / p.maxEffort)
  const distPct = p.maxDistance ? Math.min(1.25, r.distance / p.maxDistance) : null

  return (
    <TemplateCard label="Simple machines workshop">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">
          Lift the {p.load.label} {p.load.emoji} ({p.load.mass} kg) up {p.height} m. Your robot can push with only {forceText(p, p.maxEffort)}
          {p.maxDistance ? ` and has ${p.maxDistance} m of rope/room` : ''}.{(p.goal ?? 'works') === 'least-distance' ? ' Use just enough help — the shortest movement that works.' : ''}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Machine">
        {p.machines.map((m) => (
          <button
            key={m.kind}
            type="button"
            role="radio"
            aria-checked={kind === m.kind}
            onClick={() =>
              edit(() => {
                playSound('click')
                setKind(m.kind)
              })
            }
            className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl border px-4 font-display text-base font-bold transition-transform duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
              kind === m.kind ? 'border-amber-400 bg-amber-500/15 text-amber-300' : 'border-white/15 bg-[#19263F] text-[#EEF2F8] hover:border-white/30'
            }`}
          >
            <span aria-hidden="true" className="text-xl">
              {LABEL[m.kind].icon}
            </span>
            {LABEL[m.kind].name}
          </button>
        ))}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <Scene p={p} kind={kind} setting={setting} t={t} strain={phase === 'running' && tooWeak} reduced={reduced} />
      </div>

      {/* slider */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-[#111C32] p-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="sm-slider" className="font-semibold text-[#A7B0C0]">
            {LABEL[kind].setting}
          </label>
          <span className="font-display text-xl font-bold text-amber-300 tabular-nums">
            {setting}
            {LABEL[kind].unit ? ` ${LABEL[kind].unit}` : kind === 'pulley' ? (setting === 1 ? ' strand' : ' strands') : ''}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" className={`${btnGhost} min-w-[48px] px-0`} onClick={() => nudge(-1)} aria-label="Less" disabled={setting <= opt.min}>
            −
          </button>
          <input
            id="sm-slider"
            type="range"
            min={opt.min}
            max={opt.max}
            step={opt.step}
            value={setting}
            onChange={(e) => {
              const v = Number(e.target.value)
              edit(() => setSettings((s) => ({ ...s, [kind]: v })))
            }}
            className="h-12 w-full cursor-pointer accent-amber-500"
          />
          <button type="button" className={`${btnGhost} min-w-[48px] px-0`} onClick={() => nudge(1)} aria-label="More" disabled={setting >= opt.max}>
            +
          </button>
        </div>
      </div>

      {/* meters */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Meter
          label="Push needed"
          value={forceText(p, r.effort)}
          limit={`robot max ${forceText(p, p.maxEffort)}`}
          pct={effortPct}
          bad={tooWeak}
        />
        <Meter
          label="Distance the robot moves"
          value={`${Math.round(r.distance * 100) / 100} m`}
          limit={p.maxDistance ? `available ${p.maxDistance} m` : 'no limit'}
          pct={distPct ?? Math.min(1, r.distance / (p.height * 10))}
          bad={tooFar}
        />
      </div>
      {showMath && (
        <p className="mt-2 rounded-2xl bg-[#111C32] px-3 py-2 font-mono text-sm leading-relaxed text-[#A7B0C0]">
          {formula(p, kind, setting)}
          <br />
          work = {Math.round(r.effort)} N × {Math.round(r.distance * 100) / 100} m = {Math.round(r.effort * r.distance)} J · lift alone = {Math.round(W)} N ×{' '}
          {p.height} m = {Math.round(W * p.height)} J
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={run} disabled={phase === 'running' || !!att.result || att.done}>
          Lift!
        </button>
      </div>
      <FeedbackPanel att={att} onRetry={() => edit(() => undefined)} />
    </TemplateCard>
  )
}

function formula(p: Params, kind: MachineKind, s: number): string {
  const W = Math.round(weight(p))
  switch (kind) {
    case 'ramp':
      return `push = W × (h/L${p.rampFriction ? ' + μ·cosθ' : ''}) = ${W} × (${p.height}/${s}${p.rampFriction ? ` + ${p.rampFriction}·cosθ` : ''})`
    case 'pulley':
      return `pull = W ÷ (strands${p.pulleyEfficiency && p.pulleyEfficiency < 1 ? ' × η' : ''}) = ${W} ÷ (${s}${p.pulleyEfficiency && p.pulleyEfficiency < 1 ? ` × ${p.pulleyEfficiency}` : ''})`
    case 'lever':
      return `push = W × load arm ÷ effort arm = ${W} × ${p.leverLoadArm ?? 0.5} ÷ ${s}`
    case 'wheel-axle':
      return `push = W × axle ÷ wheel = ${W} × ${p.axleRadiusCm ?? 2} ÷ ${s}`
  }
}

function Meter({ label, value, limit, pct, bad }: { label: string; value: string; limit: string; pct: number; bad: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A7B0C0]">{label}</p>
        <p className={`font-display text-lg font-bold tabular-nums ${bad ? 'text-amber-300' : 'text-[#22C55E]'}`}>{value}</p>
      </div>
      <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${bad ? 'bg-amber-500' : 'bg-[#22C55E]'}`}
          style={{ width: `${Math.min(100, (pct / 1.25) * 100)}%` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: '80%' }} />
      </div>
      <p className="mt-1 text-xs text-[#6E7888]">{limit} (white line)</p>
    </div>
  )
}

// ── The scene ──────────────────────────────────────────────────────────────

const GROUND = 228

function Robot({ x, y, strain, flip = false }: { x: number; y: number; strain: boolean; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <g className={strain ? 'motion-safe:animate-[sm-shake_.12s_linear_infinite]' : ''}>
      <rect x={-11} y={-34} width={22} height={20} rx={5} fill="#FC6818" />
      <rect x={-6} y={-29} width={12} height={6} rx={2} fill="#1A1103" />
      <circle cx={-3} cy={-26} r={1.6} fill="#00E5FF" />
      <circle cx={3} cy={-26} r={1.6} fill="#00E5FF" />
      <rect x={-9} y={-14} width={18} height={10} rx={3} fill="#19263F" stroke="#FFA878" />
      <circle cx={-6} cy={-2} r={3} fill="#6E7888" />
      <circle cx={6} cy={-2} r={3} fill="#6E7888" />
      </g>
    </g>
  )
}

function LoadBox({ x, y, p }: { x: number; y: number; p: Params }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-16} y={-28} width={32} height={28} rx={5} fill="#00B8D4" stroke="#0A1120" strokeWidth={1.5} />
      <text x={0} y={-9} textAnchor="middle" fontSize={15}>
        {p.load.emoji ?? '📦'}
      </text>
    </g>
  )
}

function Scene({ p, kind, setting, t, strain, reduced }: { p: Params; kind: MachineKind; setting: number; t: number; strain: boolean; reduced: boolean }) {
  const H = 150 // px for the lift height
  const shelfY = GROUND - H
  const aria = `${LABEL[kind].name} set to ${setting}${LABEL[kind].unit ? ' ' + LABEL[kind].unit : ''}.`
  let body: ReactElement
  if (kind === 'ramp') {
    const opt = p.machines.find((m) => m.kind === 'ramp') as MachineOption
    const horiz = (L: number) => Math.sqrt(Math.max(0, L * L - p.height * p.height))
    const scale = Math.min(H / p.height, 300 / Math.max(horiz(opt.max), 0.01))
    const hp = p.height * scale
    const run = horiz(setting) * scale
    const x0 = 360 - run
    const bx = x0 + run * t
    const by = GROUND - hp * t
    const ang = (Math.atan2(hp, run) * 180) / Math.PI
    body = (
      <g>
        <rect x={360} y={GROUND - hp} width={34} height={hp} fill="#19263F" stroke="rgba(255,255,255,.16)" />
        <polygon points={`${x0},${GROUND} 360,${GROUND - hp} 360,${GROUND}`} fill="#6E7888" fillOpacity={0.5} stroke="#A7B0C0" />
        <g transform={`rotate(${-ang} ${bx} ${by})`}>
          <LoadBox x={bx} y={by} p={p} />
          <Robot x={bx - 30} y={by} strain={strain} />
        </g>
      </g>
    )
  } else if (kind === 'pulley') {
    const n = Math.round(setting)
    const lift = H * t
    const topY = 26
    const loadTop = GROUND - 28 - lift
    const lowerBlockY = loadTop - 16
    const cx = 180
    const spread = 7
    const strands = Array.from({ length: n }, (_, i) => cx - ((n - 1) * spread) / 2 + i * spread)
    body = (
      <g>
        <rect x={60} y={10} width={260} height={8} fill="#6E7888" />
        <rect x={cx - 24} y={topY - 8} width={48} height={18} rx={6} fill="#A7B0C0" />
        {n > 1 && <rect x={cx - 24} y={lowerBlockY - 8} width={48} height={16} rx={6} fill="#A7B0C0" />}
        {strands.map((x, i) => (
          <line key={i} x1={x} y1={topY + 6} x2={x} y2={n > 1 ? lowerBlockY - 6 : loadTop} stroke="#FFA878" strokeWidth={2} />
        ))}
        <line x1={cx} y1={n > 1 ? lowerBlockY + 8 : loadTop} x2={cx} y2={loadTop} stroke="#FFA878" strokeWidth={2} />
        {/* free end to the robot */}
        <line x1={cx + 24} y1={topY} x2={300} y2={GROUND - 26} stroke="#FFA878" strokeWidth={2} />
        <LoadBox x={cx} y={GROUND - lift} p={p} />
        <Robot x={306} y={GROUND} strain={strain} flip />
        <text x={cx + 32} y={lowerBlockY + 4} fontSize={11} fontWeight={700} fill="#FFA878">
          {n} strand{n === 1 ? '' : 's'}
        </text>
      </g>
    )
  } else if (kind === 'lever') {
    const opt = p.machines.find((m) => m.kind === 'lever') as MachineOption
    const la = p.leverLoadArm ?? 0.5
    const total = la + opt.max
    const sc = 320 / total
    const px = 40 + la * sc
    const loadX = 40
    const effX = px + setting * sc
    const pivotY = GROUND - 40
    const maxAng = Math.atan2(40, la * sc)
    const ang = (-maxAng + 2 * maxAng * t) * (180 / Math.PI) // load end from ground upward
    body = (
      <g>
        <polygon points={`${px},${pivotY} ${px - 16},${GROUND} ${px + 16},${GROUND}`} fill="#FC6818" />
        <g transform={`rotate(${ang} ${px} ${pivotY})`}>
          <rect x={loadX - 10} y={pivotY - 4} width={effX - loadX + 20} height={8} rx={3} fill="#A7B0C0" />
          <LoadBox x={loadX + 6} y={pivotY - 4} p={p} />
          <Robot x={effX} y={pivotY - 4} strain={strain} />
        </g>
        <text x={px} y={GROUND + 12} textAnchor="middle" fontSize={10} fill="#A7B0C0">
          pivot
        </text>
      </g>
    )
  } else {
    const opt = p.machines.find((m) => m.kind === 'wheel-axle') as MachineOption
    const r = p.axleRadiusCm ?? 2
    const sc = 70 / Math.max(opt.max, r)
    const R = Math.max(8, setting * sc)
    const ra = Math.max(4, r * sc)
    const cx = 170
    const cy = 50
    const lift = H * t * 0.85
    const turn = ((p.height * t) / (2 * Math.PI * (r / 100))) * 360
    body = (
      <g>
        <rect x={cx - 4} y={cy} width={8} height={GROUND - cy} fill="#19263F" />
        <g transform={`rotate(${reduced ? 0 : turn % 360} ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#00B8D4" strokeWidth={4} />
          {[0, 90, 180, 270].map((a) => (
            <line key={a} x1={cx} y1={cy} x2={(cx + R * Math.cos((a * Math.PI) / 180)).toFixed(2)} y2={(cy + R * Math.sin((a * Math.PI) / 180)).toFixed(2)} stroke="#00B8D4" strokeWidth={2} />
          ))}
          <circle cx={cx + R} cy={cy} r={6} fill="#FC6818" />
        </g>
        <circle cx={cx} cy={cy} r={ra} fill="#A7B0C0" />
        <line x1={cx - ra} y1={cy} x2={cx - ra} y2={GROUND - 28 - lift} stroke="#FFA878" strokeWidth={2} />
        <LoadBox x={cx - ra} y={GROUND - lift} p={p} />
        <Robot x={cx + R + 26} y={GROUND} strain={strain} flip />
      </g>
    )
  }
  return (
    <svg viewBox="0 0 400 244" className="block h-auto w-full" role="img" aria-label={aria}>
      <style>{`@keyframes sm-shake{0%{transform:translateX(0)}50%{transform:translateX(1.5px)}100%{transform:translateX(0)}}`}</style>
      <rect x={0} y={GROUND} width={400} height={16} fill="#111C32" />
      {kind !== 'ramp' && (
        <g>
          <line x1={0} y1={shelfY} x2={400} y2={shelfY} stroke="#22C55E" strokeDasharray="4 4" strokeWidth={1} />
          <text x={396} y={shelfY - 4} textAnchor="end" fontSize={10} fill="#22C55E">
            target height {p.height} m
          </text>
        </g>
      )}
      {body}
      <text x={6} y={GROUND + 13} fontSize={10} fill="#6E7888">
        weight {forceTextShort(p)}
      </text>
    </svg>
  )
}

function forceTextShort(p: Params): string {
  return (p.units ?? 'newtons') === 'kg' ? `${p.load.mass} kg` : `${Math.round(p.load.mass * G)} N`
}
