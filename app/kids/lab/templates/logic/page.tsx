// app/kids/lab/templates/logic/page.tsx — internal test bench for the six
// logic & code activity templates (sequence-path, debug-program,
// predict-output, flowchart-builder, logic-gates, binary-encoder).
// Not indexed, not in the sitemap, not linked from any nav; 404 in production (../bench.ts).

import type { Metadata } from 'next'
import { requireTemplateBench } from '../bench'
import LogicLabClient from './LogicLabClient'

export const metadata: Metadata = {
  title: 'Activity templates: logic & code (test bench)',
  description: 'Internal test bench for the R2BOT Kids logic and code activity templates.',
  robots: { index: false, follow: false, nocache: true },
}

export default function LogicTemplatesLabPage() {
  requireTemplateBench()
  return (
    <main className="mx-auto max-w-7xl px-3 pb-16 pt-4 sm:px-4 sm:pt-6">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Template test bench · logic &amp; code</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">Logic &amp; code activity templates</h1>
      <p className="mt-2 max-w-3xl text-[16px] text-[#A7B0C0]">
        Every sample activity for the six templates, running against its own check(). Pick a template and a sample, play it, and read
        the event log below.
      </p>
      <LogicLabClient />
    </main>
  )
}
