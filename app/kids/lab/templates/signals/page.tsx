// app/kids/lab/templates/signals/page.tsx — TEST BENCH for the six sensors,
// electronics and control activity templates (sensor-choice, signal-graph,
// circuit-snap, ohms-law, threshold-tuner, control-tuner). Each template is
// shown with its three sample activities so builders and content authors can
// play them. Not indexed, not in the sitemap, not linked from any nav.

import type { Metadata } from 'next'
import SignalsLabClient from './SignalsLabClient'

export const metadata: Metadata = {
  title: 'Sensors, circuits and control activity templates (test bench)',
  description: 'Test bench for the R2BOT Kids sensor, electronics and control activity templates.',
  robots: { index: false, follow: false },
}

export default function SignalsTemplatesPage() {
  return (
    <main className="mx-auto max-w-4xl px-3 pb-16 pt-4 sm:px-6 sm:pt-8">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Activity templates · test bench</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-[#EEF2F8] sm:text-4xl">Sensors, circuits &amp; control</h1>
      <p className="mt-2 max-w-2xl text-[17px] text-[#A7B0C0]">
        Six interactive engines on real systems — a sensor catalogue with honest weaknesses, seeded noisy sensor traces, a nodal circuit
        solver, Ohm&rsquo;s law with standard resistor values, threshold/hysteresis/filter decisions, and P/PI/PD/PID loops on simulated
        robots. Every answer is checked by the same pure logic the activity verifier runs.
      </p>
      <SignalsLabClient />
    </main>
  )
}
