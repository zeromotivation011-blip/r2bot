// app/kids/lab/templates/mechanics/page.tsx — TEST BENCH for the six mechanics
// activity templates (gear-train, lever-balance, simple-machines,
// wheel-terrain, centre-of-mass, motor-math). Each template is shown with its
// three sample activities so builders and content authors can play them.
// Not indexed, not in the sitemap, not linked from any nav; 404 in production (../bench.ts).

import type { Metadata } from 'next'
import { requireTemplateBench } from '../bench'
import MechanicsLabClient from './MechanicsLabClient'

export const metadata: Metadata = {
  title: 'Mechanics activity templates (test bench)',
  description: 'Test bench for the R2BOT Kids mechanics activity templates: gears, levers, simple machines, terrain, centre of mass and motor maths.',
  robots: { index: false, follow: false, nocache: true },
}

export default function MechanicsTemplatesPage() {
  requireTemplateBench()
  return (
    <main className="mx-auto max-w-4xl px-3 pb-16 pt-4 sm:px-6 sm:pt-8">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Activity templates · test bench</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-[#EEF2F8] sm:text-4xl">Mechanics &amp; motion</h1>
      <p className="mt-2 max-w-2xl text-[17px] text-[#A7B0C0]">
        Six interactive engines on real physics — gear ratios, moments, simple machines, ground pressure and grip, tipping, and wheel
        odometry. Pick a template and a sample activity; every answer is checked by the same pure logic the activity verifier runs.
      </p>
      <MechanicsLabClient />
    </main>
  )
}
