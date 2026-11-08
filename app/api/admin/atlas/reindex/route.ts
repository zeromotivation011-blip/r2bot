// app/api/admin/atlas/reindex/route.ts
//
// Fill atlas_entries — the table the R2 Co-pilot retrieves from — from the MDX
// files in content/atlas/, with an embedding per entry.
//
// Why this exists: the table was EMPTY in production. Zero rows, zero
// embeddings. match_atlas_entries therefore returned nothing on every single
// Co-pilot question, so the Co-pilot has been answering purely from the
// model's general knowledge while the homepage, the nav and the about page all
// promise answers "grounded in the Atlas" that "cite their sources" and are
// "built not to invent specs". Spot-checking it: a good answer on steppers vs
// servos, not one citation, and one claim about holding torque that grounding
// would have caught.
//
// scripts/seed-atlas.ts does the same job but needs the service-role and
// OpenAI keys on the machine running it. This route runs on Vercel, where
// those keys already live, so it can be triggered with a curl and no secrets
// leave the environment.
//
//   curl -X POST https://www.r2bot.in/api/admin/atlas/reindex \
//        -H "Authorization: Bearer $CRON_SECRET"
//
// Re-run it after any batch of Atlas edits. It upserts on (type, slug), so
// running it twice is harmless. `?dry=1` reports what it would do.

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CONTENT_DIR = path.join(process.cwd(), 'content', 'atlas')
const EMBED_MODEL = 'text-embedding-3-small'
/** text-embedding-3-small tops out at 8191 tokens; stay well inside it. */
const MAX_EMBED_CHARS = 24000
const BATCH = 20

type SB = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function isAdmin(supabase: SB): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return (data?.role as string | undefined) === 'admin'
}

function hasCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

type Entry = {
  type: string
  slug: string
  title: string
  summary: string
  body_md: string
  category: string | null
  last_reviewed_at: string | null
}

function readEntries(): Entry[] {
  if (!fs.existsSync(CONTENT_DIR)) return []
  const out: Entry[] = []
  for (const type of fs.readdirSync(CONTENT_DIR)) {
    const dir = path.join(CONTENT_DIR, type)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue
      const raw = fs.readFileSync(path.join(dir, file), 'utf8')
      const { data, content } = matter(raw)
      const slug = file.replace(/\.mdx?$/, '')
      const reviewed = data.lastReviewed
      out.push({
        type,
        slug,
        title: String(data.title ?? slug),
        summary: String(data.summary ?? data.oneLiner ?? ''),
        body_md: content.trim(),
        category: data.category ? String(data.category) : null,
        last_reviewed_at:
          reviewed instanceof Date
            ? reviewed.toISOString().slice(0, 10)
            : typeof reviewed === 'string' && reviewed
              ? reviewed.slice(0, 10)
              : null,
      })
    }
  }
  return out
}

/** One request per batch rather than per entry: 512 entries is 26 calls. */
async function embedBatch(texts: string[], key: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts.map((t) => t.slice(0, MAX_EMBED_CHARS)) }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] }
  const ordered: number[][] = []
  for (const d of json.data) ordered[d.index] = d.embedding
  return ordered
}

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req)) {
    const supabase = await createSupabaseServerClient()
    if (!(await isAdmin(supabase))) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
  }

  const entries = readEntries()
  const dry = new URL(req.url).searchParams.get('dry') === '1'
  const openaiKey = process.env.OPENAI_API_KEY

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      found: entries.length,
      willEmbed: Boolean(openaiKey),
      sample: entries.slice(0, 3).map((e) => `${e.type}/${e.slug}`),
    })
  }

  if (entries.length === 0) {
    return Response.json(
      { ok: false, error: 'No Atlas MDX found. content/atlas must be traced into this function.' },
      { status: 500 },
    )
  }

  const db = createSupabaseAdminClient()
  let upserted = 0
  let embedded = 0
  const errors: string[] = []

  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH)

    let vectors: (number[] | null)[] = chunk.map(() => null)
    if (openaiKey) {
      try {
        vectors = await embedBatch(
          chunk.map((e) => `${e.title}\n\n${e.summary}\n\n${e.body_md}`),
          openaiKey,
        )
        embedded += vectors.filter(Boolean).length
      } catch (err) {
        // An embedding failure must not lose the row: upsert it without one.
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }

    const rows = chunk.map((e, n) => ({
      ...e,
      status: 'published',
      origin: 'mdx',
      ...(vectors[n] ? { embedding: vectors[n] } : {}),
    }))

    const { error } = await db.from('atlas_entries').upsert(rows, { onConflict: 'type,slug' })
    if (error) errors.push(error.message)
    else upserted += rows.length
  }

  return Response.json({
    ok: errors.length === 0,
    found: entries.length,
    upserted,
    embedded,
    embeddingsSkipped: openaiKey ? 0 : entries.length,
    errors: errors.slice(0, 5),
  })
}
