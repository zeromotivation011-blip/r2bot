'use client'

// components/kids/course/BuildBayClient.tsx
// The Build beat's 3D view: the child's own robot on an R2BOT-orange turntable
// in a navy bay. When a part goes on it snaps in with a pop; drag to turn it.
// Loaded with next/dynamic({ ssr: false }) by BuildStepClient, behind a poster
// of the same size, so three.js never reaches a first load.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { animateRobot, buildRobot, disposeObject, getRobotHandles, snapEase } from '@/lib/kids/robot3d'
import { capabilitiesOf, type RobotDesign, type Slot } from '@/lib/kids/robot-design'
import { createStage, prefersReducedMotion, type Stage } from '@/components/kids/three/stage'

interface Props {
  design: RobotDesign
  /** Changes each time a part is fitted: drives the snap animation. */
  snap: { slot: Slot; n: number } | null
  onReady?: () => void
  onFail?: () => void
  label: string
}

export default function BuildBayClient({ design, snap, onReady, onFail, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const robotRef = useRef<THREE.Group | null>(null)
  const snapRef = useRef<{ slot: Slot; start: number } | null>(null)
  const designRef = useRef(design)
  designRef.current = design
  const cb = useRef({ onReady, onFail })
  cb.current = { onReady, onFail }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let stage: Stage
    try {
      stage = createStage(host, { background: '#0A1120' })
    } catch {
      cb.current.onFail?.()
      return
    }
    stageRef.current = stage
    const { scene, camera, renderer } = stage
    const reduced = prefersReducedMotion()
    scene.fog = new THREE.Fog('#0A1120', 6, 14)
    // On brand: the stage's default lights carry a violet tint; make the fill navy and the rim cyan.
    scene.traverse((o) => {
      if (o instanceof THREE.HemisphereLight) o.groundColor.set('#1B2740')
      else if (o instanceof THREE.DirectionalLight && o.color.getHex() !== new THREE.Color('#FFF7ED').getHex()) o.color.set('#00B8D4')
    })
    camera.position.set(2.0, 1.45, 2.5)

    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: '#111C32', roughness: 0.95 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const grid = new THREE.PolarGridHelper(5, 16, 6, 64, '#19263F', '#19263F')
    grid.position.y = 0.002
    scene.add(grid)
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1, 0.05, 56), new THREE.MeshStandardMaterial({ color: '#22314F', roughness: 0.6, metalness: 0.2 }))
    deck.position.y = 0.025
    deck.receiveShadow = true
    scene.add(deck)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 72), new THREE.MeshStandardMaterial({ color: '#FC6818', emissive: '#FC6818', emissiveIntensity: 0.9 }))
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.05
    scene.add(ring)
    const cyan = new THREE.PointLight('#00E5FF', 1.4, 6)
    cyan.position.set(-2, 1.6, 1.5)
    scene.add(cyan)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.45, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1.4
    controls.maxDistance = 5
    controls.maxPolarAngle = Math.PI * 0.47
    controls.enablePan = false
    controls.enableZoom = false
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 1.1
    controls.addEventListener('start', () => {
      controls.autoRotate = false
    })
    controls.update()

    let first = true
    stage.onFrame((t) => {
      const robot = robotRef.current
      if (!robot) return
      const s = snapRef.current
      const h = getRobotHandles(robot)
      if (s && h) {
        if (s.start < 0) s.start = t
        const p = reduced ? 1 : Math.min(1, (t - s.start) / 0.8)
        const target = s.slot === 'body' ? robot : h.slots[s.slot]
        const e = snapEase(p)
        target.scale.setScalar(s.slot === 'body' ? 0.6 + 0.4 * e : Math.max(0.001, e))
        if (s.slot !== 'body') target.position.y = (1 - Math.min(1, p * 1.6)) * 0.5
        if (p >= 1) {
          target.scale.setScalar(1)
          target.position.y = 0
          snapRef.current = null
        }
      }
      const caps = capabilitiesOf(designRef.current)
      animateRobot(robot, t, { moving: false, reducedMotion: reduced, lightOn: caps.has('light') && Math.sin(t * 0.8) > 0 })
      controls.update()
      if (first) {
        first = false
        cb.current.onReady?.()
      }
    })

    return () => {
      controls.dispose()
      if (robotRef.current) {
        scene.remove(robotRef.current)
        disposeObject(robotRef.current)
        robotRef.current = null
      }
      stage.dispose()
      stageRef.current = null
    }
  }, [])

  // Rebuild the robot when the design changes.
  const key = `${design.body}|${design.drive}|${design.head}|${design.tool}|${design.sensor}|${design.primary}|${design.accent}`
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const old = robotRef.current
    const robot = buildRobot(designRef.current)
    robot.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.castShadow = true
    })
    if (old) {
      robot.rotation.y = old.rotation.y
      stage.scene.remove(old)
      disposeObject(old)
    }
    stage.scene.add(robot)
    robotRef.current = robot
  }, [key])

  useEffect(() => {
    if (snap) snapRef.current = { slot: snap.slot, start: -1 }
  }, [snap])

  return <div ref={hostRef} className="absolute inset-0" role="img" aria-label={label} />
}
