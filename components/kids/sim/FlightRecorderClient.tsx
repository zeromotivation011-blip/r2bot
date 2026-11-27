'use client'

// components/kids/sim/FlightRecorderClient.tsx
// The Flight Recorder panel (roadmap #38): a scrub timeline over the recorded
// run, replay controls, the "Why did it fail?" marker, the ghost of the best
// run, and four graphs (speed vs ground with slip shaded, motor %, what the
// robot sensed, battery). Presentational: the workbench owns the recording and
// the replay clock and passes them in. No three.js here.

import { useId, useMemo, useState } from 'react'
import type { SimEvent } from '@/lib/kids/sim/engine'
import { buildGraphs, frameIndexAt, slipSpeed, timelineMarkers, whyFailed, type FlightFrame, type GraphData, type GraphId, type Ghost, type SensorParts, type TimelineMarker, type WhyInput } from '@/lib/kids/sim/recorder'

export interface GhostNews {
  kind: 'new-best' | 'first' | 'behind' | 'none'
  /** Seconds faster (new-best) or slower (behind) than the old ghost. */
  delta?: number
}

interface Props {
  frames: FlightFrame[]
  events: SimEvent[]
  /** The run's result (a course challenge maps its failure onto the nearest lab reason). */
  result: WhyInput | null
  parts: SensorParts
  /** Replay cursor, robot seconds. */
  t: number
  onSeek: (t: number) => void
  /** Is the replay clock playing? */
  replaying: boolean
  onReplay: () => void
  /** The robot is driving right now (live recording: no scrubbing). */
  live: boolean
  ghost: Ghost | null
  ghostOn: boolean
  onGhostToggle: () => void
  ghostNews: GhostNews | null
  /** Is the battery real in this arena (it can run flat)? */
  batteryCoupled: boolean
  /** "1 s here = N s of battery". */
  drainScale: number
  /** Bring the 3D view on screen (the timeline and the robot live there). */
  onShowView?: () => void
}

const GRAPH_TABS: { id: GraphId; label: string; icon: string }[] = [
  { id: 'speed', label: 'Speed & slip', icon: '🛞' },
  { id: 'motors', label: 'Motors', icon: '⚙️' },
  { id: 'sensors', label: 'Sensors', icon: '👀' },
  { id: 'battery', label: 'Battery', icon: '🔋' },
]

const MARKER_ICON: Record<TimelineMarker['kind'], string> = {
  crash: '💥',
  slip: '🌀',
  flat: '🪫',
  low: '🔋',
  'lost-line': '〰️',
  stopped: '✋',
  grab: '🤏',
  drop: '📦',
  touch: '👆',
  charge: '⚡',
  goal: '⭐',
  visit: '🚩',
  end: '📍',
}

const W = 600
const H = 160

function Chart({ g, t, duration, markers, why }: { g: GraphData; t: number; duration: number; markers: TimelineMarker[]; why: TimelineMarker | null }) {
  const span = Math.max(0.5, duration)
  const x = (tt: number) => (tt / span) * W
  const y = (v: number) => H - ((Math.max(g.min, Math.min(g.max, v)) - g.min) / (g.max - g.min || 1)) * H
  const path = (pts: [number, number][]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')
  const zeroY = g.min < 0 ? y(0) : null
  return (
    <div className="relative">
      <div className="flex justify-between text-xs font-bold text-slate-400" aria-hidden>
        <span>
          {g.max}
          {g.unit ? ` ${g.unit}` : ''}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full overflow-visible rounded-xl bg-[#0A1120] sm:h-44" role="img" aria-label={`${g.title}. ${g.explain}`}>
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1={0} x2={W} y1={H * k} y2={H * k} stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {zeroY !== null && <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {g.bands?.map((b) => {
          const top = b.points.map((p) => `${x(p[0]).toFixed(1)},${y(p[2]).toFixed(1)}`)
          const bottom = b.points
            .slice()
            .reverse()
            .map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`)
          return <polygon key={b.label} points={[...top, ...bottom].join(' ')} fill={b.color} />
        })}
        {markers.map((m, i) => (
          <line key={`${m.kind}-${i}`} x1={x(m.t)} x2={x(m.t)} y1={0} y2={H} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {why && <line x1={x(why.t)} x2={x(why.t)} y1={0} y2={H} stroke="#F87171" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        {g.series.map((s) => (
          <path key={s.id} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? '6 5' : undefined} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ))}
        <line x1={x(t)} x2={x(t)} y1={0} y2={H} stroke="#FFA878" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-xs font-bold text-slate-400" aria-hidden>
        <span>
          {g.min}
          {g.unit ? ` ${g.unit}` : ''} · 0 s
        </span>
        <span>{span.toFixed(1)} s</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-200">
        {g.series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-5 rounded" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
        {g.bands?.map((b) => (
          <li key={b.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded" style={{ background: b.color }} aria-hidden />
            {b.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function fmt(v: number | null, digits = 0): string {
  return v === null ? '—' : v.toFixed(digits)
}

/** The scrub timeline and replay buttons. Lives right under the 3D view so the robot stays on screen while you scrub. */
export function RecorderTimelineClient({
  frames,
  events,
  result,
  t,
  onSeek,
  replaying,
  onReplay,
  live,
  showMoments = true,
}: Pick<Props, 'frames' | 'events' | 'result' | 't' | 'onSeek' | 'replaying' | 'onReplay' | 'live'> & { showMoments?: boolean }) {
  const sliderId = useId()
  const duration = frames.length > 0 ? frames[frames.length - 1].t : 0
  const markers = useMemo(() => timelineMarkers(events), [events])
  const why = useMemo(() => (live ? null : whyFailed(frames, events, result)), [frames, events, result, live])
  const canScrub = !live && frames.length > 1
  return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3" data-testid="recorder-timeline">
        <label htmlFor={sliderId} className="text-xs font-black uppercase tracking-wider text-slate-300">
          {live ? 'Recording…' : 'Scrub the timeline'} · {t.toFixed(1)} s of {duration.toFixed(1)} s
        </label>
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-x-[10px] -top-1 h-3" aria-hidden>
            {markers.map((m, i) => (
              <span key={`${m.kind}-${i}`} className="absolute -translate-x-1/2 text-[10px] leading-none" style={{ left: `${(m.t / Math.max(0.5, duration)) * 100}%` }}>
                {MARKER_ICON[m.kind]}
              </span>
            ))}
            {why && <span className="absolute h-3 w-1 -translate-x-1/2 rounded bg-rose-400" style={{ left: `${(why.t / Math.max(0.5, duration)) * 100}%` }} />}
          </div>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={Math.max(0.05, duration)}
            step={0.05}
            value={Math.min(t, duration)}
            disabled={!canScrub}
            onChange={(e) => onSeek(Number(e.target.value))}
            data-testid="recorder-scrub"
            aria-valuetext={`${t.toFixed(1)} seconds`}
            className="mt-3 h-11 w-full cursor-pointer accent-amber-400 disabled:cursor-default disabled:opacity-50"
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2" role="group" aria-label="Replay">
          <button
            type="button"
            onClick={onReplay}
            disabled={!canScrub}
            data-testid="recorder-replay"
            className="min-h-[44px] rounded-2xl bg-amber-400 px-4 text-sm font-black text-[#1A1103] hover:bg-amber-300 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            {replaying ? '⏸ Pause replay' : '⏵ Replay'}
          </button>
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, t - 0.5))}
            disabled={!canScrub}
            aria-label="Back half a second"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/10 px-3 text-sm font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            −½ s
          </button>
          <button
            type="button"
            onClick={() => onSeek(Math.min(duration, t + 0.5))}
            disabled={!canScrub}
            aria-label="Forward half a second"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/10 px-3 text-sm font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            +½ s
          </button>
          {showMoments && markers.length > 0 && !live && (
            <div className="flex flex-wrap gap-1" aria-label="Moments">
              {markers.slice(0, 8).map((m, i) => (
                <button
                  key={`${m.kind}-${i}`}
                  type="button"
                  onClick={() => onSeek(m.t)}
                  className="min-h-[44px] rounded-xl border border-white/15 px-2 text-xs font-black text-slate-200 hover:bg-white/10"
                >
                  <span aria-hidden>{MARKER_ICON[m.kind]}</span> {m.label} {m.t.toFixed(1)} s
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
  )
}

export default function FlightRecorderClient(props: Props) {
  const { frames, events, result, parts, t, onSeek, live, ghost, ghostOn, onGhostToggle, ghostNews, batteryCoupled, drainScale, onShowView } = props
  const [tab, setTab] = useState<GraphId>('speed')
  const duration = frames.length > 0 ? frames[frames.length - 1].t : 0
  const graphs = useMemo(() => buildGraphs(frames, parts), [frames, parts])
  const markers = useMemo(() => timelineMarkers(events), [events])
  const why = useMemo(() => (live ? null : whyFailed(frames, events, result)), [frames, events, result, live])
  const g = graphs.find((x) => x.id === tab) ?? graphs[0]
  const f = frames.length > 0 ? frames[Math.max(0, frameIndexAt(frames, t))] : null

  if (frames.length === 0) {
    return (
      <section aria-label="Flight Recorder" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
        <h2 className="font-display text-lg font-black text-white">🎞️ Flight Recorder</h2>
        <p className="mt-1 text-sm text-slate-300">Press ▶ Run. Every run is recorded here, so you can rewind it, see graphs of what your robot did, and race a ghost of your best run.</p>
      </section>
    )
  }

  const jump = (m: TimelineMarker, graph?: GraphId) => {
    onSeek(m.t)
    if (graph) setTab(graph)
    onShowView?.()
  }

  return (
    <section aria-label="Flight Recorder" data-testid="flight-recorder" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-display text-lg font-black text-white">🎞️ Flight Recorder</h2>
        {ghost && (
          <button
            type="button"
            onClick={onGhostToggle}
            aria-pressed={ghostOn}
            data-testid="ghost-toggle"
            className={`min-h-[44px] rounded-2xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
              ghostOn ? 'bg-cyan-400 text-[#06222A]' : 'border border-white/20 text-slate-200 hover:bg-white/10'
            }`}
          >
            👻 Ghost {ghost.time.toFixed(1)} s {ghostOn ? 'on' : 'off'}
          </button>
        )}
      </div>

      {ghostNews && ghostNews.kind !== 'none' && !live && (
        <p className="mt-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-100" role="status" data-testid="ghost-news">
          {ghostNews.kind === 'first' && '👻 Your first finish is now your ghost. Run again and race it!'}
          {ghostNews.kind === 'new-best' && `🏁 New personal best — ${ghostNews.delta?.toFixed(2)} s faster than your ghost. The ghost now drives your new run.`}
          {ghostNews.kind === 'behind' && `👻 Your ghost was ${ghostNews.delta?.toFixed(2)} s faster. Can you beat yourself?`}
        </p>
      )}

      {why && (
        <div className="mt-3 rounded-2xl border-2 border-rose-300/60 bg-rose-400/10 p-3" data-cue="no" data-testid="why-failed">
          <p className="text-sm font-black text-rose-100">
            🔎 Why did it fail? <span className="font-bold text-rose-200">At {why.t.toFixed(1)} s: {why.label}</span>
          </p>
          <p className="mt-1 text-sm text-slate-100">{why.detail}</p>
          <button
            type="button"
            onClick={() => jump(why, why.graph)}
            data-testid="why-jump"
            className="mt-2 min-h-[44px] rounded-xl bg-rose-300 px-3 text-sm font-black text-[#3B0A14] hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            ⏩ Show me that moment
          </button>
        </div>
      )}

      {/* Readout at the cursor */}
      {f && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" data-testid="recorder-readout" aria-live="off">
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs font-bold text-slate-300">Wheels / ground</dt>
            <dd className="font-display font-black text-white">
              {Math.round(Math.abs((f.drive.wheelSpeed[0] + f.drive.wheelSpeed[1]) / 2) * 100)} / {Math.round(Math.abs((f.drive.groundSpeed[0] + f.drive.groundSpeed[1]) / 2) * 100)} cm/s
              {slipSpeed(f) > 0.03 && <span className="ml-1 text-rose-300">slip!</span>}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs font-bold text-slate-300">Motors L / R</dt>
            <dd className="font-display font-black text-white">
              {Math.round(f.drive.motorPct[0])} % / {Math.round(f.drive.motorPct[1])} %
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs font-bold text-slate-300">{parts.distance ? 'Distance' : parts.line ? 'Line offset' : 'Heading'}</dt>
            <dd className="font-display font-black text-white">
              {parts.distance ? `${fmt(f.distanceCm)} cm` : parts.line ? fmt(f.lineOffset, 2) : `${Math.round(f.headingDeg)}°`}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs font-bold text-slate-300">Battery</dt>
            <dd className="font-display font-black text-white">
              {(f.battery.soc * 100).toFixed(batteryCoupled ? 0 : 1)} % · {f.battery.volts.toFixed(2)} V · {Math.abs(f.battery.amps).toFixed(2)} A
            </dd>
          </div>
        </dl>
      )}

      {/* Graphs */}
      <div className="mt-4">
        <div role="tablist" aria-label="Graphs" className="flex gap-1 overflow-x-auto pb-1">
          {GRAPH_TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              data-testid={`graph-${x.id}`}
              className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                tab === x.id ? 'bg-amber-400 text-[#1A1103]' : 'bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              <span aria-hidden>{x.icon}</span> {x.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={g.title} className="mt-2">
          <p className="text-sm font-black text-white">{g.title}</p>
          <p className="mb-2 text-sm text-slate-300">{g.explain}</p>
          <Chart g={g} t={t} duration={duration} markers={markers} why={why} />
          {g.id === 'battery' && (
            <p className="mt-2 text-xs text-slate-300">
              {batteryCoupled
                ? `Battery clock: 1 s here drains ${drainScale >= 60 ? `${Math.round(drainScale / 60)} min` : `${drainScale} s`} of real driving, so a whole charge fits in one run.`
                : 'This arena has a full battery, so it barely moves in one short run. Try the Power Lab to see a robot run flat.'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
