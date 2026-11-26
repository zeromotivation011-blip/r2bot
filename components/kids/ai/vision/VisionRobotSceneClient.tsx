'use client'
// components/kids/ai/vision/VisionRobotSceneClient.tsx
// The child's own robot (from the Workshop design) in a small round arena,
// obeying whatever the Vision Lab's classifier currently sees. Loaded with
// next/dynamic({ ssr: false }) so three.js stays out of the page bundle.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildRobot, animateRobot } from '@/lib/kids/robot3d'
import { loadDesign } from '@/lib/kids/robot-design'
import { createStage, prefersReducedMotion } from '@/components/kids/three/stage'
import type { RobotAction } from '@/lib/kids/ai/vision/missions'

interface Props {
  action: RobotAction
  /** Called every frame the robot is actually following the ball, with seconds elapsed. */
  onFollow?: (dt: number) => void
}

const ARENA = 2.4
const SPEED = 0.9
const TURN = 1.8

export default function VisionRobotSceneClient({ action, onFollow }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const actionRef = useRef<RobotAction>(action)
  const followRef = useRef(onFollow)
  actionRef.current = action
  followRef.current = onFollow

  useEffect(() => {
    const el = host.current
    if (!el) return
    let stage: ReturnType<typeof createStage>
    try {
      stage = createStage(el, { background: '#0A1120', fov: 38 })
    } catch {
      el.textContent = 'Your phone could not start the 3D view, but the lab still works.'
      return
    }
    const { scene, camera } = stage
    camera.position.set(0, 4.6, 5.4)
    camera.lookAt(0, 0, 0.2)

    // Floor: a navy disk with a soft orange ring and grid.
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA + 0.4, 64), new THREE.MeshStandardMaterial({ color: '#16233D', roughness: 0.9 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA + 0.32, ARENA + 0.4, 64), new THREE.MeshBasicMaterial({ color: '#FC6818' }))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.003
    scene.add(ring)
    const grid = new THREE.PolarGridHelper(ARENA + 0.3, 8, 5, 64, '#2B3B5C', '#22314F')
    grid.position.y = 0.002
    scene.add(grid)

    const robot = buildRobot(loadDesign())
    robot.scale.setScalar(0.75)
    scene.add(robot)

    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.35 }))
    ball.castShadow = true
    scene.add(ball)

    const reduced = prefersReducedMotion()
    let heading = 0 // radians; 0 faces +Z
    const pos = new THREE.Vector2(0, 0)
    let ballT = 0

    stage.onFrame((t, dt) => {
      const a = actionRef.current
      // The ball wanders slowly around the arena on a looping path.
      ballT += dt * (a === 'follow' ? 0.35 : 0.2)
      ball.position.set(Math.sin(ballT) * 1.7, 0.16, Math.cos(ballT * 0.7) * 1.5)

      let moving = false
      let dir = 1
      if (a === 'forward') {
        moving = true
      } else if (a === 'left') {
        heading += TURN * dt
        moving = true
        dir = 0.4
      } else if (a === 'right') {
        heading -= TURN * dt
        moving = true
        dir = 0.4
      } else if (a === 'spin') {
        heading += TURN * 2 * dt
      } else if (a === 'follow') {
        const dx = ball.position.x - pos.x
        const dz = ball.position.z - pos.y
        const want = Math.atan2(dx, dz)
        let diff = want - heading
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        heading += Math.max(-TURN * dt, Math.min(TURN * dt, diff * 3 * dt + Math.sign(diff) * TURN * 0.4 * dt))
        const d = Math.hypot(dx, dz)
        if (d > 0.55) moving = true
        followRef.current?.(dt)
      }
      if (moving) {
        const sp = SPEED * dir
        pos.x += Math.sin(heading) * sp * dt
        pos.y += Math.cos(heading) * sp * dt
        // A soft wall: near the edge the robot turns back toward the middle.
        const r = pos.length()
        if (r > ARENA) {
          pos.multiplyScalar(ARENA / r)
          heading += Math.PI * 0.6
        }
      }
      robot.position.set(pos.x, 0, pos.y)
      robot.rotation.y = heading
      animateRobot(robot, t, {
        moving: moving || a === 'spin',
        direction: 1,
        reducedMotion: reduced,
      })
    })

    return () => stage.dispose()
  }, [])

  return <div ref={host} className="h-full w-full" aria-hidden="true" />
}
