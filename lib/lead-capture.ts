// lib/lead-capture.ts
//
// THE single place an email address enters R2BOT. Every form on the site —
// the homepage digest box, the news page, the post-quiz inline signup, the
// footer, the schools form — goes through captureLead().
//
// Why this exists: there used to be two capture endpoints. /api/leads logged
// the event, created the person, subscribed them and sent a welcome within
// seconds. /api/news/subscribe (used by the homepage, our highest-volume form)
// inserted a row and sent nothing — the first thing a new subscriber heard from
// us arrived up to 48 hours later, from the daily cron. That is the worst
// possible moment to go quiet, so both routes now call this function.
//
// Three writes, in order of importance:
//   1. public.lead_events — append-only. Every signal kept forever, with the
//      page and source that produced it. This is the write that must not fail.
//   2. public.leads — one row per person (unique on lower(email)). A returning
//      person is enriched, never discarded.
//   3. public.newsletter_subscribers — the send list.
// Then, and only for a person we have never seen: a welcome email, immediately.

import { BASE_URL, button, renderEmail } from '@/lib/email-layout'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Where the address came from. Unknown values are normalised to 'popup'. */
export const LEAD_SOURCES = [
  'popup',
  'newsletter', // generic inline/footer box
  'home-digest', // homepage R2BOT Weekly block
  'news', // /news page
  'lesson-quiz', // after a correct Quick Lesson answer — highest intent
  'course-waitlist', // a course whose videos are not recorded yet
  'academy-waitlist',
  'schools-interest',
  'footer',
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]
const KNOWN = new Set<string>(LEAD_SOURCES)

/**
 * Throwaway-inbox domains. Blocking these keeps the list (and our Resend
 * sender reputation) clean. Deliberately short: over-blocking costs real
 * subscribers, which is worse than the odd disposable address.
 */
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'yopmail.com', 'trashmail.com', 'getnada.com',
  'throwawaymail.com', 'sharklasers.com', 'dispostable.com', 'maildrop.cc',
])

// ── Rate limiting ──────────────────────────────────────────────────────────
// In-memory, therefore per-instance: a speed bump against casual form spam,
// not a WAF. Combined with the honeypot below it stops scripted submissions.
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key)
    }
  }
  return recent.length > RATE_LIMIT
}

export interface CaptureInput {
  email?: string
  name?: string
  page?: string | null
  source?: string
  meta?: Record<string, unknown>
  userAgent?: string | null
  ip?: string
  /** Hidden form field. A real person leaves it empty; bots fill it in. */
  honeypot?: string
  /** Cookie header, read for the referral code only. */
  cookie?: string | null
}

export interface CaptureResult {
  ok: boolean
  status: number
  error?: string
  /** True when this address had never been captured before. */
  isNew?: boolean
}

/** First name only, for the greeting. Empty string when we have no name. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

// ── Welcome email — sent within seconds, never blocks the capture ──────────
async function sendWelcome(email: string, source: string, name: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return

  const isWaitlist = source === 'academy-waitlist' || source === 'course-waitlist'
  const hi = firstName(name)
  try {
    let token = ''
    try {
      const { data } = await createSupabaseAdminClient()
        .from('newsletter_subscribers')
        .select('unsubscribe_token')
        .eq('email', email)
        .maybeSingle()
      token = String(data?.unsubscribe_token ?? '')
    } catch {
      /* link falls back to the unsubscribe page */
    }

    const intro = isWaitlist
      ? '<p>You are on the list. I will email you the day this course opens, and nothing in between.</p>'
      : '<p>Thanks for joining. Once a week you get one useful robotics email: what is new, what is worth reading, nothing else.</p>'

    const html = renderEmail({
      preheader: isWaitlist
        ? 'I will email you the day it opens.'
        : 'One useful robotics email a week. Start with a one-minute lesson.',
      heading: isWaitlist
        ? hi ? `You're on the list, ${hi}` : "You're on the list"
        : hi ? `Welcome to R2BOT, ${hi}` : 'Welcome to R2BOT',
      bodyHtml: `${intro}
        <p>While you wait, the fastest way in is a one-minute lesson: watch, play with the demo, answer one question.</p>
        ${button('Start a one-minute lesson', `${BASE_URL}/shorts`)}
        <p style="margin-top:18px">Or go deeper: the <a href="${BASE_URL}/courses" style="color:#FC6818">free course path</a> (short videos, quizzes, certificates) and the <a href="${BASE_URL}/atlas" style="color:#FC6818">Atlas</a> (every robotics idea in plain English).</p>`,
      unsubscribeUrl: `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`,
    })
    const { Resend } = await import('resend')
    await new Resend(apiKey).emails.send({
      from,
      to: email,
      html,
      subject: isWaitlist ? "You're on the list | R2BOT" : 'Welcome to R2BOT — start here',
    })
  } catch {
    // A failed welcome email must never cost us the lead.
  }
}

export async function captureLead(input: CaptureInput): Promise<CaptureResult> {
  // A filled honeypot is a bot. Answer 200 so it learns nothing, write nothing.
  if ((input.honeypot ?? '').trim() !== '') return { ok: true, status: 200, isNew: false }

  if (rateLimited(input.ip || 'unknown')) {
    return { ok: false, status: 429, error: 'Too many requests. Please try again in a minute.' }
  }

  const email = (input.email || '').trim().toLowerCase()
  const name = (input.name || '').trim()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email.' }
  }
  if (DISPOSABLE.has(email.split('@')[1] ?? '')) {
    return { ok: false, status: 400, error: 'Please use an email address you actually read.' }
  }

  const source = KNOWN.has(input.source || '') ? (input.source as string) : 'popup'
  const page = input.page || null
  const userAgent = input.userAgent || null
  const meta = (input.meta && typeof input.meta === 'object' ? { ...input.meta } : {}) as Record<string, unknown>
  const refMatch = (input.cookie || '').match(/(?:^|;\s*)r2ref=([A-Za-z0-9]{4,16})/)
  if (refMatch) meta.ref = refMatch[1]

  // Prefer the service-role client so a returning lead can be enriched. If the
  // key is absent, fall back to the anon client rather than throwing: both
  // tables have an anonymous INSERT policy, so we still capture the email and
  // only skip the enrichment UPDATE. Losing a lead to a missing env var is
  // never an acceptable outcome.
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const supabase = hasServiceRole ? createSupabaseAdminClient() : await createSupabaseServerClient()

  const { error: eventErr } = await supabase.from('lead_events').insert({
    email, name: name || null, source, page, meta, user_agent: userAgent,
  })
  if (eventErr) return { ok: false, status: 500, error: eventErr.message }

  const { error: leadErr } = await supabase.from('leads').insert({
    email, name: name || null, source, page, meta, user_agent: userAgent,
  })

  let isNew = true
  if (leadErr) {
    if (leadErr.code === '23505') {
      isNew = false
      if (hasServiceRole) {
        // Known already — enrich, never overwrite. Only fill blanks, so a
        // later anonymous submission cannot wipe a name we already have.
        const { data: existing } = await supabase
          .from('leads').select('name').eq('email', email).maybeSingle()
        await supabase
          .from('leads')
          .update({ name: existing?.name || name || null, last_seen: new Date().toISOString() })
          .eq('email', email)
      }
    } else {
      return { ok: false, status: 500, error: leadErr.message }
    }
  }

  // Send list. A duplicate here is expected and fine.
  await supabase
    .from('newsletter_subscribers')
    .insert({ email, source })
    .then(() => undefined, () => undefined)

  // Record that the welcome has gone out, so the daily automation never sends a
  // second one. Best-effort: if email_log is missing we would rather send twice
  // than not at all.
  if (isNew) {
    await supabase
      .from('email_log')
      .insert({ email, kind: 'welcome-0' })
      .then(() => undefined, () => undefined)
    await sendWelcome(email, source, name)
  }

  return { ok: true, status: 200, isNew }
}

/** Best-effort client IP, for the rate limiter only. Never stored. */
export function clientIpFrom(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0] : null)?.trim() || headers.get('x-real-ip') || 'unknown'
}
