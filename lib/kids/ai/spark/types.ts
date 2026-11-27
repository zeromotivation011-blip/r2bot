// lib/kids/ai/spark/types.ts
// Shared shapes for Ask Spark, the kid-safe robotics mentor of R2BOT Kids.
// Pure types — safe on server and client.

import type { BandId } from '../../bands'

/** What another screen can tell Spark when the child asks for help there. */
export interface SparkContext {
  /** What the child is working on, e.g. "Wall Stopper — distance sensor". */
  topic?: string
  /** A short, readable summary of the child's program (block names, not code). */
  programSummary?: string
  /** Why the last run failed, in plain words, e.g. "robot hit the wall". */
  failureReason?: string
}

export type SparkMode = 'ask' | 'hint'

export interface SparkRequest {
  question: string
  band: BandId
  mode: SparkMode
  context?: SparkContext
}

export type SparkLinkKind = 'atlas' | 'activity' | 'game' | 'world' | 'session'

export interface SparkLink {
  kind: SparkLinkKind
  label: string
  href: string
  emoji: string
}

/**
 * Where an answer came from:
 *  - ai       the model, grounded with R2BOT's own content
 *  - faq      Spark's built-in notebook (no AI, no cost)
 *  - hint     the rule-based hint engine (no AI)
 *  - safety   a kind refusal for an unsafe or personal question
 *  - unknown  nothing matched; Spark suggests questions it can answer
 */
export type SparkSource = 'ai' | 'faq' | 'hint' | 'safety' | 'unknown'

export interface SparkReply {
  answer: string
  source: SparkSource
  /** "Show me" links — only ever R2BOT pages chosen by the server, never model-written URLs. */
  links: SparkLink[]
  /** Up to three questions Spark can answer next. */
  followUps: string[]
  /** One short line shown above the answer (e.g. "Answer from Spark's notebook"). */
  note?: string
  /**
   * The child told Spark something serious (being hurt, scared of someone,
   * asked for photos, bullied, wanting to hurt themselves, very sad). The app
   * shows the region-aware helpline card under the answer. Such a message is
   * never sent to the AI.
   */
  crisis?: boolean
  /** The language the safety answer is written in ('en' when absent). */
  lang?: 'en' | 'hi' | 'es'
}

export const SPARK_MAX_QUESTION = 300
export const SPARK_MAX_CONTEXT = 400
