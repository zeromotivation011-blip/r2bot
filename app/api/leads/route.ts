// app/api/leads/route.ts
//
// The single capture endpoint for every email on the site: the site-wide
// popup, the Academy course waitlist, and the Schools pilot form all POST here.
//
// Two writes happen on every submission:
//   1. public.lead_events — append-only. Every signal is kept, forever, with
//      the context that produced it. Nothing is ever deduplicated away.
//   2. public.leads       — one row per person (unique on lower(email)).
//      A returning person is enriched (name/phone/last_seen), not discarded.
//
// The second write uses the service-role client on purpose: enriching an
// existing row would otherwise require an anonymous UPDATE policy, which would
// let any visitor overwrite any other person's record. See migration 0036.

import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Accepts +, spaces, dashes, parens; requires 8–15 digits.
function validPhone(p: string): boolean {
  const digits = p.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

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
  const subject = isWaitlist
    ? "You're on the list — R2BOT"
    : 'Welcome to R2BOT 🤖'
  const intro = isWaitlist
    ? "You're on the waitlist. We'll email you the moment this course opens — no spam in between."
    : "Thanks for joining. Once a week we send one genuinely useful robotics email — what shipped, what's worth reading, nothing else."

  try {
    const { Resend } = await import('resend')
    await new Resend(apiKey).emails.send({
      from,
      to: email,
      subject,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f172a">
          <h1 style="font-size:22px;margin:0 0 16px">${isWaitlist ? "You're on the list" : 'Welcome to R2BOT'}</h1>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px">${intro}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 24px">
            While you wait, the two best places to start:<br>
            <a href="https://www.r2bot.in/atlas" style="color:#f59e0b">The Atlas</a> — every robotics concept, explained clearly.<br>
            <a href="https://www.r2bot.in/visualizer" style="color:#f59e0b">The Simulators</a> — ten interactive tools, no setup.
          </p>
          <p style="font-size:13px;color:#64748b;margin:0">
            You can <a href="https://www.r2bot.in/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:#64748b">unsubscribe</a> any time.
          </p>
        </div>`,
    })
  } catch {
    // A failed welcome email must never cost us the lead.
  }
}

type Payload = {
  email?: string
  name?: string
  phone?: string
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
    const phone = (body.phone || '').trim()
    const name = (body.name || '').trim()

    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 })
    }
    if (phone && !validPhone(phone)) {
      return Response.json({ ok: false, error: 'Please enter a valid phone number.' }, { status: 400 })
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
      phone: phone || null,
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
      phone: phone || null,
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
          .select('name, phone')
          .eq('email', email)
          .maybeSingle()

        await supabase
          .from('leads')
          .update({
            name: existing?.name || name || null,
            phone: existing?.phone || phone || null,
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
