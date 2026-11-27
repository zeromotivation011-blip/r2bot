// components/kids/games/circuit-city/circuit-city.verify.ts
// Pure checks for Circuit City (run in CI: npx tsx …/circuit-city.verify.ts).
// Proves the QA fixes against the real solver:
//   1. A correct circuit on a drained battery is never blamed on the wiring
//      (no "not a complete loop", no "series", no "resistor too big").
//   2. Real wiring mistakes still get the right explanation on a full battery.
//   3. Legend is genuinely hard: random settings on the right topology almost never win.
//   4. The star rule: an answer hint caps the finish at 2 stars.
//   5. The physics numbers quoted in the game are true.

import { LED_BURN_A, RESISTOR_VALUES, ldrOhms, nodeId as n, type Part } from './circuit'
import { FLAT_CHARGE, LEGEND_SWEEP, TIERS, roundStars, runTest, type TestReport } from './levels'

let failures = 0
function check(ok: boolean, label: string, extra = ''): void {
  if (ok) console.log(`  ok   ${label}`)
  else {
    failures++
    console.error(`  FAIL ${label}${extra ? ` — ${extra}` : ''}`)
  }
}

let seq = 0
const wire = (a: number, b: number): Part => ({ id: `w${++seq}`, kind: 'wire', a: Math.min(a, b), b: Math.max(a, b) })
const withCharge = (parts: Part[], charge: number): Part[] => parts.map((p) => (p.kind === 'battery' ? { ...p, charge } : p))
const initial = (tier: number): Part[] => TIERS[tier].initial.map((p) => ({ ...p }))

// ── Reference circuits ──────────────────────────────────────────────────────

function cadet(): Part[] {
  return [
    ...initial(0),
    wire(n(1, 2), n(2, 2)),
    { id: 'sw', kind: 'switch', a: n(2, 2), b: n(3, 2), on: true },
    wire(n(3, 2), n(4, 2)),
    wire(n(4, 2), n(5, 2)),
    wire(n(1, 3), n(2, 3)),
    wire(n(2, 3), n(3, 3)),
    wire(n(3, 3), n(4, 3)),
    wire(n(4, 3), n(5, 3)),
  ]
}

const lamp = (id: string, a: number, b: number): Part => ({ id, kind: 'lamp', a, b, color: 'yellow', ohms: 220, loadId: id })

function pilotParallel(): Part[] {
  const p = initial(1)
  for (let x = 1; x < 5; x++) p.push(wire(n(x, 2), n(x + 1, 2)), wire(n(x, 3), n(x + 1, 3)))
  p.push(lamp('L1', n(3, 2), n(3, 3)), lamp('L2', n(4, 2), n(4, 3)), lamp('L3', n(5, 2), n(5, 3)))
  return p
}

function pilotSeries(): Part[] {
  const p = initial(1)
  p.push(wire(n(1, 2), n(2, 2)), lamp('L1', n(2, 2), n(3, 2)), lamp('L2', n(3, 2), n(4, 2)), lamp('L3', n(4, 2), n(5, 2)), wire(n(5, 2), n(5, 3)))
  for (let x = 1; x < 5; x++) p.push(wire(n(x, 3), n(x + 1, 3)))
  return p
}

function ace(r = 220): Part[] {
  const p = initial(2)
  p.push(wire(n(1, 2), n(2, 2)), { id: 'r', kind: 'resistor', a: n(2, 2), b: n(3, 2), ohms: r })
  for (let x = 3; x < 6; x++) p.push(wire(n(x, 2), n(x + 1, 2)))
  for (let x = 1; x < 6; x++) p.push(wire(n(x, 3), n(x + 1, 3)))
  p.push({ id: 'm', kind: 'motor', a: n(2, 2), b: n(2, 3), loadId: 'M' })
  return p
}

function legend(o: { divider?: number; ledR?: number; threshold?: number; mode?: 'below' | 'above' } = {}): Part[] {
  const p = initial(3)
  // Divider: + → LDR → middle (0,3) → resistor → −.
  p.push(
    wire(n(0, 2), n(1, 2)),
    { id: 'ldr', kind: 'ldr', a: n(0, 2), b: n(0, 3) },
    { id: 'rd', kind: 'resistor', a: n(0, 3), b: n(0, 4), ohms: o.divider ?? 10000 },
    wire(n(0, 4), n(1, 4)),
    wire(n(1, 3), n(1, 4)),
  )
  // LED branch: + → resistor → LED → comparator switch → −.
  p.push(wire(n(1, 2), n(2, 2)), { id: 'rl', kind: 'resistor', a: n(2, 2), b: n(3, 2), ohms: o.ledR ?? 100 })
  for (let x = 3; x < 6; x++) p.push(wire(n(x, 2), n(x + 1, 2)))
  p.push(wire(n(5, 3), n(6, 3)), { id: 'cmp', kind: 'comparator', a: n(4, 3), b: n(5, 3), sense: n(0, 3), threshold: o.threshold ?? 3, mode: o.mode ?? 'below' })
  for (let x = 1; x < 4; x++) p.push(wire(n(x, 3), n(x + 1, 3)))
  return p
}

const WRONG_WIRING = /complete loop|not one complete|series|too big|too small|stayed OFF|was ON|No current/i
const DRAINED = [0.4, 0.3, 0.2, 0.1, 0.05, 0.02, 0]

function drainedCheck(name: string, tier: number, parts: Part[]): void {
  const full = runTest(TIERS[tier], parts)
  check(full.pass, `${name}: passes on a full battery`, full.why)
  for (const c of DRAINED) {
    const r: TestReport = runTest(TIERS[tier], withCharge(parts, c))
    if (r.pass) continue
    check(!!r.flat && /battery/i.test(r.why) && !WRONG_WIRING.test(r.why), `${name} at ${Math.round(c * 100)}% charge: blames the battery, not the wiring`, r.why)
    check(/wiring is right/.test(r.why), `${name} at ${Math.round(c * 100)}% charge: says the wiring is right`, r.why)
  }
}

console.log('1. Drained battery never blames correct wiring')
drainedCheck('Cadet house', 0, cadet())
drainedCheck('Pilot parallel ladder', 1, pilotParallel())
drainedCheck('Ace sign + motor', 2, ace())
drainedCheck('Legend night-light', 3, legend())

// The exact QA repro: Pilot ladder at 5% and 2% must not say "series".
for (const c of [0.05, 0.02]) {
  const r = runTest(TIERS[1], withCharge(pilotParallel(), c))
  check(!/series/i.test(r.why), `Pilot ladder at ${c * 100}%: no "series" explanation`, r.why)
}

console.log('2. Real mistakes are still explained')
{
  const series = runTest(TIERS[1], pilotSeries())
  check(!series.pass && /series/i.test(series.why), 'Pilot series wiring (full battery) is explained as series', series.why)
  const drainedSeries = runTest(TIERS[1], withCharge(pilotSeries(), 0.1))
  check(!drainedSeries.pass && !!drainedSeries.flat && /series/i.test(drainedSeries.why) && /fresh batteries/i.test(drainedSeries.why), 'Pilot series on a flat battery: battery AND series both explained', drainedSeries.why)
  const loose = runTest(TIERS[1], [...initial(1), lamp('L1', n(3, 2), n(3, 3)), lamp('L2', n(4, 2), n(4, 3)), lamp('L3', n(5, 2), n(5, 3))])
  check(!loose.pass && !/series/i.test(loose.why) && /no complete path/i.test(loose.why), 'Pilot lamps with no wires: "no complete path", never "series"', loose.why)
  const oneOff = pilotParallel().filter((p) => !(p.kind === 'wire' && p.a === n(4, 3)))
  const oo = runTest(TIERS[1], oneOff)
  check(!oo.pass && /Lamp 3/.test(oo.why) && !/series/i.test(oo.why), 'Pilot ladder with a broken bottom rail: names lamp 3, not "series"', oo.why)
  const gap = cadet().filter((p) => !(p.kind === 'wire' && p.a === n(3, 3)))
  const g = runTest(TIERS[0], gap)
  check(!g.pass && /complete loop/i.test(g.why), 'Cadet with a gap: "not one complete loop"', g.why)
  const big = runTest(TIERS[2], ace(1000))
  check(!big.pass && /too big|too dim/i.test(big.why), 'Ace with 1 kΩ: resistor too big', big.why)
  const short = runTest(TIERS[0], [...cadet(), wire(n(2, 2), n(2, 3))])
  check(!short.pass && /short circuit/i.test(short.why), 'Cadet short circuit is named', short.why)
}

console.log('3. Legend is genuinely hard')
{
  const ref = runTest(TIERS[3], legend())
  check(ref.pass && ref.quality === 1, 'Legend reference design passes with full quality', ref.why)
  // A random setting on the right topology (divider R, LED R, threshold, mode).
  let s = 12345
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)]
  const N = 3000
  let wins = 0
  for (let k = 0; k < N; k++) {
    const threshold = Math.round((0.2 + rnd() * 4.2) / 0.05) * 0.05
    const r = runTest(TIERS[3], legend({ divider: pick(RESISTOR_VALUES), ledR: pick(RESISTOR_VALUES), threshold, mode: rnd() < 0.5 ? 'below' : 'above' }))
    if (r.pass) wins++
  }
  const rate = wins / N
  console.log(`       random-setting win rate: ${(rate * 100).toFixed(2)}% (${wins}/${N})`)
  check(rate < 0.03, 'Legend: a random setting wins under 3% of the time')
  // And the hints alone do not give a number: no threshold or LED resistor value in them.
  const hints = TIERS[3].hints.join(' ')
  check(!/100\s*Ω|10\s*kΩ|\b3(\.0)?\s*V threshold|ON when BELOW/i.test(hints), 'Legend hints give no exact design values')
}

console.log('4. Star rule')
check(roundStars({ mistakes: 0, quality: 1, paidHints: 0, attempts: 1, designTier: true }) === 3, 'clean first-try design earns 3 stars')
for (const t of TIERS) {
  check(t.freeHints >= 1 && t.freeHints < t.hints.length, `${t.name}: some hints are free, the answer hints are not`)
  check(roundStars({ mistakes: 0, quality: 1, paidHints: 1, attempts: 1, designTier: t.tier >= 2 }) === 2, `${t.name}: an answer hint caps the finish at 2 stars`)
}
check(roundStars({ mistakes: 0, quality: 1, paidHints: 0, attempts: 5, designTier: true }) === 2, 'design tiers: more than three tests caps at 2')
check(roundStars({ mistakes: 5, quality: 0.1, paidHints: 3, attempts: 9, designTier: true }) === 1, 'a pass always earns at least 1 star')

console.log('5. Physics numbers quoted in the game')
{
  // Divider from the Legend notes: 4.5 V × 10k ÷ (10k + LDR). LDR ≈ 2 kΩ at 100 lux, 10 kΩ at 10 lux.
  const v100 = (4.5 * 10000) / (10000 + ldrOhms(100))
  const v10 = (4.5 * 10000) / (10000 + ldrOhms(10))
  check(Math.abs(v100 - 3.75) < 0.01 && Math.abs(v10 - 2.25) < 0.01, `divider gives ${v100.toFixed(2)} V at 100 lux and ${v10.toFixed(2)} V at 10 lux`)
  // Daylight indoors by a window is a few hundred to ~1,000 lux; outdoors 10,000–100,000 lux.
  check(Math.max(...LEGEND_SWEEP.map((x) => x.lux)) <= 1000 && /room/i.test(LEGEND_SWEEP[0].label) && LEGEND_SWEEP.find((x) => x.lux === 10)?.label === 'Dusk', 'sweep light levels are labelled as indoor levels')
  check(/1,000 lux/.test(TIERS[3].story) && /10,000/.test(TIERS[3].story), 'Legend story says where the sensor is and what outdoor light is')
  check(FLAT_CHARGE > 0 && FLAT_CHARGE < 1, 'flat-battery threshold is a fraction of full charge')
  check(LED_BURN_A > 0.02, 'LEDs only pop well above their 20 mA rating')
  const houseLamp = TIERS[0].initial.find((p) => p.loadId === 'H')
  check(houseLamp?.ohms === 47, 'Cadet house lamp is 47 Ω (the Streetlight text no longer claims 220 Ω for every lamp)')
}

if (failures) {
  console.error(`\ncircuit-city verify: ${failures} failure(s)`)
  process.exit(1)
}
console.log('\ncircuit-city verify: all checks passed')
