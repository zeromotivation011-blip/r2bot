// app/api/kids/classroom/catalogue/route.ts
//
// Everything a teacher can assign (Level 1 sessions, Skill Galaxy activities,
// Universe games) as light rows for the assignment picker. Public course
// content only — no user data — so it is built once and cached.

import { getCatalogue } from '@/lib/kids/teach/catalogue'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

export function GET(): Response {
  return Response.json({ ok: true, ...getCatalogue() }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
