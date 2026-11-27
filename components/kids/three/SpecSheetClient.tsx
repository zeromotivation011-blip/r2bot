'use client'

// components/kids/three/SpecSheetClient.tsx
// The robot's spec sheet (roadmap #33): mass, runtime, top speed and reach,
// from lib/kids/robot-growth.ts specSheet() — the same drive numbers the
// simulator uses, plus the upgrades. Inventors and Engineers also see the
// electrics: battery voltage and energy, current, and where the power goes.

import { formatRuntime, specSheet } from '@/lib/kids/robot-growth'
import type { RobotDesign } from '@/lib/kids/robot-design'
import type { BandId } from '@/lib/kids/bands'

interface Props {
  design: RobotDesign
  band: BandId | null
}

function Tile({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3">
      <dt className="text-[11px] font-black uppercase tracking-wider text-[#A7B0C0]">{label}</dt>
      <dd className="mt-1">
        <span className="font-display text-2xl font-black tabular-nums text-white">{value}</span>
        {unit && <span className="ml-1 text-sm font-bold text-[#A7B0C0]">{unit}</span>}
        <span className="mt-1 block text-xs leading-snug text-slate-300">{note}</span>
      </dd>
    </div>
  )
}

export default function SpecSheetClient({ design, band }: Props) {
  const s = specSheet(design)
  const teen = band === 'inventors' || band === 'engineers'
  const speedCm = Math.round(s.topSpeed * 100)
  return (
    <section aria-labelledby="spec-sheet" className="mt-4 rounded-2xl bg-white/5 p-4" data-testid="spec-sheet">
      <h2 id="spec-sheet" className="text-lg font-black">
        {design.name}&rsquo;s spec sheet
      </h2>
      <p className="text-sm text-slate-300">Change a part and watch the numbers move. Every choice is a trade-off.</p>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <Tile label="Mass" value={s.massKg.toFixed(2)} unit="kg" note="Heavier robots need more energy to move." />
        <Tile label="Runtime" value={formatRuntime(s.runtimeMin)} note={s.solarW ? 'Driving the whole time, in sunshine.' : 'Driving the whole time on one charge.'} />
        <Tile
          label="Top speed"
          value={speedCm >= 100 ? s.topSpeed.toFixed(1) : String(speedCm)}
          unit={speedCm >= 100 ? 'm/s' : 'cm/s'}
          note="Gearing trades speed for strength."
        />
        <Tile label="Reach" value={s.reachCm ? String(s.reachCm) : '—'} unit={s.reachCm ? 'cm' : undefined} note={s.reachCm ? 'From the middle of the robot to its tool.' : 'Fit a claw, a scoop or an arm to reach.'} />
      </dl>
      {teen && (
        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3 text-sm" data-testid="spec-electrics">
          <p className="font-black text-cyan-200">Electrics</p>
          <p className="mt-1 tabular-nums text-slate-200">
            Battery {s.volts} V · {s.wattHours} Wh · average draw {s.watts} W = {s.amps} A ({s.motors} motors)
            {s.solarW ? ` · solar +${s.solarW} W` : ''}
          </p>
          <table className="mt-2 w-full text-left text-xs tabular-nums">
            <caption className="sr-only">Where the power goes</caption>
            <thead>
              <tr className="text-[#A7B0C0]">
                <th scope="col" className="py-1 font-bold">Part</th>
                <th scope="col" className="py-1 text-right font-bold">W</th>
                <th scope="col" className="py-1 text-right font-bold">A</th>
              </tr>
            </thead>
            <tbody>
              {s.breakdown.map((l) => (
                <tr key={l.part} className="border-t border-white/10">
                  <td className="py-1">{l.part}</td>
                  <td className="py-1 text-right">{l.watts.toFixed(2)}</td>
                  <td className="py-1 text-right">{l.amps.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-300">Current = power ÷ voltage (I = P / V). Runtime uses 85% of the battery: real batteries are never run completely flat.</p>
        </div>
      )}
    </section>
  )
}
