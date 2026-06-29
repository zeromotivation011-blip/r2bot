// scripts/generate-atlas-1000.ts
// Generates MDX content for every topic in scripts/atlas-topics-list.ts
// using the Anthropic API.
//
// Usage:
//   ANTHROPIC_API_KEY=... npx tsx scripts/generate-atlas-1000.ts [--dry-run] [--limit=N] [--bucket=foundations]
//
// Flags:
//   --dry-run        Print planned actions, write nothing.
//   --limit=N        Only process the first N topics that need generation.
//   --bucket=ID      Only process a single bucket.
//   --force          Re-generate files that already exist.
//
// Cost: ~$0.02–$0.04 per topic at Claude Opus pricing → ~$20–30 for all 967.
// Time: With concurrency=5 and 2s pause between batches, ~25–40 minutes.

import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'
import { NEW_TOPICS, BUCKETS, type TopicSeed } from './atlas-topics-list'

interface CliArgs {
  dryRun: boolean
  limit: number | null
  bucket: string | null
  force: boolean
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2)
  const out: CliArgs = { dryRun: false, limit: null, bucket: null, force: false }
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--force') out.force = true
    else if (a.startsWith('--limit=')) out.limit = parseInt(a.slice('--limit='.length), 10)
    else if (a.startsWith('--bucket=')) out.bucket = a.slice('--bucket='.length)
  }
  return out
}

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'atlas', 'concept')
const MODEL = process.env.ATLAS_GEN_MODEL || 'claude-opus-4-5-20250929'
const CONCURRENCY = 5
const BATCH_PAUSE_MS = 2000

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true })
}

function pathForTopic(slug: string): string {
  return path.join(CONTENT_ROOT, `${slug}.mdx`)
}

function fileExists(slug: string): boolean {
  return fs.existsSync(pathForTopic(slug))
}

const PROMPT_INSTRUCTIONS = `You are writing content for R2BOT, India's robotics education platform.

Produce a single MDX file. Output ONLY the file content (frontmatter + body). No prose around it. No code fences. No explanations.

Format MUST be:

---
title: "..."
bucket: "..."
slug: "..."
difficultyLevel: 1
tagline: "..."
hookLine: "..."
mindBlowingFact: "..."
laymanExplanation: "..."
analogy: "..."
deeperExplanation: "..."
indianExample: "..."
xpValue: 10
estimatedReadTime: 3
prerequisiteTerms: ["...", "..."]
unlocksTerms: ["...", "...", "..."]
relatedConcepts: ["...", "..."]
realWorldProducts: ["...", "..."]
companies: ["...", "..."]
indianCompanies: ["..."]
usedIn: ["...", "..."]
keyTakeaways:
  - "..."
  - "..."
  - "..."
commonMistakes:
  - "..."
  - "..."
proTip: "..."
quizQuestionText: "..."
quizOptions: ["...", "...", "...", "..."]
quizCorrect: 1
tags: ["...", "..."]
lastUpdated: "2026-05-23"
---

## Overview

(2-3 paragraph friendly explanation that EXPANDS the laymanExplanation. Speak directly to the reader. Use one Indian comparison.)

## How It Works

(2-3 paragraph deeper-but-still-accessible explanation. May use technical vocabulary.)

## See It In Action

(Bullet list of 3-5 real-world manifestations the reader has likely encountered in India. Each item: bold the product/place + 1-2 sentences.)

## Build Intuition

(One concrete thought experiment or mental model the reader can use to test their understanding.)

Hard rules:
- ZERO jargon in laymanExplanation. 12-year-old in Jaipur understands.
- analogy MUST use an Indian touchstone (chai-making, dabbawala, cricket, auto-rickshaw, pressure cooker, ATM, Mumbai trains, UPI, Maruti car, Bollywood, kirana shop).
- indianExample is a SPECIFIC company / college / product / project in India.
- tagline max 12 words. hookLine max 12 words.
- mindBlowingFact: one jaw-dropping stat or surprising truth.
- prerequisiteTerms / unlocksTerms / relatedConcepts: 1-4 entries each, kebab-case slugs only.
- realWorldProducts: brand/product names.
- quizCorrect: integer index 0..3 (matches quizOptions array position).
- difficultyLevel: 1=layman, 5=PhD.
- xpValue: 10 default, 15 intermediate, 25 advanced.
- ALL YAML strings double-quoted. ALL lists either flow-style ["a","b"] OR block-style with two-space indent.
- DO NOT wrap output in code fences.
- DO NOT include explanatory prose before or after.`

function buildPrompt(t: TopicSeed): string {
  return `${PROMPT_INSTRUCTIONS}

Now generate the MDX for:
  title: "${t.title}"
  bucket: "${t.bucket}"
  slug: "${t.slug}"
  intended difficultyLevel: ${t.difficulty}
${t.tags && t.tags.length > 0 ? `  suggested tags: ${JSON.stringify(t.tags)}` : ''}
`
}

async function generateOne(client: Anthropic, t: TopicSeed): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: 'user', content: buildPrompt(t) }],
  })
  const block = res.content[0]
  if (!block || block.type !== 'text') {
    throw new Error(`No text response for ${t.slug}`)
  }
  return block.text.trim()
}

async function processBatch(client: Anthropic, batch: TopicSeed[], args: CliArgs): Promise<void> {
  await Promise.all(
    batch.map(async (t) => {
      try {
        if (args.dryRun) {
          console.log(`[dry-run] would generate ${pathForTopic(t.slug)}`)
          return
        }
        const content = await generateOne(client, t)
        ensureDir(CONTENT_ROOT)
        fs.writeFileSync(pathForTopic(t.slug), content + '\n')
        console.log(`✅ ${t.slug}`)
      } catch (err) {
        console.error(`❌ ${t.slug}: ${(err as Error).message}`)
      }
    }),
  )
}

async function main() {
  const args = parseArgs()
  if (!process.env.ANTHROPIC_API_KEY && !args.dryRun) {
    console.error('Set ANTHROPIC_API_KEY before running.')
    process.exit(1)
  }

  let queue: TopicSeed[] = NEW_TOPICS.slice()
  if (args.bucket) queue = queue.filter(t => t.bucket === args.bucket)
  if (!args.force) queue = queue.filter(t => !fileExists(t.slug))
  if (args.limit != null) queue = queue.slice(0, args.limit)

  console.log(`Queue: ${queue.length} topics (dry-run=${args.dryRun} force=${args.force})`)
  if (queue.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'dryrun' })

  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY)
    console.log(`\n— Batch ${Math.floor(i / CONCURRENCY) + 1} (${i + 1}–${Math.min(i + CONCURRENCY, queue.length)} / ${queue.length}) —`)
    await processBatch(client, batch, args)
    if (i + CONCURRENCY < queue.length) {
      await new Promise(r => setTimeout(r, BATCH_PAUSE_MS))
    }
  }

  console.log('\nDone.')
  console.log('Bucket totals:')
  for (const b of BUCKETS) {
    const have = NEW_TOPICS
      .filter(t => t.bucket === b.id)
      .filter(t => fs.existsSync(pathForTopic(t.slug)))
      .length
    console.log(`  ${b.id}: ${have} files`)
  }
}

main().catch(err => {
  console.error('Generation script failed:', err)
  process.exit(1)
})
