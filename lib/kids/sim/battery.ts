// lib/kids/sim/battery.ts
// Battery and power for the robot simulator (roadmap #39) and the Power Lab.
// Pure maths, no DOM, no Rapier: the engine calls stepBattery() once per fixed
// tick and the Power Lab calls the same functions to draw its graphs, so what a
// child reads in the lab is exactly what the robot runs on.
//
// The model, in plain words:
//   * A pack is cells in SERIES (voltages add) and PARALLEL (capacity and
//     current add). Its internal resistance is series × r / parallel.
//   * The open-circuit voltage falls as the pack empties (each chemistry has its
//     own curve). Under load the terminal voltage SAGS by current × resistance.
//   * Current comes from three places: the electronics (computer, sensors, a
//     light), each motor's torque (current ∝ force at the wheel, so a heavy
//     robot, a slope or a thick rug costs more) and a small no-load current
//     while a motor spins.
//   * A motor's top speed and its push scale with the voltage it gets.
//   * The robot stops when the charge is gone, or when the voltage sags below
//     the cut-off for long enough that the computer browns out.
//
// Cell numbers are typical datasheet values at room temperature (rounded); a
// real cell varies with brand, age, temperature and how hard it is pushed.

export type Chemistry = 'alkaline' | 'nimh' | 'liion' | 'lipo' | 'lifepo4'

export interface CellSpec {
  id: Chemistry
  name: string
  /** Size or format, for the child. */
  format: string
  nominalV: number
  /** Voltage at the cut-off: below this the cell is treated as empty. */
  cutoffV: number
  capacityMah: number
  internalOhm: number
  /** Most current one cell should give, A. */
  maxAmps: number
  rechargeable: boolean
  massG: number
  /** Open-circuit voltage against state of charge, [soc 0..1, volts], ascending soc. */
  ocv: [number, number][]
}

export const CELLS: Record<Chemistry, CellSpec> = {
  // AA alkaline: high internal resistance; its voltage slides down the whole way.
  alkaline: {
    id: 'alkaline',
    name: 'Alkaline AA',
    format: 'AA, single use',
    nominalV: 1.5,
    cutoffV: 0.9,
    capacityMah: 2400,
    internalOhm: 0.2,
    maxAmps: 1,
    rechargeable: false,
    massG: 23,
    ocv: [
      [0, 0.9],
      [0.1, 1.1],
      [0.3, 1.25],
      [0.6, 1.38],
      [0.9, 1.52],
      [1, 1.6],
    ],
  },
  // AA nickel-metal hydride: flat 1.2 V for most of the charge, low resistance.
  nimh: {
    id: 'nimh',
    name: 'NiMH AA',
    format: 'AA, rechargeable',
    nominalV: 1.2,
    cutoffV: 1.0,
    capacityMah: 2000,
    internalOhm: 0.03,
    maxAmps: 4,
    rechargeable: true,
    massG: 27,
    ocv: [
      [0, 1.0],
      [0.05, 1.15],
      [0.2, 1.2],
      [0.8, 1.26],
      [0.95, 1.32],
      [1, 1.4],
    ],
  },
  // 18650 lithium-ion: 3.6–3.7 V nominal, 4.2 V full, light for its energy.
  liion: {
    id: 'liion',
    name: 'Li-ion 18650',
    format: '18650, rechargeable',
    nominalV: 3.6,
    cutoffV: 3.0,
    capacityMah: 2500,
    internalOhm: 0.05,
    maxAmps: 10,
    rechargeable: true,
    massG: 46,
    ocv: [
      [0, 3.0],
      [0.05, 3.3],
      [0.2, 3.5],
      [0.5, 3.65],
      [0.8, 3.92],
      [1, 4.2],
    ],
  },
  // Lithium-polymer pouch cell (the flat "LiPo" packs in drones and robot kits): 3.7 V nominal,
  // 4.2 V full, very low internal resistance (a few milliohms per cell in hobby packs, so it can
  // give large currents). 2200 mAh is the common size for a 2S/3S robot pack; a pack of bigger
  // cells sets `cellMah` (PackConfig). Datasheet-typical values, rounded.
  lipo: {
    id: 'lipo',
    name: 'LiPo pouch',
    format: 'flat pouch, rechargeable',
    nominalV: 3.7,
    cutoffV: 3.0,
    capacityMah: 2200,
    internalOhm: 0.01,
    maxAmps: 40,
    rechargeable: true,
    massG: 55,
    ocv: [
      [0, 3.0],
      [0.05, 3.4],
      [0.2, 3.65],
      [0.5, 3.8],
      [0.8, 4.0],
      [1, 4.2],
    ],
  },
  // LiFePO4 18650: lower voltage, very flat curve, very long life.
  lifepo4: {
    id: 'lifepo4',
    name: 'LiFePO₄ 18650',
    format: '18650, rechargeable',
    nominalV: 3.2,
    cutoffV: 2.5,
    capacityMah: 1500,
    internalOhm: 0.04,
    maxAmps: 6,
    rechargeable: true,
    massG: 40,
    ocv: [
      [0, 2.5],
      [0.05, 3.0],
      [0.15, 3.2],
      [0.85, 3.3],
      [0.97, 3.4],
      [1, 3.6],
    ],
  },
}

export const CHEMISTRIES: Chemistry[] = ['alkaline', 'nimh', 'liion', 'lipo', 'lifepo4']

export interface PackConfig {
  cell: Chemistry
  /** Cells in a row: voltages add. 1–8. */
  series: number
  /** Rows side by side: capacity and current add. 1–4. */
  parallel: number
  /**
   * Optional: cells of the same chemistry but a different capacity (a 5000 mAh LiPo pouch is a
   * bigger pouch of the same cell). Mass and maximum current grow with it and the internal
   * resistance falls with it (a bigger cell has more electrode area). Default: the cell's own size.
   */
  cellMah?: number
}

export const MAX_SERIES = 8
export const MAX_PARALLEL = 4

export interface PackInfo {
  cells: number
  nominalV: number
  fullV: number
  cutoffV: number
  capacityMah: number
  /** Energy stored, watt-hours (nominal volts × amp-hours). */
  energyWh: number
  internalOhm: number
  maxAmps: number
  massG: number
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export function cleanPack(p: PackConfig): PackConfig {
  const out: PackConfig = {
    cell: CELLS[p.cell] ? p.cell : 'nimh',
    series: clamp(Math.round(p.series) || 1, 1, MAX_SERIES),
    parallel: clamp(Math.round(p.parallel) || 1, 1, MAX_PARALLEL),
  }
  if (typeof p.cellMah === 'number' && Number.isFinite(p.cellMah) && p.cellMah > 0) out.cellMah = clamp(Math.round(p.cellMah), 200, 20000)
  return out
}

export function packInfo(pack: PackConfig): PackInfo {
  const p = cleanPack(pack)
  const c = CELLS[p.cell]
  const size = (p.cellMah ?? c.capacityMah) / c.capacityMah
  const capacityMah = c.capacityMah * size * p.parallel
  const nominalV = c.nominalV * p.series
  return {
    cells: p.series * p.parallel,
    nominalV: round(nominalV, 2),
    fullV: round(c.ocv[c.ocv.length - 1][1] * p.series, 2),
    cutoffV: round(c.cutoffV * p.series, 2),
    capacityMah,
    energyWh: round((nominalV * capacityMah) / 1000, 2),
    internalOhm: round((c.internalOhm * p.series) / (p.parallel * size), 4),
    maxAmps: round(c.maxAmps * p.parallel * size, 1),
    massG: round(c.massG * size * p.series * p.parallel, 0),
  }
}

function round(v: number, d: number): number {
  const k = 10 ** d
  return Math.round(v * k) / k
}

/** One cell's open-circuit voltage at a state of charge (0..1), interpolated on its curve. */
export function cellOcv(cell: Chemistry, soc: number): number {
  const curve = CELLS[cell].ocv
  const s = clamp(soc, 0, 1)
  for (let i = 0; i + 1 < curve.length; i++) {
    const [s0, v0] = curve[i]
    const [s1, v1] = curve[i + 1]
    if (s <= s1) return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0 || 1)
  }
  return curve[curve.length - 1][1]
}

export function packOcv(pack: PackConfig, soc: number): number {
  const p = cleanPack(pack)
  return cellOcv(p.cell, soc) * p.series
}

/** Terminal voltage under a load of `amps`: the open-circuit voltage minus the sag (I × R). Never below 0. */
export function terminalVoltage(pack: PackConfig, soc: number, amps: number): number {
  return Math.max(0, packOcv(pack, soc) - amps * packInfo(pack).internalOhm)
}

/** Points [amps, volts] for a sag graph from 0 A to `maxAmps`. */
export function sagCurve(pack: PackConfig, soc: number, maxAmps: number, steps = 24): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const a = (maxAmps * i) / steps
    out.push([a, terminalVoltage(pack, soc, a)])
  }
  return out
}

// ── The robot's electrical load ───────────────────────────────────────────

/** Current one motor draws when stalled at the drive's full force at its rated voltage, A. Torque ∝ current. */
export const MOTOR_STALL_AMPS = 1.6
/** Current one motor draws spinning freely (bearings, brushes), A. */
export const MOTOR_NO_LOAD_AMPS = 0.08
/** The computer board, always on while the robot has power, A. */
export const COMPUTER_AMPS = 0.1
/** A motor or the electronics may take this much more than the rating before it is "pushed too hard". */
export const OVERVOLT_LIMIT = 1.25

export interface LoadParts {
  head: 'distance' | 'camera' | 'antenna' | 'screen'
  sensor: 'none' | 'line' | 'color' | 'bumper'
  tool: 'none' | 'gripper' | 'scoop' | 'pen' | 'light'
}

export const HEAD_AMPS: Record<LoadParts['head'], number> = { distance: 0.015, camera: 0.18, antenna: 0.04, screen: 0.08 }
export const SENSOR_AMPS: Record<LoadParts['sensor'], number> = { none: 0, line: 0.02, color: 0.025, bumper: 0 }
/** A lamp is the hungriest small part; a gripper servo holds a load with a little current. */
export const LIGHT_AMPS = 0.22
export const HOLD_AMPS = 0.12

/** Electronics current for a robot's parts, A. */
export function electronicsAmps(parts: LoadParts, lightOn: boolean, holding: boolean): number {
  return COMPUTER_AMPS + HEAD_AMPS[parts.head] + SENSOR_AMPS[parts.sensor] + (lightOn ? LIGHT_AMPS : 0) + (holding ? HOLD_AMPS : 0)
}

/**
 * Current of one drive motor for the force it puts into the floor.
 * @param force      force at the ground, N (sign ignored)
 * @param stallForce the drive's stall force at the rated voltage, N
 * @param spinning   is the wheel turning (no-load losses)
 */
export function motorAmps(force: number, stallForce: number, spinning: boolean): number {
  return (spinning ? MOTOR_NO_LOAD_AMPS : 0) + (MOTOR_STALL_AMPS * Math.abs(force)) / Math.max(1e-6, stallForce)
}

// ── Running a battery ─────────────────────────────────────────────────────

/** A charging pad on the floor: stop on it (motors off) and the battery fills. */
export interface Charger {
  center: [number, number]
  radius: number
  /** Charging current, A. */
  amps: number
}

/** How an arena powers the robot. Without one, the battery is only metered (it never changes the physics). */
export interface ArenaBattery {
  pack: PackConfig
  /** Charge at the start, 0..1. Default 1. */
  startSoc?: number
  /**
   * Battery clock: one simulated second drains this many seconds of charge (default 1).
   * 60 means "1 s here = 1 min of real driving", so a whole charge fits in a short run.
   */
  drainScale?: number
  /** The motors' rated voltage. Default: the pack's nominal voltage. */
  ratedV?: number
}

/** Seconds below the cut-off before the computer browns out (a short dip on a motor start is survived). */
export const BROWNOUT_S = 0.25
/** Low-battery warning, 0..1. */
export const LOW_SOC = 0.2

export interface BatteryState {
  pack: PackConfig
  /** Does the battery change the physics (an arena battery) or only get metered? */
  coupled: boolean
  drainScale: number
  ratedV: number
  soc: number
  /** Terminal voltage this tick, V. */
  volts: number
  /** Total current this tick, A (negative while charging). */
  amps: number
  /** Motor share of `amps`, A. */
  motorAmps: number
  /** Charge used so far (net of charging), mAh, on the battery clock. */
  usedMah: number
  /** Energy used so far, Wh, on the battery clock. */
  usedWh: number
  /** Highest current seen, A. */
  peakAmps: number
  /** Lowest terminal voltage seen, V. */
  minVolts: number
  flat: boolean
  flatCause: 'empty' | 'sag' | null
  low: boolean
  charging: boolean
  /** Time spent below the cut-off (brownout timer), s. */
  underFor: number
}

/** The default metered pack: four NiMH AA cells, 4.8 V. */
export const DEFAULT_PACK: PackConfig = { cell: 'nimh', series: 4, parallel: 1 }

/**
 * @param cfg         the arena's battery (coupled: it can sag, slow and run flat), or undefined
 * @param meteredPack without an arena battery: the pack the robot carries (its power upgrade,
 *                    robot-spec.ts powerPack), metered so the battery % and the Flight Recorder
 *                    follow the robot's own battery. Default DEFAULT_PACK.
 */
export function createBattery(cfg: ArenaBattery | undefined, meteredPack?: PackConfig): BatteryState {
  const pack = cleanPack(cfg?.pack ?? meteredPack ?? DEFAULT_PACK)
  const info = packInfo(pack)
  const soc = clamp(cfg?.startSoc ?? 1, 0, 1)
  const v = packOcv(pack, soc)
  return {
    pack,
    coupled: cfg !== undefined,
    drainScale: Math.max(1, cfg?.drainScale ?? 1),
    ratedV: cfg?.ratedV ?? info.nominalV,
    soc,
    volts: v,
    amps: 0,
    motorAmps: 0,
    usedMah: 0,
    usedWh: 0,
    peakAmps: 0,
    minVolts: v,
    flat: cfg !== undefined && soc <= 0,
    flatCause: cfg !== undefined && soc <= 0 ? 'empty' : null,
    low: soc < LOW_SOC,
    charging: false,
    underFor: 0,
  }
}

/**
 * The fraction of rated speed and push a motor gets from the battery right now (0 when flat).
 * Uses the voltage measured on the previous tick, so there is no feedback loop inside a tick.
 * A metered (uncoupled) battery always gives 1.
 */
export function voltageFactor(b: BatteryState): number {
  if (!b.coupled) return 1
  if (b.flat) return 0
  return clamp(b.volts / b.ratedV, 0, OVERVOLT_LIMIT)
}

export type BatteryEvent = 'low' | 'flat' | 'charging' | 'full' | null

/**
 * Advance the battery one tick. `loadAmps` is what the robot draws, `chargeAmps` what a pad
 * pushes in (0 off a pad). Returns an event when something a child should hear about happens.
 */
export function stepBattery(b: BatteryState, loadAmps: number, motorShare: number, chargeAmps: number, dt: number): BatteryEvent {
  if (b.flat && chargeAmps <= 0) {
    b.amps = 0
    b.motorAmps = 0
    b.volts = packOcv(b.pack, b.soc)
    return null
  }
  const info = packInfo(b.pack)
  const draw = b.flat ? 0 : loadAmps
  const net = draw - chargeAmps
  const clockDt = dt * b.drainScale
  const dAh = (net * clockDt) / 3600
  const before = b.soc
  b.soc = clamp(b.soc - dAh / (info.capacityMah / 1000), 0, 1)
  b.amps = net
  b.motorAmps = b.flat ? 0 : motorShare
  // Charging raises the terminal voltage a little above the open-circuit voltage.
  b.volts = Math.max(0, packOcv(b.pack, b.soc) - net * info.internalOhm)
  b.usedMah += dAh * 1000
  b.usedWh += (dAh * b.volts)
  if (draw > b.peakAmps) b.peakAmps = draw
  if (draw > 0 && b.volts < b.minVolts) b.minVolts = b.volts
  const wasCharging = b.charging
  b.charging = chargeAmps > 0 && net < 0
  let ev: BatteryEvent = null
  if (b.charging && !wasCharging) ev = 'charging'
  if (b.charging && before < 1 && b.soc >= 1) ev = 'full'
  if (b.charging && b.flat && b.soc > 0.05) {
    // A flat robot on a charger wakes once it has a little charge again.
    b.flat = false
    b.flatCause = null
  }
  if (!b.coupled) {
    b.low = b.soc < LOW_SOC
    return ev
  }
  if (!b.flat) {
    if (b.soc <= 0) {
      b.flat = true
      b.flatCause = 'empty'
      return 'flat'
    }
    if (b.volts < info.cutoffV && !b.charging) {
      b.underFor += dt
      if (b.underFor >= BROWNOUT_S) {
        b.flat = true
        b.flatCause = 'sag'
        return 'flat'
      }
    } else b.underFor = 0
  }
  const low = b.soc < LOW_SOC
  if (low && !b.low) {
    b.low = true
    return ev ?? 'low'
  }
  if (!low) b.low = false
  return ev
}

/** A snapshot of the battery for the recorder and the UI (a copy, safe to keep). */
export function batteryReading(b: BatteryState): { soc: number; volts: number; amps: number; motorAmps: number; flat: boolean; charging: boolean } {
  return { soc: b.soc, volts: b.volts, amps: b.amps, motorAmps: b.motorAmps, flat: b.flat, charging: b.charging }
}

// ── Power Lab: solar sizing and runtime ───────────────────────────────────

/** Average full-sun hours a day (the energy of the day squeezed into hours of 1000 W/m²). Typical values. */
export const SUN_HOURS = {
  'cloudy-winter': 1.5,
  'mixed': 3.5,
  'sunny': 5.5,
  'desert': 7,
} as const
export type SunKey = keyof typeof SUN_HOURS

/** Real panels lose energy to heat, dust, angle and the charger: about 25 %. */
export const SOLAR_DERATE = 0.75

export interface SolarPlan {
  /** Energy the robot needs a day, Wh. */
  dailyWh: number
  /** Smallest panel that refills that in a day, W. */
  panelW: number
  /** Battery that runs the robot through the night and one cloudy day, Wh. */
  batteryWh: number
}

/**
 * Size a solar robot: it draws `watts` for `hoursPerDay`, the sky gives `sunHours`.
 * `reserveDays` is how many sunless days the battery must cover (1 = just the night).
 */
export function solarPlan(watts: number, hoursPerDay: number, sunHours: number, reserveDays = 1): SolarPlan {
  const dailyWh = Math.max(0, watts) * clamp(hoursPerDay, 0, 24)
  const panelW = sunHours > 0 ? dailyWh / (sunHours * SOLAR_DERATE) : Infinity
  // Only use 80 % of a battery: emptying it fully shortens its life.
  const batteryWh = (dailyWh * Math.max(1, reserveDays)) / 0.8
  return { dailyWh: round(dailyWh, 2), panelW: round(panelW, 1), batteryWh: round(batteryWh, 1) }
}

/** Minutes a pack runs a steady load, from full to the cut-off (ignoring sag: an upper bound). */
export function runtimeMinutes(pack: PackConfig, amps: number): number {
  if (amps <= 0) return Infinity
  return round(((packInfo(pack).capacityMah / 1000) / amps) * 60, 1)
}
