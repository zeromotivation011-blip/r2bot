// app/kids/next-step/page.tsx — "Your next step" (roadmap #35, Graduate to
// R2BOT). A personal screen that reads this device's mastery, so it is
// noindex. The server resolves every destination (live Quick Lessons only,
// Academy lessons that exist) so the client never sees a dead or scheduled link.

import type { Metadata } from 'next'
import Link from 'next/link'
import NextStepClient, { type NextStepItem } from '@/components/kids/makers/NextStepClient'
import { getAcademyLesson } from '@/lib/academy'
import type { ConceptId } from '@/lib/kids/curriculum/types'
import { NEXT_STEP_PLACES, SHORTS_FOR_CONCEPT } from '@/lib/kids/makers/next-step'
import { CONCEPT_IDS } from '@/lib/kids/universe/mastery'
import { liveShorts } from '@/lib/shorts'

export const runtime = 'nodejs'
// Quick Lessons switch on by date: re-check hourly, like the lesson pages.
export const revalidate = 3600

const BASE = 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'Your next step — R2BOT Kids',
  description: 'For teenagers ready for more: a map from the robotics skills you secured in R2BOT Kids to Quick Lessons, the Academy, Robot Projects, the ROS 2 Playground and Career Paths.',
  alternates: { canonical: `${BASE}/kids/next-step` },
  // Personal: built from the progress saved on this device.
  robots: { index: false, follow: true },
}

function resolveItems(): NextStepItem[] {
  const live = new Map(liveShorts().map((s) => [s.slug, s]))
  const shorts = new Map<string, NextStepItem>()
  for (const c of CONCEPT_IDS) {
    for (const slug of SHORTS_FOR_CONCEPT[c] ?? []) {
      const s = live.get(slug)
      if (!s) continue
      const prev = shorts.get(slug)
      if (prev) {
        if (!prev.concepts.includes(c)) shorts.set(slug, { ...prev, concepts: [...prev.concepts, c] })
        continue
      }
      shorts.set(slug, { id: `short-${slug}`, kind: 'short', title: s.title, href: `/shorts/${slug}`, concepts: [c as ConceptId], why: s.summary })
    }
  }
  const places: NextStepItem[] = NEXT_STEP_PLACES.flatMap((p): NextStepItem[] => {
    if (p.kind === 'academy') {
      const m = /^\/academy\/(forge|edge)\/(\d+)$/.exec(p.href)
      if (!m) return []
      const track = m[1] === 'forge' ? 'forge' : 'edge'
      const lesson = getAcademyLesson(track, m[2])
      if (!lesson) return []
      return [{ id: p.id, kind: 'academy' as const, title: `${track === 'forge' ? 'Forge' : 'Edge'}: ${lesson.title}`, href: p.href, concepts: p.concepts, why: p.why }]
    }
    return [{ id: p.id, kind: p.kind, title: p.title, href: p.href, concepts: p.concepts, why: p.why }]
  })
  return [...places, ...shorts.values()]
}

export default function NextStepPage() {
  const items = resolveItems()
  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-4 sm:px-5">
      <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
        <Link href="/kids/careers" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          ← Robotics careers
        </Link>
      </nav>
      <header className="mb-6 mt-1">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Graduate to R2BOT</p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Your next step</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
          R2BOT Kids is the launch pad. The ideas you secure here, from sensors and feedback to autonomy and data, are the same ones real
          robotics engineers use. This page shows where each of your skills leads next.
        </p>
      </header>
      <NextStepClient items={items} />
      <p className="mt-10 max-w-3xl text-[15px] text-[#6E7888]">
        Everything here is worked out on this device from the missions you finished. Nothing is sent anywhere, and nothing is compared with anyone
        else.
      </p>
    </div>
  )
}
