'use client'

// components/kids/galaxy/useGalaxyState.ts
// The child's Skill Galaxy state in the browser: finished activities (from
// lib/kids/activities/progress.ts) and their age band (from the one progress
// store). Re-reads on KIDS_PROGRESS_EVENT and on storage changes from other tabs.

import { useCallback, useEffect, useState } from 'react'
import { getProgress, saveProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { ACTIVITIES_KEY, getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import type { BandId } from '@/lib/kids/bands'
import { classBandLock, CLASS_MEMBERSHIP_KEY, KIDS_CLASS_EVENT } from '@/lib/kids/classroom-membership-store'

export interface GalaxyState {
  /** False until localStorage has been read (render a neutral state before). */
  ready: boolean
  done: ActivitiesDone
  band: BandId | null
  /** The band a teacher set for this child (classroom sync); while set, setBand does nothing. */
  lockedBand: BandId | null
  setBand: (b: BandId) => void
}

export function useGalaxyState(): GalaxyState {
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState<ActivitiesDone>({})
  const [band, setBandState] = useState<BandId | null>(null)
  const [lockedBand, setLockedBand] = useState<BandId | null>(null)

  useEffect(() => {
    const read = () => {
      setDone(getActivitiesDone())
      setBandState(getProgress().band)
      setLockedBand(classBandLock())
      setReady(true)
    }
    read()
    const onStorage = (e: StorageEvent) => {
      // Per-child keys carry a `::<profile>` suffix (profileKey), so match the base.
      const k = e.key
      if (!k || k.startsWith(ACTIVITIES_KEY) || k.startsWith('r2bot_kids_v2') || k.startsWith(CLASS_MEMBERSHIP_KEY)) read()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener(KIDS_CLASS_EVENT, read)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener(KIDS_CLASS_EVENT, read)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setBand = useCallback((b: BandId) => {
    // A teacher's choice wins; the next class sync would put it back anyway.
    if (classBandLock()) return
    saveProgress({ band: b })
    setBandState(b)
  }, [])

  return { ready, done, band, lockedBand, setBand }
}
