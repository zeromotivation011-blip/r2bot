// lib/atlas-index.ts
//
// Keeps `atlas_entries` — the table the R2 Co-pilot retrieves from — in step
// with the MDX in content/atlas/.
//
// This table was EMPTY in production. match_atlas_entries returned nothing on
// every question ever asked, so the Co-pilot answered purely from the model's
// general knowledge while the homepage, the nav and the about page all promise
// answers "grounded in the Atlas" that "cite their sources".
//
// It runs from the daily cron rather than waiting for someone to trigger it,
// because the failure mode is silent: nothing errors, answers still look good,
// and the only symptom is citations that never appear. Anything whose breakage
// is invisible has to heal itself.
//
// Budgeted per run: rows are cheap and always upserted in full, embeddings are
// capped so one run cannot exhaust the function's 300 seconds or a rate limit.
// A cold start takes a few days to embed everything and then no-ops.

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'atlas')
const EMBED_MODEL = 'text-embedding-3-small'
const MAX_EMBED_CHARS = 24000
const EMBED_BATCH = 20
/** Per cron run. 512 entries reach full coverage in three days from cold. */
const EMBED_PER_RUN = 200
const UPSERT_BATCH = 50

export type AtlasRow = {
  type: string
  slug: string
  title: string
  summary: string
  body_md: string
  category: string | null
  last_reviewed_at: string | null
}

export function readAtlasEntries(): AtlasRow[] {
  if (!fs.existsSync(CONTENT_DIR)) return []
  const out: AtlasRow[] = []
  for (const type of fs.readdirSync(CONTENT_DIR)) {
    const dir = path.join(CONTENT_DIR, type)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'))
      const reviewed = data.lastReviewed
      out.push({
        type,
        slug: file.replace(/\.mdx?$/, ''),
        title: String(data.title ?? file),
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

/** One request per batch: 512 entries is 26 calls, not 512. */
async function embedBatch(texts: string[], key: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts.map((t) => t.slice(0, MAX_EMBED_CHARS)),
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] }
  const ordered: number[][] = []
  for (const d of json.data) ordered[d.index] = d.embedding
  return ordered
}

export type AtlasIndexResult = {
  ok: boolean
  found: number
  upserted: number
  embedded: number
  stillMissingEmbeddings: number
  errors: string[]
}

export async function runAtlasIndex(
  opts: { embedLimit?: number } = {},
): Promise<AtlasIndexResult> {
  const entries = readAtlasEntries()
  const errors: string[] = []
  if (entries.length === 0) {
    return {
      ok: false,
      found: 0,
      upserted: 0,
      embedded: 0,
      stillMissingEmbeddings: 0,
      errors: ['No Atlas MDX found — content/atlas is not traced into this function.'],
    }
  }

  const db = createSupabaseAdminClient()

  // 1. Rows first, always, in full. Even with no embeddings these make the
  //    Co-pilot's keyword fallback work, which is the difference between an
  //    answer that links into the Atlas and one that links nowhere.
  let upserted = 0
  for (let i = 0; i < entries.length; i += UPSERT_BATCH) {
    const chunk = entries.slice(i, i + UPSERT_BATCH).map((e) => ({
      ...e,
      status: 'published',
      origin: 'mdx',
    }))
    const { error } = await db.from('atlas_entries').upsert(chunk, { onConflict: 'type,slug' })
    if (error) errors.push(`upsert: ${error.message}`)
    else upserted += chunk.length
  }

  // 2. Embeddings for whatever still lacks one, up to this run's budget.
  const openaiKey = process.env.OPENAI_API_KEY
  let embedded = 0
  let stillMissing = 0

  const { data: missing, error: missingErr } = await db
    .from('atlas_entries')
    .select('id, type, slug, title, summary, body_md')
    .is('embedding', null)
    .limit(opts.embedLimit ?? EMBED_PER_RUN)

  if (missingErr) {
    errors.push(`select missing: ${missingErr.message}`)
  } else if (missing && missing.length > 0) {
    if (!openaiKey) {
      errors.push('OPENAI_API_KEY is not set — rows are indexed but not embedded.')
    } else {
      // A 401 means the key is dead, and retrying 26 batches against a dead key
      // just burns the cron's 300 seconds and buries the one error that matters
      // under 26 copies of itself. Stop at the first one and say so plainly.
      let authFailed = false
      for (let i = 0; i < missing.length && !authFailed; i += EMBED_BATCH) {
        const chunk = missing.slice(i, i + EMBED_BATCH) as {
          id: string
          title: string
          summary: string
          body_md: string
        }[]
        try {
          const vectors = await embedBatch(
            chunk.map((e) => `${e.title}\n\n${e.summary}\n\n${e.body_md}`),
            openaiKey,
          )
          for (let n = 0; n < chunk.length; n++) {
            if (!vectors[n]) continue
            const { error } = await db
              .from('atlas_entries')
              .update({ embedding: vectors[n] })
              .eq('id', chunk[n].id)
            if (error) errors.push(`embed update: ${error.message}`)
            else embedded++
          }
        } catch (err) {
          // A failed batch must not cost the rows, and must not stop the run.
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('OpenAI 401')) {
            authFailed = true
            errors.push(
              'OPENAI_API_KEY is rejected (401). Rows are indexed and the Co-pilot still ' +
                'cites via keyword match, but semantic retrieval is off until the key is replaced.',
            )
          } else {
            errors.push(msg)
          }
        }
      }
    }
  }

  const { count } = await db
    .from('atlas_entries')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
  stillMissing = count ?? 0

  return {
    ok: errors.length === 0,
    found: entries.length,
    upserted,
    embedded,
    stillMissingEmbeddings: stillMissing,
    errors: errors.slice(0, 5),
  }
}
