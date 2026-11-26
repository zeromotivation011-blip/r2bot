'use client'

// components/kids/sim/SensorPanel.tsx
// What the robot "feels", live: distance number + bar, the five line-sensor
// lights, floor colour, bumper, a heading dial, the timer, and a wheel-vs-ground
// speed meter that lights up when the wheels slip. Sensors the robot does not
// have are shown switched off with the part it would need.

import type { Capability } from '@/lib/kids/robot-design'
import { CAPABILITY_NEEDS } from '@/lib/kids/robot-design'
import type { FloorColor } from '@/lib/kids/sim/arena'
import type { WorkbenchLiveState } from './SimWorkbenchClient'

const SWATCH: Record<FloorColor, string> = {
  white: 'bg-slate-100',
  black: 'bg-slate-900',
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
}

function Card({ title, off, need, children }: { title: string; off?: boolean; need?: Capability; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${off ? 'opacity-50' : ''}`}>
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-300">{title}</p>
      {off && need ? <p className="mt-1 text-xs font-bold text-slate-200">🔒 needs {CAPABILITY_NEEDS[need]}</p> : children}
    </div>
  )
}

export default function SensorPanel({ live, caps }: { live: WorkbenchLiveState; caps: Set<Capability> }) {
  const s = live.sensors
  const snap = live.snap
  const wheel = snap ? (Math.abs(snap.wheelSpeed[0]) + Math.abs(snap.wheelSpeed[1])) / 2 : 0
  const ground = snap?.groundSpeed ?? 0
  const slipping = wheel > 0.05 && ground < wheel * 0.5
  // Always 0–359, the compass a child is taught (never "-90°").
  const heading = ((Math.round(s?.headingDeg ?? 0) % 360) + 360) % 360
  const distOk = caps.has('see-wall')
  const dist = s?.distanceCm ?? 200
  const near = dist < 20

  return (
    <div role="group" aria-label="Robot sensors" className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="sensor-panel">
      <Card title="👀 Distance" off={!distOk} need="see-wall">
        <p className={`text-2xl font-black tabular-nums ${near ? 'text-rose-300' : 'text-emerald-300'}`} data-testid="sensor-distance">
          {dist >= 200 ? '200+' : dist.toFixed(0)} <span className="text-sm">cm</span>
        </p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full ${near ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max(2, 100 - Math.min(100, dist / 2))}%` }} />
        </div>
      </Card>

      <Card title="〰️ Line sensor" off={!caps.has('follow-line')} need="follow-line">
        <div className="mt-1 flex gap-1.5" aria-label={`Line sensor: ${s?.lineSeen ? 'sees the line' : 'no line'}`}>
          {(s?.lineSamples ?? [false, false, false, false, false]).map((on, i) => (
            <span key={i} className={`h-4 w-4 rounded-full border border-white/30 ${on ? 'bg-amber-300 shadow-[0_0_8px_#fcd34d]' : 'bg-white/10'}`} />
          ))}
        </div>
        <p className="mt-1 text-xs font-bold tabular-nums text-slate-200">offset {(s?.lineOffset ?? 0).toFixed(2)}</p>
      </Card>

      <Card title="🎨 Floor colour" off={!caps.has('see-color')} need="see-color">
        <p className="mt-1 flex items-center gap-2 text-sm font-black text-white">
          <span className={`inline-block h-5 w-5 rounded-md border border-white/40 ${SWATCH[s?.floorColor ?? 'white']}`} />
          {s?.floorColor ?? 'white'}
        </p>
      </Card>

      <Card title="🧭 Heading (gyro)">
        <div className="flex items-center gap-2">
          <svg viewBox="-20 -20 40 40" className="h-11 w-11" aria-hidden>
            <circle r="18" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
            <text y="-11" textAnchor="middle" fontSize="7" fill="#A7B0C0" fontWeight="900">
              0
            </text>
            <line x1="0" y1="0" x2="0" y2="-14" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" transform={`rotate(${heading})`} />
            <circle r="2.5" fill="#fbbf24" />
          </svg>
          <span className="text-lg font-black tabular-nums text-white">{heading.toFixed(0)}°</span>
        </div>
      </Card>

      <Card title="🛡️ Bumper" off={!caps.has('feel-bump')} need="feel-bump">
        <p className={`mt-1 text-sm font-black ${s?.bumped ? 'text-rose-300' : 'text-slate-200'}`}>{s?.bumped ? 'Pressed!' : 'Not pressed'}</p>
      </Card>

      <Card title="⚙️ Wheels vs ground">
        <p className="text-xs font-bold tabular-nums text-slate-200">
          wheels {(wheel * 100).toFixed(0)} cm/s · robot {(ground * 100).toFixed(0)} cm/s
        </p>
        <p className={`mt-1 text-sm font-black ${slipping ? 'text-rose-300' : 'text-emerald-300'}`} data-testid="sensor-slip">
          {slipping ? '🌀 Slipping!' : wheel > 0.01 ? 'Gripping' : 'Stopped'}
        </p>
        <p className="text-[11px] tabular-nums text-slate-300">⏱ {(s?.timerS ?? 0).toFixed(1)} s</p>
      </Card>
    </div>
  )
}
