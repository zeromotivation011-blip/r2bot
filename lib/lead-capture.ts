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
// Then an email, immediately: a short "confirm your address" message for a
// new subscriber (double opt-in, migration 0052), or the welcome once they have
// confirmed. Nobody is put on the send list by a third party typing their
// address into a form.

import { BASE_URL, button, renderEmail } from '@/lib/email-layout'
import { isRateLimited } from '@/lib/rate-limit'
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
// Shared Postgres counter (lib/rate-limit.ts), falling back to in-memory until
// migration 0052 has run. Per IP and per address, so a script cannot sign one
// victim up over and over from many addresses either.
const IP_RULE = { scope: 'leads:ip', windowSeconds: 3600, max: 5 }
const EMAIL_RULE = { scope: 'leads:email', windowSeconds: 86_400, max: 3 }

/** Keep `meta` small: at most 10 keys and 2 KB serialised. */
const META_MAX_KEYS = 10
const META_MAX_BYTES = 2048

function capMeta(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const out: Record<string, unknown> = {}
  let size = 2
  for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, META_MAX_KEYS)) {
    if (k.length > 40) continue
    let val: unknown = v
    if (typeof val === 'string' && val.length > 500) val = val.slice(0, 500)
    let piece = ''
    try { piece = JSON.stringify({ [k]: val }) ?? '' } catch { continue }
    if (size + piece.length > META_MAX_BYTES) break
    size += piece.length
    out[k] = val
  }
  return out
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
  /** True when a confirmation email was sent instead of the welcome. */
  pendingConfirmation?: boolean
}

/** First name only, for the greeting. Empty string when we have no name. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

// ── Welcome email — sent within seconds, never blocks the capture ──────────
export async function sendWelcome(email: string, source: string, name: string): Promise<void> {
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

// ── Confirmation email — double opt-in ─────────────────────────────────────
// Deliberately plain and short: one sentence, one button. It carries no
// user-supplied text, so there is nothing for a third party to make us say.
async function sendConfirmation(email: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !token) return false
  const confirmUrl = `${BASE_URL}/api/confirm?token=${encodeURIComponent(token)}`
  try {
    const html = renderEmail({
      preheader: 'One click and you are in.',
      heading: 'Confirm your email',
      bodyHtml: `<p>Someone — hopefully you — asked for R2BOT's free robotics emails at this address. Click once to confirm; if it was not you, ignore this and nothing more will be sent.</p>
        ${button('Confirm my email', confirmUrl)}
        <p style="font-size:13px;color:#64748b">The button not working? Copy this link: <a href="${confirmUrl}" style="color:#64748b">${confirmUrl}</a></p>`,
      unsubscribeUrl: `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`,
    })
    const { Resend } = await import('resend')
    const { error } = await new Resend(apiKey).emails.send({
      from, to: email, html, subject: 'Confirm your email | R2BOT',
    })
    return !error
  } catch {
    return false
  }
}

/**
 * Subscriber state after the insert. `confirmed` is true pre-migration (no
 * column), when we cannot read the row (anon client), and when confirmed_at is
 * set — in every one of those cases the old behaviour (welcome at once) is right.
 */
async function subscriberState(
  sb: ReturnType<typeof createSupabaseAdminClient>, email: string,
): Promise<{ confirmed: boolean; token: string }> {
  try {
    const { data, error } = await sb
      .from('newsletter_subscribers')
      .select('confirmed_at, unsubscribe_token')
      .eq('email', email)
      .maybeSingle()
    if (error) {
      // 42703: column does not exist — migration 0052 not applied yet.
      return { confirmed: true, token: '' }
    }
    if (!data) return { confirmed: true, token: '' }
    const row = data as { confirmed_at?: string | null; unsubscribe_token?: string | null }
    return { confirmed: row.confirmed_at != null, token: String(row.unsubscribe_token ?? '') }
  } catch {
    return { confirmed: true, token: '' }
  }
}

export async function captureLead(input: CaptureInput): Promise<CaptureResult> {
  // A filled honeypot is a bot. Answer 200 so it learns nothing, write nothing.
  if ((input.honeypot ?? '').trim() !== '') return { ok: true, status: 200, isNew: false }

  if (await isRateLimited({ ...IP_RULE, subject: input.ip || 'unknown' })) {
    return { ok: false, status: 429, error: 'Too many requests. Please try again later.' }
  }

  const email = (input.email || '').trim().toLowerCase()
  const name = (input.name || '').trim().slice(0, 80)
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email.' }
  }
  if (DISPOSABLE.has(email.split('@')[1] ?? '')) {
    return { ok: false, status: 400, error: 'Please use an email address you actually read.' }
  }
  if (await isRateLimited({ ...EMAIL_RULE, subject: email })) {
    return { ok: false, status: 429, error: 'This address has been submitted too often today. Check your inbox.' }
  }

  const source = KNOWN.has(input.source || '') ? (input.source as string) : 'popup'
  const page = input.page || null
  const userAgent = input.userAgent || null
  const meta = capMeta(input.meta)
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

  // Funnel counter: an email was captured, and from which form. Aggregate
  // only — the counter records the source, never the address.
  await supabase
    .rpc('track_event', { p_event: `lead:${source}` })
    .then(() => undefined, () => undefined)

  // Send list. A duplicate here is expected and fine.
  await supabase
    .from('newsletter_subscribers')
    .insert({ email, source })
    .then(() => undefined, () => undefined)

  // Double opt-in (migration 0052). A subscriber who has not clicked the
  // confirmation link gets that link — never the welcome, never the digest.
  // Before the migration, or without the service role, `confirmed` is true and
  // the welcome goes out as before.
  const state = hasServiceRole
    ? await subscriberState(supabase as ReturnType<typeof createSupabaseAdminClient>, email)
    : { confirmed: true, token: '' }

  if (!state.confirmed) {
    // At most one confirmation email per address per day, however many forms
    // are submitted — a stranger cannot use us to pester someone.
    const throttled = await isRateLimited({ scope: 'leads:confirm', subject: email, windowSeconds: 86_400, max: 1 })
    if (!throttled) await sendConfirmation(email, state.token)
    return { ok: true, status: 200, isNew, pendingConfirmation: true }
  }

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

/**
 * Called by /api/confirm when the link is clicked. Marks the subscriber
 * confirmed (and active again, if they had unsubscribed), then sends the
 * welcome once. Returns what happened so the page can say the right thing.
 */
export async function confirmSubscriber(
  token: string,
): Promise<'confirmed' | 'already' | 'unknown' | 'unavailable'> {
  if (!token || token.length > 80 || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 'unavailable'
  const sb = createSupabaseAdminClient()
  const { data, error } = await sb
    .from('newsletter_subscribers')
    .update({ confirmed_at: new Date().toISOString(), active: true, unsubscribed_at: null })
    .eq('unsubscribe_token', token)
    .is('confirmed_at', null)
    .select('email, source')
    .maybeSingle()
  if (error) {
    // 42703: migration not applied; everyone is implicitly confirmed.
    return error.code === '42703' ? 'already' : 'unavailable'
  }
  if (!data) {
    const { data: existing } = await sb
      .from('newsletter_subscribers').select('email').eq('unsubscribe_token', token).maybeSingle()
    return existing ? 'already' : 'unknown'
  }
  const email = String(data.email)
  const source = String(data.source ?? 'newsletter')
  const { data: lead } = await sb.from('leads').select('name').eq('email', email).maybeSingle()
  const { error: logErr } = await sb.from('email_log').insert({ email, kind: 'welcome-0' })
  // email_log (email, kind) is unique: if the insert fails the welcome has
  // already gone out, so do not send it twice.
  if (!logErr) await sendWelcome(email, source, String(lead?.name ?? ''))
  return 'confirmed'
}

/** Best-effort client IP, for the rate limiter only. Never stored. */
export function clientIpFrom(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0] : null)?.trim() || headers.get('x-real-ip') || 'unknown'
}
