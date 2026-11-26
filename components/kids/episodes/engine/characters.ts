// components/kids/episodes/engine/characters.ts
// The episode cast, built procedurally from primitives (no model files) with a
// joint hierarchy that is animated in code: breathing, blinking, head turns,
// walk/hover/trot cycles, gestures, mouths driven by the voice loudness, and
// emotions through eyes and brows. Loaded only inside the lazy engine chunk.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { animateRobot, buildRobot, getRobotHandles } from '@/lib/kids/robot3d'
import type { RobotDesign } from '@/lib/kids/robot-design'
import type { CastId } from '@/lib/kids/episodes/plan'

export type Emotion = 'neutral' | 'happy' | 'surprised' | 'worried'
export type Gesture = 'none' | 'explain' | 'point' | 'wave' | 'cheer' | 'think' | 'shrug'

export interface ActorState {
  /** Mouth opening 0..1 (voice loudness). */
  talk: number
  speaking: boolean
  emotion: Emotion
  /** World point to look at, or null to look ahead. */
  look: THREE.Vector3 | null
  /** 0 standing … 1 full walk / drive. */
  walking: number
  gesture: Gesture
  /** Seconds since the gesture started. */
  gestureT: number
}

export interface Actor {
  id: CastId | 'extra'
  root: THREE.Group
  /** Height of the eyes above the feet, for framing. */
  eyeHeight: number
  /** Overall height, for framing wide shots. */
  height: number
  update(t: number, dt: number, s: ActorState, calm: boolean): void
}

export function idleState(): ActorState {
  return { talk: 0, speaking: false, emotion: 'neutral', look: null, walking: 0, gesture: 'none', gestureT: 0 }
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function std(color: string | number, rough = 0.6, metal = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
}
function glowMat(color: string | number, intensity = 1.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.35 })
}
function m(geo: THREE.BufferGeometry, mat: THREE.Material, cast = true): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}
function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z)
  return o
}
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  parent.add(g)
  return g
}
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))

/** Yaw/pitch (radians) from an object's head to a world point, in the root's frame. */
const _v = new THREE.Vector3()
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
function lookAngles(root: THREE.Object3D, headWorldY: number, target: THREE.Vector3 | null): [number, number] {
  if (!target) return [0, 0]
  root.getWorldQuaternion(_q)
  root.getWorldPosition(_p)
  _p.y = headWorldY
  _v.copy(target).sub(_p)
  _v.applyQuaternion(_q.invert())
  const yaw = Math.atan2(_v.x, _v.z)
  const pitch = -Math.atan2(_v.y, Math.hypot(_v.x, _v.z))
  return [THREE.MathUtils.clamp(yaw, -1.0, 1.0), THREE.MathUtils.clamp(pitch, -0.45, 0.45)]
}

// ── Faces (shared by people) ──────────────────────────────────────────────

interface Face {
  lids: THREE.Object3D[]
  eyes: THREE.Object3D[]
  brows: THREE.Object3D[]
  mouth: THREE.Object3D
  smile: THREE.Object3D
}

function buildFace(head: THREE.Object3D, r: number, skin: THREE.Material, browColor: string, kid: boolean): Face {
  const white = std('#FFFFFF', 0.3)
  const iris = std('#2B1A10', 0.25)
  const shine = glowMat('#FFFFFF', 1.2)
  const lids: THREE.Object3D[] = []
  const eyes: THREE.Object3D[] = []
  const brows: THREE.Object3D[] = []
  const eyeR = r * (kid ? 0.25 : 0.2)
  for (const side of [-1, 1]) {
    const eye = group(head, side * r * 0.38, r * 0.12, r * 0.8)
    eye.add(m(new THREE.SphereGeometry(eyeR, 18, 14), white, false))
    const pupil = at(m(new THREE.SphereGeometry(eyeR * 0.62, 16, 12), iris, false), 0, 0, eyeR * 0.5)
    eye.add(pupil)
    eye.add(at(m(new THREE.SphereGeometry(eyeR * 0.2, 8, 6), shine, false), eyeR * 0.22, eyeR * 0.25, eyeR * 0.95))
    // Upper lid: a skin-coloured half shell that drops over the eye to blink.
    const lidPivot = group(eye, 0, 0, 0)
    const lid = m(new THREE.SphereGeometry(eyeR * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin, false)
    lid.rotation.x = -0.25
    lidPivot.add(lid)
    lidPivot.scale.y = 0.12
    lids.push(lidPivot)
    eyes.push(eye)
    const brow = at(m(new RoundedBoxGeometry(eyeR * 1.9, eyeR * 0.38, eyeR * 0.4, 2, eyeR * 0.15), std(browColor, 0.8), false), side * r * 0.38, r * 0.12 + eyeR * 1.55, r * 0.86)
    brow.userData.side = side
    head.add(brow)
    brows.push(brow)
  }
  // Nose
  head.add(at(m(new THREE.SphereGeometry(r * 0.13, 12, 10), skin, false), 0, -r * 0.08, r * 0.98))
  // Mouth: a dark oval that opens with the voice, and a smile line when closed.
  const mouth = group(head, 0, -r * 0.38, r * 0.86)
  const inner = m(new THREE.SphereGeometry(r * 0.2, 16, 10), std('#4A1414', 0.7), false)
  inner.scale.set(1.2, 0.6, 0.35)
  mouth.add(inner)
  mouth.add(at(m(new THREE.SphereGeometry(r * 0.07, 10, 8), std('#C8505A', 0.6), false), 0, -r * 0.06, -r * 0.01))
  const smile = m(new THREE.TorusGeometry(r * 0.2, r * 0.035, 6, 16, Math.PI), std('#7A2A22', 0.7), false)
  smile.rotation.z = Math.PI
  smile.position.set(0, -r * 0.3, r * 0.9)
  head.add(smile)
  return { lids, eyes, brows, mouth, smile }
}

function animateFace(f: Face, t: number, dt: number, s: ActorState, blink: { next: number; until: number }, calm: boolean): void {
  // Blink at random 2–5 s intervals.
  if (t > blink.next) {
    blink.until = t + 0.13
    blink.next = t + 2 + Math.random() * 3
  }
  const closed = t < blink.until && !calm
  const lidTarget = closed ? 1.15 : s.emotion === 'happy' ? 0.38 : s.emotion === 'surprised' ? 0.02 : s.emotion === 'worried' ? 0.42 : 0.12
  for (const l of f.lids) l.scale.y = closed ? 1.15 : damp(l.scale.y, lidTarget, 14, dt)
  const eyeScale = s.emotion === 'surprised' ? 1.12 : 1
  for (const e of f.eyes) e.scale.setScalar(damp(e.scale.x, eyeScale, 8, dt))
  for (const b of f.brows) {
    const side = b.userData.side as number
    const lift = s.emotion === 'surprised' ? 0.05 : s.emotion === 'happy' ? 0.02 : s.emotion === 'worried' ? 0.015 : 0
    const tilt = s.emotion === 'worried' ? side * -0.35 : s.emotion === 'happy' ? side * 0.1 : 0
    b.userData.baseY ??= b.position.y
    b.position.y = damp(b.position.y, (b.userData.baseY as number) + lift * (1 + s.talk * 0.4), 10, dt)
    b.rotation.z = damp(b.rotation.z, tilt, 10, dt)
  }
  const open = s.speaking ? Math.min(1, s.talk * 1.25) : 0
  const ms = f.mouth.scale
  ms.y = damp(ms.y, 0.08 + open * 1.1 + (s.emotion === 'surprised' && !s.speaking ? 0.5 : 0), 30, dt)
  ms.x = damp(ms.x, 1 - open * 0.25 + (s.emotion === 'happy' ? 0.15 : 0), 20, dt)
  f.mouth.visible = ms.y > 0.12
  f.smile.visible = !f.mouth.visible
  const smileScale = s.emotion === 'worried' ? -0.6 : s.emotion === 'happy' ? 1.25 : 0.9
  f.smile.scale.set(1, smileScale, 1)
}

// ── People ────────────────────────────────────────────────────────────────

export interface HumanLook {
  height: number
  kid?: boolean
  elder?: boolean
  skin: string
  hair: string
  hairStyle: 'bun' | 'puffs' | 'short' | 'bob' | 'long' | 'curly' | 'none'
  top: string
  bottom: string
  skirt?: boolean
  shoes?: string
  glasses?: boolean
  hat?: 'chef' | 'captain' | 'cap' | 'headwrap' | null
  hatColor?: string
  apron?: string
  goggles?: boolean
  beard?: string
  cardigan?: string
  scarf?: string
}

export const LOOKS: Record<string, HumanLook> = {
  amara: { height: 1.22, kid: true, skin: '#7A4B2E', hair: '#1B120C', hairStyle: 'puffs', top: '#FACC15', bottom: '#1D4ED8', shoes: '#F97316', goggles: true, apron: '#2563EB' },
  lucia: { height: 1.5, elder: true, skin: '#C98E68', hair: '#D9D6D0', hairStyle: 'bun', top: '#B91C1C', bottom: '#3F3F46', skirt: true, glasses: true, cardigan: '#7C2D12', shoes: '#3F2A1D' },
  okafor: { height: 1.74, skin: '#5A3622', hair: '#140D08', hairStyle: 'short', top: '#F5F5F4', bottom: '#44403C', hat: 'chef', apron: '#FFFFFF', beard: '#140D08' },
  noor: { height: 0.98, kid: true, skin: '#B07A55', hair: '#1F140D', hairStyle: 'bob', top: '#F472B6', bottom: '#F9A8D4', skirt: true, shoes: '#FDE047' },
  adaeze: { height: 1.66, skin: '#6B4027', hair: '#120B07', hairStyle: 'none', top: '#0EA5E9', bottom: '#1E293B', skirt: true, hat: 'headwrap', hatColor: '#F59E0B', glasses: true },
  mei: { height: 1.6, skin: '#E3B88F', hair: '#111111', hairStyle: 'bob', top: '#22C55E', bottom: '#334155', apron: '#FDE68A' },
  haruto: { height: 1.7, skin: '#E0B48C', hair: '#1A1A1A', hairStyle: 'short', top: '#64748B', bottom: '#1F2937', glasses: true, cardigan: '#475569' },
  diego: { height: 1.72, skin: '#B9825A', hair: '#2A1A10', hairStyle: 'curly', top: '#EF4444', bottom: '#1E3A8A', hat: 'cap', hatColor: '#FACC15', beard: '#2A1A10' },
  ingrid: { height: 1.72, skin: '#F2C9A8', hair: '#F3D27A', hairStyle: 'long', top: '#1E3A8A', bottom: '#1E293B', hat: 'captain', hatColor: '#0F172A', scarf: '#F8FAFC' },
  lollipop: { height: 1.66, skin: '#D7A07A', hair: '#6B4226', hairStyle: 'bun', top: '#FDE047', bottom: '#1F2937', hat: 'cap', hatColor: '#FDE047' },
}

const EXTRA_PALETTE = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#A3E635', '#F97316']
const EXTRA_SKIN = ['#F2C9A8', '#C98E68', '#7A4B2E', '#E3B88F', '#5A3622', '#B9825A']
const EXTRA_HAIR = ['#1B120C', '#6B4226', '#F3D27A', '#2A1A10', '#9CA3AF']

export function extraLook(seed: number): HumanLook {
  const r = (n: number) => {
    seed = (seed * 9301 + 49297) % 233280
    return Math.floor((seed / 233280) * n)
  }
  const kid = r(3) === 0
  const styles: HumanLook['hairStyle'][] = ['short', 'bob', 'curly', 'bun', 'long', 'puffs']
  return {
    height: kid ? 1.0 + r(25) / 100 : 1.58 + r(20) / 100,
    kid,
    skin: EXTRA_SKIN[r(EXTRA_SKIN.length)],
    hair: EXTRA_HAIR[r(EXTRA_HAIR.length)],
    hairStyle: styles[r(styles.length)],
    top: EXTRA_PALETTE[r(EXTRA_PALETTE.length)],
    bottom: ['#1E293B', '#334155', '#1D4ED8', '#78350F'][r(4)],
    skirt: r(3) === 0,
    hat: r(5) === 0 ? 'cap' : null,
    hatColor: EXTRA_PALETTE[r(EXTRA_PALETTE.length)],
  }
}

interface Limb {
  upper: THREE.Group
  lower: THREE.Group
}

export function buildHuman(id: Actor['id'], look: HumanLook): Actor {
  const H = look.height
  const kid = look.kid === true
  const root = new THREE.Group()
  root.name = `actor:${id}`
  const skin = std(look.skin, 0.55)
  const hairMat = std(look.hair, 0.75)
  const topMat = std(look.top, 0.7)
  const bottomMat = std(look.bottom, 0.75)
  const shoeMat = std(look.shoes ?? '#1F2937', 0.5)

  const headR = H * (kid ? 0.15 : 0.115)
  const legLen = H * (kid ? 0.36 : 0.43)
  const torsoLen = H * (kid ? 0.25 : 0.29)
  const hipW = H * (kid ? 0.075 : 0.07)
  const limbR = H * (kid ? 0.04 : 0.034)

  const hips = group(root, 0, legLen, 0)
  const pelvis = m(new THREE.SphereGeometry(hipW * 1.55, 16, 12), look.skirt ? topMat : bottomMat)
  pelvis.scale.set(1.1, 0.75, 0.85)
  hips.add(pelvis)

  // Legs
  const legs: Limb[] = []
  for (const side of [-1, 1]) {
    const upper = group(hips, side * hipW, 0, 0)
    const thighLen = legLen * 0.48
    upper.add(at(m(new THREE.CapsuleGeometry(limbR * 1.15, thighLen, 4, 10), bottomMat), 0, -thighLen / 2, 0))
    const lower = group(upper, 0, -thighLen - limbR * 0.4, 0)
    const shinLen = legLen * 0.42
    lower.add(at(m(new THREE.CapsuleGeometry(limbR, shinLen, 4, 10), look.skirt ? skin : bottomMat), 0, -shinLen / 2, 0))
    const shoe = at(m(new RoundedBoxGeometry(limbR * 2.6, limbR * 1.6, limbR * 4.2, 2, limbR * 0.6), shoeMat), 0, -shinLen - limbR * 0.9, limbR * 0.8)
    lower.add(shoe)
    legs.push({ upper, lower })
  }
  if (look.skirt) {
    const skirt = at(m(new THREE.CylinderGeometry(hipW * 1.4, hipW * 2.6, legLen * 0.5, 16, 1, true), bottomMat), 0, -legLen * 0.2, 0)
    ;(skirt.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    hips.add(skirt)
  }

  // Torso
  const spine = group(hips, 0, hipW * 0.3, 0)
  const torso = at(m(new THREE.CapsuleGeometry(hipW * 1.55, torsoLen * 0.55, 6, 14), topMat), 0, torsoLen * 0.42, 0)
  torso.scale.set(1.08, 1, 0.78)
  spine.add(torso)
  if (look.cardigan) {
    const cg = at(m(new THREE.CapsuleGeometry(hipW * 1.62, torsoLen * 0.5, 6, 14), std(look.cardigan, 0.85)), 0, torsoLen * 0.42, -0.005)
    cg.scale.set(1.1, 1, 0.74)
    spine.add(cg)
    // Open front: a strip of the top shows through.
    spine.add(at(m(new RoundedBoxGeometry(hipW * 0.9, torsoLen * 0.75, hipW * 0.4, 2, hipW * 0.15), topMat), 0, torsoLen * 0.42, hipW * 1.2))
  }
  if (look.apron) {
    spine.add(at(m(new RoundedBoxGeometry(hipW * 2.2, torsoLen * 1.05, hipW * 0.3, 2, hipW * 0.12), std(look.apron, 0.8)), 0, torsoLen * 0.2, hipW * 1.25))
  }
  if (look.scarf) {
    const sc = at(m(new THREE.TorusGeometry(hipW * 0.95, hipW * 0.35, 8, 16), std(look.scarf, 0.8)), 0, torsoLen * 0.86, 0)
    sc.rotation.x = Math.PI / 2
    spine.add(sc)
  }
  if (look.elder) spine.rotation.x = 0.08

  // Arms
  const arms: Limb[] = []
  const shoulderY = torsoLen * 0.78
  for (const side of [-1, 1]) {
    const upper = group(spine, side * hipW * 1.7, shoulderY, 0)
    const upperLen = H * (kid ? 0.13 : 0.15)
    upper.add(at(m(new THREE.CapsuleGeometry(limbR, upperLen, 4, 10), look.cardigan ? std(look.cardigan, 0.85) : topMat), 0, -upperLen / 2, 0))
    const lower = group(upper, 0, -upperLen - limbR * 0.3, 0)
    const foreLen = H * (kid ? 0.11 : 0.13)
    lower.add(at(m(new THREE.CapsuleGeometry(limbR * 0.9, foreLen, 4, 10), skin), 0, -foreLen / 2, 0))
    lower.add(at(m(new THREE.SphereGeometry(limbR * 1.35, 12, 10), skin), 0, -foreLen - limbR * 0.6, 0))
    upper.rotation.z = side * 0.12
    arms.push({ upper, lower })
  }

  // Head
  const neck = group(spine, 0, torsoLen * 0.88, 0)
  neck.add(at(m(new THREE.CylinderGeometry(limbR * 0.9, limbR * 1.05, headR * 0.5, 10), skin), 0, headR * 0.15, 0))
  const head = group(neck, 0, headR * 1.15, 0)
  const skull = m(new THREE.SphereGeometry(headR, 28, 22), skin)
  skull.scale.set(1, 1.02, 0.96)
  head.add(skull)
  for (const side of [-1, 1]) head.add(at(m(new THREE.SphereGeometry(headR * 0.2, 10, 8), skin), side * headR * 0.97, 0, 0))
  const face = buildFace(head, headR, skin, look.hair === '#D9D6D0' ? '#BDBAB4' : look.hair, kid)

  // Hair
  const capGeo = new THREE.SphereGeometry(headR * 1.05, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)
  if (look.hairStyle !== 'none') {
    const cap = m(capGeo, hairMat)
    cap.rotation.x = -0.25
    cap.position.set(0, headR * 0.06, -headR * 0.05)
    head.add(cap)
  }
  if (look.hairStyle === 'bun') head.add(at(m(new THREE.SphereGeometry(headR * 0.42, 16, 12), hairMat), 0, headR * 0.85, -headR * 0.55))
  if (look.hairStyle === 'puffs') {
    for (const side of [-1, 1]) head.add(at(m(new THREE.IcosahedronGeometry(headR * 0.5, 1), hairMat), side * headR * 0.95, headR * 0.65, -headR * 0.1))
  }
  if (look.hairStyle === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      head.add(at(m(new THREE.IcosahedronGeometry(headR * 0.3, 0), hairMat), Math.cos(a) * headR * 0.75, headR * 0.6 + Math.sin(i * 2.3) * headR * 0.08, Math.sin(a) * headR * 0.7 - headR * 0.1))
    }
  }
  if (look.hairStyle === 'bob' || look.hairStyle === 'long') {
    const len = look.hairStyle === 'long' ? headR * 1.8 : headR * 0.95
    const back = at(m(new THREE.CylinderGeometry(headR * 1.02, headR * 1.08, len, 20, 1, true, Math.PI * 0.62, Math.PI * 1.76), hairMat), 0, -len / 2 + headR * 0.35, -headR * 0.05)
    ;(back.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    head.add(back)
  }
  if (look.beard) {
    const beard = at(m(new THREE.SphereGeometry(headR * 0.62, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), std(look.beard, 0.85)), 0, -headR * 0.18, headR * 0.35)
    head.add(beard)
  }
  if (look.glasses) {
    const frame = std('#1F2937', 0.4, 0.4)
    for (const side of [-1, 1]) {
      const ring = at(m(new THREE.TorusGeometry(headR * 0.22, headR * 0.025, 6, 20), frame, false), side * headR * 0.38, headR * 0.12, headR * 0.98)
      head.add(ring)
    }
    head.add(at(m(new THREE.BoxGeometry(headR * 0.3, headR * 0.03, headR * 0.03), frame, false), 0, headR * 0.14, headR * 1.0))
  }
  if (look.goggles) {
    const band = at(m(new THREE.TorusGeometry(headR * 1.0, headR * 0.06, 6, 28), std('#1E293B', 0.6)), 0, headR * 0.5, 0)
    band.rotation.x = Math.PI / 2 - 0.35
    head.add(band)
    for (const side of [-1, 1]) {
      const lens = at(m(new THREE.CylinderGeometry(headR * 0.24, headR * 0.24, headR * 0.16, 16), glowMat('#00B8D4', 0.5)), side * headR * 0.33, headR * 0.82, headR * 0.5)
      lens.rotation.x = Math.PI / 2 - 0.5
      head.add(lens)
    }
  }
  if (look.hat === 'chef') {
    const white = std('#FFFFFF', 0.85)
    head.add(at(m(new THREE.CylinderGeometry(headR * 0.85, headR * 0.8, headR * 0.6, 20), white), 0, headR * 0.95, 0))
    head.add(at(m(new THREE.SphereGeometry(headR * 0.95, 18, 12), white), 0, headR * 1.45, 0))
  } else if (look.hat === 'captain') {
    const hm = std(look.hatColor ?? '#0F172A', 0.6)
    head.add(at(m(new THREE.CylinderGeometry(headR * 1.02, headR * 0.98, headR * 0.45, 22), hm), 0, headR * 0.8, 0))
    const brim = at(m(new THREE.CylinderGeometry(headR * 0.7, headR * 0.7, headR * 0.06, 16, 1, false, -Math.PI / 2, Math.PI), std('#111827', 0.3)), 0, headR * 0.6, headR * 0.5)
    head.add(brim)
    head.add(at(m(new THREE.SphereGeometry(headR * 0.12, 8, 6), glowMat('#FACC15', 0.5)), 0, headR * 0.82, headR * 1.0))
  } else if (look.hat === 'cap') {
    const hm = std(look.hatColor ?? '#FACC15', 0.6)
    head.add(at(m(new THREE.SphereGeometry(headR * 1.07, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hm), 0, headR * 0.12, 0))
    const brim = at(m(new THREE.CylinderGeometry(headR * 0.6, headR * 0.6, headR * 0.05, 16, 1, false, -Math.PI / 2, Math.PI), hm), 0, headR * 0.55, headR * 0.6)
    head.add(brim)
  } else if (look.hat === 'headwrap') {
    const hm = std(look.hatColor ?? '#F59E0B', 0.7)
    const wrap = at(m(new THREE.SphereGeometry(headR * 1.12, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hm), 0, headR * 0.22, -headR * 0.08)
    wrap.scale.set(1, 1.25, 1)
    head.add(wrap)
  }

  const eyeHeight = legLen + hipW * 0.3 + torsoLen * 0.88 + headR * 1.27
  const blink = { next: Math.random() * 3, until: 0 }
  let yaw = 0
  let pitch = 0
  let gw = 0
  let walkPhase = Math.random() * 6
  const elderPace = look.elder ? 0.75 : 1
  const actor: Actor = {
    id,
    root,
    eyeHeight,
    height: eyeHeight + headR * 1.2,
    update(t, dt, s, calm) {
      // Breathing + weight shift
      const breathe = calm ? 0 : Math.sin(t * 2.1 * elderPace) * 0.012
      spine.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe * 0.6)
      hips.rotation.z = calm ? 0 : Math.sin(t * 0.7) * 0.02
      // Head look + speaking nod
      const headY = root.position.y + eyeHeight
      const [ty, tp] = lookAngles(root, headY, s.look)
      yaw = damp(yaw, ty, 5, dt)
      pitch = damp(pitch, tp, 5, dt)
      neck.rotation.y = yaw * 0.4
      head.rotation.y = yaw * 0.6
      const nod = s.speaking && !calm ? Math.sin(t * 7.5) * 0.06 * s.talk : 0
      head.rotation.x = pitch + nod + (look.elder ? -0.05 : 0)
      head.rotation.z = s.emotion === 'worried' || s.gesture === 'think' ? 0.12 : s.speaking && !calm ? Math.sin(t * 1.3) * 0.04 : 0
      animateFace(face, t, dt, s, blink, calm)

      // Walk cycle
      const w = s.walking
      walkPhase += dt * 8.5 * elderPace * (w > 0.01 ? 1 : 0)
      const swing = Math.sin(walkPhase) * 0.55 * w
      legs[0].upper.rotation.x = swing
      legs[1].upper.rotation.x = -swing
      legs[0].lower.rotation.x = Math.max(0, -Math.sin(walkPhase + 0.9)) * 0.8 * w
      legs[1].lower.rotation.x = Math.max(0, Math.sin(walkPhase + 0.9)) * 0.8 * w
      hips.position.y = legLen + Math.abs(Math.cos(walkPhase)) * 0.025 * w

      // Gestures blend over the arm swing.
      const target = s.gesture !== 'none' ? 1 : 0
      gw = damp(gw, target, 6, dt)
      const gt = s.gestureT
      const armSwing = -swing * 0.8
      arms.forEach((arm, i) => {
        const side = i === 0 ? -1 : 1
        const restZ = side * 0.12
        let ux = armSwing * (i === 0 ? -1 : 1)
        let uz = restZ
        let lx = -0.15
        const talkWave = Math.sin(t * 4 + i) * 0.15 * s.talk
        switch (s.gesture) {
          case 'explain':
            ux = -0.55 + talkWave
            uz = side * 0.35
            lx = -1.0 + Math.sin(t * 3.1 + i * 1.7) * 0.25
            break
          case 'point':
            if (side === 1) {
              ux = -1.35
              uz = 0.15
              lx = -0.1
            }
            break
          case 'wave':
            if (side === 1) {
              ux = -0.2
              uz = 2.5
              lx = -0.35 + Math.sin(gt * 11) * 0.45
            }
            break
          case 'cheer':
            ux = -0.3
            uz = side * (2.6 + Math.sin(gt * 9) * 0.15)
            lx = -0.2
            break
          case 'think':
            if (side === 1) {
              ux = -0.9
              uz = -0.25
              lx = -2.2
            }
            break
          case 'shrug':
            ux = -0.25
            uz = side * 0.65
            lx = -1.35
            break
          default:
            break
        }
        arm.upper.rotation.x = THREE.MathUtils.lerp(armSwing * (i === 0 ? -1 : 1), ux, gw)
        arm.upper.rotation.z = THREE.MathUtils.lerp(restZ, uz, gw)
        arm.lower.rotation.x = THREE.MathUtils.lerp(-0.15 - Math.abs(armSwing) * 0.4, lx, gw)
      })
    },
  }
  return actor
}

// ── Spark: the orange robot who hovers ──────────────────────────────────────

export function buildSpark(): Actor {
  const root = new THREE.Group()
  root.name = 'actor:spark'
  const orange = std('#FC6818', 0.38, 0.1)
  const cream = std('#FFF1E6', 0.45)
  const dark = new THREE.MeshStandardMaterial({ color: '#0A1120', roughness: 0.15, metalness: 0.4 })
  const cyan = glowMat('#00E5FF', 2.2)

  const body = group(root, 0, 0.62, 0)
  const torso = m(new THREE.SphereGeometry(0.2, 28, 20), orange)
  torso.scale.set(1, 1.05, 0.9)
  body.add(torso)
  const belly = at(m(new THREE.SphereGeometry(0.13, 20, 14), cream), 0, -0.01, 0.1)
  belly.scale.set(1, 1, 0.5)
  body.add(belly)
  body.add(at(m(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), glowMat('#FFB020', 1.6)), 0, 0.02, 0.17)).rotation.x = Math.PI / 2

  const head = group(body, 0, 0.3, 0)
  head.add(m(new RoundedBoxGeometry(0.42, 0.32, 0.34, 4, 0.11), orange))
  const screen = at(m(new RoundedBoxGeometry(0.34, 0.22, 0.05, 3, 0.05), dark), 0, -0.005, 0.155)
  head.add(screen)
  const eyes: THREE.Mesh[] = []
  const happyEyes: THREE.Mesh[] = []
  for (const side of [-1, 1]) {
    const e = at(m(new THREE.CapsuleGeometry(0.03, 0.045, 4, 10), cyan, false), side * 0.075, 0.025, 0.185)
    head.add(e)
    eyes.push(e)
    const h = at(m(new THREE.TorusGeometry(0.035, 0.012, 6, 14, Math.PI), cyan, false), side * 0.075, 0.015, 0.185)
    h.visible = false
    head.add(h)
    happyEyes.push(h)
  }
  const mouth = at(m(new RoundedBoxGeometry(0.09, 0.02, 0.01, 2, 0.008), cyan, false), 0, -0.06, 0.185)
  head.add(mouth)
  for (const side of [-1, 1]) {
    const ear = at(m(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), cream), side * 0.225, 0, 0)
    ear.rotation.z = Math.PI / 2
    head.add(ear)
  }
  const antenna = group(head, 0, 0.16, 0)
  antenna.add(at(m(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), std('#334155', 0.4, 0.5)), 0, 0.06, 0))
  const tip = at(m(new THREE.SphereGeometry(0.032, 14, 10), glowMat('#FFB020', 2.4)), 0, 0.13, 0)
  antenna.add(tip)

  const arms: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const sh = group(body, side * 0.2, 0.03, 0)
    sh.add(at(m(new THREE.CapsuleGeometry(0.035, 0.12, 4, 10), orange), 0, -0.08, 0))
    sh.add(at(m(new THREE.SphereGeometry(0.048, 12, 10), cream), 0, -0.18, 0))
    sh.rotation.z = side * 0.35
    arms.push(sh)
  }
  // Hover jet
  const jet = at(m(new THREE.ConeGeometry(0.07, 0.12, 16, 1, true), glowMat('#FFB020', 2.6), false), 0, -0.26, 0)
  jet.rotation.x = Math.PI
  ;(jet.material as THREE.MeshStandardMaterial).transparent = true
  ;(jet.material as THREE.MeshStandardMaterial).opacity = 0.75
  body.add(jet)
  body.add(at(m(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 16), std('#334155', 0.4, 0.6)), 0, -0.2, 0))

  const blink = { next: 2, until: 0 }
  let yaw = 0
  let pitch = 0
  let gw = 0
  return {
    id: 'spark',
    root,
    eyeHeight: 0.95,
    height: 1.15,
    update(t, dt, s, calm) {
      body.position.y = 0.62 + (calm ? 0 : Math.sin(t * 2.2) * 0.035)
      body.rotation.z = calm ? 0 : Math.sin(t * 1.4) * 0.04 - s.walking * 0.05
      body.rotation.x = s.walking * 0.18
      jet.scale.set(1, 0.8 + Math.random() * 0.4 * (calm ? 0 : 1) + s.walking * 0.6, 1)
      const [ty, tp] = lookAngles(root, root.position.y + 0.95, s.look)
      yaw = damp(yaw, ty, 6, dt)
      pitch = damp(pitch, tp, 6, dt)
      head.rotation.y = yaw
      head.rotation.x = pitch + (s.speaking && !calm ? Math.sin(t * 8) * 0.05 * s.talk : 0)
      head.rotation.z = s.emotion === 'worried' ? 0.15 : s.gesture === 'think' ? -0.12 : 0
      antenna.rotation.z = calm ? 0 : Math.sin(t * 3.3) * 0.18
      ;(tip.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8 + s.talk * 2
      // Eyes: blink, happy arcs, surprised big.
      if (t > blink.next) {
        blink.until = t + 0.12
        blink.next = t + 2.2 + Math.random() * 2.5
      }
      const happy = s.emotion === 'happy'
      eyes.forEach((e, i) => {
        e.visible = !happy
        happyEyes[i].visible = happy
        const sy = t < blink.until && !calm ? 0.1 : s.emotion === 'surprised' ? 1.3 : s.emotion === 'worried' ? 0.75 : 1
        e.scale.y = damp(e.scale.y, sy, 25, dt)
        e.rotation.z = s.emotion === 'worried' ? (i === 0 ? -0.3 : 0.3) : 0
      })
      const open = s.speaking ? Math.min(1, s.talk * 1.3) : 0
      mouth.scale.set(1 + open * 0.3 + (happy ? 0.25 : 0), 1 + open * 3.2, 1)
      gw = damp(gw, s.gesture === 'none' ? 0 : 1, 6, dt)
      arms.forEach((a, i) => {
        const side = i === 0 ? -1 : 1
        let x = calm ? 0 : Math.sin(t * 1.9 + i) * 0.1
        let z = side * 0.35
        if (s.gesture === 'cheer') {
          z = side * (2.5 + Math.sin(s.gestureT * 10) * 0.2)
          x = 0
        } else if (s.gesture === 'wave' && side === 1) {
          z = 2.4 + Math.sin(s.gestureT * 12) * 0.35
        } else if (s.gesture === 'point' && side === 1) {
          x = -1.3
          z = 0.2
        } else if (s.gesture === 'explain') {
          x = -0.7 + Math.sin(t * 3 + i * 2) * 0.3 * (0.3 + s.talk)
          z = side * 0.6
        } else if (s.gesture === 'shrug') {
          z = side * 1.0
          x = -0.4
        } else if (s.gesture === 'think' && side === 1) {
          x = -1.6
          z = -0.3
        }
        a.rotation.x = THREE.MathUtils.lerp(calm ? 0 : Math.sin(t * 1.9 + i) * 0.1, x, gw)
        a.rotation.z = THREE.MathUtils.lerp(side * 0.35, z, gw)
      })
    },
  }
}

// ── Bolt: the robot puppy ─────────────────────────────────────────────────

export function buildBolt(): Actor {
  const root = new THREE.Group()
  root.name = 'actor:bolt'
  const shell = std('#CBD5E1', 0.35, 0.45)
  const accent = std('#00B8D4', 0.4, 0.2)
  const dark = new THREE.MeshStandardMaterial({ color: '#0A1120', roughness: 0.2, metalness: 0.3 })
  const eye = glowMat('#00E5FF', 2.2)

  const body = group(root, 0, 0.24, 0)
  body.add(m(new RoundedBoxGeometry(0.24, 0.17, 0.36, 4, 0.07), shell))
  body.add(at(m(new RoundedBoxGeometry(0.245, 0.04, 0.2, 2, 0.015), accent), 0, 0.07, 0))
  const head = group(body, 0, 0.11, 0.2)
  head.add(m(new RoundedBoxGeometry(0.22, 0.18, 0.18, 4, 0.06), shell))
  head.add(at(m(new RoundedBoxGeometry(0.17, 0.1, 0.04, 3, 0.03), dark), 0, 0.02, 0.085))
  const eyes: THREE.Mesh[] = []
  for (const side of [-1, 1]) {
    const e = at(m(new THREE.SphereGeometry(0.022, 12, 10), eye, false), side * 0.04, 0.025, 0.105)
    head.add(e)
    eyes.push(e)
  }
  const jaw = group(head, 0, -0.05, 0.06)
  jaw.add(at(m(new RoundedBoxGeometry(0.1, 0.04, 0.08, 2, 0.015), accent), 0, -0.01, 0.03))
  head.add(at(m(new THREE.SphereGeometry(0.022, 10, 8), std('#0F172A', 0.3)), 0, -0.015, 0.14))
  const ears: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const ear = group(head, side * 0.08, 0.09, -0.02)
    const e = at(m(new THREE.ConeGeometry(0.04, 0.1, 4), accent), 0, 0.045, 0)
    e.scale.z = 0.4
    ear.add(e)
    ear.rotation.z = side * -0.3
    ears.push(ear)
  }
  const tail = group(body, 0, 0.06, -0.18)
  tail.add(at(m(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), std('#334155', 0.4, 0.5)), 0, 0.08, 0))
  const tailTip = at(m(new THREE.SphereGeometry(0.026, 10, 8), glowMat('#FFB020', 2)), 0, 0.17, 0)
  tail.add(tailTip)
  tail.rotation.x = -0.5
  const legs: THREE.Group[] = []
  for (const [x, z] of [[-0.08, 0.12], [0.08, 0.12], [-0.08, -0.12], [0.08, -0.12]] as const) {
    const leg = group(body, x, -0.06, z)
    leg.add(at(m(new THREE.CylinderGeometry(0.025, 0.022, 0.14, 8), std('#475569', 0.4, 0.5)), 0, -0.07, 0))
    leg.add(at(m(new THREE.SphereGeometry(0.035, 10, 8), shell), 0, -0.15, 0.01))
    legs.push(leg)
  }
  let yaw = 0
  let phase = 0
  return {
    id: 'bolt',
    root,
    eyeHeight: 0.38,
    height: 0.5,
    update(t, dt, s, calm) {
      phase += dt * 13 * (s.walking > 0.01 ? 1 : 0)
      legs.forEach((l, i) => {
        l.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6 * s.walking
      })
      body.position.y = 0.24 + Math.abs(Math.sin(phase)) * 0.02 * s.walking + (calm ? 0 : Math.sin(t * 2.6) * 0.004)
      const wagRate = s.emotion === 'happy' || s.speaking ? 18 : 6
      tail.rotation.z = calm ? 0 : Math.sin(t * wagRate) * (s.emotion === 'worried' ? 0.1 : 0.55)
      tail.rotation.x = s.emotion === 'worried' ? 0.4 : -0.5
      const [ty] = lookAngles(root, root.position.y + 0.38, s.look)
      yaw = damp(yaw, ty, 7, dt)
      head.rotation.y = yaw
      const bark = s.speaking ? s.talk : 0
      head.rotation.x = -bark * 0.25 + (calm ? 0 : Math.sin(t * 1.7) * 0.05)
      head.rotation.z = s.emotion === 'surprised' || s.gesture === 'shrug' ? Math.sin(t * 2) * 0.25 : 0
      jaw.rotation.x = bark * 0.6
      ears.forEach((e, i) => {
        const side = i === 0 ? -1 : 1
        const perk = s.speaking || s.emotion === 'surprised' ? -0.05 : s.emotion === 'worried' ? -1.0 : -0.3
        e.rotation.z = damp(e.rotation.z, side * perk + (calm ? 0 : Math.sin(t * 5 + i) * 0.05), 10, dt)
      })
      const b = (t % 3.7) > 3.58 && !calm ? 0.15 : 1
      for (const e of eyes) e.scale.y = b
    },
  }
}

// ── The child's own robot ─────────────────────────────────────────────────

export const MYROBOT_SCALE = 0.5

export function buildMyRobot(design: RobotDesign): Actor {
  const root = new THREE.Group()
  root.name = 'actor:myrobot'
  const robot = buildRobot(design)
  robot.scale.setScalar(MYROBOT_SCALE)
  root.add(robot)
  const h = getRobotHandles(robot)
  const box = new THREE.Box3().setFromObject(robot)
  const height = box.max.y
  let yaw = 0
  return {
    id: 'myrobot',
    root,
    eyeHeight: height * 0.8,
    height,
    update(t, dt, s, calm) {
      animateRobot(robot, t, { moving: s.walking > 0.05, reducedMotion: calm, lightOn: root.userData.lightOn === true })
      if (h) {
        const head = h.slots.head
        const pop = s.speaking ? s.talk : 0
        head.scale.setScalar(1 + pop * 0.08)
        head.position.y = pop * 0.03
        const [ty] = lookAngles(root, root.position.y + height * 0.8, s.look)
        yaw = damp(yaw, ty * 0.6, 5, dt)
        head.rotation.y = yaw
        h.bodyGroup.rotation.z = s.emotion === 'happy' && !calm ? Math.sin(t * 9) * 0.06 : 0
        for (const bl of h.blinkers) bl.scale.y = Math.max(bl.scale.y, s.speaking ? 0.7 + pop * 0.6 : bl.scale.y)
      }
    },
  }
}

/** Collect a robot's materials (for the x-ray scene). */
export function robotMaterials(actor: Actor): THREE.MeshStandardMaterial[] {
  const out: THREE.MeshStandardMaterial[] = []
  actor.root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mt of mats) if ((mt as THREE.MeshStandardMaterial).isMeshStandardMaterial) out.push(mt as THREE.MeshStandardMaterial)
    }
  })
  return out
}

export function buildActor(id: CastId, design: RobotDesign): Actor {
  if (id === 'spark') return buildSpark()
  if (id === 'bolt') return buildBolt()
  if (id === 'myrobot') return buildMyRobot(design)
  return buildHuman(id, LOOKS[id] ?? LOOKS.okafor)
}
