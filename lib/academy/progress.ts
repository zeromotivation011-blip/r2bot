'use client'

// lib/academy/progress.ts
// Client-side progress tracking. Local-first (localStorage), with a Supabase
// sync hook ready when the migration is applied. All progress reads/writes go
// through this file so we can swap the backing store without touching UI.

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'r2bot_academy_v2'

export interface BlockRecord {
  blockId: string
  lessonId: string
  completed: boolean
  score?: number
  responseData?: unknown
  completedAt?: string
}

export interface LessonRecord {
  lessonId: string
  courseId: string
  startedAt: string
  completedAt?: string
  bestScore: number
  attempts: number
  timeSpentSec: number
  xpEarned: number
}

export interface AcademyProgressState {
  enrollments: Record<string, { courseId: string; enrolledAt: string; isPaid: boolean }>
  lessons: Record<string, LessonRecord>            // keyed by lessonId
  blocks: Record<string, BlockRecord>              // keyed by blockId
  xp: number
  streakDays: number
  lastActiveAt?: string
}

const DEFAULT_STATE: AcademyProgressState = {
  enrollments: {},
  lessons: {},
  blocks: {},
  xp: 0,
  streakDays: 0,
}

function readState(): AcademyProgressState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function writeState(s: AcademyProgressState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* quota / private mode */
  }
}

// ─── Imperative helpers (callable from anywhere) ───────────────────────────

export function getAcademyProgress(): AcademyProgressState {
  return readState()
}

export function enrollLocally(courseId: string, isPaid = false): void {
  const s = readState()
  if (!s.enrollments[courseId]) {
    s.enrollments[courseId] = {
      courseId,
      enrolledAt: new Date().toISOString(),
      isPaid,
    }
    writeState(s)
  }
}

export function isEnrolled(courseId: string): boolean {
  return Boolean(readState().enrollments[courseId])
}

export function getBlockRecord(blockId: string): BlockRecord | null {
  return readState().blocks[blockId] ?? null
}

export function getLessonRecord(lessonId: string): LessonRecord | null {
  return readState().lessons[lessonId] ?? null
}

export function recordBlockResult(input: {
  blockId: string
  lessonId: string
  courseId: string
  score?: number
  responseData?: unknown
  completed: boolean
}): void {
  const s = readState()
  s.blocks[input.blockId] = {
    blockId: input.blockId,
    lessonId: input.lessonId,
    completed: input.completed,
    score: input.score,
    responseData: input.responseData,
    completedAt: input.completed ? new Date().toISOString() : undefined,
  }
  // Ensure the lesson record exists
  if (!s.lessons[input.lessonId]) {
    s.lessons[input.lessonId] = {
      lessonId: input.lessonId,
      courseId: input.courseId,
      startedAt: new Date().toISOString(),
      bestScore: 0,
      attempts: 0,
      timeSpentSec: 0,
      xpEarned: 0,
    }
  }
  s.lastActiveAt = new Date().toISOString()
  writeState(s)
}

export function completeLesson(input: {
  lessonId: string
  courseId: string
  finalScore: number
  xpReward: number
}): { xpAdded: number; alreadyCompleted: boolean } {
  const s = readState()
  const existing = s.lessons[input.lessonId]
  const alreadyCompleted = Boolean(existing?.completedAt)
  const previousBest = existing?.bestScore ?? 0
  const bestScore = Math.max(previousBest, input.finalScore)

  // Only award XP the first time the lesson is completed
  const xpAdded = alreadyCompleted ? 0 : input.xpReward

  s.lessons[input.lessonId] = {
    lessonId: input.lessonId,
    courseId: input.courseId,
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    completedAt: existing?.completedAt ?? new Date().toISOString(),
    bestScore,
    attempts: (existing?.attempts ?? 0) + 1,
    timeSpentSec: existing?.timeSpentSec ?? 0,
    xpEarned: (existing?.xpEarned ?? 0) + xpAdded,
  }
  s.xp = (s.xp ?? 0) + xpAdded
  s.lastActiveAt = new Date().toISOString()
  writeState(s)
  return { xpAdded, alreadyCompleted }
}

export function getCourseProgressPct(courseId: string, totalLessons: number): number {
  if (totalLessons === 0) return 0
  const s = readState()
  const done = Object.values(s.lessons).filter(
    l => l.courseId === courseId && l.completedAt,
  ).length
  return Math.round((done / totalLessons) * 100)
}

// ─── React hook ────────────────────────────────────────────────────────────

export function useAcademyProgress() {
  const [state, setState] = useState<AcademyProgressState>(() => DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(readState())
    setHydrated(true)
  }, [])

  const refresh = useCallback(() => {
    setState(readState())
  }, [])

  return { state, hydrated, refresh }
}
