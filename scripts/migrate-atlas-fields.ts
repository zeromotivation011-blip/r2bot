// scripts/migrate-atlas-fields.ts
// Reads every MDX file in content/atlas/**, and ADDS missing frontmatter
// keys with sensible defaults. NEVER overwrites existing values.
//
// Run with:  npx tsx scripts/migrate-atlas-fields.ts
//
// Idempotent — safe to run multiple times.

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const ROOT = path.join(process.cwd(), 'content', 'atlas')

interface Defaults {
  difficulty: number
  oneLiner: string
  laymanExplanation: string
  analogy: string
  whyItMatters: string
  realRobotsThatUseThis: string[]
  indianExample: string
  relatedTerms: string[]
  prerequisiteTerms: string[]
  unlocksTerms: string[]
  quizQuestion: { q: string; options: string[]; answer: number; explanation: string }
  mindBlowingFact: string
  industryApplications: string[]
  difficultyLabel: string
  technicalDefinition: string
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Coffee chat',
  2: 'Dinner table',
  3: 'Classroom',
  4: 'Lab',
  5: 'Research paper',
}

// Take the first 8 words of a body line.
function firstWords(text: string, n: number): string {
  return text.trim().split(/\s+/).slice(0, n).join(' ')
}

// Extract the first non-empty paragraph from the MDX body (no headings / links collapsed).
function firstParagraph(body: string): string {
  const lines = body.split('\n')
  const out: string[] = []
  let started = false
  for (const raw of lines) {
    const line = raw.replace(/^\s*#{1,6}\s+.*$/, '').trim()
    if (line === '') {
      if (started) break
      continue
    }
    // Skip MDX/JSX-ish lines and bullet lists at the start.
    if (line.startsWith('<') || line.startsWith('-') || line.startsWith('*')) {
      if (started) break
      continue
    }
    out.push(line)
    started = true
  }
  // Strip markdown links: [label](url) -> label
  return out.join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function deriveDefaults(fm: Record<string, unknown>, body: string, bucket: string, title: string): Defaults {
  const summary = typeof fm.summary === 'string' ? fm.summary : ''
  const firstPara = firstParagraph(body) || summary
  const bucketHint = bucket.replace(/-/g, ' ')

  return {
    difficulty: 3,
    oneLiner: summary
      ? `The ${bucketHint} concept: ${firstWords(summary, 8)}`
      : `${title} — a key ${bucketHint} concept`,
    laymanExplanation: firstPara
      ? firstPara.slice(0, 360)
      : `${title} is a ${bucketHint} concept in robotics.`,
    analogy: `Think of it like a household object that does the same job — the underlying idea is the same, just adapted for robots.`,
    whyItMatters: `Without ${title.toLowerCase()}, many ${bucketHint} systems in robotics simply couldn't work.`,
    realRobotsThatUseThis: [],
    indianExample: '',
    relatedTerms: [],
    prerequisiteTerms: [],
    unlocksTerms: [],
    quizQuestion: { q: '', options: [], answer: 0, explanation: '' },
    mindBlowingFact: '',
    industryApplications: [],
    difficultyLabel: DIFFICULTY_LABELS[3],
    technicalDefinition: summary || firstPara || '',
  }
}

function bucketFromFile(file: string): string {
  // content/atlas/<type>/<slug>.mdx — use <type> as bucket fallback.
  const rel = path.relative(ROOT, file)
  const parts = rel.split(path.sep)
  return parts[0] || 'concept'
}

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, files)
    else if (ent.isFile() && ent.name.endsWith('.mdx')) files.push(full)
  }
  return files
}

function run() {
  const files = walk(ROOT)
  let touched = 0
  let skipped = 0

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const { data, content } = matter(raw)
    const title = (typeof data.title === 'string' ? data.title : path.basename(file, '.mdx')).trim()
    const bucket = (typeof data.bucket === 'string' ? data.bucket : bucketFromFile(file))
    const slug = (typeof data.slug === 'string' ? data.slug : path.basename(file, '.mdx'))

    const defaults = deriveDefaults(data as Record<string, unknown>, content, bucket, title)
    const next: Record<string, unknown> = { ...data }

    let changed = false
    const keys: (keyof Defaults)[] = [
      'difficulty', 'oneLiner', 'laymanExplanation', 'analogy',
      'whyItMatters', 'realRobotsThatUseThis', 'indianExample',
      'relatedTerms', 'prerequisiteTerms', 'unlocksTerms',
      'quizQuestion', 'mindBlowingFact', 'industryApplications',
      'difficultyLabel', 'technicalDefinition',
    ]
    for (const k of keys) {
      if (!(k in next) || next[k] === null || next[k] === undefined) {
        next[k] = defaults[k] as unknown
        changed = true
      }
    }

    // Derive difficultyLabel from difficulty if it wasn't set but difficulty was set.
    if (typeof next.difficulty === 'number' && !data.difficultyLabel) {
      const d = Math.max(1, Math.min(5, next.difficulty as number))
      next.difficultyLabel = DIFFICULTY_LABELS[d]
      changed = true
    }

    // Ensure slug & bucket exist (don't override)
    if (!data.slug) { next.slug = slug; changed = true }
    if (!data.bucket) { next.bucket = bucket; changed = true }

    if (!changed) { skipped++; continue }

    const updated = matter.stringify(content, next)
    fs.writeFileSync(file, updated, 'utf8')
    touched++
  }

  // eslint-disable-next-line no-console
  console.log(`migrate-atlas-fields: scanned ${files.length}, updated ${touched}, already-current ${skipped}`)
}

run()
