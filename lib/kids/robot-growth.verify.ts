// lib/kids/robot-growth.verify.ts
// Checks for the robot that grows (roadmap #33), X-ray (#36) and the
// robot's-eye sensor view (#37):
//   1. upgrade slots: share codes round-trip, old 8-field codes still decode,
//      unknown ids are dropped, a second sensor adds its capability;
//   2. unlocks: every non-starter upgrade has a rule, every rule points at a
//      real game / World / page, nothing is unlocked for a new child and
//      everything is for a child who has done it all (progress only grows, so
//      nothing ever locks again);
//   3. learned parts: every rule names a real badge / Code Lab mission, the line
//      sensor glows after Line Rider, the greeting never guilt-trips;
//   4. spec sheet: finite, positive numbers for every combination, and the
//      trade-offs point the right way (heavier pack = heavier and longer, speedy
//      beats torque on speed, an arm adds reach, a drone empties fastest);
//   5. X-ray: every wire's two ends have an anchor in the 3D robot, for every
//      body × drive × World form; Engineers see volts and amps, Explorers do not;
//   6. sensor view: the engine reports all 20 echo rays, the nearest equals
//      distanceCm, and reading sensors is still a pure read.
//
// Run:  npx tsx lib/kids/robot-growth.verify.ts

import {
  capabilitiesOf,
  cleanUpgrades,
  decodeDesign,
  DEFAULT_DESIGN,
  encodeDesign,
  UPGRADE_DEFAULT,
  UPGRADE_PARTS,
  UPGRADE_SLOTS,
  upgradesForSlot,
  type BodyId,
  type ChassisId,
  type DriveId,
  type RobotDesign,
} from './robot-design'
import {
  isUpgradeUnlocked,
  learnedSlots,
  LEARN_RULES,
  nextMission,
  robotGreeting,
  specSheet,
  UPGRADE_UNLOCKS,
  wireSignal,
  type GrowthProgress,
} from './robot-growth'
import { wiringOf } from './robot-wiring'
import { MISSIONS } from './code-lab/missions'
import { UNIVERSE_BADGES } from './universe/rewards'
import { GAMES, WORLDS } from './universe/worlds'
import { buildRobot, getRobotHandles, setExplode, setXray } from './robot3d'
import { loadRapier } from './sim/rapier'
import { createSim } from './sim/engine'
import { cruisePower } from './sim/robot-spec'
import { DEMOS, designFor } from './sim/demos'

let failed = 0
let passed = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const EMPTY: GrowthProgress = { badges: {}, codeMissions: {}, personalBests: {}, xp: 0, band: null, earnedParts: [] }

async function main(): Promise<void> {
  // ── 1. Slots and share codes ──────────────────────────────────────────────
  const up: RobotDesign = { ...DEFAULT_DESIGN, name: 'Bolt', upgrades: { power: 'lipo', motor: 'torque', sensor2: 'bumper', arm: 'arm3', chassis: 'sub' } }
  const code = encodeDesign(up)
  const back = decodeDesign(code)
  check('share code round-trips every upgrade', JSON.stringify(back?.upgrades) === JSON.stringify(up.upgrades), code)
  check('a design with no upgrades keeps the old 8-field code', encodeDesign(DEFAULT_DESIGN).split('.').length === 8, encodeDesign(DEFAULT_DESIGN))
  const old = decodeDesign('box.tracks.camera.gripper.line.F59E0B.3B82F6.Sparky')
  check('an old code still decodes, with no upgrades', old !== null && old.name === 'Sparky' && old.upgrades === undefined)
  check('unknown upgrade ids are dropped', JSON.stringify(cleanUpgrades({ power: 'nuclear', motor: 'speedy', arm: 'none' })) === JSON.stringify({ motor: 'speedy' }))
  check('starter parts are not stored', cleanUpgrades({ ...UPGRADE_DEFAULT }) === undefined)
  check('a broken upgrade field never breaks the robot', decodeDesign(`${encodeDesign(DEFAULT_DESIGN)}.%%~~`)?.name === DEFAULT_DESIGN.name)
  const lineBump: RobotDesign = { ...DEFAULT_DESIGN, sensor: 'line', upgrades: { sensor2: 'bumper' } }
  const caps = capabilitiesOf(lineBump)
  check('a second sensor adds its capability (line + bumper)', caps.has('follow-line') && caps.has('feel-bump'))
  for (const s of UPGRADE_SLOTS) check(`slot ${s} has its starter part`, upgradesForSlot(s).some((p) => p.id === UPGRADE_DEFAULT[s]))

  // ── 2. Unlocks ────────────────────────────────────────────────────────────
  const gameIds = new Set(GAMES.map((g) => g.id))
  const worldIds = new Set(WORLDS.map((w) => w.id))
  for (const p of UPGRADE_PARTS) {
    const key = `${p.slot}:${p.id}`
    const starter = UPGRADE_DEFAULT[p.slot] === p.id
    check(`${key}: has an unlock rule (or is the starter)`, starter || key in UPGRADE_UNLOCKS)
    check(`${key}: a new child has ${starter ? 'it' : 'not unlocked it'}`, isUpgradeUnlocked(EMPTY, p.slot, p.id) === starter)
  }
  for (const [key, rule] of Object.entries(UPGRADE_UNLOCKS)) {
    const [slot, id] = key.split(':')
    check(`${key}: rule names a real part`, UPGRADE_PARTS.some((p) => p.slot === slot && p.id === id))
    const play = rule.href.match(/^\/kids\/play\/([^/]+)$/)
    const world = rule.href.match(/^\/kids\/worlds\/([^/]+)$/)
    check(`${key}: link is a /kids page`, rule.href.startsWith('/kids/'), rule.href)
    if (play) check(`${key}: game ${play[1]} exists`, gameIds.has(play[1]))
    if (world) check(`${key}: World ${world[1]} exists`, (worldIds as Set<string>).has(world[1]))
    check(`${key}: says how in words`, rule.how.length > 8 && !/\b(buy|pay|price)\b/i.test(rule.how))
  }
  const everything: GrowthProgress = {
    badges: Object.fromEntries(UNIVERSE_BADGES.map((b) => [b.id, '2026-11-27'])),
    codeMissions: Object.fromEntries(MISSIONS.map((m) => [m.id, 3])),
    personalBests: Object.fromEntries(GAMES.map((g) => [`${g.id}:t1`, 1])),
    xp: 99999,
    band: 'engineers',
    earnedParts: [],
  }
  for (const p of UPGRADE_PARTS) check(`${p.slot}:${p.id}: unlocked once everything is done`, isUpgradeUnlocked(everything, p.slot, p.id))
  const chassisWorld: Record<Exclude<ChassisId, 'ground'>, string> = { drone: 'smart-farm', sub: 'ocean-rescue', humanoid: 'orbit-repair' }
  for (const [form, game] of Object.entries(chassisWorld)) {
    check(`World form ${form} comes from its World's game (${game})`, isUpgradeUnlocked({ ...EMPTY, personalBests: { [`${game}:t2`]: 10 } }, 'chassis', form))
  }

  // ── 3. Learned parts + greeting ──────────────────────────────────────────
  const missionIds = new Set(MISSIONS.map((m) => m.id))
  const badgeIds = new Set(UNIVERSE_BADGES.map((b) => b.id))
  for (const r of LEARN_RULES) {
    for (const m of r.missions ?? []) check(`learn rule "${r.learned}": mission ${m} exists`, missionIds.has(m))
    for (const b of r.badges ?? []) check(`learn rule "${r.learned}": badge ${b} exists`, badgeIds.has(b))
  }
  const lineBot: RobotDesign = { ...DEFAULT_DESIGN, sensor: 'line' }
  check('the line sensor is dark before Line Rider', !learnedSlots(EMPTY, lineBot).includes('sensor'))
  check('the line sensor glows after Line Rider', learnedSlots({ ...EMPTY, badges: { 'line-rider': 'x' } }, lineBot).includes('sensor'))
  check('a part that is not fitted does not glow', !learnedSlots({ ...EMPTY, badges: { 'line-rider': 'x' } }, DEFAULT_DESIGN).includes('sensor'))
  const g0 = robotGreeting(EMPTY, DEFAULT_DESIGN)
  const g1 = robotGreeting({ ...EMPTY, badges: { 'line-rider': 'x', 'first-drive': 'x' }, codeMissions: { 'first-steps': 3 } }, lineBot)
  check('greeting names what was learned', /follow a line/.test(g1.text) && /drive/.test(g1.text), g1.text)
  check('greeting offers the next mission', g0.next?.id === 'first-steps' && g1.next?.id === 'turn-the-corner', `${g0.next?.id} / ${g1.next?.id}`)
  const guilt = /\b(miss(ed)?|forgot|lonely|sad|days?|since|ignored|come back|where were you)\b/i
  check('greeting never guilt-trips', !guilt.test(g0.text) && !guilt.test(g1.text))
  check('nothing next once every mission is done', nextMission(everything) === null)

  // ── 4. Spec sheet ─────────────────────────────────────────────────────────
  const bodies: BodyId[] = ['box', 'dome', 'tall', 'bug']
  const drives: DriveId[] = ['wheels2', 'wheels4', 'tracks', 'legs']
  let bad = 0
  for (const body of bodies)
    for (const drive of drives)
      for (const power of upgradesForSlot('power'))
        for (const motor of upgradesForSlot('motor'))
          for (const chassis of upgradesForSlot('chassis')) {
            const d: RobotDesign = { ...DEFAULT_DESIGN, body, drive, tool: 'gripper', upgrades: { power: power.id as never, motor: motor.id as never, chassis: chassis.id as never, arm: 'arm2' } }
            const s = specSheet(d)
            const nums = [s.massKg, s.runtimeMin, s.topSpeed, s.reachCm, s.volts, s.watts, s.amps]
            if (!nums.every((n) => Number.isFinite(n) && n > 0)) bad++
          }
  check('spec sheet: positive, finite numbers for every combination', bad === 0, `${bad} bad`)
  const sp = (u: RobotDesign['upgrades'], d: Partial<RobotDesign> = {}) => specSheet({ ...DEFAULT_DESIGN, ...d, upgrades: u })
  check('a big pack is heavier', sp({ power: 'bigpack' }).massKg > sp({}).massKg)
  check('a big pack lasts longer', sp({ power: 'bigpack' }).runtimeMin > sp({}).runtimeMin)
  check('solar lasts longer than the same pack without it', sp({ power: 'solar' }).runtimeMin > sp({ power: 'lipo' }).runtimeMin)
  check('speedy motors are faster than torque motors', sp({ motor: 'speedy' }).topSpeed > sp({ motor: 'torque' }).topSpeed)
  check('an arm adds reach', sp({ arm: 'arm3' }, { tool: 'gripper' }).reachCm > sp({}, { tool: 'gripper' }).reachCm)
  check('a drone empties its battery fastest', sp({ chassis: 'drone' }).runtimeMin < sp({}).runtimeMin)
  check('legs use more power than two wheels', sp({}, { drive: 'legs' }).watts > sp({}).watts)
  // #39: a ground robot's spec-sheet runtime IS the simulator's (cruisePower drains with the engine's constants).
  {
    let off = 0
    for (const power of ['aa', 'lipo', 'bigpack'] as const)
      for (const drive of drives) {
        const d: RobotDesign = { ...DEFAULT_DESIGN, drive, upgrades: { power } }
        if (specSheet(d).runtimeMin !== Math.max(1, cruisePower(d).runtimeMin)) off++
      }
    check('spec sheet runtime = the simulator’s cruise runtime for every ground pack and drive', off === 0, `${off} differ`)
  }
  check('legs run out first, two wheels last (walking costs energy)', sp({}, { drive: 'legs' }).runtimeMin < sp({}, { drive: 'tracks' }).runtimeMin && sp({}, { drive: 'tracks' }).runtimeMin < sp({}).runtimeMin)
  check('the default robot drives at the simulator speed', Math.abs(sp({}).topSpeed - 0.42) < 0.01, String(sp({}).topSpeed))

  // ── 5. X-ray wiring ───────────────────────────────────────────────────────
  let missing = 0
  const missingWhere: string[] = []
  for (const body of bodies)
    for (const drive of drives)
      for (const chassis of upgradesForSlot('chassis')) {
        const d: RobotDesign = { ...DEFAULT_DESIGN, body, drive, head: 'camera', tool: 'light', sensor: 'line', upgrades: { power: 'solar', sensor2: 'color', arm: 'arm2', chassis: chassis.id as never } }
        const robot = buildRobot(d, { worldForm: true, internals: true, learned: ['sensor', 'head'] })
        const h = getRobotHandles(robot)
        for (const w of wiringOf(d)) {
          if (!h?.anchors[w.from] || !h?.anchors[w.to]) {
            missing++
            missingWhere.push(`${body}/${drive}/${chassis.id}: ${w.id}`)
          }
        }
        setXray(robot, true)
        setExplode(robot, 1)
        const tubes = h?.wires.every((x) => (x.mesh.geometry.getAttribute('position')?.count ?? 0) > 0)
        if (!tubes) {
          missing++
          missingWhere.push(`${body}/${drive}/${chassis.id}: empty tube`)
        }
      }
  check('every wire has both ends in the 3D robot (all bodies × drives × forms)', missing === 0, missingWhere.slice(0, 4).join('; '))
  const wire = wiringOf(DEFAULT_DESIGN).find((w) => w.id === 'head-brain')
  check('distance eyes have a sensor wire', Boolean(wire))
  if (wire) {
    const kid = wireSignal(wire, DEFAULT_DESIGN, 'explorers', { distanceCm: 34, leftPct: 0, rightPct: 0 })
    const teen = wireSignal(wire, DEFAULT_DESIGN, 'engineers', { distanceCm: 34, leftPct: 0, rightPct: 0 })
    check('signal: "distance sensor → brain: 34 cm"', /34 cm/.test(kid), kid)
    check('Explorers see no volts or amps', !/\d\s?(V|A|mA)\b/.test(kid), kid)
    check('Engineers see volts and current', /\d V/.test(teen) && /(mA|A)\b/.test(teen), teen)
  }
  const noBumper = wiringOf(DEFAULT_DESIGN).some((w) => w.from === 'sensor')
  check('no floor sensor, no floor-sensor wire', !noBumper)

  // ── 6. Robot's-eye: 20 echo rays ─────────────────────────────────────────
  const R = await loadRapier()
  const demo = DEMOS.find((x) => x.id === 'stop-before-wall') ?? DEMOS[0]
  const design = designFor(DEFAULT_DESIGN, demo.goodParts)
  const sim = createSim(R, demo.arena, design)
  sim.setMotors(60, 60)
  for (let i = 0; i < 30; i++) sim.step()
  const s1 = sim.sensors()
  check('20 echo rays', s1.beams.length === 20, String(s1.beams.length))
  const nearest = Math.min(...s1.beams.filter((b) => b.hit).map((b) => b.cm), 200)
  check('the nearest ray is the distance reading', Math.abs(nearest - s1.distanceCm) < 0.11, `${nearest} vs ${s1.distanceCm}`)
  check('rays fan 5 wide and 4 deep', new Set(s1.beams.map((b) => b.yawDeg)).size === 5 && new Set(s1.beams.map((b) => b.pitchDeg)).size === 4)
  check('a hit is always inside 2 m', s1.beams.every((b) => !b.hit || b.cm <= 200))
  const fp = JSON.stringify(sim.snapshot())
  sim.sensors()
  sim.sensors()
  check('reading the rays never changes the simulation', JSON.stringify(sim.snapshot()) === fp)
  sim.dispose()

  console.log(`robot-growth verify: ${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}

void main()
