// app/kids/lab/sim/page.tsx — PROTOTYPE: the real-physics robot simulator.
// Not indexed, not in the sitemap, not linked from any nav. The page text is
// server-rendered; the simulator (Rapier WASM + three.js + Blockly) loads only
// here, client-side, behind a same-size skeleton.

import type { Metadata } from 'next'
import SimLabClient from '@/components/kids/sim/SimLabClient'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Robot Physics Lab (prototype)',
  description: 'Program your own robot with blocks and watch it drive in a real-physics 3D arena: sand, walls and lines.',
  robots: { index: false, follow: false },
}

export default function SimLabPage() {
  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pb-4 pt-6">
        <p className="text-sm font-black uppercase tracking-wider text-amber-300">Robot Physics Lab · prototype</p>
        <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Program your robot. Watch real physics happen.</h1>
        <p className="mt-2 max-w-3xl text-purple-100">
          Your robot is not moving on squares here. It has weight, its motors have a limit, its wheels can slip, and it keeps rolling after
          you say stop. Pick a challenge, build a program with blocks, press Run — then swap a part and see what changes.
        </p>
      </header>
      <SimLabClient />
    </>
  )
}
