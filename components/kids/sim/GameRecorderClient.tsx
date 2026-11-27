'use client'

// components/kids/sim/GameRecorderClient.tsx
// The Flight Recorder panel for a Universe game's own sim (roadmap #38): one
// small graph per recorded channel, a scrubber across the round and a marker
// for every moment the game flagged ("Pushed out!", "Gust"). The game shell
// shows it on the results card. Presentational and SVG only (no three.js, no
// animation, so it needs nothing from the motion settings); the numbers come
// from lib/kids/sim/game-recorder.ts.

import { useId, useMemo, useState } from 'react'
import { channelSeries, fmtValue, gameFrameAt, type GameRecording } from '@/lib/kids/sim/game-recorder'

const W = 600
const H = 70
/** Brand-safe line colours on navy: amber, cyan, emerald, rose, sky, lime (no purple). */
const COLOURS = ['#FBBF24', '#22D3EE', '#34D399', '#FB7185', '#38BDF8', '#A3E635']
const TEXT = ['text-amber-400', 'text-cyan-400', 'text-emerald-400', 'text-rose-400', 'text-sky-400', 'text-lime-400']

export default function GameRecorderClient({ rec }: { rec: GameRecording }) {
  const series = useMemo(() => channelSeries(rec), [rec])
  const t0 = rec.frames[0]?.t ?? 0
  const t1 = rec.frames[rec.frames.length - 1]?.t ?? 1
  const span = Math.max(0.001, t1 - t0)
  const [t, setT] = useState(t1)
  const frame = gameFrameAt(rec.frames, t)
  const sliderId = useId()
  const x = (tt: number) => ((tt - t0) / span) * W

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#0A1120]/60 p-3 text-left" aria-label="Flight Recorder">
      <h3 className="text-sm font-black text-white">📼 Flight Recorder</h3>
      <p className="text-xs text-slate-300">Drag along the round to see what your robot measured at each moment.</p>

      <div className="mt-2 space-y-2">
        {series.map((s, i) => {
          const y = (v: number) => H - 4 - ((v - s.min) / (s.max - s.min || 1)) * (H - 8)
          const d = s.points.map((p, j) => `${j === 0 ? 'M' : 'L'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')
          const now = frame?.v[i]
          return (
            <div key={s.name}>
              <div className="flex justify-between text-xs font-bold">
                <span className={TEXT[i % TEXT.length]}>{s.name}</span>
                <span className="tabular-nums text-white" data-testid={`rec-value-${i}`}>
                  {now === undefined ? '—' : s.onOff ? (now === 1 ? 'yes' : now === 0 ? 'no' : '—') : fmtValue(now)}
                </span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-14 w-full rounded-lg bg-white/[0.03]" aria-hidden>
                {rec.moments.map((m, k) => (
                  <line key={k} x1={x(m.t)} x2={x(m.t)} y1={0} y2={H} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
                ))}
                <path d={d} fill="none" stroke={COLOURS[i % COLOURS.length]} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                <line x1={x(t)} x2={x(t)} y1={0} y2={H} stroke="#FFFFFF" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          )
        })}
      </div>

      <label htmlFor={sliderId} className="mt-2 block text-xs font-bold text-slate-300">
        Time: <span className="tabular-nums text-white">{(t - t0).toFixed(1)} s</span>
      </label>
      <input
        id={sliderId}
        type="range"
        min={t0}
        max={t1}
        step={span / 400}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        className="h-11 w-full accent-amber-400"
        data-testid="rec-scrub"
      />

      {rec.moments.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2" aria-label="Moments">
          {rec.moments.slice(0, 12).map((m, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setT(Math.min(t1, Math.max(t0, m.t)))}
              className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {(m.t - t0).toFixed(1)} s · {m.text}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
