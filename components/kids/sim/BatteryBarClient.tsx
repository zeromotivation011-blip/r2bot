'use client'

// components/kids/sim/BatteryBarClient.tsx
// The live battery bar over the 3D view (roadmap #39): charge, voltage and
// current, with a clear word for low, charging and flat. Colour is never the
// only cue: each state has an icon and a word.

interface Props {
  soc: number
  volts: number
  amps: number
  flat: boolean
  charging: boolean
  /** A real battery that can run flat (an arena battery), or only metered. */
  coupled: boolean
}

export default function BatteryBarClient({ soc, volts, amps, flat, charging, coupled }: Props) {
  const pct = Math.max(0, Math.min(100, soc * 100))
  const low = pct < 20
  const state = flat ? 'Flat' : charging ? 'Charging' : low ? 'Low' : null
  const fill = flat ? 'bg-rose-400' : charging ? 'bg-cyan-400' : low ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div
      className="pointer-events-none flex items-center gap-2 rounded-xl bg-black/55 px-2.5 py-1.5 text-xs font-black text-white backdrop-blur"
      role="meter"
      aria-label="Battery"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${Math.round(pct)} percent${state ? `, ${state.toLowerCase()}` : ''}`}
      data-testid="battery-bar"
      data-cue={flat ? 'no' : low ? 'warn' : 'ok'}
    >
      <span aria-hidden>{flat ? '🪫' : charging ? '⚡' : '🔋'}</span>
      <span className="relative h-3 w-14 overflow-hidden rounded-sm border border-white/60" aria-hidden>
        <span className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="font-display tabular-nums">{coupled ? Math.round(pct) : pct.toFixed(1)}%</span>
      <span className="hidden font-display tabular-nums text-slate-300 sm:inline">
        {volts.toFixed(2)} V · {Math.abs(amps).toFixed(2)} A
      </span>
      {state && <span className={flat ? 'text-rose-300' : charging ? 'text-cyan-200' : 'text-amber-200'}>{state}</span>}
    </div>
  )
}
