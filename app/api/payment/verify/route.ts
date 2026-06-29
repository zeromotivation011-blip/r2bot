// app/api/payment/verify/route.ts — Razorpay signature verification
// Confirms the payment is authentic, then inserts an active subscription row.
//
// Razorpay signs (order_id + "|" + payment_id) with HMAC-SHA256 keyed by
// RAZORPAY_KEY_SECRET; we recompute and constant-time-compare.

import type { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PERIOD_DAYS: Record<'monthly' | 'yearly', number> = {
  monthly: 30,
  yearly:  365,
}

type PlanKey = keyof typeof PERIOD_DAYS
function isPlan(v: unknown): v is PlanKey {
  return v === 'monthly' || v === 'yearly'
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    return Response.json({ error: 'Payments not configured.' }, { status: 500 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to verify payment.' }, { status: 401 })

  let body: {
    razorpay_order_id?: unknown
    razorpay_payment_id?: unknown
    razorpay_signature?: unknown
    plan?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const orderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : ''
  const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : ''
  const signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : ''
  if (!orderId || !paymentId || !signature) {
    return Response.json({ error: 'Missing payment fields.' }, { status: 400 })
  }
  if (!isPlan(body.plan)) {
    return Response.json({ error: 'Missing or invalid plan.' }, { status: 400 })
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  if (!timingSafeEqualHex(expected, signature)) {
    return Response.json({ error: 'Signature verification failed.' }, { status: 400 })
  }

  const days = PERIOD_DAYS[body.plan]
  const currentPeriodEnd = new Date(Date.now() + days * 86_400_000).toISOString()

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('subscriptions').insert({
    user_id: user.id,
    plan: body.plan,
    status: 'active',
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    current_period_end: currentPeriodEnd,
  })

  if (error) {
    return Response.json({ error: `Could not record subscription: ${error.message}` }, { status: 500 })
  }

  return Response.json({ success: true, currentPeriodEnd })
}
