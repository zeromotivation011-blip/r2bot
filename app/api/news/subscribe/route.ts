// app/api/news/subscribe/route.ts
// Newsletter signup for R2BOT Weekly — the weekly robotics digest.

import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string }
    const email = (body.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }

    // Server-only write (service role): the public INSERT policy on this table is being removed.
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, source: 'news' })

    // 23505 = unique violation — treat as success ("already subscribed")
    if (error && error.code !== '23505') {
      console.error('[news/subscribe] insert failed', error)
      return Response.json({ ok: false, error: 'Could not subscribe, please try again.' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e: unknown) {
    console.error('[news/subscribe] failed', e)
    return Response.json({ ok: false, error: 'Could not subscribe, please try again.' }, { status: 500 })
  }
}
