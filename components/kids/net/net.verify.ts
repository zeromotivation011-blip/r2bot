// components/kids/net/net.verify.ts
// Checks for roadmap #88 (connected robots and robot cybersecurity):
//   • the Link Lab sim is deterministic, and every level is winnable WITH its
//     protections by a scripted driver while the broken links really break;
//   • scoring gives stars only for a docked run, the 2nd only with the
//     level's protections;
//   • the Robot Security Check has exactly one right answer per step and its
//     signature check catches a changed file and a missing signature;
//   • the Galaxy activities are well-formed and (once registered) live;
//   • the personal-best ids the Guardians world reads match this folder.
// Run: npx tsx components/kids/net/net.verify.ts

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_PROTECTIONS, LEVELS, LINK_BEST_PREFIX, createState, predictedPose, scoreRun, setControl, step, type Cmd, type LevelDef, type LinkState, type Protections } from './link-sim'
import { FLEET, PASSWORDS, PERMISSIONS, SECURITY_BEST_ID, UPDATES, checkSignature, permissionMistakes, securityStars } from './security-check'
import { guardiansNet } from '../../../lib/kids/activities/content/zones/guardians-net'
import { ALL_ACTIVITIES } from '../../../lib/kids/activities/content'

let failures = 0
let warnings = 0
const ok = (cond: unknown, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else {
    failures++
    console.log(`  ✗ ${msg}`)
  }
}
const warn = (msg: string) => {
  warnings++
  console.log(`  ! ${msg}`)
}

// ── Scripted drivers ─────────────────────────────────────────────────────────

const ROUTES: Record<string, [number, number][]> = {
  clear: [[13.6, 5]],
  far: [[13.2, 5]],
  lossy: [[12.6, 5]],
  jumbled: [[13.4, 2.2], [12.8, 7.6]],
  tunnel: [[10.2, 5]],
  storm: [[7.6, 6.4], [8.8, 4.4], [13.4, 4.4], [13.4, 2]],
}

/** Careful driver: short pulses, then waits for the video (what a good operator does). */
function careful(level: LevelDef, prot: Protections, limit = 400): LinkState {
  const s = createState(level, prot, limit)
  const wps = ROUTES[level.id]
  let wi = 0
  let pulseT = 0
  const lag = (level.link.latencyMs + level.link.jitterMs) / 1000
  while (s.outcome === 'running') {
    const pp = (s.prot.predict ? predictedPose(s) : null) ?? s.seen!.pose
    const [tx, ty] = wps[wi]
    const dist = Math.hypot(tx - pp.x, ty - pp.y)
    const last = wi === wps.length - 1
    let want: Cmd = 'stop'
    if (dist < (last ? 0.35 : 0.5)) {
      if (!last) wi++
    } else {
      let err = Math.atan2(ty - pp.y, tx - pp.x) - pp.h
      while (err > Math.PI) err -= 2 * Math.PI
      while (err < -Math.PI) err += 2 * Math.PI
      const act: Cmd = Math.abs(err) > 0.25 ? (err > 0 ? 'left' : 'right') : 'fwd'
      const phase = s.t - pulseT
      const wait = dist < 2.5 || act !== 'fwd' ? 2 * lag + 0.15 : 0
      if (phase < 0.25) want = act
      else if (phase < 0.25 + wait) want = 'stop'
      else {
        pulseT = s.t
        want = act
      }
    }
    setControl(s, want)
    step(s)
  }
  return s
}

/**
 * Impatient driver: holds FORWARD until the picture (the video, or the predicted
 * position when that is on) shows the robot at the dock, then lets go. If the
 * robot has not moved for 1.5 s it presses again, as a child would.
 */
function holder(level: LevelDef, prot: Protections, limit = 120): LinkState {
  const s = createState(level, prot, limit)
  let lastX = s.seen!.pose.x
  let stillSince = 0
  while (s.outcome === 'running') {
    const pp = (s.prot.predict ? predictedPose(s) : null) ?? s.seen!.pose
    const want: Cmd = pp.x < level.dock.x - 0.2 ? 'fwd' : 'stop'
    if (Math.abs(s.seen!.pose.x - lastX) > 0.01) {
      lastX = s.seen!.pose.x
      stillSince = s.t
    } else if (want === 'fwd' && s.t - stillSince > 1.5) {
      setControl(s, 'stop')
      stillSince = s.t
    }
    setControl(s, want)
    step(s)
  }
  return s
}

const ALL_ON: Protections = { ...DEFAULT_PROTECTIONS, ack: true, seq: true, watchdog: true, predict: true, speed: 0.6, retryMs: 400, watchdogMs: 700 }

console.log('Link Lab sim')
ok(LEVELS.length === 6 && new Set(LEVELS.map((l) => l.id)).size === 6 && LEVELS.every((l, i) => l.n === i + 1), 'six levels, unique ids, numbered 1–6')
for (const L of LEVELS) {
  ok(!!ROUTES[L.id], `${L.id}: has a scripted route`)
  const a = careful(L, ALL_ON)
  const b = careful(L, ALL_ON)
  ok(a.outcome === b.outcome && a.t === b.t && a.pose.x === b.pose.x && a.stats.lost === b.stats.lost, `${L.id}: deterministic (same inputs → same run)`)
  const sc = scoreRun(a)
  ok(a.outcome === 'won' && sc.stars === 3, `${L.id}: careful driver with protections docks for 3 stars (got ${a.outcome}, ${sc.stars}★ at ${a.t.toFixed(1)} s)`)
  const pitFree = L.pits.every((p) => !(L.dock.x > p.x && L.dock.x < p.x + p.w && L.dock.y > p.y && L.dock.y < p.y + p.h))
  ok(pitFree, `${L.id}: dock is not inside a pit`)
}
// The broken links really break (the lesson of each level).
ok(holder(getL('far'), DEFAULT_PROTECTIONS).outcome === 'fell', 'far: holding FORWARD with no protection overshoots into the pit')
ok(holder(getL('far'), { ...DEFAULT_PROTECTIONS, predict: true }).outcome === 'won', 'far: the same driver docks with the predicted position')
{
  const tunnel = getL('tunnel')
  const falls = (p: Protections) => Array.from({ length: 12 }, (_, k) => holder({ ...tunnel, seed: tunnel.seed + k * 13 }, p).outcome).filter((o) => o === 'fell').length
  const none = falls(DEFAULT_PROTECTIONS)
  const ack = falls({ ...DEFAULT_PROTECTIONS, ack: true })
  const wd = falls({ ...DEFAULT_PROTECTIONS, watchdog: true })
  ok(none >= 6, `tunnel: a STOP sent in the radio shadow is usually lost and the robot falls (${none}/12)`)
  ok(ack >= 4, `tunnel: retries alone often do not save it (${ack}/12)`)
  ok(wd <= 1, `tunnel: the watchdog stops it before the pit (${wd}/12 fell)`)
}
{
  const lossy = getL('lossy')
  let fell = 0
  let fellAck = 0
  let wonAck = 0
  for (let k = 0; k < 12; k++) {
    if (holder({ ...lossy, seed: lossy.seed + k * 13 }, DEFAULT_PROTECTIONS).outcome === 'fell') fell++
    const r = holder({ ...lossy, seed: lossy.seed + k * 13 }, { ...DEFAULT_PROTECTIONS, ack: true })
    if (r.outcome === 'fell') fellAck++
    if (r.outcome === 'won') wonAck++
  }
  ok(fell >= 2, `lossy: without acks a lost STOP sends the robot into the pit in some runs (${fell}/12)`)
  ok(fellAck === 0 && wonAck >= 8, `lossy: with ack + retry the same driver never falls and usually docks (${wonAck}/12 docked)`)
}
{
  const j = getL('jumbled')
  let obeyed = 0
  let ignored = 0
  for (let k = 0; k < 6; k++) {
    obeyed += careful({ ...j, seed: j.seed + k }, { ...DEFAULT_PROTECTIONS, ack: true }).stats.staleObeyed
    const r = careful({ ...j, seed: j.seed + k }, { ...DEFAULT_PROTECTIONS, ack: true, seq: true })
    ignored += r.stats.staleIgnored
    ok(r.stats.staleObeyed === 0, `jumbled seed+${k}: with sequence numbers no old command is ever obeyed`)
  }
  ok(obeyed > 0, `jumbled: without sequence numbers old commands are obeyed (${obeyed})`)
  ok(ignored > 0, `jumbled: with sequence numbers old commands are thrown away (${ignored})`)
}
{
  const storm = getL('storm')
  const twitchy = careful(storm, { ...ALL_ON, watchdogMs: 150 })
  ok(twitchy.stats.needlessStops > storm.maxNeedless, `storm: a 150 ms watchdog makes needless stops (${twitchy.stats.needlessStops} > ${storm.maxNeedless})`)
  ok(!storm.required({ ...ALL_ON, watchdogMs: 2500 }), 'storm: a 2.5 s watchdog does not count as the right protection')
}
{
  const L = getL('clear')
  const s = createState(L, DEFAULT_PROTECTIONS)
  s.outcome = 'fell'
  ok(scoreRun(s).stars === 0, 'scoring: no stars without docking')
  const lossy = getL('lossy')
  const r = careful(lossy, { ...DEFAULT_PROTECTIONS, speed: 0.6 })
  if (r.outcome === 'won') ok(scoreRun(r).stars === 1, 'scoring: docked without the level’s protection = 1 star')
}

function getL(id: string): LevelDef {
  const l = LEVELS.find((x) => x.id === id)
  if (!l) throw new Error(`no level ${id}`)
  return l
}

console.log('Robot Security Check')
ok(FLEET.filter((r) => r.weakest).length === 1, 'step 1: exactly one weakest robot')
ok(UPDATES.filter((u) => checkSignature(u).status === 'valid').length === 1, 'step 2: exactly one update passes the signature check')
ok(checkSignature(UPDATES.find((u) => u.id === 'email')!).status === 'changed', 'step 2: the changed file fails (fingerprint mismatch)')
ok(checkSignature(UPDATES.find((u) => u.id === 'forum')!).status === 'missing', 'step 2: the unsigned file has no signature')
ok(PASSWORDS.filter((p) => p.strong).length === 1, 'step 3: exactly one strong password')
ok(permissionMistakes(new Set(PERMISSIONS.filter((p) => p.needed).map((p) => p.id))).length === 0, 'step 4: granting exactly the needed permissions is right')
ok(permissionMistakes(new Set(PERMISSIONS.map((p) => p.id))).length === PERMISSIONS.filter((p) => !p.needed).length, 'step 4: granting everything flags every unneeded permission')
ok(securityStars(0) === 3 && securityStars(2) === 2 && securityStars(5) === 1, 'stars: 0 mistakes 3★, ≤2 2★, more 1★')

console.log('Galaxy activities')
const ids = guardiansNet.map((a) => a.id)
ok(new Set(ids).size === ids.length, `${ids.length} activities, unique ids`)
ok(guardiansNet.every((a) => a.id.startsWith('guardians-net-') && a.world === 'guardians' && (a.concepts?.length ?? 0) > 0), 'all are guardians-net-*, world guardians, with concepts')
ok(['explorers', 'builders', 'inventors', 'engineers'].every((b) => guardiansNet.some((a) => a.band === b)), 'every age band has at least one')
const live = new Set(ALL_ACTIVITIES.map((a) => a.id))
const missing = ids.filter((id) => !live.has(id))
if (missing.length) warn(`${missing.length} activities are not registered yet: add guardiansNet to ZONE_FILES.guardians in lib/kids/activities/content/zones/index.ts`)
else ok(true, 'all registered in the live Galaxy')

console.log('Personal-best ids')
const worldSrc = readFileSync(join(__dirname, '../worlds/guardians/GuardiansWorldClient.tsx'), 'utf8')
ok(worldSrc.includes(`'${SECURITY_BEST_ID}'`), 'Guardians world reads the Security Check best id')
ok(worldSrc.includes(`'${LINK_BEST_PREFIX}'`) && worldSrc.includes(`LINK_LAB_LEVELS = ${LEVELS.length}`), 'Guardians world reads the Link Lab prefix and level count')

console.log(failures ? `\n✗ ${failures} failure(s), ${warnings} warning(s)` : `\n✓ net verify passed (${warnings} warning(s))`)
if (failures) process.exit(1)
