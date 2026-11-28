// components/kids/sim/renderer.ts
// three.js view of the physics sim. It never moves anything itself: every
// frame it draws the sim's last two fixed-step snapshots, interpolated, so a
// 60 Hz physics step looks smooth at any display rate. The robot is the
// child's own robot from lib/kids/robot3d.ts buildRobot, its wheels turning at
// the motor's real wheel speed (so you SEE them spin in sand while the robot
// stays put).

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { RobotDesign } from '@/lib/kids/robot-design'
import { animateRobot, buildRobot, disposeObject, getRobotHandles } from '@/lib/kids/robot3d'
import type { Arena, FloorColor, Shape2D, Surface } from '@/lib/kids/sim/arena'
import { headingToYaw, type SensorReadings, type SimSnapshot } from '@/lib/kids/sim/engine'
import { MODEL_SCALE } from '@/lib/kids/sim/robot-spec'
import { createStage, prefersReducedMotion, type Stage } from '@/components/kids/three/stage'
import { capabilitiesOf } from '@/lib/kids/robot-design'
import { SensorView } from './sensor-view'

export type CameraMode = 'follow' | 'orbit' | 'top'

const COLOR_HEX: Record<FloorColor, string> = {
  white: '#F1F5F9',
  black: '#0F172A',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#3B82F6',
  yellow: '#FACC15',
}
const SURFACE_BASE: Record<Surface, string> = { tile: '#E2E8F0', carpet: '#B4536B', sand: '#E9C98B', 'soft-sand': '#F2D9A6', ice: '#BAE6FD', rocks: '#9CA3AF' }
const PX_PER_M = 320

function drawShape(ctx: CanvasRenderingContext2D, s: Shape2D, toPx: (x: number, z: number) => [number, number]): void {
  ctx.beginPath()
  if (s.kind === 'circle') {
    const [px, py] = toPx(s.center[0], s.center[1])
    ctx.arc(px, py, s.radius * PX_PER_M, 0, Math.PI * 2)
  } else {
    // toPx mirrors x (canvas x grows toward -x), so the rect's canvas top-left is the shape's (+x, +z) corner.
    const [px, py] = toPx(s.center[0] + s.size[0] / 2, s.center[1] + s.size[1] / 2)
    ctx.rect(px, py, s.size[0] * PX_PER_M, s.size[1] * PX_PER_M)
  }
}

/** Paint the floor (surfaces, colour zones, tape lines) into a canvas texture. */
function floorTexture(arena: Arena): THREE.CanvasTexture {
  const [w, d] = arena.size
  const cw = Math.min(2048, Math.round(w * PX_PER_M))
  const ch = Math.min(2048, Math.round(d * PX_PER_M))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)
  const sx = cw / (w * PX_PER_M)
  ctx.scale(sx, ch / (d * PX_PER_M))
  // Canvas x runs toward -x and canvas y toward -z, so labels read upright from the start camera.
  const toPx = (x: number, z: number): [number, number] => [(arena.center[0] + w / 2 - x) * PX_PER_M, (arena.center[1] + d / 2 - z) * PX_PER_M]
  const paintSurface = (s: Surface) => {
    ctx.fillStyle = SURFACE_BASE[s]
    ctx.fill()
    ctx.save()
    ctx.clip()
    // Deterministic texture detail (no Math.random: the same arena always looks the same).
    let seed = 7
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    if (s === 'tile') {
      ctx.strokeStyle = 'rgba(100,116,139,0.35)'
      ctx.lineWidth = 2
      for (let i = 0; i <= w / 0.3; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 0.3 * PX_PER_M, 0)
        ctx.lineTo(i * 0.3 * PX_PER_M, d * PX_PER_M)
        ctx.stroke()
      }
      for (let i = 0; i <= d / 0.3; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * 0.3 * PX_PER_M)
        ctx.lineTo(w * PX_PER_M, i * 0.3 * PX_PER_M)
        ctx.stroke()
      }
    } else {
      const n = s === 'ice' ? 60 : 2600
      for (let i = 0; i < n; i++) {
        const x = rnd() * w * PX_PER_M
        const y = rnd() * d * PX_PER_M
        if (s === 'sand' || s === 'soft-sand') {
          ctx.fillStyle = rnd() > 0.5 ? 'rgba(180,140,80,0.5)' : 'rgba(255,240,200,0.5)'
          ctx.fillRect(x, y, 3, 3)
        } else if (s === 'carpet') {
          ctx.fillStyle = rnd() > 0.5 ? 'rgba(120,40,60,0.35)' : 'rgba(230,140,160,0.25)'
          ctx.fillRect(x, y, 2, 4)
        } else if (s === 'rocks') {
          ctx.fillStyle = rnd() > 0.5 ? 'rgba(75,85,99,0.7)' : 'rgba(209,213,219,0.6)'
          ctx.beginPath()
          ctx.arc(x, y, 3 + rnd() * 6, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + 30 * rnd(), y + 12 * rnd())
          ctx.stroke()
        }
      }
    }
    ctx.restore()
  }
  ctx.beginPath()
  ctx.rect(0, 0, w * PX_PER_M, d * PX_PER_M)
  paintSurface(arena.floor)
  for (const r of arena.regions) {
    if (r.surface) {
      drawShape(ctx, r.shape, toPx)
      paintSurface(r.surface)
    }
  }
  for (const r of arena.regions) {
    if (!r.color) continue
    drawShape(ctx, r.shape, toPx)
    ctx.fillStyle = COLOR_HEX[r.color]
    ctx.globalAlpha = 0.85
    ctx.fill()
    ctx.globalAlpha = 1
  }
  for (const r of arena.regions) {
    if (!r.dark) continue
    drawShape(ctx, r.shape, toPx)
    ctx.fillStyle = 'rgba(2,6,23,0.82)'
    ctx.fill()
  }
  ctx.strokeStyle = COLOR_HEX.black
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const l of arena.lines) {
    ctx.lineWidth = l.width * PX_PER_M
    ctx.beginPath()
    l.points.forEach((p, i) => {
      const [x, y] = toPx(p[0], p[1])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
  // Level 1 tile grid, drawn over the floor so a child can count squares.
  if (arena.grid) {
    const { cols, rows, tile } = arena.grid
    ctx.strokeStyle = 'rgba(15,23,42,0.28)'
    ctx.lineWidth = 3
    for (let c = 0; c <= cols; c++) {
      const x = (c - cols / 2) * tile
      const [ax, ay] = toPx(-x, (rows / 2) * tile)
      const [bx, by] = toPx(-x, (-rows / 2) * tile)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      const z = (rows / 2 - r) * tile
      const [ax, ay] = toPx((cols / 2) * tile, z)
      const [bx, by] = toPx((-cols / 2) * tile, z)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
  }
  // Dotted guides for drawing tasks.
  ctx.setLineDash([0.025 * PX_PER_M, 0.025 * PX_PER_M])
  ctx.strokeStyle = 'rgba(234,88,12,0.75)'
  ctx.lineWidth = 0.012 * PX_PER_M
  for (const gd of arena.guides ?? []) {
    ctx.beginPath()
    gd.points.forEach((p, i) => {
      const [x, y] = toPx(p[0], p[1])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
  ctx.setLineDash([])
  // Region labels.
  // Small enough that a label fits inside a Level 1 tile (35 cm).
  ctx.font = `800 ${(arena.grid ? 0.042 : 0.07) * PX_PER_M}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const r of arena.regions) {
    if (!r.label) continue
    const [x, y] = toPx(r.shape.center[0], r.shape.center[1])
    ctx.fillStyle = r.surface === 'sand' ? 'rgba(120,80,20,0.55)' : 'rgba(15,23,42,0.55)'
    ctx.fillText(r.label.toUpperCase(), x, y)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function shapeMesh(s: Shape2D, mat: THREE.Material): THREE.Mesh {
  const geo = s.kind === 'circle' ? new THREE.RingGeometry(s.radius - 0.02, s.radius, 64) : new THREE.PlaneGeometry(s.size[0], s.size[1])
  const m = new THREE.Mesh(geo, mat)
  m.rotation.x = -Math.PI / 2
  m.position.set(s.center[0], 0.003, s.center[1])
  return m
}

/** A simple, readable model for a named thing in the world, built from the floor up. */
function propMesh(kind: string, size: [number, number], height: number, color = '#F59E0B', round = false): THREE.Object3D {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
  const add = (m: THREE.Mesh, y: number) => {
    m.position.y = y
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
  }
  const [w, d] = size
  if (kind === 'person') {
    const r = Math.min(w, d) / 2
    add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, height * 0.72, 20), mat), height * 0.36)
    add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 20, 14), new THREE.MeshStandardMaterial({ color: '#FDE7C7', roughness: 0.6 })), height * 0.72 + r * 0.6)
    return g
  }
  if (kind === 'dog') {
    const r = Math.min(w, d) / 2
    add(new THREE.Mesh(new RoundedBoxGeometry(r * 2, height * 0.55, r * 2.4, 2, r * 0.3), mat), height * 0.4)
    add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 16, 12), mat), height * 0.85)
    return g
  }
  if (kind === 'flowers') {
    const r = Math.min(w, d) / 2
    add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, height * 0.6, 20), new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.7 })), height * 0.3)
    add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 16, 12), mat), height * 0.75)
    return g
  }
  if (kind === 'fountain') {
    const r = Math.min(w, d) / 2
    add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, height * 0.5, 28), new THREE.MeshStandardMaterial({ color: '#94A3B8', roughness: 0.5 })), height * 0.25)
    add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.01, 28), mat), height * 0.5 + 0.006)
    add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, height * 0.5, 12), new THREE.MeshStandardMaterial({ color: '#CBD5E1' })), height * 0.75)
    return g
  }
  if (kind === 'barrier') {
    add(new THREE.Mesh(new THREE.BoxGeometry(w, height * 0.25, d), new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.5 })), height * 0.85)
    add(new THREE.Mesh(new THREE.BoxGeometry(w, height * 0.25, d * 1.01), mat), height * 0.6)
    return g
  }
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, height, 28) : new RoundedBoxGeometry(w, height, d, 2, Math.min(0.02, w / 6, d / 6))
  add(new THREE.Mesh(geo, mat), height / 2)
  return g
}

export interface FramePoses {
  prev: SimSnapshot
  cur: SimSnapshot
  alpha: number
  sensors: SensorReadings | null
  trail: number[]
  /** Flight Recorder ghost (roadmap #38): the best run's pose at this moment, or null to hide it. */
  ghost?: { p: { x: number; y: number; z: number }; q: { x: number; y: number; z: number; w: number } } | null
}

export class SimRenderer {
  private stage: Stage
  private arenaGroup = new THREE.Group()
  private robotRoot = new THREE.Group()
  private robotModel: THREE.Group | null = null
  /** See-through copy of the robot that replays the best run (roadmap #38). */
  private ghostModel: THREE.Group | null = null
  private bodies = new Map<string, THREE.Object3D>()
  private trailMesh: THREE.Mesh
  private trailGeo: THREE.BufferGeometry
  private trailAttr: THREE.BufferAttribute
  /** Trail points already turned into ribbon segments, and ribbon vertices written so far. */
  private trailDone = 0
  private trailVerts = 0
  private trailOf: number[] | null = null
  private beam: THREE.Mesh
  private beamDot: THREE.Mesh
  private goalRing: THREE.Mesh | null = null
  private controls: OrbitControls
  private mode: CameraMode = 'follow'
  private camPos = new THREE.Vector3()
  private camTarget = new THREE.Vector3()
  private firstFrame = true
  private reduced = prefersReducedMotion()
  private frameFn: ((dt: number) => FramePoses | null) | null = null
  private arena: Arena | null = null
  private elapsed = 0
  // Scratch objects reused every frame (no per-frame garbage for the phone's GC).
  private qa = new THREE.Quaternion()
  private qb = new THREE.Quaternion()
  private v1 = new THREE.Vector3()
  private v2 = new THREE.Vector3()
  private v3 = new THREE.Vector3()
  private wantPos = new THREE.Vector3()
  private wantTarget = new THREE.Vector3()
  private static readonly DOWN = new THREE.Vector3(0, -1, 0)
  private prevBodies: SimSnapshot['bodies'] | null = null
  private prevBodyIndex = new Map<string, SimSnapshot['bodies'][number]>()
  // Render on demand: the loop runs only while something moves and the view is on screen.
  private live = false
  private awakeUntil = 0
  private onScreen = true
  private io: IntersectionObserver | null = null
  /** Robot's-eye picture-in-picture (roadmap #37). */
  private sensorView: SensorView
  /** Draw the distance beam only for a robot that has a distance sensor (the page may pass sensors for any robot). */
  private seesWalls = false

  constructor(container: HTMLElement) {
    this.stage = createStage(container, { background: '#0A1120', shadows: true, fov: 45 })
    this.stage.scene.fog = new THREE.Fog('#0A1120', 6, 14)
    this.stage.scene.add(this.arenaGroup, this.robotRoot)
    this.controls = new OrbitControls(this.stage.camera, this.stage.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 0.4
    this.controls.maxDistance = 6
    this.controls.enabled = false

    this.trailGeo = new THREE.BufferGeometry()
    this.trailAttr = new THREE.BufferAttribute(new Float32Array(18 * 512), 3)
    this.trailAttr.setUsage(THREE.DynamicDrawUsage)
    this.trailGeo.setAttribute('position', this.trailAttr)
    this.trailGeo.setDrawRange(0, 0)
    this.trailMesh = new THREE.Mesh(this.trailGeo, new THREE.MeshBasicMaterial({ color: '#EA580C', side: THREE.DoubleSide }))
    this.trailMesh.frustumCulled = false
    this.stage.scene.add(this.trailMesh)

    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#34D399', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    )
    this.beam.visible = false
    this.beamDot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: '#34D399' }))
    this.beamDot.visible = false
    this.stage.scene.add(this.beam, this.beamDot)
    this.sensorView = new SensorView(
      container,
      this.stage,
      this.robotRoot,
      () => (this.robotModel ? [this.robotModel, this.beam, this.beamDot] : [this.beam, this.beamDot]),
      () => this.wake(),
      this.reduced,
    )

    this.stage.onFrame((t, dt) => {
      this.elapsed = t
      const poses = this.frameFn?.(dt) ?? null
      if (poses) this.draw(poses, dt)
      this.controls.update()
      // Nothing moving and no camera settling: stop drawing until something changes.
      if (!this.live && performance.now() > this.awakeUntil) this.stage.setActive(false)
    })
    // Orbiting by hand keeps the view awake (and through the damping afterwards).
    this.controls.addEventListener('change', () => this.wake(0.6))
    this.controls.addEventListener('start', () => this.wake(0.6))
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        this.onScreen = entries.some((e) => e.isIntersecting)
        this.updateActive()
      })
      this.io.observe(container)
    }
    this.wake()
  }

  private updateActive(): void {
    this.stage.setActive(this.onScreen && (this.live || performance.now() <= this.awakeUntil))
  }

  /** The sim is running (draw every frame) or not (draw only when woken). */
  setLive(live: boolean): void {
    this.live = live
    if (!live) this.awakeUntil = Math.max(this.awakeUntil, performance.now() + 1500) // let the camera settle
    this.updateActive()
  }

  /** Something changed while idle (a reset, a new part, a camera change): draw for a moment. */
  wake(seconds = 1.5): void {
    this.awakeUntil = Math.max(this.awakeUntil, performance.now() + seconds * 1000)
    this.updateActive()
  }

  /** Called every animation frame; return the poses to draw (and advance the sim there). */
  onFrame(fn: (dt: number) => FramePoses | null): void {
    this.frameFn = fn
  }

  get canvas(): HTMLCanvasElement {
    return this.stage.renderer.domElement
  }

  setCameraMode(mode: CameraMode): void {
    this.mode = mode
    this.controls.enabled = mode === 'orbit'
    this.firstFrame = true
    this.wake()
  }

  setArena(arena: Arena): void {
    this.arena = arena
    disposeObject(this.arenaGroup)
    this.arenaGroup.clear()
    this.bodies.clear()
    this.goalRing = null
    const [w, d] = arena.size
    const [cx, cz] = arena.center

    // Surroundings: a big soft ground so the arena does not float in space.
    const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: '#111C32', roughness: 1 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.set(cx, -0.002, cz)
    ground.receiveShadow = true
    this.arenaGroup.add(ground)

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(arena), roughness: 0.85, metalness: 0 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat)
    // The texture is painted to read the right way up from behind the start (looking along +z),
    // so the plane is turned half a turn about its own normal.
    floor.rotation.set(-Math.PI / 2, 0, Math.PI)
    floor.position.set(cx, 0, cz)
    floor.receiveShadow = true
    this.arenaGroup.add(floor)

    // Ice gets a glossy overlay.
    for (const r of arena.regions) {
      if (r.surface !== 'ice') continue
      const m = shapeMesh(r.shape, new THREE.MeshPhysicalMaterial({ color: '#E0F2FE', transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1 }))
      if (r.shape.kind === 'circle') {
        m.geometry.dispose()
        m.geometry = new THREE.CircleGeometry(r.shape.radius, 48)
      }
      this.arenaGroup.add(m)
    }

    const deckTopMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.8 })
    const sideMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.7 })

    // Walls (boundary + authored).
    const wallMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 })
    const capMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.4 })
    const wall = (a: [number, number], b: [number, number], h: number, t: number) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const g = new THREE.Group()
      const m = new THREE.Mesh(new RoundedBoxGeometry(t, h, len + t, 2, Math.min(0.015, t / 3)), wallMat)
      m.position.y = h / 2
      m.castShadow = true
      m.receiveShadow = true
      const cap = new THREE.Mesh(new THREE.BoxGeometry(t + 0.006, 0.02, len + t + 0.006), capMat)
      cap.position.y = h
      g.add(m, cap)
      g.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2)
      g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1])
      this.arenaGroup.add(g)
    }
    const T = 0.06
    const H = 0.12 // boundary walls are drawn low so the camera can see in; physics uses 40 cm
    const x0 = cx - w / 2
    const x1 = cx + w / 2
    const z0 = cz - d / 2
    const z1 = cz + d / 2
    wall([x0 - T / 2, z0], [x0 - T / 2, z1], H, T)
    wall([x1 + T / 2, z0], [x1 + T / 2, z1], H, T)
    wall([x0, z0 - T / 2], [x1, z0 - T / 2], H, T)
    wall([x0, z1 + T / 2], [x1, z1 + T / 2], H, T)
    for (const wl of arena.walls) wall(wl.from, wl.to, wl.height ?? 0.4, wl.thickness ?? 0.05)

    // Ramps.
    for (const r of arena.ramps) {
      const hw = r.size[0] / 2
      const hl = r.size[1] / 2
      const geo = new THREE.BufferGeometry()
      const P = [
        [-hw, 0, -hl], [hw, 0, -hl], [-hw, 0, hl], [hw, 0, hl], [-hw, r.height, hl], [hw, r.height, hl],
      ]
      const tri = [0, 2, 1, 1, 2, 3, 0, 1, 4, 1, 5, 4, 2, 4, 3, 3, 4, 5, 0, 4, 2, 1, 3, 5]
      const pos: number[] = []
      for (const i of tri) pos.push(...P[i])
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      geo.computeVertexNormals()
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.7, side: THREE.DoubleSide }))
      m.position.set(r.center[0], r.base ?? 0, r.center[1])
      m.rotation.y = headingToYaw(r.riseHeadingDeg)
      m.castShadow = true
      m.receiveShadow = true
      this.arenaGroup.add(m)
    }

    // Decks: raised floors (platforms, landings), sides a little darker than the top.
    for (const dk of arena.decks ?? []) {
      const base = dk.base ?? 0
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(dk.size[0], dk.height - base, dk.size[1]),
        [sideMat, sideMat, deckTopMat, sideMat, sideMat, sideMat],
      )
      m.position.set(dk.center[0], (dk.height + base) / 2, dk.center[1])
      m.castShadow = true
      m.receiveShadow = true
      this.arenaGroup.add(m)
    }

    // Named props (static) and movers (moved every frame from the sim).
    for (const p of arena.props ?? []) {
      const obj = propMesh(p.kind, p.shape.kind === 'circle' ? [p.shape.radius * 2, p.shape.radius * 2] : p.shape.size, p.height, p.color, p.shape.kind === 'circle')
      obj.position.set(p.shape.center[0], p.base ?? 0, p.shape.center[1])
      this.arenaGroup.add(obj)
    }
    for (const m of arena.movers ?? []) {
      const obj = propMesh(m.kind, m.size, m.height, m.color, m.kind === 'person')
      // The sim reports a mover's centre; the mesh is built from the floor up.
      const holder = new THREE.Group()
      obj.position.y = -m.height / 2
      holder.add(obj)
      this.arenaGroup.add(holder)
      this.bodies.set(m.id, holder)
    }

    // Pushable boxes and pick-up objects (moved every frame from the sim).
    arena.boxes.forEach((b, i) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(b.size, b.size, b.size, 3, b.size * 0.08), new THREE.MeshStandardMaterial({ color: b.color ?? '#38BDF8', roughness: 0.55 }))
      m.castShadow = true
      m.receiveShadow = true
      m.position.set(b.pos[0], b.size / 2, b.pos[1])
      this.arenaGroup.add(m)
      this.bodies.set(`box-${i}`, m)
    })
    for (const o of arena.objects) {
      const geo = o.kind === 'ball' ? new THREE.SphereGeometry(o.size, 24, 16) : new RoundedBoxGeometry(o.size * 2, o.size * 2, o.size * 2, 2, o.size * 0.2)
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: o.color ?? '#F43F5E', roughness: 0.4 }))
      m.castShadow = true
      m.position.set(o.pos[0], (o.base ?? 0) + o.size, o.pos[1])
      this.arenaGroup.add(m)
      this.bodies.set(o.id, m)
    }

    // Goal ring, gently pulsing.
    const ring = shapeMesh(arena.goal.zone, new THREE.MeshBasicMaterial({ color: '#FDE68A', transparent: true, opacity: 0.9 }))
    if (arena.goal.zone.kind === 'rect') {
      ring.geometry.dispose()
      const [sw, sd] = arena.goal.zone.size
      const shape = new THREE.Shape()
      shape.moveTo(-sw / 2, -sd / 2)
      shape.lineTo(sw / 2, -sd / 2)
      shape.lineTo(sw / 2, sd / 2)
      shape.lineTo(-sw / 2, sd / 2)
      shape.lineTo(-sw / 2, -sd / 2)
      const hole = new THREE.Path()
      const e = 0.015
      hole.moveTo(-sw / 2 + e, -sd / 2 + e)
      hole.lineTo(-sw / 2 + e, sd / 2 - e)
      hole.lineTo(sw / 2 - e, sd / 2 - e)
      hole.lineTo(sw / 2 - e, -sd / 2 + e)
      shape.holes.push(hole)
      ring.geometry = new THREE.ShapeGeometry(shape)
    }
    // A goal up on a deck (the store at the top of a ramp) sits on the deck's top, not under it.
    const [gx, gz] = arena.goal.zone.center
    const top = (arena.decks ?? []).reduce((h, dk) => (Math.abs(gx - dk.center[0]) <= dk.size[0] / 2 && Math.abs(gz - dk.center[1]) <= dk.size[1] / 2 ? Math.max(h, dk.height) : h), 0)
    ring.position.y = top + 0.003
    if (arena.goal.kind === 'deliver') {
      // The marked drop spot: a soft fill inside the ring, so it reads as "put it HERE".
      const fill = shapeMesh(arena.goal.zone, new THREE.MeshBasicMaterial({ color: '#FDE68A', transparent: true, opacity: 0.25, depthWrite: false }))
      if (arena.goal.zone.kind === 'circle') {
        fill.geometry.dispose()
        fill.geometry = new THREE.CircleGeometry(arena.goal.zone.radius, 48)
      }
      fill.position.y = top + 0.002
      this.arenaGroup.add(fill)
    }
    this.goalRing = ring
    this.arenaGroup.add(ring)

    // Start marker.
    const start = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.125, 40), new THREE.MeshBasicMaterial({ color: '#22D3EE', transparent: true, opacity: 0.8 }))
    start.rotation.x = -Math.PI / 2
    start.position.set(arena.start.pos[0], 0.003, arena.start.pos[1])
    this.arenaGroup.add(start)

    this.firstFrame = true
    this.wake()
  }

  setRobot(design: RobotDesign): void {
    if (this.robotModel) {
      this.robotRoot.remove(this.robotModel)
      disposeObject(this.robotModel)
    }
    const model = buildRobot(design)
    model.scale.setScalar(MODEL_SCALE)
    model.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.castShadow = true
    })
    this.robotModel = model
    this.robotRoot.add(model)
    this.seesWalls = capabilitiesOf(design).has('see-wall')
    this.sensorView.setDesign(design)
    this.wake()
  }

  private lerpPose(obj: THREE.Object3D, a: { p: { x: number; y: number; z: number }; q: { x: number; y: number; z: number; w: number } }, b: typeof a, t: number): void {
    obj.position.set(a.p.x + (b.p.x - a.p.x) * t, a.p.y + (b.p.y - a.p.y) * t, a.p.z + (b.p.z - a.p.z) * t)
    this.qa.set(a.q.x, a.q.y, a.q.z, a.q.w)
    this.qb.set(b.q.x, b.q.y, b.q.z, b.q.w)
    obj.quaternion.copy(this.qa.slerp(this.qb, t))
  }

  private draw(f: FramePoses, dt: number): void {
    const { prev, cur, alpha } = f
    this.lerpPose(this.robotRoot, prev.robot, cur.robot, alpha)
    if (this.ghostModel) {
      const g = f.ghost ?? null
      this.ghostModel.visible = g !== null
      if (g) {
        this.ghostModel.position.set(g.p.x, g.p.y, g.p.z)
        this.ghostModel.quaternion.set(g.q.x, g.q.y, g.q.z, g.q.w)
      }
    }
    if (this.prevBodies !== prev.bodies) {
      this.prevBodies = prev.bodies
      this.prevBodyIndex.clear()
      for (const x of prev.bodies) this.prevBodyIndex.set(x.id, x)
    }
    for (const b of cur.bodies) {
      const obj = this.bodies.get(b.id)
      const pb = this.prevBodyIndex.get(b.id) ?? b
      if (obj) this.lerpPose(obj, pb, b, alpha)
    }
    // Robot animation: blink/legs/light from robot3d, wheels from the real motor speed.
    if (this.robotModel) {
      const moving = Math.abs(cur.wheelSpeed[0]) + Math.abs(cur.wheelSpeed[1]) > 0.01
      animateRobot(this.robotModel, this.elapsed, {
        moving,
        direction: cur.wheelSpeed[0] + cur.wheelSpeed[1] < 0 ? -1 : 1,
        lightOn: cur.lightOn,
        carrying: cur.holding !== null,
        reducedMotion: this.reduced,
      })
      const h = getRobotHandles(this.robotModel)
      if (h) {
        h.cargo.visible = false // the real object is carried instead of the stand-in crate
        for (const w of h.wheels) {
          // robot3d puts the robot's left wheels at +x, right wheels at -x.
          const side = w.position.x > 0 ? 0 : 1
          w.rotation.x = prev.wheelAngle[side] + (cur.wheelAngle[side] - prev.wheelAngle[side]) * alpha
        }
      }
    }
    // Distance sensor beam.
    const s = f.sensors
    this.sensorView.update(s, dt)
    // With the robot's-eye view on, its 20 rays replace the single cone.
    if (s && s.beam && this.seesWalls && !this.sensorView.isOn) {
      const from = this.v1.set(s.beam.from.x, s.beam.from.y, s.beam.from.z)
      const to = this.v2.set(s.beam.to.x, s.beam.to.y, s.beam.to.z)
      const len = from.distanceTo(to)
      this.beam.visible = len > 0.01
      this.beam.scale.set(Math.max(0.005, len * Math.tan((12 * Math.PI) / 180)), len, Math.max(0.005, len * 0.06))
      this.beam.position.copy(from).lerp(to, 0.5)
      this.beam.quaternion.setFromUnitVectors(SimRenderer.DOWN, this.v3.subVectors(to, from).normalize())
      const near = s.distanceCm < 20
      ;(this.beam.material as THREE.MeshBasicMaterial).color.set(near ? '#F87171' : '#34D399')
      ;(this.beamDot.material as THREE.MeshBasicMaterial).color.set(near ? '#F87171' : '#34D399')
      this.beamDot.visible = s.beam.hit
      this.beamDot.position.copy(to)
    } else {
      this.beam.visible = false
      this.beamDot.visible = false
    }
    this.drawTrail(f.trail)
    if (this.goalRing && !this.reduced) {
      const m = this.goalRing.material as THREE.MeshBasicMaterial
      m.opacity = 0.6 + Math.sin(this.elapsed * 3) * 0.3
    }
    this.updateCamera(dt)
  }

  /**
   * Pen trail as a flat ribbon (WebGL lines are 1 px). Only NEW segments are written into a
   * preallocated buffer (grown by doubling), so a long drawing costs the same per frame as a short one.
   */
  private drawTrail(trail: number[]): void {
    if (trail !== this.trailOf || trail.length < this.trailDone) {
      this.trailOf = trail
      // A new run: start the ribbon again.
      this.trailDone = 0
      this.trailVerts = 0
    }
    if (trail.length === this.trailDone) {
      this.trailGeo.setDrawRange(0, this.trailVerts)
      return
    }
    const W = 0.007
    const y = 0.004
    const first = this.trailVerts
    let i = Math.max(0, this.trailDone - 2)
    for (; i + 3 < trail.length; i += 2) {
      const ax = trail[i]
      const az = trail[i + 1]
      const bx = trail[i + 2]
      const bz = trail[i + 3]
      if (Number.isNaN(ax) || Number.isNaN(bx)) continue
      if (this.trailAttr.array.length < (this.trailVerts + 6) * 3) this.growTrail()
      const dx = bx - ax
      const dz = bz - az
      const l = Math.hypot(dx, dz) || 1
      const nx = (-dz / l) * W
      const nz = (dx / l) * W
      const a = this.trailAttr.array as Float32Array
      let o = this.trailVerts * 3
      const put = (px: number, pz: number) => {
        a[o++] = px
        a[o++] = y
        a[o++] = pz
      }
      put(ax + nx, az + nz)
      put(bx + nx, bz + nz)
      put(ax - nx, az - nz)
      put(bx + nx, bz + nz)
      put(bx - nx, bz - nz)
      put(ax - nx, az - nz)
      this.trailVerts += 6
    }
    this.trailDone = trail.length
    if (this.trailVerts > first) {
      this.trailAttr.clearUpdateRanges()
      this.trailAttr.addUpdateRange(first * 3, (this.trailVerts - first) * 3)
      this.trailAttr.needsUpdate = true
    }
    this.trailGeo.setDrawRange(0, this.trailVerts)
  }

  private growTrail(): void {
    const old = this.trailAttr.array as Float32Array
    const next = new Float32Array(old.length * 2)
    next.set(old)
    this.trailAttr = new THREE.BufferAttribute(next, 3)
    this.trailAttr.setUsage(THREE.DynamicDrawUsage)
    this.trailGeo.setAttribute('position', this.trailAttr) // a new, bigger GPU buffer (uploaded whole once)
  }

  private updateCamera(dt: number): void {
    const cam = this.stage.camera
    const p = this.robotRoot.position
    const fwd = this.v1.set(0, 0, 1).applyQuaternion(this.robotRoot.quaternion)
    fwd.y = 0
    fwd.normalize()
    if (this.mode === 'orbit') {
      if (this.firstFrame && this.arena) {
        cam.position.set(p.x - 1.2, 1.4, p.z - 1.4)
        this.firstFrame = false
      }
      this.controls.target.lerp(p, 1 - Math.exp(-dt * 4))
      return
    }
    const wantPos = this.wantPos
    const wantTarget = this.wantTarget
    if (this.mode === 'top' && this.arena) {
      const [w, d] = this.arena.size
      wantTarget.set(this.arena.center[0], 0, this.arena.center[1])
      wantPos.set(this.arena.center[0], Math.max(w, d) * 1.25, this.arena.center[1] - 0.35)
    } else {
      // Chase cam: behind and above, looking a little ahead of the robot.
      wantPos.copy(p).addScaledVector(fwd, -1.05)
      wantPos.y += 0.75
      wantTarget.copy(p).addScaledVector(fwd, 0.35)
    }
    if (this.firstFrame) {
      this.camPos.copy(wantPos)
      this.camTarget.copy(wantTarget)
      this.firstFrame = false
    } else {
      const k = 1 - Math.exp(-dt * 3.5)
      this.camPos.lerp(wantPos, k)
      this.camTarget.lerp(wantTarget, k)
    }
    cam.position.copy(this.camPos)
    cam.lookAt(this.camTarget)
  }

  /** Show a see-through ghost of this robot (the best run), or remove it with null. Posed by FramePoses.ghost. */
  setGhost(design: RobotDesign | null): void {
    if (this.ghostModel) {
      this.stage.scene.remove(this.ghostModel)
      disposeObject(this.ghostModel)
      this.ghostModel = null
    }
    if (!design) return
    const inner = buildRobot(design)
    inner.scale.setScalar(MODEL_SCALE)
    inner.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = false
      // One shared-look cyan glass material per mesh (disposed with the model).
      m.material = new THREE.MeshBasicMaterial({ color: '#00E5FF', transparent: true, opacity: 0.28, depthWrite: false })
    })
    const root = new THREE.Group()
    root.add(inner)
    root.visible = false
    root.renderOrder = 2
    this.ghostModel = root
    this.stage.scene.add(root)
    this.wake()
  }

  dispose(): void {
    this.frameFn = null
    this.io?.disconnect()
    this.sensorView.dispose()
    this.controls.dispose()
    if (this.robotModel) disposeObject(this.robotModel)
    this.setGhost(null)
    this.stage.dispose()
  }
}
