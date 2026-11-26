// app/api/kids/spark/route.ts
// POST /api/kids/spark — Ask Spark, the kid-safe robotics mentor of R2BOT Kids.
//
// Order of work, cheapest first:
//   1. Validate + clean (length caps; links, emails, phone numbers and
//      self-identifying phrases removed). Nothing the child types is stored or
//      logged — only hashed rate-limit counters exist.
//   2. Safety: unsafe or personal topics get a kind, fixed reply. No model call.
//   3. Notebook: a strong match in the local FAQ is answered from it. No model call.
//   4. AI (only when KIDS_AI_ENABLED === 'true' and the key is set, and the
//      per-IP daily cap is not reached): Claude Haiku, fixed system prompt,
//      grounded with R2BOT's own content, max_tokens 300, 12 s timeout, no retries.
//   5. Anything else — AI off, capped, failed or unsafe output — falls back to
//      the notebook / rule-based hints, so Spark always helps for free.
//
// The client sends ids and data only (band, mode, question, context fields);
// it can never change the system prompt (CLAUDE.md §6).

import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { BAND_ORDER, type BandId } from '@/lib/kids/bands'
import { anyRateLimited, clientIp, isRateLimited } from '@/lib/rate-limit'
import { cleanRequest, offlineReply, safetyReply, withPrivacyNote } from '@/lib/kids/ai/spark/offline'
import { faqAnswer, followUpsFor, matchFaq, STRONG_MATCH } from '@/lib/kids/ai/spark/match'
import { retrieve, toLink } from '@/lib/kids/ai/spark/retrieve'
import { sparkSystemPrompt, sparkUserMessage } from '@/lib/kids/ai/spark/prompt'
import { EMAIL_RE, unsafeAnswer, URL_RE } from '@/lib/kids/ai/spark/safety'
import type { SparkLink, SparkMode, SparkReply } from '@/lib/kids/ai/spark/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const MAX_BODY_BYTES = 4_000
/** Model calls per IP per day. The notebook and hints are not capped by this. */
const AI_DAILY_CAP = 20
/** Any requests per IP per minute (notebook included) — stops scripted floods. */
const BURST_PER_MINUTE = 20
const MAX_TOKENS = 300
const AI_TIMEOUT_MS = 12_000
// Cheapest Haiku already used in this repo (lib/news.ts, lib/lens-live.ts).
// KIDS_AI_MODEL may override it, but only with another Haiku, so a typo in
// the environment can never put children's traffic on an expensive model.
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

function model(): string {
  const m = process.env.KIDS_AI_MODEL?.trim()
  return m && /^claude-haiku-[a-z0-9-]+$/.test(m) ? m : DEFAULT_MODEL
}

function aiEnabled(): boolean {
  return process.env.KIDS_AI_ENABLED === 'true' && Boolean(process.env.ANTHROPIC_API_KEY)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function isBand(v: unknown): v is BandId {
  return typeof v === 'string' && (BAND_ORDER as string[]).includes(v)
}

/**
 * Model output hygiene: plain text, sane length, SHOW: line removed. An answer
 * that contains a link or an email address is not repaired (removing them
 * leaves broken sentences like "email me at for more"): it is rejected, and
 * the notebook answers instead.
 */
function tidyAnswer(raw: string): { text: string; show: number | null } {
  let show: number | null = null
  const m = raw.match(/\n?\s*SHOW:\s*(none|\d+)\s*$/i)
  let text = raw
  if (m) {
    show = /^\d+$/.test(m[1]) ? Number(m[1]) : null
    text = raw.slice(0, m.index)
  }
  URL_RE.lastIndex = 0
  EMAIL_RE.lastIndex = 0
  if (URL_RE.test(text) || EMAIL_RE.test(text) || /\bSHOW:/i.test(text)) {
    URL_RE.lastIndex = 0
    EMAIL_RE.lastIndex = 0
    return { text: '', show: null }
  }
  text = text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length > 900) {
    const cut = text.slice(0, 900)
    text = `${cut.slice(0, Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? ')) + 1) || cut}`
  }
  return { text, show }
}

export async function POST(req: NextRequest): Promise<Response> {
  const len = Number(req.headers.get('content-length') ?? '0')
  if (len > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413)

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413)

  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: 'bad_request' }, 400)
    body = parsed as Record<string, unknown>
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const band: BandId = isBand(body.band) ? body.band : 'builders'
  const mode: SparkMode = body.mode === 'hint' ? 'hint' : 'ask'
  const { question, context, removedPersonal } = cleanRequest(body.question, body.context)
  if (!question && mode === 'ask') return json({ error: 'empty' }, 400)

  const ip = clientIp(req.headers)
  if (await isRateLimited({ scope: 'kids-spark:burst', subject: ip, windowSeconds: 60, max: BURST_PER_MINUTE })) {
    return json({ error: 'slow_down' }, 429)
  }

  // 2. Safety first — never sent to the model.
  const safe = safetyReply(question, context, band)
  if (safe) return json(withPrivacyNote(safe, removedPersonal))

  const docs = retrieve(`${question} ${context.topic ?? ''}`, band, 4)
  const links: SparkLink[] = docs
    .map((d) => toLink(d.doc))
    .filter((l): l is SparkLink => l !== null)
    .slice(0, 2)

  // 3. Strong notebook match: free, instant, already reviewed.
  if (mode === 'ask') {
    const [best] = matchFaq(question, 1)
    if (best && best.score >= STRONG_MATCH) {
      const reply: SparkReply = {
        answer: faqAnswer(best.faq, band),
        source: 'faq',
        links,
        followUps: followUpsFor(question, best.faq.id, band),
      }
      return json(withPrivacyNote(reply, removedPersonal))
    }
  }

  // 5. Fallback, shared by every path below.
  const fallback = (note?: string): Response => {
    const off = offlineReply(question, context, band, mode)
    const merged: SparkReply = {
      ...off,
      answer:
        off.source === 'unknown' && links.length
          ? "That one isn't in my notebook yet — but R2BOT Kids has something to explore about it. Tap Show me, or try one of these questions:"
          : off.answer,
      links: dedupeLinks([...links, ...off.links]).slice(0, 3),
      note,
    }
    return json(withPrivacyNote(merged, removedPersonal))
  }

  if (!aiEnabled()) return fallback()

  // 4. AI, within the daily cap (counted only when the model would be called).
  const capped = await anyRateLimited([{ scope: 'kids-spark:ai-day', subject: ip, windowSeconds: 86_400, max: AI_DAILY_CAP }])
  if (capped) return fallback("Spark's thinking cap is resting until tomorrow, so this answer is from Spark's notebook.")

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create(
      {
        model: model(),
        max_tokens: MAX_TOKENS,
        system: sparkSystemPrompt(band, mode),
        messages: [{ role: 'user', content: sparkUserMessage(question, mode, context, docs) }],
      },
      { timeout: AI_TIMEOUT_MS, maxRetries: 0 },
    )
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
    const { text: answer, show } = tidyAnswer(text)
    if (!answer || unsafeAnswer(answer)) return fallback()

    const shown = show && docs[show - 1] ? toLink(docs[show - 1].doc) : null
    const chosen = shown ? [shown] : []
    const reply: SparkReply = {
      answer,
      source: 'ai',
      links: dedupeLinks([...chosen, ...links]).slice(0, 3),
      followUps: mode === 'hint' ? ['How do I fix my program?', 'What is a loop in coding?'] : followUpsFor(question, null, band),
    }
    return json(withPrivacyNote(reply, removedPersonal))
  } catch (err) {
    // Log the failure kind only — never the child's words.
    const status = err instanceof Anthropic.APIError ? err.status : 'network'
    console.error('[kids-spark] model call failed:', status)
    return fallback()
  }
}

function dedupeLinks(list: SparkLink[]): SparkLink[] {
  const seen = new Set<string>()
  return list.filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true)))
}
