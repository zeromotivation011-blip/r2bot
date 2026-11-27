'use client'

// components/kids/classroom/KidsClassSyncClient.tsx
//
// Mounted once in the Kids shell. When — and only when — this browser has
// joined a class (/kids/join), it sends a compact progress snapshot to
// /api/kids/sync: once on load, then ~5 s after the last progress or robot
// change, and on page hide if a change is still waiting. No Supabase in the
// browser, nothing at all for a child who has not joined a class.
//
// Renders nothing by default. Pass `showPill` to render a small "Class: 7B ✓"
// pill wherever it is placed (e.g. inside the kids nav).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { ROBOT_CHANGED_EVENT } from '@/lib/kids/robot-design'
import {
  KIDS_CLASS_EVENT,
  loadMembership,
  syncMembership,
} from '@/lib/kids/classroom-membership'
import { KIDS_CLASS_DIARY_EVENT, noteClassWork } from '@/lib/kids/classroom-diary'
import { REWARD_EVENT, type RewardResult } from '@/lib/kids/universe/rewards'

const DEBOUNCE_MS = 5000

export interface KidsClassSyncProps {
  showPill?: boolean
}

export function KidsClassSync({ showPill = false }: KidsClassSyncProps) {
  const [className, setClassName] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    const refreshName = () => setClassName(loadMembership()?.className ?? null)
    refreshName()

    const flush = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      if (!pending.current) return
      pending.current = false
      if (!loadMembership()) return
      void syncMembership(true).then(refreshName)
    }

    const schedule = () => {
      if (!loadMembership()) return
      pending.current = true
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, DEBOUNCE_MS)
    }

    // Once on load.
    if (loadMembership()) {
      pending.current = true
      flush()
    }

    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    // Class Power-Up diary (roadmap #40): each finished thing counts once a day.
    // noteClassWork fires KIDS_CLASS_DIARY_EVENT, which schedules the sync.
    const onReward = (e: Event) => {
      const r = (e as CustomEvent<RewardResult>).detail
      if (r && typeof r.kind === 'string' && typeof r.id === 'string') noteClassWork(r.kind, r.id)
    }

    window.addEventListener(KIDS_PROGRESS_EVENT, schedule)
    window.addEventListener(KIDS_CLASS_DIARY_EVENT, schedule)
    window.addEventListener(REWARD_EVENT, onReward)
    window.addEventListener(ROBOT_CHANGED_EVENT, schedule)
    window.addEventListener(KIDS_CLASS_EVENT, refreshName)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, schedule)
      window.removeEventListener(KIDS_CLASS_DIARY_EVENT, schedule)
      window.removeEventListener(REWARD_EVENT, onReward)
      window.removeEventListener(ROBOT_CHANGED_EVENT, schedule)
      window.removeEventListener(KIDS_CLASS_EVENT, refreshName)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (!showPill || !className) return null
  return (
    <Link
      href="/kids/join"
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/25"
      title="You are in a class. Tap to see what is shared."
    >
      <span className="max-w-[9rem] truncate">Class: {className}</span>
      <span aria-hidden>✓</span>
    </Link>
  )
}

export default KidsClassSync
