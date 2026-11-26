'use client'

// components/kids/universe/ExplorerCardClient.tsx
// The child's explorer card: avatar, explorer name, level + title + XP bar,
// stars, badges, days explored this week and this week's three quests. Every
// number comes from the progress store via levelInfo()/questStatus()/
// daysExploredThisWeek() — nothing is invented. On phones and tablets the card
// always reserves 654px: the measured height of both a new explorer's card
// (Spark's welcome) and a returning one's (stats + days), at 390px. So the
// skeleton, the fresh card and the filled card are one size and nothing below
// jumps. On desktop it fills the grid row beside the map.

import { collectedStars, type KidsProgress } from '@/lib/kids-progress'
import { getBand } from '@/lib/kids/bands'
import { daysExploredThisWeek, levelInfo, questStatus } from '@/lib/kids/universe/rewards'
import { Spark } from '@/components/kids/story/characters'
import { Avatar } from './avatars'
import { hasStarted, weekDots } from './universe-state'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export interface ExplorerCardProps {
  progress: KidsProgress | null
  onboarded: boolean
  onStart: () => void
  onEdit: () => void
}

export function ExplorerCardClient({ progress, onboarded, onStart, onEdit }: ExplorerCardProps) {
  return (
    <section
      aria-labelledby="explorer-h"
      className={`relative h-full min-h-[654px] overflow-hidden lg:min-h-0 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]`}
    >
      <h2 id="explorer-h" className="sr-only">
        Your explorer
      </h2>
      {progress ? <Filled p={progress} onboarded={onboarded} onStart={onStart} onEdit={onEdit} /> : <Skeleton />}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse motion-reduce:animate-none" aria-hidden>
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-2/3 rounded-lg bg-white/10" />
          <div className="h-4 w-1/2 rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="mt-5 h-3 rounded-full bg-white/10" />
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="h-[84px] rounded-2xl bg-white/10" />
        <div className="h-[84px] rounded-2xl bg-white/10" />
        <div className="h-[84px] rounded-2xl bg-white/10" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-[60px] rounded-2xl bg-white/10" />
        <div className="h-[60px] rounded-2xl bg-white/10" />
        <div className="h-[60px] rounded-2xl bg-white/10" />
      </div>
    </div>
  )
}

function Filled({ p, onboarded, onStart, onEdit }: { p: KidsProgress; onboarded: boolean; onStart: () => void; onEdit: () => void }) {
  const now = new Date()
  const li = levelInfo(p.xp)
  const quests = questStatus(p, now)
  const days = daysExploredThisWeek(p, now)
  const dots = weekDots(p, now)
  const badgeCount = Object.keys(p.badges).length
  const band = getBand(p.band)
  const fresh = !onboarded && !hasStarted(p)
  const name = p.explorerName || 'Explorer'
  const todayIdx = (now.getDay() + 6) % 7

  return (
    <div className="uv-pop">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={fresh ? onStart : onEdit}
          className="group relative shrink-0 rounded-full outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-amber-400/60"
          aria-label={fresh ? 'Set up your explorer' : 'Change your avatar and name'}
        >
          <Avatar id={p.avatar?.id ?? 'astro'} color={p.avatar?.color ?? '#FC6818'} size={72} />
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-amber-500 text-[#1A1103] shadow ring-2 ring-[#111C32]" aria-hidden>
            <PencilIcon />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl font-bold leading-tight text-[#EEF2F8]">{fresh ? 'Welcome, explorer!' : name}</p>
          <p className="mt-0.5 text-[15px] font-semibold text-[#A7B0C0]">
            Level <span className="font-display text-amber-300">{li.level}</span> · {li.title}
          </p>
          {band && (
            <p className="mt-0.5 text-[13px] font-semibold text-[#6E7888]">
              {band.emoji} {band.name} · ages {band.ages}
            </p>
          )}
        </div>
      </div>

      {/* XP bar (a brand-new explorer has 0 XP; Spark's welcome says what to do instead) */}
      {!fresh && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[13px] font-semibold text-[#A7B0C0]">
            <span>XP</span>
            <span>
              <span className="font-display text-[#EEF2F8]">{li.xpIntoLevel}</span> / {li.xpForNext} to level {li.level + 1}
            </span>
          </div>
          <div
            className="mt-1 h-3 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={`Experience towards level ${li.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={li.xpForNext}
            aria-valuenow={li.xpIntoLevel}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(252,104,24,.6)] transition-[width] duration-700"
              style={{ width: `${Math.max(li.progress > 0 ? 4 : 0, Math.round(li.progress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {fresh && (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
          <div className="flex items-end gap-2">
            {/* Spark, the R2BOT Kids guide (the same puppet as Story Theatre). */}
            <svg viewBox="-112 -246 224 254" width="60" height="68" className="shrink-0" aria-hidden>
              <Spark emotion="happy" talking={false} />
            </svg>
            <div className="mb-1 min-w-0 flex-1 rounded-2xl rounded-bl-md bg-[#0A1120]/70 px-3 py-2">
              <p className="font-display text-[16px] font-bold leading-snug text-[#EEF2F8]">Hi! I&rsquo;m Spark. Let&rsquo;s set up your explorer!</p>
              <p className="text-[14px] leading-snug text-[#A7B0C0]">Age group, name, avatar: three quick steps.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Start exploring →
          </button>
        </div>
      )}

      {/* Stars, badges and days explored. A brand-new explorer has none yet, so Spark's welcome takes this space. */}
      {!fresh && (
        <>
          {/* Stats */}
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Stars" value={collectedStars(p)} icon="⭐" />
            <Stat label="Badges" value={badgeCount} icon="🏅" />
            <div className="rounded-2xl border border-white/10 bg-[#0A1120]/60 px-2 py-2.5 text-center">
              <dt className="text-[12px] font-semibold text-[#A7B0C0]">This week</dt>
              <dd className="font-display text-xl font-bold text-[#EEF2F8]">
                {days}
                <span className="text-sm text-[#6E7888]">/7 days</span>
              </dd>
            </div>
          </dl>

          {/* Days explored this week, Monday to Sunday */}
          <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0A1120]/60 px-3 py-2">
            <p className="text-[13px] font-semibold text-[#A7B0C0]">Days</p>
            <div
              className="flex gap-1.5"
              role="img"
              aria-label={`Explored on ${dots.map((d, i) => (d ? DAY_NAMES[i] : null)).filter(Boolean).join(', ') || 'no days yet'} this week`}
            >
              {dots.map((on, i) => (
                <span
                  key={i}
                  title={`${DAY_NAMES[i]}${on ? ': explored' : ''}`}
                  className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${
                    on ? 'bg-amber-500 text-[#1A1103]' : i === todayIdx ? 'bg-white/5 text-[#EEF2F8] ring-2 ring-amber-400/70' : 'bg-white/10 text-[#A7B0C0]'
                  }`}
                >
                  {DAY_LETTERS[i]}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Quests */}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-display text-lg font-bold text-[#EEF2F8]">This week&rsquo;s quests</h3>
          <p className="text-[13px] font-semibold text-[#A7B0C0]">New quests every Monday</p>
        </div>
        <ul className="mt-2 space-y-2">
          {quests.map(({ quest, count, done }) => {
            const shown = Math.min(count, quest.target)
            return (
              <li
                key={quest.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${done ? 'border-green-500/40 bg-green-500/10' : 'border-white/10 bg-[#0A1120]/60'}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-xl" aria-hidden>
                  {done ? '✅' : quest.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold leading-snug text-[#EEF2F8]">{quest.title}</p>
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
          })}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1120]/60 px-2 py-2.5 text-center">
      <dt className="text-[12px] font-semibold text-[#A7B0C0]">{label}</dt>
      <dd className="font-display text-xl font-bold text-[#EEF2F8]">
        <span aria-hidden className="mr-1 text-base">
          {icon}
        </span>
        {value}
      </dd>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M13.6 2.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-9.5 9.5-4.2 1.1 1.1-4.2 8.8-8.8z" />
    </svg>
  )
}
