'use client'

// components/kids/codelab/ArenaClient.tsx
// The Code Lab's 3D grid arena: tiles, walls, gems, flag, boxes, drop zones,
// a black line, sand/rocks, dark cave tiles, the pen trail and the target
// drawing — and the child's own robot, tweened between interpreter frames.
// Loaded with next/dynamic({ ssr: false }).

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { animateRobot, buildRobot, disposeObject } from '@/lib/kids/robot3d'
import { capabilitiesOf, type RobotDesign } from '@/lib/kids/robot-design'
import { colorOf, isDark, isLineTile, isRough, parseArena, tileAt, type FrameEvent, type WorldState } from '@/lib/kids/code-lab/interpreter'
import { COLOR_HEX } from '@/lib/kids/code-lab/blocks'
import type { ArenaDef } from '@/lib/kids/code-lab/types'
import { createStage, prefersReducedMotion, type Stage } from '@/components/kids/three/stage'

interface Props {
  arena: ArenaDef
  design: RobotDesign
  state: WorldState
  event: FrameEvent
  /** How long the tween to `state` should take. */
  durationMs: number
  label: string
}

const ROBOT_SCALE = 0.72
const rotFor = (dir: number) => ((2 - dir) * Math.PI) / 2

interface World {
  root: THREE.Group
  gems: Map<string, THREE.Object3D>
  darkMats: THREE.MeshStandardMaterial[]
  flag: THREE.Object3D | null
  crates: THREE.Group
  trail: THREE.Group
  w: number
  h: number
}

function buildWorld(def: ArenaDef, accent: string): World {
  const a = parseArena(def)
  const root = new THREE.Group()
  const gems = new Map<string, THREE.Object3D>()
  const darkMats: THREE.MeshStandardMaterial[] = []
  let flag: THREE.Object3D | null = null
  const ox = -(a.w - 1) / 2
  const oz = -(a.h - 1) / 2
  root.position.set(ox, 0, oz)

  const tileGeo = new THREE.BoxGeometry(0.96, 0.14, 0.96)
  const floorMat = new THREE.MeshStandardMaterial({ color: '#C7B8F5', roughness: 0.8 })
  const floorAlt = new THREE.MeshStandardMaterial({ color: '#B9A7EE', roughness: 0.8 })
  const wallMat = new THREE.MeshStandardMaterial({ color: '#5B3FA8', roughness: 0.55 })
  const wallTop = new THREE.MeshStandardMaterial({ color: '#7C5CD6', roughness: 0.5 })
  const sandMat = new THREE.MeshStandardMaterial({ color: '#E2C07D', roughness: 1 })
  const rockMat = new THREE.MeshStandardMaterial({ color: '#8B8FA3', roughness: 0.9 })
  const lineMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.7 })
  const dropMat = new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#FACC15', emissiveIntensity: 0.7 })
  const gemMat = new THREE.MeshStandardMaterial({ color: '#22D3EE', emissive: '#0891B2', emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.3 })

  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const c = tileAt(a, x, y)
      if (c === '#') {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.46, 0.96), [wallMat, wallMat, wallTop, wallMat, wallMat, wallMat])
        wall.position.set(x, 0.16, y)
        wall.castShadow = true
        wall.receiveShadow = true
        root.add(wall)
        continue
      }
      const color = colorOf(c)
      let mat: THREE.MeshStandardMaterial = (x + y) % 2 === 0 ? floorMat : floorAlt
      if (color) mat = new THREE.MeshStandardMaterial({ color: COLOR_HEX[color], roughness: 0.6 })
      else if (c === 's') mat = sandMat
      else if (c === 'k') mat = rockMat
      else if (isDark(c)) {
        mat = new THREE.MeshStandardMaterial({ color: '#141026', roughness: 0.9 })
        darkMats.push(mat)
      }
      const tile = new THREE.Mesh(tileGeo, mat)
      tile.position.set(x, -0.07, y)
      tile.receiveShadow = true
      root.add(tile)

      if (isRough(c)) {
        const n = c === 'k' ? 3 : 5
        for (let i = 0; i < n; i++) {
          const g = c === 'k' ? new THREE.DodecahedronGeometry(0.1 + (i % 2) * 0.04) : new THREE.SphereGeometry(0.06, 8, 6)
          const bump = new THREE.Mesh(g, c === 'k' ? rockMat : sandMat)
          bump.position.set(x - 0.3 + ((i * 0.37) % 0.6), 0.02, y - 0.3 + ((i * 0.53) % 0.6))
          if (c === 's') bump.scale.y = 0.4
          bump.castShadow = c === 'k'
          root.add(bump)
        }
      }
      if (c === '=' || (c === 'S' && a.tiles.some((r) => r.includes('='))) || (c === 'G' && a.tiles.some((r) => r.includes('=')))) {
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.22), lineMat)
        dot.position.set(x, 0.006, y)
        root.add(dot)
        const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        for (const [dx, dy] of dirs) {
          if (isLineTile(tileAt(a, x + dx, y + dy)) && tileAt(a, x + dx, y + dy) !== '#') {
            const seg = new THREE.Mesh(new THREE.BoxGeometry(dx ? 0.5 : 0.22, 0.01, dy ? 0.5 : 0.22), lineMat)
            seg.position.set(x + dx * 0.25, 0.006, y + dy * 0.25)
            root.add(seg)
          }
        }
      }
      if (c === 'X' || c === 'B') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 32), dropMat)
        ring.rotation.x = Math.PI / 2
        ring.position.set(x, 0.02, y)
        root.add(ring)
      }
      if (c === '*' || c === 'D') {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), gemMat)
        gem.position.set(x, 0.38, y)
        gem.castShadow = true
        root.add(gem)
        gems.set(`${x},${y}`, gem)
      }
      if (c === 'G') {
        const f = new THREE.Group()
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), new THREE.MeshStandardMaterial({ color: '#E5E7EB', metalness: 0.6, roughness: 0.3 }))
        pole.position.y = 0.45
        pole.castShadow = true
        f.add(pole)
        const shape = new THREE.Shape()
        shape.moveTo(0, 0)
        shape.lineTo(0.38, -0.12)
        shape.lineTo(0, -0.24)
        const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#EF4444', side: THREE.DoubleSide }))
        cloth.position.y = 0.88
        f.add(cloth)
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 16), new THREE.MeshStandardMaterial({ color: '#F59E0B' }))
        base.position.y = 0.025
        f.add(base)
        f.position.set(x + 0.3, 0, y - 0.3)
        root.add(f)
        flag = cloth
      }
    }
  }

  // Target drawing as a ghost outline.
  if (a.target.length) {
    const ghost = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.35 })
    for (const e of a.target) {
      const [p, q] = e.split('|').map((s) => s.split(',').map(Number))
      const seg = new THREE.Mesh(new THREE.BoxGeometry(p[0] !== q[0] ? 1 : 0.06, 0.012, p[1] !== q[1] ? 1 : 0.06), ghost)
      seg.position.set((p[0] + q[0]) / 2, 0.004, (p[1] + q[1]) / 2)
      root.add(seg)
    }
  }

  const crates = new THREE.Group()
  root.add(crates)
  const trail = new THREE.Group()
  trail.userData.color = accent
  root.add(trail)
  return { root, gems, darkMats, flag, crates, trail, w: a.w, h: a.h }
}

export default function ArenaClient({ arena, design, state, event, durationMs, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const worldRef = useRef<World | null>(null)
  const robotRef = useRef<THREE.Group | null>(null)
  const tween = useRef({ fromX: 0, fromZ: 0, fromR: 0, toX: 0, toZ: 0, toR: 0, start: 0, dur: 1, event: 'start' as FrameEvent })
  const stateRef = useRef(state)
  const designRef = useRef(design)

  // Mount once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const stage = createStage(host, { background: '#1B1035', fov: 35 })
    stage.renderer.domElement.style.touchAction = 'auto'
    stageRef.current = stage
    const reduced = prefersReducedMotion()
    stage.onFrame((t) => {
      const robot = robotRef.current
      const world = worldRef.current
      if (!robot || !world) return
      const tw = tween.current
      const now = performance.now()
      const p = Math.min(1, (now - tw.start) / tw.dur)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      let x = tw.fromX + (tw.toX - tw.fromX) * e
      let z = tw.fromZ + (tw.toZ - tw.fromZ) * e
      if ((tw.event === 'bonk' || tw.event === 'stuck' || tw.event === 'dark') && !reduced) {
        // Nudge forward and bounce back.
        const k = Math.sin(p * Math.PI) * (tw.event === 'bonk' ? 0.28 : 0.12)
        x += Math.sin(tw.toR) * k
        z += Math.cos(tw.toR) * k
      }
      robot.position.set(world.root.position.x + x, 0, world.root.position.z + z)
      robot.rotation.y = tw.fromR + (tw.toR - tw.fromR) * e
      const s = stateRef.current
      const moving = p < 1 && (tw.fromX !== tw.toX || tw.fromZ !== tw.toZ || tw.fromR !== tw.toR)
      animateRobot(robot, t, { moving, lightOn: s.lightOn, carrying: s.carrying, reducedMotion: reduced })
      for (const gem of world.gems.values()) {
        if (!reduced) gem.rotation.y = t * 1.5
      }
      if (world.flag && !reduced) world.flag.rotation.y = Math.sin(t * 3) * 0.25
    })
    return () => {
      stage.dispose()
      stageRef.current = null
      worldRef.current = null
      robotRef.current = null
    }
  }, [])

  // Arena (re)build.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (worldRef.current) {
      stage.scene.remove(worldRef.current.root)
      disposeObject(worldRef.current.root)
    }
    const world = buildWorld(arena, designRef.current.accent)
    stage.scene.add(world.root)
    worldRef.current = world
    const span = Math.max(world.w, world.h * 1.25)
    const dist = span * 1.12 + 2
    stage.camera.position.set(dist * 0.3, dist * 0.82, dist * 0.7)
    stage.camera.lookAt(0, 0, 0.15)
    const p = parseArena(arena)
    tween.current = { fromX: p.start.x, fromZ: p.start.y, fromR: rotFor(p.start.dir), toX: p.start.x, toZ: p.start.y, toR: rotFor(p.start.dir), start: 0, dur: 1, event: 'start' }
  }, [arena])

  // Robot (re)build.
  useEffect(() => {
    designRef.current = design
    const stage = stageRef.current
    if (!stage) return
    if (robotRef.current) {
      stage.scene.remove(robotRef.current)
      disposeObject(robotRef.current)
    }
    const robot = buildRobot(design)
    robot.scale.setScalar(ROBOT_SCALE)
    stage.scene.add(robot)
    robotRef.current = robot
    if (worldRef.current) worldRef.current.trail.userData.color = design.accent
  }, [design])

  // New frame: tween the robot, update gems, boxes, trail, darkness.
  useEffect(() => {
    stateRef.current = state
    const world = worldRef.current
    if (!world) return
    const tw = tween.current
    const robot = robotRef.current
    const curR = robot ? robot.rotation.y : tw.toR
    let toR = rotFor(state.dir)
    while (toR - curR > Math.PI) toR -= Math.PI * 2
    while (toR - curR < -Math.PI) toR += Math.PI * 2
    const curX = robot ? robot.position.x - world.root.position.x : tw.toX
    const curZ = robot ? robot.position.z - world.root.position.z : tw.toZ
    const snapNow = event === 'start'
    tween.current = {
      fromX: snapNow ? state.x : curX,
      fromZ: snapNow ? state.y : curZ,
      fromR: snapNow ? rotFor(state.dir) : curR,
      toX: state.x,
      toZ: state.y,
      toR: snapNow ? rotFor(state.dir) : toR,
      start: performance.now(),
      dur: Math.max(60, durationMs * 0.85),
      event,
    }
    for (const [k, gem] of world.gems) gem.visible = state.gems.includes(k)
    // Boxes.
    disposeObject(world.crates)
    world.crates.clear()
    const crateMat = new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.7 })
    for (const o of state.objects) {
      const [x, y] = o.split(',').map(Number)
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), crateMat)
      crate.position.set(x, 0.17, y)
      crate.castShadow = true
      world.crates.add(crate)
    }
    // Pen trail.
    if (world.trail.children.length !== state.trail.length) {
      disposeObject(world.trail)
      world.trail.clear()
      const color = typeof world.trail.userData.color === 'string' ? (world.trail.userData.color as string) : '#3B82F6'
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
      for (const e of state.trail) {
        const [p, q] = e.split('|').map((s) => s.split(',').map(Number))
        const seg = new THREE.Mesh(new THREE.BoxGeometry(p[0] !== q[0] ? 1.08 : 0.1, 0.02, p[1] !== q[1] ? 1.08 : 0.1), mat)
        seg.position.set((p[0] + q[0]) / 2, 0.012, (p[1] + q[1]) / 2)
        world.trail.add(seg)
      }
    }
    for (const m of world.darkMats) m.color.set(state.lightOn ? '#3B3363' : '#141026')
  }, [state, event, durationMs])

  return <div ref={hostRef} role="img" aria-label={label} className="absolute inset-0" />
}
