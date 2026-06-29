// app/api/payment/create-order/route.ts — Razorpay order creation
// Authenticates the user, creates a one-time Razorpay order at the plan price,
// and returns the order details so the client can open Razorpay Checkout.

import type { NextRequest } from 'next/server'
import Razorpay from 'razorpay'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Plan → amount in paise (Razorpay smallest unit).
const PLAN_AMOUNT_PAISE: Record<'monthly' | 'yearly', number> = {
  monthly: 79900,   // ₹799
  yearly:  599900,  // ₹5,999
}

type PlanKey = keyof typeof PLAN_AMOUNT_PAISE
function isPlan(v: unknown): v is PlanKey {
  return v === 'monthly' || v === 'yearly'
}

export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!keyId || !keySecret || !publicKey) {
    return Response.json(
      { error: 'Payments are not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and NEXT_PUBLIC_RAZORPAY_KEY_ID.' },
      { status: 500 },
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to upgrade.' }, { status: 401 })

  let body: { plan?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!isPlan(body.plan)) {
    return Response.json({ error: 'Invalid plan. Use "monthly" or "yearly".' }, { status: 400 })
  }

  const amount = PLAN_AMOUNT_PAISE[body.plan]
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `r2bot_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan: body.plan,
      },
    })

    return Response.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      key: publicKey,
      plan: body.plan,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Razorpay order creation failed.'
    return Response.json({ error: msg }, { status: 502 })
  }
}
