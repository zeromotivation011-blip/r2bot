// app/api/kids/classroom/insights-catalogue/route.ts
//
// The words behind the teacher's Gradebook, Class Mind Map and "where to help"
// signals: activity, session and game names, concepts, and every misconception
// a course check can reveal with its correction and reteach. Public course
// content only — no user data — so it is built once and cached.

import { getInsightCatalogue } from '@/lib/kids/classroom-insights-server'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

export function GET(): Response {
  return Response.json({ ok: true, catalogue: getInsightCatalogue() }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
