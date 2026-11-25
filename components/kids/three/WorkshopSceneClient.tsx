'use client'

// components/kids/three/WorkshopSceneClient.tsx
// The Workshop's 3D view: the child's robot on a turntable floor, orbit /
// zoom with mouse or touch, idle animation, the snap-on animation when a part
// changes, a test-drive mode, VR entry and a screenshot for the robot card.
// Loaded with next/dynamic({ ssr: false }) so three.js never reaches the shared bundle.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { animateRobot, buildRobot, disposeObject, getRobotHandles, snapEase } from '@/lib/kids/robot3d'
import { capabilitiesOf, type RobotDesign, type Slot } from '@/lib/kids/robot-design'
import { createStage, prefersReducedMotion, type Stage } from './stage'

export interface DriveInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export interface WorkshopSceneApi {
  /** PNG data URL of the current view, or null if the canvas cannot be read. */
  capture: () => string | null
  enterVR: () => Promise<void>
}

interface Props {
  design: RobotDesign
  /** Changes every time a part is swapped; drives the snap animation. */
  snap: { slot: Slot; n: number } | null
  driving: boolean
  driveInput: React.MutableRefObject<DriveInput>
  apiRef: React.MutableRefObject<WorkshopSceneApi | null>
  onSand?: (inSand: boolean) => void
  onVRSupport?: (supported: boolean) => void
  onVRChange?: (presenting: boolean) => void
  label: string
}

const SAND = { x: 2.6, z: -1.8, r: 1.3 }
const ARENA_R = 6

function makeFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = '#2A1B4D'
    g.fillRect(0, 0, 512, 512)
    g.strokeStyle = 'rgba(196,181,253,0.22)'
    g.lineWidth = 3
    for (let i = 0; i <= 8; i++) {
      g.beginPath()
      g.moveTo(i * 64, 0)
      g.lineTo(i * 64, 512)
      g.moveTo(0, i * 64)
      g.lineTo(512, i * 64)
      g.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(6, 6)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export default function WorkshopSceneClient({ design, snap, driving, driveInput, apiRef, onSand, onVRSupport, onVRChange, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const robotRef = useRef<THREE.Group | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const snapRef = useRef<{ slot: Slot; start: number } | null>(null)
  const drivingRef = useRef(driving)
  const designRef = useRef(design)
  const callbacks = useRef({ onSand, onVRChange })
  callbacks.current = { onSand, onVRChange }

  // ── Mount: renderer, floor, controls, loop ──
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const stage = createStage(host, { background: '#1B1035', xr: true })
    stageRef.current = stage
    const { scene, camera, renderer } = stage
    const reduced = prefersReducedMotion()
    scene.fog = new THREE.Fog('#1B1035', 9, 18)
    camera.position.set(2.1, 1.6, 2.6)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_R + 0.6, 64),
      new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.9 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1, 0.04, 48), new THREE.MeshStandardMaterial({ color: '#4C1D95', roughness: 0.6 }))
    turntable.position.y = 0.02
    turntable.receiveShadow = true
    scene.add(turntable)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 64), new THREE.MeshStandardMaterial({ color: '#F59E0B', emissive: '#F59E0B', emissiveIntensity: 0.6 }))
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.04
    scene.add(ring)
    // Test-drive props: a sand patch and a few cones around the edge.
    const sand = new THREE.Mesh(new THREE.CircleGeometry(SAND.r, 40), new THREE.MeshStandardMaterial({ color: '#D6B370', roughness: 1 }))
    sand.rotation.x = -Math.PI / 2
    sand.position.set(SAND.x, 0.006, SAND.z)
    sand.receiveShadow = true
    scene.add(sand)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = Math.sqrt(((i * 37) % 100) / 100) * SAND.r * 0.85
      const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + ((i * 13) % 5) * 0.012), new THREE.MeshStandardMaterial({ color: '#A8865A', roughness: 1 }))
      pebble.position.set(SAND.x + Math.cos(a) * r, 0.03, SAND.z + Math.sin(a) * r)
      pebble.castShadow = true
      scene.add(pebble)
    }
    const coneMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.5 })
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 20), coneMat)
      cone.position.set(Math.cos(a) * (ARENA_R + 0.2), 0.21, Math.sin(a) * (ARENA_R + 0.2))
      cone.castShadow = true
      scene.add(cone)
    }

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.5, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1.3
    controls.maxDistance = 7
    controls.maxPolarAngle = Math.PI * 0.47
    controls.enablePan = false
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 0.9
    controls.addEventListener('start', () => {
      controls.autoRotate = false
    })
    controls.update()
    controlsRef.current = controls

    const vel = { speed: 0, turn: 0 }
    let wasInSand = false
    const saved = { pos: new THREE.Vector3(), rotY: 0 }

    stage.onFrame((t, dt) => {
      const robot = robotRef.current
      if (!robot) return
      const caps = capabilitiesOf(designRef.current)
      let moving = false
      let direction = 1
      if (drivingRef.current && !renderer.xr.isPresenting) {
        const inp = driveInput.current
        const inSand = Math.hypot(robot.position.x - SAND.x, robot.position.z - SAND.z) < SAND.r
        const grip = inSand && !caps.has('rough-ground') ? 0.22 : 1
        if (inSand !== wasInSand) {
          wasInSand = inSand
          callbacks.current.onSand?.(inSand)
        }
        const targetSpeed = (inp.up ? 1.8 : 0) - (inp.down ? 1.1 : 0)
        const targetTurn = (inp.left ? 2.4 : 0) - (inp.right ? 2.4 : 0)
        vel.speed += (targetSpeed * grip - vel.speed) * Math.min(1, dt * 6)
        vel.turn += (targetTurn - vel.turn) * Math.min(1, dt * 8)
        robot.rotation.y += vel.turn * dt
        const before = robot.position.clone()
        robot.position.x += Math.sin(robot.rotation.y) * vel.speed * dt
        robot.position.z += Math.cos(robot.rotation.y) * vel.speed * dt
        const r = Math.hypot(robot.position.x, robot.position.z)
        if (r > ARENA_R) robot.position.multiplyScalar(ARENA_R / r)
        // Camera follows.
        const delta = robot.position.clone().sub(before)
        camera.position.add(delta)
        controls.target.add(delta)
        moving = Math.abs(vel.speed) > 0.05 || Math.abs(vel.turn) > 0.2 || (grip < 1 && (inp.up || inp.down))
        direction = vel.speed < -0.05 ? -1 : 1
      }
      // Snap-on animation for the part that just changed.
      const s = snapRef.current
      const h = getRobotHandles(robot)
      if (s && h) {
        if (s.start < 0) s.start = t
        const p = reduced ? 1 : Math.min(1, (t - s.start) / 0.7)
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
      animateRobot(robot, t, { moving, direction, reducedMotion: reduced, lightOn: caps.has('light') && Math.sin(t * 0.6) > 0.3 })
      controls.update()
    })

    // VR support + session handling.
    const xr = typeof navigator !== 'undefined' ? navigator.xr : undefined
    if (xr) {
      xr.isSessionSupported('immersive-vr')
        .then((ok) => onVRSupport?.(ok))
        .catch(() => onVRSupport?.(false))
    } else {
      onVRSupport?.(false)
    }
    renderer.xr.addEventListener('sessionstart', () => {
      const robot = robotRef.current
      if (robot) {
        saved.pos.copy(robot.position)
        saved.rotY = robot.rotation.y
        // Stand the robot (about 1 m tall) 1.2 m in front of the viewer, facing them.
        robot.position.set(0, 0, -1.2)
        robot.rotation.y = 0
      }
      callbacks.current.onVRChange?.(true)
    })
    renderer.xr.addEventListener('sessionend', () => {
      const robot = robotRef.current
      if (robot) {
        robot.position.copy(saved.pos)
        robot.rotation.y = saved.rotY
      }
      callbacks.current.onVRChange?.(false)
    })

    apiRef.current = {
      capture: () => {
        try {
          stage.renderNow()
          return renderer.domElement.toDataURL('image/png')
        } catch {
          return null
        }
      },
      enterVR: async () => {
        const nav = navigator.xr
        if (!nav) return
        const session = await nav.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
        renderer.xr.setReferenceSpaceType('local-floor')
        await renderer.xr.setSession(session)
      },
    }

    return () => {
      apiRef.current = null
      controls.dispose()
      if (robotRef.current) {
        scene.remove(robotRef.current)
        disposeObject(robotRef.current)
        robotRef.current = null
      }
      stage.dispose()
      stageRef.current = null
    }
    // Mount once; props are read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Rebuild the robot when the design changes ──
  useEffect(() => {
    designRef.current = design
    const stage = stageRef.current
    if (!stage) return
    const old = robotRef.current
    const robot = buildRobot(design)
    if (old) {
      robot.position.copy(old.position)
      robot.rotation.copy(old.rotation)
      stage.scene.remove(old)
      disposeObject(old)
    }
    stage.scene.add(robot)
    robotRef.current = robot
  }, [design])

  useEffect(() => {
    if (!snap) return
    // start = -1: the render loop stamps it with its own clock on the next frame.
    snapRef.current = { slot: snap.slot, start: -1 }
  }, [snap])

  // Driving: reset the robot to the turntable when leaving, swap camera framing.
  useEffect(() => {
    drivingRef.current = driving
    const stage = stageRef.current
    const controls = controlsRef.current
    const robot = robotRef.current
    if (!stage || !controls || !robot) return
    if (driving) {
      controls.autoRotate = false
      controls.minDistance = 2
      stage.camera.position.set(robot.position.x - 2.8, 2.6, robot.position.z - 3.2)
      controls.target.set(robot.position.x, 0.4, robot.position.z)
    } else {
      robot.position.set(0, 0, 0)
      robot.rotation.set(0, 0, 0)
      controls.minDistance = 1.3
      stage.camera.position.set(2.1, 1.6, 2.6)
      controls.target.set(0, 0.5, 0)
    }
  }, [driving])

  return <div ref={hostRef} role="img" aria-label={label} className="absolute inset-0" />
}
