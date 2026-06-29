// app/api/community/like/[id]/route.ts — Increment a build's like count.
// No auth required (likes are anonymous). Client uses localStorage to
// prevent double-liking; we trust that for now and may add IP-throttling later.

import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  if (!id || typeof id !== 'string' || id.length > 64) {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }

  // Use admin client to bypass RLS — likes is an "increment" semantic, not a row
  // owned by any specific user. No-Op if the row doesn't exist.
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('community_builds')
    .select('likes')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  if (error || !data) {
    return Response.json({ error: 'Build not found.' }, { status: 404 })
  }

  const nextLikes = (data.likes ?? 0) + 1
  const { error: updErr } = await admin
    .from('community_builds')
    .update({ likes: nextLikes })
    .eq('id', id)

  if (updErr) return Response.json({ error: updErr.message }, { status: 500 })
  return Response.json({ success: true, likes: nextLikes })
}
