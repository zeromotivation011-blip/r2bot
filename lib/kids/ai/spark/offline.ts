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
import { guessLang, type SparkLang } from './lang'
import { classifySpark, cleanChildText, cleanContextText, isCrisis, PRIVACY_REMINDER, safetyAnswer, unsafeCategory, type UnsafeCategory } from './safety'
import { SPARK_MAX_QUESTION, type SparkContext, type SparkMode, type SparkReply } from './types'

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (/^(imu|pid|ros|ros2|ai|dc|slam|uav)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

// Spark never links to the Atlas (or anywhere outside /kids): the adult site
// has an email sign-up form. Notebook entries keep their Atlas slug only as
// grounding for the model. See ./live.ts.

export interface CleanedRequest {
  question: string
  context: SparkContext
  removedPersonal: boolean
  /** What the child's RAW words were classified as (before cleaning). */
  category: UnsafeCategory | null
  /** The language of the child's words, for safety answers. */
  lang: SparkLang
}

export function cleanRequest(question: unknown, context: unknown): CleanedRequest {
  const raw = typeof question === 'string' ? question.slice(0, SPARK_MAX_QUESTION * 2) : ''
  const q = cleanChildText(question)
  const c = (context && typeof context === 'object' ? context : {}) as Record<string, unknown>
  const ctx: SparkContext = {}
  const topic = cleanContextText(c.topic)
  const programSummary = cleanContextText(c.programSummary)
  const failureReason = cleanContextText(c.failureReason)
  if (topic) ctx.topic = topic
  if (programSummary) ctx.programSummary = programSummary
  if (failureReason) ctx.failureReason = failureReason
  const category = classifySpark(raw)
  return {
    question: q.text,
    context: ctx,
    removedPersonal: q.removedPersonal || category === 'personal-data',
    category,
    lang: guessLang(raw),
  }
}

/** The fixed, non-AI reply for a category. Crisis replies carry the helpline flag. */
export function categoryReply(cat: UnsafeCategory, band: BandId, lang: SparkLang = 'en'): SparkReply {
  const crisis = isCrisis(cat)
  return {
    answer: safetyAnswer(cat, lang, band === 'explorers'),
    source: 'safety',
    links: [],
    // After something serious, no robotics prompts: the child's next step is a grown-up.
    followUps: crisis ? [] : followUpsFor('', null, band),
    ...(crisis ? { crisis: true } : {}),
    ...(lang !== 'en' ? { lang } : {}),
  }
}

/**
 * A safety reply when the question (or its context) is not for Spark; else
 * null. Called BEFORE anything else on the server and on the device, so a
 * blocked message never reaches the model.
 */
export function safetyReply(req: CleanedRequest, band: BandId): SparkReply | null {
  const { question, context } = req
  // The raw words first (crisis words can sit next to a detail we strip).
  if (req.category && req.category !== 'personal-data') return categoryReply(req.category, band, req.lang)
  // Each field is checked on its own so one cannot hide words from another.
  const parts = [question, context.topic, context.programSummary, context.failureReason]
  const cat = parts.reduce<UnsafeCategory | null>((found, p) => found ?? (p ? unsafeCategory(p) : null), null)
  if (cat) return categoryReply(cat, band, req.lang)
  // Only a detail and hardly a question left: a kind privacy reminder, no answer.
  if (req.category === 'personal-data' && question.split(/\s+/).filter(Boolean).length < 3) return categoryReply('personal-data', band, req.lang)
  return null
}

/** True when a reply must not lead to a model call (every safety reply). */
export function blocksModel(reply: SparkReply | null): boolean {
  return reply !== null && reply.source === 'safety'
}

const UNKNOWN_YOUNG =
  "Hmm, that one isn't in my notebook yet! I know lots about robots, sensors, motors, coding, drones, space robots and AI. Try one of these questions:"
const UNKNOWN_OLDER =
  "That one isn't in my notebook. I can explain robot sensors, motors and gears, coding, control (like PID), maps and navigation, AI, and robots in space, oceans, farms and hospitals. Try one of these:"

/** The full offline answer: safety → hint → notebook → "try these". */
export function offlineReply(req: CleanedRequest, band: BandId, mode: SparkMode): SparkReply {
  const safe = safetyReply(req, band)
  if (safe) return safe
  const { question, context } = req

  if (mode === 'hint') {
    return {
      answer: ruleHint(context, band),
      source: 'hint',
      links: [],
      followUps: ['How do I fix my program?', 'What is a loop in coding?', 'What is an if/else?'],
    }
  }

  const [best] = matchFaq(question, 1)
  if (best && best.score >= WEAK_MATCH) {
    return {
      answer: faqAnswer(best.faq, band),
      source: 'faq',
      links: [],
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
  // A crisis answer stays uncluttered; a privacy answer already says it.
  if (reply.crisis || (reply.source === 'safety' && reply.answer === safetyAnswer('personal-data', reply.lang ?? 'en'))) return reply
  return removedPersonal ? { ...reply, note: reply.note ? `${reply.note} ${PRIVACY_REMINDER}` : PRIVACY_REMINDER } : reply
}
