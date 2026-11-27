'use client'

// components/kids/makers/MakerStoryClient.tsx — a Maker's two stories on their
// page: the short one for young children (read aloud, about a minute) and "how
// I got here" for teens. Both are always in the page (server-rendered HTML, no
// layout shift); after load, the one that fits the child's band is marked
// "Start here". Hearing or reading a story to the end marks it heard
// (lib/kids/makers/heard.ts) for the Meet the Makers badge.

import { useEffect, useState } from 'react'
import { getProgress } from '@/lib/kids-progress'
import type { BandId } from '@/lib/kids/bands'
import { markHeard, readHeard } from '@/lib/kids/makers/heard'
import { readAloud, readAloudSupported, stopReadAloud } from '@/lib/kids/read-aloud'
import { useKidsSettings } from '@/lib/kids/settings'

export interface MakerStoryClientProps {
  makerId: string
  firstName: string
  story: string
  journey: string
  day: readonly string[]
  routes: readonly string[]
  advice: string
}

type Part = 'story' | 'journey'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function MakerStoryClient({ makerId, firstName, story, journey, day, routes, advice }: MakerStoryClientProps) {
  const settings = useKidsSettings()
  const [band, setBand] = useState<BandId | null>(null)
  const [canSpeak, setCanSpeak] = useState(false)
  const [speaking, setSpeaking] = useState<Part | null>(null)
  const [heard, setHeard] = useState(false)

  useEffect(() => {
    setBand(getProgress().band)
    setCanSpeak(readAloudSupported())
    setHeard(readHeard().includes(makerId))
    return () => stopReadAloud()
  }, [makerId])

  const teen = band === 'inventors' || band === 'engineers'
  const start: Part | null = band === null ? null : teen ? 'journey' : 'story'

  const done = () => {
    if (markHeard(makerId)) setHeard(true)
  }

  const listen = (part: Part) => {
    if (speaking === part) {
      stopReadAloud()
      setSpeaking(null)
      return
    }
    setSpeaking(part)
    const text = part === 'story' ? story : `${journey} ${advice}`
    readAloud(text, {
      onEnd: () => {
        setSpeaking((cur) => (cur === part ? null : cur))
        done()
      },
    })
  }

  const listenButton = (part: Part) =>
    canSpeak && settings.voice ? (
      <button
        type="button"
        onClick={() => listen(part)}
        className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 ${focusRing}`}
      >
        <span aria-hidden>{speaking === part ? '■' : '🔊'}</span> {speaking === part ? 'Stop' : part === 'story' ? `Listen to ${firstName}` : 'Listen'}
      </button>
    ) : null

  const ring = (part: Part) => (start === part ? 'border-amber-400/70 ring-2 ring-amber-400/40' : 'border-white/[0.08]')

  return (
    <div className="grid gap-5">
      <section aria-labelledby="maker-story-h" className={`rounded-[28px] border bg-[#111C32] p-5 sm:p-6 ${ring('story')}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="maker-story-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
            {firstName}’s story
          </h2>
          <span className="text-[14px] font-bold uppercase tracking-wider text-cyan-300">{start === 'story' ? 'Start here' : 'Ages 5–10 · about a minute'}</span>
        </div>
        <p className="mt-3 text-[20px] leading-relaxed text-[#EEF2F8]" data-read-aloud="text">
          {story}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {listenButton('story')}
          <button
            type="button"
            onClick={done}
            className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-white/[0.16] px-5 font-bold text-[#EEF2F8] hover:border-amber-400/60 ${focusRing}`}
            aria-pressed={heard}
          >
            <span aria-hidden>{heard ? '✓' : '👍'}</span> {heard ? 'Story heard' : 'I heard it!'}
          </button>
        </div>
      </section>

      <section aria-labelledby="maker-journey-h" className={`rounded-[28px] border bg-[#111C32] p-5 sm:p-6 ${ring('journey')}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="maker-journey-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
            How I got here
          </h2>
          <span className="text-[14px] font-bold uppercase tracking-wider text-cyan-300">{start === 'journey' ? 'Start here' : 'Ages 11–17'}</span>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed text-[#EEF2F8]">{journey}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-display text-lg font-bold text-[#EEF2F8]">A day in the job</h3>
            <ul className="mt-2 grid gap-1.5 text-[16px] text-[#A7B0C0]">
              {day.map((d) => (
                <li key={d} className="flex gap-2">
                  <span aria-hidden className="text-amber-300">●</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Ways into this job</h3>
            <ul className="mt-2 grid gap-1.5 text-[16px] text-[#A7B0C0]">
              {routes.map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden className="text-cyan-300">→</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <blockquote className="mt-4 rounded-2xl border-l-4 border-amber-400 bg-white/[0.04] p-4 text-[17px] italic text-[#EEF2F8]">“{advice}”</blockquote>
        <div className="mt-4">
          {listenButton('journey')}
        </div>
      </section>
    </div>
  )
}
