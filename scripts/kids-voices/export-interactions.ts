// scripts/kids-voices/export-interactions.ts
// Writes the authored "join in" moments (lib/kids/episodes/interactions.ts)
// as JSON for generate-interactions.py, which voices them.
//   npx tsx scripts/kids-voices/export-interactions.ts /tmp/l1-join.json
import { writeFileSync } from 'node:fs'
import { INTERACTIONS } from '../../lib/kids/episodes/interactions'

const out = process.argv[2]
if (!out) {
  console.error('usage: export-interactions.ts <out.json>')
  process.exit(1)
}
writeFileSync(out, JSON.stringify(INTERACTIONS, null, 1))
console.log(`wrote ${Object.keys(INTERACTIONS).length} episodes of interactions to ${out}`)
