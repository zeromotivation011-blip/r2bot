'use client'

// components/kids/ui/RewardToastClient.tsx
// Mounted once in the kids shell. Listens for REWARD_EVENT from
// lib/kids/universe/rewards.ts and celebrates level-ups, new badges, unlocks
// and finished quests — so no screen has to build its own celebration.

import { useEffect, useState } from 'react'
import { REWARD_EVENT, type RewardResult } from '@/lib/kids/universe/rewards'

interface Toast {
  id: number
  icon: string
  title: string
  body: string
}

let seq = 0

export function RewardToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const onReward = (e: Event) => {
      const r = (e as CustomEvent<RewardResult>).detail
      if (!r) return
      const next: Toast[] = []
      if (r.levelAfter > r.levelBefore) next.push({ id: ++seq, icon: '🚀', title: `Level ${r.levelAfter}!`, body: 'You levelled up. New things may be unlocked in your hangar.' })
      for (const b of r.newBadges) next.push({ id: ++seq, icon: b.icon, title: `Badge: ${b.name}`, body: `You earned this because ${b.earnedFor}` })
      for (const u of r.newUnlocks) next.push({ id: ++seq, icon: '🎁', title: `Unlocked: ${u.name}`, body: 'Find it in your robot hangar.' })
      for (const q of r.questsCompleted) next.push({ id: ++seq, icon: q.icon, title: 'Quest complete!', body: `${q.title} · +${q.xp} XP` })
      if (!next.length) return
      setToasts((t) => [...t, ...next].slice(-4))
      for (const t of next) setTimeout(() => setToasts((all) => all.filter((x) => x.id !== t.id)), 5200)
    }
    window.addEventListener(REWARD_EVENT, onReward)
    return () => window.removeEventListener(REWARD_EVENT, onReward)
  }, [])

  return (
    <div className="pointer-events-none fixed right-3 top-20 z-[60] flex w-[min(92vw,340px)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-slate-950/95 p-3 shadow-xl motion-safe:animate-[kidsToastIn_.35s_ease-out]">
          <span className="text-2xl" aria-hidden>{t.icon}</span>
          <div>
            <p className="font-black text-amber-200">{t.title}</p>
            <p className="text-sm text-white/75">{t.body}</p>
          </div>
        </div>
      ))}
      <style>{`@keyframes kidsToastIn { from { opacity: 0; transform: translateY(-8px) scale(.97) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}
