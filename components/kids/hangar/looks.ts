// components/kids/hangar/looks.ts
// Canvas-drawn textures for the Hangar: decals, skins, the bay floor, walls and
// light beams. Drawn at runtime (no image files), so they cost nothing until the
// 3D view loads. Only imported by HangarSceneClient (next/dynamic, ssr: false).

import * as THREE from 'three'

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return [c, ctx]
}

function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  t.needsUpdate = true
  return t
}

/** Deterministic pseudo-random, so the skins look the same on every visit. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// ── Decals ─────────────────────────────────────────────────────────────────

function glowStroke(ctx: CanvasRenderingContext2D, colour: string, blur: number) {
  ctx.shadowColor = colour
  ctx.shadowBlur = blur
}

export function decalTexture(id: string): THREE.CanvasTexture | null {
  const [c, ctx] = canvas(256, 256)
  ctx.clearRect(0, 0, 256, 256)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  switch (id) {
    case 'decal-lightning': {
      glowStroke(ctx, '#FC6818', 22)
      ctx.fillStyle = '#FFA878'
      ctx.beginPath()
      ctx.moveTo(150, 22)
      ctx.lineTo(70, 140)
      ctx.lineTo(122, 140)
      ctx.lineTo(98, 234)
      ctx.lineTo(188, 104)
      ctx.lineTo(134, 104)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#FFF7ED'
      ctx.lineWidth = 6
      ctx.stroke()
      break
    }
    case 'decal-eye': {
      glowStroke(ctx, '#00E5FF', 24)
      ctx.strokeStyle = '#00E5FF'
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.moveTo(24, 128)
      ctx.quadraticCurveTo(128, 30, 232, 128)
      ctx.quadraticCurveTo(128, 226, 24, 128)
      ctx.stroke()
      ctx.fillStyle = '#00B8D4'
      ctx.beginPath()
      ctx.arc(128, 128, 44, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#E0FBFF'
      ctx.beginPath()
      ctx.arc(128, 128, 18, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'decal-wave': {
      glowStroke(ctx, '#22C55E', 20)
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = k === 0 ? '#22C55E' : '#BBF7D0'
        ctx.lineWidth = k === 0 ? 20 : 6
        ctx.beginPath()
        for (let x = 20; x <= 236; x += 4) {
          const y = 128 + Math.sin(((x - 20) / 216) * Math.PI * 3) * 52
          if (x === 20) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      break
    }
    case 'decal-gear': {
      glowStroke(ctx, '#EAB308', 20)
      ctx.fillStyle = '#FACC15'
      ctx.beginPath()
      const teeth = 10
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = (i / (teeth * 2)) * Math.PI * 2
        const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2
        const r = i % 2 === 0 ? 112 : 88
        ctx.lineTo(128 + Math.cos(a0) * r, 128 + Math.sin(a0) * r)
        ctx.lineTo(128 + Math.cos(a1) * r, 128 + Math.sin(a1) * r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(128, 128, 36, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#FEF9C3'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(128, 128, 64, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    default:
      return null
  }
  return tex(c)
}

// ── Skins ──────────────────────────────────────────────────────────────────

export interface SkinLook {
  map: THREE.CanvasTexture
  roughness: number
  metalness: number
}

export function skinLook(id: string): SkinLook | null {
  const [c, ctx] = canvas(512, 512)
  const r = rng(id.length * 7919)
  switch (id) {
    case 'skin-mars': {
      ctx.fillStyle = '#B4532A'
      ctx.fillRect(0, 0, 512, 512)
      // Large dust patches.
      for (let i = 0; i < 40; i++) {
        const x = r() * 512
        const y = r() * 512
        const rad = 30 + r() * 90
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
        const dark = r() > 0.5
        g.addColorStop(0, dark ? 'rgba(90,30,14,0.45)' : 'rgba(232,150,96,0.4)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      }
      // Grit.
      for (let i = 0; i < 4200; i++) {
        const v = r()
        ctx.fillStyle = v > 0.5 ? `rgba(255,200,160,${0.15 + r() * 0.25})` : `rgba(60,20,8,${0.15 + r() * 0.3})`
        ctx.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2)
      }
      // Scratches from a long drive.
      ctx.strokeStyle = 'rgba(255,224,200,0.35)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 24; i++) {
        const x = r() * 512
        const y = r() * 512
        const a = -0.4 + r() * 0.8
        const len = 20 + r() * 70
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
        ctx.stroke()
      }
      return { map: tex(c), roughness: 0.92, metalness: 0.05 }
    }
    case 'skin-circuit': {
      ctx.fillStyle = '#0B5D3B'
      ctx.fillRect(0, 0, 512, 512)
      // Board grain.
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = `rgba(0,0,0,${r() * 0.12})`
        ctx.fillRect(r() * 512, r() * 512, 2, 2)
      }
      // Traces: right-angle runs on a 16px grid, ending in pads.
      const step = 16
      for (let i = 0; i < 70; i++) {
        let x = Math.floor(r() * 32) * step
        let y = Math.floor(r() * 32) * step
        ctx.strokeStyle = r() > 0.25 ? '#D4A93A' : '#7EE2A8'
        ctx.lineWidth = r() > 0.7 ? 5 : 3
        ctx.beginPath()
        ctx.moveTo(x, y)
        const segs = 2 + Math.floor(r() * 4)
        for (let s = 0; s < segs; s++) {
          const len = (1 + Math.floor(r() * 5)) * step
          const dir = Math.floor(r() * 4)
          if (dir === 0) x += len
          else if (dir === 1) x -= len
          else if (dir === 2) y += len
          else y -= len
          ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.fillStyle = '#F5D27A'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#0B5D3B'
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      // A few chips.
      for (let i = 0; i < 6; i++) {
        const x = r() * 440
        const y = r() * 440
        ctx.fillStyle = '#111827'
        ctx.fillRect(x, y, 48 + r() * 24, 28 + r() * 20)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(x + 4, y + 4, 10, 4)
      }
      return { map: tex(c), roughness: 0.45, metalness: 0.25 }
    }
    default:
      return null
  }
}

// ── The bay ────────────────────────────────────────────────────────────────

/** Floor: dark panels, a fine grid that fades out, the bay circle and hazard marks. */
export function floorTexture(): THREE.CanvasTexture {
  const S = 1024
  const [c, ctx] = canvas(S, S)
  ctx.clearRect(0, 0, S, S)
  const mid = S / 2
  // Grid.
  ctx.strokeStyle = 'rgba(148,163,184,0.16)'
  ctx.lineWidth = 2
  for (let i = 0; i <= S; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, S)
    ctx.moveTo(0, i)
    ctx.lineTo(S, i)
    ctx.stroke()
  }
  // Bay ring (orange) and inner guide (cyan).
  ctx.strokeStyle = 'rgba(252,104,24,0.85)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(mid, mid, S * 0.36, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([18, 22])
  ctx.strokeStyle = 'rgba(0,229,255,0.45)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(mid, mid, S * 0.3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  // Hazard ticks around the ring.
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    ctx.strokeStyle = i % 2 ? 'rgba(252,104,24,0.6)' : 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(mid + Math.cos(a) * S * 0.38, mid + Math.sin(a) * S * 0.38)
    ctx.lineTo(mid + Math.cos(a) * S * 0.405, mid + Math.sin(a) * S * 0.405)
    ctx.stroke()
  }
  // Fade the edges into the dark.
  const fade = ctx.createRadialGradient(mid, mid, S * 0.25, mid, mid, S * 0.5)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = 'source-over'
  return tex(c)
}

/** Back wall: tall navy panels with seams and light strips. Repeats around the bay. */
export function wallTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512)
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#05080F')
  g.addColorStop(0.55, '#0E1830')
  g.addColorStop(1, '#0A1120')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  // Panel seams.
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 3
  for (const x of [0, 128, 256, 384]) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 512)
    ctx.stroke()
  }
  for (const y of [170, 340]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }
  // Light strips: orange low, cyan high.
  const strip = (x: number, y: number, h: number, colour: string) => {
    ctx.shadowColor = colour
    ctx.shadowBlur = 18
    ctx.fillStyle = colour
    ctx.fillRect(x, y, 6, h)
    ctx.shadowBlur = 0
  }
  strip(60, 360, 110, '#FC6818')
  strip(316, 360, 110, '#FC6818')
  strip(188, 60, 90, '#00B8D4')
  strip(444, 60, 90, '#00B8D4')
  // Horizontal glow band near the floor.
  const band = ctx.createLinearGradient(0, 470, 0, 512)
  band.addColorStop(0, 'rgba(252,104,24,0)')
  band.addColorStop(1, 'rgba(252,104,24,0.35)')
  ctx.fillStyle = band
  ctx.fillRect(0, 470, 512, 42)
  const t = tex(c)
  t.wrapS = THREE.RepeatWrapping
  t.repeat.set(6, 1)
  return t
}

/** Vertical gradient for additive light beams: bright at the lamp, nothing at the floor. */
export function beamTexture(colour: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(8, 256)
  // v = 1 is the top of a cone in three.js, which is canvas y = 0.
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, colour)
  g.addColorStop(1, '#000000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 256)
  return tex(c)
}

/** Soft round sprite for particles. */
export function dotTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64)
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return tex(c)
}
