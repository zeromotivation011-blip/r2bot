'use client'

// components/kids/three/WorkshopSceneClient.tsx
// The Workshop's 3D view: the child's robot on a turntable floor, orbit /
// zoom with mouse or touch, idle animation, the snap-on animation when a part
// changes, a test-drive mode, VR entry and a screenshot for the robot card.
// Roadmap #33/#36: the robot's World form, learned parts that glow, X-ray
// (battery, brain, motor driver, motors, colour-coded wires), the explode
// slider, and "tap a wire" to send a signal along it.
// Loaded with next/dynamic({ ssr: false }) so three.js never reaches the shared bundle.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  animateRobot,
  buildRobot,
  disposeObject,
  getRobotHandles,
  restPosition,
  sendSignal,
  setExplode,
  setXray,
  snapEase,
  wirePickables,
} from '@/lib/kids/robot3d'
import { capabilitiesOf, type RobotDesign, type Slot, type UpgradeSlot } from '@/lib/kids/robot-design'
import type { AnySlot } from '@/lib/kids/robot-growth'
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
  /** What the distance eyes / camera would measure straight ahead right now, cm (null = nothing within 200 cm). */
  measureDistanceCm: () => number | null
  /** The motor command per side right now, percent. */
  readDrive: () => { leftPct: number; rightPct: number }
}

interface Props {
  design: RobotDesign
  /** Changes every time a part is swapped; drives the snap animation. */
  snap: { slot: Slot | UpgradeSlot; n: number } | null
  /** X-ray: see-through shell, insides and wires. */
  xray?: boolean
  /** 0 = assembled, 1 = pulled apart. */
  explode?: number
  /** Slots whose part glows (learned). */
  learned?: readonly AnySlot[]
  /** The wire whose signal is travelling (null = none). */
  activeWire?: string | null
  onWireTap?: (wireId: string) => void
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
    g.fillStyle = '#19263F'
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

/** Model units → cm: the robot is about 1 unit tall in the Workshop and 25 cm in the simulator (MODEL_SCALE). */
const CM_PER_UNIT = 25

export default function WorkshopSceneClient({
  design,
  snap,
  driving,
  driveInput,
  apiRef,
  onSand,
  onVRSupport,
  onVRChange,
  label,
  xray = false,
  explode = 0,
  learned,
  activeWire = null,
  onWireTap,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const robotRef = useRef<THREE.Group | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const snapRef = useRef<{ slot: Slot | UpgradeSlot; start: number } | null>(null)
  const drivingRef = useRef(driving)
  const designRef = useRef(design)
  const callbacks = useRef({ onSand, onVRChange, onWireTap })
  callbacks.current = { onSand, onVRChange, onWireTap }
  const lookRef = useRef({ xray, explode, activeWire })
  lookRef.current = { xray, explode, activeWire }
  const learnedKey = (learned ?? []).join(',')
  const obstaclesRef = useRef<THREE.Group | null>(null)
  const velRef = useRef({ speed: 0, turn: 0 })

  // ── Mount: renderer, floor, controls, loop ──
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const stage = createStage(host, { background: '#111C32', xr: true })
    stageRef.current = stage
    const { scene, camera, renderer } = stage
    const reduced = prefersReducedMotion()
    scene.fog = new THREE.Fog('#111C32', 9, 18)
    camera.position.set(2.1, 1.6, 2.6)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_R + 0.6, 64),
      new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.9 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1, 0.04, 48), new THREE.MeshStandardMaterial({ color: '#19263F', roughness: 0.6 }))
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
    const obstacles = new THREE.Group()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 20), coneMat)
      cone.position.set(Math.cos(a) * (ARENA_R + 0.2), 0.21, Math.sin(a) * (ARENA_R + 0.2))
      cone.castShadow = true
      obstacles.add(cone)
    }
    scene.add(obstacles)
    obstaclesRef.current = obstacles

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

    const vel = velRef.current
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
        // Motors and the World form live in the drive; the power pack shows as the solar panel.
        const target: THREE.Object3D =
          s.slot === 'body' ? robot : s.slot === 'chassis' || s.slot === 'motor' ? h.slots.drive : s.slot in h.slots ? h.slots[s.slot as Slot] : h.upgrades[s.slot as UpgradeSlot]
        const e = snapEase(p)
        target.scale.setScalar(s.slot === 'body' ? 0.6 + 0.4 * e : Math.max(0.001, e))
        if (s.slot !== 'body') {
          restPosition(target, robot, target.position)
          target.position.y += (1 - Math.min(1, p * 1.6)) * 0.5
        }
        if (p >= 1) {
          target.scale.setScalar(1)
          if (s.slot !== 'body') restPosition(target, robot, target.position)
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

    // Tap a wire (X-ray on): a press that did not turn into a drag.
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      const start = down
      down = null
      const robot = robotRef.current
      if (!start || !robot || !lookRef.current.xray) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(wirePickables(robot), false)[0]
      const id = hit?.object.userData.wireId
      if (typeof id === 'string') callbacks.current.onWireTap?.(id)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    apiRef.current = {
      measureDistanceCm: () => {
        const robot = robotRef.current
        const obs = obstaclesRef.current
        if (!robot || !obs) return null
        robot.updateMatrixWorld(true)
        // Like the simulator's echo cone: a few rays from head height, level and tipping down,
        // so a low cone ahead is seen. Distance is measured flat along the floor.
        const from = new THREE.Vector3(0, 0.75, 0.3).applyMatrix4(robot.matrixWorld)
        let best: number | null = null
        for (const pitch of [0, -3, -6, -9]) {
          const a = (pitch * Math.PI) / 180
          const dir = new THREE.Vector3(0, Math.sin(a), Math.cos(a)).applyQuaternion(robot.quaternion)
          ray.set(from, dir)
          ray.far = 200 / CM_PER_UNIT / Math.cos(a)
          const hit = ray.intersectObjects(obs.children, false)[0]
          if (hit) {
            const flat = hit.distance * Math.cos(a) * CM_PER_UNIT
            if (best === null || flat < best) best = flat
          }
        }
        ray.far = Infinity
        return best
      },
      readDrive: () => {
        const s = Math.max(-1, Math.min(1, velRef.current.speed / 1.8))
        const t = Math.max(-1, Math.min(1, velRef.current.turn / 2.4))
        const clamp = (v: number) => Math.round(Math.max(-100, Math.min(100, v * 100)))
        return { leftPct: clamp(s - t * 0.5), rightPct: clamp(s + t * 0.5) }
      },
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
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
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
    const robot = buildRobot(design, { worldForm: true, internals: true, learned: learnedKey ? (learnedKey.split(',') as AnySlot[]) : [] })
    if (old) {
      robot.position.copy(old.position)
      robot.rotation.copy(old.rotation)
      stage.scene.remove(old)
      disposeObject(old)
    }
    stage.scene.add(robot)
    robotRef.current = robot
    const look = lookRef.current
    if (look.explode > 0) setExplode(robot, look.explode)
    if (look.xray) setXray(robot, true)
    if (look.activeWire) sendSignal(robot, look.activeWire)
  }, [design, learnedKey])

  // X-ray and explode.
  useEffect(() => {
    const robot = robotRef.current
    if (!robot) return
    setXray(robot, xray)
    if (xray && controlsRef.current) controlsRef.current.autoRotate = false
  }, [xray])
  useEffect(() => {
    const robot = robotRef.current
    if (!robot) return
    setExplode(robot, explode)
    // Keep the pulled-apart robot in frame.
    const controls = controlsRef.current
    const stage = stageRef.current
    if (controls && stage && !drivingRef.current) {
      const box = new THREE.Box3().setFromObject(robot)
      const height = Math.max(1, box.max.y)
      controls.target.y = Math.min(height / 2, 0.5 + explode * 0.6)
      // Step back far enough for the whole pulled-apart robot to fit (never closer than the child put it).
      const want = Math.min(controls.maxDistance, 2.2 + height * 1.1)
      const off = stage.camera.position.clone().sub(controls.target)
      if (off.length() < want) stage.camera.position.copy(controls.target).add(off.setLength(want))
      controls.update()
    }
  }, [explode])
  useEffect(() => {
    const robot = robotRef.current
    if (robot) sendSignal(robot, activeWire)
  }, [activeWire])

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
