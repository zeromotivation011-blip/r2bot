'use client'

// components/kids/galaxy/useGalaxyState.ts
// The child's Skill Galaxy state in the browser: finished activities (from
// lib/kids/activities/progress.ts) and their age band (from the one progress
// store). Re-reads on KIDS_PROGRESS_EVENT and on storage changes from other tabs.

import { useCallback, useEffect, useState } from 'react'
import { getProgress, saveProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { ACTIVITIES_KEY, getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import type { BandId } from '@/lib/kids/bands'

export interface GalaxyState {
  /** False until localStorage has been read (render a neutral state before). */
  ready: boolean
  done: ActivitiesDone
  band: BandId | null
  setBand: (b: BandId) => void
}

export function useGalaxyState(): GalaxyState {
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState<ActivitiesDone>({})
  const [band, setBandState] = useState<BandId | null>(null)

  useEffect(() => {
    const read = () => {
      setDone(getActivitiesDone())
      setBandState(getProgress().band)
      setReady(true)
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === ACTIVITIES_KEY || e.key === 'r2bot_kids_v2') read()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setBand = useCallback((b: BandId) => {
    saveProgress({ band: b })
    setBandState(b)
  }, [])

  return { ready, done, band, setBand }
}
