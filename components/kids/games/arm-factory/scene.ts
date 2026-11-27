// components/kids/games/arm-factory/scene.ts
// The 3D view of the factory cell (three.js). It only DRAWS the simulation in
// sim.ts; it never decides anything. All art is built here from primitives and
// canvas textures — original, no external assets.

import * as THREE from 'three'
import { kidsRenderHints } from '@/lib/kids/settings'
import { guardWebGLContext } from '@/components/kids/three/stage'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { L1, L2, SHOULDER_H, TOOL, reachRing, type Joints, type V3 } from './kinematics'
import {
  BELT_HALF_W,
  BELT_TOP,
  BELT_X0,
  BELT_X1,
  BELT_Z,
  BINS,
  BIN_H,
  BIN_INNER,
  BIN_WALL,
  COLOR_HEX,
  COLOR_SYMBOL,
  PART_SIZE,
  PILLAR,
  SENSOR_X,
  type ArmSim,
  type PartColor,
} from './sim'

export type CamPreset = 'front' | 'top' | 'side'

export interface GhostSpec {
  joints: Joints
  color: number
}

export interface SceneExtras {
  ghosts: GhostSpec[]
  target: { p: V3; ok: boolean } | null
  /** Show the reach ring for a fingertip at this height. */
  ringHeight: number | null
  path: { pts: V3[]; bad: boolean[] } | null
  /** Part id whose centre is between the open fingers. */
  graspReady: number | null
  dropLine: boolean
  gate: 'none' | 'zone' | 'sensor'
}

interface Rig {
  root: THREE.Group
  yaw: THREE.Group
  shoulder: THREE.Group
  elbow: THREE.Group
  wrist: THREE.Group
  fingerA: THREE.Object3D
  fingerB: THREE.Object3D
}

const CAMS: Record<CamPreset, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  front: { pos: new THREE.Vector3(0.95, 2.25, 1.2), look: new THREE.Vector3(-0.02, 0.02, -0.12) },
  top: { pos: new THREE.Vector3(0, 2.75, 0.02), look: new THREE.Vector3(0, 0, -0.02) },
  side: { pos: new THREE.Vector3(2.1, 0.95, 0.35), look: new THREE.Vector3(0, 0.2, -0.05) },
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d') as CanvasRenderingContext2D
  draw(g)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

export class FactoryScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40)
  private camPreset: CamPreset = 'front'
  private camPos = CAMS.front.pos.clone()
  private camLook = CAMS.front.look.clone()
  private shakeT = 0
  private reduced: boolean
  private arm: Rig
  private ghosts: Rig[] = []
  private partMeshes = new Map<number, THREE.Group>()
  private partMats = new Map<string, THREE.Material[]>()
  private partGeo = new RoundedBoxGeometry(PART_SIZE, PART_SIZE, PART_SIZE, 3, 0.008)
  private bandGeo = new THREE.BoxGeometry(PART_SIZE + 0.006, 0.016, PART_SIZE + 0.006)
  private bandMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.3 })
  private beltTex: THREE.CanvasTexture
  private pickables: THREE.Object3D[] = []
  private raycaster = new THREE.Raycaster()
  private target: THREE.Group
  private targetMat: THREE.MeshBasicMaterial
  private targetLine: THREE.Line
  private ring: THREE.Mesh
  private ringEdge: THREE.LineLoop
  private ringH = NaN
  private pathLine: THREE.Line
  private pathDots: THREE.Points
  /** The plan the path buffers were last built from (rebuilt only on change). */
  private pathSrc: SceneExtras['path'] = null
  private dropLine: THREE.Line
  private dropDot: THREE.Mesh
  private graspRing: THREE.Mesh
  private gate: THREE.Group
  private gateLight: THREE.MeshStandardMaterial
  private particles: THREE.Points
  private pPos: Float32Array
  private pVel: Float32Array
  private pCol: Float32Array
  private pLife: Float32Array
  private pNext = 0
  private time = 0
  private unguard: () => void = () => {}

  constructor(canvas: HTMLCanvasElement, opts: { pillar: boolean; reducedMotion: boolean }) {
    this.reduced = opts.reducedMotion
    // Settings → Lite graphics: lower pixel ratio, no antialias, no shadows.
    const hints = kidsRenderHints(2)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: hints.antialias, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(hints.dpr)
    this.renderer.shadowMap.enabled = hints.shadows
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    // No black screens (roadmap #16): a lost GPU context shows the "3D is resting" poster.
    if (canvas.parentElement) this.unguard = guardWebGLContext(this.renderer, canvas.parentElement)

    const s = this.scene
    s.background = new THREE.Color(0x0b1024)
    s.fog = new THREE.Fog(0x0b1024, 4.5, 9)

    s.add(new THREE.HemisphereLight(0xc7d7ff, 0x1a1530, 0.85))
    const sun = new THREE.DirectionalLight(0xffffff, 1.7)
    sun.position.set(1.4, 3.2, 2.1)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    const sc = sun.shadow.camera
    sc.left = -1.8
    sc.right = 1.8
    sc.top = 1.8
    sc.bottom = -1.8
    sc.near = 0.5
    sc.far = 7
    sun.shadow.bias = -0.0008
    s.add(sun)
    const rim = new THREE.PointLight(0xf59e0b, 1.2, 4)
    rim.position.set(-1.3, 1.2, -1.2)
    s.add(rim)

    // Floor: dark tiles with a hazard border around the robot cell.
    const floorTex = canvasTexture(1024, 1024, (g) => {
      g.fillStyle = '#111a2e'
      g.fillRect(0, 0, 1024, 1024)
      g.strokeStyle = 'rgba(148,163,184,0.12)'
      g.lineWidth = 2
      for (let i = 0; i <= 1024; i += 1024 / 32) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i, 1024)
        g.stroke()
        g.beginPath()
        g.moveTo(0, i)
        g.lineTo(1024, i)
        g.stroke()
      }
      // hazard band
      const m = 128
      g.save()
      g.beginPath()
      g.rect(m - 18, m - 18, 1024 - 2 * m + 36, 1024 - 2 * m + 36)
      g.rect(m, m, 1024 - 2 * m, 1024 - 2 * m)
      g.clip('evenodd')
      g.fillStyle = '#facc15'
      g.fillRect(0, 0, 1024, 1024)
      g.fillStyle = '#0f172a'
      for (let k = -1024; k < 2048; k += 36) {
        g.beginPath()
        g.moveTo(k, 0)
        g.lineTo(k + 18, 0)
        g.lineTo(k + 18 + 1024, 1024)
        g.lineTo(k + 1024, 1024)
        g.fill()
      }
      g.restore()
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    s.add(floor)
    this.pickables.push(floor)
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1 }))
    outer.rotation.x = -Math.PI / 2
    outer.position.y = -0.002
    s.add(outer)

    this.beltTex = this.buildConveyor()
    this.buildBins()
    if (opts.pillar) this.buildPillar()

    // Gate (pick zone marker / sensor).
    this.gateLight = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.4 })
    this.gate = this.buildGate()
    s.add(this.gate)

    // The robot.
    const metal = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.35 })
    const body = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.25, roughness: 0.38 })
    const led = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.4 })
    this.arm = this.buildRig({ body, metal, led }, false)
    s.add(this.arm.root)
    for (let i = 0; i < 2; i++) {
      const gm = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.28, depthWrite: false })
      const g = this.buildRig({ body: gm, metal: gm, led: gm }, true)
      g.root.visible = false
      s.add(g.root)
      this.ghosts.push(g)
    }

    // Target marker.
    this.targetMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95 })
    this.target = new THREE.Group()
    const tRing = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.045, 40), this.targetMat)
    tRing.rotation.x = -Math.PI / 2
    tRing.name = 'ground'
    this.target.add(tRing)
    const tBall = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), this.targetMat)
    tBall.name = 'ball'
    this.target.add(tBall)
    this.targetLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6 }))
    this.target.add(this.targetLine)
    this.target.visible = false
    s.add(this.target)

    // Reach ring.
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.2, 96), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }))
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.003
    this.ring.visible = false
    s.add(this.ring)
    this.ringEdge = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 }))
    this.ringEdge.position.y = 0.004
    this.ringEdge.visible = false
    s.add(this.ringEdge)

    // Planned path.
    this.pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false }))
    this.pathLine.visible = false
    s.add(this.pathLine)
    this.pathDots = new THREE.Points(this.pathLine.geometry, new THREE.PointsMaterial({ size: 0.022, vertexColors: true, toneMapped: false }))
    this.pathDots.visible = false
    s.add(this.pathDots)

    // Drop line from the fingertips to whatever is below.
    this.dropLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.02, gapSize: 0.015, transparent: true, opacity: 0.7 }),
    )
    s.add(this.dropLine)
    this.dropDot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }))
    this.dropDot.rotation.x = -Math.PI / 2
    s.add(this.dropDot)

    this.graspRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 40), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9 }))
    this.graspRing.rotation.x = Math.PI / 2
    this.graspRing.visible = false
    s.add(this.graspRing)

    // Particles.
    const N = 260
    this.pPos = new Float32Array(N * 3)
    this.pVel = new Float32Array(N * 3)
    this.pCol = new Float32Array(N * 3)
    this.pLife = new Float32Array(N)
    for (let i = 0; i < N; i++) this.pPos[i * 3 + 1] = -10
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3))
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3))
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.028, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }))
    this.particles.frustumCulled = false
    s.add(this.particles)
  }

  // ── Builders ──

  private buildConveyor(): THREE.CanvasTexture {
    const s = this.scene
    const len = BELT_X1 - BELT_X0
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 })
    const frame = new THREE.Mesh(new THREE.BoxGeometry(len, BELT_TOP - 0.012, BELT_HALF_W * 2 + 0.03), frameMat)
    frame.position.set((BELT_X0 + BELT_X1) / 2, (BELT_TOP - 0.012) / 2, BELT_Z)
    frame.castShadow = true
    frame.receiveShadow = true
    s.add(frame)
    this.pickables.push(frame)
    const tex = canvasTexture(256, 64, (g) => {
      g.fillStyle = '#1e293b'
      g.fillRect(0, 0, 256, 64)
      g.fillStyle = '#273449'
      for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 12, 64)
      g.fillStyle = 'rgba(250,204,21,0.25)'
      g.fillRect(0, 0, 256, 3)
      g.fillRect(0, 61, 256, 3)
    })
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.set(len / 0.4, 1)
    const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, BELT_HALF_W * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }))
    belt.position.set((BELT_X0 + BELT_X1) / 2, BELT_TOP - 0.006, BELT_Z)
    belt.receiveShadow = true
    s.add(belt)
    this.pickables.push(belt)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 0.012), railMat)
      rail.position.set((BELT_X0 + BELT_X1) / 2, BELT_TOP + 0.002, BELT_Z + side * (BELT_HALF_W + 0.012))
      rail.castShadow = true
      s.add(rail)
    }
    for (const x of [BELT_X0, BELT_X1]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, BELT_HALF_W * 2 + 0.03, 20), railMat)
      roller.rotation.x = Math.PI / 2
      roller.position.set(x, BELT_TOP - 0.05, BELT_Z)
      s.add(roller)
    }
    // Reject chute at the end of the belt.
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 }))
    chute.position.set(BELT_X1 + 0.18, 0.06, BELT_Z)
    s.add(chute)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.07),
      new THREE.MeshBasicMaterial({
        map: canvasTexture(256, 64, (g) => {
          g.fillStyle = '#7f1d1d'
          g.fillRect(0, 0, 256, 64)
          g.fillStyle = '#fecaca'
          g.font = 'bold 34px system-ui, sans-serif'
          g.textAlign = 'center'
          g.fillText('MISSED', 128, 45)
        }),
      }),
    )
    sign.position.set(BELT_X1 + 0.18, 0.08, BELT_Z + 0.172)
    s.add(sign)
    return tex
  }

  private buildBins(): void {
    const s = this.scene
    for (const b of BINS) {
      const col = COLOR_HEX[b.color]
      const wallMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.1 })
      const floorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.35), roughness: 0.8 })
      const h = BIN_INNER / 2
      const t = BIN_WALL
      const walls: [number, number, number, number, number][] = [
        [b.x, b.z - h - t / 2, BIN_INNER + 2 * t, t, 0],
        [b.x, b.z + h + t / 2, BIN_INNER + 2 * t, t, 0],
        [b.x - h - t / 2, b.z, t, BIN_INNER, 0],
        [b.x + h + t / 2, b.z, t, BIN_INNER, 0],
      ]
      for (const [x, z, w, d] of walls) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, BIN_H, d), wallMat)
        m.position.set(x, BIN_H / 2, z)
        m.castShadow = true
        m.receiveShadow = true
        s.add(m)
      }
      const fl = new THREE.Mesh(new THREE.BoxGeometry(BIN_INNER, BIN_WALL, BIN_INNER), floorMat)
      fl.position.set(b.x, BIN_WALL / 2, b.z)
      fl.receiveShadow = true
      s.add(fl)
      this.pickables.push(fl)
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.1),
        new THREE.MeshBasicMaterial({
          transparent: true,
          map: canvasTexture(256, 128, (g) => {
            g.fillStyle = 'rgba(15,23,42,0.85)'
            g.beginPath()
            g.roundRect(4, 4, 248, 120, 22)
            g.fill()
            g.fillStyle = hexCss(col)
            g.font = 'bold 72px system-ui, sans-serif'
            g.textAlign = 'center'
            g.fillText(COLOR_SYMBOL[b.color], 64, 92)
            g.font = 'bold 40px system-ui, sans-serif'
            g.fillStyle = '#fff'
            g.fillText(b.color.toUpperCase(), 170, 80)
          }),
        }),
      )
      label.position.set(b.x, BIN_H * 0.55, b.z + h + t + 0.002)
      s.add(label)
    }
  }

  private buildPillar(): void {
    const w = PILLAR.max.x - PILLAR.min.x
    const d = PILLAR.max.z - PILLAR.min.z
    const hgt = PILLAR.max.y
    const tex = canvasTexture(128, 512, (g) => {
      g.fillStyle = '#facc15'
      g.fillRect(0, 0, 128, 512)
      g.fillStyle = '#111827'
      for (let y = -128; y < 640; y += 64) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(128, y + 64)
        g.lineTo(128, y + 96)
        g.lineTo(0, y + 32)
        g.fill()
      }
    })
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))
    m.position.set((PILLAR.min.x + PILLAR.max.x) / 2, hgt / 2, (PILLAR.min.z + PILLAR.max.z) / 2)
    m.castShadow = true
    m.receiveShadow = true
    this.scene.add(m)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 }))
    cap.position.set(m.position.x, hgt + 0.015, m.position.z)
    this.scene.add(cap)
  }

  private buildGate(): THREE.Group {
    const g = new THREE.Group()
    const post = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 })
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), post)
      p.position.set(SENSOR_X, 0.15, BELT_Z + side * (BELT_HALF_W + 0.04))
      g.add(p)
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, BELT_HALF_W * 2 + 0.1), post)
    bar.position.set(SENSOR_X, 0.3, BELT_Z)
    g.add(bar)
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), this.gateLight)
    light.position.set(SENSOR_X, 0.32, BELT_Z + BELT_HALF_W + 0.04)
    g.add(light)
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.008, BELT_HALF_W * 2 + 0.06),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    )
    beam.rotation.x = -Math.PI / 2
    beam.position.set(SENSOR_X, BELT_TOP + 0.035, BELT_Z)
    beam.name = 'beam'
    g.add(beam)
    g.visible = false
    return g
  }

  private buildRig(m: { body: THREE.Material; metal: THREE.Material; led: THREE.Material }, ghost: boolean): Rig {
    const shadow = (o: THREE.Mesh) => {
      if (!ghost) {
        o.castShadow = true
        o.receiveShadow = true
      }
      return o
    }
    const root = new THREE.Group()
    if (!ghost) {
      const ped = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.05, 32), m.metal))
      ped.position.y = 0.025
      root.add(ped)
    }
    const yaw = new THREE.Group()
    root.add(yaw)
    const turret = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, SHOULDER_H - 0.05, 28), m.body))
    turret.position.y = 0.05 + (SHOULDER_H - 0.05) / 2 - 0.02
    yaw.add(turret)
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 40), m.led)
    ledRing.rotation.x = Math.PI / 2
    ledRing.position.y = 0.08
    yaw.add(ledRing)

    const shoulder = new THREE.Group()
    shoulder.position.y = SHOULDER_H
    yaw.add(shoulder)
    const sh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.16, 28), m.metal))
    sh.rotation.x = Math.PI / 2
    shoulder.add(sh)
    const upper = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.042, L1 - 0.06, 6, 16), m.body))
    upper.rotation.z = -Math.PI / 2
    upper.position.x = L1 / 2
    shoulder.add(upper)

    const elbow = new THREE.Group()
    elbow.position.x = L1
    shoulder.add(elbow)
    const el = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.13, 24), m.metal))
    el.rotation.x = Math.PI / 2
    elbow.add(el)
    const fore = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.034, L2 - 0.05, 6, 16), m.body))
    fore.rotation.z = -Math.PI / 2
    fore.position.x = L2 / 2
    elbow.add(fore)
    const elLed = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.005, 8, 32), m.led)
    elLed.position.z = 0.066
    elbow.add(elLed)

    const wrist = new THREE.Group()
    wrist.position.x = L2
    elbow.add(wrist)
    const wr = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.042, 20, 14), m.metal))
    wrist.add(wr)
    const stem = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, TOOL - 0.06, 18), m.metal))
    stem.position.y = -(TOOL - 0.06) / 2
    wrist.add(stem)
    const palm = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.13), m.body))
    palm.position.y = -(TOOL - 0.06) - 0.004
    wrist.add(palm)
    const fingerGeo = new THREE.BoxGeometry(0.03, 0.065, 0.012)
    const fingerA = shadow(new THREE.Mesh(fingerGeo, m.metal))
    const fingerB = shadow(new THREE.Mesh(fingerGeo, m.metal))
    fingerA.position.y = fingerB.position.y = -TOOL + 0.012
    wrist.add(fingerA, fingerB)
    return { root, yaw, shoulder, elbow, wrist, fingerA, fingerB }
  }

  private poseRig(r: Rig, j: Joints, gap: number): void {
    r.yaw.rotation.y = j[0]
    r.shoulder.rotation.z = j[1]
    r.elbow.rotation.z = j[2]
    r.wrist.rotation.z = -(j[1] + j[2])
    r.fingerA.position.z = gap / 2 + 0.006
    r.fingerB.position.z = -gap / 2 - 0.006
  }

  private partGroup(color: PartColor, heavy: boolean): THREE.Group {
    const key = `${color}-${heavy}`
    let mats = this.partMats.get(key)
    if (!mats) {
      const base = new THREE.Color(COLOR_HEX[color])
      if (heavy) base.multiplyScalar(0.7)
      const side = new THREE.MeshStandardMaterial({ color: base, roughness: heavy ? 0.3 : 0.45, metalness: heavy ? 0.6 : 0.05 })
      const top = new THREE.MeshStandardMaterial({
        roughness: 0.45,
        metalness: heavy ? 0.5 : 0.05,
        map: canvasTexture(128, 128, (g) => {
          g.fillStyle = hexCss(base.getHex())
          g.fillRect(0, 0, 128, 128)
          g.fillStyle = 'rgba(255,255,255,0.92)'
          g.font = 'bold 84px system-ui, sans-serif'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillText(COLOR_SYMBOL[color], 64, 70)
        }),
      })
      mats = [side, side, top, side, side, side]
      this.partMats.set(key, mats)
    }
    const grp = new THREE.Group()
    const box = new THREE.Mesh(this.partGeo, mats)
    box.castShadow = true
    box.receiveShadow = true
    box.userData.part = true
    grp.add(box)
    this.pickables.push(box)
    if (heavy) {
      const band = new THREE.Mesh(this.bandGeo, this.bandMat)
      grp.add(band)
    }
    return grp
  }

  // ── Effects ──

  burst(p: V3, color: number, n = 40, speed = 1.2): void {
    const count = this.reduced ? Math.min(8, n) : n
    const c = new THREE.Color(color)
    const N = this.pLife.length
    for (let k = 0; k < count; k++) {
      const i = this.pNext
      this.pNext = (this.pNext + 1) % N
      this.pPos[i * 3] = p.x
      this.pPos[i * 3 + 1] = p.y
      this.pPos[i * 3 + 2] = p.z
      const th = Math.random() * Math.PI * 2
      const up = 0.4 + Math.random() * 0.9
      const sp = speed * (0.3 + Math.random() * 0.7)
      this.pVel[i * 3] = Math.cos(th) * sp * 0.6
      this.pVel[i * 3 + 1] = up * sp
      this.pVel[i * 3 + 2] = Math.sin(th) * sp * 0.6
      const tint = 0.75 + Math.random() * 0.25
      this.pCol[i * 3] = c.r * tint + (1 - tint)
      this.pCol[i * 3 + 1] = c.g * tint + (1 - tint)
      this.pCol[i * 3 + 2] = c.b * tint + (1 - tint)
      this.pLife[i] = 0.7 + Math.random() * 0.5
    }
  }

  shake(): void {
    if (!this.reduced) this.shakeT = 0.35
  }

  setCamera(p: CamPreset): void {
    this.camPreset = p
    if (this.reduced) {
      this.camPos.copy(CAMS[p].pos)
      this.camLook.copy(CAMS[p].look)
    }
  }

  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.fov = w / h < 1.15 ? 56 : 42
    this.camera.updateProjectionMatrix()
  }

  /** Where on the floor / belt / bins did the child tap? (top-down x, z) */
  pick(ndcX: number, ndcY: number): V3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera)
    const hits = this.raycaster.intersectObjects(this.pickables, false)
    if (!hits.length) return null
    const p = hits[0].point
    return { x: p.x, y: p.y, z: p.z }
  }

  // ── Per frame ──

  update(sim: ArmSim, x: SceneExtras, dt: number): void {
    this.time += dt
    const heldGap = 0.064
    const closedGap = sim.held ? heldGap : 0.02
    const gap = 0.1 - (0.1 - closedGap) * sim.grip
    this.poseRig(this.arm, sim.j, gap)

    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i]
      const spec = x.ghosts[i]
      g.root.visible = !!spec
      if (spec) {
        this.poseRig(g, spec.joints, 0.1)
        g.root.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (mesh.isMesh) (mesh.material as THREE.MeshBasicMaterial).color.setHex(spec.color)
        })
      }
    }

    // Parts
    const seen = new Set<number>()
    for (const p of sim.parts) {
      seen.add(p.id)
      let m = this.partMeshes.get(p.id)
      if (!m) {
        m = this.partGroup(p.color, p.heavy)
        this.partMeshes.set(p.id, m)
        this.scene.add(m)
      }
      m.visible = p.state !== 'rejected'
      m.position.set(p.pos.x, p.pos.y, p.pos.z)
      if (p.state === 'held') m.rotation.y = sim.j[0]
    }
    for (const [id, m] of this.partMeshes) {
      if (!seen.has(id)) m.visible = false
    }

    this.beltTex.offset.x = -(sim.beltTravel / 0.4) % 1

    // Gate
    this.gate.visible = x.gate !== 'none'
    if (x.gate !== 'none') {
      const at = sim.partAtSensor()
      const col = x.gate === 'sensor' ? (at ? 0xef4444 : 0x22c55e) : 0xf59e0b
      this.gateLight.color.setHex(col)
      this.gateLight.emissive.setHex(col)
      const beam = this.gate.getObjectByName('beam')
      if (beam) beam.visible = x.gate === 'sensor'
    }

    // Target marker
    if (x.target) {
      this.target.visible = true
      this.target.position.set(x.target.p.x, 0.004, x.target.p.z)
      const ball = this.target.getObjectByName('ball')
      if (ball) ball.position.y = x.target.p.y
      this.targetLine.scale.y = Math.max(0.001, x.target.p.y)
      const c = x.target.ok ? 0x22d3ee : 0xef4444
      this.targetMat.color.setHex(c)
      ;(this.targetLine.material as THREE.LineBasicMaterial).color.setHex(c)
    } else this.target.visible = false

    // Reach ring
    if (x.ringHeight !== null) {
      const h = Math.round(x.ringHeight * 100) / 100
      if (h !== this.ringH) {
        this.ringH = h
        const rr = reachRing(h)
        if (rr) {
          this.ring.geometry.dispose()
          this.ring.geometry = new THREE.RingGeometry(Math.max(0.001, rr.rMin), rr.rMax, 96)
          const pts: THREE.Vector3[] = []
          for (let i = 0; i < 96; i++) {
            const a = (i / 96) * Math.PI * 2
            pts.push(new THREE.Vector3(Math.cos(a) * rr.rMax, 0, Math.sin(a) * rr.rMax))
          }
          this.ringEdge.geometry.dispose()
          this.ringEdge.geometry = new THREE.BufferGeometry().setFromPoints(pts)
        }
      }
      this.ring.visible = this.ringEdge.visible = !!reachRing(h)
    } else {
      this.ring.visible = this.ringEdge.visible = false
    }

    // Planned path
    if (x.path && x.path.pts.length > 1) {
      if (x.path !== this.pathSrc) this.buildPath(x.path)
      this.pathLine.visible = this.pathDots.visible = true
    } else this.pathLine.visible = this.pathDots.visible = false

    // Drop line
    const tip = sim.tip
    const ready = x.graspReady !== null
    this.dropLine.visible = this.dropDot.visible = x.dropLine
    if (x.dropLine) {
      const below = this.surfaceBelow(tip.x, tip.z)
      const geo = this.dropLine.geometry
      geo.setFromPoints([new THREE.Vector3(tip.x, tip.y, tip.z), new THREE.Vector3(tip.x, below + 0.002, tip.z)])
      this.dropLine.computeLineDistances()
      this.dropDot.position.set(tip.x, below + 0.004, tip.z)
      const c = ready ? 0x4ade80 : 0xffffff
      ;(this.dropLine.material as THREE.LineDashedMaterial).color.setHex(c)
      ;(this.dropDot.material as THREE.MeshBasicMaterial).color.setHex(c)
    }
    this.graspRing.visible = false
    if (ready) {
      const p = sim.parts.find((q) => q.id === x.graspReady)
      if (p) {
        this.graspRing.visible = true
        this.graspRing.position.set(p.pos.x, p.pos.y - 0.025, p.pos.z)
        const s = 1 + 0.12 * Math.sin(this.time * 8)
        this.graspRing.scale.set(s, s, s)
      }
    }

    // Particles
    const N = this.pLife.length
    for (let i = 0; i < N; i++) {
      if (this.pLife[i] <= 0) continue
      this.pLife[i] -= dt
      this.pVel[i * 3 + 1] -= 3.5 * dt
      this.pPos[i * 3] += this.pVel[i * 3] * dt
      this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * dt
      this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * dt
      if (this.pLife[i] <= 0) this.pPos[i * 3 + 1] = -10
    }
    ;(this.particles.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(this.particles.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true

    // Camera
    const target = CAMS[this.camPreset]
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 5)
    this.camPos.lerp(target.pos, k)
    this.camLook.lerp(target.look, k)
    this.camera.position.copy(this.camPos)
    if (this.shakeT > 0) {
      this.shakeT -= dt
      const a = this.shakeT * 0.05
      this.camera.position.x += (Math.random() - 0.5) * a
      this.camera.position.y += (Math.random() - 0.5) * a
    }
    this.camera.lookAt(this.camLook)
    this.renderer.render(this.scene, this.camera)
  }

  private surfaceBelow(x: number, z: number): number {
    for (const b of BINS) if (Math.abs(x - b.x) <= BIN_INNER / 2 && Math.abs(z - b.z) <= BIN_INNER / 2) return BIN_WALL
    if (x >= BELT_X0 && x <= BELT_X1 && Math.abs(z - BELT_Z) <= BELT_HALF_W) return BELT_TOP
    return 0
  }

  private buildPath(path: NonNullable<SceneExtras['path']>): void {
    this.pathSrc = path
    const n = path.pts.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const p = path.pts[i]
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      const bad = path.bad[i]
      col[i * 3] = bad ? 1 : 0.13
      col[i * 3 + 1] = bad ? 0.15 : 0.9
      col[i * 3 + 2] = bad ? 0.15 : 0.35
    }
    const g = this.pathLine.geometry
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.computeBoundingSphere()
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      const mats = Array.isArray(mat) ? mat : mat ? [mat] : []
      for (const m of mats) {
        const withMap = m as THREE.Material & { map?: THREE.Texture | null }
        withMap.map?.dispose()
        m.dispose()
      }
    })
    this.partGeo.dispose()
    this.bandGeo.dispose()
    this.unguard()
    this.renderer.dispose()
    // The owner creates a fresh <canvas> for every scene and never reuses one,
    // so release the GPU context now instead of waiting for the browser to
    // evict it ("Too many active WebGL contexts").
    this.renderer.forceContextLoss()
  }
}
