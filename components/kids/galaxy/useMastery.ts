'use client'

// components/kids/galaxy/useMastery.ts
// The child's concept mastery in the browser: the evidence log, secured days and
// Launch Check start points from the ONE progress store (lib/kids-progress.ts),
// plus every concept's state for today. Re-reads on KIDS_PROGRESS_EVENT and on
// storage changes from other tabs.

import { useEffect, useMemo, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { conceptStates, todayLocal, type ConceptState, type ConceptTry } from '@/lib/kids/universe/mastery'
import { startsFrom } from '@/lib/kids/activities/pacing'
import type { TrackStarts } from '@/lib/kids/activities/progress'

export interface MasteryView {
  ready: boolean
  log: ConceptTry[]
  secured: Record<string, string>
  starts: TrackStarts
  /** Every concept, in CONCEPT_IDS order, for today. */
  states: ConceptState[]
  today: string
}

const EMPTY_LOG: ConceptTry[] = []

export function useMastery(): MasteryView {
  const [ready, setReady] = useState(false)
  const [log, setLog] = useState<ConceptTry[]>(EMPTY_LOG)
  const [secured, setSecured] = useState<Record<string, string>>({})
  const [rawStarts, setRawStarts] = useState<Record<string, string>>({})
  const [today, setToday] = useState('')

  useEffect(() => {
    const read = () => {
      const p = getProgress()
      setLog(Array.isArray(p.conceptLog) ? p.conceptLog : EMPTY_LOG)
      setSecured(p.conceptSecured ?? {})
      setRawStarts(p.galaxyStart ?? {})
      setToday(todayLocal())
      setReady(true)
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'r2bot_kids_v2') read()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const starts = useMemo(() => startsFrom(rawStarts), [rawStarts])
  const states = useMemo(() => (ready ? conceptStates({ conceptLog: log, conceptSecured: secured }, today) : []), [ready, log, secured, today])
  return { ready, log, secured, starts, states, today }
}
