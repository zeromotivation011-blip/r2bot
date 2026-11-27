// scripts/kids-voices/export-stories.ts
// Writes every line the Story Theatre reads aloud (lib/kids/stories) to JSON for
// generate-stories.py (see storyVoiceLines in lib/kids/episodes/story-lines.ts).
//   npx tsx scripts/kids-voices/export-stories.ts [out.json]
// The output is a build intermediate: it is NOT committed (default path is in /tmp).

import { writeFileSync } from 'node:fs'
import { EPISODES } from '../../lib/kids/stories'
import { storyVoiceLines } from '../../lib/kids/episodes/story-lines'

const out = process.argv[2] ?? '/tmp/r2bot-stories.json'
const lines = storyVoiceLines(EPISODES)
writeFileSync(out, JSON.stringify({ stories: EPISODES.map((e) => e.slug), lines }, null, 2))
console.log(`wrote ${lines.length} unique lines from ${EPISODES.length} stories → ${out}`)
