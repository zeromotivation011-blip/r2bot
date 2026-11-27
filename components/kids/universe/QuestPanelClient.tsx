'use client'

// components/kids/universe/QuestPanelClient.tsx
// This week's quests (roadmap #10 + #22): three quests for the child's band and
// a bonus fourth one, from questStatus() in lib/kids/universe/rewards.ts.
//   - Explorers (5–7, pre-readers): picture cards — a big picture, two or three
//     words, progress as dots — and a 48px speaker button: Spark reads the quest
//     (sparkSays). The button is hidden when voice is off in the kids Settings,
//     so a pre-reader never taps a speaker that does nothing.
//   - Builders and up: a compact list with a progress bar and the XP.
// A week with no play costs nothing: quests are simply new on Monday.
// Pure render from `progress`; the caller owns reading the store.

import type { KidsProgress } from '@/lib/kids-progress'
import { questStatus, type QuestState } from '@/lib/kids/universe/rewards'
import { sparkSays } from '@/lib/kids-audio'
import { useKidsSettings } from '@/lib/kids/settings'

export interface QuestPanelProps {
  progress: KidsProgress
  now?: Date
  /** Heading level inside the caller's section (default h3). */
  headingLevel?: 'h2' | 'h3'
}

export function QuestPanelClient({ progress, now = new Date(), headingLevel = 'h3' }: QuestPanelProps) {
  const quests = questStatus(progress, now)
  const picture = progress.band === 'explorers'
  const H = headingLevel
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <H className="font-display text-lg font-bold text-[#EEF2F8]">This week&rsquo;s quests</H>
        <p className="text-[13px] font-semibold text-[#A7B0C0]">New quests every Monday</p>
      </div>
      {picture ? (
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {quests.map((s) => (
            <PictureCard key={s.quest.id} s={s} />
          ))}
        </ul>
      ) : (
        <ul className="mt-2 space-y-2">
          {quests.map((s) => (
            <Row key={s.quest.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PictureCard({ s }: { s: QuestState }) {
  const { quest, count, done, bonus } = s
  const shown = Math.min(count, quest.target)
  const voiceOn = useKidsSettings().voice
  return (
    <li
      className={`relative flex flex-col items-center rounded-2xl border p-2.5 text-center ${
        done ? 'border-green-500/40 bg-green-500/10' : bonus ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/10 bg-[#0A1120]/60'
      }`}
    >
      {bonus && <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-[#1A1103]">Bonus</span>}
      {voiceOn && (
      <button
        type="button"
        onClick={() => sparkSays(done ? `Done! ${quest.say}` : quest.say)}
        className="absolute right-1.5 top-1.5 grid h-12 w-12 place-items-center rounded-xl text-[#A7B0C0] hover:bg-white/10 hover:text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        aria-label={`Hear the quest: ${quest.title}`}
      >
        <SpeakerIcon />
      </button>
      )}
      <span className="mt-5 text-5xl leading-none" aria-hidden>
        {done ? '✅' : quest.icon}
      </span>
      <p className="mt-2 text-[15px] font-bold leading-tight text-[#EEF2F8]">{quest.short}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-1" role="img" aria-label={`${shown} of ${quest.target} done`}>
        {Array.from({ length: Math.min(quest.target, 10) }, (_, i) => (
          <span key={i} className={`h-3 w-3 rounded-full ${i < Math.round((shown / quest.target) * Math.min(quest.target, 10)) ? (done ? 'bg-green-500' : 'bg-cyan-400') : 'bg-white/15'}`} />
        ))}
      </div>
      <span className="sr-only">{quest.title}</span>
    </li>
  )
}

function Row({ s }: { s: QuestState }) {
  const { quest, count, done, bonus } = s
  const shown = Math.min(count, quest.target)
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
        done ? 'border-green-500/40 bg-green-500/10' : bonus ? 'border-amber-400/30 bg-amber-500/[0.07]' : 'border-white/10 bg-[#0A1120]/60'
      }`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-xl" aria-hidden>
        {done ? '✅' : quest.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[15px] font-semibold leading-snug text-[#EEF2F8]">
            {bonus && <span className="mr-1.5 rounded-full bg-amber-500 px-1.5 py-px align-[1px] text-[11px] font-bold text-[#1A1103]">Bonus</span>}
            {bonus ? capitalise(quest.title.replace(/^Bonus: /, '')) : quest.title}
          </p>
          <span className="shrink-0 text-[12px] font-bold text-amber-300">+{quest.xp} XP</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={quest.title}
            aria-valuemin={0}
            aria-valuemax={quest.target}
            aria-valuenow={shown}
          >
            <div className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-cyan-400'}`} style={{ width: `${(shown / quest.target) * 100}%` }} />
          </div>
          <span className="text-[12px] font-bold text-[#A7B0C0]">
            {shown}/{quest.target}
          </span>
        </div>
      </div>
    </li>
  )
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

/** "complete 10 missions" -> "Complete 10 missions" (the bonus pill replaces the "Bonus: " prefix). */
function capitalise(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}
