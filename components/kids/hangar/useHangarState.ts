'use client'

// components/kids/hangar/useHangarState.ts
// One hook that reads everything the Hangar shows — progress, robot design and
// Hangar looks — and keeps it fresh when any of them changes (in this tab via
// their events, in other tabs via the storage event). Returns `ready: false`
// on the server and the first client render, so the server HTML and the first
// paint match and numbers never flash a made-up value.

import { useEffect, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT, type KidsProgress } from '@/lib/kids-progress'
import { DEFAULT_DESIGN, loadDesign, ROBOT_CHANGED_EVENT, type RobotDesign } from '@/lib/kids/robot-design'
import { EMPTY_COSMETICS, HANGAR_CHANGED_EVENT, loadCosmetics, ownedOnly, type HangarCosmetics } from './cosmetics'

export interface HangarState {
  ready: boolean
  progress: KidsProgress
  design: RobotDesign
  cosmetics: HangarCosmetics
}

export function useHangarState(): HangarState {
  const [state, setState] = useState<HangarState>(() => ({
    ready: false,
    progress: { ...getProgress(), ...BLANK },
    design: { ...DEFAULT_DESIGN },
    cosmetics: { ...EMPTY_COSMETICS },
  }))

  useEffect(() => {
    const read = () => {
      const progress = getProgress()
      setState({ ready: true, progress, design: loadDesign(), cosmetics: ownedOnly(loadCosmetics(), progress) })
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('r2bot_kids')) read()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener(ROBOT_CHANGED_EVENT, read)
    window.addEventListener(HANGAR_CHANGED_EVENT, read)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener(ROBOT_CHANGED_EVENT, read)
      window.removeEventListener(HANGAR_CHANGED_EVENT, read)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return state
}

/**
 * The fields the Hangar renders, at their defaults. The first render (server
 * and client alike) uses these so hydration matches; real values arrive in the
 * effect a frame later, behind `ready`.
 */
const BLANK: Partial<KidsProgress> = {
  xp: 0,
  badges: {},
  unlocks: [],
  personalBests: {},
  sessionsDone: {},
  playDays: [],
  explorerName: '',
}
