// app/api/community/like/[id]/route.ts — Increment a build's like count.
// No auth required (likes are anonymous). The browser remembers what it has
// liked in localStorage; the server adds two real guards: one like per IP per
// build per 24 hours, and a per-IP ceiling, both on the shared rate limiter.
// The increment itself is one atomic UPDATE (increment_likes, migration 0052)
// with the old read-then-write as a fallback until that migration has run.

import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { clientIp, isRateLimited } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params { params: Promise<{ id: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isMissingFunction(code: string | undefined): boolean {
  return code === '42883' || code === 'PGRST202'
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  if (!id || typeof id !== 'string' || !UUID.test(id)) {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }

  const ip = clientIp(req.headers)
  if (await isRateLimited({ scope: 'like:ip', subject: ip, windowSeconds: 3600, max: 30 })) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const admin = createSupabaseAdminClient()

  // One like per IP per build per day. A repeat is answered with the current
  // count and `duplicate: true`, not an error, so the UI stays calm.
  if (await isRateLimited({ scope: 'like:item', subject: `${id}|${ip}`, windowSeconds: 86_400, max: 1 })) {
    const { data } = await admin
      .from('community_builds').select('likes').eq('id', id).eq('status', 'published').maybeSingle()
    if (!data) return Response.json({ error: 'Build not found.' }, { status: 404 })
    return Response.json({ success: true, duplicate: true, likes: data.likes ?? 0 })
  }

  // Atomic path.
  const { data: likes, error } = await admin.rpc('increment_likes', { p_id: id })
  if (!error) {
    if (likes === null || likes === undefined) return Response.json({ error: 'Build not found.' }, { status: 404 })
    return Response.json({ success: true, likes: Number(likes) })
  }
  if (!isMissingFunction(error.code)) return Response.json({ error: error.message }, { status: 500 })

  // Fallback (migration 0052 not applied yet): the old read-then-write.
  const { data, error: readErr } = await admin
    .from('community_builds')
    .select('likes')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  if (readErr || !data) {
    return Response.json({ error: 'Build not found.' }, { status: 404 })
  }
  const nextLikes = (data.likes ?? 0) + 1
  const { error: updErr } = await admin.from('community_builds').update({ likes: nextLikes }).eq('id', id)
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 })
  return Response.json({ success: true, likes: nextLikes })
}
