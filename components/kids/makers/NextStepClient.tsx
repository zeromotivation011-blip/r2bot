'use client'

// components/kids/makers/NextStepClient.tsx — "Your next step" (roadmap #35,
// Graduate to R2BOT). Maps the child's mastered concepts onto the main R2BOT
// platform: Quick Lessons, Academy Forge and Edge, Robot Projects, the ROS 2
// Playground and Career Paths.
//
// Engineers (14–17) see the map themselves; every link leaves /kids, so each
// one goes through <GrownUpLink> (the parental gate, and the parent's
// outbound-links switch). Everyone younger sees only what they have learnt and
// kids-side next steps; the main-site links are in a grown-up view behind
// <ParentalGate>.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { ParentalGate } from '@/components/kids/app/ParentalGateClient'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import type { BandId } from '@/lib/kids/bands'
import type { ConceptId } from '@/lib/kids/curriculum/types'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'
import { CONCEPT_INFO, conceptStates, type ConceptStatus } from '@/lib/kids/universe/mastery'

export interface NextStepItem {
  id: string
  kind: 'short' | 'academy' | 'project' | 'playground' | 'careers'
  title: string
  href: string
  concepts: readonly ConceptId[]
  why: string
}

const KIND_LABEL: Record<NextStepItem['kind'], string> = {
  short: 'Quick Lesson',
  academy: 'Academy',
  project: 'Robot Projects',
  playground: 'ROS 2 Playground',
  careers: 'Career Paths',
}

type Group = 'ready' | 'next' | 'later'

const GROUP_TITLE: Record<Group, string> = {
  ready: 'Ready now: built on skills you have',
  next: 'Next: skills you are learning',
  later: 'Later: new ground',
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

function groupOf(item: NextStepItem, st: Partial<Record<ConceptId, ConceptStatus>>): Group {
  if (item.concepts.some((c) => st[c] === 'secure' || st[c] === 'fading')) return 'ready'
  if (item.concepts.some((c) => st[c] === 'learning')) return 'next'
  return 'later'
}

function ItemList({ items, statuses, gated }: { items: NextStepItem[]; statuses: Partial<Record<ConceptId, ConceptStatus>>; gated: boolean }) {
  const groups: Group[] = ['ready', 'next', 'later']
  return (
    <div className="grid gap-6">
      {groups.map((g) => {
        const list = items.filter((it) => groupOf(it, statuses) === g)
        if (!list.length) return null
        return (
          <section key={g} aria-labelledby={`ns-${g}`}>
            <h3 id={`ns-${g}`} className="font-display text-xl font-bold text-[#EEF2F8]">
              {GROUP_TITLE[g]}
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {list.map((it) => {
                const inner = (
                  <>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-cyan-300">{KIND_LABEL[it.kind]}</span>
                    <span className="mt-0.5 block font-display text-[17px] font-bold text-[#EEF2F8]">{it.title}</span>
                    <span className="mt-0.5 block text-[15px] text-[#A7B0C0]">{it.why}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {it.concepts.map((c) => {
                        const s = statuses[c]
                        const have = s === 'secure' || s === 'fading'
                        return (
                          <span key={c} className={`rounded-lg px-2 py-0.5 text-[13px] ${have ? 'bg-amber-400/20 font-bold text-amber-300' : 'bg-white/[0.06] text-[#A7B0C0]'}`}>
                            {CONCEPT_INFO[c].icon} {CONCEPT_INFO[c].name}
                          </span>
                        )
                      })}
                    </span>
                  </>
                )
                const cls = `block min-h-[48px] rounded-2xl border border-white/[0.08] bg-[#111C32] p-3 hover:border-amber-400/60 ${focusRing}`
                return (
                  <li key={it.id}>
                    {gated ? (
                      <GrownUpLink href={it.href} className={cls} message="This opens the main R2BOT site.">
                        {inner}
                      </GrownUpLink>
                    ) : (
                      // Inside the unlocked grown-up view: the gate has just been passed.
                      <a href={it.href} className={cls}>
                        {inner}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default function NextStepClient({ items }: { items: NextStepItem[] }) {
  const [band, setBand] = useState<BandId | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [statuses, setStatuses] = useState<Partial<Record<ConceptId, ConceptStatus>> | null>(null)

  useEffect(() => {
    const read = () => {
      const p = getProgress()
      setBand(p.band)
      setAge(typeof p.age === 'number' ? p.age : null)
      const out: Partial<Record<ConceptId, ConceptStatus>> = {}
      for (const s of conceptStates({ conceptLog: p.conceptLog ?? [], conceptSecured: p.conceptSecured ?? {} })) out[s.id] = s.status
      setStatuses(out)
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener(KIDS_PROFILE_EVENT, read)
    }
  }, [])

  const have = useMemo(
    () => (statuses ? (Object.entries(statuses) as [ConceptId, ConceptStatus][]).filter(([, s]) => s === 'secure' || s === 'fading').map(([c]) => c) : []),
    [statuses],
  )

  if (statuses === null) {
    return <div className="min-h-[420px] rounded-[28px] border border-white/[0.08] bg-[#111C32]" aria-busy="true" aria-label="Loading your next step" />
  }

  // Engineers band, and not a child who told us they are under 13.
  const teen = band === 'engineers' && (age === null || age >= 13)

  const skills = (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4">
      <h2 className="font-display text-xl font-bold text-[#EEF2F8]">Skills you have</h2>
      {have.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {have.map((c) => (
            <li key={c} className="rounded-xl bg-amber-400/20 px-3 py-1.5 font-bold text-amber-300">
              <span aria-hidden>{CONCEPT_INFO[c].icon}</span> {CONCEPT_INFO[c].name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[16px] text-[#A7B0C0]">
          None secure yet. Win Skill Galaxy missions on the first try and your skills will appear here.
        </p>
      )}
    </div>
  )

  if (teen) {
    return (
      <div className="grid gap-6">
        <section className="rounded-[28px] border border-amber-400/40 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-6">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">You’re ready for the main R2BOT platform</h2>
          <p className="mt-2 max-w-3xl text-[17px] text-[#A7B0C0]">
            The same ideas you secured here go much further on R2BOT: one-minute Quick Lessons, the Academy’s Forge and Edge tracks (ROS 2,
            navigation, SLAM, AI on robots), guided Robot Projects, a real ROS 2 Playground and Career Paths. Each link opens the main site.
          </p>
        </section>
        {skills}
        <ItemList items={items} statuses={statuses} gated />
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">Your next step opens at Engineers</h2>
        <p className="mt-2 max-w-3xl text-[17px] text-[#A7B0C0]">
          When you reach the Engineers band (ages 14–17), this page turns into a map from everything you have learnt to the big R2BOT
          platform. Until then, keep exploring here:
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { href: '/kids/galaxy/concepts', label: 'Grow your skills' },
            { href: '/kids/careers', label: 'Meet the Makers' },
            { href: '/kids/robodex', label: 'Collect real robots' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`inline-flex min-h-[48px] items-center rounded-2xl border border-white/[0.16] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 ${focusRing}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>
      {skills}
      <ParentalGate title="For parents and teachers" lead="See where this child’s skills lead on the main R2BOT site. These links leave R2BOT Kids.">
        <section aria-labelledby="ns-grown-up-h" className="rounded-[28px] border border-cyan-400/30 bg-[#0A1120] p-5 sm:p-6">
          <h2 id="ns-grown-up-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
            Grown-up view: where these skills lead
          </h2>
          <p className="mt-2 text-[16px] text-[#A7B0C0]">
            Matched to the concepts this child has secured on this device. The main R2BOT site is written for teenagers and adults; for under-13s
            it is best explored together.
          </p>
          <div className="mt-5">
            <ItemList items={items} statuses={statuses} gated={false} />
          </div>
        </section>
      </ParentalGate>
    </div>
  )
}
