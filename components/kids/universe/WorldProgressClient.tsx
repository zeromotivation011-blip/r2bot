'use client'

// components/kids/universe/WorldProgressClient.tsx
// How far a child has got in each Universe world: Skill Galaxy activities
// finished (lib/kids/activities/progress.ts) and whether the world's flagship
// game has a personal best (GameShell → reportActivity). Read-only. The ids
// come from the server (byWorld), so the browser never loads activity params.
//
// Renders a neutral, same-size state on the server and the first paint, then
// fills in — nothing shifts, nothing invented.

import { useEffect, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { getActivitiesDone } from '@/lib/kids/activities/progress'

export interface WorldProgress {
  ready: boolean
  /** Activities in this world finished at least once. */
  done: number
  total: number
  /** Stars earned across those activities. */
  stars: number
  /** The flagship game has at least one finished round. */
  gamePlayed: boolean
}

function read(ids: readonly string[], gameId: string): Omit<WorldProgress, 'ready' | 'total'> {
  const doneMap = getActivitiesDone()
  let done = 0
  let stars = 0
  for (const id of ids) {
    const r = doneMap[id]
    if (r) {
      done += 1
      stars += r.stars
    }
  }
  const bests = getProgress().personalBests
  const gamePlayed = Object.keys(bests).some((k) => k.split(':')[0] === gameId)
  return { done, stars, gamePlayed }
}

export function useWorldProgress(ids: readonly string[], gameId: string): WorldProgress {
  const [state, setState] = useState<WorldProgress>({ ready: false, done: 0, total: ids.length, stars: 0, gamePlayed: false })
  const key = ids.join(',')
  useEffect(() => {
    const list = key ? key.split(',') : []
    const update = () => setState({ ready: true, total: list.length, ...read(list, gameId) })
    update()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('r2bot_kids')) update()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, update)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, update)
      window.removeEventListener('storage', onStorage)
    }
  }, [key, gameId])
  return state
}

/** A compact progress line for a world card: a bar plus "7 / 24 activities · game ✓". */
export function WorldProgressBar({ ids, gameId, worldName }: { ids: readonly string[]; gameId: string; worldName: string }) {
  const p = useWorldProgress(ids, gameId)
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2 text-[13px] font-semibold">
        <span className="text-[#EEF2F8]">
          {p.ready ? `${p.done} / ${p.total} activities` : `${p.total} activities`}
          {p.ready && p.stars > 0 && <span className="ml-1.5 text-amber-300">★ {p.stars}</span>}
        </span>
        <span className={p.ready && p.gamePlayed ? 'text-amber-300' : 'text-[#A7B0C0]'}>
          {p.ready ? (p.gamePlayed ? 'Game played ✓' : 'Game not played yet') : ' '}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={`${worldName}: activities finished`}
        aria-valuemin={0}
        aria-valuemax={p.total}
        aria-valuenow={p.ready ? p.done : 0}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-700" style={{ width: `${p.ready ? pct : 0}%` }} />
      </div>
    </div>
  )
}
