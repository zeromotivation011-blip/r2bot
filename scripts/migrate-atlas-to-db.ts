/**
 * One-time migration: read every Atlas MDX file from /content/atlas and upsert
 * it into the public.atlas_entries table (see migration 0032).
 *
 * Run locally (needs .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *   npx tsx scripts/migrate-atlas-to-db.ts
 *
 * Safe to re-run — it upserts on (type, slug). Existing DB rows created in the
 * admin (origin='cms') are NOT overwritten unless their type/slug matches a file.
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env (.env.local).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const CONTENT_DIR = path.join(process.cwd(), 'content', 'atlas')

type Row = {
  type: string
  slug: string
  title: string
  summary: string
  category: string | null
  status: string
  data: Record<string, unknown>
  body: string
  origin: string
}

function collect(): Row[] {
  const rows: Row[] = []
  if (!fs.existsSync(CONTENT_DIR)) return rows
  for (const type of fs.readdirSync(CONTENT_DIR)) {
    const dir = path.join(CONTENT_DIR, type)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue
      const slug = file.replace(/\.(mdx|md)$/, '')
      const raw = fs.readFileSync(path.join(dir, file), 'utf8')
      const { data, content } = matter(raw)
      rows.push({
        type,
        slug,
        title: String((data as Record<string, unknown>).title ?? slug),
        summary: String((data as Record<string, unknown>).summary ?? ''),
        category: (data as Record<string, unknown>).category
          ? String((data as Record<string, unknown>).category)
          : null,
        status: 'published',
        data: data as Record<string, unknown>,
        body: content,
        origin: 'mdx',
      })
    }
  }
  return rows
}

async function main() {
  const rows = collect()
  console.log(`Found ${rows.length} Atlas MDX entries. Upserting…`)
  let ok = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase
      .from('atlas_entries')
      .upsert(batch, { onConflict: 'type,slug', ignoreDuplicates: false })
    if (error) {
      console.error(`Batch ${i}–${i + batch.length} failed:`, error.message)
    } else {
      ok += batch.length
      console.log(`  ✓ ${ok}/${rows.length}`)
    }
  }
  console.log(`Done. ${ok}/${rows.length} entries in atlas_entries.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
