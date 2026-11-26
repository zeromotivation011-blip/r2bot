'use client'

// app/kids/lab/templates/signals/SignalsLabClient.tsx
// Picks a template + sample and mounts the template component the way the
// activity shell will: onSubmit runs the template's check(), onDone reports.

import { useState, type ComponentType } from 'react'
import type { Activity, CheckResult, TemplateDef, TemplateProps } from '@/lib/kids/activities/types'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { template as sensorChoice } from '@/components/kids/activities/templates/sensor-choice'
import { samples as sensorSamples } from '@/components/kids/activities/templates/sensor-choice/samples'
import { template as signalGraph } from '@/components/kids/activities/templates/signal-graph'
import { samples as graphSamples } from '@/components/kids/activities/templates/signal-graph/samples'
import { template as circuitSnap } from '@/components/kids/activities/templates/circuit-snap'
import { samples as circuitSamples } from '@/components/kids/activities/templates/circuit-snap/samples'
import { template as ohmsLaw } from '@/components/kids/activities/templates/ohms-law'
import { samples as ohmSamples } from '@/components/kids/activities/templates/ohms-law/samples'
import { template as thresholdTuner } from '@/components/kids/activities/templates/threshold-tuner'
import { samples as thresholdSamples } from '@/components/kids/activities/templates/threshold-tuner/samples'
import { template as controlTuner } from '@/components/kids/activities/templates/control-tuner'
import { samples as controlSamples } from '@/components/kids/activities/templates/control-tuner/samples'

// Each entry erases its own Params/Answer types at this boundary only; within an
// entry the template and its samples share them, so the pairing stays type-safe.
interface Entry {
  def: TemplateDef<unknown, unknown>
  samples: Activity<unknown, unknown>[]
}
function entry<P, A>(def: TemplateDef<P, A>, samples: Activity<P, A>[]): Entry {
  return { def: def as unknown as TemplateDef<unknown, unknown>, samples: samples as unknown as Activity<unknown, unknown>[] }
}

const ENTRIES: Entry[] = [
  entry(sensorChoice, sensorSamples),
  entry(signalGraph, graphSamples),
  entry(circuitSnap, circuitSamples),
  entry(ohmsLaw, ohmSamples),
  entry(thresholdTuner, thresholdSamples),
  entry(controlTuner, controlSamples),
]

const tab =
  'inline-flex min-h-[44px] items-center rounded-2xl border px-3 font-display text-sm font-bold transition-transform duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function SignalsLabClient() {
  const [ti, setTi] = useState(0)
  const [si, setSi] = useState(0)
  const [run, setRun] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const e = ENTRIES[ti]
  const a = e.samples[Math.min(si, e.samples.length - 1)]
  const Comp = e.def.Component as ComponentType<TemplateProps<unknown, unknown>>
  const band = KIDS_BANDS.find((b) => b.id === a.band)

  const onSubmit = (answer: unknown): CheckResult => {
    const r = e.def.check(a.params, answer)
    setLog((l) => [`${a.id}: submit → ${r.correct ? 'correct' : 'not yet'} (score ${r.score ?? '—'})`, ...l].slice(0, 6))
    return r
  }
  const onDone = (r: { correct: boolean; attempts: number; score: number }) =>
    setLog((l) => [`${a.id}: done → correct=${r.correct}, attempts=${r.attempts}, score=${r.score}`, ...l].slice(0, 6))

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Template">
        {ENTRIES.map((x, i) => (
          <button
            key={x.def.id}
            type="button"
            role="tab"
            aria-selected={ti === i}
            onClick={() => {
              setTi(i)
              setSi(0)
              setRun((n) => n + 1)
            }}
            className={`${tab} ${ti === i ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8] hover:border-white/30'}`}
          >
            {x.def.name}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="Sample activity">
        {e.samples.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={si === i}
            onClick={() => {
              setSi(i)
              setRun((n) => n + 1)
            }}
            className={`${tab} ${si === i ? 'border-[#00E5FF] bg-[#00B8D4]/15 text-[#00E5FF]' : 'border-white/15 bg-[#111C32] text-[#A7B0C0] hover:border-white/30'}`}
          >
            {['Easy', 'Medium', 'Hard'][i] ?? `#${i + 1}`} · {KIDS_BANDS.find((b) => b.id === s.band)?.name}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[20px] border border-white/10 bg-[#111C32] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A7B0C0]">
          {band ? `${band.emoji} ${band.name} · ages ${band.ages}` : a.band} · difficulty {a.difficulty}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl">{a.title}</h2>
        <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{a.intro}</p>
      </div>

      <div className="mt-3">
        <Comp key={`${a.id}-${run}`} params={a.params} band={a.band} onSubmit={onSubmit} onDone={onDone} />
      </div>

      <div className="mt-3 rounded-[20px] border border-white/10 bg-[#111C32] p-4 text-[15px] text-[#A7B0C0]">
        <p>
          <span className="font-bold text-[#EEF2F8]">Takeaway:</span> {a.takeaway}
        </p>
        {a.realWorld && (
          <p className="mt-1">
            <span className="font-bold text-[#EEF2F8]">Real world:</span> {a.realWorld}
          </p>
        )}
        <button type="button" className="mt-2 min-h-[44px] font-semibold text-[#00E5FF] underline-offset-4 hover:underline" onClick={() => setRun((n) => n + 1)}>
          Restart this activity
        </button>
        {log.length > 0 && (
          <ul className="mt-2 space-y-0.5 font-mono text-xs" aria-label="Event log" data-testid="lab-log">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
