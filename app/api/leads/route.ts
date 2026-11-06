// app/api/leads/route.ts
//
// The single capture endpoint for every email on the site: the site-wide
// popup, the Academy course waitlist, and the Schools pilot form all POST here.
//
// Two writes happen on every submission:
//   1. public.lead_events — append-only. Every signal is kept, forever, with
//      the context that produced it. Nothing is ever deduplicated away.
//   2. public.leads       — one row per person (unique on lower(email)).
//      A returning person is enriched (name/last_seen), not discarded.
//
// The second write uses the service-role client on purpose: enriching an
// existing row would otherwise require an anonymous UPDATE policy, which would
// let any visitor overwrite any other person's record. See migration 0036.

import type { NextRequest } from 'next/server'
import { BASE_URL, button, renderEmail } from '@/lib/email-layout'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Accepts +, spaces, dashes, parens; requires 8–15 digits.

const KNOWN_SOURCES = new Set([
  'popup',
  'academy-waitlist',
  'schools-interest',
  'newsletter',
  'footer',
])

// ── Rate limiting ──────────────────────────────────────────────────────────
// In-memory and therefore per-instance: this is a speed bump against casual
// form-spam, not a real WAF. If abuse becomes a genuine problem, move this to
// Upstash/Redis so the limit is shared across serverless instances.
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key)
    }
  }
  return recent.length > RATE_LIMIT
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0] : null)?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

// ── Welcome email (best-effort, never blocks the capture) ──────────────────
async function sendWelcome(email: string, source: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return

  const isWaitlist = source === 'academy-waitlist'
  try {
    let token = ''
    try {
      const { data } = await createSupabaseAdminClient()
        .from('newsletter_subscribers').select('unsubscribe_token').eq('email', email).maybeSingle()
      token = String(data?.unsubscribe_token ?? '')
    } catch { /* link falls back to the unsubscribe page */ }
    const html = renderEmail({
      preheader: 'Free robotics learning, one useful email a week.',
      heading: isWaitlist ? "You're on the list" : 'Welcome to R2BOT',
      bodyHtml: `<p>${isWaitlist
        ? "You're on the waitlist. We'll email you the moment this course opens. Nothing in between."
        : 'Thanks for joining. Once a week we send one useful robotics email: what is new, what is worth reading, nothing else.'}</p>
        <p>Two good places to start:</p>
        <p><a href="${BASE_URL}/courses" style="color:#FC6818">The free course path</a>: five short courses with quizzes and certificates.<br>
        <a href="${BASE_URL}/atlas" style="color:#FC6818">The Atlas</a>: every robotics idea in plain English.</p>${button('Start learning', `${BASE_URL}/courses`)}`,
      unsubscribeUrl: `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`,
    })
    const { Resend } = await import('resend')
    await new Resend(apiKey).emails.send({
      from, to: email, html,
      subject: isWaitlist ? "You're on the list | R2BOT" : 'Welcome to R2BOT',
    })
  } catch {
    // A failed welcome email must never cost us the lead.
  }
}

type Payload = {
  email?: string
  name?: string
  page?: string
  source?: string
  meta?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(clientIp(req))) {
      return Response.json(
        { ok: false, error: 'Too many requests. Please try again in a minute.' },
        { status: 429 },
      )
    }

    const body = (await req.json().catch(() => ({}))) as Payload
    const email = (body.email || '').trim().toLowerCase()
    const name = (body.name || '').trim()

    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 })
    }

    const source = KNOWN_SOURCES.has(body.source || '') ? (body.source as string) : 'popup'
    const page = body.page || null
    const userAgent = req.headers.get('user-agent') || null
    const meta = (body.meta && typeof body.meta === 'object' ? body.meta : {}) as Record<string, unknown>

    // Prefer the service-role client so a returning lead can be enriched.
    // If the key is absent, fall back to the anon client rather than throwing:
    // both tables have an anonymous INSERT policy, so we still capture the
    // email — we just skip the enrichment UPDATE. Losing a lead is never an
    // acceptable outcome of a missing env var.
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    const supabase = hasServiceRole
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient()

    // 1. Append-only event log. This is the write that must not fail silently.
    const { error: eventErr } = await supabase.from('lead_events').insert({
      email,
      name: name || null,
      source,
      page,
      meta,
      user_agent: userAgent,
    })
    if (eventErr) {
      return Response.json({ ok: false, error: eventErr.message }, { status: 500 })
    }

    // 2. Person record. Insert, or enrich if we have seen them before.
    const { error: leadErr } = await supabase.from('leads').insert({
      email,
      name: name || null,
      source,
      page,
      meta,
      user_agent: userAgent,
    })

    let isNewPerson = true
    if (leadErr) {
      if (leadErr.code === '23505') {
        // Already known — enrich rather than discard. Only fill blanks, so a
        // later anonymous popup submission can't wipe a name we already have.
        // Requires the service-role client; without it the event log above has
        // already preserved the signal, which is the part that matters.
        isNewPerson = false
        if (!hasServiceRole) return Response.json({ ok: true })

        const { data: existing } = await supabase
          .from('leads')
          .select('name')
          .eq('email', email)
          .maybeSingle()

        await supabase
          .from('leads')
          .update({
            name: existing?.name || name || null,
            last_seen: new Date().toISOString(),
          })
          .eq('email', email)
      } else {
        return Response.json({ ok: false, error: leadErr.message }, { status: 500 })
      }
    }

    // 3. Newsletter. Duplicates are expected and fine.
    await supabase
      .from('newsletter_subscribers')
      .insert({ email, source })
      .then(() => undefined, () => undefined)

    // 4. Welcome email — only the first time we meet someone.
    if (isNewPerson) await sendWelcome(email, source)

    return Response.json({ ok: true })
  } catch (e: unknown) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
