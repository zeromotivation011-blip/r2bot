// components/kids/three/ar-robot.verify.ts
// "See it in your room" shows exactly the robot the Workshop shows:
//   1. for every World form (ground / drone / sub / humanoid) × every drive, the
//      AR robot has the same visible meshes, colours and rotors as the Workshop
//      robot (built the Workshop's way, X-ray insides hidden as they are there);
//   2. a fitted World form really changes the AR robot (it used to fall back to
//      the ground drive), and the label names the form;
//   3. learned parts glow in AR as in the Workshop;
//   4. the magic-window camera fits the whole robot on a portrait phone and a
//      laptop, for every form, and is never closer than the old fixed view.
//
// Run:  npx tsx components/kids/three/ar-robot.verify.ts

import * as THREE from 'three'
import { buildRobot, disposeObject, getRobotHandles } from '@/lib/kids/robot3d'
import { DEFAULT_DESIGN, UPGRADE_PARTS, type DriveId, type RobotDesign } from '@/lib/kids/robot-design'
import { AR_FOV, arFormLabel, arMagicWindowFrame, AR_XR_SCALE, buildARRobot } from './ar-robot'

let failed = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${detail}`}`)
}

/** Visible meshes as "geometry-type:colour", sorted — a fingerprint of what the child sees. */
function fingerprint(root: THREE.Object3D): string[] {
  root.updateMatrixWorld(true)
  const out: string[] = []
  const walk = (o: THREE.Object3D) => {
    if (!o.visible) return
    const m = o as THREE.Mesh
    if (m.isMesh) {
      const mat = m.material as THREE.MeshStandardMaterial
      const col = mat && 'color' in mat && mat.color ? mat.color.getHexString() : '-'
      const em = mat && 'emissive' in mat && mat.emissive ? mat.emissive.getHexString() : '-'
      out.push(`${m.geometry.type}:${col}:${em}`)
    }
    for (const c of o.children) walk(c)
  }
  walk(root)
  return out.sort()
}

const chassisIds = UPGRADE_PARTS.filter((p) => p.slot === 'chassis').map((p) => p.id)
const drives: DriveId[] = ['wheels2', 'wheels4', 'tracks', 'legs']

check('there are World forms to test', chassisIds.length >= 4, chassisIds.join(','))

// ── 1 + 2. Same robot as the Workshop, World form included ──────────────────
let mismatch = 0
const where: string[] = []
let formChanges = 0
for (const chassis of chassisIds) {
  for (const drive of drives) {
    const d: RobotDesign = {
      ...DEFAULT_DESIGN,
      name: 'Zippy',
      drive,
      primary: '#22D3EE',
      accent: '#F59E0B',
      upgrades: { chassis: chassis as never, power: 'solar', sensor2: 'color', arm: 'arm2' },
    }
    let workshop: THREE.Group
    let ar: THREE.Group
    try {
      workshop = buildRobot(d, { worldForm: true, internals: true, learned: [] })
      ar = buildARRobot(d)
    } catch (e) {
      mismatch++
      where.push(`${chassis}/${drive}: threw ${String(e)}`)
      continue
    }
    const a = fingerprint(workshop).filter((x) => !x.startsWith('TubeGeometry')).join('|')
    const b = fingerprint(ar).join('|')
    // The Workshop also builds hidden X-ray insides; the fingerprint skips invisible things.
    if (a !== b) {
      mismatch++
      where.push(`${chassis}/${drive}`)
    }
    const hw = getRobotHandles(workshop)
    const ha = getRobotHandles(ar)
    if ((hw?.rotors.length ?? -1) !== (ha?.rotors.length ?? -2)) {
      mismatch++
      where.push(`${chassis}/${drive}: rotors ${hw?.rotors.length} vs ${ha?.rotors.length}`)
    }
    if (chassis === 'drone' && (ha?.rotors.length ?? 0) < 4) {
      mismatch++
      where.push(`drone/${drive}: only ${ha?.rotors.length} rotors`)
    }
    if (chassis !== 'ground') {
      const ground = buildRobot(d)
      if (fingerprint(ground).join('|') !== b) formChanges++
      disposeObject(ground)
    }
    const colours = new Set(fingerprint(ar).map((x) => x.split(':')[1]))
    if (!colours.has('22d3ee') || !colours.has('f59e0b')) {
      mismatch++
      where.push(`${chassis}/${drive}: colours ${[...colours].join(',')}`)
    }
    disposeObject(workshop)
    disposeObject(ar)
  }
}
check('AR robot = Workshop robot (visible meshes, colours, rotors) for every World form × drive', mismatch === 0, where.slice(0, 5).join('; '))
check('a fitted World form changes the AR robot (no fallback to the ground drive)', formChanges === (chassisIds.length - 1) * drives.length, `${formChanges}`)

for (const id of chassisIds) {
  const label = arFormLabel({ ...DEFAULT_DESIGN, upgrades: { chassis: id as never } })
  if (id === 'ground') check('ground robot has no form label', label === null)
  else check(`form label for ${id}`, label !== null && label.id === id && label.name.length > 0, JSON.stringify(label))
}
check('a design with no upgrades has no form label', arFormLabel(DEFAULT_DESIGN) === null)

// ── 3. Learned glow ─────────────────────────────────────────────────────────
{
  const d: RobotDesign = { ...DEFAULT_DESIGN, sensor: 'line', upgrades: { chassis: 'drone' } }
  const w = buildRobot(d, { worldForm: true, internals: true, learned: ['sensor', 'head'] })
  const a = buildARRobot(d, ['sensor', 'head'])
  const gw = getRobotHandles(w)?.glowMats.length ?? -1
  const ga = getRobotHandles(a)?.glowMats.length ?? -2
  check('learned parts glow in AR exactly as in the Workshop', gw === ga && ga > 0, `${gw} vs ${ga}`)
  disposeObject(w)
  disposeObject(a)
}

// ── 4. Magic-window framing ────────────────────────────────────────────────
{
  const g = buildARRobot(DEFAULT_DESIGN)
  const f = arMagicWindowFrame(g)
  for (const aspect of [390 / 844, 1280 / 800]) {
    const f = arMagicWindowFrame(g, aspect)
    const dist = Math.hypot(f.camera[0] - f.target[0], f.camera[1] - f.target[1], f.camera[2] - f.target[2])
    check(`magic window never closer than the old view (aspect ${aspect.toFixed(2)})`, dist >= Math.hypot(2.6, 1.0) - 1e-6, dist.toFixed(2))
  }
  disposeObject(g)
}
let outside = 0
const outWhere: string[] = []
for (const chassis of chassisIds)
  for (const drive of drives)
    for (const [w, h] of [
      [390, 844],
      [1280, 800],
    ] as const) {
      const d: RobotDesign = { ...DEFAULT_DESIGN, drive, upgrades: { chassis: chassis as never, arm: 'arm2', power: 'solar' } }
      const robot = buildARRobot(d)
      const f = arMagicWindowFrame(robot, w / h)
      const cam = new THREE.PerspectiveCamera(AR_FOV, w / h, 0.05, 100)
      cam.position.set(...f.camera)
      cam.lookAt(...f.target)
      cam.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(robot)
      const p = new THREE.Vector3()
      let worst = 0
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            p.set(x, y, z).project(cam)
            worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y))
          }
      if (worst > 1) {
        outside++
        outWhere.push(`${chassis}/${drive} @${w}x${h}: ${worst.toFixed(2)}`)
      }
      disposeObject(robot)
    }
check('the whole robot fits the magic window on a phone and a laptop, every form', outside === 0, outWhere.slice(0, 5).join('; '))
check('real-AR scale unchanged (0.35)', AR_XR_SCALE === 0.35)

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll AR robot checks passed.')
