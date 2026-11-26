// components/kids/episodes/engine/sets.ts
// The places of Lantern Hill, modelled from primitives: low-poly, warm
// materials, shadows, windows that glow at night. Every set keeps the same
// stage convention so the director can frame any scene the same way:
//   the cast stands around the origin (|x| < 2.2, −1 < z < 2), the camera
//   looks from +Z, scenery sits behind (z < −1.5) and to the sides (|x| > 2.6).

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SetId } from '@/lib/kids/episodes/plan'

export interface SetBuild {
  id: SetId
  group: THREE.Group
  interior: boolean
  /** Where a clock light hides in this set. */
  lightSpot: THREE.Vector3
  establish: { from: THREE.Vector3; to: THREE.Vector3 }
  /** Positions of warm lamps (lit at night / indoors). */
  lamps: THREE.Vector3[]
  /** Window and bulb materials that glow at night. */
  glow: THREE.MeshStandardMaterial[]
  /** Ground colour hint for fog/bounce light. */
  ground: string
  update?: (t: number, dt: number, calm: boolean) => void
  /** Optional hooks the director can drive. */
  hooks: Record<string, (v: number) => void>
}

// ── Toolkit ─────────────────────────────────────────────────────────────────

let seed = 1
function rnd(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
function pick<T>(a: readonly T[]): T {
  return a[Math.floor(rnd() * a.length)]
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: string, rough = 0.8, metal = 0, flat = false): THREE.MeshStandardMaterial {
  const key = `${color}|${rough}|${metal}|${flat}`
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat })
    matCache.set(key, m)
  }
  return m
}
/** Materials are shared inside one set build; the cache is reset per build so disposal stays clean. */
function resetCache(): void {
  matCache.clear()
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, cast = true, receive = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, material)
  m.castShadow = cast
  m.receiveShadow = receive
  return m
}
function put<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z)
  o.rotation.y = ry
  parent.add(o)
  return o
}
function box(w: number, h: number, d: number, color: string, rough = 0.8): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough))
}
function rbox(w: number, h: number, d: number, color: string, r = 0.04, rough = 0.7): THREE.Mesh {
  return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mat(color, rough))
}
function cyl(rt: number, rb: number, h: number, color: string, seg = 16, rough = 0.7): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, rough))
}

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  if (ctx) draw(ctx)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function stripes(a: string, b: string, n = 8): THREE.CanvasTexture {
  return canvasTexture(256, 64, (c) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? b : a
      c.fillRect((i * 256) / n, 0, 256 / n + 1, 64)
    }
  })
}

function signTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  return canvasTexture(512, 128, (c) => {
    c.fillStyle = bg
    c.fillRect(0, 0, 512, 128)
    c.strokeStyle = fg
    c.lineWidth = 8
    c.strokeRect(10, 10, 492, 108)
    c.fillStyle = fg
    c.font = "bold 64px 'Space Grotesk', system-ui, sans-serif"
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(text, 256, 68)
  })
}

function ground(g: THREE.Group, color: string, size = 60, flat = true): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size, 24, 24)
  // A little unevenness so light catches it.
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const d = Math.hypot(x, y)
    if (d > 6) pos.setZ(i, (rnd() - 0.5) * 0.08 * Math.min(1, (d - 6) / 6))
  }
  geo.computeVertexNormals()
  const gm = mesh(geo, mat(color, 0.95, 0, flat), false, true)
  gm.rotation.x = -Math.PI / 2
  g.add(gm)
  return gm
}

function windowMat(b: SetBuild): THREE.MeshStandardMaterial {
  const w = new THREE.MeshStandardMaterial({ color: '#FFD48A', emissive: '#FF9F2E', emissiveIntensity: 0.2, roughness: 0.3 })
  b.glow.push(w)
  return w
}

const WALLS = ['#F4A6A0', '#FCD34D', '#93C5FD', '#A7F3D0', '#FDBA74', '#F9A8D4', '#FDE68A', '#C4B5FD', '#FECACA', '#BAE6FD']
const ROOFS = ['#B45309', '#9A3412', '#7C2D12', '#1E3A8A', '#334155', '#065F46']

function house(b: SetBuild, w: number, h: number, d: number, wall = pick(WALLS), roof = pick(ROOFS)): THREE.Group {
  const g = new THREE.Group()
  put(g, rbox(w, h, d, wall, 0.06, 0.9), 0, h / 2, 0)
  const r = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4), mat(roof, 0.7, 0, true))
  r.rotation.y = Math.PI / 4
  r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d))
  put(g, r, 0, h + h * 0.27, 0)
  const wm = windowMat(b)
  const cols = Math.max(1, Math.floor(w / 0.9))
  const rows = Math.max(1, Math.floor(h / 1.1))
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      if (ry === 0 && cx === Math.floor(cols / 2)) continue
      const x = -w / 2 + (w / cols) * (cx + 0.5)
      const y = 0.75 + ry * 1.05
      if (y > h - 0.3) continue
      put(g, mesh(new THREE.PlaneGeometry(0.34, 0.42), wm, false, false), x, y, d / 2 + 0.005)
      put(g, box(0.42, 0.05, 0.08, '#FFFFFF'), x, y - 0.24, d / 2 + 0.03)
    }
  }
  put(g, rbox(0.42, 0.75, 0.06, pick(['#7C2D12', '#1E3A8A', '#065F46', '#B91C1C']), 0.03), (cols % 2 ? 0 : 0.45), 0.375, d / 2 + 0.02)
  return g
}

function tree(scale = 1, color = pick(['#4D9A4A', '#3E8E41', '#5DAA4F', '#2F7D3A'])): THREE.Group {
  const g = new THREE.Group()
  put(g, cyl(0.07 * scale, 0.1 * scale, 0.8 * scale, '#6B4226', 7), 0, 0.4 * scale, 0)
  for (let i = 0; i < 3; i++) {
    const f = mesh(new THREE.IcosahedronGeometry((0.42 - i * 0.07) * scale, 0), mat(color, 0.85, 0, true))
    put(g, f, (rnd() - 0.5) * 0.25 * scale, (0.95 + i * 0.3) * scale, (rnd() - 0.5) * 0.25 * scale)
    f.rotation.set(rnd(), rnd(), rnd())
  }
  return g
}

function lamp(b: SetBuild, h = 2.2): THREE.Group {
  const g = new THREE.Group()
  put(g, cyl(0.035, 0.05, h, '#1F2937', 8, 0.5), 0, h / 2, 0)
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#FFE7B0', emissive: '#FFC861', emissiveIntensity: 0.3 })
  b.glow.push(bulbMat)
  put(g, mesh(new THREE.SphereGeometry(0.11, 12, 10), bulbMat, false), 0, h + 0.05, 0)
  put(g, mesh(new THREE.ConeGeometry(0.16, 0.12, 8), mat('#1F2937', 0.5)), 0, h + 0.18, 0)
  return g
}

function flowerpot(color = pick(['#F43F5E', '#FACC15', '#FB923C', '#E879F9', '#F8FAFC'])): THREE.Group {
  const g = new THREE.Group()
  put(g, cyl(0.16, 0.11, 0.26, '#C2410C', 12), 0, 0.13, 0)
  put(g, mesh(new THREE.IcosahedronGeometry(0.17, 0), mat('#3E8E41', 0.8, 0, true)), 0, 0.34, 0)
  for (let i = 0; i < 4; i++) {
    put(g, mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(color, 0.6)), Math.cos(i * 1.6) * 0.11, 0.44 + rnd() * 0.06, Math.sin(i * 1.6) * 0.11)
  }
  return g
}

function bench(): THREE.Group {
  const g = new THREE.Group()
  put(g, rbox(1.2, 0.06, 0.36, '#92400E', 0.02), 0, 0.42, 0)
  put(g, rbox(1.2, 0.3, 0.05, '#92400E', 0.02), 0, 0.68, -0.17)
  for (const x of [-0.5, 0.5]) put(g, box(0.06, 0.42, 0.34, '#1F2937'), x, 0.21, 0)
  return g
}

function crate(color = '#B45309'): THREE.Mesh {
  return rbox(0.45, 0.32, 0.35, color, 0.03, 0.9)
}

function fruitCrate(fruit: string): THREE.Group {
  const g = new THREE.Group()
  put(g, crate(), 0, 0.16, 0)
  for (let i = 0; i < 7; i++) put(g, mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(fruit, 0.5)), -0.14 + (i % 4) * 0.09, 0.36, -0.07 + Math.floor(i / 4) * 0.12)
  return g
}

function stall(a: string, b: string, fruit = pick(['#F97316', '#EF4444', '#FACC15', '#84CC16', '#A855F7'])): THREE.Group {
  const g = new THREE.Group()
  put(g, rbox(1.6, 0.8, 0.7, '#A16207', 0.04), 0, 0.4, 0)
  for (const x of [-0.75, 0.75]) put(g, cyl(0.03, 0.03, 2, '#78350F', 6), x, 1, -0.3)
  const tex = stripes(a, b)
  const awn = mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }))
  awn.rotation.x = -Math.PI / 2 + 0.45
  put(g, awn, 0, 1.9, 0.05)
  for (let i = 0; i < 3; i++) put(g, fruitCrate(i === 1 ? fruit : pick(['#F97316', '#EF4444', '#FACC15', '#84CC16'])), -0.5 + i * 0.5, 0.8, 0.05)
  return g
}

function fountain(b: SetBuild): THREE.Group {
  const g = new THREE.Group()
  put(g, cyl(1.3, 1.4, 0.45, '#CBD5E1', 28, 0.6), 0, 0.22, 0)
  const water = mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.05, 28), new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 }), false)
  put(g, water, 0, 0.42, 0)
  put(g, cyl(0.18, 0.25, 1.1, '#CBD5E1', 16, 0.6), 0, 0.8, 0)
  put(g, cyl(0.55, 0.35, 0.15, '#E2E8F0', 20, 0.6), 0, 1.3, 0)
  // Spray: a few drops that rise and fall.
  const drops = new THREE.Group()
  const dm = new THREE.MeshStandardMaterial({ color: '#BAE6FD', emissive: '#38BDF8', emissiveIntensity: 0.3, transparent: true, opacity: 0.8 })
  for (let i = 0; i < 24; i++) {
    const d = mesh(new THREE.SphereGeometry(0.03, 6, 4), dm, false, false)
    d.userData.phase = rnd()
    d.userData.ang = rnd() * Math.PI * 2
    drops.add(d)
  }
  put(g, drops, 0, 1.4, 0)
  const prev = b.update
  b.update = (t, dt, calm) => {
    prev?.(t, dt, calm)
    drops.children.forEach((d) => {
      const p = (t * 0.6 + (d.userData.phase as number)) % 1
      const r = 0.1 + p * 0.5
      const a = d.userData.ang as number
      d.position.set(Math.cos(a) * r, Math.sin(p * Math.PI) * 0.5 - p * 0.9, Math.sin(a) * r)
    })
  }
  return g
}

function waterPlane(b: SetBuild, w: number, d: number, color = '#1E88C8'): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, d, 40, 20)
  const wm = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.35, flatShading: true })
  const water = mesh(geo, wm, false, true)
  water.rotation.x = -Math.PI / 2
  const base = Float32Array.from(geo.attributes.position.array as Float32Array)
  const prev = b.update
  let acc = 0
  b.update = (t, dt, calm) => {
    prev?.(t, dt, calm)
    acc += dt
    if (acc < 1 / 20) return // 20 fps is plenty for water
    acc = 0
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const y = base[i * 3 + 1]
      pos.setZ(i, calm ? 0 : Math.sin(x * 0.9 + t * 1.3) * 0.05 + Math.cos(y * 1.3 + t) * 0.04)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  }
  return water
}

function boat(color: string): THREE.Group {
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-0.9, 0.35)
  shape.quadraticCurveTo(-0.85, -0.1, -0.4, -0.2)
  shape.lineTo(0.6, -0.2)
  shape.quadraticCurveTo(1.0, -0.05, 1.1, 0.4)
  shape.lineTo(-0.9, 0.35)
  const hull = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 }), mat(color, 0.6))
  hull.position.z = -0.35
  g.add(hull)
  put(g, rbox(0.5, 0.35, 0.5, '#F8FAFC', 0.04), -0.1, 0.55, 0)
  put(g, cyl(0.025, 0.025, 1.6, '#78350F', 6), 0.35, 1.0, 0)
  return g
}

function gearGeometry(r: number, teeth: number, depth: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  const inner = r * 0.82
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2
    const rr = i % 2 ? inner : r
    if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr)
    s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr)
    s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
  }
  const hole = new THREE.Path()
  hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true)
  s.holes.push(hole)
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false })
}

function clockTower(b: SetBuild, h: number, withLights: boolean): THREE.Group {
  const g = new THREE.Group()
  put(g, rbox(2, h, 2, '#E7D3B0', 0.05, 0.9), 0, h / 2, 0)
  put(g, rbox(2.3, 0.3, 2.3, '#9A3412', 0.05), 0, h, 0)
  const roof = mesh(new THREE.ConeGeometry(1.6, 1.6, 4), mat('#7C2D12', 0.7, 0, true))
  roof.rotation.y = Math.PI / 4
  put(g, roof, 0, h + 0.95, 0)
  const face = mesh(new THREE.CircleGeometry(0.82, 36), mat('#FFF7E6', 0.6))
  put(g, face, 0, h - 1.1, 1.01)
  const ring = mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 36), mat('#1F2937', 0.4, 0.4))
  put(g, ring, 0, h - 1.1, 1.02)
  const hand1 = box(0.05, 0.55, 0.02, '#1F2937')
  hand1.geometry.translate(0, 0.25, 0)
  put(g, hand1, 0, h - 1.1, 1.04).rotation.z = -0.6
  const hand2 = box(0.06, 0.4, 0.02, '#1F2937')
  hand2.geometry.translate(0, 0.18, 0)
  put(g, hand2, 0, h - 1.1, 1.045).rotation.z = 1.9
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const holder = mesh(new THREE.SphereGeometry(0.09, 12, 10), withLights ? new THREE.MeshStandardMaterial({ color: '#FFE7A0', emissive: '#FFB020', emissiveIntensity: 2.2 }) : mat('#57534E', 0.6))
    holder.name = `clock-light-${i}`
    const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: '#FFC861', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    hl.scale.setScalar(0.55)
    hl.visible = withLights
    holder.add(hl)
    put(g, holder, Math.sin(a) * 0.68, h - 1.1 + Math.cos(a) * 0.68, 1.06)
  }
  const wm = windowMat(b)
  for (let i = 0; i < 3; i++) put(g, mesh(new THREE.PlaneGeometry(0.3, 0.5), wm, false, false), 0, 1 + i * 1.3, 1.006)
  return g
}

let haloTex: THREE.CanvasTexture | null = null
function haloTexture(): THREE.CanvasTexture {
  if (!haloTex || !haloTex.image) {
    haloTex = canvasTexture(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,240,200,1)')
      g.addColorStop(0.3, 'rgba(255,200,100,0.6)')
      g.addColorStop(1, 'rgba(255,160,60,0)')
      c.fillStyle = g
      c.fillRect(0, 0, 64, 64)
    })
  }
  return haloTex
}

function stars(): THREE.Points {
  const n = 500
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const th = rnd() * Math.PI * 2
    const ph = rnd() * Math.PI * 0.42
    const r = 70
    pos[i * 3] = Math.cos(th) * Math.sin(ph) * r
    pos[i * 3 + 1] = Math.cos(ph) * r * 0.9 + 4
    pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.25, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.85 }))
  pts.name = 'stars'
  return pts
}

/** An interior room open to +Z: floor, back + side walls, a window with sunlight. */
function room(b: SetBuild, g: THREE.Group, w: number, d: number, h: number, wall: string, floor: string, opts: { window?: boolean; fogWindow?: boolean } = {}): void {
  const fl = mesh(new THREE.PlaneGeometry(w, d), mat(floor, 0.85), false, true)
  fl.rotation.x = -Math.PI / 2
  put(g, fl, 0, 0, -d / 2 + 3)
  // Floorboards
  for (let i = 0; i < w / 0.5; i++) put(g, box(0.012, 0.003, d, '#8A5A33'), -w / 2 + i * 0.5, 0.001, -d / 2 + 3)
  const back = mesh(new THREE.PlaneGeometry(w, h), mat(wall, 0.95), false, true)
  put(g, back, 0, h / 2, -d + 3)
  for (const side of [-1, 1]) {
    const sw = mesh(new THREE.PlaneGeometry(d, h), mat(wall, 0.95), false, true)
    sw.rotation.y = -side * Math.PI / 2
    put(g, sw, side * w / 2, h / 2, -d / 2 + 3)
  }
  // Skirting + ceiling beam
  put(g, box(w, 0.14, 0.04, '#7C2D12'), 0, 0.07, -d + 3.02)
  put(g, box(w, 0.2, 0.25, '#78350F'), 0, h - 0.1, -d / 2 + 2)
  if (opts.window !== false) {
    const win = new THREE.MeshStandardMaterial({ color: opts.fogWindow ? '#E2E8F0' : '#FFF4D6', emissive: opts.fogWindow ? '#CBD5E1' : '#FFE2A8', emissiveIntensity: 1.1 })
    put(g, mesh(new THREE.PlaneGeometry(1.4, 1.1), win, false, false), -w / 4, h * 0.55, -d + 3.01)
    put(g, box(1.55, 0.08, 0.1, '#FFFFFF'), -w / 4, h * 0.55 - 0.6, -d + 3.05)
    put(g, box(0.06, 1.1, 0.04, '#FFFFFF'), -w / 4, h * 0.55, -d + 3.03)
    put(g, box(1.4, 0.06, 0.04, '#FFFFFF'), -w / 4, h * 0.55, -d + 3.03)
    // A soft shaft of light from the window.
    const shaft = mesh(
      new THREE.CylinderGeometry(0.6, 1.2, h * 1.3, 4, 1, true),
      new THREE.MeshBasicMaterial({ color: opts.fogWindow ? '#E2E8F0' : '#FFE7B0', transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      false,
      false,
    )
    shaft.rotation.set(0.75, Math.PI / 4, 0)
    put(g, shaft, -w / 4 + 0.6, h * 0.4, -d + 3.9)
  }
  b.lamps.push(new THREE.Vector3(1.2, h - 0.5, 0.5), new THREE.Vector3(-2.2, h - 0.5, -1.5))
}

/** Set dressing for Nana Lucía's workshop: a lived-in room, not bare walls. */
function workshopDressing(b: SetBuild, g: THREE.Group): void {
  // Warm wood panelling on the lower walls.
  put(g, box(9, 1.0, 0.03, '#C98A4B', 0.9), 0, 0.5, -3.97)
  for (const side of [-1, 1]) {
    const p = box(0.03, 1.0, 7, '#C98A4B', 0.9)
    put(g, p, side * 4.47, 0.5, -0.5)
    put(g, box(0.05, 0.05, 7, '#7C2D12'), side * 4.46, 1.02, -0.5)
  }
  put(g, box(9, 0.05, 0.05, '#7C2D12'), 0, 1.02, -3.95)

  // A big window on the right wall: sky, the hill and the Lantern Clock outside.
  const view = canvasTexture(512, 384, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 384)
    sky.addColorStop(0, '#5FB3EA')
    sky.addColorStop(0.65, '#CDEBFF')
    sky.addColorStop(1, '#FFE7C2')
    c.fillStyle = sky
    c.fillRect(0, 0, 512, 384)
    c.fillStyle = '#FFFFFF'
    for (const [x, y, r] of [[90, 80, 28], [125, 72, 34], [160, 84, 24], [360, 120, 22], [392, 112, 30]]) {
      c.beginPath()
      c.arc(x, y, r, 0, Math.PI * 2)
      c.fill()
    }
    c.fillStyle = '#6DBB5C'
    c.beginPath()
    c.moveTo(0, 384)
    c.quadraticCurveTo(170, 210, 330, 290)
    c.quadraticCurveTo(430, 330, 512, 300)
    c.lineTo(512, 384)
    c.fill()
    // The clock tower on the hill.
    c.fillStyle = '#B45309'
    c.fillRect(196, 168, 34, 78)
    c.fillStyle = '#7C2D12'
    c.beginPath()
    c.moveTo(190, 170)
    c.lineTo(213, 138)
    c.lineTo(236, 170)
    c.fill()
    c.fillStyle = '#FFF7E0'
    c.beginPath()
    c.arc(213, 192, 11, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#4D9A4A'
    for (const [x, y] of [[60, 330], [300, 300], [450, 320]]) {
      c.beginPath()
      c.arc(x, y, 26, 0, Math.PI * 2)
      c.fill()
    }
  })
  const win = mesh(new THREE.PlaneGeometry(1.8, 1.3), new THREE.MeshStandardMaterial({ map: view, emissive: '#FFFFFF', emissiveMap: view, emissiveIntensity: 0.85 }), false, false)
  put(g, win, 4.46, 1.85, -1.2, -Math.PI / 2)
  for (const dz of [-0.92, 0.92]) put(g, box(0.08, 1.42, 0.07, '#FFFFFF'), 4.44, 1.85, -1.2 + dz)
  for (const dy of [-0.68, 0.68]) put(g, box(0.08, 0.07, 1.9, '#FFFFFF'), 4.44, 1.85 + dy, -1.2)
  put(g, box(0.06, 1.3, 0.04, '#FFFFFF'), 4.43, 1.85, -1.2)
  put(g, box(0.22, 0.06, 2.0, '#F5F5F4'), 4.36, 1.15, -1.2) // sill
  put(g, flowerpot('#F43F5E'), 4.3, 1.18, -1.75)
  for (const dz of [-1.25, 1.25]) put(g, rbox(0.06, 1.7, 0.42, '#FC6818', 0.02, 0.95), 4.38, 1.9, -1.2 + dz) // curtains

  // Posters and a pegboard on the back wall.
  const poster = (draw: (c: CanvasRenderingContext2D) => void, w: number, h: number, x: number, y: number, tilt = 0) => {
    const tex = canvasTexture(256, Math.round((256 * h) / w), draw)
    const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), false, false)
    m.rotation.z = tilt
    put(g, m, x, y, -3.95)
  }
  poster(
    (c) => {
      c.fillStyle = '#0A1120'
      c.fillRect(0, 0, 256, 340)
      c.textAlign = 'center'
      c.font = 'bold 40px sans-serif'
      const words: [string, string][] = [['SENSE', '#22D3EE'], ['THINK', '#FFB020'], ['ACT', '#FC6818']]
      words.forEach(([w, col], i) => {
        c.fillStyle = col
        c.beginPath()
        c.arc(128, 62 + i * 105, 34, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = '#0A1120'
        c.fillText(String(i + 1), 128, 76 + i * 105)
        c.fillStyle = '#FFFFFF'
        c.font = 'bold 26px sans-serif'
        c.fillText(w, 128, 122 + i * 105)
        c.font = 'bold 40px sans-serif'
      })
    },
    0.62,
    0.82,
    -1.25,
    2.2,
    0.03,
  )
  poster(
    (c) => {
      c.fillStyle = '#1D4ED8'
      c.fillRect(0, 0, 256, 192)
      c.strokeStyle = 'rgba(255,255,255,.25)'
      for (let i = 0; i < 256; i += 16) {
        c.beginPath()
        c.moveTo(i, 0)
        c.lineTo(i, 192)
        c.moveTo(0, i)
        c.lineTo(256, i)
        c.stroke()
      }
      c.strokeStyle = '#FFFFFF'
      c.lineWidth = 4
      c.strokeRect(88, 50, 80, 70)
      c.strokeRect(108, 70, 14, 14)
      c.strokeRect(134, 70, 14, 14)
      c.beginPath()
      c.arc(100, 136, 16, 0, Math.PI * 2)
      c.arc(156, 136, 16, 0, Math.PI * 2)
      c.moveTo(128, 50)
      c.lineTo(128, 30)
      c.stroke()
    },
    0.86,
    0.64,
    1.25,
    2.25,
    -0.04,
  )
  // Pegboard with tools.
  put(g, box(1.3, 0.78, 0.03, '#D6B48A', 0.95), 0, 1.6, -3.96)
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) put(g, mesh(new THREE.CircleGeometry(0.012, 6), mat('#8A6A4A', 0.9), false, false), -0.54 + i * 0.18, 1.32 + j * 0.18, -3.94)
  put(g, box(0.05, 0.42, 0.03, '#64748B', 0.4), -0.42, 1.6, -3.92) // wrench handle
  put(g, mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12, Math.PI * 1.5), mat('#64748B', 0.35, 0.6)), -0.42, 1.85, -3.92)
  put(g, box(0.05, 0.3, 0.03, '#B45309'), -0.12, 1.55, -3.92) // hammer handle
  put(g, box(0.2, 0.07, 0.05, '#475569', 0.4), -0.12, 1.72, -3.92)
  put(g, box(0.035, 0.22, 0.03, '#FC6818'), 0.16, 1.62, -3.92) // screwdriver
  put(g, box(0.012, 0.16, 0.012, '#CBD5E1', 0.3), 0.16, 1.43, -3.92)
  put(g, mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 16), mat('#22C55E', 0.6)), 0.42, 1.62, -3.92) // coil of wire

  // Bunting across the room.
  const flagCols = ['#FC6818', '#22D3EE', '#FACC15', '#F8FAFC']
  for (let i = 0; i < 15; i++) {
    const x = -3.8 + i * 0.54
    const sag = Math.sin((i / 14) * Math.PI) * 0.28
    const tri = mesh(new THREE.ConeGeometry(0.1, 0.22, 3), mat(flagCols[i % 4], 0.8), false, false)
    tri.rotation.x = Math.PI
    put(g, tri, x, 3.05 - sag, -3.3)
  }

  // A warm desk lamp on the bench, a stool, and a plant by the door.
  const lampG = new THREE.Group()
  put(lampG, cyl(0.1, 0.12, 0.03, '#0E7490', 12), 0, 0.015, 0)
  const arm = put(lampG, cyl(0.012, 0.012, 0.42, '#0E7490', 6), 0.06, 0.21, 0)
  arm.rotation.z = -0.3
  const shade = put(lampG, mesh(new THREE.ConeGeometry(0.1, 0.14, 14, 1, true), mat('#0E7490', 0.5)), 0.16, 0.42, 0)
  shade.rotation.z = 0.9
  const bulb = new THREE.MeshStandardMaterial({ color: '#FFF1C1', emissive: '#FFC861', emissiveIntensity: 1.4 })
  b.glow.push(bulb)
  put(lampG, mesh(new THREE.SphereGeometry(0.04, 8, 6), bulb, false), 0.2, 0.38, 0)
  put(g, lampG, 1.0, 0.79, -1.4)
  put(g, cyl(0.2, 0.2, 0.05, '#B45309', 14), 1.6, 0.5, -0.3)
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) put(g, box(0.035, 0.5, 0.035, '#78350F'), 1.6 + dx, 0.25, -0.3 + dz)
  const plant = flowerpot('#FACC15')
  plant.scale.setScalar(1.9)
  put(g, plant, -3.9, 0, 1.2)
  b.lamps.splice(2, 0, new THREE.Vector3(1.2, 1.25, -1.3))
}

function shelvesWithJars(g: THREE.Group, x: number, z: number): void {
  for (let r = 0; r < 4; r++) {
    put(g, box(1.8, 0.05, 0.4, '#92400E'), x, 0.55 + r * 0.55, z)
    for (let i = 0; i < 5; i++) {
      const jar = mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12),
        new THREE.MeshStandardMaterial({ color: pick(['#A5F3FC', '#FDE68A', '#BBF7D0', '#FECACA']), roughness: 0.1, transparent: true, opacity: 0.6 }),
      )
      put(g, jar, x - 0.7 + i * 0.35, 0.69 + r * 0.55, z)
      put(g, cyl(0.095, 0.095, 0.04, '#B91C1C', 12), x - 0.7 + i * 0.35, 0.82 + r * 0.55, z)
    }
  }
}

function table(g: THREE.Group, x: number, z: number, w = 2.2, d = 1.1, h = 0.75, color = '#A16207'): void {
  put(g, rbox(w, 0.08, d, color, 0.02), x, h, z)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, box(0.08, h, 0.08, '#78350F'), x + sx * (w / 2 - 0.12), h / 2, z + sz * (d / 2 - 0.12))
}

function hedge(w: number, h: number, d: number): THREE.Mesh {
  const geo = new RoundedBoxGeometry(w, h, d, 2, 0.12)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + (rnd() - 0.5) * 0.06, pos.getY(i) + (rnd() - 0.5) * 0.06, pos.getZ(i) + (rnd() - 0.5) * 0.06)
  geo.computeVertexNormals()
  return mesh(geo, mat('#2F7D3A', 0.9, 0, true))
}

function townBackdrop(b: SetBuild, g: THREE.Group, zFrom: number, rows = 2): void {
  for (let r = 0; r < rows; r++) {
    for (let x = -12; x <= 12; x += 2.2 + rnd() * 0.6) {
      if (Math.abs(x) < 1.6 && r === 0) continue
      const h = 2 + rnd() * 1.8 + r * 0.6
      put(g, house(b, 1.8 + rnd() * 0.5, h, 1.6), x, r * 0.8, zFrom - r * 3 - rnd())
    }
  }
}

// ── Sets ─────────────────────────────────────────────────────────────────────

type Builder = (b: SetBuild, g: THREE.Group) => void

const BUILDERS: Record<SetId, Builder> = {
  hill(b, g) {
    b.ground = '#3E6B3A'
    ground(g, '#4A7A40', 80)
    const sea = waterPlane(b, 90, 30, '#1D4E89')
    put(g, sea, 0, 0.05, 22)
    for (let r = 0; r < 7; r++) {
      const terrace = mesh(new THREE.BoxGeometry(40, 1.2, 2.6), mat('#5B8A47', 0.95, 0, true))
      put(g, terrace, 0, r * 1.1 + 0.5, -r * 2.6 - 2)
      for (let x = -16; x <= 16; x += 2 + rnd() * 1.4) {
        put(g, house(b, 1.4 + rnd() * 0.5, 1.6 + rnd() * 1.2, 1.3), x + rnd() * 0.5, r * 1.1 + 1.1, -r * 2.6 - 2.4, (rnd() - 0.5) * 0.3)
      }
    }
    const tower = clockTower(b, 7, true)
    tower.name = 'clock-tower'
    put(g, tower, 0, 8.8, -21)
    for (let i = 0; i < 9; i++) put(g, lamp(b, 1.6), -8 + i * 2, 0, 4)
    b.lightSpot.set(0, 14.7, -20)
    b.establish = { from: new THREE.Vector3(0, 2.2, 14), to: new THREE.Vector3(0, 9, -18) }
  },
  workshop(b, g) {
    b.interior = true
    room(b, g, 9, 7, 3.4, '#F3E2C7', '#B7834F')
    shelvesWithJars(g, 2.8, -3.6)
    shelvesWithJars(g, -2.8, -3.6)
    table(g, 0, -1.1, 2.6, 1.2)
    put(g, rbox(0.5, 0.3, 0.35, '#DC2626', 0.04), -0.8, 0.95, -1.2) // toolbox
    put(g, rbox(0.7, 0.45, 0.5, '#C2A47A', 0.03), 2.8, 2.98, -3.55) // the dusty box
    put(g, mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshStandardMaterial({ map: signTexture('FOR A NEW HELPER', '#F5E6C8', '#7C2D12') }), false, false), 2.8, 3.0, -3.29)
    const lampShade = mesh(new THREE.ConeGeometry(0.3, 0.3, 16, 1, true), mat('#0E7490', 0.5))
    put(g, lampShade, 0, 2.6, -1.1)
    put(g, cyl(0.01, 0.01, 0.8, '#111827', 4), 0, 3.0, -1.1)
    const bulb = new THREE.MeshStandardMaterial({ color: '#FFF1C1', emissive: '#FFC861', emissiveIntensity: 1.4 })
    b.glow.push(bulb)
    put(g, mesh(new THREE.SphereGeometry(0.09, 10, 8), bulb, false), 0, 2.45, -1.1)
    for (let i = 0; i < 6; i++) put(g, mesh(gearGeometry(0.18 + rnd() * 0.1, 10, 0.05), mat('#94A3B8', 0.35, 0.7)), -4.45, 1.2 + i * 0.35, -2 + rnd() * 1.5, Math.PI / 2)
    put(g, rbox(1.2, 0.04, 2.2, '#9F1239', 0.02, 0.95), 0, 0.01, 1.0) // rug
    workshopDressing(b, g)
    b.lightSpot.set(1.6, 0.25, 1.6)
    b.establish = { from: new THREE.Vector3(2.6, 2.3, 5.2), to: new THREE.Vector3(0, 1.0, -1) }
  },
  garden(b, g) {
    b.ground = '#5DAA4F'
    ground(g, '#5FA052', 60)
    for (let z = 4; z > -10; z -= 0.75) put(g, mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.05, 7), mat('#D6CFC2', 0.9, 0, true)), Math.sin(z * 0.4) * 0.4, 0.02, z)
    put(g, house(b, 4, 3, 3, '#FDE68A', '#9A3412'), -1, 0, -6.5)
    for (let z = 3; z > -5; z -= 1.3) {
      put(g, flowerpot(), -1.7, 0, z)
      put(g, flowerpot(), 1.8, 0, z - 0.4)
    }
    for (let x = -9; x <= 9; x += 0.6) if (Math.abs(x) > 1.2) put(g, box(0.08, 0.8, 0.08, '#F8FAFC'), x, 0.4, -4)
    put(g, box(18, 0.07, 0.05, '#F8FAFC'), 0, 0.7, -4)
    for (let i = 0; i < 8; i++) put(g, tree(1.2 + rnd() * 0.8), pick([-1, 1]) * (4 + rnd() * 6), 0, -2 - rnd() * 10)
    put(g, hedge(6, 1, 0.8), -6, 0.5, 0)
    put(g, lamp(b), 2.6, 0, -2)
    b.lamps.push(new THREE.Vector3(2.6, 2.2, -2))
    b.lightSpot.set(1.5, 0.35, 0.6)
    b.establish = { from: new THREE.Vector3(-2.5, 2.4, 6), to: new THREE.Vector3(0, 0.8, -2) }
  },
  street(b, g) {
    b.ground = '#8B8178'
    ground(g, '#8E8579', 60)
    const road = mesh(new THREE.PlaneGeometry(4.4, 60), mat('#6B6259', 0.95), false, true)
    road.rotation.x = -Math.PI / 2
    put(g, road, 0, 0.01, 0)
    // Cobbles
    for (let i = 0; i < 160; i++) put(g, mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.03, 6), mat(pick(['#7A7067', '#857A70', '#6E655C']), 0.95, 0, true), false), (rnd() - 0.5) * 4.2, 0.02, (rnd() - 0.5) * 20)
    for (const side of [-1, 1]) {
      put(g, box(1.2, 0.12, 40, '#B8AEA3'), side * 2.8, 0.06, 0)
      for (let z = 6; z > -18; z -= 2.6) {
        const hz = house(b, 2.2, 2.8 + rnd() * 1.4, 2)
        put(g, hz, side * 4.6, 0, z, -side * Math.PI / 2)
      }
      for (let z = 4; z > -12; z -= 5) put(g, lamp(b), side * 2.5, 0, z)
    }
    // Bakery front with sign and awning on the left.
    const sign = mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: signTexture('BAKERY', '#7C2D12', '#FFE7B0') }), false, false)
    sign.rotation.y = Math.PI / 2
    put(g, sign, -3.55, 2.6, -1.4)
    const awn = mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshStandardMaterial({ map: stripes('#FC6818', '#FFF7ED'), side: THREE.DoubleSide, roughness: 0.8 }))
    awn.rotation.set(0, Math.PI / 2, -0.5)
    put(g, awn, -3.3, 2.15, -1.4)
    // Bread cart
    const cart = new THREE.Group()
    put(cart, rbox(1.1, 0.4, 0.7, '#B45309', 0.04), 0, 0.6, 0)
    for (const x of [-0.4, 0.4]) {
      const wh = mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), mat('#1F2937', 0.5))
      put(cart, wh, x, 0.25, 0.38)
    }
    for (let i = 0; i < 5; i++) put(cart, mesh(new THREE.CapsuleGeometry(0.08, 0.2, 4, 8), mat('#D97706', 0.7)), -0.35 + i * 0.18, 0.88, 0).rotation.z = Math.PI / 2
    cart.name = 'cart'
    put(g, cart, 2.0, 0, -2.6, -0.3)
    // Zebra crossing
    for (let i = 0; i < 6; i++) put(g, box(0.4, 0.012, 1.6, '#F8FAFC', 0.6), -1.9 + i * 0.75, 0.025, -5.2)
    b.lamps.push(new THREE.Vector3(-2.5, 2.2, 4), new THREE.Vector3(2.5, 2.2, -1))
    b.lightSpot.set(-1.6, 0.3, 1.2)
    b.establish = { from: new THREE.Vector3(0.5, 3.2, 8), to: new THREE.Vector3(0, 0.8, -4) }
  },
  bakery(b, g) {
    b.interior = true
    room(b, g, 9, 6.5, 3.2, '#FDE7C8', '#A0522D')
    for (const x of [-2.6, 2.6]) {
      for (let r = 0; r < 3; r++) {
        put(g, box(2.2, 0.05, 0.45, '#78350F'), x, 0.7 + r * 0.6, -3.2)
        for (let i = 0; i < 6; i++) {
          const kind = (i + r) % 3
          const geo = kind === 0 ? new THREE.CapsuleGeometry(0.07, 0.22, 4, 8) : kind === 1 ? new THREE.SphereGeometry(0.12, 10, 8) : new THREE.TorusGeometry(0.09, 0.045, 6, 12)
          const bread = mesh(geo, mat(pick(['#D97706', '#B45309', '#F59E0B', '#92400E']), 0.75))
          if (kind === 0) bread.rotation.z = Math.PI / 2
          if (kind === 2) bread.rotation.x = Math.PI / 2
          put(g, bread, x - 0.9 + i * 0.36, 0.82 + r * 0.6, -3.2)
        }
      }
    }
    put(g, rbox(3.6, 1.0, 0.8, '#92400E', 0.04), 0, 0.5, -1.8)
    put(g, rbox(3.7, 0.06, 0.9, '#F5E6C8', 0.02), 0, 1.03, -1.8)
    for (let i = 0; i < 4; i++) {
      const basket = new THREE.Group()
      put(basket, cyl(0.28, 0.2, 0.25, '#A16207', 14, 0.95), 0, 0.12, 0)
      for (let k = 0; k < 4; k++) put(basket, mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#D97706', 0.7)), (k - 1.5) * 0.1, 0.27, 0)
      put(g, basket, 2.4 + (i % 2) * 0.6, Math.floor(i / 2) * 0.26, 0.2 + (i % 2) * 0.3)
    }
    // Oven with a glowing mouth
    put(g, rbox(1.4, 1.6, 1, '#7F1D1D', 0.1), 0, 0.8, -3.3)
    const fire = new THREE.MeshStandardMaterial({ color: '#FB923C', emissive: '#F97316', emissiveIntensity: 2.4 })
    put(g, mesh(new THREE.CircleGeometry(0.35, 20, 0, Math.PI), fire, false, false), 0, 0.6, -2.79)
    b.lamps.push(new THREE.Vector3(0, 0.8, -2.4))
    b.lightSpot.set(2.6, 0.5, 0.4)
    b.establish = { from: new THREE.Vector3(-2.2, 2.2, 5), to: new THREE.Vector3(0, 1, -1.5) }
  },
  square(b, g) {
    b.ground = '#C9B79C'
    ground(g, '#B9A88E', 60)
    // Paving circle
    const pav = mesh(new THREE.CircleGeometry(7, 40), mat('#D8C8AE', 0.95), false, true)
    pav.rotation.x = -Math.PI / 2
    put(g, pav, 0, 0.01, -2)
    for (let r = 1; r < 7; r++) {
      const ring = mesh(new THREE.RingGeometry(r - 0.02, r, 48), mat('#BFAE92', 0.95), false, true)
      ring.rotation.x = -Math.PI / 2
      put(g, ring, 0, 0.015, -2)
    }
    put(g, fountain(b), 0, 0, -3.2)
    for (const x of [-3.6, 3.6]) put(g, bench(), x, 0, -1.5, x > 0 ? -0.5 : 0.5)
    for (let i = 0; i < 6; i++) put(g, tree(1.4), pick([-1, 1]) * (5 + rnd() * 3), 0, -3 - rnd() * 5)
    put(g, stall('#EF4444', '#FFFFFF'), 5.2, 0, 0.4, -0.7)
    townBackdrop(b, g, -10)
    const tower = clockTower(b, 6, false)
    tower.name = 'clock-tower'
    put(g, tower, 0, 0, -15)
    // Bandstand
    const band = new THREE.Group()
    put(band, cyl(1.2, 1.3, 0.3, '#F8FAFC', 8), 0, 0.15, 0)
    for (let i = 0; i < 6; i++) put(band, cyl(0.04, 0.04, 1.8, '#F8FAFC', 6), Math.cos((i / 6) * Math.PI * 2) * 1.05, 1.2, Math.sin((i / 6) * Math.PI * 2) * 1.05)
    put(band, mesh(new THREE.ConeGeometry(1.5, 0.8, 8), mat('#DC2626', 0.6, 0, true)), 0, 2.4, 0)
    put(g, band, -5.5, 0, -6)
    for (const x of [-2.4, 2.4]) put(g, lamp(b), x, 0, -0.4)
    b.lamps.push(new THREE.Vector3(-2.4, 2.2, -0.4), new THREE.Vector3(2.4, 2.2, -0.4))
    b.lightSpot.set(0, 0.6, -3.2)
    b.establish = { from: new THREE.Vector3(3.5, 4, 9), to: new THREE.Vector3(0, 0.8, -3) }
  },
  market(b, g) {
    b.ground = '#C9B79C'
    ground(g, '#C2B193', 60)
    const colors: [string, string][] = [['#EF4444', '#FFFFFF'], ['#22C55E', '#FEF9C3'], ['#3B82F6', '#FFFFFF'], ['#F59E0B', '#FFFFFF'], ['#EC4899', '#FDF2F8'], ['#0EA5E9', '#F0F9FF']]
    for (let i = 0; i < 6; i++) {
      const [a, c] = colors[i]
      put(g, stall(a, c), -5 + i * 2, 0, -3.2)
    }
    for (let i = 0; i < 4; i++) {
      put(g, stall(...colors[(i + 2) % 6]), -4 + i * 2.6, 0, -7.2)
      put(g, stall(...colors[i]), pick([-1, 1]) * (4.2 + rnd()), 0, -0.5 - i * 1.5, Math.PI / 2 * pick([-1, 1]))
    }
    for (let i = 0; i < 10; i++) put(g, crate(pick(['#B45309', '#92400E'])), (rnd() - 0.5) * 9, 0.16, -2.2 - rnd() * 1)
    // Pots and spice sacks
    for (let i = 0; i < 6; i++) put(g, mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(pick(['#C2410C', '#EAB308', '#B91C1C', '#16A34A']), 0.95, 0, true)), 3 + (i % 3) * 0.5, 0.18, -1.6 - Math.floor(i / 3) * 0.5)
    // Bunting
    const flags = new THREE.Group()
    for (let i = 0; i < 24; i++) {
      const f = mesh(new THREE.ConeGeometry(0.12, 0.25, 3), mat(pick(['#F43F5E', '#FACC15', '#22C55E', '#3B82F6', '#FB923C']), 0.7), false)
      f.rotation.x = Math.PI
      put(flags, f, -6 + i * 0.5, 3.1 - Math.sin((i / 23) * Math.PI) * 0.4, 0)
    }
    put(g, flags, 0, 0, -2.4)
    townBackdrop(b, g, -11)
    b.lightSpot.set(-1.6, 1.05, -2.9)
    b.establish = { from: new THREE.Vector3(-3, 3.6, 8), to: new THREE.Vector3(0, 1, -3) }
  },
  school(b, g) {
    b.ground = '#5FA052'
    ground(g, '#62A456', 60)
    const yard = mesh(new THREE.PlaneGeometry(12, 9), mat('#9CA3AF', 0.95), false, true)
    yard.rotation.x = -Math.PI / 2
    put(g, yard, 0, 0.01, -1)
    // Hopscotch / chalk squares
    const chalk = canvasTexture(512, 512, (c) => {
      c.clearRect(0, 0, 512, 512)
      c.strokeStyle = '#FFFFFF'
      c.lineWidth = 10
      for (let i = 0; i < 4; i++) c.strokeRect(60 + i * 100, 200, 90, 90)
      c.strokeStyle = '#FDE047'
      c.strokeRect(100, 330, 140, 140)
      c.strokeStyle = '#7DD3FC'
      c.strokeRect(290, 330, 140, 140)
    })
    const chalkM = mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ map: chalk, transparent: true, roughness: 1 }), false, true)
    chalkM.rotation.x = -Math.PI / 2
    put(g, chalkM, 1.2, 0.02, 0.4)
    const sch = house(b, 9, 3.2, 3, '#FCA5A5', '#1E3A8A')
    put(g, sch, 0, 0, -7)
    const sign = mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('LANTERN HILL SCHOOL', '#1E3A8A', '#FDE047') }), false, false)
    put(g, sign, 0, 3.0, -5.48)
    // Slide
    const slide = new THREE.Group()
    put(slide, box(0.9, 0.06, 2.4, '#F97316', 0.4), 0, 0.85, 0).rotation.x = 0.6
    put(slide, box(0.9, 1.6, 0.9, '#3B82F6'), 0, 0.8, -1.4)
    for (const x of [-0.42, 0.42]) put(slide, box(0.05, 1.8, 0.05, '#FACC15'), x, 0.9, -1.85)
    put(g, slide, -3.4, 0, -1.2, 0.4)
    // Fence + gate
    for (let x = -10; x <= 10; x += 0.5) if (Math.abs(x) > 1) put(g, box(0.06, 1, 0.06, '#1E3A8A'), x, 0.5, 4)
    put(g, box(20, 0.06, 0.05, '#1E3A8A'), 0, 0.9, 4)
    for (let i = 0; i < 5; i++) put(g, tree(1.5), pick([-1, 1]) * (6 + rnd() * 4), 0, -3 - rnd() * 6)
    b.lightSpot.set(-3.3, 0.4, 0)
    b.establish = { from: new THREE.Vector3(2, 3.4, 8.5), to: new THREE.Vector3(0, 1, -3) }
  },
  library(b, g) {
    b.ground = '#B9A88E'
    ground(g, '#B3A389', 60)
    // Long staircase up to the door.
    for (let i = 0; i < 12; i++) {
      put(g, box(4.4, 0.2, 0.45, '#E7E5E4'), 0, 0.1 + i * 0.2, -2 - i * 0.45)
      const line = box(4.2, 0.012, 0.05, i % 2 ? '#FC6818' : '#FDE047')
      line.name = `step-line-${i}`
      put(g, line, 0, 0.205 + i * 0.2, -1.8 - i * 0.45)
    }
    const lib = new THREE.Group()
    put(lib, box(9, 4, 3, '#E7D3B0'), 0, 2, 0)
    put(lib, mesh(new THREE.CylinderGeometry(0.01, 5.2, 1.2, 4, 1), mat('#9A3412', 0.7, 0, true)), 0, 4.6, 0).rotation.y = Math.PI / 4
    for (let i = 0; i < 6; i++) put(lib, cyl(0.2, 0.24, 3.6, '#F5F5F4', 14), -3.2 + i * 1.28, 1.8, 1.7)
    put(lib, rbox(1.2, 2, 0.1, '#7C2D12', 0.04), 0, 1, 1.52)
    const sign = mesh(new THREE.PlaneGeometry(3, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('LIBRARY', '#7C2D12', '#FDE68A') }), false, false)
    put(lib, sign, 0, 3.6, 1.52)
    put(g, lib, 0, 2.4, -9.5)
    for (const x of [-2.8, 2.8]) put(g, lamp(b, 2.4), x, 0, -1.2)
    for (let i = 0; i < 4; i++) put(g, tree(1.4), pick([-1, 1]) * (5.5 + rnd() * 3), 0, -3 - rnd() * 5)
    // Reading table with open books (for "inside the library" scenes).
    table(g, 3.4, 0.4, 1.6, 0.9, 0.7, '#7C2D12')
    for (let i = 0; i < 3; i++) put(g, rbox(0.4, 0.04, 0.3, pick(['#F8FAFC', '#FEF3C7']), 0.01), 3 + i * 0.4, 0.77, 0.4, rnd() * 0.4)
    b.lamps.push(new THREE.Vector3(-2.8, 2.4, -1.2), new THREE.Vector3(2.8, 2.4, -1.2))
    b.lightSpot.set(1.2, 0.5, -2.5)
    b.establish = { from: new THREE.Vector3(-1.5, 2.4, 8), to: new THREE.Vector3(0, 2.4, -6) }
  },
  townhall(b, g) {
    b.ground = '#B9A88E'
    ground(g, '#B3A389', 60)
    for (let i = 0; i < 5; i++) put(g, box(8, 0.18, 0.4, '#E7E5E4'), 0, 0.09 + i * 0.18, -3 - i * 0.4)
    const hall = new THREE.Group()
    put(hall, box(10, 4.5, 3, '#F5E6C8'), 0, 2.25, 0)
    put(hall, mesh(new THREE.ConeGeometry(6, 1.4, 4), mat('#1E3A8A', 0.7, 0, true)), 0, 5.2, 0).rotation.y = Math.PI / 4
    for (let i = 0; i < 6; i++) put(hall, cyl(0.22, 0.26, 4, '#FFFFFF', 14), -3.6 + i * 1.44, 2, 1.7)
    put(g, hall, 0, 0.9, -7.6)
    // The long banner on the ground.
    const banner = canvasTexture(1024, 160, (c) => {
      c.fillStyle = '#FFF7ED'
      c.fillRect(0, 0, 1024, 160)
      c.strokeStyle = '#FC6818'
      c.lineWidth = 6
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * 122
        c.strokeRect(x, 50, 70, 70)
        c.beginPath()
        c.moveTo(x - 6, 52)
        c.lineTo(x + 35, 20)
        c.lineTo(x + 76, 52)
        c.stroke()
        c.strokeRect(x + 22, 72, 24, 24)
      }
    })
    const bm = mesh(new THREE.PlaneGeometry(6, 0.95), new THREE.MeshStandardMaterial({ map: banner, roughness: 0.9 }), false, true)
    bm.rotation.x = -Math.PI / 2
    bm.name = 'banner'
    put(g, bm, 0, 0.02, -1.6)
    townBackdrop(b, g, -13)
    b.lightSpot.set(2.6, 0.3, -1.6)
    b.establish = { from: new THREE.Vector3(0, 4, 8.5), to: new THREE.Vector3(0, 1, -3) }
  },
  harbour(b, g) {
    b.ground = '#3C6E91'
    const water = waterPlane(b, 80, 60, '#1F7AB8')
    put(g, water, 0, -0.45, -10)
    // Dock planks
    for (let i = 0; i < 24; i++) put(g, box(10, 0.1, 0.28, pick(['#A16207', '#92400E', '#B45309']), 0.9), 0, 0, 3 - i * 0.3)
    for (let i = 0; i < 6; i++) for (const x of [-4.8, 4.8]) put(g, cyl(0.12, 0.12, 1.4, '#78350F', 8), x, -0.4, 2.8 - i * 1.4)
    for (let i = 0; i < 4; i++) {
      const bt = boat(pick(['#EF4444', '#3B82F6', '#FACC15', '#22C55E', '#F97316']))
      bt.name = `boat-${i}`
      put(g, bt, -8 + i * 5.5, -0.35, -7 - rnd() * 3, rnd() * 0.6 - 0.3)
    }
    // Nets drying on poles
    for (const x of [-3.6, -2.2]) put(g, cyl(0.04, 0.04, 2, '#78350F', 6), x, 1, -3.6)
    const net = mesh(new THREE.PlaneGeometry(1.4, 1.1, 8, 8), new THREE.MeshStandardMaterial({ color: '#0F766E', wireframe: true }), false, false)
    put(g, net, -2.9, 1.3, -3.6)
    for (let i = 0; i < 5; i++) put(g, crate(), 3.2 + (i % 2) * 0.5, 0.21 + Math.floor(i / 2) * 0.32, -3.2 + (i % 3) * 0.2)
    // Slipway ramp
    const ramp = box(2.2, 0.15, 6, '#9CA3AF')
    ramp.rotation.x = -0.32
    put(g, ramp, 6.6, 0.4, -4.2)
    // Lighthouse in the distance
    const lh = new THREE.Group()
    put(lh, cyl(0.6, 0.9, 6, '#F8FAFC', 16), 0, 3, 0)
    for (let i = 0; i < 3; i++) put(lh, cyl(0.62 + i * 0.02, 0.66 + i * 0.02, 0.6, '#DC2626', 16), 0, 1 + i * 1.8, 0)
    const lampMat = new THREE.MeshStandardMaterial({ color: '#FFF1C1', emissive: '#FFC861', emissiveIntensity: 1 })
    b.glow.push(lampMat)
    put(lh, mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12), lampMat), 0, 6.3, 0)
    put(lh, mesh(new THREE.ConeGeometry(0.7, 0.6, 12), mat('#1F2937', 0.5)), 0, 6.9, 0)
    put(g, lh, 9, -0.4, -16)
    // Gulls
    const gulls = new THREE.Group()
    for (let i = 0; i < 5; i++) {
      const gull = new THREE.Group()
      for (const s of [-1, 1]) {
        const wing = mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({ color: '#F8FAFC', side: THREE.DoubleSide }), false, false)
        wing.position.x = s * 0.2
        wing.userData.side = s
        gull.add(wing)
      }
      gull.userData.phase = rnd() * 6
      gulls.add(gull)
    }
    put(g, gulls, 0, 4, -6)
    const prev = b.update
    b.update = (t, dt, calm) => {
      prev?.(t, dt, calm)
      gulls.children.forEach((gl, i) => {
        const ph = (gl.userData.phase as number) + t * 0.25
        gl.position.set(Math.cos(ph) * (4 + i), Math.sin(ph * 2) * 0.5, Math.sin(ph) * 3)
        gl.rotation.y = -ph
        gl.children.forEach((w) => (w.rotation.z = (w.userData.side as number) * Math.sin(t * 8 + i) * 0.5))
      })
      g.children.forEach((c) => {
        if (c.name.startsWith('boat-') && !calm) c.position.y = -0.35 + Math.sin(t * 1.2 + c.position.x) * 0.06
      })
    }
    b.lightSpot.set(6.4, 1.6, -5.5)
    b.establish = { from: new THREE.Vector3(-4, 3, 8), to: new THREE.Vector3(1, 0.8, -4) }
  },
  beach(b, g) {
    b.ground = '#E9D3A1'
    const sand = ground(g, '#EAD7A6', 60)
    sand.position.x = 3
    const water = waterPlane(b, 80, 40, '#2B8BC6')
    put(g, water, 0, -0.08, -24)
    // Fish market hut on the left with an icy floor patch.
    const hut = new THREE.Group()
    put(hut, box(5, 3, 0.2, '#BAE6FD'), 0, 1.5, -2.4)
    put(hut, box(0.2, 3, 4.8, '#BAE6FD'), -2.5, 1.5, 0)
    put(hut, box(5.4, 0.2, 5, '#0369A1'), 0, 3.1, 0)
    const floor = mesh(new THREE.PlaneGeometry(5, 4.8), mat('#E2E8F0', 0.6), false, true)
    floor.rotation.x = -Math.PI / 2
    put(hut, floor, 0, 0.02, 0)
    const ice = mesh(new THREE.CircleGeometry(1.4, 28), new THREE.MeshStandardMaterial({ color: '#E0F7FF', roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.9 }), false, true)
    ice.rotation.x = -Math.PI / 2
    put(hut, ice, 0.5, 0.03, 0.6)
    for (let i = 0; i < 4; i++) put(hut, rbox(0.8, 0.5, 0.5, '#F1F5F9', 0.04), -1.5 + i * 0.9, 0.25, -1.9)
    for (let i = 0; i < 6; i++) put(hut, mesh(new THREE.CapsuleGeometry(0.06, 0.25, 4, 8), mat('#94A3B8', 0.3, 0.6)), -1.6 + i * 0.5, 0.56, -1.9).rotation.z = Math.PI / 2
    put(g, hut, -4.2, 0, -0.5)
    const sign = mesh(new THREE.PlaneGeometry(2, 0.45), new THREE.MeshStandardMaterial({ map: signTexture('FISH MARKET', '#0369A1', '#F0F9FF') }), false, false)
    put(g, sign, -4.2, 2.6, -2.75)
    // Beach things
    for (let i = 0; i < 3; i++) {
      const um = new THREE.Group()
      put(um, cyl(0.03, 0.03, 2, '#F8FAFC', 6), 0, 1, 0)
      const top = mesh(new THREE.ConeGeometry(0.9, 0.4, 10), new THREE.MeshStandardMaterial({ map: stripes(pick(['#F43F5E', '#3B82F6', '#FACC15']), '#FFFFFF', 10), roughness: 0.8 }))
      put(um, top, 0, 2.1, 0)
      put(g, um, 4 + i * 2.6, 0, -4 - i * 1.2)
    }
    for (let i = 0; i < 12; i++) put(g, mesh(new THREE.IcosahedronGeometry(0.12 + rnd() * 0.2, 0), mat('#A8A29E', 0.9, 0, true)), 3 + rnd() * 8, 0.05, -8 + rnd() * 4)
    b.lightSpot.set(-3.4, 0.35, 0.1)
    b.establish = { from: new THREE.Vector3(2, 3, 8), to: new THREE.Vector3(-1, 0.8, -2) }
  },
  bridge(b, g) {
    b.ground = '#8E8579'
    ground(g, '#8E8579', 60).position.z = 18
    const water = waterPlane(b, 80, 14, '#1F7AB8')
    put(g, water, 0, -0.6, -6)
    put(g, box(80, 0.6, 1, '#78716C'), 0, -0.3, -12.5)
    put(g, box(80, 0.6, 1, '#78716C'), 0, -0.3, 0.5)
    // Road + stop line on our side
    put(g, box(4, 0.04, 30, '#57534E'), 0, 0.02, 15)
    put(g, box(4, 0.05, 0.15, '#F8FAFC'), 0, 0.04, 0.6)
    // Two bascule leaves that lift.
    const leaves: THREE.Group[] = []
    for (const side of [1, -1]) {
      const pivot = new THREE.Group()
      const leaf = box(4, 0.25, 6, '#B91C1C')
      leaf.position.z = -side * 3
      pivot.add(leaf)
      for (let i = 0; i < 5; i++) put(pivot, box(0.06, 0.5, 0.06, '#F8FAFC'), -1.9, 0.3, -side * (0.6 + i * 1.2))
      put(g, pivot, 0, 0, side === 1 ? 0 : -12)
      leaves.push(pivot)
      put(g, box(1, 3.2, 1, '#57534E'), 2.6, 1.6, side === 1 ? 0 : -12)
      put(g, box(1, 3.2, 1, '#57534E'), -2.6, 1.6, side === 1 ? 0 : -12)
    }
    // Traffic light
    const tl = new THREE.Group()
    put(tl, cyl(0.05, 0.05, 2.4, '#1F2937', 6), 0, 1.2, 0)
    put(tl, rbox(0.3, 0.7, 0.2, '#111827', 0.04), 0, 2.5, 0)
    const red = new THREE.MeshStandardMaterial({ color: '#EF4444', emissive: '#EF4444', emissiveIntensity: 2 })
    const green = new THREE.MeshStandardMaterial({ color: '#22C55E', emissive: '#22C55E', emissiveIntensity: 0.1 })
    put(tl, mesh(new THREE.SphereGeometry(0.09, 10, 8), red), 0, 2.68, 0.1)
    put(tl, mesh(new THREE.SphereGeometry(0.09, 10, 8), green), 0, 2.38, 0.1)
    put(g, tl, 2.2, 0, 1.4)
    const ship = boat('#1E3A8A')
    ship.scale.setScalar(2.2)
    ship.name = 'ship'
    put(g, ship, -30, -0.5, -6.2)
    townBackdrop(b, g, -18)
    let lift = 0
    b.hooks.lift = (v: number) => {
      lift = v
      red.emissiveIntensity = v > 0.05 ? 2 : 0.1
      green.emissiveIntensity = v > 0.05 ? 0.1 : 2
    }
    b.hooks.ship = (v: number) => {
      ship.position.x = -30 + v * 60
    }
    const prev = b.update
    b.update = (t, dt, calm) => {
      prev?.(t, dt, calm)
      leaves[0].rotation.x = -lift * 1.15
      leaves[1].rotation.x = lift * 1.15
    }
    b.lightSpot.set(0, 0.6, -14)
    b.establish = { from: new THREE.Vector3(5, 4, 9), to: new THREE.Vector3(0, 1, -5) }
  },
  lighthouse(b, g) {
    b.ground = '#A8A29E'
    ground(g, '#9CA38F', 60)
    const water = waterPlane(b, 80, 30, '#1F7AB8')
    put(g, water, 0, -0.5, -22)
    for (let i = 0; i < 18; i++) put(g, mesh(new THREE.IcosahedronGeometry(0.4 + rnd() * 0.8, 0), mat('#78716C', 0.9, 0, true)), (rnd() - 0.5) * 16, 0, -7 - rnd() * 4)
    const lh = new THREE.Group()
    put(lh, cyl(1.2, 1.7, 9, '#F8FAFC', 20), 0, 4.5, 0)
    for (let i = 0; i < 4; i++) put(lh, cyl(1.22 + i * 0.05, 1.3 + i * 0.05, 0.8, '#DC2626', 20), 0, 1.2 + i * 2.1, 0)
    const lampMat = new THREE.MeshStandardMaterial({ color: '#FFF1C1', emissive: '#FFC861', emissiveIntensity: 1.4 })
    b.glow.push(lampMat)
    put(lh, mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 14), lampMat), 0, 9.6, 0)
    put(lh, mesh(new THREE.ConeGeometry(1.2, 1, 14), mat('#1F2937', 0.5)), 0, 10.7, 0)
    put(lh, rbox(0.9, 1.6, 0.2, '#7C2D12', 0.04), 0, 0.8, 1.62)
    const beam = mesh(new THREE.ConeGeometry(1.4, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#FFF1C1', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), false, false)
    beam.rotation.z = Math.PI / 2
    beam.position.x = 7
    const beamPivot = new THREE.Group()
    beamPivot.add(beam)
    put(lh, beamPivot, 0, 9.6, 0)
    put(g, lh, 0, 0, -5)
    // Platform at the top of the ramp
    put(g, box(7, 0.2, 4, '#9CA3AF'), 0, -0.05, 0.6)
    for (let x = -3.4; x <= 3.4; x += 0.6) put(g, box(0.05, 0.8, 0.05, '#1F2937'), x, 0.4, 2.55)
    put(g, box(7, 0.05, 0.05, '#1F2937'), 0, 0.78, 2.55)
    const prev = b.update
    b.update = (t, dt, calm) => {
      prev?.(t, dt, calm)
      beamPivot.rotation.y = calm ? 0.6 : t * 0.5
    }
    b.lightSpot.set(1.8, 0.4, -1.5)
    b.establish = { from: new THREE.Vector3(3, 2, 9), to: new THREE.Vector3(0, 4, -5) }
  },
  tunnel(b, g) {
    b.ground = '#5B6B4E'
    ground(g, '#5D7A4C', 60)
    const hill = mesh(new THREE.IcosahedronGeometry(9, 2), mat('#4D7A43', 0.95, 0, true))
    hill.scale.set(1.6, 0.75, 0.8)
    put(g, hill, 0, 0, -10)
    const arch = mesh(new THREE.TorusGeometry(1.8, 0.35, 8, 20, Math.PI), mat('#78716C', 0.9, 0, true))
    put(g, arch, 0, 0, -3.2)
    const inside = mesh(new THREE.CylinderGeometry(1.8, 1.8, 14, 20, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#1C1917', roughness: 1, side: THREE.BackSide }))
    inside.rotation.x = Math.PI / 2
    put(g, inside, 0, 0, -10.2)
    const dark = mesh(new THREE.CircleGeometry(1.8, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#050505' }), false, false)
    put(g, dark, 0, 0, -16)
    // Rails
    for (const x of [-0.6, 0.6]) put(g, box(0.06, 0.06, 20, '#57534E'), x, 0.04, -6)
    for (let i = 0; i < 26; i++) put(g, box(1.6, 0.05, 0.18, '#78350F'), 0, 0.02, 3 - i * 0.7)
    for (let i = 0; i < 6; i++) put(g, tree(1.6), pick([-1, 1]) * (4 + rnd() * 5), 0, -1 - rnd() * 3)
    b.lightSpot.set(0.4, 0.4, -8)
    b.establish = { from: new THREE.Vector3(2.5, 2.2, 8), to: new THREE.Vector3(0, 1, -4) }
  },
  house(b, g) {
    b.interior = true
    room(b, g, 9, 7, 3, '#FBE3D0', '#9A6B4F', { fogWindow: true })
    // Kitchen on the right, living room on the left.
    put(g, rbox(2.6, 0.9, 0.7, '#F5F5F4', 0.03), 2.8, 0.45, -3.4)
    put(g, rbox(2.7, 0.06, 0.75, '#475569', 0.02), 2.8, 0.92, -3.4)
    put(g, cyl(0.25, 0.2, 0.25, '#B91C1C', 16), 2.3, 1.08, -3.4)
    table(g, 2.4, -1.2, 1.6, 1, 0.75, '#A16207')
    put(g, rbox(0.6, 0.25, 0.35, '#DC2626', 0.04), 2.4, 0.92, -1.2)
    // Armchair
    const chair = new THREE.Group()
    put(chair, rbox(1.1, 0.45, 0.9, '#9F1239', 0.12), 0, 0.3, 0)
    put(chair, rbox(1.1, 0.9, 0.25, '#9F1239', 0.12), 0, 0.7, -0.35)
    for (const x of [-0.5, 0.5]) put(chair, rbox(0.2, 0.65, 0.9, '#881337', 0.08), x, 0.45, 0)
    put(g, chair, -2.8, 0, -2.2, 0.4)
    put(g, rbox(2.4, 0.03, 1.6, '#0E7490', 0.01, 0.95), -2.2, 0.01, -0.6)
    // Standard lamp
    put(g, cyl(0.03, 0.03, 1.6, '#1F2937', 6), -3.9, 0.8, -3)
    const shade = new THREE.MeshStandardMaterial({ color: '#FDE68A', emissive: '#FBBF24', emissiveIntensity: 1.2 })
    put(g, mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.35, 14, 1, true), shade), -3.9, 1.7, -3)
    // Picture frames
    for (let i = 0; i < 3; i++) put(g, rbox(0.5, 0.4, 0.04, pick(['#FDBA74', '#93C5FD', '#86EFAC']), 0.02), -0.6 + i * 0.7, 2, -3.97)
    b.lamps.push(new THREE.Vector3(-3.9, 1.7, -3))
    b.lightSpot.set(-1.8, 0.3, 0.6)
    b.establish = { from: new THREE.Vector3(-2, 2.1, 5), to: new THREE.Vector3(0, 1, -1.5) }
  },
  maze(b, g) {
    b.ground = '#4E8A44'
    ground(g, '#548E48', 60)
    // An open front, hedge corridors behind.
    for (const x of [-3.9, 3.9]) put(g, hedge(0.9, 2, 7), x, 1, -2.5)
    put(g, hedge(5.4, 2, 0.9), -0.9, 1, -6)
    for (let i = 0; i < 10; i++) {
      const horiz = rnd() > 0.5
      put(g, hedge(horiz ? 3 + rnd() * 3 : 0.9, 2, horiz ? 0.9 : 3 + rnd() * 3), pick([-1, 1]) * (5.5 + rnd() * 6), 1, -7 - rnd() * 6)
    }
    put(g, hedge(14, 2, 0.9), 0, 1, -12)
    for (let i = 0; i < 5; i++) put(g, tree(1.8, '#2F6B35'), pick([-1, 1]) * (8 + rnd() * 6), 0, -6 - rnd() * 8)
    b.lightSpot.set(-1.4, 0.4, -4.8)
    b.establish = { from: new THREE.Vector3(0, 3.6, 7), to: new THREE.Vector3(0, 0.6, -4) }
  },
  tower(b, g) {
    b.interior = true
    const R = 5
    const wall = mesh(new THREE.CylinderGeometry(R, R, 12, 28, 1, true, Math.PI * 0.15, Math.PI * 1.7), new THREE.MeshStandardMaterial({ color: '#D6C3A0', roughness: 0.95, side: THREE.BackSide }), false, true)
    put(g, wall, 0, 6, -1.5)
    const fl = mesh(new THREE.CircleGeometry(R, 28), mat('#8B6B4A', 0.9), false, true)
    fl.rotation.x = -Math.PI / 2
    put(g, fl, 0, 0, -1.5)
    // Spiral ramp
    for (let i = 0; i < 40; i++) {
      const a = Math.PI * 0.4 + i * 0.28
      const step = box(1.4, 0.12, 0.8, '#A16207')
      put(g, step, Math.cos(a) * (R - 0.8), 0.3 + i * 0.28, -1.5 + Math.sin(a) * (R - 0.8), -a)
    }
    // Gears that turn
    const gears: THREE.Mesh[] = []
    const gm = mat('#B8860B', 0.35, 0.8)
    for (let i = 0; i < 5; i++) {
      const r = 0.6 + rnd() * 0.9
      const gear = mesh(gearGeometry(r, 12 + i * 2, 0.15), gm)
      gear.userData.speed = (i % 2 ? 1 : -1) * (0.3 / r)
      put(g, gear, -3 + i * 1.5, 2.2 + (i % 3) * 1.4, -5.2 + (i % 2) * 0.3)
      gears.push(gear)
    }
    // The great clock face (seen from inside) with twelve holders.
    const face = mesh(new THREE.CircleGeometry(1.7, 40), new THREE.MeshStandardMaterial({ color: '#FFF7E6', emissive: '#FFE7B0', emissiveIntensity: 0.5, transparent: true, opacity: 0.92 }), false, false)
    put(g, face, 0, 4.2, -5.9)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const holder = mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 14), mat('#57534E', 0.5, 0.5))
      holder.name = `holder-${i}`
      put(g, holder, Math.sin(a) * 1.35, 4.2 + Math.cos(a) * 1.35, -5.85)
    }
    b.lamps.push(new THREE.Vector3(0, 3.5, -4.5), new THREE.Vector3(2, 2, 0))
    const prev = b.update
    b.update = (t, dt, calm) => {
      prev?.(t, dt, calm)
      for (const gear of gears) gear.rotation.z += (gear.userData.speed as number) * dt * (calm ? 0.3 : 1)
    }
    b.lightSpot.set(0, 4.2, -5.6)
    b.establish = { from: new THREE.Vector3(0.5, 1.6, 5.5), to: new THREE.Vector3(0, 3, -4) }
  },
}

export function buildSet(id: SetId): SetBuild {
  seed = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483646, 7) + 1
  resetCache()
  const g = new THREE.Group()
  g.name = `set:${id}`
  const b: SetBuild = {
    id,
    group: g,
    interior: false,
    lightSpot: new THREE.Vector3(1.4, 0.4, 0.6),
    establish: { from: new THREE.Vector3(0, 2.5, 7), to: new THREE.Vector3(0, 1, -2) },
    lamps: [],
    glow: [],
    ground: '#6B8F5A',
    hooks: {},
  }
  BUILDERS[id](b, g)
  const st = stars()
  st.visible = false
  g.add(st)
  return b
}
