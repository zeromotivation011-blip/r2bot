// lib/supabase/types-b2b.ts — TypeScript types for the institution tier.
// Schema lives in supabase/migrations/0028_b2b_institutions.sql.
// No UI consumes these yet — kept here so the schema and code drift together.

export type InstitutionType = 'college' | 'school' | 'company'
export type InstitutionPlan = 'starter' | 'professional' | 'enterprise'
export type InstitutionStatus = 'active' | 'expired' | 'trial'

export interface Institution {
  id: string
  name: string
  type: InstitutionType
  contact_email: string
  contact_name: string | null
  plan: InstitutionPlan
  student_limit: number
  subscription_start: string | null // ISO timestamp
  subscription_end: string | null
  razorpay_order_id: string | null
  status: InstitutionStatus
  created_at: string
}

export type InstitutionMemberRole = 'admin' | 'teacher' | 'student'

export interface InstitutionMember {
  id: string
  institution_id: string
  user_id: string
  role: InstitutionMemberRole
  joined_at: string
}

export interface InstitutionInvite {
  id: string
  institution_id: string
  email: string
  role: InstitutionMemberRole
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
}

// Insert shapes — `id`, `created_at`, and other defaulted columns are optional.
export type InstitutionInsert = Omit<Institution, 'id' | 'created_at' | 'plan' | 'student_limit' | 'status'> & {
  plan?: InstitutionPlan
  student_limit?: number
  status?: InstitutionStatus
}

export type InstitutionMemberInsert = Omit<InstitutionMember, 'id' | 'joined_at'>

export type InstitutionInviteInsert = Omit<InstitutionInvite, 'id' | 'created_at' | 'used_at'> & {
  used_at?: string | null
}
