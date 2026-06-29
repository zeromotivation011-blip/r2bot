'use client'

// lib/kids-voice.ts
// Global voice mode for Robot World. Default ON.
// Persisted in localStorage under r2bot_kids_voice ('true' | 'false').

import { useCallback, useEffect, useState } from 'react'
import { sparkSays, cancelSparkSpeech } from './kids-audio'

const STORAGE_KEY = 'r2bot_kids_voice'

function readInitial(): boolean {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw !== 'false' // default true (any non-'false' value -> on)
}

export interface KidsVoiceApi {
  voiceOn: boolean
  speak: (text: string, onDone?: () => void) => void
  toggle: () => void
  cancel: () => void
}

export function useKidsVoice(): KidsVoiceApi {
  const [voiceOn, setVoiceOn] = useState<boolean>(() => readInitial())

  // Re-read on mount in case state was set before hydration finished.
  useEffect(() => {
    setVoiceOn(readInitial())
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

  const toggle = useCallback(() => {
    setVoiceOn(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        /* noop — private mode etc. */
      }
      if (!next) cancelSparkSpeech()
      return next
    })
  }, [])

  return { voiceOn, speak, toggle, cancel }
}

// Imperative helpers for non-React contexts (rare in kids zone).
export function readVoicePref(): boolean {
  return readInitial()
}

export function writeVoicePref(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(on))
  } catch {
    /* noop */
  }
}
