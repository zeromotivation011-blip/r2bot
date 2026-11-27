// components/kids/games/circuit-city/levels.ts
// The four Circuit City missions: what is on the board at the start, which
// parts the child may use, the live goal checklist, and the test each mission
// runs. Every check uses the real solver in ./circuit — nothing is faked.

import {
  MOTOR_START_A,
  batteryEmf,
  formatAmps,
  formatOhms,
  formatVolts,
  formatWatts,
  ledVf,
  nodeId,
  partCurrent,
  solve,
  type Part,
  type PartKind,
  type Solution,
} from './circuit'

export type Scene = 'house' | 'street' | 'fair' | 'nightlight'

export interface TierDef {
  tier: number
  name: string
  title: string
  story: string
  steps: string[]
  initial: Part[]
  /** How many of each part the child may place. Missing = not available. */
  inventory: Partial<Record<PartKind, number>>
  scene: Scene
  /** Fixed light level (lux) for the round, unless the sky slider is shown. */
  lux: number
  skySlider: boolean
  /** Fewest parts a tidy solution needs (for the score). */
  minParts: number
  hints: string[]
  /**
   * How many hints only explain the idea. Any hint past these gives away part
   * of the answer, so it caps the finish at 2 stars (the shared hint rule:
   * the round reports `hintsUsed`, and reportActivity enforces the cap).
   */
  freeHints: number
  defaultOhms: number
}

const W = Number.POSITIVE_INFINITY

export const TIERS: TierDef[] = [
  {
    tier: 0,
    name: 'Cadet',
    title: 'Light up the house',
    story: 'The Kumar family just moved into Circuit City and their house is dark. Wire their light to the battery — and give them a switch.',
    steps: ['Draw wires from the battery to the house light to make one full loop.', 'Put a switch in the loop.', 'Flip the switch on, then press Test.'],
    initial: [
      { id: 'bat', kind: 'battery', a: nodeId(1, 2), b: nodeId(1, 3), cells: 2, charge: 1, locked: true },
      { id: 'house', kind: 'lamp', a: nodeId(5, 2), b: nodeId(5, 3), color: 'yellow', ohms: 47, locked: true, loadId: 'H' },
    ],
    inventory: { wire: W, switch: 1 },
    scene: 'house',
    lux: 5,
    skySlider: false,
    minParts: 8,
    hints: [
      'Electricity only flows in a full circle: out of the + end of the battery, through the light, and back into the − end.',
      'Choose Wire, then drag from dot to dot along the top row: from the battery’s top (+) to the house light’s top. Do the same along the bottom row.',
      'Pick the Switch and drop it on one of the wire gaps — or remove one wire and put the switch there. Tap the switch to turn it on.',
    ],
    freeHints: 1,
    defaultOhms: 1000,
  },
  {
    tier: 1,
    name: 'Pilot',
    title: 'Storm-proof streetlights',
    story: 'Main Street needs three streetlights. A storm is coming: if one lamp breaks, the other two must stay on.',
    steps: [
      'Place all three streetlight modules and wire them to the 6 V battery.',
      'Mind the arrow: each LED lamp only works one way round (+ to +).',
      'Press Test — the storm will knock out lamp 2.',
    ],
    initial: [{ id: 'bat', kind: 'battery', a: nodeId(1, 2), b: nodeId(1, 3), cells: 4, charge: 1, locked: true }],
    inventory: { wire: W, lamp: 3, switch: 1 },
    scene: 'street',
    lux: 3,
    skySlider: false,
    minParts: 11,
    hints: [
      'Try putting the lamps one after another in a single loop first (series). Watch how bright they are.',
      'In series, the 6 V is shared: each LED lamp needs about 2 V before it even starts to glow, so three in a row leave almost nothing.',
      'Make a ladder: a top rail from + and a bottom rail to −, with each lamp as its own rung between them (parallel). Each lamp then gets the full 6 V.',
    ],
    freeHints: 2,
    defaultOhms: 1000,
  },
  {
    tier: 2,
    name: 'Ace',
    title: 'Fairground power',
    story: 'The fair needs its shop sign glowing and the Ferris wheel turning. The sign is a bare red LED — connect it straight to 6 V and it will pop.',
    steps: [
      'Pick a resistor so the sign LED gets 10–20 mA. Ohm’s law: R = (V − Vf) ÷ I.',
      'Add the motor so the Ferris wheel turns (it needs more than 0.15 A).',
      'Press Test with everything running together.',
    ],
    initial: [
      { id: 'bat', kind: 'battery', a: nodeId(1, 2), b: nodeId(1, 3), cells: 4, charge: 1, locked: true },
      { id: 'sign', kind: 'led', a: nodeId(6, 2), b: nodeId(6, 3), color: 'red', locked: true, loadId: 'S' },
    ],
    inventory: { wire: W, resistor: 2, motor: 1, switch: 1, buzzer: 1 },
    scene: 'fair',
    lux: 8,
    skySlider: false,
    minParts: 12,
    hints: [
      'The battery gives about 6 V and a red LED keeps about 2 V for itself. The resistor must take the other 4 V.',
      'For 15 mA: R = 4 V ÷ 0.015 A ≈ 267 Ω. The nearest values you can pick are 220 Ω and 330 Ω.',
      'Give the motor its own rung straight across the battery (parallel). If it shares the LED’s path, the resistor starves it.',
    ],
    freeHints: 1,
    defaultOhms: 1000,
  },
  {
    tier: 3,
    name: 'Legend',
    title: 'The automatic night-light',
    story:
      'Build a bedroom night-light that turns itself on when it gets dark and off in daylight — and sips almost no power while it waits. Its light sensor sits indoors by the window, where daytime light is about 1,000 lux (outside in sunshine it is 10,000–100,000 lux).',
    steps: [
      'Make a voltage divider: the light sensor (LDR) and a resistor in series across the battery. The middle point’s voltage changes with light.',
      'Connect the comparator’s sense lead to that middle point and set its threshold. Its switch drives the white LED (Vf ≈ 3 V) through a resistor.',
      'Test sweeps the room from noon to midnight. Daylight: LED off, under 10 mW. Night: LED 10–20 mA, under 100 mW.',
    ],
    initial: [
      { id: 'bat', kind: 'battery', a: nodeId(1, 2), b: nodeId(1, 3), cells: 3, charge: 1, locked: true },
      { id: 'night', kind: 'led', a: nodeId(6, 2), b: nodeId(6, 3), color: 'white', locked: true, loadId: 'N' },
    ],
    inventory: { wire: W, ldr: 1, resistor: 3, comparator: 1, switch: 1 },
    scene: 'nightlight',
    lux: 300,
    skySlider: true,
    minParts: 14,
    hints: [
      'An LDR’s resistance is low in bright light (a few hundred Ω) and huge in the dark (tens of kΩ). Put it in series with a resistor across the battery: that is a voltage divider.',
      'Build your divider, then be a scientist: set the sky slider to 100 lux (late afternoon) and measure the middle point with the Multimeter, then do the same at 10 lux (dusk). Your threshold must sit between those two readings — and the mode decides which side means ON.',
      'The LED branch is a loop of its own: + → a resistor → the LED (+ leg towards +) → the comparator’s switch → −. Work the resistor out with Ohm’s law from the battery’s real voltage and the white LED’s 3 V. Daytime power is mostly the divider: P = V² ÷ R, so bigger divider resistors waste less.',
    ],
    freeHints: 1,
    defaultOhms: 1000,
  },
]

// ── Live goals ──────────────────────────────────────────────────────────────

export interface Goal {
  label: string
  ok: boolean
  detail?: string
}

export function findLoad(parts: Part[], loadId: string): Part | undefined {
  return parts.find((p) => p.loadId === loadId)
}

const lit = (sol: Solution, p: Part | undefined, min = 0.003) => !!p && !p.burnt && partCurrent(sol, p.id) >= min

export function liveGoals(def: TierDef, parts: Part[], sol: Solution, lux: number): Goal[] {
  switch (def.tier) {
    case 0: {
      const h = findLoad(parts, 'H')
      const hasSwitch = parts.some((p) => p.kind === 'switch')
      const offSol = solve(applyMod(parts, { switches: 'off' }), lux)
      const onSol = solve(applyMod(parts, { switches: 'on' }), lux)
      return [
        { label: 'House light is on', ok: lit(sol, h), detail: h ? formatAmps(partCurrent(sol, h.id)) : undefined },
        { label: 'A switch can turn it off', ok: hasSwitch && lit(onSol, h) && !lit(offSol, h, 0.0005) },
        { label: 'No short circuit', ok: !sol.shorted },
      ]
    }
    case 1: {
      const lamps = ['L1', 'L2', 'L3'].map((id) => findLoad(parts, id))
      return [
        { label: 'All 3 lamps placed', ok: lamps.every(Boolean) },
        ...lamps.map((l, k) => ({ label: `Lamp ${k + 1} bright (10 mA+)`, ok: lit(sol, l, 0.01), detail: l ? formatAmps(partCurrent(sol, l.id)) : '—' })),
      ]
    }
    case 2: {
      const s = findLoad(parts, 'S')
      const m = findLoad(parts, 'M')
      const is = s ? partCurrent(sol, s.id) : 0
      const im = m ? Math.abs(partCurrent(sol, m.id)) : 0
      return [
        { label: 'Sign LED 10–20 mA', ok: !!s && !s.burnt && is >= 0.01 && is <= 0.02, detail: s?.burnt ? 'burnt!' : formatAmps(is) },
        { label: 'Ferris wheel turning', ok: im >= MOTOR_START_A, detail: m ? formatAmps(im) : 'no motor' },
        { label: 'No short circuit', ok: !sol.shorted },
      ]
    }
    default: {
      const n = findLoad(parts, 'N')
      const iN = n ? partCurrent(sol, n.id) : 0
      const dark = lux <= 10
      return [
        { label: dark ? 'Dark now: LED 10–20 mA' : 'Bright now: LED off', ok: dark ? iN >= 0.01 && iN <= 0.02 : iN < 0.001, detail: formatAmps(iN) },
        { label: dark ? 'Power under 100 mW' : 'Power under 10 mW', ok: sol.power <= (dark ? 0.1 : 0.01), detail: formatWatts(sol.power) },
        { label: 'Comparator sense lead connected', ok: parts.some((p) => p.kind === 'comparator' && p.sense != null) },
      ]
    }
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

export interface Mod {
  switches?: 'on' | 'off'
  knockOut?: string
}

export function applyMod(parts: Part[], mod: Mod): Part[] {
  return parts.map((p) => {
    if (mod.switches && p.kind === 'switch') return { ...p, on: mod.switches === 'on' }
    if (mod.knockOut && p.loadId === mod.knockOut) return { ...p, burnt: true }
    return p
  })
}

export interface TestStep {
  label: string
  lux: number
  mod: Mod
  ok: boolean
  detail: string
}

export interface TestReport {
  pass: boolean
  steps: TestStep[]
  /** Why it happened — the teaching sentence(s). */
  why: string
  /** 0..1 quality used for stars (on top of mistakes). */
  quality: number
  /** Short metric for the score label, e.g. "LED 16.2 mA". */
  metric: string
  /** The battery was too drained for the test to judge the wiring. */
  flat?: boolean
}

// Light at the sensor, which sits indoors by a bedroom window. A daylit room
// is a few hundred to ~1,000 lux; outdoors it would be 10,000–100,000 lux
// (overcast ~1,000–10,000). Indoors at dusk is ~10 lux; a moonless night < 1 lux.
export const LEGEND_SWEEP = [
  { lux: 1000, label: 'Noon in the room' },
  { lux: 300, label: 'Cloudy afternoon' },
  { lux: 100, label: 'Late afternoon' },
  { lux: 10, label: 'Dusk' },
  { lux: 3, label: 'Night' },
  { lux: 1, label: 'Midnight' },
]

/** Below this charge the battery is "flat": too weak to judge the wiring. */
export const FLAT_CHARGE = 0.25

export function batteryCharge(parts: Part[]): number {
  const b = parts.find((p) => p.kind === 'battery')
  return b ? b.charge ?? 1 : 1
}

/** The same board with the battery swapped for a full one. */
export function withFreshBattery(parts: Part[]): Part[] {
  return parts.map((p) => (p.kind === 'battery' ? { ...p, charge: 1 } : p))
}

export function flatBatteryText(parts: Part[], wiringOk: boolean, freshWhy = ''): string {
  const b = parts.find((p) => p.kind === 'battery')
  const c = batteryCharge(parts)
  const emf = b ? batteryEmf(b) : 0
  const full = b ? (b.cells ?? 2) * 1.5 : 0
  const head = `The battery is ${c < FLAT_CHARGE ? 'flat' : 'low'}: only ${Math.round(c * 100)}% left, so it pushes ${formatVolts(emf)} instead of ${formatVolts(full)}. A short circuit drains a battery fast.`
  if (wiringOk) return `${head} Your wiring is right: with fresh batteries this circuit passes. Tap “Fit fresh batteries” and test again.`
  return `${head} Tap “Fit fresh batteries”. Even with fresh batteries, though, this circuit would not pass yet: ${freshWhy}`
}

function runTierTest(def: TierDef, parts: Part[]): TestReport {
  switch (def.tier) {
    case 0:
      return testCadet(def, parts)
    case 1:
      return testPilot(def, parts)
    case 2:
      return testAce(def, parts)
    default:
      return testLegend(parts)
  }
}

export function runTest(def: TierDef, parts: Part[]): TestReport {
  const report = runTierTest(def, parts)
  if (report.pass || batteryCharge(parts) >= 0.999) return report
  // A drained battery makes good wiring look broken (a dim LED reads as "series"
  // or "resistor too big"). Judge the same wiring on a full battery first, so a
  // child is never told a correct circuit is wrong.
  const fresh = runTierTest(def, withFreshBattery(parts))
  if (fresh.pass) return { ...report, why: flatBatteryText(parts, true), flat: true }
  if (batteryCharge(parts) < FLAT_CHARGE) return { ...report, why: flatBatteryText(parts, false, fresh.why), flat: true }
  // Low but not flat, and the wiring itself is the problem: explain the wiring
  // as it behaves on a full battery.
  return { ...report, why: `Your battery is at ${Math.round(batteryCharge(parts) * 100)}%, so here is what this wiring does on a full one: ${fresh.why}` }
}

function testCadet(def: TierDef, parts: Part[]): TestReport {
  const h = findLoad(parts, 'H')
  const hasSwitch = parts.some((p) => p.kind === 'switch')
  const onParts = applyMod(parts, { switches: 'on' })
  const onSol = solve(onParts, def.lux)
  const offSol = solve(applyMod(parts, { switches: 'off' }), def.lux)
  const onOk = lit(onSol, h)
  const offOk = hasSwitch && !lit(offSol, h, 0.0005)
  const steps: TestStep[] = [
    { label: 'Switch ON', lux: def.lux, mod: { switches: 'on' }, ok: onOk && !onSol.shorted, detail: h ? `House light: ${formatAmps(partCurrent(onSol, h.id))}` : '' },
    { label: 'Switch OFF', lux: def.lux, mod: { switches: 'off' }, ok: offOk, detail: h ? `House light: ${formatAmps(partCurrent(offSol, h.id))}` : '' },
  ]
  let why: string
  if (onSol.shorted) why = 'A wire joins the battery’s + straight to its − (a short circuit), so the current rushes round that easy path and skips the house. Remove that wire.'
  else if (!onOk) why = 'The house stayed dark because the path is not one complete loop. Electricity must leave the + end, go through the light and come back to the − end with no gaps.'
  else if (!hasSwitch) why = 'The light works — but there is no switch, so the family can never turn it off. Put a switch in the loop.'
  else if (!offOk) why = 'With the switch off the house stayed lit, so the current found another way round. The switch must be the only path — no wire going around it.'
  else why = 'Current flowed out of the battery’s + side, through the house light and back to −: a closed loop. Opening the switch makes a gap, the loop breaks, and the light goes out.'
  return { pass: steps.every((s) => s.ok), steps, why, quality: 1, metric: h ? formatAmps(partCurrent(onSol, h.id)) : '' }
}

function testPilot(def: TierDef, parts: Part[]): TestReport {
  const ids = ['L1', 'L2', 'L3']
  const lamps = ids.map((id) => findLoad(parts, id))
  const base = applyMod(parts, { switches: 'on' })
  const s1 = solve(base, def.lux)
  const stormMod: Mod = { switches: 'on', knockOut: 'L2' }
  const s2 = solve(applyMod(parts, stormMod), def.lux)
  const allBright = lamps.every((l) => lit(s1, l, 0.01))
  const survive = lit(s2, lamps[0], 0.01) && lit(s2, lamps[2], 0.01)
  const cur = (s: Solution, l: Part | undefined) => (l ? formatAmps(partCurrent(s, l.id)) : '—')
  const steps: TestStep[] = [
    { label: 'Lights on', lux: def.lux, mod: { switches: 'on' }, ok: allBright && !s1.shorted, detail: `Lamps: ${lamps.map((l) => cur(s1, l)).join(' · ')}` },
    { label: 'Storm! Lamp 2 breaks', lux: def.lux, mod: stormMod, ok: survive, detail: `Lamp 1: ${cur(s2, lamps[0])} · Lamp 3: ${cur(s2, lamps[2])}` },
  ]
  let why: string
  const backwards = lamps.find((l) => l && (s1.vd.get(l.id) ?? 0) < -0.5)
  const currents = lamps.map((l) => (l ? partCurrent(s1, l.id) : 0))
  // Topology, not brightness: swap each lamp for a plain two-way resistor and
  // look at the currents. Equal non-zero currents = one shared path (series);
  // zero = no complete loop through that lamp. (A dim lamp alone can't tell
  // series wiring from a flat battery or a missing wire.)
  const linear = solve(base.map((p) => (p.loadId && ids.includes(p.loadId) ? { ...p, kind: 'resistor' as const, ohms: 220, burnt: false } : p)), def.lux)
  const linI = lamps.map((l) => (l ? Math.abs(partCurrent(linear, l.id)) : 0))
  const unpowered = lamps.flatMap((l, k) => (l && linI[k] < 1e-5 ? [k + 1] : []))
  const series = !unpowered.length && linI.every((c) => Math.abs(c - linI[0]) < 0.01 * linI[0])
  if (!lamps.every(Boolean)) why = 'Not all three streetlights are on the board yet. Place lamps 1, 2 and 3.'
  else if (s1.shorted) why = 'A wire connects + straight to −, a short circuit. The current takes that easy path and the lamps get almost nothing.'
  else if (backwards) why = `Lamp ${backwards.loadId?.slice(1)} is backwards. An LED is a one-way street for current: its + leg must face the battery’s + side. Select it and press Flip.`
  else if (!allBright && unpowered.length)
    why = `${unpowered.length === 3 ? 'None of the lamps has' : `Lamp ${unpowered.join(' and lamp ')} ${unpowered.length === 1 ? 'has' : 'have'}`} no complete path from + back to −, so no current can flow there. Wire a + rail and a − rail, and connect each lamp between them.`
  else if (!allBright && series)
    why = `The lamps are in series — one single path. They share the 6 V, and each LED needs about 2 V before it glows, so almost no current gets through (${formatAmps(currents[0])}). Give each lamp its own path (parallel).`
  else if (!allBright) why = 'Some lamps are dim or dark. Each lamp needs its own complete path from + to −. Check for gaps and lamps sharing a path.'
  else if (!survive)
    why = 'All three lit, but when lamp 2 broke the others went out too: they shared one path (series), so one break stopped the current everywhere. In parallel each lamp has its own loop.'
  else
    why = 'Each lamp sat on its own rung between the + and − rails (parallel), so each got the full 6 V. When lamp 2 broke, only its own path opened — the others kept their loops. That is why houses are wired in parallel.'
  return { pass: steps.every((s) => s.ok), steps, why, quality: 1, metric: `${formatAmps(Math.min(...currents))} each` }
}

function testAce(def: TierDef, parts: Part[]): TestReport {
  const s = findLoad(parts, 'S')
  const m = findLoad(parts, 'M')
  const sol = solve(applyMod(parts, { switches: 'on' }), def.lux)
  const is = s ? partCurrent(sol, s.id) : 0
  const im = m ? Math.abs(partCurrent(sol, m.id)) : 0
  const signOk = !!s && !s.burnt && is >= 0.01 && is <= 0.02
  const motorOk = im >= MOTOR_START_A
  const steps: TestStep[] = [
    { label: 'Sign LED', lux: def.lux, mod: { switches: 'on' }, ok: signOk, detail: s?.burnt ? 'burnt out' : `${formatAmps(is)} (want 10–20 mA)` },
    { label: 'Ferris wheel motor', lux: def.lux, mod: { switches: 'on' }, ok: motorOk && !sol.shorted, detail: `${formatAmps(im)} (needs 150 mA+)` },
  ]
  const vb = sol.battV
  const vf = s ? ledVf(s) : 2
  const ideal = (vb - vf) / 0.015
  let why: string
  if (s?.burnt) why = 'The sign LED is burnt out — replace it, and put a resistor in its path so it never gets more than 20 mA.'
  else if (sol.shorted) why = 'There is a short circuit: a wire joins + to − with nothing in between. The battery dumps its energy into the wire and drains fast.'
  else if (is < 0.01 && is > 0.0002)
    why = `The sign only got ${formatAmps(is)} — too dim. Your resistor is too big. Ohm’s law: R = (V − Vf) ÷ I = (${vb.toFixed(1)} − ${vf.toFixed(1)}) ÷ 0.015 ≈ ${Math.round(ideal)} Ω.`
  else if (is <= 0.0002) why = 'No current reaches the sign. Check it has a complete loop from + through a resistor, through the LED (+ leg first) and back to −.'
  else if (is > 0.02)
    why = `The sign got ${formatAmps(is)} — over the 20 mA an LED is rated for, so it would run hot and wear out. Use a bigger resistor: about ${Math.round(ideal)} Ω.`
  else if (!motorOk)
    why = `The Ferris wheel motor only got ${formatAmps(im)}. A motor needs a lot of current: give it its own path straight across the battery, not through the LED’s resistor.`
  else
    why = `The resistor took the extra ${(vb - vf).toFixed(1)} V so the LED got ${formatAmps(is)} — Ohm’s law, I = V ÷ R. The motor had its own parallel path and pulled ${formatAmps(im)}, so it never starved the sign.`
  const quality = signOk ? 1 - Math.min(1, Math.abs(is - 0.015) / 0.005) * 0.5 : 0
  return {
    pass: steps.every((x) => x.ok),
    steps,
    why,
    quality,
    metric: `LED ${formatAmps(is)}`,
  }
}

function testLegend(parts: Part[]): TestReport {
  const n = findLoad(parts, 'N')
  const steps: TestStep[] = []
  let worstDayPower = 0
  let firstFail: { step: string; reason: string } | null = null
  let nightCurrent = 0
  for (const s of LEGEND_SWEEP) {
    const sol = solve(applyMod(parts, { switches: 'on' }), s.lux)
    const i = n ? partCurrent(sol, n.id) : 0
    const day = s.lux >= 100
    let ok: boolean
    let reason = ''
    if (n?.burnt) {
      ok = false
      reason = 'The night-light LED is burnt out. Replace it and check its resistor.'
    } else if (sol.shorted) {
      ok = false
      reason = 'There is a short circuit from + to −.'
    } else if (day) {
      worstDayPower = Math.max(worstDayPower, sol.power)
      ok = i < 0.001 && sol.power <= 0.01
      if (i >= 0.001) reason = `In ${s.label.toLowerCase()} light (${s.lux} lux) the night-light was ON (${formatAmps(i)}). ${senseText(parts, sol)} Change the threshold or the mode so daylight keeps the switch open.`
      else if (sol.power > 0.01)
        reason = `The LED was off, but the circuit still used ${formatWatts(sol.power)} in daylight (budget 10 mW). Your divider resistors are too small: power = V² ÷ R, so bigger resistors waste less.`
    } else {
      nightCurrent = Math.max(nightCurrent, i)
      ok = i >= 0.01 && i <= 0.02 && sol.power <= 0.1
      if (i < 0.001) reason = `At ${s.label.toLowerCase()} (${s.lux} lux) the night-light stayed OFF. ${senseText(parts, sol)} Make sure the dark voltage is on the ON side of the threshold.`
      else if (i < 0.01 || i > 0.02)
        reason = `At night the LED got ${formatAmps(i)} (want 10–20 mA). ${i < 0.01 ? 'Its resistor is too big.' : 'Its resistor is too small.'} Use Ohm’s law, R = (V − Vf) ÷ I, with the battery’s real voltage and the white LED’s 3 V.`
      else if (sol.power > 0.1) reason = `At night the circuit used ${formatWatts(sol.power)}, over the 100 mW budget.`
    }
    if (!ok && !firstFail) firstFail = { step: s.label, reason }
    steps.push({ label: `${s.label} · ${s.lux} lux`, lux: s.lux, mod: { switches: 'on' }, ok, detail: `LED ${formatAmps(i)} · ${formatWatts(sol.power)}` })
  }
  const pass = !firstFail
  const why = firstFail
    ? firstFail.reason
    : `The LDR and resistor made a voltage divider: as the light faded the LDR’s resistance rose, so the middle voltage moved past your threshold and the comparator closed its switch. In daylight the whole circuit used only ${formatWatts(worstDayPower)}, and at night the LED got ${formatAmps(nightCurrent)} — the same trick real streetlights use.`
  const quality = pass ? (worstDayPower <= 0.004 ? 1 : worstDayPower <= 0.007 ? 0.6 : 0.3) : 0
  return { pass, steps, why, quality, metric: `${formatWatts(worstDayPower)} by day` }
}

function senseText(parts: Part[], sol: Solution): string {
  const c = parts.find((p) => p.kind === 'comparator')
  if (!c) return 'There is no comparator yet, so nothing decides when to switch.'
  if (c.sense == null) return 'The comparator’s sense lead is not connected to anything.'
  const vs = sol.v.get(c.sense)
  if (vs === undefined) return 'The comparator’s sense lead touches a dot with nothing on it.'
  return `The sense point was ${formatVolts(vs)}, and your comparator switches ON when it is ${c.mode === 'above' ? 'above' : 'below'} ${formatVolts(c.threshold ?? 2)}.`
}

/**
 * Stars for a passed test. Mistakes (shorts, popped LEDs) and design quality
 * set the base; then the shared hint rule: any hint that gives away part of
 * the answer caps the finish at 2 stars. On the design tiers (Ace, Legend)
 * guess-and-test (more than three judged tests) caps at 2 as well.
 */
export function roundStars(o: { mistakes: number; quality: number; paidHints: number; attempts: number; designTier: boolean }): number {
  let stars = o.mistakes === 0 ? 3 : o.mistakes <= 2 ? 2 : 1
  // Quality (how close to the ideal design): ±3 mA of 15 mA, or a frugal night-light, keeps 3.
  if (o.quality < 0.7) stars = Math.min(stars, 2)
  if (o.quality < 0.35) stars = Math.min(stars, 1)
  if (o.paidHints > 0) stars = Math.min(stars, 2)
  if (o.designTier && o.attempts > 3) stars = Math.min(stars, 2)
  return Math.max(1, stars)
}

/** Ideal resistor for an LED at a target current, for the Ohm's-law helper. */
export function idealResistor(v: number, vf: number, amps: number): number {
  return (v - vf) / amps
}
export function nearestResistor(r: number, values: number[]): number {
  let best = values[0]
  for (const x of values) if (Math.abs(Math.log(x / r)) < Math.abs(Math.log(best / r))) best = x
  return best
}
export { formatOhms }
