'use client'

// components/kids/three/LookInsideClient.tsx
// "Look inside" controls for the Workshop (roadmap #36): an X-ray switch, the
// explode slider, the wire colour key, and every wire as a button (the same
// as tapping it in 3D, for keyboard, switch and screen-reader users). The
// signal readout says what travels along the chosen wire; Inventors and
// Engineers also get the voltage and current.

import { useId } from 'react'
import { WIRE_COLOR, WIRE_KIND_LABEL, wiringOf, type WireKind } from '@/lib/kids/robot-wiring'
import type { RobotDesign } from '@/lib/kids/robot-design'

interface Props {
  design: RobotDesign
  xray: boolean
  explode: number
  activeWire: string | null
  readout: string | null
  disabled?: boolean
  onXray: (on: boolean) => void
  onExplode: (k: number) => void
  onWire: (id: string) => void
}

const KINDS: WireKind[] = ['power', 'motor', 'sense', 'command']

export default function LookInsideClient({ design, xray, explode, activeWire, readout, disabled, onXray, onExplode, onWire }: Props) {
  const sliderId = useId()
  const wires = wiringOf(design)
  return (
    <section aria-labelledby="look-inside" className="mt-4 rounded-2xl bg-white/5 p-4" data-testid="look-inside">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="look-inside" className="mr-auto text-lg font-black">
          Look inside
        </h2>
        <button
          type="button"
          aria-pressed={xray}
          disabled={disabled}
          onClick={() => onXray(!xray)}
          data-testid="xray-toggle"
          className={`min-h-[48px] rounded-2xl px-4 font-black focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40 ${
            xray ? 'bg-cyan-400 text-[#0A1120]' : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          {xray ? '🩻 X-ray on' : '🩻 X-ray'}
        </button>
      </div>
      <label htmlFor={sliderId} className="mt-3 block text-sm font-black">
        Pull it apart <span className="font-bold text-slate-300">({Math.round(explode * 100)}%)</span>
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(explode * 100)}
        disabled={disabled}
        onChange={(e) => onExplode(Number(e.target.value) / 100)}
        aria-valuetext={explode === 0 ? 'Put together' : explode >= 1 ? 'Fully apart' : `${Math.round(explode * 100)} percent apart`}
        data-testid="explode-slider"
        className="mt-1 h-11 w-full cursor-pointer accent-amber-500 disabled:opacity-40"
      />
      {!xray ? (
        <p className="mt-2 text-sm text-slate-300">Turn on X-ray to see the battery, the brain, the motor driver, the motors and the wires that join them.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-200" aria-label="Wire colours">
            {KINDS.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-5 rounded-full" style={{ background: WIRE_COLOR[k] }} aria-hidden />
                {WIRE_KIND_LABEL[k]}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-black">Tap a wire on the robot, or pick one here:</p>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2" role="group" aria-label="Wires">
            {wires.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-pressed={activeWire === w.id}
                onClick={() => onWire(w.id)}
                data-testid={`wire-${w.id}`}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-left text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                  activeWire === w.id ? 'border-white/40 bg-white/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="inline-block h-2.5 w-5 shrink-0 rounded-full" style={{ background: WIRE_COLOR[w.kind] }} aria-hidden />
                {w.label}
              </button>
            ))}
          </div>
        </>
      )}
      <p role="status" aria-live="polite" data-testid="wire-readout" className={`mt-3 min-h-[1.5rem] rounded-xl text-sm font-bold ${readout ? 'bg-[#0A1120] p-3 text-cyan-100' : ''}`}>
        {readout ? `⚡ ${readout}` : ''}
      </p>
    </section>
  )
}
