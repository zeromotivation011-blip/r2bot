'use client'

// app/kids/printables/BuiltTicksClient.tsx — on the Make It at Home list, shows
// "You have built N" and a ✓ on each build card this child checked in
// (lib/kids/builds/store.ts, this device only). Server HTML is unchanged until
// it mounts; the line reserves its height so nothing shifts. It also makes sure
// every checked-in build has discovered its Robodex card (older or restored
// check-ins; lib/kids/builds/robodex.ts).

import { useEffect, useState } from 'react'
import { BUILDS_EVENT, readBuilds } from '@/lib/kids/builds/store'
import { cardsForCheckIns, discoverBuildCards } from '@/lib/kids/builds/robodex'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'

export default function BuiltTicksClient({ total, cardByBuild = {} }: { total: number; cardByBuild?: Record<string, string> }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      const built = readBuilds()
      setCount(Object.keys(built).length)
      void discoverBuildCards(cardsForCheckIns(built, cardByBuild))
      document.querySelectorAll<HTMLElement>('[data-build]').forEach((el) => {
        const tick = el.querySelector<HTMLElement>('.built-tick')
        if (tick) tick.classList.toggle('hidden', !built[el.dataset.build ?? ''])
      })
    }
    update()
    window.addEventListener(BUILDS_EVENT, update)
    window.addEventListener(KIDS_PROFILE_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(BUILDS_EVENT, update)
      window.removeEventListener(KIDS_PROFILE_EVENT, update)
      window.removeEventListener('storage', update)
    }
    // cardByBuild comes from the server render and never changes on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <p className="no-print mt-3 min-h-[24px] text-[15px] font-semibold text-[#A7B0C0]" aria-live="polite">
      {count === null ? ' ' : count === 0 ? 'Pick one to start: every build you check in goes into your portfolio.' : `You have built ${count} of ${total}. ${count >= total ? 'Every single one!' : 'Keep going!'}`}
    </p>
  )
}
