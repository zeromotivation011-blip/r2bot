'use client'

// Test bench: renders every sample of the six logic & code templates against
// the template's own check(), with an event log of submissions.

import { useMemo, useState } from 'react'
import type { Activity, CheckResult, TemplateDef } from '@/lib/kids/activities/types'
import { template as sequencePath } from '@/components/kids/activities/templates/sequence-path'
import { samples as sequencePathSamples } from '@/components/kids/activities/templates/sequence-path/samples'
import { template as debugProgram } from '@/components/kids/activities/templates/debug-program'
import { samples as debugProgramSamples } from '@/components/kids/activities/templates/debug-program/samples'
import { template as predictOutput } from '@/components/kids/activities/templates/predict-output'
import { samples as predictOutputSamples } from '@/components/kids/activities/templates/predict-output/samples'
import { template as flowchartBuilder } from '@/components/kids/activities/templates/flowchart-builder'
import { samples as flowchartBuilderSamples } from '@/components/kids/activities/templates/flowchart-builder/samples'
import { template as logicGates } from '@/components/kids/activities/templates/logic-gates'
import { samples as logicGatesSamples } from '@/components/kids/activities/templates/logic-gates/samples'
import { template as binaryEncoder } from '@/components/kids/activities/templates/binary-encoder'
import { samples as binaryEncoderSamples } from '@/components/kids/activities/templates/binary-encoder/samples'

interface Entry {
  // The bench is generic over every template; each pair below is typed where it is built.
  template: TemplateDef<never, never>
  samples: Activity<unknown, unknown>[]
}

function entry<P, A>(template: TemplateDef<P, A>, samples: Activity<P, A>[]): Entry {
  return { template: template as unknown as TemplateDef<never, never>, samples: samples as unknown as Activity<unknown, unknown>[] }
}

const ENTRIES: Entry[] = [
  entry(sequencePath, sequencePathSamples),
  entry(debugProgram, debugProgramSamples),
  entry(predictOutput, predictOutputSamples),
  entry(flowchartBuilder, flowchartBuilderSamples),
  entry(logicGates, logicGatesSamples),
  entry(binaryEncoder, binaryEncoderSamples),
]

export default function LogicLabClient() {
  const [ti, setTi] = useState(0)
  const [si, setSi] = useState(0)
  const [run, setRun] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const e = ENTRIES[ti]
  const a = e.samples[Math.min(si, e.samples.length - 1)]
  const t = e.template as unknown as TemplateDef<unknown, unknown>
  const problems = useMemo(() => t.validate(a.params), [t, a])
  const Component = t.Component

  const onSubmit = (answer: unknown): CheckResult => {
    const r = t.check(a.params, answer)
    setLog((l) => [`submit → ${r.correct ? 'CORRECT' : 'wrong'} (score ${(r.score ?? 0).toFixed(2)}): ${r.feedback}`, ...l].slice(0, 20))
    return r
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Templates">
        {ENTRIES.map((en, i) => (
          <button
            key={en.template.id}
            type="button"
            role="tab"
            aria-selected={ti === i}
            data-template={en.template.id}
            onClick={() => { setTi(i); setSi(0); setRun((r) => r + 1); setLog([]) }}
            className={`min-h-11 rounded-xl px-3 font-display text-[15px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${ti === i ? 'bg-amber-500 text-[#1A1103]' : 'bg-[#19263F] text-[#A7B0C0]'}`}
          >
            {en.template.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Samples">
        {e.samples.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={si === i}
            data-sample={s.id}
            onClick={() => { setSi(i); setRun((r) => r + 1); setLog([]) }}
            className={`min-h-11 rounded-xl px-3 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${si === i ? 'bg-[#00B8D4] text-[#04151A]' : 'bg-[#19263F] text-[#A7B0C0]'}`}
          >
            {s.title} · {s.band}
          </button>
        ))}
      </div>
      <section className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4">
        <h2 className="font-display text-[22px] font-bold text-[#EEF2F8]">{a.title}</h2>
        <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{a.intro}</p>
        <p className="mt-1 text-[13px] text-[#6E7888]">{a.id} · {a.track} · {a.band} · difficulty {a.difficulty}</p>
        {problems.length > 0 && <p className="mt-2 text-[14px] font-semibold text-red-300">validate(): {problems.join('; ')}</p>}
      </section>
      <Component
        key={`${ti}-${si}-${run}`}
        params={a.params}
        band={a.band}
        onSubmit={onSubmit}
        onDone={(r) => setLog((l) => [`done → ${JSON.stringify(r)}`, ...l])}
      />
      <section className="rounded-[20px] border border-white/[0.08] bg-[#0A1120] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-[0.12em] text-[#A7B0C0]">Event log</h2>
          <button type="button" onClick={() => { setRun((r) => r + 1); setLog([]) }} className="min-h-11 rounded-lg px-3 text-[14px] font-semibold text-[#A7B0C0] hover:text-[#EEF2F8]">Restart activity</button>
        </div>
        <ol className="mt-2 flex flex-col gap-1 font-mono text-[13px] text-[#C9D4E5]" data-testid="event-log">
          {log.length === 0 ? <li className="text-[#6E7888]">Nothing yet.</li> : log.map((l, i) => <li key={i}>{l}</li>)}
        </ol>
        {a.takeaway && <p className="mt-3 text-[14px] text-[#A7B0C0]">Takeaway: {a.takeaway}</p>}
      </section>
    </div>
  )
}
