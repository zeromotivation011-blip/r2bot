'use client'

// components/kids/ui/RewardToastClient.tsx
// Mounted once in the kids shell. Listens for REWARD_EVENT from
// lib/kids/universe/rewards.ts and celebrates level-ups, new badges, unlocks
// and finished quests — so no screen has to build its own celebration.
//
// Rewards you can hear: ONE sound per reward event (levelup > unlock > star),
// only when sound effects are on (playSound checks the kids Settings), and the
// same news is read out to screen readers through a polite live region.
//
// It also keeps the kids Settings classes on <html> (larger text, reduce motion,
// lite 3D) in step while the shell is mounted, and removes them on the way out
// of /kids — see lib/kids/settings.ts.

import { useEffect, useRef, useState } from 'react'
import { REWARD_EVENT, type RewardResult } from '@/lib/kids/universe/rewards'
import { playSound, type SoundType } from '@/lib/kids-audio'
import { applyKidsSettingsToDocument, readKidsSettings, subscribeKidsSettings, useKidsReducedMotion } from '@/lib/kids/settings'
import '@/components/kids/settings/kids-settings.css'

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
  if (r.newBadges.length || r.questsCompleted.length) return 'star'
  return null
}

const TOAST_MS = 5200

export function RewardToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [announcement, setAnnouncement] = useState('')
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

  useEffect(() => {
    const onReward = (e: Event) => {
      if (seen.current.has(e)) return
      seen.current.add(e)
      const r = (e as CustomEvent<RewardResult>).detail
      if (!r) return
      const next: Toast[] = []
      if (r.levelAfter > r.levelBefore) next.push({ id: ++seq, icon: '🚀', title: `Level ${r.levelAfter}!`, body: 'You levelled up. New things may be unlocked in your hangar.' })
      for (const b of r.newBadges) next.push({ id: ++seq, icon: b.icon, title: `Badge: ${b.name}`, body: `You earned this because ${b.earnedFor}` })
      for (const u of r.newUnlocks) next.push({ id: ++seq, icon: '🎁', title: `Unlocked: ${u.name}`, body: 'Find it in your robot hangar.' })
      for (const q of r.questsCompleted) next.push({ id: ++seq, icon: q.icon, title: 'Quest complete!', body: `${q.title} · +${q.xp} XP` })
      if (!next.length) return

      const sound = rewardSound(r)
      if (sound) playSound(sound)
      // A trailing no-break space alternates so the same news twice is still announced.
      setAnnouncement(next.map((t) => `${t.title} ${t.body}`).join(' ') + (seq % 2 ? '\u00A0' : ''))

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
    </>
  )
}
