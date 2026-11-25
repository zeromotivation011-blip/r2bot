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

export type CameraMode = 'follow' | 'orbit' | 'top'

const COLOR_HEX: Record<FloorColor, string> = {
  white: '#F1F5F9',
  black: '#0F172A',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#3B82F6',
  yellow: '#FACC15',
}
const SURFACE_BASE: Record<Surface, string> = { tile: '#E2E8F0', carpet: '#B4536B', sand: '#E9C98B', ice: '#BAE6FD', rocks: '#9CA3AF' }
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
        if (s === 'sand') {
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
  // Region labels.
  ctx.font = `800 ${0.07 * PX_PER_M}px system-ui, sans-serif`
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

export interface FramePoses {
  prev: SimSnapshot
  cur: SimSnapshot
  alpha: number
  sensors: SensorReadings | null
  trail: number[]
}

export class SimRenderer {
  private stage: Stage
  private arenaGroup = new THREE.Group()
  private robotRoot = new THREE.Group()
  private robotModel: THREE.Group | null = null
  private bodies = new Map<string, THREE.Object3D>()
  private trailMesh: THREE.Mesh
  private trailCount = -1
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

  constructor(container: HTMLElement) {
    this.stage = createStage(container, { background: '#120A2E', shadows: true, fov: 45 })
    this.stage.scene.fog = new THREE.Fog('#120A2E', 6, 14)
    this.stage.scene.add(this.arenaGroup, this.robotRoot)
    this.controls = new OrbitControls(this.stage.camera, this.stage.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 0.4
    this.controls.maxDistance = 6
    this.controls.enabled = false

    const trailGeo = new THREE.BufferGeometry()
    this.trailMesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: '#7C3AED', side: THREE.DoubleSide }))
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

    this.stage.onFrame((t, dt) => {
      this.elapsed = t
      const poses = this.frameFn?.(dt) ?? null
      if (poses) this.draw(poses, dt)
      this.controls.update()
    })
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
    const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: '#1E1548', roughness: 1 }))
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

    // Walls (boundary + authored).
    const wallMat = new THREE.MeshStandardMaterial({ color: '#6D28D9', roughness: 0.6 })
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
      m.position.set(r.center[0], 0, r.center[1])
      m.rotation.y = headingToYaw(r.riseHeadingDeg)
      m.castShadow = true
      m.receiveShadow = true
      this.arenaGroup.add(m)
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
      m.position.set(o.pos[0], o.size, o.pos[1])
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
    this.goalRing = ring
    this.arenaGroup.add(ring)

    // Start marker.
    const start = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.125, 40), new THREE.MeshBasicMaterial({ color: '#A78BFA', transparent: true, opacity: 0.8 }))
    start.rotation.x = -Math.PI / 2
    start.position.set(arena.start.pos[0], 0.003, arena.start.pos[1])
    this.arenaGroup.add(start)

    this.firstFrame = true
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
  }

  private lerpPose(obj: THREE.Object3D, a: { p: { x: number; y: number; z: number }; q: { x: number; y: number; z: number; w: number } }, b: typeof a, t: number): void {
    obj.position.set(a.p.x + (b.p.x - a.p.x) * t, a.p.y + (b.p.y - a.p.y) * t, a.p.z + (b.p.z - a.p.z) * t)
    const qa = new THREE.Quaternion(a.q.x, a.q.y, a.q.z, a.q.w)
    const qb = new THREE.Quaternion(b.q.x, b.q.y, b.q.z, b.q.w)
    obj.quaternion.copy(qa.slerp(qb, t))
  }

  private draw(f: FramePoses, dt: number): void {
    const { prev, cur, alpha } = f
    this.lerpPose(this.robotRoot, prev.robot, cur.robot, alpha)
    for (const b of cur.bodies) {
      const obj = this.bodies.get(b.id)
      const pb = prev.bodies.find((x) => x.id === b.id) ?? b
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
    if (s && s.beam) {
      const from = new THREE.Vector3(s.beam.from.x, s.beam.from.y, s.beam.from.z)
      const to = new THREE.Vector3(s.beam.to.x, s.beam.to.y, s.beam.to.z)
      const len = from.distanceTo(to)
      this.beam.visible = len > 0.01
      this.beam.scale.set(Math.max(0.005, len * Math.tan((12 * Math.PI) / 180)), len, Math.max(0.005, len * 0.06))
      this.beam.position.copy(from).lerp(to, 0.5)
      this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize())
      const near = s.distanceCm < 20
      ;(this.beam.material as THREE.MeshBasicMaterial).color.set(near ? '#F87171' : '#34D399')
      ;(this.beamDot.material as THREE.MeshBasicMaterial).color.set(near ? '#F87171' : '#34D399')
      this.beamDot.visible = s.beam.hit
      this.beamDot.position.copy(to)
    } else {
      this.beam.visible = false
      this.beamDot.visible = false
    }
    // Pen trail as a flat ribbon (WebGL lines are 1 px).
    if (f.trail.length !== this.trailCount) {
      this.trailCount = f.trail.length
      const pos: number[] = []
      const W = 0.007
      for (let i = 0; i + 3 < f.trail.length; i += 2) {
        const ax = f.trail[i]
        const az = f.trail[i + 1]
        const bx = f.trail[i + 2]
        const bz = f.trail[i + 3]
        if (Number.isNaN(ax) || Number.isNaN(bx)) continue
        const dx = bx - ax
        const dz = bz - az
        const l = Math.hypot(dx, dz) || 1
        const nx = (-dz / l) * W
        const nz = (dx / l) * W
        const y = 0.004
        pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz)
      }
      this.trailMesh.geometry.dispose()
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      this.trailMesh.geometry = g
    }
    if (this.goalRing && !this.reduced) {
      const m = this.goalRing.material as THREE.MeshBasicMaterial
      m.opacity = 0.6 + Math.sin(this.elapsed * 3) * 0.3
    }
    this.updateCamera(dt)
  }

  private updateCamera(dt: number): void {
    const cam = this.stage.camera
    const p = this.robotRoot.position
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.robotRoot.quaternion)
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
    let wantPos: THREE.Vector3
    let wantTarget: THREE.Vector3
    if (this.mode === 'top' && this.arena) {
      const [w, d] = this.arena.size
      wantTarget = new THREE.Vector3(this.arena.center[0], 0, this.arena.center[1])
      wantPos = new THREE.Vector3(this.arena.center[0], Math.max(w, d) * 1.25, this.arena.center[1] - 0.35)
    } else {
      // Chase cam: behind and above, looking a little ahead of the robot.
      wantPos = p.clone().addScaledVector(fwd, -1.05).add(new THREE.Vector3(0, 0.75, 0))
      wantTarget = p.clone().addScaledVector(fwd, 0.35)
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

  dispose(): void {
    this.frameFn = null
    this.controls.dispose()
    if (this.robotModel) disposeObject(this.robotModel)
    this.stage.dispose()
  }
}
