// lib/kids/ai/spark/open.ts
// Open Ask Spark from anywhere in R2BOT Kids. Any screen can ask for a hint
// about the current activity without importing the sheet:
//
//   import { openSpark } from '@/lib/kids/ai/spark/open'
//   openSpark({ topic: 'Wall Stopper', programSummary: 'move 5, turn right', failureReason: 'robot hit the wall' })
//
// With a failureReason (or programSummary) Spark opens in hint mode and gives
// ONE hint, never the full answer. With nothing, it opens for free questions.
// <AskSparkClient/> must be mounted (the kids shell does it); if it is not,
// the call does nothing.

import type { SparkContext } from './types'

export const OPEN_SPARK_EVENT = 'r2bot:kids-open-spark'

export interface OpenSparkDetail extends SparkContext {
  /** Optional question to ask straight away. */
  question?: string
}

export function openSpark(detail: OpenSparkDetail = {}): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent<OpenSparkDetail>(OPEN_SPARK_EVENT, { detail }))
  } catch {
    /* ignore */
  }
}
