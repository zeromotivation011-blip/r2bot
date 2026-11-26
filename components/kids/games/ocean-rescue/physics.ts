// components/kids/games/ocean-rescue/physics.ts
// The ocean facts every part of Deep Sea Rescue shares. Pure: no React, no DOM.
//
//   - Seawater density ≈ 1,025 kg/m³ (fresh water is 1,000).
//   - Pressure grows by about 1 atmosphere for every 10 m of seawater
//     (ρ·g·h = 1025 × 9.81 × 10 ≈ 100,600 Pa ≈ 0.99 atm), on top of the
//     1 atmosphere of air at the surface.
//   - Sound travels about 1,500 m/s in seawater (it varies 1,450–1,550 m/s
//     with temperature, salt and depth) — over four times faster than in air.
//   - Sunlight fades exponentially with depth, each colour at its own rate
//     (the "diffuse attenuation coefficient" Kd, per metre). Red goes first:
//     in clear ocean water Kd(red) ≈ 0.35 /m, so red light is down to about 3 %
//     by 10 m; blue (Kd ≈ 0.02 /m) reaches far deeper. Coastal water carries
//     plankton and dissolved matter that also soak up blue, which is why it
//     looks green and gets dark within a few tens of metres.

export const RHO = 1025 // kg/m³, seawater
export const G = 9.81 // m/s²
export const SOUND_SPEED = 1500 // m/s in seawater
export const ATM_PA = 101325

/** Absolute pressure in atmospheres at a depth in metres. */
export function pressureAtm(depth: number): number {
  return 1 + (RHO * G * Math.max(0, depth)) / ATM_PA
}

/** Round-trip time of a sonar ping to something `range` metres away. */
export function echoTime(range: number): number {
  return (2 * range) / SOUND_SPEED
}

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Kd per metre for red, green, blue light. */
export const WATER_COASTAL: Rgb = { r: 0.5, g: 0.11, b: 0.15 }
export const WATER_CLEAR: Rgb = { r: 0.35, g: 0.065, b: 0.02 }

/** Fraction (0..1) of surface sunlight left at a depth, per colour. */
export function lightAt(depth: number, water: Rgb): Rgb {
  const d = Math.max(0, depth)
  return { r: Math.exp(-water.r * d), g: Math.exp(-water.g * d), b: Math.exp(-water.b * d) }
}

/** Mulberry32 — tiny seeded PRNG so every run of a tier is the same. */
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

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
