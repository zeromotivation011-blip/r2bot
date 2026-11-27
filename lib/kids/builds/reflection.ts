// lib/kids/builds/reflection.ts
// Checks a teen's one-line reflection (Make It at Home check-ins and the
// portfolio) on the device before it is saved, with THE Spark classifier
// (classifySpark in lib/kids/ai/spark/safety.ts). Personal details, links and
// unkind words are refused kindly; a child saying they are hurt or unsafe gets
// `crisis: true` so the caller shows the helpline card, and nothing is saved.
// Pure: safe on the server, the client and in the verify script.

import { classifySpark, EMAIL_RE, isCrisis, URL_RE } from '../ai/spark/safety'

export const REFLECTION_MAX_CHARS = 140

export type ReflectionCheck =
  | { ok: true; text: string }
  | { ok: false; crisis: boolean; error: string }

const REFUSE = new Set(['personal', 'personal-data', 'adult', 'drugs', 'hate', 'rude', 'harm'])

export function checkReflection(raw: string): ReflectionCheck {
  const text = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (!text) return { ok: true, text: '' }
  if (text.length > REFLECTION_MAX_CHARS) return { ok: false, crisis: false, error: `One line only: ${REFLECTION_MAX_CHARS} letters at most.` }
  const cat = classifySpark(text)
  if (isCrisis(cat)) {
    return { ok: false, crisis: true, error: 'That sounds important, and you deserve help with it. Please tell a grown-up you trust. You can also talk to someone free, any time:' }
  }
  URL_RE.lastIndex = 0
  EMAIL_RE.lastIndex = 0
  const link = URL_RE.test(text) || EMAIL_RE.test(text)
  URL_RE.lastIndex = 0
  EMAIL_RE.lastIndex = 0
  if (link || cat === 'personal' || cat === 'personal-data') {
    return { ok: false, crisis: false, error: 'Keep it about your build: no names, places, links or contact details.' }
  }
  if (cat && REFUSE.has(cat)) return { ok: false, crisis: false, error: 'Let’s keep it kind and about your robot. Try saying what worked or what you would change.' }
  return { ok: true, text }
}
