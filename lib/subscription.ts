// lib/subscription.ts — Pro subscription gating
// Used by API routes and Server Components to check if a user is on Pro.

import { createSupabaseAdminClient } from '@/lib/supabase/server'

// Re-export the free-course helpers so server callers have a single import.
export { FREE_COURSES, isFreeCourse } from '@/lib/free-courses'

export type Plan = 'monthly' | 'yearly'

export interface SubscriptionStatus {
  isPro: boolean
  plan: Plan | null
  currentPeriodEnd: string | null
}

const FREE: SubscriptionStatus = { isPro: false, plan: null, currentPeriodEnd: null }

export async function getUserSubscription(userId: string | null | undefined): Promise<SubscriptionStatus> {
  if (!userId) return FREE

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return FREE

  return {
    isPro: true,
    plan: data.plan as Plan,
    currentPeriodEnd: data.current_period_end as string,
  }
}
