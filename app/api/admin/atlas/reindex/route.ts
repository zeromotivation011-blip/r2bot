// app/api/admin/atlas/reindex/route.ts
//
// Trigger the Atlas index by hand. The same job also runs from the daily cron
// (see lib/atlas-index.ts for why it had to become automatic), so this is for
// when you have just edited a batch of entries and do not want to wait.
//
//   curl -X POST https://www.r2bot.in/api/admin/atlas/reindex \
//        -H "Authorization: Bearer $CRON_SECRET"
//
// ?dry=1        report what would be indexed, write nothing
// ?embed=0      rows only, skip embeddings
// ?embed=512    embed everything in one go rather than this run's budget

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readAtlasEntries, runAtlasIndex } from '@/lib/atlas-index'
import { isCronAuthorized } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return (data?.role as string | undefined) === 'admin'
}

function hasCronSecret(req: NextRequest): boolean {
  return isCronAuthorized(req.headers.get('authorization'))
}

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req) && !(await isAdmin())) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const params = new URL(req.url).searchParams

  if (params.get('dry') === '1') {
    const entries = readAtlasEntries()
    return Response.json({
      ok: true,
      dry: true,
      found: entries.length,
      willEmbed: Boolean(process.env.OPENAI_API_KEY),
      sample: entries.slice(0, 3).map((e) => `${e.type}/${e.slug}`),
    })
  }

  const embedParam = params.get('embed')
  const result = await runAtlasIndex(
    embedParam === null ? {} : { embedLimit: Math.max(0, Number(embedParam) || 0) },
  )
  return Response.json(result, { status: result.ok ? 200 : 207 })
}
