// app/kids/lab/templates/thinking/page.tsx — internal test bench for the eight
// AI, design and world activity templates (classify-sort, train-mini,
// path-planner, robot-designer, ethics-dilemma, robot-match, estimate,
// spot-in-scene). Not indexed, not in the sitemap, not linked from any nav.

import type { Metadata } from 'next'
import ThinkingLabClient from './ThinkingLabClient'

export const metadata: Metadata = {
  title: 'Activity templates: AI, design & world (test bench)',
  description: 'Internal test bench for the R2BOT Kids AI, design and robots-in-society activity templates.',
  robots: { index: false, follow: false },
}

export default function ThinkingTemplatesLabPage() {
  return (
    <main className="mx-auto max-w-7xl px-3 pb-16 pt-4 sm:px-4 sm:pt-6">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Template test bench · AI, design &amp; world</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">Thinking activity templates</h1>
      <p className="mt-2 max-w-3xl text-[16px] text-[#A7B0C0]">
        Every sample activity for the eight templates, running against its own check(). Pick a template and a sample, play it, and read
        the event log below.
      </p>
      <ThinkingLabClient />
    </main>
  )
}
