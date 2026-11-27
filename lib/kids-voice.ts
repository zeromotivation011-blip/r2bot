'use client'

// lib/kids-voice.ts
// Global voice mode for Robot World. Default ON.
// Persisted in localStorage under r2bot_kids_voice ('true' | 'false').

import { useCallback, useEffect, useState } from 'react'
import { sparkSays, cancelSparkSpeech } from './kids-audio'
import { KIDS_SETTINGS_EVENT } from './kids/settings-boot'
import { updateKidsSettings } from './kids/settings'

const STORAGE_KEY = 'r2bot_kids_voice'

function readInitial(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false' // default true (any non-'false' value -> on)
  } catch {
    return true
  }
}

export interface KidsVoiceApi {
  voiceOn: boolean
  speak: (text: string, onDone?: () => void) => void
  toggle: () => void
  cancel: () => void
}

export function useKidsVoice(): KidsVoiceApi {
  const [voiceOn, setVoiceOn] = useState<boolean>(true)

  // Re-read on mount in case state was set before hydration finished, and stay in
  // step with the Settings page (same tab: KIDS_SETTINGS_EVENT; other tabs: storage).
  useEffect(() => {
    setVoiceOn(readInitial())
    const sync = () => setVoiceOn(readInitial())
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) sync()
    }
    window.addEventListener(KIDS_SETTINGS_EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_SETTINGS_EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Stop pending speech if user navigates away.
  useEffect(() => {
    return () => {
      cancelSparkSpeech()
    }
  }, [])

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!voiceOn) {
        onDone?.()
        return
      }
      sparkSays(text, onDone)
    },
    [voiceOn],
  )

  const cancel = useCallback(() => {
    cancelSparkSpeech()
  }, [])

  // Through the Settings store, so its subscribers (read-aloud, the Settings
  // page, quest cards) follow the header button at once.
  const toggle = useCallback(() => {
    const next = !readInitial()
    updateKidsSettings({ voice: next })
    if (!next) cancelSparkSpeech()
    setVoiceOn(next)
  }, [])

  return { voiceOn, speak, toggle, cancel }
}

// Imperative helpers for non-React contexts (rare in kids zone).
export function readVoicePref(): boolean {
  return readInitial()
}

export function writeVoicePref(on: boolean): void {
  if (typeof window === 'undefined') return
  updateKidsSettings({ voice: on })
}
