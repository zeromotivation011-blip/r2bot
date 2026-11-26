'use client'

// components/kids/ai/think/ThinkLabsClient.tsx
// Lazy loaders for the three How Robots Think labs. Each lab is a client-only
// bundle (canvas, requestAnimationFrame, localStorage) pulled in with
// next/dynamic behind a skeleton of the lab's final size, so the server page
// paints its real text first and nothing shifts when the lab arrives. If the
// chunk cannot load (the app is offline and the chunk was never cached), the
// child sees a kind message instead of a broken screen.

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { OpenSparkDetail } from '@/lib/kids/ai/spark/open'
import { playSound } from '@/lib/kids-audio'

// The Spark sheet is code-split; the hub's button opens its own copy so it
// works whether or not the kids shell mounts the floating <AskSparkClient />.
// It does not dispatch openSpark(), so a shell-mounted listener can never
// open a second sheet on top of this one.
const SparkSheet = dynamic(() => import('@/components/kids/ai/spark/SparkSheetClient'), { ssr: false })
const HUB_SPARK: OpenSparkDetail = { topic: 'How robots think (AI)' }

function Skeleton({ heightClass, label }: { heightClass: string; label: string }) {
  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="h-[60px] rounded-2xl border border-white/10 bg-[#111C32]" />
      <div className={`mt-3 grid gap-3 lg:grid-cols-2 ${heightClass}`}>
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] motion-safe:animate-pulse" />
        <div className="hidden rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] motion-safe:animate-pulse lg:block" />
      </div>
    </div>
  )
}

function Offline({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-5 text-center">
        <p className="font-display text-lg font-bold text-white">{label} needs the internet once</p>
        <p className="mt-1 text-slate-300">It could not load. Connect to Wi-Fi or mobile data and open this page again — after that it runs on your device.</p>
      </div>
    </div>
  )
}

export const NeuralLab = dynamic(() => import('./NeuralPlaygroundClient').catch(() => ({ default: () => <Offline label="Neural Playground" /> })), {
  ssr: false,
  loading: () => <Skeleton heightClass="h-[860px] lg:h-[720px]" label="Neural Playground" />,
})

export const LearnLab = dynamic(() => import('./LearningRobotClient').catch(() => ({ default: () => <Offline label="Learning Robot" /> })), {
  ssr: false,
  loading: () => <Skeleton heightClass="h-[1040px] lg:h-[780px]" label="Learning Robot" />,
})

export const SensesLab = dynamic(() => import('./RobotSensesClient').catch(() => ({ default: () => <Offline label="Robot Senses" /> })), {
  ssr: false,
  loading: () => <Skeleton heightClass="h-[1100px] lg:h-[640px]" label="Robot Senses" />,
})

/** "Ask Spark" button for the AI hub: opens the Ask Spark sheet (its own instance). */
export function AskSparkButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <>
      <button
        type="button"
        onClick={() => {
          playSound('click')
          setOpen(true)
        }}
        className={
          className ??
          'min-h-12 rounded-2xl bg-amber-500 px-5 font-display text-base font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
        }
      >
        Ask Spark a question
      </button>
      {mounted && open && createPortal(<SparkSheet initial={HUB_SPARK} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}
