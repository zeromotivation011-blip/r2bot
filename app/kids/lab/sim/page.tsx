// app/kids/lab/sim/page.tsx — PROTOTYPE: the real-physics robot simulator.
// Not indexed, not in the sitemap, not linked from any nav. The page text is
// server-rendered; the simulator (Rapier WASM + three.js + Blockly) loads only
// here, client-side, behind a same-size skeleton.

import type { Metadata } from 'next'
import SimLabClient from '@/components/kids/sim/SimLabClient'
import { PresentButton } from '@/components/kids/present/PresentButton'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Robot Physics Lab (prototype)',
  description: 'Program your own robot with blocks and watch it drive in a real-physics 3D arena: sand, walls and lines.',
  robots: { index: false, follow: false },
}

export default function SimLabPage() {
  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pb-3 pt-4 sm:pb-4 sm:pt-6">
        <p className="text-sm font-black uppercase tracking-wider text-amber-300">Robot Physics Lab · prototype</p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-4xl">Program your robot. Watch real physics happen.</h1>
        {/* Hidden on phones so the robot is in the first screen. */}
        <p className="mt-2 hidden max-w-3xl text-slate-200 sm:block">
          Your robot is not moving on squares here. It has weight, its motors have a limit, its wheels can slip, and it keeps rolling after
          you say stop. Pick a challenge, build a program with blocks, press Run — then swap a part and see what changes.
        </p>
        {/* Present mode is a classroom-screen tool: hidden on phones so the robot stays in the first screen. */}
        <PresentButton source={{ kind: 'sim', id: 'lab' }} className="hidden min-h-[48px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:mt-3 sm:inline-flex" />
      </header>
      <SimLabClient />
    </>
  )
}
