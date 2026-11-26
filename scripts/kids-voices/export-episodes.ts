// scripts/kids-voices/export-episodes.ts
// Writes the Level 1 episode beats (lib/kids/curriculum/level1) to JSON so the
// Python voice generator can read them without a TypeScript toolchain.
//   npx tsx scripts/kids-voices/export-episodes.ts [out.json]
// The output is a build intermediate: it is NOT committed (default path is in /tmp).

import { writeFileSync } from 'node:fs'
import { LEVEL1_SESSIONS } from '../../lib/kids/curriculum/level1'

const out = process.argv[2] ?? '/tmp/r2bot-l1-episodes.json'

const episodes = LEVEL1_SESSIONS.map((s) => ({
  sessionId: s.id,
  number: s.number,
  sessionTitle: s.title,
  title: s.episode.title,
  previously: s.episode.previously ?? null,
  cliffhanger: s.episode.cliffhanger,
  scenes: s.episode.scenes.map((sc) => ({
    setting: sc.setting,
    action: sc.action,
    seconds: sc.seconds,
    lines: sc.lines.map((l) => ({ who: l.who, line: l.line, direction: l.direction ?? null, guestName: l.guestName ?? null })),
  })),
}))

writeFileSync(out, JSON.stringify({ level: 1, episodes }, null, 2))
console.log(`wrote ${episodes.length} episodes, ${episodes.reduce((n, e) => n + e.scenes.reduce((m, s) => m + s.lines.length, 0), 0)} lines → ${out}`)
