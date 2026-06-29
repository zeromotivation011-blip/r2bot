// lib/academy/spaced-repetition.ts
// SM-2 algorithm + local-first review queue. When the Supabase migration is
// live, this same shape can sync to the `review_queue` table.

export interface ReviewItem {
  lessonId: string
  courseSlug: string
  lessonTitle: string
  nextReviewAt: number          // epoch ms
  intervalDays: number
  easeFactor: number            // SM-2 EF
  repetitions: number
  lastScore?: number
  lastReviewedAt?: number
}

const KEY = 'r2bot_academy_review_queue_v1'
const DAY = 86_400_000

function readQueue(): Record<string, ReviewItem> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
function writeQueue(q: Record<string, ReviewItem>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(KEY, JSON.stringify(q)) } catch { /* noop */ }
}

/**
 * SM-2 update. `quality` is 0..5 (0 = blackout, 5 = perfect).
 * Returns the next-state ReviewItem (does NOT mutate).
 */
export function applySm2(item: ReviewItem, quality: number): ReviewItem {
  const q = Math.max(0, Math.min(5, Math.floor(quality)))
  let { repetitions, intervalDays, easeFactor } = item

  if (q < 3) {
    repetitions = 0
    intervalDays = 1
  } else {
    if (repetitions === 0) intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else intervalDays = Math.round(intervalDays * easeFactor)
    repetitions += 1
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  )

  return {
    ...item,
    repetitions,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    lastScore: q * 20,             // store as 0–100 for UI
    lastReviewedAt: Date.now(),
    nextReviewAt: Date.now() + intervalDays * DAY,
  }
}

export function scheduleReview(input: {
  lessonId: string
  courseSlug: string
  lessonTitle: string
  quality: number
}): ReviewItem {
  const q = readQueue()
  const existing = q[input.lessonId]
  const base: ReviewItem = existing ?? {
    lessonId: input.lessonId,
    courseSlug: input.courseSlug,
    lessonTitle: input.lessonTitle,
    nextReviewAt: Date.now() + DAY,
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
  }
  const next = applySm2(base, input.quality)
  q[input.lessonId] = { ...next, courseSlug: input.courseSlug, lessonTitle: input.lessonTitle }
  writeQueue(q)
  return next
}

export function getItemsDueForReview(now: number = Date.now()): ReviewItem[] {
  const q = readQueue()
  return Object.values(q)
    .filter(item => item.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
}

export function getAllReviewItems(): ReviewItem[] {
  return Object.values(readQueue())
}

export function removeReviewItem(lessonId: string): void {
  const q = readQueue()
  delete q[lessonId]
  writeQueue(q)
}
