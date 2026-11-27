// lib/kids/misconceptions/verify.ts
//
// Misconception capture + Class Mind Map (roadmap #30), checked end to end:
//   - every misconception id a check option carries exists in its level's
//     catalogue (Level 1 ./level1.ts, Level 2 curriculum/level2/misconceptions.ts,
//     Levels 3–4 the session's teacher notes);
//   - every check question of every session (Levels 1–4, lessons and projects)
//     has at least one tagged distractor, and no RIGHT answer is tagged;
//   - the Level 1 catalogue is complete (child words, reteach) and has no
//     unused entries; child words never say "wrong";
//   - every session names an unplugged lesson/warm-up and an episode that exist;
//   - the class snapshot carries counts only: free-text keys, answer text and
//     non-number values are refused by parseSnapshot;
//   - the Mind Map turns shared counts into a re-teach suggestion;
//   - the band lock picks the child's own lock, then the class lock;
//   - the Trust Pack describes the misconception counts and the band columns.
//
// Run:  npx tsx lib/kids/misconceptions/verify.ts     (exit 1 on any ✗)

import { parseSnapshot, effectiveBandLock, EMPTY_SNAPSHOT, type KidsMemberRow } from '../classroom'
import { getInsightCatalogue } from '../classroom-insights-server'
import { classMindMap } from '../classroom-insights'
import { CLASS_SNAPSHOT_FIELDS, DEVICE_ONLY, SERVER_TABLES } from '../teach/trust-pack'
import { unpluggedLesson } from '../unplugged'
import { THEATRE_EPISODES } from '../episodes/theatre'
import { EPISODES } from '../stories'
import { L1_MISCONCEPTIONS } from './level1'
import { MISCONCEPTION_KEY_RE, optionMisconception } from './keys'
import { LEVEL_SESSIONS, sessionMisconceptions, sessionReteachRefs, unknownMisconceptionIds } from './server'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`)
  else {
    failures++
    console.log(`  ✗   ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

interface Opt { text: string }
interface Q { options: Opt[]; answer: number }

// ── Every check option ───────────────────────────────────────────────────────
console.log('Course checks, Levels 1–4')
const usedL1 = new Set<string>()
for (const [level, sessions] of LEVEL_SESSIONS) {
  const unknown: string[] = []
  const untaggedQ: string[] = []
  const taggedRight: string[] = []
  let wrong = 0
  let tagged = 0
  const kinds = new Set<string>()
  for (const s of sessions) {
    kinds.add(s.kind)
    for (const id of unknownMisconceptionIds(level, s)) unknown.push(`${s.id}:${id}`)
    ;(s.quiz as unknown as Q[]).forEach((q, qi) => {
      let n = 0
      q.options.forEach((o, oi) => {
        const id = optionMisconception(o)
        if (oi === q.answer) {
          if (id) taggedRight.push(`${s.id} Q${qi + 1}`)
          return
        }
        wrong++
        if (id) {
          n++
          tagged++
          if (level === 1) usedL1.add(id)
        }
      })
      if (n === 0) untaggedQ.push(`${s.id} Q${qi + 1}`)
    })
  }
  check(`Level ${level}: ${sessions.length} sessions, lessons and projects both present`, sessions.length === 24 && kinds.has('lesson') && kinds.has('project'))
  check(`Level ${level}: every misconception id used exists in the level's catalogue`, unknown.length === 0, unknown.slice(0, 6).join(', '))
  check(`Level ${level}: every check question has at least one tagged distractor`, untaggedQ.length === 0, untaggedQ.slice(0, 6).join(', '))
  check(`Level ${level}: no right answer carries a misconception`, taggedRight.length === 0, taggedRight.join(', '))
  console.log(`      (${tagged} of ${wrong} wrong options tagged)`)
  check(`Level ${level}: every check resolves to words the teacher can use`, sessions.every((s) => sessionMisconceptions(level, s).every((m) => m.idea.length > 10 && m.correction.length > 10)))
}

// ── Level 1 catalogue ────────────────────────────────────────────────────────
console.log('Level 1 catalogue')
const l1 = Object.entries(L1_MISCONCEPTIONS) as [string, { idea: string; correction: string; child: string; reteach: string }][]
check('every Level 1 entry is used by at least one check option', l1.every(([id]) => usedL1.has(id)), l1.filter(([id]) => !usedL1.has(id)).map(([id]) => id).join(', '))
check('every entry has teacher idea + correction, child words and a reteach', l1.every(([, m]) => m.idea.length >= 15 && m.correction.length >= 20 && m.child.length >= 15 && m.reteach.length >= 40))
check('child words never say “wrong” or “silly you”', l1.every(([, m]) => !/\bwrong\b|\bsilly you\b|\bstupid\b/i.test(m.child)))
check('child words are short enough to say aloud (≤ 160 characters)', l1.every(([, m]) => m.child.length <= 160), l1.filter(([, m]) => m.child.length > 160).map(([id]) => id).join(', '))
check('ids are kebab-case and fit the snapshot key', l1.every(([id]) => MISCONCEPTION_KEY_RE.test(`L1-S01.${id}`)))

// ── Re-teach references ──────────────────────────────────────────────────────
console.log('Re-teach references')
const theatre = new Set(THEATRE_EPISODES.map((e) => e.sessionId))
const stories = new Set(EPISODES.map((e) => e.slug))
for (const [level, sessions] of LEVEL_SESSIONS) {
  const bad: string[] = []
  for (const s of sessions) {
    const r = sessionReteachRefs(level, s)
    if (!r.unplugged.href.startsWith('/kids/') || !r.episode.href.startsWith('/kids/') || !r.unplugged.title || !r.episode.title) bad.push(s.id)
    if (level === 1 && (!unpluggedLesson(s.number) || !theatre.has(s.id))) bad.push(`${s.id} (unplugged lesson or Theatre episode missing)`)
    const m = /^\/kids\/stories\/([^/]+)$/.exec(r.episode.href)
    if (level === 2 && m && !stories.has(m[1])) bad.push(`${s.id} (story ${m[1]} missing)`)
  }
  check(`Level ${level}: every session names an unplugged lesson/warm-up and an episode that exist`, bad.length === 0, bad.slice(0, 5).join(', '))
}

// ── Snapshot: counts only ────────────────────────────────────────────────────
console.log('Class snapshot')
const cat = getInsightCatalogue()
const keys = Object.keys(cat.misconceptions)
check('the catalogue covers all four levels', [1, 2, 3, 4].every((l) => keys.some((k) => k.startsWith(`L${l}-`))))
check('every catalogue key fits the snapshot key shape', keys.every((k) => MISCONCEPTION_KEY_RE.test(k)))
const anyAnswer = cat.misconceptions[keys[0]]?.a ?? 'The wheels'
const parsed = parseSnapshot({
  v: 1,
  misconceptions: {
    [keys[0]]: 2,
    [`${keys[1]}`]: '3',
    [anyAnswer]: 1,
    'L1-S05.My child said the wheels': 1,
    'L1-S05.turn-moves-forward': 1.7,
    'L1-S05.robot-knows-where-to-go': { text: 'free text' },
  },
  freeText: 'hello',
})
check('only "Lx-Syy.id" keys with number values survive', !!parsed && JSON.stringify(parsed.misconceptions) === JSON.stringify({ [keys[0]]: 2, 'L1-S05.turn-moves-forward': 1 }), JSON.stringify(parsed?.misconceptions))
check('unknown fields (free text) are dropped', !!parsed && !('freeText' in parsed))
check('no answer text can reach the snapshot', !!parsed && !JSON.stringify(parsed).includes(anyAnswer))
check('every misconception value in a parsed snapshot is a whole number 1–99', !!parsed && Object.values(parsed.misconceptions).every((n) => Number.isInteger(n) && n >= 1 && n <= 99))

// ── Mind Map → re-teach suggestion ───────────────────────────────────────────
console.log('Class Mind Map')
const l1Key = keys.find((k) => k.startsWith('L1-S05.')) ?? keys[0]
const mk = (id: string, misconceptions: Record<string, number>): KidsMemberRow => ({
  id, nickname: id, snapshot: { ...EMPTY_SNAPSHOT, misconceptions }, createdAt: '2026-11-01T00:00:00Z', lastActiveAt: '2026-11-27T00:00:00Z',
})
const map = classMindMap([mk('a', { [l1Key]: 1 }), mk('b', { [l1Key]: 2 }), mk('c', {})], cat)
const item = map.flatMap((n) => n.items).find((i) => i.key === l1Key)
check('a Level 1 misconception two children share appears', !!item && item.children === 2)
check('…with child words, a reteach, the unplugged lesson and the episode', !!item && !!item.childWords && !!item.reteach && !!item.unplugged?.href.startsWith('/kids/teach/unplugged/') && !!item.episode?.href.startsWith('/kids/stories/episodes/'), JSON.stringify(item))
const solo = classMindMap([mk('a', { [l1Key]: 1 }), mk('b', {})], cat)
check('one child’s misconception is never shown', solo.length === 0)

// ── Band lock (roadmap #29) ──────────────────────────────────────────────────
console.log('Band lock')
check('the child’s own lock wins', effectiveBandLock('builders', true, 'explorers') === 'explorers')
check('else the class lock, when the class is locked', effectiveBandLock('inventors', true, null) === 'inventors')
check('an unlocked class sets nothing', effectiveBandLock('inventors', false, null) === null)
check('junk is ignored', effectiveBandLock('admins', true, 'teachers') === null)

// ── Trust Pack ───────────────────────────────────────────────────────────────
console.log('Trust Pack')
check('the misconceptions field says counts only, no answer text', /Counts only/.test(CLASS_SNAPSHOT_FIELDS.misconceptions.what) && /never the question, the answer text/.test(CLASS_SNAPSHOT_FIELDS.misconceptions.what))
const fields = SERVER_TABLES.flatMap((t) => t.fields.map((f) => f.name))
check('the band lock columns are described', fields.includes('band_lock') && fields.includes('band_locked'))
check('the device-only list names the misconception record', DEVICE_ONLY.some((d) => /misconception/i.test(d.what)))

if (failures) {
  console.log(`\n${failures} misconception check(s) failed.`)
  process.exit(1)
}
console.log('\nMisconceptions: all checks passed.')
