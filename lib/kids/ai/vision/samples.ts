// lib/kids/ai/vision/samples.ts
// Built-in sample pictures for the Vision Lab, drawn procedurally on a canvas —
// no image files, no camera needed, works on every device and offline. Every
// call with a new seed gives a different picture of the same thing: the
// object moves, turns, changes size and skin tone, and the wall behind it
// changes colour and clutter. That variety is the point: it is what a robot
// needs to learn the THING and not the background.

import { rng } from './classifiers'

export type SampleKind = 'thumbs' | 'hand' | 'fist' | 'ball' | 'nothing'

export interface SampleInfo {
  id: SampleKind
  name: string
  emoji: string
}

export const SAMPLE_KINDS: SampleInfo[] = [
  { id: 'thumbs', name: 'Thumbs up', emoji: '👍' },
  { id: 'hand', name: 'Open hand', emoji: '✋' },
  { id: 'fist', name: 'Fist', emoji: '✊' },
  { id: 'ball', name: 'Red ball', emoji: '🔴' },
  { id: 'nothing', name: 'Nothing', emoji: '⬜' },
]

export function sampleInfo(id: SampleKind): SampleInfo {
  return SAMPLE_KINDS.find((s) => s.id === id) ?? SAMPLE_KINDS[0]
}

// A wide range of real skin tones (everyone's hands should work).
const SKIN = ['#F5D0B5', '#E8B894', '#D49A6A', '#B97A4E', '#8D5A3B', '#6B4026', '#4A2C1A']
const WALLS = ['#CBD5E1', '#E2E8F0', '#B6C9B0', '#A9C4D8', '#94A3B8', '#5B6B82', '#D1D5DB']
const CLUTTER = ['#2563EB', '#16A34A', '#FACC15', '#0EA5E9', '#A3A3A3', '#7C3AED', '#0F766E']

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * k)))
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * k)))
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * k)))
  return `rgb(${r},${g},${b})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** A finger: a rounded capsule from (0,0) going up by `len`. */
function finger(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, len: number, angle: number, skin: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = skin
  roundRect(ctx, -w / 2, -len, w, len + w * 0.6, w / 2)
  ctx.fill()
  ctx.strokeStyle = shade(skin.startsWith('#') ? skin : '#D49A6A', 0.72)
  ctx.lineWidth = Math.max(1, w * 0.08)
  ctx.stroke()
  // Nail
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  roundRect(ctx, -w * 0.28, -len + w * 0.12, w * 0.56, w * 0.5, w * 0.2)
  ctx.fill()
  ctx.restore()
}

function wrist(ctx: CanvasRenderingContext2D, u: number, skin: string, sleeve: string): void {
  ctx.fillStyle = skin
  roundRect(ctx, -0.17 * u, 0.12 * u, 0.34 * u, 0.5 * u, 0.08 * u)
  ctx.fill()
  ctx.fillStyle = sleeve
  roundRect(ctx, -0.22 * u, 0.36 * u, 0.44 * u, 0.4 * u, 0.06 * u)
  ctx.fill()
}

function drawFistBlock(ctx: CanvasRenderingContext2D, u: number, skin: string): void {
  ctx.fillStyle = skin
  roundRect(ctx, -0.26 * u, -0.18 * u, 0.52 * u, 0.42 * u, 0.12 * u)
  ctx.fill()
  ctx.strokeStyle = shade(skin, 0.72)
  ctx.lineWidth = Math.max(1, u * 0.012)
  ctx.stroke()
  // Curled fingers: knuckle lines across the front.
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-0.26 * u + i * 0.13 * u, -0.16 * u)
    ctx.lineTo(-0.26 * u + i * 0.13 * u, 0.06 * u)
    ctx.stroke()
  }
}

/**
 * Draw one sample picture filling a `size`×`size` canvas. `light` darkens or
 * brightens the whole scene like a dim or sunny room (1 = normal).
 */
export interface SampleScene {
  /** Index into SKIN_TONES: whose hand it is. Undefined = a different person every picture. */
  skin?: number
  /** True = always the same room (wall); false = a different room every picture. */
  sameRoom?: boolean
}

export const SKIN_TONES = SKIN

export function drawSample(ctx: CanvasRenderingContext2D, size: number, kind: SampleKind, seed: number, light = 1, scene: SampleScene = {}): void {
  const r = rng(seed * 2654435761 + kind.length * 97)
  const pick = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)]
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  // Wall with a soft gradient (a lamp somewhere).
  const wallPick = pick(WALLS)
  const wall = scene.sameRoom ? WALLS[0] : wallPick
  const gx = r() * size
  const grad = ctx.createRadialGradient(gx, size * 0.1, size * 0.05, gx, size * 0.4, size * 1.1)
  grad.addColorStop(0, shade(wall, 1.12))
  grad.addColorStop(1, shade(wall, 0.78))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // Background clutter: a shelf line, a frame or a plant pot — never red, so
  // "red" stays a clue only the ball gives.
  const clutter = r() < 0.5 ? 0 : 1
  for (let i = 0; i < clutter; i++) {
    ctx.fillStyle = pick(CLUTTER)
    ctx.globalAlpha = 0.55 + r() * 0.35
    const cx = r() * size
    const cy = r() * size
    const w = size * (0.06 + r() * 0.1)
    const h = size * (0.06 + r() * 0.12)
    if (r() < 0.5) ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
    else {
      ctx.beginPath()
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  if (r() < 0.4) {
    ctx.fillStyle = shade(wall, 0.6)
    ctx.fillRect(0, size * (0.75 + r() * 0.15), size, size * 0.03)
  }

  // The object: random position, size and tilt.
  const u = size * (1.0 + r() * 0.15)
  const ox = size * (0.5 + (r() - 0.5) * 0.12)
  const oy = size * (0.47 + (r() - 0.5) * 0.1)
  const tilt = (r() - 0.5) * 0.24
  const skinPick = pick(SKIN)
  const skin = scene.skin !== undefined ? SKIN[Math.abs(scene.skin) % SKIN.length] : skinPick
  const sleeve = pick(['#1E3A8A', '#334155', '#0F172A'])
  ctx.save()
  ctx.translate(ox, oy)
  ctx.rotate(tilt)

  switch (kind) {
    case 'thumbs': {
      wrist(ctx, u, skin, sleeve)
      drawFistBlock(ctx, u, skin)
      // Thumb pointing up from the top-left of the fist.
      finger(ctx, -0.16 * u, -0.14 * u, 0.16 * u, 0.36 * u, -0.08, skin)
      break
    }
    case 'hand': {
      wrist(ctx, u, skin, sleeve)
      ctx.fillStyle = skin
      roundRect(ctx, -0.22 * u, -0.12 * u, 0.44 * u, 0.36 * u, 0.12 * u)
      ctx.fill()
      // Four fingers fanned out + thumb to the side.
      const lens = [0.3, 0.34, 0.32, 0.26]
      for (let i = 0; i < 4; i++) {
        const fx = -0.15 * u + i * 0.1 * u
        finger(ctx, fx, -0.08 * u, 0.085 * u, lens[i] * u, (i - 1.5) * 0.14, skin)
      }
      finger(ctx, -0.22 * u, 0.08 * u, 0.1 * u, 0.22 * u, -0.95, skin)
      break
    }
    case 'fist': {
      wrist(ctx, u, skin, sleeve)
      drawFistBlock(ctx, u, skin)
      // Thumb folded across the front.
      ctx.save()
      ctx.translate(-0.2 * u, 0.06 * u)
      ctx.rotate(-0.15)
      ctx.fillStyle = shade(skin, 0.92)
      roundRect(ctx, 0, 0, 0.3 * u, 0.1 * u, 0.05 * u)
      ctx.fill()
      ctx.restore()
      break
    }
    case 'ball': {
      const rad = u * (0.2 + r() * 0.06)
      const g = ctx.createRadialGradient(-rad * 0.35, -rad * 0.4, rad * 0.1, 0, 0, rad)
      g.addColorStop(0, '#FCA5A5')
      g.addColorStop(0.35, '#EF4444')
      g.addColorStop(1, '#7F1D1D')
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.ellipse(rad * 0.1, rad * 1.02, rad * 0.9, rad * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, rad, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'nothing':
      // Just the room. Sometimes an extra harmless object so "nothing" is not one exact picture.
      if (r() < 0.5) {
        ctx.fillStyle = pick(CLUTTER)
        roundRect(ctx, -0.12 * u, -0.1 * u, 0.24 * u, 0.3 * u, 0.04 * u)
        ctx.fill()
      }
      break
  }
  ctx.restore()

  // Room light: darken (or brighten) everything.
  if (light < 1) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, 1 - light)})`
    ctx.fillRect(0, 0, size, size)
  } else if (light > 1) {
    ctx.fillStyle = `rgba(255,250,235,${Math.min(0.6, (light - 1) * 0.8)})`
    ctx.fillRect(0, 0, size, size)
  }
  ctx.restore()
}
