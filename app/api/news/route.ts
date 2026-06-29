// app/api/news/route.ts — Pulse v2 (thin handler; logic lives in lib/news.ts)
import type { NextRequest } from 'next/server'
import { getNewsData } from '@/lib/news'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const payload = await getNewsData()
  return Response.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=600',
    },
  })
}
