// components/kids/games/smart-farm/model.ts
// The farm underneath Smart Farm. Pure TypeScript (no React, no DOM), seeded,
// deterministic: the same choices on the same tier always give the same result.
//
// The soil model is a simplified FAO-56 daily water balance:
//   - Each soil holds a different amount of water plants can use (its
//     "sponge"): sand little, loam more, clay most (mm of water in the root zone).
//   - Every day the crop uses some (evapotranspiration, ET: more when hot and
//     sunny), rain and irrigation add some, and anything above full drains
//     away below the roots (wasted, and it washes fertiliser out).
//   - Plants grow at full speed while at least half the sponge is left; below
//     that, growth slows in proportion (FAO-56's stress coefficient Ks with
//     p = 0.5, "irrigate when about half the available water is used").
// The drone uses NDVI = (NIR − Red) / (NIR + Red); the picking robot judges
// ripeness from a red-vs-green colour index that changes with the light.

// ── Random numbers (seeded) ─────────────────────────────────────────────────

export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const round1 = (v: number) => Math.round(v * 10) / 10

// ── Soil and weather ────────────────────────────────────────────────────────

export type SoilId = 'sand' | 'loam' | 'clay'

export interface Soil {
  id: SoilId
  name: string
  /** Water plants can use, mm in the root zone, when the soil is full. */
  capacityMm: number
  colour: string
}

export const SOILS: Record<SoilId, Soil> = {
  sand: { id: 'sand', name: 'Sandy soil', capacityMm: 30, colour: '#d9b26a' },
  loam: { id: 'loam', name: 'Loam', capacityMm: 60, colour: '#8a5a32' },
  clay: { id: 'clay', name: 'Clay', capacityMm: 80, colour: '#6b4a3a' },
}

export type WeatherKind = 'sun' | 'hot' | 'cloud' | 'rain' | 'storm'

export interface Day {
  kind: WeatherKind
  /** Crop water use today, mm. */
  et: number
  /** Rain today, mm. */
  rain: number
}

export const WEATHER_ICON: Record<WeatherKind, string> = { sun: '☀️', hot: '🔥', cloud: '☁️', rain: '🌧️', storm: '⛈️' }
export const WEATHER_NAME: Record<WeatherKind, string> = { sun: 'Sunny', hot: 'Heatwave', cloud: 'Cloudy', rain: 'Rain', storm: 'Storm' }

export function day(kind: WeatherKind, rain = 0): Day {
  const et = kind === 'hot' ? 9 : kind === 'sun' ? 6 : kind === 'cloud' ? 3 : kind === 'rain' ? 1.5 : 1
  return { kind, et, rain }
}

/** Plant growth speed from the sponge fraction (0..1+): FAO-56 Ks with p = 0.5. */
export function growthFactor(frac: number): number {
  return clamp(frac / 0.5, 0, 1)
}

// ── NDVI ────────────────────────────────────────────────────────────────────

/** Healthy leaves reflect lots of near-infrared and absorb red. */
export function ndvi(nir: number, red: number): number {
  return (nir - red) / Math.max(1e-6, nir + red)
}

/** NDVI of a cell from plant health 0..1 (0 = bare soil). Real crops sit roughly 0.2–0.9. */
export function ndviFromHealth(health: number): number {
  const h = clamp(health, 0, 1)
  const nir = 0.3 + 0.25 * h // NIR reflectance rises with healthy leaf structure
  const red = 0.22 - 0.17 * h // chlorophyll absorbs red
  return ndvi(nir, red)
}

/** Colour scale for NDVI maps: red (bare/sick) → yellow → green (healthy). */
export function ndviColour(v: number): string {
  const t = clamp((v - 0.1) / 0.8, 0, 1)
  // red → yellow → green
  const r = t < 0.5 ? 220 : Math.round(220 - (t - 0.5) * 2 * 180)
  const g = t < 0.5 ? Math.round(60 + t * 2 * 150) : Math.round(210 - (t - 0.5) * 2 * 40)
  const b = 50
  return `rgb(${r},${g},${b})`
}

// ═══════════════════════════════════════════════════════════════════════════
// CADET — water the dry plants by reading their sensors
// ═══════════════════════════════════════════════════════════════════════════

export const CADET_LINE = 40 // % — below this the soil is too dry
export const CADET_PULSE = 50 // % a watering adds
export const CADET_DAYS = 3

export interface CadetPlant {
  id: number
  crop: string
  /** Soil water, % of what the soil can hold. */
  water: number
  /** Hearts left (a plant that drops below 15 % wilts and loses one). */
  hearts: number
}

export interface CadetDayPlan {
  weather: WeatherKind
  /** % each unwatered plant loses today. */
  dryBy: number
}

export const CADET_WEATHER: CadetDayPlan[] = [
  { weather: 'sun', dryBy: 20 },
  { weather: 'hot', dryBy: 25 },
  { weather: 'cloud', dryBy: 10 },
]

const CADET_CROPS = ['🍅', '🥬', '🥕', '🌽', '🫑', '🍓']

export function cadetGarden(seed: number): CadetPlant[] {
  const r = rng(seed)
  // A fixed spread so every garden has dry, middle and wet plants.
  const start = [18, 26, 34, 38, 45, 52, 60, 66, 72, 80, 88, 30]
  for (let i = start.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[start[i], start[j]] = [start[j], start[i]]
  }
  return start.map((w, i) => ({ id: i, crop: CADET_CROPS[i % CADET_CROPS.length], water: w, hearts: 2 }))
}

export interface CadetDayResult {
  plants: CadetPlant[]
  /** Plants that needed water and got it. */
  good: number[]
  /** Dry plants that were not watered. */
  missed: number[]
  /** Wet-enough plants that were watered anyway. */
  extra: number[]
  /** % of water that overflowed (puddles), summed. */
  wasted: number
  wilted: number[]
}

/** Run one Cadet day: water the chosen plants in the morning, then the weather dries the soil. */
export function cadetDay(plants: CadetPlant[], watered: Set<number>, plan: CadetDayPlan): CadetDayResult {
  const good: number[] = []
  const missed: number[] = []
  const extra: number[] = []
  const wilted: number[] = []
  let wasted = 0
  const next = plants.map((p) => {
    const dry = p.water < CADET_LINE
    let w = p.water
    if (watered.has(p.id)) {
      w += CADET_PULSE
      if (w > 100) {
        wasted += w - 100
        w = 100
      }
      if (dry) good.push(p.id)
      else extra.push(p.id)
    } else if (dry) missed.push(p.id)
    w = Math.max(0, w - plan.dryBy)
    let hearts = p.hearts
    if (w < 15) {
      hearts = Math.max(0, hearts - 1)
      wilted.push(p.id)
    }
    return { ...p, water: w, hearts }
  })
  return { plants: next, good, missed, extra, wasted, wilted }
}

/** How a plant LOOKS from above: soil can be dry long before leaves droop. */
export function cadetLooks(p: CadetPlant): 'happy' | 'ok' | 'droopy' {
  if (p.hearts < 2 || p.water < 15) return 'droopy'
  return p.water > 25 ? 'happy' : 'ok'
}

export function cadetStars(mistakes: number, lostHearts: number): number {
  if (lostHearts > 2) return 0
  if (mistakes === 0 && lostHearts === 0) return 3
  if (mistakes <= 3 && lostHearts <= 1) return 2
  return 1
}

// ═══════════════════════════════════════════════════════════════════════════
// PILOT — sensors + irrigation threshold, then drone scouting
// ═══════════════════════════════════════════════════════════════════════════

export const PILOT_COLS = 8
export const PILOT_ROWS = 5
/** One cell is 10 m × 10 m, so the field is 80 m × 50 m. */
export const CELL_M = 10

export interface PilotZone {
  id: 'A' | 'B' | 'C'
  soil: SoilId
  cols: [number, number]
}

export const PILOT_ZONES: PilotZone[] = [
  { id: 'A', soil: 'sand', cols: [0, 2] },
  { id: 'B', soil: 'loam', cols: [3, 5] },
  { id: 'C', soil: 'clay', cols: [6, 7] },
]

export type SpotKind = 'leak' | 'shade' | 'hollow'

/** Cells that are NOT like the rest of their zone — a sensor there gives a misleading reading. */
export const PILOT_SPOTS: { col: number; row: number; kind: SpotKind; label: string }[] = [
  { col: 1, row: 1, kind: 'shade', label: 'Shade of a big tree: dries slower than the rest of the sand' },
  { col: 4, row: 3, kind: 'leak', label: 'Leaky pipe joint: always soaking wet' },
  { col: 7, row: 4, kind: 'hollow', label: 'Low hollow: rain collects here' },
]

export const PILOT_PULSE_MM = 12
export const PILOT_DAYS: Day[] = [
  day('sun'),
  day('sun'),
  day('hot'),
  day('hot'),
  day('cloud'),
  day('rain', 18),
  day('sun'),
  day('hot'),
  day('sun'),
  day('cloud'),
  day('sun'),
  day('hot'),
]

export function zoneOfCol(col: number): PilotZone {
  return PILOT_ZONES.find((z) => col >= z.cols[0] && col <= z.cols[1]) ?? PILOT_ZONES[0]
}

export function spotAt(col: number, row: number) {
  return PILOT_SPOTS.find((s) => s.col === col && s.row === row)
}

export interface PilotZoneRun {
  zone: PilotZone
  /** Sponge % of the real (typical) zone soil, per day (after the day). */
  water: number[]
  /** What the zone's sensor(s) read each morning (null = no sensor). */
  reading: (number | null)[]
  irrigatedDays: number[]
  /** Days the typical soil was below half full (plants slowed down). */
  stressDays: number
  /** Growth achieved, 0..1 of the best possible. */
  growth: number
  /** Water that drained past the roots, mm. */
  drainedMm: number
  usedMm: number
}

export interface PilotIrrigationRun {
  zones: PilotZoneRun[]
  usedMm: number
  drainedMm: number
  growth: number
  stars: number
  message: string
  tips: string[]
}

/** Sponge % a sensor at this cell reads, given the zone's typical sponge %. */
function cellReading(typical: number, kind: SpotKind | undefined, lastDay: Day | null, shadeLag: number): number {
  if (kind === 'leak') return 100
  if (kind === 'hollow') return lastDay && lastDay.rain > 0 ? 100 : clamp(typical + 25, 0, 100)
  if (kind === 'shade') return clamp(shadeLag, 0, 100)
  return typical
}

export function runPilotIrrigation(sensors: { col: number; row: number }[], threshold: number): PilotIrrigationRun {
  const zones: PilotZoneRun[] = PILOT_ZONES.map((zone) => {
    const cap = SOILS[zone.soil].capacityMm
    const mine = sensors.filter((s) => zoneOfCol(s.col).id === zone.id)
    let s = cap * 0.7 // mm in the typical soil
    let shade = s // mm in the tree's shade (uses half as much water)
    const water: number[] = []
    const reading: (number | null)[] = []
    const irrigatedDays: number[] = []
    let stressDays = 0
    let growth = 0
    let drained = 0
    let used = 0
    PILOT_DAYS.forEach((d, i) => {
      const typicalPct = (s / cap) * 100
      const shadePct = (shade / cap) * 100
      const prev = i > 0 ? PILOT_DAYS[i - 1] : null
      const reads = mine.map((m) => cellReading(typicalPct, spotAt(m.col, m.row)?.kind, prev, shadePct))
      const r = reads.length ? reads.reduce((a, b) => a + b, 0) / reads.length : null
      reading.push(r === null ? null : Math.round(r))
      const irrigate = r !== null && r < threshold
      const add = irrigate ? PILOT_PULSE_MM : 0
      if (irrigate) {
        irrigatedDays.push(i)
        used += add
      }
      s = s + d.rain + add - d.et
      shade = shade + d.rain + add - d.et * 0.5
      if (s > cap) {
        drained += s - cap
        s = cap
      }
      if (shade > cap) shade = cap
      s = Math.max(0, s)
      shade = Math.max(0, shade)
      const f = growthFactor(s / cap)
      if (s / cap < 0.5) stressDays++
      growth += f
      water.push(Math.round((s / cap) * 100))
    })
    return { zone, water, reading, irrigatedDays, stressDays, growth: growth / PILOT_DAYS.length, drainedMm: round1(drained), usedMm: used }
  })

  // Field-level numbers: zones weighted by their width.
  const width = (z: PilotZone) => z.cols[1] - z.cols[0] + 1
  const total = zones.reduce((t, z) => t + width(z.zone), 0)
  const growth = zones.reduce((t, z) => t + z.growth * width(z.zone), 0) / total
  const usedMm = round1(zones.reduce((t, z) => t + z.usedMm * width(z.zone), 0) / total)
  const drainedMm = round1(zones.reduce((t, z) => t + z.drainedMm * width(z.zone), 0) / total)

  const tips: string[] = []
  for (const z of zones) {
    const mine = sensors.filter((s) => zoneOfCol(s.col).id === z.zone.id)
    const name = `Zone ${z.zone.id} (${SOILS[z.zone.soil].name.toLowerCase()})`
    if (mine.length === 0) tips.push(`${name} had no sensor, so its valve never knew the soil was drying out — it was never watered.`)
    for (const m of mine) {
      const sp = spotAt(m.col, m.row)
      if (sp?.kind === 'leak') tips.push(`${name}: the sensor sat in the leaky-pipe puddle and always read 100 %, so the controller thought the whole zone was wet.`)
      if (sp?.kind === 'shade') tips.push(`${name}: the sensor was in the tree's shade, which dries out slower, so the sunny soil around it got thirsty first.`)
      if (sp?.kind === 'hollow') tips.push(`${name}: the sensor was in the hollow where water collects, so it read wetter than the rest of the zone.`)
    }
    if (mine.length > 0 && z.stressDays > 2 && !mine.some((m) => spotAt(m.col, m.row))) tips.push(`${name} was stressed on ${z.stressDays} days: try a higher threshold so it is watered before it falls below half full.`)
    if (z.drainedMm > 15) tips.push(`${name}: ${Math.round(z.drainedMm)} mm drained away below the roots. Water poured on soil that is already nearly full is wasted — try a lower threshold.`)
  }

  const stress = zones.reduce((t, z) => t + z.stressDays, 0)
  let stars = 0
  if (growth >= 0.95 && drainedMm <= 10 && stress <= 2) stars = 3
  else if (growth >= 0.9 && drainedMm <= 18) stars = 2
  else if (growth >= 0.8) stars = 1
  const message =
    stars === 3
      ? 'Every zone was watered just before it got thirsty, and almost nothing drained away.'
      : stars > 0
        ? 'The crop survived, but some water was wasted or some plants went thirsty — read the tips.'
        : 'Too many plants went thirsty. Read the tips: where were the sensors, and what did they read?'
  return { zones, usedMm, drainedMm, growth, stars, message, tips }
}

// ── Pilot drone scouting ────────────────────────────────────────────────────

export type LaneDir = 'rows' | 'cols'

export interface DronePlan {
  altitude: 10 | 20 | 30
  spacing: number // cells between lane centres
  dir: LaneDir
}

/** Camera footprint width in cells: a ~53° lens sees a strip about as wide as its height. */
export function footprintCells(alt: number): number {
  return Math.round(alt / CELL_M)
}

export const DRONE_BATTERY_M = 480
export const TURN_COST_M = 15

export interface PestPatch {
  cells: [number, number][] // [col,row]
  size: 'small' | 'large'
}

export const PILOT_PESTS: PestPatch[] = [
  { cells: [[5, 1]], size: 'small' },
  {
    cells: [
      [1, 3],
      [2, 3],
      [1, 4],
      [2, 4],
    ],
    size: 'large',
  },
]

export interface DroneRun {
  /** Waypoints in cell units (centre coordinates, may be fractional). */
  path: [number, number][]
  lengthM: number
  /** Distance the battery allows. */
  batteryM: number
  /** Distance actually flown before the battery ran out (= lengthM when it was enough). */
  flownM: number
  ranOut: boolean
  /** Fraction of the planned path flown before the battery ran out (1 = all). */
  stopFrac: number
  /** Cells seen by the camera. */
  seen: boolean[][] // [row][col]
  /** When each cell was first photographed, as a fraction 0..1 of the flight (-1 = never). */
  seenAt: number[][]
  coveragePct: number
  found: boolean[] // per pest patch
  stars: number
  message: string
  tips: string[]
}

/** Build the lawnmower (boustrophedon) path from the home pad at the bottom-left corner. */
export function dronePath(plan: DronePlan): [number, number][] {
  const fp = footprintCells(plan.altitude)
  const across = plan.dir === 'rows' ? PILOT_ROWS : PILOT_COLS
  const along = plan.dir === 'rows' ? PILOT_COLS : PILOT_ROWS
  const centres: number[] = []
  let c = fp / 2
  // Lane centres every `spacing` cells; the last lane is pulled in so its edge meets the field edge.
  while (true) {
    centres.push(Math.min(c, across - fp / 2))
    if (c + fp / 2 >= across) break
    c += plan.spacing
    if (centres.length > 20) break
  }
  const uniq = centres.filter((v, i) => i === 0 || Math.abs(v - centres[i - 1]) > 1e-6)
  const pts: [number, number][] = [[0, PILOT_ROWS]]
  uniq.forEach((v, i) => {
    const a = i % 2 === 0 ? 0 : along
    const b = i % 2 === 0 ? along : 0
    if (plan.dir === 'rows') {
      const y = PILOT_ROWS - v // first lane at the bottom (near home)
      pts.push([a, y], [b, y])
    } else {
      pts.push([v, PILOT_ROWS - a], [v, PILOT_ROWS - b])
    }
  })
  pts.push([0, PILOT_ROWS])
  return pts
}

export function segLen(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) * CELL_M
}

export function runDrone(plan: DronePlan): DroneRun {
  const fp = footprintCells(plan.altitude)
  const path = dronePath(plan)
  // Climb to altitude and back down also costs battery.
  let length = plan.altitude * 2
  const turns = Math.max(0, path.length - 4)
  for (let i = 1; i < path.length; i++) length += segLen(path[i - 1], path[i])
  length += turns * TURN_COST_M
  const battery = DRONE_BATTERY_M
  const ranOut = length > battery

  // Coverage: fly the path step by step until the battery is gone; only lanes (not transits) take pictures.
  const seen: boolean[][] = Array.from({ length: PILOT_ROWS }, () => Array(PILOT_COLS).fill(false))
  const seenAt: number[][] = Array.from({ length: PILOT_ROWS }, () => Array(PILOT_COLS).fill(-1))
  let planar = 0
  for (let i = 1; i < path.length; i++) planar += segLen(path[i - 1], path[i])
  let travelled = 0
  let budget = battery - plan.altitude * 2
  for (let i = 1; i < path.length && budget > 0; i++) {
    const a = path[i - 1]
    const b = path[i]
    const isLane = i >= 2 && i < path.length - 1 && i % 2 === 0
    const L = segLen(a, b)
    const steps = Math.max(1, Math.ceil(L / 2))
    for (let k = 0; k <= steps && budget > 0; k++) {
      const t = k / steps
      const x = a[0] + (b[0] - a[0]) * t
      const y = a[1] + (b[1] - a[1]) * t
      if (k > 0) {
        budget -= L / steps
        travelled += L / steps
      }
      if (!isLane) continue
      for (let r = 0; r < PILOT_ROWS; r++)
        for (let col = 0; col < PILOT_COLS; col++) {
          const cx = col + 0.5
          const cy = r + 0.5
          if (!seen[r][col] && Math.abs(cx - x) <= fp / 2 + 1e-6 && Math.abs(cy - y) <= fp / 2 + 1e-6) {
            seen[r][col] = true
            seenAt[r][col] = clamp(travelled / planar, 0, 1)
          }
        }
    }
    if (i % 2 === 1 && i >= 3 && i <= path.length - 3) budget -= 2 * TURN_COST_M
  }
  const stopFrac = ranOut ? clamp(travelled / planar, 0, 1) : 1
  let n = 0
  for (const row of seen) for (const v of row) if (v) n++
  const coveragePct = Math.round((n / (PILOT_ROWS * PILOT_COLS)) * 100)
  // From 30 m one camera pixel covers ~3× more ground, so a one-plant-wide spot of sickness blurs into healthy pixels.
  const found = PILOT_PESTS.map((p) => p.cells.some(([c, r]) => seen[r][c]) && !(p.size === 'small' && plan.altitude >= 30))
  const nFound = found.filter(Boolean).length
  const tips: string[] = []
  if (ranOut) tips.push(`The flight needed ${Math.round(length)} m but the battery only lasts ${battery} m, so the drone came home early and missed the end. Fewer lanes, or long straight lanes with fewer turns, use less battery.`)
  if (plan.spacing > fp) tips.push(`Your lanes were ${plan.spacing} cells apart but the camera only sees a strip ${fp} cell${fp === 1 ? '' : 's'} wide, so stripes of field were never photographed. Lane spacing must not be wider than the camera's strip.`)
  if (plan.altitude >= 30 && !found[0]) tips.push('From 30 m every pixel covers so much ground that the small sick patch blurred into the healthy plants around it. Fly lower to see small things.')
  if (plan.spacing < fp && !ranOut) tips.push('Your lanes overlapped, so some ground was photographed twice. Real mapping flights do overlap their photos a lot (often 60–80 %) so software can stitch them together — but every extra lane costs battery.')
  let stars = 0
  if (nFound === 2 && !ranOut) stars = plan.spacing === fp ? 3 : 2
  else if (nFound === 2) stars = 2
  else if (nFound === 1) stars = 1
  const message =
    nFound === 2
      ? `The NDVI map showed both sick patches${ranOut ? ' — just' : ''}. Healthy leaves reflect lots of near-infrared light; sick ones do not.`
      : nFound === 1
        ? 'The drone found one sick patch, but not the other. Look at the white (unseen) cells on the map.'
        : 'The drone did not see the sick plants. Check the lane spacing, the height and the battery.'
  return { path, lengthM: Math.round(length), batteryM: battery, flownM: Math.round(Math.min(length, battery)), ranOut, stopFrac, seen, seenAt, coveragePct, found, stars, message, tips }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACE — the picking robot's vision rule, and why lighting fools it
// ═══════════════════════════════════════════════════════════════════════════

export type LightId = 'noon' | 'sunset' | 'shade'

export interface Light {
  id: LightId
  name: string
  icon: string
  /** How much the light boosts the camera's red, green and blue channels. */
  gain: [number, number, number]
  /** Overall brightness (darker = noisier pixels). */
  bright: number
  noise: number
}

export const LIGHTS: Light[] = [
  { id: 'noon', name: 'Midday sun', icon: '☀️', gain: [1, 1, 1], bright: 1, noise: 0.012 },
  { id: 'sunset', name: 'Orange sunset light', icon: '🌇', gain: [1.45, 0.88, 0.6], bright: 0.85, noise: 0.015 },
  { id: 'shade', name: 'Blue-grey shade', icon: '🌥️', gain: [0.82, 1.08, 1.3], bright: 0.55, noise: 0.025 },
]

export const RIPE_AT = 0.6

export interface Fruit {
  id: string
  /** True ripeness 0 (green) … 1 (deep red). Ripe when ≥ RIPE_AT. */
  ripeness: number
  /** The fixed pixel noise for this fruit (seeded). */
  jitter: number
}

/** Surface colour of a tomato (reflectance 0..1 per channel) from its ripeness. */
export function fruitReflectance(r: number): [number, number, number] {
  return [0.2 + 0.6 * r, 0.6 - 0.45 * r, 0.12]
}

/** What the camera measures: reflectance × light colour. */
export function cameraRGB(f: Fruit, light: Light): [number, number, number] {
  const ref = fruitReflectance(f.ripeness)
  return [ref[0] * light.gain[0] * light.bright, ref[1] * light.gain[1] * light.bright, ref[2] * light.gain[2] * light.bright]
}

/** The robot's ripeness score: red ÷ (red + green). 0.25 for green tomatoes, ~0.84 for deep red. */
export function rednessIndex(f: Fruit, light: Light, whiteBalance: boolean): number {
  let [r, g] = cameraRGB(f, light)
  if (whiteBalance) {
    // A grey card reflects all colours equally, so what the camera sees on it IS the light's colour.
    const card = light.gain
    r /= card[0] * light.bright
    g /= card[1] * light.bright
  }
  return clamp(r / Math.max(1e-6, r + g) + f.jitter * light.noise, 0, 1)
}

export function aceRows(seed: number): Record<LightId, Fruit[]> {
  const r = rng(seed)
  // Ripeness values chosen so every row has clearly green, borderline and clearly ripe fruit.
  const base = [0.08, 0.22, 0.35, 0.45, 0.52, 0.56, 0.64, 0.68, 0.75, 0.82, 0.9, 0.97]
  const out = {} as Record<LightId, Fruit[]>
  for (const L of LIGHTS) {
    const vals = base.map((b) => clamp(b + (r() - 0.5) * 0.04, 0, 1))
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[vals[i], vals[j]] = [vals[j], vals[i]]
    }
    out[L.id] = vals.map((v, i) => ({ id: `${L.id}-${i}`, ripeness: v, jitter: (r() - 0.5) * 2 }))
  }
  return out
}

/** The labelled samples a farmer checked by hand — all photographed at midday. */
export function aceSamples(seed: number): Fruit[] {
  const r = rng(seed + 99)
  return [0.15, 0.4, 0.5, 0.58, 0.66, 0.72, 0.85, 0.95].map((v, i) => ({ id: `s-${i}`, ripeness: v, jitter: (r() - 0.5) * 2 }))
}

export interface AceRule {
  threshold: number
  whiteBalance: boolean
  /** Fruit scoring within ± margin of the threshold are left for tomorrow (not picked, not a mistake). */
  margin: number
}

export type PickOutcome = 'picked-ripe' | 'picked-unripe' | 'left-unripe' | 'missed-ripe' | 'unsure'

export interface AceDecision {
  fruit: Fruit
  light: LightId
  index: number
  outcome: PickOutcome
}

export interface AceRun {
  decisions: AceDecision[]
  byLight: Record<LightId, { unripePicked: number; ripeMissed: number; unsure: number; correct: number }>
  unripePicked: number
  ripeMissed: number
  unsure: number
  correct: number
  points: number
  stars: number
  message: string
  tips: string[]
}

export function runAce(rows: Record<LightId, Fruit[]>, rule: AceRule): AceRun {
  const decisions: AceDecision[] = []
  const byLight = {} as AceRun['byLight']
  for (const L of LIGHTS) {
    const b = { unripePicked: 0, ripeMissed: 0, unsure: 0, correct: 0 }
    for (const f of rows[L.id]) {
      const idx = rednessIndex(f, L, rule.whiteBalance)
      const ripe = f.ripeness >= RIPE_AT
      let outcome: PickOutcome
      if (Math.abs(idx - rule.threshold) < rule.margin) outcome = 'unsure'
      else if (idx >= rule.threshold) outcome = ripe ? 'picked-ripe' : 'picked-unripe'
      else outcome = ripe ? 'missed-ripe' : 'left-unripe'
      if (outcome === 'picked-unripe') b.unripePicked++
      else if (outcome === 'missed-ripe') b.ripeMissed++
      else if (outcome === 'unsure') b.unsure++
      else b.correct++
      decisions.push({ fruit: f, light: L.id, index: idx, outcome })
    }
    byLight[L.id] = b
  }
  const unripePicked = decisions.filter((d) => d.outcome === 'picked-unripe').length
  const ripeMissed = decisions.filter((d) => d.outcome === 'missed-ripe').length
  const unsure = decisions.filter((d) => d.outcome === 'unsure').length
  const correct = decisions.length - unripePicked - ripeMissed - unsure
  // Picking a green tomato wastes food for good; a missed ripe one can still be picked tomorrow (but may spoil);
  // "unsure" sends the fruit to a person to check, which costs time.
  const points = Math.max(0, correct * 10 - unripePicked * 20 - ripeMissed * 8 - unsure * 3)
  let stars = 0
  const mistakes = unripePicked + ripeMissed
  if (mistakes === 0 && unsure <= 4) stars = 3
  else if (mistakes <= 2 && unripePicked <= 1 && unsure <= 8) stars = 2
  else if (mistakes <= 6) stars = 1

  const tips: string[] = []
  const s = byLight.sunset
  const sh = byLight.shade
  if (!rule.whiteBalance && s.unripePicked > 0) tips.push(`In the orange sunset light, ${s.unripePicked} green tomato${s.unripePicked === 1 ? '' : 'es'} looked red enough to pick. The light added red, not the tomato.`)
  if (!rule.whiteBalance && sh.ripeMissed > 0) tips.push(`In the blue-grey shade, ${sh.ripeMissed} ripe tomato${sh.ripeMissed === 1 ? '' : 'es'} looked too green. The shade removed red.`)
  if (!rule.whiteBalance && mistakes > 0) tips.push('No single threshold can fix this, because the light changes the numbers. Turn on white balance: the camera looks at a grey card, works out the colour of the light and divides it out.')
  if (rule.whiteBalance && mistakes > 0) tips.push(`Even with white balance, ${mistakes} fruit landed on the wrong side of your threshold. Ripe starts at a score of about ${rednessThreshold().toFixed(2)} in true colours — and a small “unsure” band catches the noisy ones near the line.`)
  if (unsure > 8) tips.push(`${unsure} fruit were “unsure” and sent to a person. A narrower unsure band saves people time.`)
  const message =
    stars === 3
      ? 'Every tomato judged right in all three lights. Real picking robots correct for the light in the same way.'
      : stars > 0
        ? 'The robot picked most of the right tomatoes — but some lights fooled it. Read why below.'
        : 'The lighting fooled the robot badly. Read why below and change the rule.'
  return { decisions, byLight, unripePicked, ripeMissed, unsure, correct, points, stars, message, tips }
}

/** The redness index of a fruit exactly at RIPE_AT in true colours. */
export function rednessThreshold(): number {
  const [r, g] = fruitReflectance(RIPE_AT)
  return r / (r + g)
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGEND — a whole season: yield vs water vs energy vs chemicals
// ═══════════════════════════════════════════════════════════════════════════

export const LEGEND_DAYS = 40
export const LEGEND_ZONES: SoilId[] = ['sand', 'loam', 'clay']
export const LEGEND_COLS = 9
export const LEGEND_ROWS = 6
/** Cells per zone (3 columns × 6 rows). */
const ZONE_CELLS = 18

export type WeedMethod = 'robot-weekly' | 'robot-fortnight' | 'spray' | 'none'

export interface LegendPlan {
  /** Irrigate a zone when its sensor reads below this sponge %. */
  threshold: number
  /** Water per irrigation, mm. */
  pulseMm: number
  /** Skip irrigating if tomorrow's forecast says ≥ 8 mm of rain. */
  useForecast: boolean
  /** Two sensors per zone (they can catch each other's faults). */
  doubleSensors: boolean
  /** Drone scouting every N days (0 = never). */
  scoutEvery: 0 | 3 | 5 | 10
  weeding: WeedMethod
}

export const DEFAULT_LEGEND_PLAN: LegendPlan = { threshold: 75, pulseMm: 20, useForecast: false, doubleSensors: false, scoutEvery: 0, weeding: 'spray' }

export interface LegendSeason {
  id: number
  name: string
  blurb: string
  days: Day[]
  /** Tomorrow's rain forecast as seen on each day (mm); sometimes wrong, like a real one. */
  forecast: number[]
  pest: { day: number; zone: number }
  sensorFault: { day: number; zone: number; stuck: 'wet' | 'dry' }
}

export const SEASON_NAMES = [
  { name: 'Dry spring', blurb: 'Long dry spells and one big storm.' },
  { name: 'Stormy summer', blurb: 'Thunderstorms, a heatwave and wrong forecasts.' },
  { name: 'Heatwave year', blurb: 'Two heatwaves. Every drop counts.' },
]

export function legendSeason(id: number): LegendSeason {
  const r = rng(1000 + id * 7919)
  const days: Day[] = []
  const heatStarts = id === 2 ? [8, 26] : id === 1 ? [18] : [22]
  const stormDays = id === 1 ? [6, 14, 30] : id === 0 ? [16] : [33]
  for (let d = 0; d < LEGEND_DAYS; d++) {
    if (stormDays.includes(d)) days.push(day('storm', 35 + Math.round(r() * 15)))
    else if (heatStarts.some((h) => d >= h && d < h + 4)) days.push(day('hot'))
    else {
      const x = r()
      const wet = id === 1 ? 0.22 : id === 0 ? 0.1 : 0.08
      if (x < wet) days.push(day('rain', 6 + Math.round(r() * 10)))
      else if (x < wet + 0.25) days.push(day('cloud'))
      else days.push(day('sun'))
    }
  }
  // Forecast for tomorrow: right most of the time, sometimes wrong (more often in the stormy season).
  const wrongP = id === 1 ? 0.25 : 0.12
  const forecast = days.map((_, d) => {
    const next = days[d + 1]
    const truth = next ? next.rain : 0
    if (r() < wrongP) return truth > 0 ? 0 : 10 + Math.round(r() * 10)
    return truth
  })
  const pest = { day: [12, 9, 15][id] ?? 12, zone: [1, 2, 0][id] ?? 1 }
  const sensorFault = { day: [20, 24, 11][id] ?? 20, zone: [0, 1, 2][id] ?? 0, stuck: (['wet', 'wet', 'dry'] as const)[id] ?? 'wet' }
  return { id, name: SEASON_NAMES[id].name, blurb: SEASON_NAMES[id].blurb, days, forecast, pest, sensorFault }
}

export interface LegendDayLog {
  day: number
  weather: Day
  /** Sponge % per zone at the end of the day. */
  water: number[]
  irrigated: boolean[]
  skippedForRain: boolean[]
  /** Zone's roots sat in waterlogged soil today (clay after big water). */
  waterlogged: boolean[]
  weeds: number
  infected: number
  events: string[]
}

export interface LegendResult {
  log: LegendDayLog[]
  /** % of the best possible harvest. */
  yieldPct: number
  waterMm: number
  drainedMm: number
  energyKWh: number
  chemicalsL: number
  /** Yield lost to each cause, percentage points. */
  lost: { drought: number; waterlog: number; pests: number; weeds: number }
  energyParts: { pump: number; weeding: number; drone: number }
  targets: { id: 'yield' | 'water' | 'energy' | 'chem'; label: string; ok: boolean; value: string; goal: string }[]
  baseStars: number
  question: LegendQuestion
}

export interface LegendQuestion {
  prompt: string
  options: { id: string; label: string }[]
  answer: string
  explain: string
}

export interface LegendGoals {
  yield: number
  water: number
  energy: number
  chem: number
}

/**
 * A careful plan an agronomist might choose. Each season's goals are set from
 * what this plan achieves (with a little slack), so every season is winnable
 * but only by balancing all four numbers.
 */
export const REFERENCE_PLAN: LegendPlan = { threshold: 55, pulseMm: 15, useForecast: true, doubleSensors: true, scoutEvery: 5, weeding: 'robot-weekly' }

const goalCache = new Map<number, LegendGoals>()

export function legendGoals(season: LegendSeason): LegendGoals {
  const hit = goalCache.get(season.id)
  if (hit) return hit
  const ref = simulateLegend(REFERENCE_PLAN, season)
  const g: LegendGoals = {
    yield: Math.min(92, Math.floor(ref.yieldPct - 2)),
    water: Math.ceil((ref.waterMm * 1.15) / 5) * 5,
    energy: Math.ceil(ref.energyKWh * 1.15),
    chem: 1,
  }
  goalCache.set(season.id, g)
  return g
}

/**
 * The farm is a 0.1 ha market garden: 1 mm of water over it is 1 m³, and
 * pumping 1 m³ through drip lines takes roughly 0.2 kWh.
 */
const PUMP_KWH_PER_MM = 0.2
/** One pass of a small electric weeding robot over 0.1 ha. */
const ROBOT_WEED_KWH = 1.5
/** One scouting flight of a small drone (its battery holds about 0.1 kWh). */
const DRONE_KWH = 0.1
const CHEM_PER_CELL = 0.06
const SPRAY_ALL_L = 4

export function runLegend(plan: LegendPlan, season: LegendSeason): LegendResult {
  return simulateLegend(plan, season, legendGoals(season))
}

function simulateLegend(plan: LegendPlan, season: LegendSeason, goals?: LegendGoals): LegendResult {
  const G: LegendGoals = goals ?? { yield: 0, water: Infinity, energy: Infinity, chem: Infinity }
  const caps = LEGEND_ZONES.map((z) => SOILS[z].capacityMm)
  const s = caps.map((c) => c * 0.8)
  let weeds = 0
  let weedRate = 0.035
  let infected = 0
  let pestFound = false
  let pestCleared = false
  let faultActive = false
  let faultFixed = false
  let waterMm = 0
  let drained = 0
  const energy = { pump: 0, weeding: 0, drone: 0 }
  let chem = 0
  const lostRaw = { drought: 0, waterlog: 0, pests: 0, weeds: 0 }
  let grown = 0
  let wiltDays = [0, 0, 0]
  const log: LegendDayLog[] = []

  for (let d = 0; d < LEGEND_DAYS; d++) {
    const w = season.days[d]
    const events: string[] = []
    if (w.kind === 'storm') events.push(`⛈️ Storm: ${w.rain} mm of rain`)
    if (w.kind === 'hot' && (d === 0 || season.days[d - 1].kind !== 'hot')) events.push('🔥 Heatwave starts: plants drink 50 % more')

    // Sensor fault appears.
    if (d === season.sensorFault.day) {
      faultActive = true
      const z = season.sensorFault.zone
      if (plan.doubleSensors) {
        events.push(`📟 A ${LEGEND_ZONES[z]} sensor got stuck reading ${season.sensorFault.stuck === 'wet' ? '100 %' : '0 %'} — its twin disagreed, so the alarm went off and it was fixed the same day`)
        faultActive = false
        faultFixed = true
      } else events.push(`📟 The ${LEGEND_ZONES[z]} zone's only sensor got stuck reading ${season.sensorFault.stuck === 'wet' ? '100 % (wet)' : '0 % (dry)'} — the controller believed it`)
    }

    // Pest outbreak.
    if (d === season.pest.day) {
      infected = 1
      events.push(`🐛 Aphids landed in the ${LEGEND_ZONES[season.pest.zone]} zone (too small to see from the path)`)
    } else if (infected > 0 && !pestCleared) infected = Math.min(ZONE_CELLS, Math.ceil(infected * 1.45))

    // Scouting flight.
    if (plan.scoutEvery > 0 && d > 0 && d % plan.scoutEvery === 0) {
      energy.drone += DRONE_KWH
      if (infected > 0 && !pestCleared && d - season.pest.day >= 1) {
        pestFound = true
        pestCleared = true
        const l = round1(infected * CHEM_PER_CELL)
        chem += l
        events.push(`🛸 Drone NDVI map found ${infected} sick cell${infected === 1 ? '' : 's'} — spot-sprayed with ${l} L`)
        infected = 0
      }
    }
    // Nobody scouted: the farmer finally sees the damage by eye.
    if (!pestCleared && infected > 0 && d - season.pest.day >= 9) {
      pestCleared = true
      chem += SPRAY_ALL_L
      events.push(`👀 Damage finally visible by eye on ${infected} cells — the whole field was sprayed (${SPRAY_ALL_L} L)`)
      infected = 0
    }

    // Weeds.
    if (plan.weeding === 'robot-weekly' && d > 0 && d % 7 === 0) {
      weeds = 0
      energy.weeding += ROBOT_WEED_KWH
      events.push('🤖 Weeding robot pass (camera finds weeds, blades remove them)')
    } else if (plan.weeding === 'robot-fortnight' && d > 0 && d % 14 === 0) {
      weeds = 0
      energy.weeding += ROBOT_WEED_KWH
      events.push('🤖 Weeding robot pass')
    } else if (plan.weeding === 'spray' && d === 10) {
      weeds = 0
      weedRate *= 0.5
      chem += 2
      events.push('🧪 Herbicide sprayed over the whole field (2 L)')
    }
    weeds = clamp(weeds + weedRate, 0, 1)

    // Irrigation, zone by zone.
    const irrigated = [false, false, false]
    const skipped = [false, false, false]
    for (let z = 0; z < 3; z++) {
      let reading = (s[z] / caps[z]) * 100
      if (faultActive && z === season.sensorFault.zone) reading = season.sensorFault.stuck === 'wet' ? 100 : 0
      if (reading < plan.threshold) {
        if (plan.useForecast && season.forecast[d] >= 8) skipped[z] = true
        else {
          irrigated[z] = true
          s[z] += plan.pulseMm * 0.9 // drip: about 10 % lost to evaporation
          waterMm += plan.pulseMm / 3
          energy.pump += (plan.pulseMm / 3) * PUMP_KWH_PER_MM
        }
      }
    }
    if (skipped.some(Boolean)) events.push(`📡 Forecast said ${season.forecast[d]} mm of rain tomorrow — irrigation skipped${season.days[d + 1] && season.days[d + 1].rain < 3 ? ' (but the forecast was wrong!)' : ''}`)

    // Water balance and growth.
    const water: number[] = []
    const waterlogged: boolean[] = []
    for (let z = 0; z < 3; z++) {
      s[z] += w.rain - w.et * (1 + 0.2 * weeds)
      let logged = false
      if (s[z] > caps[z]) {
        drained += (s[z] - caps[z]) / 3
        s[z] = caps[z]
        // Clay drains slowly: after big water its roots sit in waterlogged soil.
        if (LEGEND_ZONES[z] === 'clay' && (w.rain >= 25 || irrigated[z])) logged = true
      }
      s[z] = Math.max(0, s[z])
      const frac = s[z] / caps[z]
      const f = growthFactor(frac)
      const g0 = 1
      const dLoss = g0 - f
      const wLoss = logged ? 0.25 * f : 0
      const afterW = f - wLoss
      const pLoss = z === season.pest.zone && infected > 0 ? afterW * 0.6 * (infected / ZONE_CELLS) : 0
      const afterP = afterW - pLoss
      const weedLoss = afterP * 0.35 * weeds
      const g = afterP - weedLoss
      lostRaw.drought += dLoss
      lostRaw.waterlog += wLoss
      lostRaw.pests += pLoss
      lostRaw.weeds += weedLoss
      grown += g
      if (frac < 0.15) wiltDays[z]++
      water.push(Math.round(frac * 100))
      waterlogged.push(logged)
    }
    // A farmer notices plants wilting (two days in a row) and fixes a stuck-wet sensor.
    if (faultActive && wiltDays[season.sensorFault.zone] >= 2) {
      faultActive = false
      faultFixed = true
      events.push('🔧 The farmer saw wilting plants and replaced the stuck sensor')
    }
    if (faultActive && season.sensorFault.stuck === 'dry' && d - season.sensorFault.day >= 5) {
      faultActive = false
      faultFixed = true
      events.push('🔧 The farmer noticed the soggy clay and replaced the stuck sensor')
    }
    wiltDays = wiltDays.map((v, z) => ((s[z] / caps[z]) < 0.15 ? v : 0))
    log.push({ day: d, weather: w, water, irrigated, skippedForRain: skipped, waterlogged, weeds, infected, events })
  }
  void pestFound
  void faultFixed

  const max = LEGEND_DAYS * 3
  const pct = (v: number) => round1((v / max) * 100)
  const yieldPct = round1((grown / max) * 100)
  const lost = { drought: pct(lostRaw.drought), waterlog: pct(lostRaw.waterlog), pests: pct(lostRaw.pests), weeds: pct(lostRaw.weeds) }
  const energyKWh = round1(energy.pump + energy.weeding + energy.drone)
  const chemicalsL = round1(chem)
  const targets: LegendResult['targets'] = [
    { id: 'yield', label: 'Harvest', ok: yieldPct >= G.yield, value: `${yieldPct} %`, goal: `≥ ${G.yield} %` },
    { id: 'water', label: 'Water pumped', ok: waterMm <= G.water, value: `${Math.round(waterMm)} mm`, goal: `≤ ${G.water} mm` },
    { id: 'energy', label: 'Energy', ok: energyKWh <= G.energy, value: `${energyKWh} kWh`, goal: `≤ ${G.energy} kWh` },
    { id: 'chem', label: 'Chemicals', ok: chemicalsL <= G.chem, value: `${chemicalsL} L`, goal: `≤ ${G.chem} L` },
  ]
  const met = targets.filter((t) => t.ok).length
  let baseStars = 0
  if (met === 4) baseStars = 3
  else if (met === 3 && yieldPct >= G.yield - 8) baseStars = 2
  else if (yieldPct >= G.yield - 15) baseStars = 1

  const energyParts = { pump: round1(energy.pump), weeding: round1(energy.weeding), drone: round1(energy.drone) }
  const question = makeQuestion(yieldPct, lost, energyParts, round1(drained), round1(waterMm), plan.weeding)
  return { log, yieldPct, waterMm: round1(waterMm), drainedMm: round1(drained), energyKWh, chemicalsL, lost, energyParts, targets, baseStars, question }
}

/** What to do about weed losses depends on what the plan already does. */
function weedAdvice(weeding: WeedMethod): string {
  if (weeding === 'robot-weekly')
    return 'You already chose the most frequent weeding. Weeds regrow in the days between robot passes and drink the water you pump — and more passes would cost energy against your energy goal. That is the real trade-off.'
  if (weeding === 'robot-fortnight')
    return 'Weed more often: a weekly robot pass keeps weeds small, for about 1.5 kWh more per pass. Weeds drink the water you pump.'
  if (weeding === 'spray')
    return 'One spray slowed the weeds but did not stop them. A weeding robot removes them again and again with no chemicals — at an energy cost.'
  return 'Nobody weeded, so weeds grew all season and drank the water you pump. A weeding robot removes them with no chemicals.'
}

const LOSS_LABEL: Record<keyof LegendResult['lost'], string> = {
  drought: 'Dry soil — plants were thirsty',
  waterlog: 'Waterlogged clay — roots had no air',
  pests: 'Aphids spreading in one zone',
  weeds: 'Weeds stealing water and light',
}

function makeQuestion(
  yieldPct: number,
  lost: LegendResult['lost'],
  e: LegendResult['energyParts'],
  drained: number,
  water: number,
  weeding: WeedMethod,
): LegendQuestion {
  const lostTotal = lost.drought + lost.waterlog + lost.pests + lost.weeds
  if (lostTotal >= 3) {
    const keys = Object.keys(lost) as (keyof LegendResult['lost'])[]
    const worst = keys.reduce((a, b) => (lost[b] > lost[a] ? b : a))
    return {
      prompt: `Your harvest was ${yieldPct} %. Look back at the season: what cost you the most harvest?`,
      options: keys.map((k) => ({ id: k, label: LOSS_LABEL[k] })),
      answer: worst,
      explain: `Lost harvest: dry soil ${lost.drought} %, waterlogging ${lost.waterlog} %, aphids ${lost.pests} %, weeds ${lost.weeds} %. ${
        worst === 'drought'
          ? 'Raise the threshold (water sooner) or check your sensors.'
          : worst === 'waterlog'
            ? 'Big pulses on clay leave its roots in wet, airless soil — smaller pulses, or skip before storms.'
            : worst === 'pests'
              ? 'Scout with the drone more often: spotted early, a pest patch is tiny and cheap to treat.'
              : weedAdvice(weeding)
      }`,
    }
  }
  if (drained > 25 && water > 0) {
    return {
      prompt: `Almost no harvest was lost — but ${Math.round(drained)} mm of water drained away below the roots. Why?`,
      options: [
        { id: 'pulse', label: 'Pulses too big, or watering soil that was nearly full' },
        { id: 'pump', label: 'The pump was too weak' },
        { id: 'drone', label: 'The drone flew too often' },
      ],
      answer: 'pulse',
      explain: 'Water above what the soil can hold drains past the roots. Sandy soil holds only 30 mm, so a big pulse or a high threshold overflows it — and so does watering just before a storm.',
    }
  }
  const parts = [
    { id: 'pump', label: 'Pumping irrigation water', v: e.pump },
    { id: 'weeding', label: 'The weeding robot', v: e.weeding },
    { id: 'drone', label: 'Drone scouting flights', v: e.drone },
  ]
  const top = parts.reduce((a, b) => (b.v > a.v ? b : a))
  return {
    prompt: 'Great harvest! Which part of your farm used the most energy?',
    options: parts.map(({ id, label }) => ({ id, label })),
    answer: top.id,
    explain: `Energy: pump ${e.pump} kWh, weeding robot ${e.weeding} kWh, drone ${e.drone} kWh. A small drone flight uses very little; moving water and pulling blades through soil take far more.`,
  }
}

export function legendStars(base: number, answeredRight: boolean): number {
  if (base === 3 && !answeredRight) return 2
  return base
}

/** Point at fraction f (0..1) along a polyline (by distance). */
export function pointAlong(path: [number, number][], f: number): [number, number] {
  let total = 0
  for (let i = 1; i < path.length; i++) total += segLen(path[i - 1], path[i])
  let want = clamp(f, 0, 1) * total
  for (let i = 1; i < path.length; i++) {
    const L = segLen(path[i - 1], path[i])
    if (want <= L || i === path.length - 1) {
      const t = L > 0 ? clamp(want / L, 0, 1) : 0
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t]
    }
    want -= L
  }
  return path[path.length - 1]
}
