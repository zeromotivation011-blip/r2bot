// lib/kids/ai/spark/offline.ts
// The no-AI answer engine: safety replies, notebook answers and rule-based
// hints. The server uses it whenever the AI is off or capped (and for strong
// notebook matches, so common questions cost nothing); the browser uses it
// directly when the device is offline or the server cannot be reached.
//
// Light on purpose (no activity content imported) so the client can load it.

import { BAND_ORDER, type BandId } from '../../bands'
import { faqAnswer, followUpsFor, matchFaq, WEAK_MATCH } from './match'
import { ruleHint } from './hints'
import { cleanChildText, cleanContextText, PRIVACY_REMINDER, SAFETY_REPLIES, unsafeCategory } from './safety'
import type { SparkContext, SparkLink, SparkMode, SparkReply } from './types'

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (/^(imu|pid|ros|ros2|ai|dc|slam|uav)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Atlas link for a notebook entry, only for children old enough for the Atlas (11+). */
export function atlasLinkFor(slug: string | undefined, band: BandId): SparkLink | null {
  if (!slug || BAND_ORDER.indexOf(band) < BAND_ORDER.indexOf('inventors')) return null
  return { kind: 'atlas', label: `Read: ${titleFromSlug(slug)}`, href: `/atlas/concept/${slug}`, emoji: '📖' }
}

export interface CleanedRequest {
  question: string
  context: SparkContext
  removedPersonal: boolean
}

export function cleanRequest(question: unknown, context: unknown): CleanedRequest {
  const q = cleanChildText(question)
  const c = (context && typeof context === 'object' ? context : {}) as Record<string, unknown>
  const ctx: SparkContext = {}
  const topic = cleanContextText(c.topic)
  const programSummary = cleanContextText(c.programSummary)
  const failureReason = cleanContextText(c.failureReason)
  if (topic) ctx.topic = topic
  if (programSummary) ctx.programSummary = programSummary
  if (failureReason) ctx.failureReason = failureReason
  return { question: q.text, context: ctx, removedPersonal: q.removedPersonal }
}

/** A safety reply when the question (or its context) is not for Spark; else null. */
export function safetyReply(question: string, context: SparkContext, band: BandId): SparkReply | null {
  const cat = unsafeCategory(`${question} ${context.topic ?? ''} ${context.failureReason ?? ''}`)
  if (!cat) return null
  return {
    answer: SAFETY_REPLIES[cat],
    source: 'safety',
    links: [],
    followUps: followUpsFor('', null, band),
  }
}

const UNKNOWN_YOUNG =
  "Hmm, that one isn't in my notebook yet! I know lots about robots, sensors, motors, coding, drones, space robots and AI. Try one of these questions:"
const UNKNOWN_OLDER =
  "That one isn't in my notebook. I can explain robot sensors, motors and gears, coding, control (like PID), maps and navigation, AI, and robots in space, oceans, farms and hospitals. Try one of these:"

/** The full offline answer: safety → hint → notebook → "try these". */
export function offlineReply(question: string, context: SparkContext, band: BandId, mode: SparkMode): SparkReply {
  const safe = safetyReply(question, context, band)
  if (safe) return safe

  if (mode === 'hint') {
    const top = matchFaq(`${context.topic ?? ''} ${context.failureReason ?? ''} ${question}`, 1)[0]
    const link = top && top.score >= 0.4 ? atlasLinkFor(top.faq.atlas, band) : null
    return {
      answer: ruleHint(context, band),
      source: 'hint',
      links: link ? [link] : [],
      followUps: ['How do I fix my program?', 'What is a loop in coding?', 'What is an if/else?'],
    }
  }

  const [best] = matchFaq(question, 1)
  if (best && best.score >= WEAK_MATCH) {
    const link = atlasLinkFor(best.faq.atlas, band)
    return {
      answer: faqAnswer(best.faq, band),
      source: 'faq',
      links: link ? [link] : [],
      followUps: followUpsFor(question, best.faq.id, band),
    }
  }

  const older = BAND_ORDER.indexOf(band) >= BAND_ORDER.indexOf('inventors')
  return {
    answer: older ? UNKNOWN_OLDER : UNKNOWN_YOUNG,
    source: 'unknown',
    links: [],
    followUps: followUpsFor(question, null, band),
  }
}

export function withPrivacyNote(reply: SparkReply, removedPersonal: boolean): SparkReply {
  return removedPersonal ? { ...reply, note: reply.note ? `${reply.note} ${PRIVACY_REMINDER}` : PRIVACY_REMINDER } : reply
}
