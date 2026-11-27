'use client'

// components/kids/hangar/HangarSceneClient.tsx
// The 3D hangar bay: the child's robot on a turntable under light beams, on a
// reflective floor, with their earned decal, skin and (during a test drive)
// trail. Loaded only through next/dynamic({ ssr: false }) from HangarClient,
// behind a same-size poster, so three.js never touches the server or the
// shared bundle.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { animateRobot, buildRobot, disposeObject, getRobotHandles } from '@/lib/kids/robot3d'
import type { RobotDesign } from '@/lib/kids/robot-design'
import { liteDpr } from '@/lib/kids/settings'
import { createStage, prefersReducedMotion, type Stage } from '@/components/kids/three/stage'
import { beamTexture, decalTexture, dotTexture, floorTexture, skinLook, wallTexture } from './looks'

export interface HangarLook {
  decal: string | null
  skin: string | null
  trail: string | null
  /** The Spark Trail Rocket Booster add-on (two boosters on the robot's back). */
  booster: boolean
}

interface Props {
  design: RobotDesign
  look: HangarLook
  /** Increment to start one test-drive loop. 0 = none yet. */
  driveToken: number
  onDriveEnd: () => void
  onReady: () => void
  onError: () => void
  label: string
}

const BG = '#060B16'
const PLATFORM_R = 1.05
const PLATFORM_H = 0.05
const LOOP_R = 1.5
const LOOP_SECONDS = 7.5

// ── Trail particles ────────────────────────────────────────────────────────
const MAX_P = 420

interface TrailSystem {
  points: THREE.Points
  pos: Float32Array
  col: Float32Array
  vel: Float32Array
  age: Float32Array
  life: Float32Array
  base: Float32Array
  next: number
}

function makeTrail(): TrailSystem {
  const pos = new Float32Array(MAX_P * 3)
  const col = new Float32Array(MAX_P * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    size: 0.09,
    map: dotTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  for (let i = 0; i < MAX_P; i++) pos[i * 3 + 1] = -50 // parked below the floor
  return {
    points,
    pos,
    col,
    vel: new Float32Array(MAX_P * 3),
    age: new Float32Array(MAX_P).fill(99),
    life: new Float32Array(MAX_P).fill(1),
    base: new Float32Array(MAX_P * 3),
    next: 0,
  }
}

const tmpColor = new THREE.Color()

function spawn(ts: TrailSystem, kind: string | null, at: THREE.Vector3, t: number, rand: () => number) {
  const i = ts.next
  ts.next = (ts.next + 1) % MAX_P
  const j = i * 3
  let life = 1
  let vx = 0
  let vy = 0
  let vz = 0
  let y = at.y
  switch (kind) {
    case 'trail-sparkle':
      tmpColor.set(rand() > 0.5 ? '#FFFFFF' : '#FFA878')
      vx = (rand() - 0.5) * 0.5
      vy = 0.2 + rand() * 0.5
      vz = (rand() - 0.5) * 0.5
      life = 0.8 + rand() * 0.6
      break
    case 'trail-rainbow':
      tmpColor.setHSL((t * 0.35 + rand() * 0.04) % 1, 0.95, 0.6)
      y = at.y + (rand() - 0.5) * 0.12
      life = 1.6
      break
    case 'trail-plasma':
      tmpColor.setHSL(0.5 + rand() * 0.12, 1, 0.55)
      vx = (rand() - 0.5) * 0.12
      vy = 0.05 + rand() * 0.1
      vz = (rand() - 0.5) * 0.12
      life = 1.6
      break
    default:
      // No trail chosen: a little grey floor dust, so the test drive still reads.
      tmpColor.set('#64748B')
      vx = (rand() - 0.5) * 0.2
      vy = 0.08 + rand() * 0.1
      vz = (rand() - 0.5) * 0.2
      y = 0.05
      life = 0.6
  }
  ts.pos[j] = at.x + (rand() - 0.5) * 0.08
  ts.pos[j + 1] = y
  ts.pos[j + 2] = at.z + (rand() - 0.5) * 0.08
  ts.vel[j] = vx
  ts.vel[j + 1] = vy
  ts.vel[j + 2] = vz
  ts.base[j] = tmpColor.r
  ts.base[j + 1] = tmpColor.g
  ts.base[j + 2] = tmpColor.b
  ts.age[i] = 0
  ts.life[i] = life
}

function stepTrail(ts: TrailSystem, dt: number, kind: string | null, t: number) {
  for (let i = 0; i < MAX_P; i++) {
    const j = i * 3
    if (ts.age[i] >= ts.life[i]) {
      ts.col[j] = ts.col[j + 1] = ts.col[j + 2] = 0
      continue
    }
    ts.age[i] += dt
    ts.pos[j] += ts.vel[j] * dt
    ts.pos[j + 1] += ts.vel[j + 1] * dt
    ts.pos[j + 2] += ts.vel[j + 2] * dt
    ts.vel[j + 1] -= kind === 'trail-sparkle' ? 0.6 * dt : 0
    let k = Math.max(0, 1 - ts.age[i] / ts.life[i])
    if (kind === 'trail-sparkle') k *= 0.55 + 0.45 * Math.sin(t * 30 + i)
    ts.col[j] = ts.base[j] * k
    ts.col[j + 1] = ts.base[j + 1] * k
    ts.col[j + 2] = ts.base[j + 2] * k
  }
  ts.points.geometry.attributes.position.needsUpdate = true
  ts.points.geometry.attributes.color.needsUpdate = true
}

// ── Looks on the robot ─────────────────────────────────────────────────────

/** Materials that carry the robot's paint (primary colour). */
function paintMaterials(robot: THREE.Object3D, primary: string): THREE.MeshStandardMaterial[] {
  const want = new THREE.Color(primary)
  const out = new Set<THREE.MeshStandardMaterial>()
  robot.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    for (const mat of mats) {
      const s = mat as THREE.MeshStandardMaterial
      if (s.isMeshStandardMaterial && s.emissive.getHex() === 0) {
        const c = s.color
        if (Math.abs(c.r - want.r) + Math.abs(c.g - want.g) + Math.abs(c.b - want.b) < 0.02) out.add(s)
      }
    }
  })
  return [...out]
}

function applySkin(robot: THREE.Object3D, primary: string, skinId: string | null) {
  if (!skinId) return
  const look = skinLook(skinId)
  if (!look) return
  for (const m of paintMaterials(robot, primary)) {
    m.map = look.map
    m.color.set('#FFFFFF')
    m.roughness = look.roughness
    m.metalness = look.metalness
    m.needsUpdate = true
  }
}

/** The Spark Trail Rocket Booster: two little boosters on the back of the body (forward is +z). */
function addBooster(robot: THREE.Group): void {
  robot.updateMatrixWorld(true)
  const handles = getRobotHandles(robot)
  const body = handles?.slots.body ?? robot
  const parent: THREE.Object3D = handles?.bodyGroup ?? robot
  const box = new THREE.Box3().setFromObject(body)
  const h = Math.max(0.16, (box.max.y - box.min.y) * 0.6)
  const shell = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.35, metalness: 0.3 })
  const nozzle = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.7 })
  const flame = new THREE.MeshStandardMaterial({ color: '#FFA878', emissive: '#FC6818', emissiveIntensity: 1.4, roughness: 0.4 })
  const yMid = box.min.y + (box.max.y - box.min.y) * 0.55
  for (const side of [1, -1]) {
    const g = new THREE.Group()
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 16), shell)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 16), shell)
    cap.position.y = h / 2 + 0.04
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.05, 16), nozzle)
    bell.position.y = -h / 2 - 0.025
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 12), flame)
    fire.rotation.x = Math.PI
    fire.position.y = -h / 2 - 0.095
    for (const m of [tube, cap, bell]) m.castShadow = true
    g.add(tube, cap, bell, fire)
    const world = new THREE.Vector3(box.getCenter(new THREE.Vector3()).x + side * Math.min(0.12, (box.max.x - box.min.x) * 0.28), yMid, box.min.z - 0.04)
    g.position.copy(parent.worldToLocal(world))
    parent.add(g)
  }
}

/** Put the decal on both sides of the body, flush with whatever shape it has. */
function addDecal(robot: THREE.Group, decalId: string | null): void {
  if (!decalId) return
  const map = decalTexture(decalId)
  if (!map) return
  robot.updateMatrixWorld(true)
  const handles = getRobotHandles(robot)
  const body = handles?.slots.body ?? robot
  // Ride on the bobbing part of the robot, so the decal moves with the body.
  const parent: THREE.Object3D = handles?.bodyGroup ?? robot
  const box = new THREE.Box3().setFromObject(body)
  const centre = box.getCenter(new THREE.Vector3())
  // Aim a little above the middle of the body, where the sides are flattest.
  const y = box.min.y + (box.max.y - box.min.y) * 0.55
  const meshes: THREE.Object3D[] = []
  body.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.visible) meshes.push(o)
  })
  const ray = new THREE.Raycaster()
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 })
  for (const side of [1, -1]) {
    const from = new THREE.Vector3(centre.x + side * 3, y, centre.z)
    ray.set(from, new THREE.Vector3(-side, 0, 0))
    const hit = ray.intersectObjects(meshes, false)[0]
    const size = Math.min(0.3, Math.max(0.18, (box.max.y - box.min.y) * 0.5))
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)
    if (hit) {
      const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(side, 0, 0)
      n.y *= 0.4
      n.normalize()
      plane.position.copy(parent.worldToLocal(hit.point.clone().addScaledVector(n, 0.012)))
      plane.lookAt(hit.point.clone().add(n.clone().multiplyScalar(2)))
    } else {
      plane.position.set(side * (box.max.x + 0.01), y, 0)
      plane.rotation.y = (side * Math.PI) / 2
    }
    plane.renderOrder = 2
    parent.add(plane)
  }
}

// ── The component ──────────────────────────────────────────────────────────

export default function HangarSceneClient({ design, look, driveToken, onDriveEnd, onReady, onError, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const robotRef = useRef<THREE.Group | null>(null)
  const turntableRef = useRef<THREE.Group | null>(null)
  const trailKindRef = useRef<string | null>(look.trail)
  const driveRef = useRef<{ start: number; token: number } | null>(null)
  /** Wake the render loop for a moment (needed when it sleeps: reduced motion, still scene). */
  const wakeRef = useRef<() => void>(() => undefined)
  const cb = useRef({ onDriveEnd, onReady, onError })
  cb.current = { onDriveEnd, onReady, onError }

  // ── Mount the bay once ──
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let stage: Stage
    try {
      stage = createStage(host, { background: BG, lights: false })
    } catch {
      cb.current.onError()
      return
    }
    stageRef.current = stage
    const { scene, camera, renderer } = stage
    const reduced = prefersReducedMotion()
    scene.fog = new THREE.Fog(BG, 7, 16)
    renderer.toneMappingExposure = 1.15

    // Lights: soft fill, a key spot from above, orange and cyan rims.
    scene.add(new THREE.HemisphereLight('#CBD5E1', '#0A1120', 0.9))
    const key = new THREE.SpotLight('#FFF7ED', 60, 12, Math.PI / 6.5, 0.45, 1.6)
    key.position.set(0.6, 5.2, 1.6)
    key.target.position.set(0, 0.4, 0)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.0004
    key.shadow.radius = 4
    scene.add(key, key.target)
    const rimO = new THREE.SpotLight('#FC6818', 40, 12, Math.PI / 7, 0.6, 1.6)
    rimO.position.set(-3.2, 3.4, -2.6)
    rimO.target.position.set(0, 0.5, 0)
    scene.add(rimO, rimO.target)
    const rimC = new THREE.SpotLight('#00E5FF', 30, 12, Math.PI / 7, 0.6, 1.6)
    rimC.position.set(3.4, 3, -2.2)
    rimC.target.position.set(0, 0.5, 0)
    scene.add(rimC, rimC.target)
    const front = new THREE.DirectionalLight('#E2E8F0', 0.7)
    front.position.set(1.5, 2, 4)
    scene.add(front)

    // Reflective floor: a real mirror under a tinted, gridded glaze.
    const w = Math.max(256, Math.round(host.clientWidth * liteDpr(2) * 0.5))
    const mirror = new Reflector(new THREE.CircleGeometry(9, 64), {
      textureWidth: w,
      textureHeight: w,
      color: new THREE.Color('#8D97A8'),
      clipBias: 0.003,
    })
    mirror.rotation.x = -Math.PI / 2
    scene.add(mirror)
    const glaze = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: '#0A1120', transparent: true, opacity: 0.72, roughness: 0.4, metalness: 0.1 }),
    )
    glaze.rotation.x = -Math.PI / 2
    glaze.position.y = 0.002
    glaze.receiveShadow = true
    scene.add(glaze)
    const marks = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }),
    )
    marks.rotation.x = -Math.PI / 2
    marks.position.y = 0.004
    scene.add(marks)

    // Walls.
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 7, 48, 1, true),
      new THREE.MeshBasicMaterial({ map: wallTexture(), side: THREE.BackSide, toneMapped: false }),
    )
    wall.position.y = 3.4
    scene.add(wall)

    // Turntable platform.
    const turntable = new THREE.Group()
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATFORM_R, PLATFORM_R + 0.04, PLATFORM_H, 64),
      new THREE.MeshStandardMaterial({ color: '#1B2740', roughness: 0.35, metalness: 0.6 }),
    )
    deck.position.y = PLATFORM_H / 2
    deck.receiveShadow = true
    turntable.add(deck)
    const ringO = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_R + 0.02, 0.018, 8, 96),
      new THREE.MeshBasicMaterial({ color: '#FC6818', toneMapped: false }),
    )
    ringO.rotation.x = Math.PI / 2
    ringO.position.y = PLATFORM_H
    turntable.add(ringO)
    const ringC = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_R * 0.72, 0.008, 6, 96),
      new THREE.MeshBasicMaterial({ color: '#00B8D4', toneMapped: false }),
    )
    ringC.rotation.x = Math.PI / 2
    ringC.position.y = PLATFORM_H + 0.002
    turntable.add(ringC)
    // Ticks on the deck so the rotation reads.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.09), new THREE.MeshBasicMaterial({ color: i % 6 === 0 ? '#FFA878' : '#334155' }))
      tick.position.set(Math.sin(a) * PLATFORM_R * 0.88, PLATFORM_H + 0.002, Math.cos(a) * PLATFORM_R * 0.88)
      tick.rotation.y = a
      turntable.add(tick)
    }
    scene.add(turntable)
    turntableRef.current = turntable

    // Light beams from three ceiling lamps.
    const beams: THREE.Mesh[] = []
    const lamps: [number, number, number, string, number][] = [
      [0.6, 5.2, 1.6, '#FFE2CC', 1.3],
      [-3.2, 3.4, -2.6, '#FC6818', 1.2],
      [3.4, 3, -2.2, '#00E5FF', 1.1],
    ]
    for (const [x, y, z, colour, rBottom] of lamps) {
      const from = new THREE.Vector3(x, y, z)
      const to = new THREE.Vector3(0, 0.2, 0)
      const len = from.distanceTo(to)
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, rBottom, len, 40, 1, true),
        new THREE.MeshBasicMaterial({
          map: beamTexture(colour),
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
          fog: false,
        }),
      )
      cone.position.copy(from).add(to).multiplyScalar(0.5)
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize())
      scene.add(cone)
      beams.push(cone)
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.12, 24), new THREE.MeshBasicMaterial({ color: colour, toneMapped: false }))
      lamp.position.copy(from)
      lamp.quaternion.copy(cone.quaternion)
      scene.add(lamp)
    }

    // Dust drifting through the light.
    const DUST = 160
    const dustPos = new Float32Array(DUST * 3)
    const seed = { s: 12345 }
    const rand = () => {
      seed.s = (seed.s * 1664525 + 1013904223) >>> 0
      return seed.s / 4294967296
    }
    for (let i = 0; i < DUST; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * 2.4
      dustPos[i * 3] = Math.cos(a) * r
      dustPos[i * 3 + 1] = 0.2 + rand() * 3.6
      dustPos[i * 3 + 2] = Math.sin(a) * r
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ size: 0.025, map: dotTexture(), color: '#FFD7BD', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    scene.add(dust)

    const trail = makeTrail()
    scene.add(trail.points)

    // Camera + orbit.
    camera.fov = 36
    // Portrait phones see less width: step back and drive a tighter loop so the
    // whole test drive stays in view.
    const aspect = host.clientWidth / Math.max(1, host.clientHeight)
    const portrait = aspect < 1.2
    const back = portrait ? 1.45 : 1
    const loopR = portrait ? 1.05 : LOOP_R
    camera.position.set(2.5 * back, 1.55 * back, 3.3 * back)
    camera.updateProjectionMatrix()
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.5, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 1.8
    controls.maxDistance = 6.5
    controls.minPolarAngle = Math.PI * 0.18
    controls.maxPolarAngle = Math.PI * 0.48
    controls.update()
    let spin = !reduced
    controls.addEventListener('start', () => {
      spin = false
    })

    // Only draw while someone can see it. Off-screen (scrolled down to the badge
    // wall) the loop sleeps. With reduced motion nothing moves on its own, so the
    // loop also sleeps once the scene is drawn, and wakes for drives, drags,
    // look changes and resizes.
    let visible = true
    let awakeUntil = performance.now() + 1500
    const needsFrames = () => !reduced || driveRef.current !== null || performance.now() < awakeUntil
    const sync = () => stage.setActive(visible && needsFrames())
    const wake = () => {
      awakeUntil = performance.now() + 1200
      sync()
    }
    wakeRef.current = wake
    controls.addEventListener('change', wake)
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) wake()
        else sync()
      },
      { threshold: 0.01 },
    )
    io.observe(host)
    const ro = new ResizeObserver(() => wake())
    ro.observe(host)

    const at = new THREE.Vector3()
    let spawnAcc = 0
    stage.onFrame((t, dt) => {
      const robot = robotRef.current
      if (!reduced) {
        if (spin) turntable.rotation.y += dt * 0.35
        for (let i = 0; i < DUST; i++) {
          dustPos[i * 3 + 1] += dt * 0.05
          if (dustPos[i * 3 + 1] > 3.8) dustPos[i * 3 + 1] = 0.2
        }
        dustGeo.attributes.position.needsUpdate = true
        for (let i = 0; i < beams.length; i++) {
          ;(beams[i].material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 0.8 + i * 2) * 0.03
        }
      }
      let moving = false
      const drive = driveRef.current
      if (robot) {
        if (drive) {
          if (drive.start < 0) drive.start = t
          const p = (t - drive.start) / LOOP_SECONDS
          if (p >= 1) {
            driveRef.current = null
            robot.position.set(0, PLATFORM_H, 0)
            robot.rotation.y = 0
            turntable.add(robot)
            cb.current.onDriveEnd()
          } else {
            // A figure-eight through the turntable (lemniscate of Gerono).
            const th = p * Math.PI * 2
            const x = loopR * Math.sin(th)
            const z = loopR * Math.sin(th) * Math.cos(th)
            const dx = loopR * Math.cos(th)
            const dz = loopR * Math.cos(2 * th)
            const r = Math.hypot(x, z)
            const lift = r < PLATFORM_R - 0.05 ? PLATFORM_H : r < PLATFORM_R + 0.15 ? PLATFORM_H * (1 - (r - PLATFORM_R + 0.05) / 0.2) : 0
            robot.position.set(x, lift, z)
            robot.rotation.y = Math.atan2(dx, dz)
            moving = true
            // Emit behind the robot.
            const kind = trailKindRef.current
            spawnAcc += dt * (kind === 'trail-rainbow' || kind === 'trail-plasma' ? 140 : kind ? 90 : 40)
            const fx = Math.sin(robot.rotation.y)
            const fz = Math.cos(robot.rotation.y)
            while (spawnAcc >= 1) {
              spawnAcc -= 1
              at.set(x - fx * 0.32, lift + 0.22, z - fz * 0.32)
              spawn(trail, trailKindRef.current, at, t, rand)
            }
          }
        }
        animateRobot(robot, t, { moving, reducedMotion: reduced })
      }
      ;(trail.points.material as THREE.PointsMaterial).size = trailKindRef.current === 'trail-plasma' ? 0.2 : trailKindRef.current === 'trail-rainbow' ? 0.13 : 0.09
      stepTrail(trail, dt, trailKindRef.current, t)
      controls.update()
      // Let trail particles fade out before a reduced-motion scene goes to sleep.
      if (moving) awakeUntil = Math.max(awakeUntil, performance.now() + 1800)
      if (!needsFrames()) stage.setActive(false)
    })

    cb.current.onReady()

    return () => {
      io.disconnect()
      ro.disconnect()
      wakeRef.current = () => undefined
      controls.removeEventListener('change', wake)
      controls.dispose()
      robotRef.current = null
      turntableRef.current = null
      mirror.getRenderTarget().dispose()
      stage.dispose()
      stageRef.current = null
    }
  }, [])

  // ── (Re)build the robot when its design or look changes ──
  useEffect(() => {
    const stage = stageRef.current
    const turntable = turntableRef.current
    if (!stage || !turntable) return
    const old = robotRef.current
    const robot = buildRobot(design)
    applySkin(robot, design.primary, look.skin)
    addDecal(robot, look.decal)
    if (look.booster) addBooster(robot)
    if (old) {
      robot.position.copy(old.position)
      robot.rotation.copy(old.rotation)
      old.parent?.remove(old)
      disposeObject(old)
    } else {
      robot.position.set(0, PLATFORM_H, 0)
    }
    ;(driveRef.current ? stage.scene : turntable).add(robot)
    robotRef.current = robot
    wakeRef.current()
  }, [design, look.skin, look.decal, look.booster])

  useEffect(() => {
    trailKindRef.current = look.trail
  }, [look.trail])

  // ── Start a test drive ──
  useEffect(() => {
    if (!driveToken) return
    const stage = stageRef.current
    const robot = robotRef.current
    const turntable = turntableRef.current
    if (!stage || !robot || !turntable) return
    // Leave the turntable: drive in world space from the bay's centre.
    turntable.rotation.y = 0
    robot.rotation.y = 0
    robot.position.set(0, PLATFORM_H, 0)
    stage.scene.add(robot)
    driveRef.current = { start: -1, token: driveToken }
    wakeRef.current()
  }, [driveToken])

  return <div ref={hostRef} role="img" aria-label={label} className="absolute inset-0" />
}
