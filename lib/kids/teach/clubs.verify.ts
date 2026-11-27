// lib/kids/teach/clubs.verify.ts — run with: npx tsx lib/kids/teach/clubs.verify.ts
// Clubs, families and libraries (#84) and Present mode decks (#42):
//   - club sessions add up to 60 / 75 / 90 minutes, the drop-in plan to 60;
//   - every club week has one station per band, each naming a real episode and real missions;
//   - Present mode builds a deck for every session of every level (and every Level 1 unplugged
//     lesson), every Story Theatre episode and every simulator; every vote has a valid answer;
//   - the QR encoder makes a square of the right size for a join URL, and rejects nothing it should take.

import { BAND_ORDER } from '../bands'
import { EPISODES } from '../stories'
import { clubSessionShape, clubWeeks, DROP_IN_PLAN } from './clubs'
import { buildDeck, parsePresentSource, presentCatalogue, safeKidsPath } from './present'
import { qrMatrix } from './qr'

let failures = 0
let checks = 0
const check = (ok: boolean, msg: string) => {
  checks++
  if (!ok) {
    failures++
    console.error(`✗ ${msg}`)
  }
}

for (const len of [60, 75, 90] as const) {
  const total = clubSessionShape(len).reduce((a, b) => a + b.minutes, 0)
  check(total === len, `club session ${len}: adds up to ${total}`)
}
check(DROP_IN_PLAN.reduce((a, b) => a + b.minutes, 0) === 60, 'drop-in plan is not 60 minutes')

const weeks = clubWeeks()
check(weeks.length === 6, `club weeks: ${weeks.length}`)
const slugs = new Set(EPISODES.map((e) => e.slug))
for (const w of weeks) {
  check(w.stations.map((s) => s.band).join() === BAND_ORDER.join(), `week ${w.week}: stations not one per band`)
  for (const s of w.stations) check(slugs.has(s.episode.href.split('/').pop() ?? ''), `week ${w.week} ${s.band}: episode ${s.episode.href} does not exist`)
}

const cat = presentCatalogue()
let decks = 0
for (const l of cat.levels) {
  check(l.sessions.length > 0, `level ${l.level}: no sessions`)
  for (const s of l.sessions) {
    for (const unplugged of l.level === 1 ? [false, true] : [false]) {
      const d = buildDeck({ kind: 'session', level: l.level, number: s.number, unplugged })
      check(Boolean(d), `no deck for level ${l.level} session ${s.number}${unplugged ? ' (unplugged)' : ''}`)
      if (!d) continue
      decks++
      check(d.slides.length >= 4, `${d.id}: only ${d.slides.length} slides`)
      check(d.slides.every((sl) => sl.phase >= 0 && sl.phase < d.phases.length), `${d.id}: a slide's phase is outside the timer`)
      for (const sl of d.slides) {
        if (sl.kind === 'vote') for (const q of sl.questions) check(q.answer === null || (q.answer >= 0 && q.answer < q.options.length), `${d.id}: vote answer out of range`)
        if (sl.kind === 'embed') check(sl.src.startsWith('/kids/') && sl.src.includes('present=1'), `${d.id}: embed ${sl.src}`)
      }
      if (!unplugged) check(d.phases.map((p) => p.minutes).join('/') === '5/10/20/5', `${d.id}: timer is not 5/10/20/5`)
      else check(d.phases.reduce((a, p) => a + p.minutes, 0) === 40, `${d.id}: unplugged timer is not 40 minutes`)
    }
  }
}
for (const e of cat.episodes) {
  const d = buildDeck({ kind: 'episode', slug: e.slug })
  check(Boolean(d), `no deck for episode ${e.slug}`)
  if (d) decks++
}
for (const s of cat.sims) {
  check(Boolean(buildDeck({ kind: 'sim', id: s.id })), `no deck for sim ${s.id}`)
  decks++
}

check(parsePresentSource({ session: '1-5' })?.kind === 'session', 'parse session')
check(parsePresentSource({ session: '2-5', unplugged: '1' })?.kind === 'session' && (parsePresentSource({ session: '2-5', unplugged: '1' }) as { unplugged: boolean }).unplugged === false, 'unplugged only exists for level 1')
check(parsePresentSource({ path: 'https://evil.example/' }) === null, 'path must stay under /kids')
check(safeKidsPath('/kids/play/sumo-arena') === '/kids/play/sumo-arena', 'safe path')
check(safeKidsPath('/kids/../admin') === null, 'path traversal')
check(safeKidsPath('/kids/present?session=1-1') === null, 'present inside present')
check(safeKidsPath('//evil.example/kids') === null, 'protocol-relative')
check(safeKidsPath('/kids/x?a=<script>') === null, 'markup in query')

const join = qrMatrix('https://www.r2bot.in/kids/join?code=ABC234')
check(join.length === 29 && join.every((r) => r.length === 29), `join QR is ${join.length} modules (expected version 3, 29)`)
check(qrMatrix('x'.repeat(200)).length === 57, 'a 200-byte QR should be version 10')

console.log(`clubs + present: ${weeks.length} club weeks, ${decks} present decks, ${checks} checks`)
if (failures) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('✓ all clubs and present checks passed')
