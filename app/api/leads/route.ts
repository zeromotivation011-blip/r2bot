// app/api/leads/route.ts
// Captures a lead from the site-wide popup, stores it, and auto-subscribes
// them to the weekly digest. Email is required; phone is optional.

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Accepts +, spaces, dashes, parens; requires at least 8 digits.
function validPhone(p: string): boolean {
  const digits = p.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      phone?: string
      page?: string
      source?: string
    }
    const email = (body.email || '').trim().toLowerCase()
    const phone = (body.phone || '').trim()

    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 })
    }
    // Phone is optional, but if one is given it must be valid.
    if (phone && !validPhone(phone)) {
      return Response.json({ ok: false, error: 'Please enter a valid phone number.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { error: leadErr } = await supabase.from('leads').insert({
      email,
      phone: phone || null,
      source: body.source || 'popup',
      page: body.page || null,
      user_agent: req.headers.get('user-agent') || null,
    })
    // 23505 = unique violation (already captured) — treat as success.
    if (leadErr && leadErr.code !== '23505') {
      return Response.json({ ok: false, error: leadErr.message }, { status: 500 })
    }

    // Automation: also add them to the weekly newsletter (ignore if already there).
    await supabase
      .from('newsletter_subscribers')
      .insert({ email, source: 'lead-popup' })
      .then(() => undefined, () => undefined)

    return Response.json({ ok: true })
  } catch (e: unknown) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
