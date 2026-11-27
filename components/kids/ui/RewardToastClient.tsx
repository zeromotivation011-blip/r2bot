'use client'

// components/kids/ui/RewardToastClient.tsx
// Mounted once in the kids shell. Listens for REWARD_EVENT from
// lib/kids/universe/rewards.ts and celebrates level-ups, new badges, unlocks
// and finished quests — so no screen has to build its own celebration.
//
// Rewards you can hear and see (roadmap #22):
//   - A level-up opens the level-up ceremony (LevelUpCeremonyClient, loaded on
//     demand): the XP bar fills, the rank stamps in, the new unlock drops in.
//     It shows the level and its unlocks; badges and quests stay as toasts.
//   - Otherwise ONE sound per reward event, distinct per reward type
//     (unlock > badge > quest > personal best), only when sound effects are on
//     (playSound checks the kids Settings).
//   - Explorers (5–7, pre-readers): Spark says every badge and quest aloud when
//     voice is on (sparkSays checks the Settings); the ceremony says level-ups.
//   - The same news is read out to screen readers through a polite live region.
//
// It also:
//   - reports a robot save (Workshop, Garage, Hangar paint…) as kind 'build', at
//     most once a day (reportRobotSaved), on ROBOT_CHANGED_EVENT or when
//     `robotsBuilt` goes up — so every save path counts for the "Upgrade your
//     robot" quests without importing the rewards engine;
//   - keeps the kids Settings classes on <html> (larger text, reduce motion,
//     lite 3D) in step while the shell is mounted, and removes them on the way
//     out of /kids — see lib/kids/settings.ts.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { REWARD_EVENT, reportRobotSaved, type RewardResult } from '@/lib/kids/universe/rewards'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { ROBOT_CHANGED_EVENT } from '@/lib/kids/robot-design'
import { playSound, sparkSays, type SoundType } from '@/lib/kids-audio'
import { applyKidsSettingsToDocument, readKidsSettings, subscribeKidsSettings, useKidsReducedMotion } from '@/lib/kids/settings'
import '@/components/kids/settings/kids-settings.css'

const LevelUpCeremony = dynamic(() => import('./LevelUpCeremonyClient'), { ssr: false })

interface Toast {
  id: number
  icon: string
  title: string
  body: string
}

let seq = 0

/** The one sound for a reward event, or null when there is nothing to celebrate. */
export function rewardSound(r: RewardResult): SoundType | null {
  if (r.levelAfter > r.levelBefore) return 'levelup'
  if (r.newUnlocks.length) return 'unlock'
  if (r.newBadges.length) return 'badge'
  if (r.questsCompleted.length) return 'quest'
  return null
}

/** Two level-ups close together become one ceremony from the first level to the last. */
function mergeCeremony(a: RewardResult | null, b: RewardResult): RewardResult {
  if (!a) return b
  return { ...b, levelBefore: a.levelBefore, xpBefore: a.xpBefore, xpGained: a.xpGained + b.xpGained, newUnlocks: [...a.newUnlocks, ...b.newUnlocks] }
}

const TOAST_MS = 5200

export function RewardToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [ceremony, setCeremony] = useState<RewardResult | null>(null)
  const reduced = useKidsReducedMotion()
  // Guards against one event being handled twice (e.g. a duplicate listener in dev).
  const seen = useRef<WeakSet<Event>>(new WeakSet())
  const timers = useRef<number[]>([])

  // Settings → <html> classes while the kids shell is mounted.
  useEffect(() => {
    const apply = () => applyKidsSettingsToDocument(readKidsSettings())
    apply()
    const off = subscribeKidsSettings(apply)
    return () => {
      off()
      applyKidsSettingsToDocument(null)
    }
  }, [])

  // A robot save (the design changed, or robotsBuilt went up) → 'build', once a day.
  useEffect(() => {
    let built = getProgress().robotsBuilt
    let pending = 0
    const saved = () => {
      window.clearTimeout(pending)
      // After the saving code has finished its own work.
      pending = window.setTimeout(() => reportRobotSaved(), 0)
    }
    const onProgress = () => {
      const now = getProgress().robotsBuilt
      if (now > built) saved()
      built = now
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, onProgress)
    window.addEventListener(ROBOT_CHANGED_EVENT, saved)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, onProgress)
      window.removeEventListener(ROBOT_CHANGED_EVENT, saved)
      window.clearTimeout(pending)
    }
  }, [])

  useEffect(() => {
    const onReward = (e: Event) => {
      if (seen.current.has(e)) return
      seen.current.add(e)
      const r = (e as CustomEvent<RewardResult>).detail
      if (!r) return
      const levelUp = r.levelAfter > r.levelBefore
      const next: Toast[] = []
      // A level-up and its unlocks are shown by the ceremony; badges and quests stay toasts.
      if (!levelUp) for (const u of r.newUnlocks) next.push({ id: ++seq, icon: '🎁', title: `Unlocked: ${u.name}`, body: 'Find it in your robot hangar.' })
      for (const b of r.newBadges) next.push({ id: ++seq, icon: b.icon, title: `Badge: ${b.name}`, body: `You earned this because ${b.earnedFor}` })
      for (const q of r.questsCompleted) next.push({ id: ++seq, icon: q.icon, title: q.bonus ? 'Bonus quest complete!' : 'Quest complete!', body: `${q.title} · +${q.xp} XP` })
      if (!next.length && !levelUp) return

      // Sound: the ceremony plays its own; otherwise one sound for the biggest news.
      if (levelUp) setCeremony((c) => mergeCeremony(c, r))
      else {
        const sound = rewardSound(r)
        if (sound) playSound(sound)
      }

      const said: string[] = []
      if (levelUp) said.push(`Level ${r.levelAfter}!${r.newUnlocks.length ? ` Unlocked: ${r.newUnlocks.map((u) => u.name).join(', ')}.` : ''}`)
      said.push(...next.map((t) => `${t.title} ${t.body}`))
      // A trailing no-break space alternates so the same news twice is still announced.
      setAnnouncement(said.join(' ') + (seq % 2 ? ' ' : ''))

      // Explorers can't read yet: Spark says badges and quests (the ceremony says level-ups).
      if (r.progress.band === 'explorers' && !levelUp && next.length) {
        const words = [
          ...r.newBadges.map((b) => `You earned the ${b.name} badge, because ${b.earnedFor}`),
          ...r.questsCompleted.map((q) => `Quest complete! ${q.say}`),
          ...(r.newUnlocks.length ? [`You unlocked ${r.newUnlocks.map((u) => u.name).join(' and ')}!`] : []),
        ]
        // A beat later, so a screen's own "Well done!" is not cut off mid-word.
        if (words.length) timers.current.push(window.setTimeout(() => sparkSays(words.join(' ')), 1200))
      }

      if (!next.length) return
      setToasts((t) => [...t, ...next].slice(-4))
      for (const t of next) {
        timers.current.push(window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== t.id)), TOAST_MS))
      }
    }
    window.addEventListener(REWARD_EVENT, onReward)
    const pending = timers.current
    return () => {
      window.removeEventListener(REWARD_EVENT, onReward)
      for (const id of pending) window.clearTimeout(id)
      pending.length = 0
    }
  }, [])

  const dismiss = (id: number) => setToasts((all) => all.filter((x) => x.id !== id))
  const closeCeremony = useCallback(() => setCeremony(null), [])

  return (
    <>
      {/* Screen readers hear every reward once; the visual toasts are aria-hidden to avoid double reading. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      <div className="pointer-events-none fixed right-3 top-20 z-[60] flex w-[min(92vw,340px)] flex-col gap-2" aria-hidden="true">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            tabIndex={-1}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex min-h-[48px] w-full items-start gap-3 rounded-2xl border border-amber-400/40 bg-[#111C32]/95 p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,.45)] ${reduced ? '' : 'motion-safe:animate-[kidsToastIn_.3s_cubic-bezier(.22,.61,.36,1)]'}`}
          >
            <span className="text-2xl" aria-hidden>{t.icon}</span>
            <span className="block">
              <span className="block font-display font-bold text-amber-300">{t.title}</span>
              <span className="block text-sm text-[#A7B0C0]">{t.body}</span>
            </span>
          </button>
        ))}
        <style>{`@keyframes kidsToastIn { from { opacity: 0; transform: translateY(-8px) scale(.97) } to { opacity: 1; transform: none } }`}</style>
      </div>
      {ceremony && <LevelUpCeremony key={`${ceremony.levelBefore}-${ceremony.levelAfter}`} result={ceremony} onClose={closeCeremony} />}
    </>
  )
}
