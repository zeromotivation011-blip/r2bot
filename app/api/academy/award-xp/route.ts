// app/api/academy/award-xp/route.ts — Award XP for completing a lesson, once per lesson.
// The XP amount comes from the lesson's own frontmatter (trusted), never from the client,
// and public.award_xp_once() pays each (user, lesson) at most once.

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAcademyLesson } from '@/lib/academy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TRACKS = ['spark', 'wire', 'forge', 'edge'] as const
type Track = (typeof TRACKS)[number]

function isTrack(s: unknown): s is Track {
  return typeof s === 'string' && (TRACKS as readonly string[]).includes(s)
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ok: false, error: 'Sign in to earn XP.' }, { status: 401 })

  let body: { track?: unknown; lessonSlug?: unknown }
  try { body = await req.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 }) }

  const track = body.track
  const lessonSlug = typeof body.lessonSlug === 'string' ? body.lessonSlug.trim() : ''
  if (!isTrack(track) || !/^[a-z0-9][a-z0-9-]{0,120}$/.test(lessonSlug)) {
    return Response.json({ ok: false, error: 'Invalid lesson.' }, { status: 400 })
  }

  const lesson = getAcademyLesson(track, lessonSlug)
  if (!lesson) return Response.json({ ok: false, error: 'Lesson not found.' }, { status: 404 })

  const xp = Math.min(1000, Math.max(0, Math.floor(lesson.xp ?? 0)))
  if (xp === 0) return Response.json({ ok: true, awarded: 0 })

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('award_xp_once', {
    p_user: user.id,
    p_key: `lesson:${track}/${lessonSlug}`,
    p_amount: xp,
  })
  if (error) return Response.json({ ok: false, error: 'Could not award XP.' }, { status: 500 })

  return Response.json({ ok: true, awarded: typeof data === 'number' ? data : 0 })
}
