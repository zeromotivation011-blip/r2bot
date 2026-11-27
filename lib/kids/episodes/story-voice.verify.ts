// lib/kids/episodes/story-voice.verify.ts
// Story Theatre voices (roadmap #8). Run: npx tsx lib/kids/episodes/story-voice.verify.ts
//   FAILS when the index is malformed, or names a clip whose .ogg or .m4a is missing
//         (the player would try a file that 404s), or carries stale clips nobody reads.
//   WARNS when a line has no clip yet (edited since the last voicing): the player
//         falls back to the browser voice. Re-voice with the commands in
//         scripts/kids-voices/VOICES.md ("Story Theatre").

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EPISODES } from '../stories'
import { storyVoiceLines } from './story-lines'

const root = process.cwd()
const dir = join(root, 'public/kids/audio/stories')
const fails: string[] = []
const lines = storyVoiceLines(EPISODES)

let index: { base?: unknown; lines?: Record<string, { d?: unknown }> } = {}
try {
  index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as typeof index
} catch {
  console.warn('! public/kids/audio/stories/index.json missing: every Story Theatre line uses the browser voice.')
  process.exit(0)
}
if (index.base !== '/kids/audio/stories' || !index.lines || typeof index.lines !== 'object') fails.push('index.json has the wrong shape')
const voiced = index.lines ?? {}
for (const [key, rec] of Object.entries(voiced)) {
  if (!/^[0-9a-f]{8}$/.test(key)) fails.push(`bad key ${key}`)
  if (typeof rec?.d !== 'number' || rec.d <= 0 || rec.d > 60) fails.push(`${key}: bad duration`)
  for (const ext of ['ogg', 'm4a']) if (!existsSync(join(dir, `${key}.${ext}`))) fails.push(`${key}.${ext} missing`)
}
const wanted = new Set(lines.map((l) => l.key))
const stale = Object.keys(voiced).filter((k) => !wanted.has(k))
if (stale.length) fails.push(`${stale.length} clips no line reads (re-run generate-stories.py to prune): ${stale.slice(0, 5).join(', ')}`)
const missing = lines.filter((l) => !voiced[l.key])

if (fails.length) {
  for (const f of fails) console.error(`✗ ${f}`)
  process.exit(1)
}
for (const l of missing.slice(0, 10)) console.warn(`! not voiced yet (browser voice): ${l.who} “${l.text.slice(0, 60)}” [${l.slugs.join(', ')}]`)
console.log(`✓ Story Theatre voices: ${lines.length - missing.length}/${lines.length} lines voiced with Piper across ${EPISODES.length} stories`)
