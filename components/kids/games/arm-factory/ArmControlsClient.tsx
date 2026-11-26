'use client'

// components/kids/games/arm-factory/ArmControlsClient.tsx
// The control panels for each tier: joint jogging (Cadet/Pilot), the teach
// pendant (Pilot), the waypoint planner (Ace) and the program editor (Legend).
// Pure UI: every action calls back into ArmFactoryClient, which owns the sim.

import { useEffect, useRef, type ReactNode } from 'react'
import { DEG, GRIP_MAX_FORCE, JOINT_NAMES, LIMITS, SHOULDER_MAX_TORQUE, type IkSolution, type Joints, type V3 } from './kinematics'
import { COLOR_SYMBOL, POSE_LABEL, type PartColor, type PlanStep, type PoseId, type ProgStep, type When } from './sim'

const JOINT_HELP = ['turns the whole arm', 'lifts the upper arm', 'bends the forearm']
const JOINT_KEYS = [
  ['Q', 'A'],
  ['W', 'S'],
  ['E', 'D'],
]

export const COLOR_TEXT: Record<PartColor, string> = { red: 'text-red-400', blue: 'text-blue-400', yellow: 'text-yellow-300' }

export function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-slate-900/70 p-3 ${className}`}>
      <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">{title}</h3>
      {children}
    </section>
  )
}

function HoldButton({ label, onStep, children, disabled }: { label: string; onStep: () => void; children: ReactNode; disabled?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    if (repeat.current) clearInterval(repeat.current)
    timer.current = null
    repeat.current = null
  }
  useEffect(() => stop, [])
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onStep}
      onPointerDown={() => {
        stop()
        timer.current = setTimeout(() => {
          repeat.current = setInterval(onStep, 70)
        }, 320)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl font-black text-white active:bg-amber-400 active:text-slate-900 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function JointJog({
  targets,
  actual,
  onSet,
  disabled,
}: {
  targets: Joints
  actual: Joints
  onSet: (i: number, rad: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => {
        const deg = Math.round(targets[i] / DEG)
        const act = Math.round(actual[i] / DEG)
        const lo = Math.round(LIMITS[i][0] / DEG)
        const hi = Math.round(LIMITS[i][1] / DEG)
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between text-sm">
              <label htmlFor={`joint-${i}`} className="font-black text-white">
                {JOINT_NAMES[i]} <span className="font-semibold text-white/50">· {JOINT_HELP[i]}</span>
              </label>
              <span className="font-mono font-black tabular-nums text-cyan-300">
                {act}°{act !== deg && <span className="text-white/40"> → {deg}°</span>}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <HoldButton label={`${JOINT_NAMES[i]} down`} disabled={disabled} onStep={() => onSet(i, (deg - 3) * DEG)}>
                −
              </HoldButton>
              <input
                id={`joint-${i}`}
                type="range"
                min={lo}
                max={hi}
                step={1}
                value={deg}
                disabled={disabled}
                aria-describedby={`joint-keys-${i}`}
                onChange={(e) => onSet(i, Number(e.target.value) * DEG)}
                className="h-11 min-w-0 flex-1 cursor-pointer accent-amber-400"
              />
              <HoldButton label={`${JOINT_NAMES[i]} up`} disabled={disabled} onStep={() => onSet(i, (deg + 3) * DEG)}>
                +
              </HoldButton>
            </div>
            <p id={`joint-keys-${i}`} className="sr-only">
              Keyboard: {JOINT_KEYS[i][0]} and {JOINT_KEYS[i][1]}. Limits {lo}° to {hi}°.
            </p>
          </div>
        )
      })}
      <p className="hidden text-xs text-white/45 sm:block">Keys: Q/A base · W/S shoulder · E/D elbow · Space = gripper</p>
    </div>
  )
}

export function GripButton({ closed, onToggle, disabled }: { closed: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`min-h-[52px] w-full rounded-2xl text-lg font-black shadow-lg transition-colors disabled:opacity-40 ${
        closed ? 'bg-cyan-400 text-slate-900 hover:bg-cyan-300' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'
      }`}
    >
      {closed ? '✋ Open gripper (let go)' : '✊ Close gripper (grab)'}
    </button>
  )
}

export function Pendant({
  slots,
  onSave,
  onGo,
  onHome,
}: {
  slots: (Joints | null)[]
  onSave: (i: number) => void
  onGo: (i: number) => void
  onHome: () => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-white/70">
        Real factory arms are taught with a <b className="text-white">teach pendant</b>: drive the arm to a spot, save it, then jump back to it
        with one press. Save a pose low over the belt and one above each bin — then go home first if the arm needs to clear a bin wall.
      </p>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {slots.map((s, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
            <p className="text-xs font-black text-white/60">P{i + 1}</p>
            <p className="h-4 font-mono text-[10px] text-cyan-200/80">{s ? s.map((v) => Math.round(v / DEG)).join('/') : 'empty'}</p>
            <div className="mt-1 flex flex-col gap-1">
              <button type="button" onClick={() => onSave(i)} className="min-h-[44px] rounded-lg bg-white/10 text-sm font-black text-white hover:bg-white/20">
                Save
              </button>
              <button
                type="button"
                onClick={() => onGo(i)}
                disabled={!s}
                className="min-h-[44px] rounded-lg bg-amber-400 text-sm font-black text-slate-900 hover:bg-amber-300 disabled:bg-white/5 disabled:text-white/30"
              >
                Go {i + 1}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={onHome} className="mt-2 min-h-[44px] w-full rounded-xl border border-white/15 text-sm font-black text-white/80 hover:bg-white/10">
        ⌂ Go home (tuck the arm)
      </button>
      <p className="mt-1 hidden text-xs text-white/45 sm:block">Keys: 1–4 go · Shift+1–4 save</p>
    </div>
  )
}

// ── Ace: waypoint planner ───────────────────────────────────────────────────

export interface SolutionView {
  sol: IkSolution
  hit: string | null
}

function fmt(p: V3): string {
  return `${Math.round(p.x * 100)}, ${Math.round(p.y * 100)}, ${Math.round(-p.z * 100)}`
}

export function PlanEditor(props: {
  target: V3 | null
  height: number
  setHeight: (h: number) => void
  nudge: (dx: number, dz: number) => void
  reach: 'ok' | 'far' | 'near' | null
  solutions: SolutionView[]
  onAddMove: (elbow: 'up' | 'down') => void
  onAddGrip: () => void
  onAddRelease: () => void
  plan: PlanStep[]
  badSteps: Set<number>
  onRemove: (i: number) => void
  onMoveStep: (i: number, d: -1 | 1) => void
  onClear: () => void
  onRun: () => void
  onStop: () => void
  running: boolean
  pc: number
}) {
  const { target, solutions, plan } = props
  return (
    <div className="space-y-3">
      <Panel title="1 · Pick a target">
        <p className="text-sm text-white/75">
          {target ? (
            <>
              Hand target <span className="font-mono text-cyan-300">({fmt(target)}) cm</span>
            </>
          ) : (
            'Tap the floor, the belt, a part or a bin in the 3D view. The arm works out the joint angles itself (inverse kinematics).'
          )}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <label htmlFor="ace-height" className="shrink-0 text-sm font-black text-white">
            Hand height
          </label>
          <input
            id="ace-height"
            type="range"
            min={5}
            max={70}
            step={1}
            value={Math.round(props.height * 100)}
            onChange={(e) => props.setHeight(Number(e.target.value) / 100)}
            className="h-11 min-w-0 flex-1 accent-amber-400"
          />
          <span className="w-14 text-right font-mono font-black text-cyan-300">{Math.round(props.height * 100)} cm</span>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1.5" aria-label="Nudge the target">
          {(
            [
              ['← Left', -0.02, 0],
              ['Right →', 0.02, 0],
              ['↑ Back', 0, -0.02],
              ['↓ Front', 0, 0.02],
            ] as const
          ).map(([l, dx, dz]) => (
            <button
              key={l}
              type="button"
              disabled={!target}
              onClick={() => props.nudge(dx, dz)}
              className="min-h-[44px] rounded-lg bg-white/10 text-xs font-black text-white hover:bg-white/20 disabled:opacity-30"
            >
              {l}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="2 · Choose an elbow">
        {!target && <p className="text-sm text-white/50">No target yet.</p>}
        {target && props.reach !== 'ok' && (
          <p className="rounded-xl bg-red-500/15 p-2 text-sm font-bold text-red-200">
            {props.reach === 'far'
              ? 'Out of reach — that point is outside the amber reach ring. Move it closer or lower.'
              : 'Too close to the base: the arm cannot fold that tight.'}
          </p>
        )}
        {target && props.reach === 'ok' && (
          <div className="grid grid-cols-2 gap-2">
            {solutions.map((v) => {
              const legal = v.sol.violated.length === 0
              const ok = legal && !v.hit
              return (
                <div
                  key={v.sol.elbow}
                  className={`rounded-xl border p-2 ${ok ? (v.sol.elbow === 'up' ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-violet-400/60 bg-violet-400/10') : 'border-red-400/50 bg-red-500/10'}`}
                >
                  <p className="text-sm font-black text-white">Elbow {v.sol.elbow}</p>
                  <p className="font-mono text-xs text-white/70">
                    {v.sol.joints.map((a, i) => `${JOINT_NAMES[i][0]} ${Math.round(a / DEG)}°`).join(' · ')}
                  </p>
                  <p className={`mt-1 text-xs font-bold ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
                    {!legal
                      ? `✗ ${v.sol.violated.map((i) => JOINT_NAMES[i]).join(' & ')} past its limit`
                      : v.hit
                        ? `✗ would touch the ${v.hit}`
                        : '✓ legal pose'}
                  </p>
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => props.onAddMove(v.sol.elbow)}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg bg-amber-400 text-sm font-black text-slate-900 hover:bg-amber-300 disabled:bg-white/5 disabled:text-white/30"
                  >
                    + Add move
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={props.onAddGrip} className="min-h-[44px] rounded-lg bg-white/10 text-sm font-black text-white hover:bg-white/20">
            + ✊ Grip
          </button>
          <button type="button" onClick={props.onAddRelease} className="min-h-[44px] rounded-lg bg-white/10 text-sm font-black text-white hover:bg-white/20">
            + ✋ Release
          </button>
        </div>
      </Panel>

      <Panel title="3 · Your plan">
        {plan.length === 0 ? (
          <p className="text-sm text-white/50">Empty. A good plan: move to the part → grip → lift → … → over the bin → release.</p>
        ) : (
          <ol className="space-y-1">
            {plan.map((s, i) => (
              <li
                key={i}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${props.running && props.pc === i ? 'bg-amber-400/25' : 'bg-white/5'} ${props.badSteps.has(i) ? 'ring-1 ring-red-400' : ''}`}
              >
                <span className="w-5 font-black text-white/50">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-white">
                  {s.kind === 'move' ? `Move → ${s.label}` : s.kind === 'grip' ? '✊ Grip' : '✋ Release'}
                </span>
                {props.badSteps.has(i) && <span className="text-xs font-black text-red-300">hits!</span>}
                <button type="button" aria-label={`Move step ${i + 1} up`} onClick={() => props.onMoveStep(i, -1)} className="h-9 w-9 rounded-md text-white/60 hover:bg-white/10">
                  ↑
                </button>
                <button type="button" aria-label={`Move step ${i + 1} down`} onClick={() => props.onMoveStep(i, 1)} className="h-9 w-9 rounded-md text-white/60 hover:bg-white/10">
                  ↓
                </button>
                <button type="button" aria-label={`Delete step ${i + 1}`} onClick={() => props.onRemove(i)} className="h-9 w-9 rounded-md text-red-300 hover:bg-red-500/20">
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {props.running ? (
            <button type="button" onClick={props.onStop} className="col-span-2 min-h-[48px] rounded-xl bg-red-500 font-black text-white">
              ■ Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={props.onRun}
              disabled={!plan.length}
              className="col-span-2 min-h-[48px] rounded-xl bg-emerald-400 font-black text-slate-900 hover:bg-emerald-300 disabled:opacity-40"
            >
              ▶ Run plan
            </button>
          )}
          <button type="button" onClick={props.onClear} disabled={props.running} className="min-h-[48px] rounded-xl border border-white/15 font-black text-white/80 disabled:opacity-40">
            Clear
          </button>
        </div>
        <p className="mt-1.5 text-xs text-white/50">The line in the 3D view is the path your hand will really take. Red = it hits something.</p>
      </Panel>
    </div>
  )
}

// ── Legend: program editor ──────────────────────────────────────────────────

const SPEEDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const WHEN_LABEL: Record<When, string> = { always: 'every part', heavy: 'heavy only', light: 'light only' }
const KIND_LABEL: Record<ProgStep['kind'], string> = { wait: '⏳ Wait for part', move: '➜ Move to', grip: '✊ Grip', release: '✋ Release' }

export interface QueueItem {
  color: PartColor
  heavy: boolean
  state: 'done' | 'now' | 'next' | 'lost'
}

function Gauge({ label, value, peak, max, unit }: { label: string; value: number; peak: number; max: number; unit: string }) {
  const pct = Math.min(1, value / (max * 1.25))
  const peakPct = Math.min(1, peak / (max * 1.25))
  const limPct = 1 / 1.25
  const hot = value > max * 0.9
  return (
    <div>
      <div className="flex justify-between text-xs font-bold">
        <span className="text-white/80">{label}</span>
        <span className={`font-mono ${hot ? 'text-red-300' : 'text-cyan-200'}`}>
          {value.toFixed(1)} / {max.toFixed(1)} {unit}
        </span>
      </div>
      <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Number(value.toFixed(1))}>
        <div className={`h-full ${hot ? 'bg-red-400' : 'bg-cyan-400'}`} style={{ width: `${pct * 100}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: `${peakPct * 100}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-red-500" style={{ left: `${limPct * 100}%` }} />
      </div>
    </div>
  )
}

export function ProgramEditor(props: {
  program: ProgStep[]
  setProgram: (p: ProgStep[]) => void
  onRun: () => void
  onStop: () => void
  onStarter: () => void
  running: boolean
  pc: number
  timeScale: number
  setTimeScale: (n: number) => void
  torque: number
  grip: number
  peakTorque: number
  peakGrip: number
  runTime: number
  sorted: number
  total: number
  target3: number
  target2: number
  queue: QueueItem[]
  report: { ok: boolean; title: string; body: string } | null
}) {
  const { program, setProgram } = props
  const update = (i: number, s: ProgStep) => setProgram(program.map((p, k) => (k === i ? s : p)))
  const move = (i: number, d: -1 | 1) => {
    const k = i + d
    if (k < 0 || k >= program.length) return
    const next = [...program]
    ;[next[i], next[k]] = [next[k], next[i]]
    setProgram(next)
  }
  const sel = 'min-h-[40px] rounded-lg border border-white/15 bg-slate-800 px-1.5 text-sm font-bold text-white disabled:opacity-50'
  return (
    <div className="space-y-3">
      <Panel title="Live sensors">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] font-black uppercase text-white/50">Cycle time</p>
            <p className="font-mono text-xl font-black text-white">{props.runTime.toFixed(1)}s</p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] font-black uppercase text-white/50">Sorted</p>
            <p className="font-mono text-xl font-black text-white">
              {props.sorted}/{props.total}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] font-black uppercase text-white/50">Target ⭐⭐⭐</p>
            <p className="font-mono text-xl font-black text-amber-300">≤{props.target3}s</p>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          <Gauge label="Shoulder motor torque" value={props.torque} peak={props.peakTorque} max={SHOULDER_MAX_TORQUE} unit="N·m" />
          <Gauge label="Grip force needed" value={props.grip} peak={props.peakGrip} max={GRIP_MAX_FORCE} unit="N" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Parts on the belt, in order">
          {props.queue.map((q, i) => (
            <span
              key={i}
              title={`${q.color}${q.heavy ? ', heavy 1.6 kg' : ', light 0.4 kg'}`}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1 text-sm font-black ${COLOR_TEXT[q.color]} ${
                q.state === 'done' ? 'bg-emerald-500/20 opacity-60' : q.state === 'now' ? 'bg-amber-400/30 ring-2 ring-amber-300' : q.state === 'lost' ? 'bg-red-500/25 line-through' : 'bg-white/10'
              }`}
            >
              {COLOR_SYMBOL[q.color]}
              {q.heavy && <span className="ml-0.5 text-[10px] text-white">⚖</span>}
            </span>
          ))}
        </div>
      </Panel>

      {props.report && (
        <div className={`rounded-2xl border p-3 ${props.report.ok ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-red-400/50 bg-red-500/10'}`} role="status">
          <p className="font-black text-white">{props.report.title}</p>
          <p className="mt-1 text-sm text-white/80">{props.report.body}</p>
        </div>
      )}

      <Panel title="Your robot program (loops for every part)">
        <ol className="space-y-1.5">
          {program.map((s, i) => (
            <li key={i} className={`rounded-xl p-1.5 ${props.running && props.pc === i ? 'bg-amber-400/20 ring-1 ring-amber-300' : 'bg-white/5'}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-5 text-center text-sm font-black text-white/50">{i + 1}</span>
                <select
                  aria-label={`Step ${i + 1} action`}
                  className={sel}
                  value={s.kind}
                  disabled={props.running}
                  onChange={(e) => {
                    const kind = e.target.value as ProgStep['kind']
                    update(i, kind === 'move' ? { kind, pose: 'pick', speed: 100, when: s.when } : { kind, when: s.when })
                  }}
                >
                  {(Object.keys(KIND_LABEL) as ProgStep['kind'][]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                {s.kind === 'move' && (
                  <>
                    <select aria-label={`Step ${i + 1} pose`} className={sel} value={s.pose} disabled={props.running} onChange={(e) => update(i, { ...s, pose: e.target.value as PoseId })}>
                      {(Object.keys(POSE_LABEL) as PoseId[]).map((k) => (
                        <option key={k} value={k}>
                          {POSE_LABEL[k]}
                        </option>
                      ))}
                    </select>
                    <select aria-label={`Step ${i + 1} speed`} className={sel} value={s.speed} disabled={props.running} onChange={(e) => update(i, { ...s, speed: Number(e.target.value) })}>
                      {SPEEDS.map((v) => (
                        <option key={v} value={v}>
                          {v}%
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <select aria-label={`Step ${i + 1} condition`} className={sel} value={s.when} disabled={props.running} onChange={(e) => update(i, { ...s, when: e.target.value as When })}>
                  {(Object.keys(WHEN_LABEL) as When[]).map((k) => (
                    <option key={k} value={k}>
                      {WHEN_LABEL[k]}
                    </option>
                  ))}
                </select>
                <span className="ml-auto flex">
                  <button type="button" aria-label={`Move step ${i + 1} up`} disabled={props.running} onClick={() => move(i, -1)} className="h-10 w-9 rounded-md text-white/60 hover:bg-white/10">
                    ↑
                  </button>
                  <button type="button" aria-label={`Move step ${i + 1} down`} disabled={props.running} onClick={() => move(i, 1)} className="h-10 w-9 rounded-md text-white/60 hover:bg-white/10">
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete step ${i + 1}`}
                    disabled={props.running}
                    onClick={() => setProgram(program.filter((_, k) => k !== i))}
                    className="h-10 w-9 rounded-md text-red-300 hover:bg-red-500/20"
                  >
                    ✕
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={props.running || program.length >= 14}
            onClick={() => setProgram([...program, { kind: 'move', pose: 'pick', speed: 100, when: 'always' }])}
            className="min-h-[44px] flex-1 rounded-xl bg-white/10 px-3 text-sm font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            + Add step
          </button>
          <button type="button" disabled={props.running} onClick={props.onStarter} className="min-h-[44px] rounded-xl border border-white/15 px-3 text-sm font-black text-white/70 disabled:opacity-40">
            Starter program
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {props.running ? (
            <button type="button" onClick={props.onStop} className="min-h-[52px] flex-1 rounded-xl bg-red-500 text-lg font-black text-white">
              ■ Stop
            </button>
          ) : (
            <button type="button" onClick={props.onRun} disabled={!program.length} className="min-h-[52px] flex-1 rounded-xl bg-emerald-400 text-lg font-black text-slate-900 hover:bg-emerald-300 disabled:opacity-40">
              ▶ Run the shift
            </button>
          )}
          <div className="flex rounded-xl border border-white/15 p-1" role="radiogroup" aria-label="Simulation speed">
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={props.timeScale === n}
                onClick={() => props.setTimeScale(n)}
                className={`min-h-[40px] min-w-[40px] rounded-lg text-sm font-black ${props.timeScale === n ? 'bg-amber-400 text-slate-900' : 'text-white/70'}`}
              >
                {n}×
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-white/50">
          ⭐⭐⭐ ≤ {props.target3}s · ⭐⭐ ≤ {props.target2}s · ⭐ all 8 sorted. A dropped part or a motor overload stops the line.
        </p>
      </Panel>
    </div>
  )
}
