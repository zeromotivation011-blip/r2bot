// lib/kids/robot3d.ts
// Builds the child's robot in 3D from primitives (no model files), and
// animates it. Used by the Workshop, the AR/VR views and the Code Lab arena.
//
// Conventions: the robot stands on y = 0, faces +Z, and is about 1 unit tall.
// Only import this from client components that are loaded with
// next/dynamic({ ssr: false }) so three.js stays out of the shared bundle.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { RobotDesign, Slot } from './robot-design'

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
function buildSensor(d: RobotDesign, spec: BodySpec, accent: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const y = Math.max(0.06, spec.lift - 0.04)
  switch (d.sensor) {
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

/** Build the robot. The returned group stands on y = 0 and faces +Z. */
export function buildRobot(d: RobotDesign): THREE.Group {
  const root = new THREE.Group()
  root.name = 'robot'
  const primary = plastic(d.primary)
  const accent = plastic(d.accent, 0.38)
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
  }
  const lift = DRIVE_LIFT[d.drive]
  const { group: body, spec } = buildBody(d, lift, primary, accent)
  handles.slots.body.add(body)
  handles.slots.drive.add(buildDrive(d, spec, accent, handles))
  handles.slots.head.add(buildHead(d, spec, primary, accent, handles))
  handles.slots.tool.add(buildTool(d, spec, accent, handles))
  handles.slots.sensor.add(buildSensor(d, spec, accent))

  // Everything above the drive bobs together.
  handles.bodyGroup.add(handles.slots.body, handles.slots.head, handles.slots.tool, handles.slots.sensor)
  root.add(handles.slots.drive, handles.bodyGroup)

  // A small crate shown when the robot carries something.
  const crate = mesh(new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.03), plastic('#B45309', 0.7))
  handles.cargo.add(crate)
  handles.cargo.position.set(0, Math.max(spec.lift + 0.2, 0.32), spec.front + 0.2)
  handles.cargo.visible = false
  handles.bodyGroup.add(handles.cargo)

  handlesMap.set(root, handles)
  return root
}

/** Idle and driving animation. Call once per frame with time in seconds. */
export function animateRobot(group: THREE.Object3D, t: number, state: RobotAnimState): void {
  const h = handlesMap.get(group)
  if (!h) return
  const calm = state.reducedMotion === true
  const dirSign = state.direction ?? 1
  const speed = state.moving ? 9 * dirSign : 0
  for (const w of h.wheels) w.rotation.x = (w.rotation.x + speed * 0.016) % (Math.PI * 2)
  h.legs.forEach((leg, i) => {
    const phase = i === 0 || i === 3 ? 0 : Math.PI
    const amp = state.moving ? 0.45 : calm ? 0 : 0.04
    const rate = state.moving ? 10 : 1.6
    leg.rotation.x = Math.sin(t * rate + phase) * amp
  })
  // Body bob: a gentle breathing when idle, a bounce when moving.
  const bob = calm ? 0 : state.moving ? Math.abs(Math.sin(t * 10)) * 0.02 : Math.sin(t * 2) * 0.008
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
