// components/kids/games/drone-hover/drone-hover.verify.ts
// Headless checks for Sky Port: Drone Pilot (Wave 3 QA fixes). Runs the real
// sim and scorer; no DOM.
//   1. Debriefs tell the truth about the cause: a Cadet ceiling crash says
//      "thrust bigger than weight" (never "push the throttle up"), a Cadet
//      fall says "smaller"; Ace with every gain at 0 is "no push", not the
//      I term; Legend with Ki = 0 never claims "I kept the height".
//   2. Difficulty is honest: random slider settings rarely win (Legend < 3%,
//      Ace < 15%), Ace with Ki = 0 never wins, Legend without a working I
//      term never gets 3 stars, a wildly over-tuned Pilot Kp loses.
//   3. Every tier can be won: a hand-flown Cadet, a sensible Pilot Kp, a
//      tip-following Ace PID, a Legend cascade with I all win (Ace and
//      Legend with 3 stars).
//   4. "More time": the Cadet clock follows kidsTimeLimit (x2, untimed), the
//      other tiers' simulated mission time does not; same gains, same score.
//   5. Source checks for the layout fixes (no <section> around the Legend
//      slider groups, no sticky action bar, kids reduced-motion/calm hooks).
//
// Run:  npx tsx components/kids/games/drone-hover/drone-hover.verify.ts   (exit 1 on any ✗)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ACE_MIN_WIN,
  buildMission,
  createSim,
  defaultGains,
  LEGEND_MIN_WIN,
  mulberry32,
  scoreFlight,
  simulate,
  stepSim,
  type Gains,
  type SimState,
  type TierIndex,
} from './sim'

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`✓ ${name}${detail ? ` (${detail})` : ''}`)
  else {
    failures++
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Fly Cadet by hand with a throttle policy, as a child would. */
function flyCadet(policy: (s: SimState) => number, limit: (b: number) => number = (b) => b): SimState {
  const s = createSim(buildMission(0, limit), defaultGains(0))
  while (s.outcome === 'flying' && s.t < 400) stepSim(s, policy(s))
  return s
}

function randomGains(tier: TierIndex, rng: () => number): Gains {
  const u = (a: number, b: number, st: number) => Math.round((a + rng() * (b - a)) / st) * st
  // The slider ranges in DroneHoverGameClient.tsx (ALT_SLIDERS, LEGEND_SLIDERS).
  if (tier === 3) return { kp: u(0, 40, 0.5), ki: u(0, 15, 0.5), kd: u(0, 15, 0.5), kpx: u(0, 30, 0.5), kdx: u(0, 30, 0.5), kpa: u(0, 3, 0.05), kda: u(0, 0.5, 0.01) }
  if (tier === 2) return { ...defaultGains(2), kp: u(0, 60, 1), ki: u(0, 25, 0.5), kd: u(0, 20, 0.5) }
  return { ...defaultGains(1), kp: u(0, 60, 1) }
}

// ── 1. debriefs ──────────────────────────────────────────────────────────────

{
  const s = flyCadet(() => 1)
  const r = scoreFlight(s)
  check('Cadet full throttle crashes through the ceiling', s.outcome === 'crash' && s.crashReason.includes('airspace'), s.crashReason)
  check('Cadet ceiling debrief: thrust BIGGER than weight, take the throttle down', /bigger than weight/.test(r.message) && /throttle down/.test(r.message) && !/push the throttle up/.test(r.message) && !/smaller than weight/.test(r.message), r.message)
}
{
  // Climb to ~4 m, then cut the throttle. The Cadet assist (3 N per m/s) caps
  // the fall near weight/3 ≈ 3.3 m/s, minus air drag, so it lands hard but safe.
  let cut = false
  const s = flyCadet((st) => {
    if (st.z > 4) cut = true
    return cut ? 0 : 0.6
  })
  check('Cadet cut throttle: the assist lands it (no crash, no softlock)', s.outcome === 'timeout' && s.z === 0, `${s.outcome} at ${s.t.toFixed(0)} s`)
  // A ground crash (e.g. from a faster fall) gets the "smaller than weight" debrief.
  const c = createSim(buildMission(0), defaultGains(0))
  c.outcome = 'crash'
  c.crashReason = 'hit the ground at 4.2 m/s'
  const r = scoreFlight(c)
  check('Cadet ground-crash debrief: thrust SMALLER than weight, push up', /smaller than weight/.test(r.message) && /throttle up/.test(r.message) && !/bigger/.test(r.message), r.message)
}
{
  const r = scoreFlight(simulate(buildMission(2), { ...defaultGains(2), kp: 0, ki: 0, kd: 0 }))
  check('Ace all gains 0: "no push" debrief, not the I-term lesson', r.stars === 0 && r.scoreLabel === 'never took off' && /no push/.test(r.message) && !/I term's job/.test(r.message), r.message.slice(0, 90))
}
{
  const r = scoreFlight(simulate(buildMission(1), { ...defaultGains(1), kp: 60 }))
  check('Pilot Kp = 60 (slider max) loses on overshoot', r.stars === 0 && /overshot/.test(r.message), `${r.score}, ${r.message.slice(0, 60)}`)
}
{
  // The QA tester's exact Legend tune with Ki = 0 (was 3 stars + "I kept the height").
  const g: Gains = { kp: 25.5, ki: 0, kd: 8, kpx: 12.5, kdx: 12, kpa: 0.85, kda: 0.22 }
  const r = scoreFlight(simulate(buildMission(3), g))
  check('Legend Ki = 0 tune: at most 2 stars, says "no I term"', r.stars > 0 && r.stars <= 2 && /no I term/.test(r.message) && !/I kept the height/.test(r.message), `${r.stars}★ ${r.score}`)
  const tok = scoreFlight(simulate(buildMission(3), { ...g, ki: 0.5 }))
  check('Legend token Ki = 0.5 (I never does work): at most 2 stars, says why', tok.stars <= 2 && /I term was so small/.test(tok.message), `${tok.stars}★ ${tok.score}`)
}

// ── 2. difficulty honesty ────────────────────────────────────────────────────

{
  const rng = mulberry32(20261127)
  const m = buildMission(3)
  const N = 1500
  let wins = 0
  let threes = 0
  let lies = 0
  let noI3 = 0
  for (let k = 0; k < N; k++) {
    const g = randomGains(3, rng)
    if (k % 3 === 0) g.ki = 0
    const s = simulate(m, g)
    const r = scoreFlight(s)
    if (r.stars > 0) wins++
    if (r.stars === 3) threes++
    if (r.stars > 0 && r.score < LEGEND_MIN_WIN) lies++
    if (g.ki === 0 && /I kept the height/.test(r.message)) lies++
    if (g.ki === 0 && r.stars === 3) noI3++
  }
  check('Legend: random slider settings win under 3%', wins / N < 0.03, `${wins}/${N} = ${((100 * wins) / N).toFixed(1)}%`)
  check('Legend: random 3-star under 0.5%', threes / N < 0.005, `${threes}/${N}`)
  check(`Legend: no win under ${LEGEND_MIN_WIN}, no "I kept the height" with Ki = 0`, lies === 0, `${lies}`)
  check('Legend: Ki = 0 never earns 3 stars', noI3 === 0, `${noI3}`)
}
{
  const rng = mulberry32(777)
  const m = buildMission(2)
  const N = 1500
  let wins = 0
  let ki0wins = 0
  let under = 0
  for (let k = 0; k < N; k++) {
    const g = randomGains(2, rng)
    if (k % 4 === 0) g.ki = 0
    const r = scoreFlight(simulate(m, g))
    if (r.stars > 0) wins++
    if (r.stars > 0 && g.ki === 0) ki0wins++
    if (r.stars > 0 && r.score < ACE_MIN_WIN) under++
  }
  check('Ace: random slider settings win under 15%', wins / N < 0.15, `${wins}/${N} = ${((100 * wins) / N).toFixed(1)}%`)
  check('Ace: Ki = 0 never wins (only I beats the parcel sag to 6 cm)', ki0wins === 0, `${ki0wins}`)
  check(`Ace: no win under ${ACE_MIN_WIN}`, under === 0, `${under}`)
}

// ── 3. every tier can be won ─────────────────────────────────────────────────

{
  // A hand-flown hover: throttle ≈ weight/(2·tMax) plus a little height correction.
  const s = flyCadet((st) => {
    const w = (1 + st.payload) * 9.81
    return Math.max(0, Math.min(1, w / 22 + 0.08 * (st.target.z - st.z) - 0.05 * st.vz))
  })
  const r = scoreFlight(s)
  check('Cadet: a steady hand wins 3 stars', s.outcome === 'complete' && r.stars === 3, `${r.stars}★ in ${r.score} s`)
}
{
  const r = scoreFlight(simulate(buildMission(1), { ...defaultGains(1), kp: 20 }))
  check('Pilot: Kp = 20 wins', r.stars > 0, `${r.stars}★ ${r.score}`)
}
{
  const r = scoreFlight(simulate(buildMission(2), { ...defaultGains(2), kp: 40, ki: 6, kd: 15 }))
  check('Ace: a tip-following PID (40, 6, 15) wins 3 stars', r.stars === 3 && /I cancelled/.test(r.message), `${r.stars}★ ${r.score}`)
}
{
  const r = scoreFlight(simulate(buildMission(3), { kp: 25.5, ki: 3, kd: 10, kpx: 12.5, kdx: 12, kpa: 0.85, kda: 0.22 }))
  check('Legend: a cascade with I wins 3 stars and credits I', r.stars === 3 && /I kept the height/.test(r.message), `${r.stars}★ ${r.score}`)
}

// ── 4. more time + determinism ───────────────────────────────────────────────

{
  const m2 = buildMission(0, (b) => b * 2)
  const mu = buildMission(0, () => Infinity)
  check('Cadet "more time" x2 doubles the clock and the star times', m2.duration === 180 && m2.starScale === 2, `${m2.duration} s, x${m2.starScale}`)
  check('Cadet untimed has no clock', mu.duration === Infinity && mu.starScale === 2)
  const idle = flyCadet(() => 0, (b) => b * 2)
  check('Cadet x2: an idle drone only times out after 180 s', idle.outcome === 'timeout' && Math.abs(idle.t - 180) < 0.01, `${idle.t.toFixed(1)} s`)
  const ace = buildMission(2, (b) => b * 2)
  check('Ace mission time is not stretched (simulated, part of the puzzle)', ace.duration === 38 && ace.starScale === 1)
  // A 50-second Cadet finish: 1 star normally, 2 stars with "more time" x2 (≤ 90 s).
  const slowPolicy = (st: SimState) => (st.t < 40 ? 0 : Math.max(0, Math.min(1, ((1 + st.payload) * 9.81) / 22 + 0.08 * (st.target.z - st.z) - 0.05 * st.vz)))
  const a = scoreFlight(flyCadet(slowPolicy))
  const b = scoreFlight(flyCadet(slowPolicy, (x) => x * 2))
  check('Cadet: the same slow finish earns more stars with "more time"', a.stars >= 1 && b.stars > a.stars, `${a.stars}★ → ${b.stars}★ at ${a.score} s`)
}
{
  const g: Gains = { kp: 25.5, ki: 3, kd: 10, kpx: 12.5, kdx: 12, kpa: 0.85, kda: 0.22 }
  const a = scoreFlight(simulate(buildMission(3), g))
  const b = scoreFlight(simulate(buildMission(3), g))
  check('Same gains, same score (seeded)', a.score === b.score && a.message === b.message)
}

// ── 5. source checks for the layout fixes ────────────────────────────────────

{
  const src = readFileSync(join(__dirname, 'DroneHoverGameClient.tsx'), 'utf8')
  const legendBlock = src.slice(src.indexOf('LEGEND_SLIDERS.map'), src.indexOf('LEGEND_SLIDERS.map') + 300)
  check('Legend slider groups are not <section> (no inherited 120px padding)', !/<section/.test(legendBlock))
  check('Action bar is not a sticky that never sticks', !/sticky bottom-/.test(src))
  check('Kids reduced-motion, calm and more-time settings are wired', /useKidsReducedMotion\(\)/.test(src) && /useKidsCalm\(\)/.test(src) && /kidsTimeLimit/.test(src))
  check('No raw prefers-reduced-motion query (the kids setting covers it)', !/prefers-reduced-motion/.test(src))
  const render = readFileSync(join(__dirname, 'render.ts'), 'utf8')
  check('Sky has no purple stops (brand)', !/#2a1650|#1a1236|196,181,253/.test(render))
}

if (failures) {
  console.log(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll drone-hover checks passed')
