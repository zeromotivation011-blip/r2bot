// components/kids/episodes/engine/fx.ts
// Props and effects that explain the idea on screen: the glowing clock
// lights, sensor beams and echo rings, "thinking" sparks, arrows on the
// ground, concept labels, sketches, festival lanterns, confetti, wind, bats…
// Scene effects live for a scene; line effects for one line.

import * as THREE from 'three'
import { buildRobot } from '@/lib/kids/robot3d'
import { DEFAULT_DESIGN, type BodyId } from '@/lib/kids/robot-design'
import type { Beat, LineEffect, SceneEffect, ScenePlan } from '@/lib/kids/episodes/plan'
import type { SetBuild } from './sets'

export interface FxAnchors {
  /** Where the child's robot stands (ground). */
  robot: THREE.Vector3 | null
  /** The robot's head (or Spark's when no robot is in shot). */
  robotHead: THREE.Vector3
  /** Robot facing (yaw). */
  robotYaw: number
  /** The speaking actor's head. */
  speakerHead: THREE.Vector3 | null
  /** Bolt's head, for the thought bubble. */
  boltHead: THREE.Vector3 | null
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')
  if (c) draw(c)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let glowTex: THREE.CanvasTexture | null = null
function glowTexture(): THREE.CanvasTexture {
  if (!glowTex) {
    glowTex = canvasTex(128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.25, 'rgba(255,240,200,0.75)')
      g.addColorStop(1, 'rgba(255,200,100,0)')
      c.fillStyle = g
      c.fillRect(0, 0, 128, 128)
    })
  }
  return glowTex
}

function halo(color: string, size: number, opacity = 0.9): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }))
  s.scale.setScalar(size)
  return s
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

const SENSOR_WORDS = new Set(['SENSOR', 'ECHO', 'BUMPER', 'SENSE', 'CM'])

export function labelSprite(text: string, kind: 'orange' | 'cyan' | 'navy' = 'orange', height = 0.24): THREE.Sprite {
  const font = "700 84px 'Space Grotesk', system-ui, sans-serif"
  const meas = document.createElement('canvas').getContext('2d')
  let w = 300
  if (meas) {
    meas.font = font
    w = Math.ceil(meas.measureText(text).width) + 90
  }
  const tex = canvasTex(w, 140, (c) => {
    const bg = kind === 'orange' ? '#FC6818' : kind === 'cyan' ? '#00B8D4' : '#111C32'
    const fg = kind === 'navy' ? '#EEF2F8' : '#1A1103'
    c.shadowColor = 'rgba(0,0,0,0.35)'
    c.shadowBlur = 12
    roundRect(c, 8, 10, w - 16, 118, 50)
    c.fillStyle = bg
    c.fill()
    c.shadowBlur = 0
    c.lineWidth = 6
    c.strokeStyle = 'rgba(255,255,255,0.55)'
    c.stroke()
    c.fillStyle = fg
    c.font = font
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(text, w / 2, 74)
  })
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }))
  sp.renderOrder = 20
  sp.scale.set((height * w) / 140, height, 1)
  sp.userData.baseScale = sp.scale.clone()
  return sp
}

function sketchTexture(text: string): THREE.CanvasTexture {
  const s = text.toLowerCase()
  return canvasTex(512, 360, (c) => {
    c.fillStyle = '#FFF7E6'
    roundRect(c, 4, 4, 504, 352, 26)
    c.fill()
    c.strokeStyle = '#E2CFA8'
    c.lineWidth = 2
    for (let y = 40; y < 340; y += 34) {
      c.beginPath()
      c.moveTo(24, y)
      c.lineTo(488, y)
      c.stroke()
    }
    c.lineWidth = 9
    c.lineCap = 'round'
    c.lineJoin = 'round'
    const arrow = (x: number, y: number, dx: number, dy: number, col: string) => {
      c.strokeStyle = col
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + dx, y + dy)
      c.stroke()
      const a = Math.atan2(dy, dx)
      c.beginPath()
      c.moveTo(x + dx, y + dy)
      c.lineTo(x + dx - Math.cos(a - 0.5) * 26, y + dy - Math.sin(a - 0.5) * 26)
      c.moveTo(x + dx, y + dy)
      c.lineTo(x + dx - Math.cos(a + 0.5) * 26, y + dy - Math.sin(a + 0.5) * 26)
      c.stroke()
    }
    if (s.includes('house') || s.includes('banner') || s.includes('pattern')) {
      c.strokeStyle = '#FC6818'
      for (let i = 0; i < 3; i++) {
        const x = 50 + i * 150
        c.strokeRect(x, 150, 110, 110)
        c.beginPath()
        c.moveTo(x - 10, 152)
        c.lineTo(x + 55, 90)
        c.lineTo(x + 120, 152)
        c.stroke()
        c.strokeStyle = i % 2 ? '#FC6818' : '#00B8D4'
        c.strokeRect(x + 35, 185, 40, 40)
      }
    } else if (s.includes('three pictures') || s.includes('ramp')) {
      c.strokeStyle = '#334155'
      c.beginPath()
      c.moveTo(30, 280)
      c.lineTo(160, 280)
      c.moveTo(190, 280)
      c.lineTo(320, 190)
      c.moveTo(350, 280)
      c.lineTo(480, 190)
      c.stroke()
      c.fillStyle = '#FC6818'
      c.fillRect(80, 245, 34, 30)
      c.fillRect(240, 200, 34, 30)
      c.fillStyle = '#B91C1C'
      c.fillRect(400, 190, 46, 38)
    } else if (s.includes('block') || s.includes('card')) {
      const cols = ['#FC6818', '#00B8D4', '#22C55E', '#FACC15']
      for (let i = 0; i < 8; i++) {
        c.fillStyle = cols[i % 4]
        roundRect(c, 40 + (i % 4) * 112, 80 + Math.floor(i / 4) * 120, 96, 90, 16)
        c.fill()
        c.fillStyle = '#1A1103'
        c.font = "700 40px 'Space Grotesk', system-ui"
        c.textAlign = 'center'
        c.fillText(i % 2 ? '↻' : '↑', 88 + (i % 4) * 112, 140 + Math.floor(i / 4) * 120)
      }
    } else {
      arrow(60, 280, 120, 0, '#FC6818')
      arrow(190, 280, 0, -110, '#00B8D4')
      arrow(200, 160, 120, 0, '#FC6818')
      c.strokeStyle = '#334155'
      c.font = "700 64px system-ui"
      c.fillStyle = '#7C3AED'
      c.fillText('♪', 360, 130)
      c.fillText('♫', 420, 210)
      c.fillStyle = '#22C55E'
      c.beginPath()
      c.arc(400, 285, 22, 0, Math.PI * 2)
      c.fill()
    }
  })
}

interface Particle {
  obj: THREE.Object3D
  v: THREE.Vector3
  life: number
  max: number
  spin: number
}

export class Fx {
  readonly group = new THREE.Group()
  private sceneGroup = new THREE.Group()
  private lineGroup = new THREE.Group()
  private particles: Particle[] = []
  private sceneUpdaters: ((t: number, dt: number, a: FxAnchors) => void)[] = []
  private lineUpdaters: ((t: number, dt: number, a: FxAnchors, p: number) => void)[] = []
  private lineStart = 0
  private calm: boolean
  private confettiGeo = new THREE.PlaneGeometry(0.06, 0.04)
  private confettiMats = ['#FC6818', '#00E5FF', '#FACC15', '#22C55E', '#F472B6', '#FFFFFF'].map(
    (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }),
  )
  clockLight: THREE.Group | null = null

  constructor(calm: boolean) {
    this.calm = calm
    this.group.add(this.sceneGroup, this.lineGroup)
  }

  private clear(g: THREE.Group): void {
    for (const ch of [...g.children]) {
      g.remove(ch)
      ch.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry && m.geometry !== this.confettiGeo) m.geometry.dispose()
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
        for (const mt of mats) {
          if (this.confettiMats.includes(mt as THREE.MeshBasicMaterial)) continue
          const map = (mt as THREE.SpriteMaterial).map
          if (map && map !== glowTex) map.dispose()
          mt.dispose()
        }
      })
    }
  }

  // ── Scene effects ────────────────────────────────────────────────────────

  setScene(plan: ScenePlan, set: SetBuild, kitPos: THREE.Vector3 | null): void {
    this.clear(this.sceneGroup)
    this.sceneUpdaters = []
    this.clockLight = null
    const fx = new Set<SceneEffect>(plan.effects)

    if (fx.has('clock-light')) {
      const g = new THREE.Group()
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), new THREE.MeshStandardMaterial({ color: '#FFF3C4', emissive: '#FFB020', emissiveIntensity: 3 }))
      g.add(core, halo('#FFC861', 0.9))
      const pl = new THREE.PointLight('#FFC861', 3, 3.5, 1.6)
      g.add(pl)
      g.position.copy(set.lightSpot)
      this.sceneGroup.add(g)
      this.clockLight = g
      const base = set.lightSpot.clone()
      this.sceneUpdaters.push((t) => {
        g.position.y = base.y + (this.calm ? 0 : Math.sin(t * 2.4) * 0.06)
        const pulse = 1 + Math.sin(t * 3.1) * 0.12
        g.children[1].scale.setScalar(0.9 * pulse)
        pl.intensity = 2.6 + Math.sin(t * 3.1) * 0.6
      })
    }

    if (fx.has('lights-fly')) {
      const origin = set.id === 'hill' ? set.lightSpot.clone() : new THREE.Vector3(0, 3, -4)
      const lights: { o: THREE.Group; dir: THREE.Vector3; delay: number }[] = []
      for (let i = 0; i < 12; i++) {
        const o = new THREE.Group()
        o.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFE7A0' })), halo('#FFC861', 1.2))
        const a = (i / 12) * Math.PI * 2
        o.position.set(origin.x + Math.sin(a) * 0.7, origin.y + Math.cos(a) * 0.7, origin.z + 1)
        lights.push({ o, dir: new THREE.Vector3((Math.random() - 0.5) * 10, 2 + Math.random() * 3, 4 + Math.random() * 8), delay: 1.2 + i * 0.22 })
        this.sceneGroup.add(o)
      }
      const start = lights.map((l) => l.o.position.clone())
      let st = -1
      this.sceneUpdaters.push((t) => {
        if (st < 0) st = t
        const e = t - st
        lights.forEach((l, i) => {
          const k = Math.max(0, e - l.delay)
          const p = Math.min(1, k / 5)
          l.o.position.copy(start[i]).addScaledVector(l.dir, p).add(new THREE.Vector3(Math.sin(k * 3 + i) * 0.4 * p, Math.sin(k * 5) * 0.2, 0))
          l.o.visible = p < 1
        })
      })
      this.wind(3)
    } else if (fx.has('wind')) this.wind(1.5)

    if (fx.has('bats')) {
      const bats = new THREE.Group()
      const bm = new THREE.MeshBasicMaterial({ color: '#0F0F1A', side: THREE.DoubleSide })
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Group()
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.CircleGeometry(0.12, 3), bm)
          w.position.x = s * 0.1
          w.userData.s = s
          b.add(w)
        }
        b.userData.ph = i * 1.1
        bats.add(b)
      }
      bats.position.set(0, 3.2, -3)
      this.sceneGroup.add(bats)
      this.sceneUpdaters.push((t) => {
        bats.children.forEach((b, i) => {
          const ph = (b.userData.ph as number) + t * 0.6
          b.position.set(Math.cos(ph) * (2 + i * 0.4), Math.sin(ph * 3) * 0.4, Math.sin(ph) * 1.5)
          b.children.forEach((w) => (w.rotation.y = (w.userData.s as number) * Math.sin(t * 16 + i) * 0.9))
        })
      })
    }

    if (fx.has('grid')) {
      const n = 8
      const size = 0.5
      const pts: number[] = []
      for (let i = 0; i <= n; i++) {
        const x = -n * size * 0.5 + i * size
        pts.push(x, 0, -n * size * 0.5, x, 0, n * size * 0.5, -n * size * 0.5, 0, x, n * size * 0.5, 0, x)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
      const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#00E5FF', transparent: true, opacity: 0.85 }))
      const grid = new THREE.Group()
      grid.add(lines)
      const path = [[0, 3], [0, 2], [0, 1], [1, 1], [2, 1], [2, 0]]
      path.forEach(([cx, cz], i) => {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ color: i === path.length - 1 ? '#FFB020' : '#FC6818', transparent: true, opacity: 0.55, depthWrite: false }))
        tile.rotation.x = -Math.PI / 2
        tile.position.set(-size * 0.5 + cx * size - 0.25, 0.01, -size * 0.5 + cz * size - 0.25)
        tile.userData.i = i
        grid.add(tile)
      })
      const holo = plan.set === 'market' && /air/i.test(plan.setting)
      grid.position.set(0, holo ? 1.6 : 0.03, holo ? -0.4 : 0.6)
      if (holo) grid.rotation.x = 0.9
      this.sceneGroup.add(grid)
      this.sceneUpdaters.push((t) => {
        grid.children.forEach((c) => {
          if (typeof c.userData.i === 'number') ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.5 * Math.max(0, Math.sin(t * 2 - (c.userData.i as number) * 0.6))
        })
      })
    }

    if (fx.has('ball')) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.4 }))
      ball.castShadow = true
      this.sceneGroup.add(ball)
      this.sceneUpdaters.push((t) => {
        const p = ((t * 0.35) % 1) * 2 - 1
        ball.position.set(p * 2.4, 0.1, 1.2)
        ball.rotation.z = -p * 24
      })
    }

    if (fx.has('sketch')) {
      const tex = sketchTexture(`${plan.setting} ${plan.action}`)
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.92), new THREE.MeshStandardMaterial({ map: tex, emissive: '#FFFFFF', emissiveMap: tex, emissiveIntensity: 0.35, side: THREE.DoubleSide }))
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.02), new THREE.MeshBasicMaterial({ color: '#00E5FF', transparent: true, opacity: 0.35 }))
      frame.position.z = -0.01
      const g = new THREE.Group()
      g.add(frame, panel)
      g.position.set(-1.4, 1.9, -0.2)
      g.rotation.y = 0.35
      this.sceneGroup.add(g)
      this.sceneUpdaters.push((t) => {
        g.position.y = 1.9 + (this.calm ? 0 : Math.sin(t * 1.4) * 0.04)
      })
    }

    if (fx.has('festival')) {
      const lanterns = new THREE.Group()
      const cols = ['#FC6818', '#FACC15', '#F472B6', '#00E5FF', '#22C55E']
      for (let i = 0; i < 18; i++) {
        const c = cols[i % cols.length]
        const l = new THREE.Group()
        l.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.2, 10), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, transparent: true, opacity: 0.92 })), halo(c, 0.6, 0.6))
        l.position.set((Math.random() - 0.5) * 9, 2.4 + Math.random() * 1.8, -1.5 - Math.random() * 4)
        l.userData.ph = Math.random() * 6
        lanterns.add(l)
      }
      this.sceneGroup.add(lanterns)
      this.sceneUpdaters.push((t) => {
        lanterns.children.forEach((l) => {
          l.position.y += Math.sin(t * 0.8 + (l.userData.ph as number)) * 0.0015
          l.rotation.y = t * 0.3
        })
      })
      this.confetti(new THREE.Vector3(0, 3, 0), 50)
    }

    if (fx.has('if-sign')) {
      const sign = labelSprite('IF', 'orange', 0.55)
      this.sceneGroup.add(sign)
      this.sceneUpdaters.push((t, _dt, a) => {
        sign.position.copy(a.robotHead).add(new THREE.Vector3(0, 0.75 + Math.sin(t * 2) * 0.04, 0))
      })
    }

    if (fx.has('distance')) {
      let cur = -1
      let sp: THREE.Sprite | null = null
      this.sceneUpdaters.push((t, _dt, a) => {
        const v = Math.round(60 - ((t * 6) % 45))
        if (v !== cur) {
          cur = v
          if (sp) {
            this.sceneGroup.remove(sp)
            sp.material.map?.dispose()
            sp.material.dispose()
          }
          sp = labelSprite(`${v} cm`, v < 25 ? 'orange' : 'cyan', 0.26)
          this.sceneGroup.add(sp)
        }
        sp?.position.copy(a.robotHead).add(new THREE.Vector3(0, 0.45, 0))
      })
    }

    if (fx.has('splash')) {
      let next = 0
      this.sceneUpdaters.push((t) => {
        if (t > next) {
          next = t + 1.6
          for (let i = 0; i < 14; i++) {
            const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: '#7DD3FC' }))
            d.position.set(-1.4, 0.1, 1.3)
            this.particles.push({ obj: d, v: new THREE.Vector3((Math.random() - 0.5) * 1.6, 1.5 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6), life: 0, max: 1, spin: 0 })
            this.sceneGroup.add(d)
          }
        }
      })
    }

    if (fx.has('thought')) {
      const g = new THREE.Group()
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), new THREE.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.92, roughness: 0.3 }))
      bubble.scale.set(1.2, 0.9, 0.4)
      g.add(bubble)
      for (let i = 0; i < 2; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05 - i * 0.02, 8, 6), bubble.material)
        dot.position.set(-0.2 - i * 0.12, -0.25 - i * 0.12, 0)
        g.add(dot)
      }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshStandardMaterial({ color: '#EF4444' }))
      ball.position.z = 0.1
      g.add(ball)
      this.sceneGroup.add(g)
      this.sceneUpdaters.push((t, _dt, a) => {
        if (a.boltHead) g.position.copy(a.boltHead).add(new THREE.Vector3(0.25, 0.42 + Math.sin(t * 2) * 0.03, 0))
        g.visible = a.boltHead !== null
      })
    }

    if (fx.has('kit') && kitPos) {
      const bodies: BodyId[] = ['box', 'dome', 'tall', 'bug']
      bodies.forEach((body, i) => {
        const r = buildRobot({ ...DEFAULT_DESIGN, body, primary: ['#FC6818', '#00B8D4', '#22C55E', '#FACC15'][i] })
        r.scale.setScalar(0.32)
        r.position.set(kitPos.x - 0.9 + i * 0.6, kitPos.y, kitPos.z)
        r.rotation.y = -0.2 + i * 0.13
        this.sceneGroup.add(r)
        const lbl = labelSprite(['BOX', 'DOME', 'TOWER', 'BUG'][i], 'navy', 0.13)
        lbl.position.set(kitPos.x - 0.9 + i * 0.6, kitPos.y + 0.5, kitPos.z)
        this.sceneGroup.add(lbl)
      })
    }

    if (fx.has('headlight')) {
      const spot = new THREE.SpotLight('#FFF4D6', 18, 9, 0.45, 0.5, 1.2)
      const target = new THREE.Object3D()
      this.sceneGroup.add(spot, target)
      spot.target = target
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 4, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#FFF4D6', transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      )
      this.sceneGroup.add(cone)
      this.sceneUpdaters.push((_t, _dt, a) => {
        const dir = new THREE.Vector3(Math.sin(a.robotYaw), -0.1, Math.cos(a.robotYaw))
        spot.position.copy(a.robotHead)
        target.position.copy(a.robotHead).addScaledVector(dir, 4)
        cone.position.copy(a.robotHead).addScaledVector(dir, 2)
        cone.lookAt(a.robotHead)
        cone.rotateX(Math.PI / 2)
      })
    }

    if (fx.has('toaster') && kitPos) {
      // "Is a toaster a robot? Is a toy car?" — the two non-robots on the table.
      const chrome = new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.2, metalness: 0.85 })
      const toaster = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.2), chrome)
      body.position.y = 0.11
      toaster.add(body)
      for (const x of [-0.06, 0.06]) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.15), new THREE.MeshStandardMaterial({ color: '#111827' }))
        slot.position.set(x, 0.225, 0)
        toaster.add(slot)
      }
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: '#111827' }))
      lever.position.set(0.18, 0.15, 0)
      toaster.add(lever)
      toaster.position.set(kitPos.x - 0.75, kitPos.y, kitPos.z)
      toaster.rotation.y = 0.3
      const car = new THREE.Group()
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.15), new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.4 }))
      carBody.position.y = 0.07
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.13), new THREE.MeshStandardMaterial({ color: '#BAE6FD', roughness: 0.1 }))
      cab.position.set(-0.02, 0.145, 0)
      car.add(carBody, cab)
      for (const [x, z] of [[-0.1, 0.08], [0.1, 0.08], [-0.1, -0.08], [0.1, -0.08]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), new THREE.MeshStandardMaterial({ color: '#111827' }))
        w.rotation.x = Math.PI / 2
        w.position.set(x, 0.04, z)
        car.add(w)
      }
      car.position.set(kitPos.x + 0.1, kitPos.y, kitPos.z + 0.1)
      car.rotation.y = -0.4
      for (const o of [toaster, car]) o.traverse((c) => ((c as THREE.Mesh).castShadow = true))
      this.sceneGroup.add(toaster, car)
      const q1 = labelSprite('ROBOT?', 'navy', 0.12)
      q1.position.set(kitPos.x - 0.75, kitPos.y + 0.45, kitPos.z)
      const q2 = labelSprite('ROBOT?', 'navy', 0.12)
      q2.position.set(kitPos.x + 0.1, kitPos.y + 0.35, kitPos.z + 0.1)
      this.sceneGroup.add(q1, q2)
    }

    if (fx.has('boat-bottle')) {
      const g = new THREE.Group()
      const hull = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 4), new THREE.MeshStandardMaterial({ color: '#F8FAFC', flatShading: true }))
      hull.rotation.x = Math.PI
      hull.scale.set(1.6, 1, 0.8)
      g.add(hull)
      const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 10), new THREE.MeshStandardMaterial({ color: '#86EFAC', transparent: true, opacity: 0.7, roughness: 0.05 }))
      bottle.rotation.z = Math.PI / 2
      bottle.position.y = 0.12
      g.add(bottle, halo('#86EFAC', 0.5, 0.4))
      this.sceneGroup.add(g)
      this.sceneUpdaters.push((t) => {
        g.position.set(-3 + ((t * 0.12) % 6), -0.38 + Math.sin(t * 1.5) * 0.04, -3.2)
        g.rotation.z = Math.sin(t * 1.2) * 0.12
      })
    }
  }

  private wind(strength: number): void {
    const leaves = new THREE.Group()
    const lm = ['#84CC16', '#F59E0B', '#22C55E'].map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }))
    for (let i = 0; i < (this.calm ? 6 : 26); i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), lm[i % 3])
      l.userData.ph = Math.random() * 20
      l.userData.y = 0.3 + Math.random() * 3
      l.userData.z = -2 + Math.random() * 5
      leaves.add(l)
    }
    this.sceneGroup.add(leaves)
    this.sceneUpdaters.push((t) => {
      leaves.children.forEach((l) => {
        const ph = (l.userData.ph as number) + t * strength
        l.position.set(((ph * 1.3) % 14) - 7, (l.userData.y as number) + Math.sin(ph * 2) * 0.3, l.userData.z as number)
        l.rotation.set(ph * 3, ph * 2, ph)
      })
    })
  }

  // ── Line effects ─────────────────────────────────────────────────────────

  setLine(beat: Beat | null, t: number): void {
    this.clear(this.lineGroup)
    this.lineUpdaters = []
    this.lineStart = t
    if (!beat || beat.kind !== 'line') return
    const fx = new Set<LineEffect>(beat.lineEffects)

    if (fx.has('beam')) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 1.8, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: '#00E5FF', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      )
      const rings: THREE.Mesh[] = []
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 28), new THREE.MeshBasicMaterial({ color: '#00E5FF', transparent: true, opacity: 0.8, depthWrite: false }))
        rings.push(r)
        this.lineGroup.add(r)
      }
      this.lineGroup.add(cone)
      this.lineUpdaters.push((tt, _dt, a) => {
        const dir = new THREE.Vector3(Math.sin(a.robotYaw), 0, Math.cos(a.robotYaw))
        cone.position.copy(a.robotHead).addScaledVector(dir, 0.95)
        cone.lookAt(a.robotHead)
        cone.rotateX(Math.PI / 2)
        rings.forEach((r, i) => {
          const p = ((tt * 0.8 + i / 3) % 1)
          r.position.copy(a.robotHead).addScaledVector(dir, 0.15 + p * 1.7)
          r.lookAt(a.robotHead)
          r.scale.setScalar(0.4 + p * 2)
          ;(r.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - p)
        })
      })
    }

    if (fx.has('think')) {
      const g = new THREE.Group()
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshStandardMaterial({ color: '#FFF3C4', emissive: '#FFB020', emissiveIntensity: 2.4 }))
      g.add(bulb, halo('#FFC861', 0.55, 0.8))
      const sparks: THREE.Mesh[] = []
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), new THREE.MeshBasicMaterial({ color: i % 2 ? '#00E5FF' : '#FFB020' }))
        sparks.push(s)
        g.add(s)
      }
      this.lineGroup.add(g)
      this.lineUpdaters.push((tt, _dt, a, p) => {
        const head = a.speakerHead ?? a.robotHead
        g.position.copy(head).add(new THREE.Vector3(0, 0.32 + Math.min(1, p * 4) * 0.08, 0))
        g.scale.setScalar(Math.min(1, p * 6))
        sparks.forEach((s, i) => {
          const ang = tt * 2.5 + (i / 5) * Math.PI * 2
          s.position.set(Math.cos(ang) * 0.17, Math.sin(ang * 1.3) * 0.05, Math.sin(ang) * 0.17)
          s.rotation.y = tt * 4
        })
      })
    }

    const arrowKind = fx.has('arrow-left') ? 'left' : fx.has('arrow-right') ? 'right' : fx.has('arrow-forward') ? 'forward' : null
    if (arrowKind) {
      const shape = new THREE.Shape()
      shape.moveTo(-0.06, 0)
      shape.lineTo(0.06, 0)
      shape.lineTo(0.06, 0.32)
      shape.lineTo(0.15, 0.32)
      shape.lineTo(0, 0.52)
      shape.lineTo(-0.15, 0.32)
      shape.lineTo(-0.06, 0.32)
      shape.closePath()
      const am = new THREE.MeshBasicMaterial({ color: '#FC6818', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })
      const arrows: THREE.Mesh[] = []
      for (let i = 0; i < 3; i++) {
        const ar = new THREE.Mesh(new THREE.ShapeGeometry(shape), am)
        ar.rotation.x = -Math.PI / 2
        arrows.push(ar)
        this.lineGroup.add(ar)
      }
      const turn = arrowKind === 'left' ? 1 : arrowKind === 'right' ? -1 : 0
      this.lineUpdaters.push((tt, _dt, a) => {
        const base = a.robot ?? new THREE.Vector3(0, 0, 0.6)
        arrows.forEach((ar, i) => {
          const p = ((tt * 0.9 + i / 3) % 1)
          const ang = a.robotYaw + turn * p * 1.4
          const dist = 0.35 + p * 0.7
          ar.position.set(base.x + Math.sin(ang) * dist, 0.03, base.z + Math.cos(ang) * dist)
          ar.rotation.z = ang + Math.PI
          ;(ar.material as THREE.MeshBasicMaterial).opacity = 0.9 * Math.sin(p * Math.PI)
        })
      })
    }

    if (beat.labels.length) {
      const sprites = beat.labels.map((l) => labelSprite(l, SENSOR_WORDS.has(l) ? 'cyan' : 'orange', 0.2))
      sprites.forEach((s) => this.lineGroup.add(s))
      this.lineUpdaters.push((tt, _dt, a, p) => {
        const anchor = a.robot ? a.robotHead : a.speakerHead ?? a.robotHead
        const n = sprites.length
        sprites.forEach((s, i) => {
          const appear = THREE.MathUtils.clamp((p - i * 0.12) * 6, 0, 1)
          const pop = appear < 1 ? 1 + Math.sin(appear * Math.PI) * 0.25 : 1
          const base = s.userData.baseScale as THREE.Vector3
          s.scale.set(base.x * appear * pop, base.y * appear * pop, 1)
          s.position.set(anchor.x + (i - (n - 1) / 2) * 0.62, anchor.y + 0.55 + (this.calm ? 0 : Math.sin(tt * 2 + i) * 0.03), anchor.z + 0.1)
        })
      })
    }

    if (fx.has('cheer')) {
      this.lineUpdaters.push((_tt, _dt, a, p) => {
        if (p > 0.05 && !this.cheered) {
          this.cheered = true
          this.confetti((a.speakerHead ?? a.robotHead).clone().add(new THREE.Vector3(0, 0.4, 0)), this.calm ? 12 : 40)
        }
      })
    }
    this.cheered = false
  }

  private cheered = false

  confetti(at: THREE.Vector3, n: number): void {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(this.confettiGeo, this.confettiMats[i % this.confettiMats.length])
      c.position.copy(at)
      this.particles.push({ obj: c, v: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3), life: 0, max: 2.2, spin: (Math.random() - 0.5) * 20 })
      this.group.add(c)
    }
  }

  update(t: number, dt: number, a: FxAnchors, lineProgress: number): void {
    for (const u of this.sceneUpdaters) u(t, dt, a)
    for (const u of this.lineUpdaters) u(t - this.lineStart, dt, a, lineProgress)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      p.v.y -= 4.5 * dt
      p.v.multiplyScalar(1 - dt * 0.8)
      p.obj.position.addScaledVector(p.v, dt)
      p.obj.rotation.x += p.spin * dt
      p.obj.rotation.y += p.spin * 0.7 * dt
      if (p.life > p.max || p.obj.position.y < -0.2) {
        p.obj.parent?.remove(p.obj)
        const m = p.obj as THREE.Mesh
        if (m.geometry !== this.confettiGeo) {
          m.geometry.dispose()
          ;(m.material as THREE.Material).dispose()
        }
        this.particles.splice(i, 1)
      }
    }
  }

  dispose(): void {
    this.clear(this.sceneGroup)
    this.clear(this.lineGroup)
    for (const p of this.particles) p.obj.parent?.remove(p.obj)
    this.particles = []
    this.confettiGeo.dispose()
    for (const m of this.confettiMats) m.dispose()
    glowTex?.dispose()
    glowTex = null
  }
}
