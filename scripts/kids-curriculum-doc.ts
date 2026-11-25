// scripts/kids-curriculum-doc.ts
// Renders docs/kids-curriculum.md from the curriculum data in
// lib/kids/curriculum, after checking the data is internally consistent.
//
//   npx tsx scripts/kids-curriculum-doc.ts          # write the file
//   npx tsx scripts/kids-curriculum-doc.ts --check  # checks only, exit 1 on a problem
//
// The markdown is generated: edit the TypeScript, not the .md.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLOCK_NEEDS, type BlockId, type CodeChallenge, type Level, type Session } from '../lib/kids/curriculum/types'
import {
  ASSESSMENT, BLOCK_STYLE, BLOCKS_INTRODUCED, CONCEPT_SPIRAL, LEVELS, OPEN_QUESTIONS, PRINCIPLES, SCHOOL_USE,
} from '../lib/kids/curriculum/levels'
import { LEVEL1_SESSIONS } from '../lib/kids/curriculum/level1'
import {
  ALIGNMENT_DISCLAIMER, CSTA, CSTA_LEVEL_FOR, INDIA_ALIGNMENT, LEVEL_CSTA, NGSS, alignObjective,
} from '../lib/kids/curriculum/mapping'
import type { ConceptId, LevelNumber } from '../lib/kids/curriculum/types'

// ── Checks ────────────────────────────────────────────────────────────────

const problems: string[] = []
const fail = (msg: string) => problems.push(msg)

function checkChallenge(sess: Session, c: CodeChallenge, known: Set<BlockId>, where: string) {
  for (const b of c.allowedBlocks) {
    if (!known.has(b.id)) fail(`${sess.id} ${where}: block "${b.id}" offered before it is introduced`)
    // A Level 1 picture block can hide a sensor inside its fixed condition.
    const cond = String(b.fixed?.cond ?? '')
    const condBlock = (Object.keys(BLOCK_NEEDS) as BlockId[]).find((id) => BLOCK_NEEDS[id] && cond.includes(id))
    if (condBlock && !known.has(condBlock)) fail(`${sess.id} ${where}: condition uses "${condBlock}" before it is introduced`)
    const need = BLOCK_NEEDS[b.id] ?? (condBlock ? BLOCK_NEEDS[condBlock] : null)
    // Project arenas offer every tool's blocks: the child picks the tool, so they cannot require one.
    if (need && need !== 'move' && !c.arena.requires.includes(need) && sess.kind !== 'project') {
      fail(`${sess.id} ${where}: block "${b.id}" needs "${need}" but the arena does not require it`)
    }
  }
  if (c.hints.length !== 3) fail(`${sess.id} ${where}: needs 3 hints`)
  if (c.success.length === 0) fail(`${sess.id} ${where}: no success criteria`)
  if (c.exampleSolution.length === 0) fail(`${sess.id} ${where}: no example solution`)
}

function check(): void {
  const l1 = LEVELS[0]
  if (LEVEL1_SESSIONS.length !== 24) fail(`Level 1 has ${LEVEL1_SESSIONS.length} sessions, expected 24`)
  for (const lvl of LEVELS) {
    if (lvl.sessions.length !== 24) fail(`Level ${lvl.number} outline has ${lvl.sessions.length} sessions`)
    lvl.sessions.forEach((o, i) => { if (o.number !== i + 1) fail(`Level ${lvl.number} outline out of order at ${o.number}`) })
    const projectSessions = lvl.sessions.filter((o) => o.kind === 'project').map((o) => o.number).join(',')
    if (projectSessions !== '6,12,18,24') fail(`Level ${lvl.number} projects at ${projectSessions}`)
    if (lvl.projects.map((p) => p.session).join(',') !== '6,12,18,24') fail(`Level ${lvl.number} project list mismatch`)
  }

  const known = new Set<BlockId>()
  const ids = new Set<string>()
  const badges = new Set<string>()
  LEVEL1_SESSIONS.forEach((sess, i) => {
    if (sess.number !== i + 1) fail(`Level 1 session order broken at ${sess.id}`)
    if (sess.id !== `L1-S${String(sess.number).padStart(2, '0')}`) fail(`Bad id ${sess.id}`)
    if (ids.has(sess.id)) fail(`Duplicate id ${sess.id}`)
    ids.add(sess.id)
    if (badges.has(sess.badge.id)) fail(`Duplicate badge ${sess.badge.id}`)
    badges.add(sess.badge.id)

    const o = l1.sessions[i]
    if (!o || o.title !== sess.title || o.objective !== sess.objective || o.kind !== sess.kind) {
      fail(`levels.ts Level 1 outline differs from level1 data at session ${sess.number}`)
    }
    if (sess.kind === 'project' && sess.project?.id !== l1.projects.find((p) => p.session === sess.number)?.id) {
      fail(`${sess.id}: project mismatch with levels.ts`)
    }
    for (const b of sess.newBlocks) known.add(b)
    checkChallenge(sess, sess.code, known, 'code')
    checkChallenge(sess, sess.challenge, known, 'challenge')

    const minutes = sess.teacher.timing.reduce((a, t) => a + t.minutes, 0)
    if (minutes !== 40) fail(`${sess.id}: class plan is ${minutes} min, not 40`)
    const rt = sess.episode.runtimeSec
    const [lo, hi] = sess.kind === 'project' ? [120, 240] : [180, 300]
    if (rt < lo || rt > hi) fail(`${sess.id}: episode runtime ${rt}s outside ${lo}–${hi}s`)
    if (sess.number > 1 && !sess.episode.previously) fail(`${sess.id}: missing "previously"`)
    sess.quiz.forEach((q, qi) => {
      if (q.answer < 0 || q.answer >= q.options.length) fail(`${sess.id} quiz ${qi + 1}: answer out of range`)
    })
    sess.objectives.forEach((ob) => {
      if (!ob.id.startsWith(sess.id)) fail(`${ob.id} is not under ${sess.id}`)
      alignObjective(1, ob) // throws on an unknown standard id
    })
  })

  const introduced = new Set(BLOCKS_INTRODUCED[1])
  for (const b of known) if (!introduced.has(b)) fail(`Block ${b} is used in Level 1 but not listed in BLOCKS_INTRODUCED[1]`)
  for (const b of introduced) if (!known.has(b)) fail(`BLOCKS_INTRODUCED[1] lists ${b} but no Level 1 session introduces it`)
  const all = Object.values(BLOCKS_INTRODUCED).flat()
  if (new Set(all).size !== all.length) fail('A block is introduced in two levels')
  for (const b of Object.keys(BLOCK_NEEDS) as BlockId[]) if (!all.includes(b)) fail(`Block ${b} is never introduced in any level`)
}

// ── Rendering ─────────────────────────────────────────────────────────────

const md: string[] = []
const w = (...lines: string[]) => md.push(...lines)
const esc = (t: string) => t.replace(/\|/g, '\\|')
const CHAR: Record<string, string> = { narrator: 'Narrator', spark: 'Spark', amara: 'Amara', lucia: 'Nana Lucía', bolt: 'Bolt', myrobot: 'My robot' }
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

function renderChallenge(label: string, c: CodeChallenge) {
  const a = c.arena
  w(`**${label}: ${c.title}.** ${c.mission}`, '')
  w(`- Arena — *${a.name}*: ${a.description}${a.gridTiles ? ` Grid ${a.gridTiles.cols}×${a.gridTiles.rows} tiles of ${a.tileCm} cm.` : ''} Floor: ${a.floor}. Start (${a.start.col},${a.start.row}) facing ${a.start.heading}.`)
  w(`- Goal: ${a.goal}`)
  if (a.features.length) w(`- Features: ${a.features.join('; ')}.`)
  w(`- Needs: ${a.requires.length ? a.requires.join(', ') : 'nothing special'}. Physics: ${a.physics}`)
  w(`- Blocks: ${c.allowedBlocks.map((b) => `${b.label} (\`${b.id}\`)`).join(' · ')}`)
  if (c.starter) w(`- Starter program: \`${c.starter.join(' ')}\``)
  w(`- Example solution: \`${c.exampleSolution.join(' ')}\``)
  w(`- Success: ${c.success.map((x) => `${x.detail} *(${x.kind})*`).join(' ')}`)
  w(`- Stars: ★ done · ★★ ${c.stars.two} · ★★★ ${c.stars.three}`)
  w(`- Hints (Spark): 1. ${c.hints[0]} 2. ${c.hints[1]} 3. ${c.hints[2]}`, '')
}

function renderSession(sess: Session) {
  w(`### ${sess.number}. ${sess.title}${sess.kind === 'project' ? ' — project' : ''}`, '')
  w(`*${sess.objective}*`, '')
  w(`- Objectives: ${sess.objectives.map((o) => `**${o.id}** ${o.text} (“${o.kidText}”)`).join(' ')}`)
  w(`- Concepts: ${sess.concepts.join(', ')}${sess.newBlocks.length ? ` · New blocks: ${sess.newBlocks.map((b) => `\`${b}\``).join(', ')}` : ''}`, '')

  const e = sess.episode
  w(`**Episode: “${e.title}”** (${mmss(e.runtimeSec)})`, '')
  if (e.previously) w(`> *Previously:* ${e.previously}`, '')
  e.scenes.forEach((sc, i) => {
    w(`${i + 1}. **${sc.setting}** — ${sc.action} *(${sc.seconds}s)*`)
    for (const l of sc.lines) {
      const who = l.who === 'guest' ? (l.guestName ?? 'Guest') : CHAR[l.who]
      w(`   - **${who}:** “${l.line}”${l.direction ? ` *[${l.direction}]*` : ''}`)
    }
  })
  w('', `*Cliffhanger:* ${e.cliffhanger}`, '')

  const b = sess.build
  w(`**Build** — ${b.action} \`${b.part.slot}: ${b.part.id}\`. ${b.narration}`, '')
  w(`- Why: ${b.why}`, `- Try it without: ${b.tryWithout}`, `- Physics: ${b.physicsEffect}`, `- Real world: ${b.realWorld}`, '')

  renderChallenge('Code', sess.code)
  renderChallenge('Challenge', sess.challenge)

  if (sess.project) {
    const p = sess.project
    w(`**Make it yours: ${p.title}.** ${p.brief}`, '')
    w(`- Design steps: ${p.designSteps.join(' → ')}`)
    w(`- Constraints: ${p.constraints.join(' ')}`)
    w(`- Self-check: ${p.selfCheck.map((x) => `☐ ${x}`).join(' ')}`)
    w(`- Sharing: ${p.share}`, '')
  }

  w('**Check (3 questions)**', '')
  sess.quiz.forEach((q, i) => {
    const opts = q.options.map((o, oi) => (oi === q.answer ? `**${o.icon} ${o.text}** ✓` : `${o.icon} ${o.text}`)).join(' · ')
    w(`${i + 1}. ${q.prompt} — ${opts}. *Why:* ${q.why}`)
  })
  w('', `**Badge:** ${sess.badge.icon} ${sess.badge.name} — ${sess.badge.earnedFor} · **Reward:** ${sess.reward.note}`, '')

  const t = sess.teacher
  w('<details><summary>Teacher notes</summary>', '')
  w(`- 40-minute plan: ${t.timing.map((x) => `${x.minutes}′ ${x.activity}`).join(' · ')}`)
  w(`- Unplugged warm-up — *${t.unpluggedWarmup.title}* (${t.unpluggedWarmup.minutes} min): ${t.unpluggedWarmup.steps.join(' ')} Materials: ${t.unpluggedWarmup.materials.join(', ')}.`)
  w(`- Discuss: ${t.discussion.join(' · ')}`)
  w(`- Misconceptions: ${t.misconceptions.map((m) => `“${m.idea}” → ${m.correction}`).join(' · ')}`)
  w(`- Faster: ${t.differentiation.faster.join(' · ')}`)
  w(`- Slower: ${t.differentiation.slower.join(' · ')}`)
  if (t.notes?.length) w(`- Notes: ${t.notes.join(' · ')}`)
  w('', '</details>', '')
  w(`**Parent note.** ${sess.parent.today} *Try at home:* ${sess.parent.tryAtHome} *Ask:* “${sess.parent.askYourChild}”`, '')
}

function renderLevelOverview(l: Level) {
  w(`### Level ${l.number} · ${l.name} (ages ${l.ages}) — “${l.season.title}”`, '')
  w(l.season.premise, '', `*Setting:* ${l.season.setting}`, '')
  w('| Act | Sessions | Summary | Act ends with |', '|---|---|---|---|')
  for (const a of l.season.arc) w(`| ${esc(a.title)} | ${a.sessions[0]}–${a.sessions[1]} | ${esc(a.summary)} | ${esc(a.actEnd)} |`)
  w('', `*Finale:* ${l.season.finale}`, '')
  w(`**The robot.** Starts: ${l.startRobot.description} Ends: ${l.endRobot.description}`, '')
  w('| # | Session | Objective | New blocks / part |', '|---|---|---|---|')
  for (const o of l.sessions) {
    const extra = [o.newBlocks?.map((b) => `\`${b}\``).join(' '), o.part ? `${o.part.slot}: ${o.part.id}` : ''].filter(Boolean).join(' · ')
    w(`| ${o.number} | ${o.kind === 'project' ? '🛠 ' : ''}${esc(o.title)} | ${esc(o.objective)} | ${extra} |`)
  }
  w('', '**Make it yours projects**', '')
  for (const p of l.projects) w(`- **S${p.session} · ${p.title}.** ${p.brief} *Constraints:* ${p.constraints.join(' ')}`)
  w('', `**Certificate — ${l.certificate.title}.** “${l.certificate.wording}”`, '')
  w(`Earned by: ${l.certificate.criteria.join(' ')}`, '')
  w(`**Blocks by the end of the level:** ${l.blocks.map((b) => `\`${b}\``).join(' ')}`, '', `*Block style:* ${BLOCK_STYLE[l.number]}`, '')
  w('**Developmental fit:**', '', ...l.developmentalFit.map((x) => `- ${x}`), '')
}

function render(): string {
  w('<!-- GENERATED by scripts/kids-curriculum-doc.ts from lib/kids/curriculum — do not edit by hand. -->', '')
  w('# R2BOT Kids — Curriculum', '')
  w('A hands-on robotics academy for ages 5–17, for homes and schools. Four levels — one per age band — of 24 sessions each. Every level is one story season in which the child builds and upgrades **one robot of their own**.', '')
  w('Every session (30–40 minutes) has the same shape: **Episode** (a 3–5 minute animated story) → **Build** (add or upgrade a part and see why it exists) → **Code** (program the robot in a real-physics 3D simulator with blocks) → **Challenge** (a mission in a physics arena) → **Check** (three questions, each with its “why”) → **Badge**. Every sixth session is a “Make it yours” project the child designs. A certificate closes each level.', '')

  w('## 1. Why this curriculum is different', '')
  for (const p of PRINCIPLES) w(`**${p.title}.** ${p.body}`, '')

  w('## 2. The four levels at a glance', '')
  w('| Level | Ages | Season | The robot at the end | Projects |', '|---|---|---|---|---|')
  for (const l of LEVELS) w(`| ${l.number} · ${l.name} | ${l.ages} | ${esc(l.season.title)} | ${esc(l.endRobot.description)} | ${l.projects.map((p) => esc(p.title)).join(' · ')} |`)
  w('', '### The spiral — how each idea grows', '')
  w('| Strand | L1 Explorers | L2 Builders | L3 Inventors | L4 Engineers |', '|---|---|---|---|---|')
  for (const [k, v] of Object.entries(CONCEPT_SPIRAL) as [ConceptId, string[]][]) w(`| ${k} | ${v.map(esc).join(' | ')} |`)
  w('', '### Blocks introduced per level', '')
  for (const n of [1, 2, 3, 4] as LevelNumber[]) w(`- **Level ${n}:** ${BLOCKS_INTRODUCED[n].length ? BLOCKS_INTRODUCED[n].map((b) => `\`${b}\``).join(' ') : 'no new blocks — the full set is used for control, behaviours and state machines.'}`)
  w('')

  w('## 3. Level overviews', '')
  for (const l of LEVELS) renderLevelOverview(l)

  w('## 4. Level 1 · Explorers — session by session', '')
  w('Everything a 5–7-year-old meets is spoken aloud and shown with pictures. `{robot}` in a line is the name the child gave their robot. Grid co-ordinates are (column, row) from the top-left; turn_degrees +90 is a left turn.', '')
  for (const sess of LEVEL1_SESSIONS) renderSession(sess)

  w('## 5. Assessment and certificates', '')
  for (const a of ASSESSMENT) w(`**${a.title}.** ${a.body}`, '')

  w('## 6. Using R2BOT Kids in a school', '')
  for (const a of SCHOOL_USE) w(`**${a.title}.** ${a.body}`, '')

  w('## 7. Alignment with standards', '')
  w(`> ${ALIGNMENT_DISCLAIMER}`, '')
  w('| Level | CSTA band | Main CSTA standards | Not covered | India (NEP 2020 / CBSE) |', '|---|---|---|---|---|')
  for (const n of [1, 2, 3, 4] as LevelNumber[]) {
    const c = CSTA_LEVEL_FOR[n]
    w(`| ${n} | ${c.level}, ${c.grades} | ${LEVEL_CSTA[n].focus.join(', ')} | ${esc(LEVEL_CSTA[n].notCovered.join(' '))} | ${esc(INDIA_ALIGNMENT[n].stage + ' ' + INDIA_ALIGNMENT[n].themes.join(' '))} |`)
  }
  w('', '### Level 1 objectives, one by one', '')
  w('| Objective | CSTA (● addresses, ○ contributes) | NGSS | Note |', '|---|---|---|---|')
  for (const sess of LEVEL1_SESSIONS) {
    for (const ob of sess.objectives) {
      const a = alignObjective(1, ob)
      w(`| **${ob.id}** ${esc(ob.text)} | ${a.csta.map((c) => `${c.strength === 'addresses' ? '●' : '○'} ${c.id}`).join(', ') || '—'} | ${a.ngss.join(', ') || '—'} | ${esc(a.note ?? '')} |`)
    }
  }
  w('', '### Standards referenced (paraphrased)', '')
  const used = new Set<string>()
  for (const n of [1, 2, 3, 4] as LevelNumber[]) LEVEL_CSTA[n].focus.forEach((x) => used.add(x))
  for (const sess of LEVEL1_SESSIONS) for (const ob of sess.objectives) alignObjective(1, ob).csta.forEach((c) => used.add(c.id))
  for (const c of CSTA) if (used.has(c.id)) w(`- **${c.id}** — ${c.summary}`)
  for (const [id, text] of Object.entries(NGSS)) w(`- **NGSS ${id}** — ${text}`)
  w('')

  w('## 8. Open questions for the simulator and product teams', '')
  OPEN_QUESTIONS.forEach((q, i) => w(`${i + 1}. ${q}`))
  w('')
  return md.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────

check()
if (problems.length) {
  console.error(`Curriculum check failed (${problems.length}):\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
if (process.argv.includes('--check')) {
  console.log('Curriculum data OK.')
} else {
  const out = join(process.cwd(), 'docs', 'kids-curriculum.md')
  const text = render()
  writeFileSync(out, text)
  console.log(`Wrote ${out} (${text.split(/\s+/).length} words).`)
}
