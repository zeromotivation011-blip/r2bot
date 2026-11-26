// components/kids/games/sumo-arena/render.ts
// The Battle Dome in three.js: a raised black dohyo with its white edge line and
// brown start lines, the child's own robot (lib/kids/robot3d.ts) and the rival,
// the distance beam and edge-sensor lights. Only imported from the game client,
// which is itself loaded with next/dynamic({ ssr: false }).

import * as THREE from 'three'
import { animateRobot, buildRobot, disposeObject } from '@/lib/kids/robot3d'
import { MODEL_SCALE } from '@/lib/kids/sim/robot-spec'
import type { RobotDesign } from '@/lib/kids/robot-design'
import { createStage, prefersReducedMotion, type Stage } from '@/components/kids/three/stage'
import { LINE_W, RING_H, RING_R, type BotId, type BotView } from './sim'

export interface SumoScene {
  /** Put both robots in the ring (new match or new designs). */
  setRobots(you: RobotDesign, rival: RobotDesign): void
  /** Latest physics poses; called after the sim steps. */
  update(views: BotView[]): void
  /** Where a robot is on screen, in CSS pixels from the canvas' top-left (null when hidden). */
  screenPos(id: BotId): { x: number; y: number } | null
  /** Run a function every animation frame (dt in seconds). */
  onFrame(fn: (dt: number) => void): void
  setActive(active: boolean): void
  dispose(): void
}

export function createSumoScene(container: HTMLElement): SumoScene {
  const stage: Stage = createStage(container, { background: '#0A1120', fov: 38 })
  const { scene, camera } = stage
  const reduced = prefersReducedMotion()

  // Floor of the dome and a soft spotlight pool.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#0F1A2E', roughness: 0.95 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const pool = new THREE.Mesh(new THREE.CircleGeometry(RING_R * 1.5, 64), new THREE.MeshBasicMaterial({ color: '#FC6818', transparent: true, opacity: 0.08 }))
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.001
  scene.add(pool)

  // The dohyo: hard black rubber top, 5 cm high.
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(RING_R, RING_R + 0.008, RING_H, 96),
    new THREE.MeshStandardMaterial({ color: '#16181D', roughness: 0.85, metalness: 0.05 }),
  )
  ring.position.y = RING_H / 2
  ring.receiveShadow = true
  ring.castShadow = true
  scene.add(ring)
  const edge = new THREE.Mesh(new THREE.RingGeometry(RING_R - LINE_W, RING_R, 128), new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.6 }))
  edge.rotation.x = -Math.PI / 2
  edge.position.y = RING_H + 0.0015
  edge.receiveShadow = true
  scene.add(edge)
  // Shikiri-sen: the two brown start lines.
  for (const z of [-0.12, 0.12]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.02), new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 0.8 }))
    line.rotation.x = -Math.PI / 2
    line.position.set(0, RING_H + 0.0016, z)
    scene.add(line)
  }

  // Distance beam (cyan) for the child's robot, and edge-sensor lights for both.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), new THREE.MeshBasicMaterial({ color: '#00E5FF', transparent: true, opacity: 0.85 }))
  beam.visible = false
  scene.add(beam)
  const edgeDot = () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: '#FC6818' }))
    m.visible = false
    scene.add(m)
    return m
  }
  const dots: Record<BotId, [THREE.Mesh, THREE.Mesh]> = { you: [edgeDot(), edgeDot()], rival: [edgeDot(), edgeDot()] }

  const roots: Record<BotId, THREE.Group> = { you: new THREE.Group(), rival: new THREE.Group() }
  const models: Partial<Record<BotId, THREE.Group>> = {}
  const halfWidths: Record<BotId, number> = { you: 0.1, rival: 0.1 }
  const fronts: Record<BotId, number> = { you: 0.08, rival: 0.08 }
  scene.add(roots.you, roots.rival)
  let latest: BotView[] = []

  // Camera: behind the child's robot (south), looking across the ring. Pulls back on narrow screens.
  const placeCamera = () => {
    const aspect = Math.max(0.4, camera.aspect)
    const k = aspect < 1.35 ? 1.35 / aspect : 1
    camera.position.set(0, 1.75 * Math.min(k, 1.6), -1.75 * k)
    camera.lookAt(0, 0, 0.08)
  }
  placeCamera()
  const ro = new ResizeObserver(placeCamera)
  ro.observe(container)

  let elapsed = 0
  let frameFn: ((dt: number) => void) | null = null
  const q = new THREE.Quaternion()
  const tilt = new THREE.Quaternion()
  const xAxis = new THREE.Vector3(1, 0, 0)
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  stage.onFrame((_t, dt) => {
    elapsed += dt
    frameFn?.(dt)
    for (const v of latest) {
      const root = roots[v.id]
      root.position.set(v.p.x, v.p.y, v.p.z)
      q.set(v.q.x, v.q.y, v.q.z, v.q.w)
      // A robot carried on a wedge rides up a little at the front.
      if (v.lifted) q.multiply(tilt.setFromAxisAngle(xAxis, -0.12))
      root.quaternion.copy(q)
      const model = models[v.id]
      if (model) {
        const ws = v.wheel[0] + v.wheel[1]
        animateRobot(model, elapsed, { moving: Math.abs(v.wheel[0]) + Math.abs(v.wheel[1]) > 0.02, direction: ws < 0 ? -1 : 1, reducedMotion: reduced })
      }
      // Edge sensors light up orange on the white line.
      const [dl, dr] = dots[v.id]
      for (const [dot, on, sx] of [
        [dl, v.edgeL, 1],
        [dr, v.edgeR, -1],
      ] as const) {
        dot.visible = on && !v.out
        if (dot.visible) {
          v1.set(sx * halfWidths[v.id] * 0.75, 0.012, fronts[v.id] + 0.005).applyQuaternion(q).add(root.position)
          dot.position.copy(v1)
        }
      }
      if (v.id === 'you') {
        const show = v.distCm !== null && !v.out
        beam.visible = show
        if (show && v.distCm !== null) {
          const len = v.distCm / 100
          v1.set(0, 0.1, fronts.you).applyQuaternion(q).add(root.position)
          v2.set(0, 0, 1).applyQuaternion(q).setY(0).normalize()
          beam.scale.set(1, len, 1)
          beam.position.copy(v1).addScaledVector(v2, len / 2)
          beam.quaternion.setFromUnitVectors(up, v2)
        }
      }
    }
  })

  return {
    setRobots(you, rival) {
      for (const [id, d] of [
        ['you', you],
        ['rival', rival],
      ] as const) {
        const old = models[id]
        if (old) {
          roots[id].remove(old)
          disposeObject(old)
        }
        const m = buildRobot(d)
        m.scale.setScalar(MODEL_SCALE)
        m.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (mesh.isMesh) mesh.castShadow = true
        })
        // Measured before it joins the scene, so the box is in the robot's own frame (metres).
        const box = new THREE.Box3().setFromObject(m)
        halfWidths[id] = Math.max(0.06, (box.max.x - box.min.x) / 2)
        fronts[id] = Math.max(0.05, box.max.z)
        models[id] = m
        roots[id].add(m)
      }
    },
    update(views) {
      latest = views
    },
    screenPos(id) {
      const v = latest.find((b) => b.id === id)
      if (!v || v.out) return null
      v1.set(v.p.x, v.p.y + 0.32, v.p.z).project(camera)
      const w = container.clientWidth
      const h = container.clientHeight
      return { x: ((v1.x + 1) / 2) * w, y: ((1 - v1.y) / 2) * h }
    },
    onFrame(fn) {
      frameFn = fn
    },
    setActive(a) {
      stage.setActive(a)
    },
    dispose() {
      ro.disconnect()
      stage.dispose()
    },
  }
}
