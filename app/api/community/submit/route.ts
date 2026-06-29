// app/api/community/submit/route.ts — Community gallery: submit a build
// Auth required. Inserts into community_builds.

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_DESC = 500
const MAX_TAGS = 8

function isValidUrl(s: unknown): s is string {
  if (typeof s !== 'string' || s.length === 0) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to share your build.' }, { status: 401 })

  let body: {
    projectSlug?: unknown
    title?: unknown
    description?: unknown
    imageUrl?: unknown
    githubUrl?: unknown
    videoUrl?: unknown
    tags?: unknown
  }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  const projectSlug = typeof body.projectSlug === 'string' ? body.projectSlug.trim().slice(0, 80) : null
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > 120) {
    return Response.json({ error: 'Title is required and must be 120 chars or fewer.' }, { status: 400 })
  }
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > MAX_DESC) {
    return Response.json({ error: `Description must be ${MAX_DESC} characters or fewer.` }, { status: 400 })
  }
  const imageUrl = body.imageUrl ? (isValidUrl(body.imageUrl) ? body.imageUrl : null) : null
  if (body.imageUrl && !imageUrl) return Response.json({ error: 'Image URL is invalid.' }, { status: 400 })
  const githubUrl = body.githubUrl ? (isValidUrl(body.githubUrl) ? body.githubUrl : null) : null
  if (body.githubUrl && !githubUrl) return Response.json({ error: 'GitHub URL is invalid.' }, { status: 400 })
  const videoUrl = body.videoUrl ? (isValidUrl(body.videoUrl) ? body.videoUrl : null) : null
  if (body.videoUrl && !videoUrl) return Response.json({ error: 'Video URL is invalid.' }, { status: 400 })

  const rawTags = Array.isArray(body.tags) ? body.tags : []
  const tags = rawTags
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim().toLowerCase().slice(0, 24))
    .filter((t) => t.length > 0)
    .slice(0, MAX_TAGS)

  // Description in the existing schema is NOT NULL; supply a space-padded
  // placeholder when the user leaves it blank so the row still inserts.
  const descriptionForDb = description.length > 0 ? description : '—'

  const { data, error } = await supabase
    .from('community_builds')
    .insert({
      user_id: user.id,
      project_slug: projectSlug,
      title,
      description: descriptionForDb,
      image_url: imageUrl,
      github_url: githubUrl,
      video_url: videoUrl,
      tags,
      status: 'published',
    })
    .select('id')
    .single()

  if (error || !data) {
    return Response.json({ error: error?.message || 'Could not save your build.' }, { status: 500 })
  }
  return Response.json({ success: true, buildId: data.id })
}
