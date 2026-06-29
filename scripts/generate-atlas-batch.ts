// scripts/generate-atlas-batch.ts
// Generates v2 Atlas MDX files for the ~154 terms added in the latest spec.
// Skips any file that already exists — non-destructive.
//
// Run: npx tsx scripts/generate-atlas-batch.ts

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'content', 'atlas')

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface Term {
  slug: string
  type: 'application' | 'india' | 'advanced' | 'electronics' | 'ai' | 'component' | 'tool' | 'concept'
  title: string
  difficulty: Difficulty
  tags: string[]
  oneLiner: string
  layman: string
  analogy: string
  why: string
  indianEx: string
  robots: string[]
  quizQ: string
  quizA: string
  mindBlow: string
  industry: string[]
  bucket: string                    // matches lib/atlas-buckets.ts slug
  body: string                      // 2-4 paragraphs separated by blank lines
}

const diffToNumber = (d: Difficulty): number =>
  d === 'beginner' ? 2 : d === 'intermediate' ? 3 : 4

const yamlStringArr = (arr: string[]): string =>
  arr.length === 0
    ? '[]'
    : '\n' + arr.map(s => `  - ${JSON.stringify(s)}`).join('\n')

const yamlString = (s: string): string => JSON.stringify(s)

function mdxFor(t: Term): string {
  return `---
title: ${yamlString(t.title)}
slug: ${t.slug}
type: ${t.type}
bucket: ${t.bucket}
summary: ${yamlString(t.oneLiner)}
tags:${yamlStringArr(t.tags)}
difficulty: ${diffToNumber(t.difficulty)}
difficultyLabel: ${yamlString(t.difficulty)}
oneLiner: ${yamlString(t.oneLiner)}
laymanExplanation: ${yamlString(t.layman)}
analogy: ${yamlString(t.analogy)}
whyItMatters: ${yamlString(t.why)}
indianExample: ${yamlString(t.indianEx)}
realRobotsThatUseThis:${yamlStringArr(t.robots)}
quizQuestion:
  q: ${yamlString(t.quizQ)}
  options: []
  answer: 0
  explanation: ${yamlString(t.quizA)}
mindBlowingFact: ${yamlString(t.mindBlow)}
industryApplications:${yamlStringArr(t.industry)}
prerequisiteTerms: []
unlocksTerms: []
lastReviewed: 2025-01-15
---

${t.body}
`
}

// ─── DATA: terms to generate. Loaded from sibling JSON files for readability. ─
const DATA_FILES = [
  'atlas-data-application.json',
  'atlas-data-india.json',
  'atlas-data-advanced.json',
  'atlas-data-electronics.json',
  'atlas-data-ai.json',
  'atlas-data-component.json',
  'atlas-data-tool.json',
  'atlas-data-concept.json',
]

const DATA_DIR = path.join(process.cwd(), 'scripts', 'atlas-data')

let allTerms: Term[] = []
for (const f of DATA_FILES) {
  const p = path.join(DATA_DIR, f)
  if (!fs.existsSync(p)) continue
  const arr = JSON.parse(fs.readFileSync(p, 'utf-8')) as Term[]
  allTerms = allTerms.concat(arr)
}

let created = 0
let skipped = 0
for (const t of allTerms) {
  const dir = path.join(ROOT, t.type)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${t.slug}.mdx`)
  if (fs.existsSync(file)) { skipped++; continue }
  fs.writeFileSync(file, mdxFor(t), 'utf-8')
  created++
}

// eslint-disable-next-line no-console
console.log(`generate-atlas-batch: created ${created}, skipped (exists) ${skipped}, total candidates ${allTerms.length}`)
