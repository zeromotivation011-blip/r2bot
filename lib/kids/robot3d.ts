// lib/kids/robot3d.ts
// Builds the child's robot in 3D from primitives (no model files), and
// animates it. Used by the Workshop, the AR/VR views and the Code Lab arena.
//
// Conventions: the robot stands on y = 0, faces +Z, and is about 1 unit tall.
// Only import this from client components that are loaded with
// next/dynamic({ ssr: false }) so three.js stays out of the shared bundle.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { upgradesOf, type RobotDesign, type SensorId, type Slot, type UpgradeSlot } from './robot-design'
import type { AnySlot } from './robot-growth'
import { WIRE_COLOR, wiringOf, type ComponentId, type WireSpec } from './robot-wiring'

export interface RobotHandles {
  slots: Record<Slot, THREE.Group>
  wheels: THREE.Object3D[]
  legs: THREE.Object3D[]
  antennaTip: THREE.Object3D | null
  blinkers: THREE.Object3D[]
  fingers: THREE.Object3D[]
  lightLens: THREE.MeshStandardMaterial | null
  lightBeam: THREE.PointLight | null
  penTip: THREE.Object3D | null
  bodyGroup: THREE.Group
  cargo: THREE.Object3D
  /** Upgrade slots (roadmap #33): power (solar panel), sensor2, arm. Empty groups when not fitted. */
  upgrades: Record<UpgradeSlot, THREE.Group>
  /** Spinning rotors / propellers of a World form. */
  rotors: THREE.Object3D[]
  /** Arm joints, shoulder first. */
  armJoints: THREE.Object3D[]
  /** X-ray (only built with `internals: true`): battery, brain, motor driver, motors and the wires. */
  internals: THREE.Group | null
  anchors: Partial<Record<ComponentId, THREE.Object3D>>
  wires: WireHandle[]
  wireGroup: THREE.Group | null
  /** Materials made to glow because the child learned that part. */
  glowMats: THREE.MeshStandardMaterial[]
  xray: boolean
  explode: number
  signal: { id: string; start: number } | null
  signalDot: THREE.Mesh | null
}

export interface WireHandle {
  spec: WireSpec
  curve: THREE.CatmullRomCurve3
  mesh: THREE.Mesh
  /** A fat, invisible tube that is easy to tap on a phone. */
  pick: THREE.Mesh
}

export interface BuildOptions {
  /** Draw the World form (drone / sub / humanoid) instead of the ground drive. Only the Workshop does. */
  worldForm?: boolean
  /** Build the X-ray insides (battery, brain, driver, motors, wires); hidden until setXray(). */
  internals?: boolean
  /** Slots whose part glows (the child learned it). */
  learned?: readonly AnySlot[]
}

export interface RobotAnimState {
  /** True while driving: wheels spin, legs walk. */
  moving: boolean
  /** -1 when reversing. */
  direction?: number
  lightOn?: boolean
  carrying?: boolean
  reducedMotion?: boolean
}

const handlesMap = new WeakMap<THREE.Object3D, RobotHandles>()

export function getRobotHandles(group: THREE.Object3D): RobotHandles | undefined {
  return handlesMap.get(group)
}

// ── Materials ──────────────────────────────────────────────────────────────
function plastic(color: string | number, rough = 0.42): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.08 })
}
function metal(color: string | number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.75 })
}
function glow(color: string | number, intensity = 1.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 })
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = cast
  m.receiveShadow = true
  return m
}

interface BodySpec {
  /** Height of the body's bottom above the floor. */
  lift: number
  top: number
  halfWidth: number
  front: number
  back: number
}

const DRIVE_LIFT: Record<RobotDesign['drive'], number> = { wheels2: 0.2, wheels4: 0.2, tracks: 0.2, legs: 0.34 }
const FORM_LIFT = { drone: 0.22, sub: 0.16, humanoid: 0.52 } as const

// ── Bodies ─────────────────────────────────────────────────────────────────
function buildBody(d: RobotDesign, lift: number, primary: THREE.Material, accent: THREE.Material): { group: THREE.Group; spec: BodySpec } {
  const g = new THREE.Group()
  const white = plastic('#F8FAFC', 0.5)
  switch (d.body) {
    case 'box': {
      const h = 0.46
      const b = mesh(new RoundedBoxGeometry(0.72, h, 0.62, 4, 0.1), primary)
      b.position.y = lift + h / 2
      g.add(b)
      const stripe = mesh(new RoundedBoxGeometry(0.74, 0.08, 0.64, 2, 0.03), accent)
      stripe.position.y = lift + 0.12
      g.add(stripe)
      const panel = mesh(new RoundedBoxGeometry(0.36, 0.2, 0.04, 2, 0.02), white)
      panel.position.set(0, lift + 0.28, 0.31)
      g.add(panel)
      for (let i = 0; i < 3; i++) {
        const dot = mesh(new THREE.SphereGeometry(0.025, 12, 8), glow(['#22C55E', '#FACC15', '#EF4444'][i], 0.9), false)
        dot.position.set(-0.09 + i * 0.09, lift + 0.28, 0.335)
        g.add(dot)
      }
      return { group: g, spec: { lift, top: lift + h, halfWidth: 0.36, front: 0.31, back: -0.31 } }
    }
    case 'dome': {
      const skirt = mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.14, 40), accent)
      skirt.position.y = lift + 0.07
      g.add(skirt)
      const dome = mesh(new THREE.SphereGeometry(0.41, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), primary)
      dome.position.y = lift + 0.14
      dome.scale.y = 0.75
      g.add(dome)
      const ring = mesh(new THREE.TorusGeometry(0.42, 0.025, 10, 48), white)
      ring.rotation.x = Math.PI / 2
      ring.position.y = lift + 0.145
      g.add(ring)
      return { group: g, spec: { lift, top: lift + 0.14 + 0.41 * 0.75 - 0.02, halfWidth: 0.42, front: 0.38, back: -0.38 } }
    }
    case 'tall': {
      const h = 0.78
      const b = mesh(new THREE.CapsuleGeometry(0.27, h - 0.54, 8, 24), primary)
      b.position.y = lift + h / 2
      g.add(b)
      const belt = mesh(new THREE.TorusGeometry(0.275, 0.035, 10, 40), accent)
      belt.rotation.x = Math.PI / 2
      belt.position.y = lift + h * 0.42
      g.add(belt)
      const screen = mesh(new RoundedBoxGeometry(0.24, 0.14, 0.04, 2, 0.02), glow('#38BDF8', 0.5))
      screen.position.set(0, lift + h * 0.62, 0.255)
      g.add(screen)
      return { group: g, spec: { lift, top: lift + h - 0.04, halfWidth: 0.29, front: 0.27, back: -0.27 } }
    }
    case 'bug': {
      const shell = mesh(new THREE.SphereGeometry(0.36, 32, 20), primary)
      shell.scale.set(1, 0.6, 1.2)
      shell.position.y = lift + 0.2
      g.add(shell)
      const seam = mesh(new THREE.BoxGeometry(0.02, 0.05, 0.82), plastic('#1F2937'), false)
      seam.position.y = lift + 0.41
      g.add(seam)
      const spotMat = plastic('#1F2937', 0.6)
      const spots: [number, number][] = [[-0.16, 0.1], [0.16, 0.1], [-0.2, -0.16], [0.2, -0.16], [-0.1, -0.3], [0.1, -0.3]]
      for (const [x, z] of spots) {
        const s = mesh(new THREE.SphereGeometry(0.055, 12, 8), spotMat, false)
        s.scale.y = 0.4
        const y = lift + 0.2 + 0.6 * 0.36 * Math.sqrt(Math.max(0, 1 - (x / 0.36) ** 2 - (z / 0.43) ** 2))
        s.position.set(x, y - 0.005, z)
        g.add(s)
      }
      const belly = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 28), accent)
      belly.position.y = lift + 0.06
      belly.scale.z = 1.2
      g.add(belly)
      return { group: g, spec: { lift, top: lift + 0.4, halfWidth: 0.34, front: 0.42, back: -0.42 } }
    }
  }
}

// ── Drives ─────────────────────────────────────────────────────────────────
function wheel(radius: number, width: number, hub: THREE.Material): THREE.Group {
  const w = new THREE.Group()
  const tyre = mesh(new THREE.CylinderGeometry(radius, radius, width, 28), plastic('#1F2937', 0.8))
  tyre.rotation.z = Math.PI / 2
  w.add(tyre)
  const cap = mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.012, 20), hub)
  cap.rotation.z = Math.PI / 2
  w.add(cap)
  // Spokes make rotation visible.
  const spoke = mesh(new THREE.BoxGeometry(width + 0.02, radius * 0.18, radius * 1.1), plastic('#F8FAFC'), false)
  w.add(spoke)
  return w
}

function buildDrive(d: RobotDesign, spec: BodySpec, accent: THREE.Material, h: RobotHandles): THREE.Group {
  const g = new THREE.Group()
  const x = spec.halfWidth + 0.06
  switch (d.drive) {
    case 'wheels2': {
      for (const side of [-1, 1]) {
        const w = wheel(0.2, 0.1, accent)
        w.position.set(side * x, 0.2, 0.06)
        g.add(w)
        h.wheels.push(w)
      }
      const caster = mesh(new THREE.SphereGeometry(0.07, 16, 12), metal('#CBD5E1'))
      caster.position.set(0, 0.07, spec.back + 0.08)
      g.add(caster)
      const strut = mesh(new THREE.CylinderGeometry(0.03, 0.03, spec.lift - 0.07, 8), metal('#94A3B8'))
      strut.position.set(0, 0.07 + (spec.lift - 0.07) / 2, spec.back + 0.08)
      g.add(strut)
      break
    }
    case 'wheels4': {
      for (const side of [-1, 1]) {
        for (const z of [spec.front - 0.12, spec.back + 0.12]) {
          const w = wheel(0.17, 0.1, accent)
          w.position.set(side * x, 0.17, z)
          g.add(w)
          h.wheels.push(w)
        }
      }
      break
    }
    case 'tracks': {
      const len = spec.front - spec.back + 0.06
      for (const side of [-1, 1]) {
        const belt = mesh(new RoundedBoxGeometry(0.14, 0.26, len, 4, 0.12), plastic('#111827', 0.85))
        belt.position.set(side * (x + 0.01), 0.14, (spec.front + spec.back) / 2)
        g.add(belt)
        // Treads.
        const treadMat = plastic('#374151', 0.9)
        for (let i = 0; i < 6; i++) {
          const t = mesh(new THREE.BoxGeometry(0.15, 0.02, 0.04), treadMat, false)
          t.position.set(side * (x + 0.01), 0.275, spec.back + 0.04 + (i * (len - 0.1)) / 5)
          g.add(t)
        }
        for (const z of [spec.back + 0.1, (spec.front + spec.back) / 2, spec.front - 0.1]) {
          const w = wheel(0.08, 0.15, accent)
          w.position.set(side * (x + 0.02), 0.14, z)
          g.add(w)
          h.wheels.push(w)
        }
      }
      break
    }
    case 'legs': {
      const legMat = metal('#94A3B8')
      const footMat = plastic('#1F2937', 0.7)
      for (const side of [-1, 1]) {
        for (const z of [spec.front - 0.14, spec.back + 0.14]) {
          const hip = new THREE.Group()
          hip.position.set(side * (spec.halfWidth - 0.04), spec.lift + 0.02, z)
          const joint = mesh(new THREE.SphereGeometry(0.07, 16, 12), accent)
          hip.add(joint)
          const leg = mesh(new THREE.CylinderGeometry(0.045, 0.035, spec.lift - 0.04, 10), legMat)
          leg.position.y = -(spec.lift - 0.04) / 2
          hip.add(leg)
          const foot = mesh(new THREE.SphereGeometry(0.075, 16, 12), footMat)
          foot.scale.y = 0.6
          foot.position.y = -(spec.lift - 0.02) + 0.02
          hip.add(foot)
          g.add(hip)
          h.legs.push(hip)
        }
      }
      break
    }
  }
  return g
}

// ── Heads ──────────────────────────────────────────────────────────────────
function eye(radius: number): THREE.Group {
  const e = new THREE.Group()
  const white = mesh(new THREE.SphereGeometry(radius, 20, 14), plastic('#FFFFFF', 0.25), false)
  e.add(white)
  const pupil = mesh(new THREE.SphereGeometry(radius * 0.55, 16, 12), plastic('#0F172A', 0.2), false)
  pupil.position.z = radius * 0.62
  e.add(pupil)
  const shine = mesh(new THREE.SphereGeometry(radius * 0.16, 8, 6), glow('#FFFFFF', 1), false)
  shine.position.set(radius * 0.22, radius * 0.25, radius * 0.98)
  e.add(shine)
  return e
}

function buildHead(d: RobotDesign, spec: BodySpec, primary: THREE.Material, accent: THREE.Material, h: RobotHandles): THREE.Group {
  const g = new THREE.Group()
  g.position.y = spec.top
  const neck = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.08, 12), metal('#94A3B8'))
  neck.position.y = 0.03
  g.add(neck)
  switch (d.head) {
    case 'distance': {
      const plate = mesh(new RoundedBoxGeometry(0.5, 0.26, 0.2, 4, 0.08), accent)
      plate.position.y = 0.19
      g.add(plate)
      // Two ultrasonic "eyes": silver cans with mesh fronts, each with a cute pupil.
      for (const side of [-1, 1]) {
        const can = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 24), metal('#E2E8F0'))
        can.rotation.x = Math.PI / 2
        can.position.set(side * 0.12, 0.19, 0.12)
        g.add(can)
        const e = eye(0.06)
        e.position.set(side * 0.12, 0.19, 0.14)
        g.add(e)
        h.blinkers.push(e)
      }
      break
    }
    case 'camera': {
      const head = mesh(new RoundedBoxGeometry(0.42, 0.32, 0.32, 4, 0.1), primary)
      head.position.y = 0.22
      g.add(head)
      const bezel = mesh(new THREE.TorusGeometry(0.11, 0.03, 12, 32), accent)
      bezel.position.set(0, 0.22, 0.165)
      g.add(bezel)
      const lens = mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#0EA5E9', roughness: 0.05, metalness: 0.2, clearcoat: 1 }))
      lens.scale.z = 0.5
      lens.position.set(0, 0.22, 0.16)
      g.add(lens)
      h.blinkers.push(lens)
      const rec = mesh(new THREE.SphereGeometry(0.018, 8, 6), glow('#EF4444'), false)
      rec.position.set(0.15, 0.33, 0.16)
      g.add(rec)
      break
    }
    case 'antenna': {
      const head = mesh(new THREE.SphereGeometry(0.2, 28, 20), primary)
      head.position.y = 0.22
      g.add(head)
      for (const side of [-1, 1]) {
        const e = eye(0.055)
        e.position.set(side * 0.08, 0.25, 0.165)
        g.add(e)
        h.blinkers.push(e)
      }
      const stalk = new THREE.Group()
      stalk.position.y = 0.4
      const rod = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8), metal('#CBD5E1'))
      rod.position.y = 0.13
      stalk.add(rod)
      const tip = mesh(new THREE.SphereGeometry(0.045, 16, 12), glow('#F43F5E', 1.4))
      tip.position.y = 0.28
      stalk.add(tip)
      g.add(stalk)
      h.antennaTip = stalk
      break
    }
    case 'screen': {
      const frame = mesh(new RoundedBoxGeometry(0.5, 0.36, 0.14, 4, 0.06), accent)
      frame.position.y = 0.24
      g.add(frame)
      const screen = mesh(new RoundedBoxGeometry(0.42, 0.28, 0.02, 2, 0.03), plastic('#0B1020', 0.2), false)
      screen.position.set(0, 0.24, 0.07)
      g.add(screen)
      const faceMat = glow('#5EEAD4', 1.6)
      for (const side of [-1, 1]) {
        const e = mesh(new THREE.CapsuleGeometry(0.03, 0.05, 4, 10), faceMat, false)
        e.position.set(side * 0.08, 0.27, 0.085)
        g.add(e)
        h.blinkers.push(e)
      }
      const smile = mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI), faceMat, false)
      smile.rotation.z = Math.PI
      smile.position.set(0, 0.2, 0.085)
      g.add(smile)
      break
    }
  }
  return g
}

// ── Tools ──────────────────────────────────────────────────────────────────
function buildTool(d: RobotDesign, spec: BodySpec, accent: THREE.Material, h: RobotHandles): THREE.Group {
  const g = new THREE.Group()
  const midY = spec.lift + Math.min(0.2, (spec.top - spec.lift) / 2)
  switch (d.tool) {
    case 'none':
      break
    case 'gripper': {
      const arm = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 10), metal('#94A3B8'))
      arm.rotation.x = Math.PI / 2
      arm.position.set(0, midY, spec.front + 0.08)
      g.add(arm)
      const wrist = mesh(new THREE.SphereGeometry(0.07, 16, 12), accent)
      wrist.position.set(0, midY, spec.front + 0.19)
      g.add(wrist)
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group()
        pivot.position.set(side * 0.05, midY, spec.front + 0.21)
        const finger = mesh(new RoundedBoxGeometry(0.035, 0.06, 0.16, 2, 0.015), metal('#E2E8F0'))
        finger.position.z = 0.08
        pivot.add(finger)
        pivot.userData.side = side
        g.add(pivot)
        h.fingers.push(pivot)
      }
      break
    }
    case 'scoop': {
      const arm = mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), metal('#94A3B8'))
      for (const side of [-1, 1]) {
        const a = arm.clone()
        a.position.set(side * 0.16, midY - 0.04, spec.front + 0.07)
        g.add(a)
      }
      const scoop = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 24, 1, true, Math.PI / 2, Math.PI), accent)
      ;(scoop.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
      scoop.rotation.z = Math.PI / 2
      scoop.position.set(0, 0.13, spec.front + 0.18)
      g.add(scoop)
      break
    }
    case 'pen': {
      const holder = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), metal('#94A3B8'))
      holder.position.set(0, spec.lift - 0.02, spec.back + 0.02)
      g.add(holder)
      const pen = new THREE.Group()
      const body = mesh(new THREE.CylinderGeometry(0.035, 0.035, spec.lift, 12), accent)
      body.position.y = spec.lift / 2 + 0.03
      pen.add(body)
      const tip = mesh(new THREE.ConeGeometry(0.035, 0.06, 12), plastic('#111827'))
      tip.rotation.x = Math.PI
      tip.position.y = 0.03
      pen.add(tip)
      pen.position.set(0, 0, spec.back + 0.02)
      g.add(pen)
      h.penTip = pen
      break
    }
    case 'light': {
      const lampY = Math.max(spec.lift + 0.12, spec.top - 0.12)
      const housing = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 20), metal('#CBD5E1'))
      housing.rotation.x = Math.PI / 2
      housing.position.set(0, lampY, spec.front + 0.04)
      g.add(housing)
      const lensMat = new THREE.MeshStandardMaterial({ color: '#FEF9C3', emissive: '#FDE68A', emissiveIntensity: 0.25, roughness: 0.1 })
      const lens = mesh(new THREE.CircleGeometry(0.075, 20), lensMat, false)
      lens.position.set(0, lampY, spec.front + 0.101)
      g.add(lens)
      h.lightLens = lensMat
      const beam = new THREE.PointLight('#FDE68A', 0, 3.5, 1.5)
      beam.position.set(0, lampY, spec.front + 0.4)
      g.add(beam)
      h.lightBeam = beam
      break
    }
  }
  return g
}

// ── Floor sensors ──────────────────────────────────────────────────────────
function buildSensor(id: SensorId, spec: BodySpec, accent: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const y = Math.max(0.06, spec.lift - 0.04)
  switch (id) {
    case 'none':
      break
    case 'line': {
      const bar = mesh(new THREE.BoxGeometry(0.3, 0.04, 0.07), plastic('#1F2937'))
      bar.position.set(0, y, spec.front - 0.04)
      g.add(bar)
      for (let i = -1; i <= 1; i++) {
        const led = mesh(new THREE.SphereGeometry(0.02, 8, 6), glow('#EF4444', 1.5), false)
        led.position.set(i * 0.09, y - 0.025, spec.front - 0.04)
        g.add(led)
      }
      break
    }
    case 'color': {
      const box = mesh(new RoundedBoxGeometry(0.14, 0.05, 0.1, 2, 0.02), plastic('#1F2937'))
      box.position.set(0, y, spec.front - 0.05)
      g.add(box)
      ;['#EF4444', '#22C55E', '#3B82F6'].forEach((c, i) => {
        const led = mesh(new THREE.SphereGeometry(0.016, 8, 6), glow(c, 1.6), false)
        led.position.set(-0.035 + i * 0.035, y - 0.03, spec.front - 0.05)
        g.add(led)
      })
      break
    }
    case 'bumper': {
      const bump = mesh(new THREE.TorusGeometry(spec.halfWidth + 0.04, 0.035, 10, 32, Math.PI * 0.75), accent)
      bump.rotation.x = Math.PI / 2
      bump.rotation.z = Math.PI * 0.125 // arc centred on the front (+Z)
      bump.position.set(0, y + 0.04, 0)
      g.add(bump)
      break
    }
  }
  return g
}

// ── World forms (roadmap #33): drone, sub, humanoid — replace the drive ─────
function buildForm(form: 'drone' | 'sub' | 'humanoid', spec: BodySpec, accent: THREE.Material, h: RobotHandles): THREE.Group {
  const g = new THREE.Group()
  const dark = plastic('#1F2937', 0.7)
  const steel = metal('#94A3B8')
  switch (form) {
    case 'drone': {
      // Landing skids under the body, four arms with rotors around it.
      for (const side of [-1, 1]) {
        const skid = mesh(new THREE.CapsuleGeometry(0.025, spec.front - spec.back + 0.1, 4, 10), dark)
        skid.rotation.x = Math.PI / 2
        skid.position.set(side * (spec.halfWidth * 0.7), 0.03, (spec.front + spec.back) / 2)
        g.add(skid)
        for (const z of [spec.front * 0.6, spec.back * 0.6]) {
          const strut = mesh(new THREE.CylinderGeometry(0.018, 0.018, spec.lift, 8), steel)
          strut.position.set(side * (spec.halfWidth * 0.7), spec.lift / 2 + 0.02, z)
          g.add(strut)
        }
      }
      const y = spec.top - 0.06
      const reach = Math.max(spec.halfWidth, spec.front) + 0.32
      const blade = plastic('#E2E8F0', 0.3)
      ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
        const len = reach * Math.SQRT2 * 0.72
        const arm = mesh(new THREE.BoxGeometry(0.05, 0.04, len), steel)
        arm.position.set((sx * reach) / 2.4, y, (sz * reach) / 2.4)
        arm.rotation.y = Math.atan2(sx, sz)
        g.add(arm)
        const hub = new THREE.Group()
        hub.position.set((sx * reach) / 1.25, y + 0.05, (sz * reach) / 1.25)
        const motor = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16), accent)
        hub.add(motor)
        const rotor = new THREE.Group()
        rotor.position.y = 0.05
        const b1 = mesh(new THREE.BoxGeometry(0.42, 0.008, 0.045), blade, false)
        const b2 = b1.clone()
        b2.rotation.y = Math.PI / 2
        rotor.add(b1, b2)
        rotor.userData.spin = i % 2 === 0 ? 1 : -1
        hub.add(rotor)
        g.add(hub)
        h.rotors.push(rotor)
      })
      break
    }
    case 'sub': {
      // Two floats along the sides, fins and a shrouded propeller at the back.
      const len = spec.front - spec.back + 0.2
      for (const side of [-1, 1]) {
        const pontoon = mesh(new THREE.CapsuleGeometry(0.09, len, 8, 20), accent)
        pontoon.rotation.x = Math.PI / 2
        pontoon.position.set(side * (spec.halfWidth + 0.06), 0.11, (spec.front + spec.back) / 2)
        g.add(pontoon)
        const fin = mesh(new THREE.BoxGeometry(0.16, 0.02, 0.12), dark)
        fin.position.set(side * (spec.halfWidth + 0.2), 0.11, spec.back + 0.02)
        g.add(fin)
      }
      const prop = new THREE.Group()
      prop.position.set(0, spec.lift + 0.12, spec.back - 0.12)
      const shroud = mesh(new THREE.TorusGeometry(0.11, 0.02, 10, 28), steel)
      prop.add(shroud)
      const spinner = new THREE.Group()
      for (let i = 0; i < 3; i++) {
        const b = mesh(new THREE.BoxGeometry(0.03, 0.18, 0.01), plastic('#FACC15', 0.4), false)
        b.rotation.z = (i * Math.PI * 2) / 3
        b.rotation.y = 0.4
        spinner.add(b)
      }
      spinner.userData.spin = 1
      spinner.userData.axis = 'z'
      prop.add(spinner)
      g.add(prop)
      h.rotors.push(spinner)
      const lamp = mesh(new THREE.SphereGeometry(0.04, 12, 8), glow('#00E5FF', 0.8), false)
      lamp.position.set(0, 0.11, spec.front + 0.12)
      g.add(lamp)
      break
    }
    case 'humanoid': {
      // Two legs (hip, knee, foot) and two arms at the shoulders.
      for (const side of [-1, 1]) {
        const hip = new THREE.Group()
        hip.position.set(side * spec.halfWidth * 0.5, spec.lift, 0)
        const joint = mesh(new THREE.SphereGeometry(0.065, 14, 10), accent)
        hip.add(joint)
        const thigh = mesh(new THREE.CapsuleGeometry(0.05, spec.lift * 0.42, 6, 12), steel)
        thigh.position.y = -spec.lift * 0.27
        hip.add(thigh)
        const knee = mesh(new THREE.SphereGeometry(0.055, 12, 8), accent)
        knee.position.y = -spec.lift * 0.52
        hip.add(knee)
        const shin = mesh(new THREE.CapsuleGeometry(0.045, spec.lift * 0.36, 6, 12), steel)
        shin.position.y = -spec.lift * 0.74
        hip.add(shin)
        const foot = mesh(new RoundedBoxGeometry(0.13, 0.05, 0.2, 2, 0.02), dark)
        foot.position.set(0, -spec.lift + 0.025, 0.03)
        hip.add(foot)
        g.add(hip)
        h.legs.push(hip)
      }
      break
    }
  }
  return g
}

/** Humanoid arms hang from the body's shoulders, so they ride with the body. */
function buildHumanoidArms(spec: BodySpec, accent: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const steel = metal('#94A3B8')
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * (spec.halfWidth + 0.05), spec.top - 0.08, 0)
    shoulder.rotation.z = side * 0.12
    shoulder.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), accent))
    const upper = mesh(new THREE.CapsuleGeometry(0.04, 0.16, 6, 10), steel)
    upper.position.y = -0.12
    shoulder.add(upper)
    const hand = mesh(new THREE.SphereGeometry(0.05, 12, 8), accent)
    hand.position.y = -0.27
    shoulder.add(hand)
    g.add(shoulder)
  }
  return g
}

// ── Upgrades that show on the outside ────────────────────────────────────────
function buildArm(kind: 'arm2' | 'arm3', spec: BodySpec, accent: THREE.Material, h: RobotHandles): THREE.Group {
  const g = new THREE.Group()
  const steel = metal('#CBD5E1')
  const base = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.05, 18), metal('#64748B'))
  g.position.set(spec.halfWidth * 0.45, spec.top, spec.back + 0.12)
  base.position.y = 0.02
  g.add(base)
  const shoulder = new THREE.Group()
  shoulder.position.y = 0.06
  shoulder.add(mesh(new THREE.SphereGeometry(0.055, 14, 10), accent))
  const upper = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), steel)
  upper.position.z = 0.13
  shoulder.add(upper)
  const elbow = new THREE.Group()
  elbow.position.z = 0.26
  elbow.add(mesh(new THREE.SphereGeometry(0.048, 14, 10), accent))
  const fore = mesh(new THREE.BoxGeometry(0.045, 0.045, 0.22), steel)
  fore.position.z = 0.11
  elbow.add(fore)
  shoulder.add(elbow)
  let end: THREE.Group = elbow
  let endZ = 0.22
  h.armJoints.push(shoulder, elbow)
  if (kind === 'arm3') {
    const wrist = new THREE.Group()
    wrist.position.z = 0.22
    wrist.add(mesh(new THREE.SphereGeometry(0.04, 12, 8), accent))
    const hand = mesh(new THREE.BoxGeometry(0.04, 0.04, 0.1), steel)
    hand.position.z = 0.05
    wrist.add(hand)
    elbow.add(wrist)
    h.armJoints.push(wrist)
    end = wrist
    endZ = 0.1
  }
  for (const side of [-1, 1]) {
    const f = mesh(new RoundedBoxGeometry(0.022, 0.04, 0.08, 2, 0.008), metal('#E2E8F0'), false)
    f.position.set(side * 0.03, 0, endZ + 0.04)
    end.add(f)
  }
  // Rest pose: reaching up and forward over the body.
  shoulder.rotation.x = -0.9
  elbow.rotation.x = 1.1
  g.add(shoulder)
  return g
}

function buildSolar(spec: BodySpec): THREE.Group {
  const g = new THREE.Group()
  g.position.set(0, spec.top + 0.02, spec.back + 0.04)
  const stalk = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), metal('#94A3B8'))
  stalk.position.y = 0.05
  g.add(stalk)
  const panel = new THREE.Group()
  panel.position.y = 0.11
  panel.rotation.x = -0.45
  const frame = mesh(new THREE.BoxGeometry(0.42, 0.015, 0.26), metal('#CBD5E1'))
  panel.add(frame)
  const cells = mesh(new THREE.BoxGeometry(0.4, 0.016, 0.24), new THREE.MeshStandardMaterial({ color: '#1E3A8A', roughness: 0.2, metalness: 0.5 }), false)
  cells.position.y = 0.002
  panel.add(cells)
  const lineMat = new THREE.MeshBasicMaterial({ color: '#93C5FD' })
  for (let i = -2; i <= 2; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.24), lineMat)
    l.position.set(i * 0.08, 0.003, 0)
    panel.add(l)
  }
  g.add(panel)
  return g
}

// ── X-ray insides ────────────────────────────────────────────────────────────
const MOTOR_LOOK: Record<string, string> = { gear: '#CBD5E1', speedy: '#EF4444', torque: '#64748B', brushless: '#FC6818' }
const PACK_SIZE: Record<string, [number, number, number]> = { aa: [0.28, 0.09, 0.16], lipo: [0.26, 0.05, 0.16], bigpack: [0.34, 0.11, 0.2], solar: [0.26, 0.05, 0.16] }

/** Explode direction per inside part / outside group (root space, at slider = 1). */
const EXPLODE: Record<string, [number, number, number]> = {
  body: [0, 0.32, 0],
  head: [0, 0.98, 0],
  tool: [0, 0.32, 0.55],
  sensor: [0, 0.1, 0.5],
  sensor2: [0.45, 0.1, 0.4],
  arm: [0, 0.75, -0.3],
  power: [0, 0.95, -0.45],
  battery: [-0.62, 0.32, 0],
  driver: [0.62, 0.32, 0],
  brain: [0, 0.62, 0],
}

function anchor(h: RobotHandles, id: ComponentId, parent: THREE.Object3D, x: number, y: number, z: number): void {
  const a = new THREE.Object3D()
  a.position.set(x, y, z)
  parent.add(a)
  h.anchors[id] = a
}

function buildInternals(d: RobotDesign, spec: BodySpec, h: RobotHandles, form: string): THREE.Group {
  const up = upgradesOf(d)
  const g = new THREE.Group()
  g.name = 'internals'
  const inner = spec.top - spec.lift
  const part = (key: string, y: number, z: number) => {
    const p = new THREE.Group()
    p.position.set(0, y, z)
    p.userData.rest = p.position.clone()
    p.userData.explode = new THREE.Vector3(...EXPLODE[key])
    g.add(p)
    return p
  }
  // Battery.
  const [bw, bh, bd] = PACK_SIZE[up.power] ?? PACK_SIZE.aa
  const bat = part('battery', spec.lift + 0.02 + bh / 2, -0.02)
  const cell = mesh(new RoundedBoxGeometry(bw, bh, bd, 2, 0.015), new THREE.MeshStandardMaterial({ color: up.power === 'aa' ? '#16A34A' : '#1D4ED8', roughness: 0.4 }))
  bat.add(cell)
  const plus = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), glow('#EF4444', 0.6), false)
  plus.position.set(bw / 2 - 0.03, bh / 2 + 0.01, 0)
  bat.add(plus)
  if (up.power === 'aa') {
    for (let i = 0; i < 4; i++) {
      const aa = mesh(new THREE.CylinderGeometry(0.028, 0.028, bw * 0.85, 12), plastic('#22C55E', 0.35), false)
      aa.rotation.z = Math.PI / 2
      aa.position.set(0, bh / 2 + 0.001, -bd / 2 + 0.03 + i * ((bd - 0.06) / 3))
      bat.add(aa)
    }
  }
  anchor(h, 'battery', bat, bw / 2 - 0.03, bh / 2, 0)
  // Motor driver board.
  const drv = part('driver', spec.lift + Math.min(inner * 0.45, 0.17), Math.min(0.1, spec.front - 0.1))
  const drvBoard = mesh(new THREE.BoxGeometry(0.16, 0.015, 0.12), new THREE.MeshStandardMaterial({ color: '#7F1D1D', roughness: 0.6 }))
  drv.add(drvBoard)
  const sink = mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), metal('#94A3B8'))
  sink.position.y = 0.03
  drv.add(sink)
  anchor(h, 'driver', drv, 0, 0.02, 0)
  // Brain board (green circuit board with a chip and a blinking light).
  const brain = part('brain', spec.lift + Math.min(inner * 0.8, 0.3), -0.04)
  const pcb = mesh(new THREE.BoxGeometry(0.22, 0.015, 0.16), new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.5 }))
  brain.add(pcb)
  const chip = mesh(new THREE.BoxGeometry(0.07, 0.02, 0.07), plastic('#111827', 0.3))
  chip.position.y = 0.017
  brain.add(chip)
  const led = mesh(new THREE.SphereGeometry(0.012, 8, 6), glow('#00E5FF', 1.6), false)
  led.position.set(0.08, 0.015, 0.05)
  brain.add(led)
  anchor(h, 'brain', brain, 0, 0.03, 0)

  // Motors sit by the drive (wheels / hips / rotors / propeller).
  const motorMat = metal(MOTOR_LOOK[up.motor] ?? MOTOR_LOOK.gear)
  const motorSide = (side: number): [number, number, number] => {
    if (form === 'drone') return [side * (spec.halfWidth + 0.08), spec.top - 0.06, spec.front * 0.5]
    if (form === 'sub') return [side * 0.06, spec.lift + 0.12, spec.back - 0.02]
    if (form === 'humanoid') return [side * spec.halfWidth * 0.5, spec.lift + 0.04, 0]
    if (d.drive === 'legs') return [side * (spec.halfWidth - 0.08), spec.lift + 0.06, 0]
    return [side * (spec.halfWidth - 0.06), 0.2, 0.06]
  }
  for (const side of [1, -1]) {
    const [x, y, z] = motorSide(side)
    const m = mesh(new THREE.CylinderGeometry(0.045, 0.045, up.motor === 'torque' ? 0.13 : 0.1, 16), motorMat)
    m.rotation.z = Math.PI / 2
    m.position.set(x, y, z)
    g.add(m)
    // robot3d puts the robot's LEFT wheels at +x.
    anchor(h, side > 0 ? 'motorL' : 'motorR', g, x, y, z)
  }
  g.visible = false
  return g
}

/** Build the robot. The returned group stands on y = 0 and faces +Z. */
export function buildRobot(d: RobotDesign, opts: BuildOptions = {}): THREE.Group {
  const root = new THREE.Group()
  root.name = 'robot'
  const primary = plastic(d.primary)
  const accent = plastic(d.accent, 0.38)
  const up = upgradesOf(d)
  const handles: RobotHandles = {
    slots: {
      body: new THREE.Group(),
      drive: new THREE.Group(),
      head: new THREE.Group(),
      tool: new THREE.Group(),
      sensor: new THREE.Group(),
    },
    wheels: [],
    legs: [],
    antennaTip: null,
    blinkers: [],
    fingers: [],
    lightLens: null,
    lightBeam: null,
    penTip: null,
    bodyGroup: new THREE.Group(),
    cargo: new THREE.Group(),
    upgrades: { power: new THREE.Group(), motor: new THREE.Group(), sensor2: new THREE.Group(), arm: new THREE.Group(), chassis: new THREE.Group() },
    rotors: [],
    armJoints: [],
    internals: null,
    anchors: {},
    wires: [],
    wireGroup: null,
    glowMats: [],
    xray: false,
    explode: 0,
    signal: null,
    signalDot: null,
  }
  const form = opts.worldForm && up.chassis !== 'ground' ? up.chassis : 'ground'
  const lift = form === 'ground' ? DRIVE_LIFT[d.drive] : FORM_LIFT[form]
  const { group: body, spec } = buildBody(d, lift, primary, accent)
  handles.slots.body.add(body)
  if (form === 'ground') handles.slots.drive.add(buildDrive(d, spec, accent, handles))
  else {
    handles.slots.drive.add(buildForm(form, spec, accent, handles))
    if (form === 'humanoid') handles.slots.body.add(buildHumanoidArms(spec, accent))
  }
  handles.slots.head.add(buildHead(d, spec, primary, accent, handles))
  handles.slots.tool.add(buildTool(d, spec, accent, handles))
  handles.slots.sensor.add(buildSensor(d.sensor, spec, accent))
  if (up.sensor2 !== 'none') {
    // The simulator reads both floor sensors at the front, so the second one sits just behind the
    // first (a second bumper rides a little higher on the front edge).
    const second = buildSensor(up.sensor2, spec, accent)
    if (up.sensor2 === 'bumper') second.position.y = 0.06
    else second.position.z = d.sensor === 'none' ? 0 : -0.1
    handles.upgrades.sensor2.add(second)
  }
  if (up.arm !== 'none' && form !== 'humanoid') handles.upgrades.arm.add(buildArm(up.arm, spec, accent, handles))
  if (up.power === 'solar') handles.upgrades.power.add(buildSolar(spec))

  // Everything above the drive bobs together.
  handles.bodyGroup.add(handles.slots.body, handles.slots.head, handles.slots.tool, handles.slots.sensor)
  handles.bodyGroup.add(handles.upgrades.power, handles.upgrades.sensor2, handles.upgrades.arm)
  root.add(handles.slots.drive, handles.bodyGroup)
  // Remember where each group rests and where it goes when the robot is pulled apart.
  const explodeKey: [THREE.Group, string][] = [
    [handles.slots.body, 'body'],
    [handles.slots.head, 'head'],
    [handles.slots.tool, 'tool'],
    [handles.slots.sensor, 'sensor'],
    [handles.upgrades.sensor2, 'sensor2'],
    [handles.upgrades.arm, 'arm'],
    [handles.upgrades.power, 'power'],
  ]
  for (const [grp, key] of explodeKey) {
    grp.userData.rest = grp.position.clone()
    grp.userData.explode = new THREE.Vector3(...EXPLODE[key])
  }

  // A small crate shown when the robot carries something.
  const crate = mesh(new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.03), plastic('#B45309', 0.7))
  handles.cargo.add(crate)
  handles.cargo.position.set(0, Math.max(spec.lift + 0.2, 0.32), spec.front + 0.2)
  handles.cargo.visible = false
  handles.bodyGroup.add(handles.cargo)

  if (opts.internals) {
    // Anchors on the outside parts the wires plug into.
    anchor(handles, 'head', handles.slots.head, 0, spec.top + 0.12, 0)
    anchor(handles, 'sensor', handles.slots.sensor, 0, Math.max(0.06, spec.lift - 0.02), spec.front - 0.05)
    anchor(handles, 'sensor2', handles.upgrades.sensor2, 0, Math.max(0.06, spec.lift - 0.02) + (up.sensor2 === 'bumper' ? 0.1 : 0), spec.front - (d.sensor === 'none' || up.sensor2 === 'bumper' ? 0.05 : 0.15))
    anchor(handles, 'tool', handles.slots.tool, 0, spec.lift + Math.min(0.2, (spec.top - spec.lift) / 2), spec.front + 0.06)
    // A humanoid's jointed arm IS its own arm: the wire runs to its shoulder.
    if (form === 'humanoid') anchor(handles, 'arm', handles.slots.body, -(spec.halfWidth + 0.05), spec.top - 0.08, 0)
    else anchor(handles, 'arm', handles.upgrades.arm, spec.halfWidth * 0.45, spec.top + 0.04, spec.back + 0.12)
    anchor(handles, 'solar', handles.upgrades.power, 0, spec.top + 0.08, spec.back + 0.04)
    const internals = buildInternals(d, spec, handles, form)
    handles.internals = internals
    handles.bodyGroup.add(internals)
    const wg = new THREE.Group()
    wg.name = 'wires'
    wg.visible = false
    root.add(wg)
    handles.wireGroup = wg
    for (const spec2 of wiringOf(d)) {
      const mat = new THREE.MeshStandardMaterial({ color: WIRE_COLOR[spec2.kind], emissive: WIRE_COLOR[spec2.kind], emissiveIntensity: 0.35, roughness: 0.5 })
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0), new THREE.Vector3(0, 0, 0.01)])
      const m = new THREE.Mesh(new THREE.BufferGeometry(), mat)
      const pick = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
      pick.visible = false
      pick.userData.wireId = spec2.id
      m.userData.wireId = spec2.id
      wg.add(m, pick)
      handles.wires.push({ spec: spec2, curve, mesh: m, pick })
    }
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }))
    dot.visible = false
    wg.add(dot)
    handles.signalDot = dot
  }

  // Learned parts glow (their own copies of the materials, so nothing else lights up).
  if (opts.learned && opts.learned.length) {
    for (const slot of opts.learned) {
      const grp = slot in handles.slots ? handles.slots[slot as Slot] : handles.upgrades[slot as UpgradeSlot]
      grp.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) return
        if (mat.emissiveIntensity > 0 && mat.emissive.getHex() !== 0) return // already a light
        const c = mat.clone()
        c.emissive.set('#00E5FF')
        c.emissiveIntensity = 0.35
        m.material = c
        handles.glowMats.push(c)
      })
    }
  }

  handlesMap.set(root, handles)
  if (opts.internals) updateWires(root)
  return root
}

// ── X-ray, explode and signals (Workshop) ────────────────────────────────────

/** Pull the robot apart: 0 = assembled, 1 = fully exploded. Rebuilds the wires to follow. */
export function setExplode(root: THREE.Object3D, k: number): void {
  const h = handlesMap.get(root)
  if (!h) return
  h.explode = Math.max(0, Math.min(1, k))
  const place = (g: THREE.Object3D) => {
    const rest = g.userData.rest as THREE.Vector3 | undefined
    const dir = g.userData.explode as THREE.Vector3 | undefined
    if (rest && dir) g.position.copy(rest).addScaledVector(dir, h.explode)
  }
  for (const g of Object.values(h.slots)) place(g)
  for (const g of Object.values(h.upgrades)) place(g)
  // Inside parts (battery, driver, brain) spread out of the opened body.
  if (h.internals) for (const c of h.internals.children) place(c)
  updateWires(root)
}

/** Where a slot group rests at the current explode amount (the Workshop's snap animation lands here). */
export function restPosition(group: THREE.Object3D, root: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
  const h = handlesMap.get(root)
  const rest = group.userData.rest as THREE.Vector3 | undefined
  const dir = group.userData.explode as THREE.Vector3 | undefined
  if (!rest) return out.set(0, 0, 0)
  out.copy(rest)
  if (dir && h) out.addScaledVector(dir, h.explode)
  return out
}

/** See through the shell: the insides and the wires appear. */
export function setXray(root: THREE.Object3D, on: boolean): void {
  const h = handlesMap.get(root)
  if (!h) return
  h.xray = on
  const shells = new Set<THREE.Material>()
  const collect = (g: THREE.Object3D) =>
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) if (mat) shells.add(mat)
    })
  for (const g of Object.values(h.slots)) collect(g)
  for (const g of Object.values(h.upgrades)) collect(g)
  for (const mat of shells) {
    if (on) {
      if (mat.userData.xrayOrig === undefined) mat.userData.xrayOrig = { t: mat.transparent, o: mat.opacity, d: mat.depthWrite }
      mat.transparent = true
      mat.opacity = 0.22
      mat.depthWrite = false
    } else {
      const orig = mat.userData.xrayOrig as { t: boolean; o: number; d: boolean } | undefined
      if (orig) {
        mat.transparent = orig.t
        mat.opacity = orig.o
        mat.depthWrite = orig.d
      }
    }
    mat.needsUpdate = true
  }
  if (h.internals) h.internals.visible = on
  if (h.wireGroup) h.wireGroup.visible = on
  if (!on) h.signal = null
  h.bodyGroup.position.y = 0
  updateWires(root)
}

const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()

/** Re-run every wire from its two anchors (after an explode or a rebuild). */
export function updateWires(root: THREE.Object3D): void {
  const h = handlesMap.get(root)
  if (!h || !h.wires.length) return
  root.updateMatrixWorld(true)
  for (const w of h.wires) {
    const a = h.anchors[w.spec.from]
    const b = h.anchors[w.spec.to]
    if (!a || !b) continue
    root.worldToLocal(a.getWorldPosition(tmpA))
    root.worldToLocal(b.getWorldPosition(tmpB))
    const mid = tmpA.clone().lerp(tmpB, 0.5)
    mid.y += 0.05 + tmpA.distanceTo(tmpB) * 0.12
    w.curve.points = [tmpA.clone(), mid, tmpB.clone()]
    w.curve.updateArcLengths()
    w.mesh.geometry.dispose()
    w.mesh.geometry = new THREE.TubeGeometry(w.curve, 20, 0.014, 6, false)
    w.pick.geometry.dispose()
    w.pick.geometry = new THREE.TubeGeometry(w.curve, 10, 0.06, 5, false)
  }
}

/** The invisible, fat tubes to raycast against for "tap a wire". */
export function wirePickables(root: THREE.Object3D): THREE.Object3D[] {
  const h = handlesMap.get(root)
  return h && h.xray ? h.wires.map((w) => w.pick) : []
}

/** Send a pulse along a wire (and highlight it); null clears. */
export function sendSignal(root: THREE.Object3D, wireId: string | null): void {
  const h = handlesMap.get(root)
  if (!h) return
  h.signal = wireId ? { id: wireId, start: -1 } : null
  for (const w of h.wires) {
    const mat = w.mesh.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = w.spec.id === wireId ? 1.6 : wireId ? 0.12 : 0.35
  }
  if (h.signalDot) h.signalDot.visible = false
}

/** Idle and driving animation. Call once per frame with time in seconds. */
export function animateRobot(group: THREE.Object3D, t: number, state: RobotAnimState): void {
  const h = handlesMap.get(group)
  if (!h) return
  const calm = state.reducedMotion === true
  animateExtras(h, t, state, calm)
  const dirSign = state.direction ?? 1
  const speed = state.moving ? 9 * dirSign : 0
  for (const w of h.wheels) w.rotation.x = (w.rotation.x + speed * 0.016) % (Math.PI * 2)
  h.legs.forEach((leg, i) => {
    const phase = i === 0 || i === 3 ? 0 : Math.PI
    const amp = state.moving ? 0.45 : calm ? 0 : 0.04
    const rate = state.moving ? 10 : 1.6
    leg.rotation.x = Math.sin(t * rate + phase) * amp
  })
  // Body bob: a gentle breathing when idle, a bounce when moving. Still in X-ray, so the wires stay plugged in.
  const bob = calm || h.xray ? 0 : state.moving ? Math.abs(Math.sin(t * 10)) * 0.02 : Math.sin(t * 2) * 0.008
  h.bodyGroup.position.y = bob
  if (h.antennaTip) {
    h.antennaTip.rotation.z = calm ? 0 : Math.sin(t * 3.1) * (state.moving ? 0.25 : 0.12)
    h.antennaTip.rotation.x = calm ? 0 : Math.cos(t * 2.3) * 0.08
  }
  // Blink every ~3.2 s.
  const cycle = t % 3.2
  const blink = !calm && cycle > 3.05 ? 0.12 : 1
  for (const b of h.blinkers) b.scale.y = blink
  // Fingers open while idle, close when carrying.
  for (const f of h.fingers) {
    const side = typeof f.userData.side === 'number' ? (f.userData.side as number) : 1
    const open = state.carrying ? 0.02 : 0.28 + (calm ? 0 : Math.sin(t * 1.5) * 0.06)
    f.rotation.y = side * open
  }
  h.cargo.visible = state.carrying === true
  if (h.lightLens) h.lightLens.emissiveIntensity = state.lightOn ? 2.2 : 0.25
  if (h.lightBeam) h.lightBeam.intensity = state.lightOn ? 4 : 0
}

/** Rotors, arm joints, learned-part glow and the signal pulse. */
function animateExtras(h: RobotHandles, t: number, state: RobotAnimState, calm: boolean): void {
  for (const r of h.rotors) {
    const spin = typeof r.userData.spin === 'number' ? (r.userData.spin as number) : 1
    // Rotors idle slowly (and stop under less motion); they whirr when the robot moves.
    const rate = calm ? 0 : state.moving ? 40 : 6
    if (r.userData.axis === 'z') r.rotation.z = (r.rotation.z + spin * rate * 0.016) % (Math.PI * 2)
    else r.rotation.y = (r.rotation.y + spin * rate * 0.016) % (Math.PI * 2)
  }
  if (h.armJoints.length && !calm && !h.xray) {
    h.armJoints[0].rotation.x = -0.9 + Math.sin(t * 0.7) * 0.12
    if (h.armJoints[1]) h.armJoints[1].rotation.x = 1.1 + Math.sin(t * 0.7 + 1) * 0.15
    if (h.armJoints[2]) h.armJoints[2].rotation.z = Math.sin(t * 1.1) * 0.5
  }
  if (h.glowMats.length) {
    const g = calm ? 0.45 : 0.3 + (Math.sin(t * 2.4) + 1) * 0.22
    for (const m of h.glowMats) m.emissiveIntensity = g
  }
  const s = h.signal
  if (s && h.signalDot) {
    const w = h.wires.find((x) => x.spec.id === s.id)
    if (!w || calm) {
      h.signalDot.visible = false
    } else {
      if (s.start < 0) s.start = t
      // Three trips along the wire, then rest (the wire stays lit).
      const p = (t - s.start) / 1.1
      if (p >= 3) h.signalDot.visible = false
      else {
        h.signalDot.visible = true
        w.curve.getPointAt(p % 1, h.signalDot.position)
        ;(h.signalDot.material as THREE.MeshBasicMaterial).color.set(WIRE_COLOR[w.spec.kind])
      }
    }
  }
}

/** Elastic pop used when a part snaps on. `p` runs 0 → 1. */
export function snapEase(p: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 1
  return Math.pow(2, -9 * p) * Math.sin(((p * 10 - 0.75) * (2 * Math.PI)) / 3) + 1
}

/** Free every geometry and material under `obj`. */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose()
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        if (!mat) continue
        const map = (mat as THREE.MeshStandardMaterial).map
        if (map) map.dispose()
        mat.dispose()
      }
    }
  })
}
