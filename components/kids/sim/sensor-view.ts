// components/kids/sim/sensor-view.ts
// Robot's-eye sensor view (roadmap #37): a picture-in-picture of what the robot
// SENSES, next to what we see. Owned by the sim renderer (renderer.ts), which
// feeds it every drawn frame. Plain DOM + a 2D canvas, so it adds no React to
// the 3D chunk and works in every view that uses SimRenderer.
//
//   * In the 3D scene: all 20 ultrasonic rays of the echo cone, from the eye to
//     where each one hit (dot) or its full 2 m range.
//   * In the picture-in-picture:
//       - the echo cone seen from above (nearest echo per direction) and as a
//         5 × 4 "echo picture" (columns left → right, rows level → 30° down);
//       - a low-resolution head-camera image (robots with a Camera Eye);
//       - the line-sensor patch (five dots), the floor colour, the bumper (the
//         frame flashes when it is pressed);
//       - "raw numbers" for teens: every ray in cm and every sensor value.
//   * A sensor the robot does not have is shown as "needs …" — that gap is the lesson.
//
// Respects Lite 3D (smaller, slower head camera) and less motion (no flashing).

import * as THREE from 'three'
import { capabilitiesOf, CAPABILITY_NEEDS, type Capability, type RobotDesign } from '@/lib/kids/robot-design'
import type { FloorColor } from '@/lib/kids/sim/arena'
import type { SensorReadings } from '@/lib/kids/sim/engine'
import { robotSpec } from '@/lib/kids/sim/robot-spec'
import { getProgress } from '@/lib/kids-progress'
import { kidsLite3D } from '@/lib/kids/settings'
import type { Stage } from '@/components/kids/three/stage'

const FLOOR_HEX: Record<FloorColor, string> = {
  white: '#F1F5F9',
  black: '#0F172A',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#3B82F6',
  yellow: '#FACC15',
}
const RAY_COUNT = 20
const COLS = 5
const MAX_CM = 200

/** Distance → colour: near is hot (red/orange), far is cool (cyan), nothing is dark. */
function distColor(cm: number, hit: boolean): string {
  if (!hit) return '#19263F'
  if (cm < 20) return '#EF4444'
  if (cm < 50) return '#FC6818'
  if (cm < 100) return '#FACC15'
  return '#00B8D4'
}

export class SensorView {
  private on = false
  private raw = false
  private readonly teen: boolean
  private caps = new Set<Capability>()
  private design: RobotDesign | null = null
  private readonly reduced: boolean
  private readonly lite: boolean
  // DOM
  private readonly toggle: HTMLButtonElement
  private readonly panel: HTMLDivElement
  private readonly canvas: HTMLCanvasElement
  private readonly rawBox: HTMLDivElement
  private readonly rawBtn: HTMLButtonElement | null
  // 3D rays
  private readonly rayGeo = new THREE.BufferGeometry()
  private readonly rayLines: THREE.LineSegments
  private readonly hitGeo = new THREE.BufferGeometry()
  private readonly hitPoints: THREE.Points
  // Head camera
  private readonly headCam = new THREE.PerspectiveCamera(62, 1.6, 0.01, 8)
  private readonly rt: THREE.WebGLRenderTarget
  private readonly pixels: Uint8Array
  private readonly camCanvas: HTMLCanvasElement
  private readonly camW: number
  private readonly camH: number
  private camClock = 0
  private drawClock = 0
  private labelClock = 0
  private last: SensorReadings | null = null
  private bumpOn = false

  constructor(
    container: HTMLElement,
    private readonly stage: Stage,
    private readonly robotRoot: THREE.Object3D,
    /** Things the head camera must not see (the robot's own model, the beams). */
    private readonly hideForCamera: () => THREE.Object3D[],
    private readonly wake: () => void,
    reducedMotion: boolean,
  ) {
    this.reduced = reducedMotion
    this.lite = kidsLite3D()
    const band = typeof window !== 'undefined' ? getProgress().band : null
    this.teen = band === 'inventors' || band === 'engineers'
    this.raw = band === 'engineers'

    // ── 3D rays ──
    this.rayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAY_COUNT * 2 * 3), 3))
    this.rayGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RAY_COUNT * 2 * 3), 3))
    this.rayLines = new THREE.LineSegments(this.rayGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }))
    this.rayLines.frustumCulled = false
    this.rayLines.visible = false
    this.hitGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAY_COUNT * 3), 3))
    this.hitGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RAY_COUNT * 3), 3))
    this.hitPoints = new THREE.Points(this.hitGeo, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, depthWrite: false }))
    this.hitPoints.frustumCulled = false
    this.hitPoints.visible = false
    stage.scene.add(this.rayLines, this.hitPoints)

    // ── Head camera (low resolution on purpose: robot cameras feed small images to the brain) ──
    this.camW = this.lite ? 48 : 80
    this.camH = this.lite ? 30 : 50
    this.rt = new THREE.WebGLRenderTarget(this.camW, this.camH, { depthBuffer: true })
    this.rt.texture.colorSpace = THREE.SRGBColorSpace
    this.pixels = new Uint8Array(this.camW * this.camH * 4)
    this.camCanvas = document.createElement('canvas')
    this.camCanvas.width = this.camW
    this.camCanvas.height = this.camH
    this.headCam.rotation.y = Math.PI // the robot faces +z, a camera looks down -z
    robotRoot.add(this.headCam)

    // ── DOM (no z-index: the page's own result cards, later siblings, stay on top) ──
    this.toggle = document.createElement('button')
    this.toggle.type = 'button'
    this.toggle.className =
      'absolute left-3 top-3 min-h-[44px] rounded-2xl bg-black/55 px-3 text-xs font-black text-cyan-100 backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
    this.toggle.setAttribute('aria-pressed', 'false')
    this.toggle.setAttribute('data-testid', 'sensor-view-toggle')
    this.toggle.textContent = "👁 Robot's eye"
    this.toggle.addEventListener('click', () => this.setOn(!this.on))

    this.panel = document.createElement('div')
    this.panel.className =
      'absolute left-3 top-[60px] hidden max-h-[calc(100%-72px)] w-[min(46%,250px)] min-w-[150px] overflow-y-auto rounded-2xl border-2 border-white/15 bg-[#0A1120]/90 p-2 text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop-blur'
    this.panel.setAttribute('role', 'group')
    this.panel.setAttribute('aria-label', 'What my robot senses')
    this.panel.setAttribute('data-testid', 'sensor-view')
    const head = document.createElement('div')
    head.className = 'mb-1 flex items-center gap-1'
    const title = document.createElement('p')
    title.className = 'mr-auto text-[11px] font-black uppercase tracking-wider text-cyan-200'
    title.textContent = 'What I sense'
    head.appendChild(title)
    if (this.teen) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'min-h-[44px] min-w-[44px] rounded-xl px-2 text-xs font-black text-slate-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
      b.textContent = '123'
      b.setAttribute('aria-label', 'Raw numbers')
      b.setAttribute('aria-pressed', String(this.raw))
      b.setAttribute('data-testid', 'sensor-view-raw')
      b.addEventListener('click', () => {
        this.raw = !this.raw
        b.setAttribute('aria-pressed', String(this.raw))
        b.className = b.className.replace(/ bg-amber-400 text-\[#1A1103\]/g, '') + (this.raw ? ' bg-amber-400 text-[#1A1103]' : '')
        this.rawBox.classList.toggle('hidden', !this.raw)
        this.redraw()
      })
      if (this.raw) b.className += ' bg-amber-400 text-[#1A1103]'
      head.appendChild(b)
      this.rawBtn = b
    } else {
      this.rawBtn = null
    }
    this.panel.appendChild(head)
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'block w-full'
    this.canvas.setAttribute('role', 'img')
    this.canvas.setAttribute('aria-label', 'Robot sensor picture')
    this.panel.appendChild(this.canvas)
    this.rawBox = document.createElement('div')
    this.rawBox.className = `mt-1 whitespace-pre font-mono text-[10px] leading-tight tabular-nums text-slate-200 ${this.raw ? '' : 'hidden'}`
    this.rawBox.setAttribute('data-testid', 'sensor-view-numbers')
    this.panel.appendChild(this.rawBox)
    container.append(this.toggle, this.panel)
  }

  setOn(on: boolean): void {
    this.on = on
    this.toggle.setAttribute('aria-pressed', String(on))
    this.toggle.textContent = on ? "✕ Robot's eye" : "👁 Robot's eye"
    this.panel.classList.toggle('hidden', !on)
    this.syncRays()
    this.camClock = Infinity
    this.drawClock = Infinity
    this.redraw()
    this.wake()
  }

  get isOn(): boolean {
    return this.on
  }

  setDesign(design: RobotDesign): void {
    this.design = design
    this.caps = capabilitiesOf(design)
    const eye = robotSpec(design).eye
    this.headCam.position.set(eye[0], eye[1], eye[2] + 0.02)
    this.syncRays()
    this.redraw()
  }

  private syncRays(): void {
    const show = this.on && this.caps.has('see-wall')
    this.rayLines.visible = show
    this.hitPoints.visible = show
  }

  /** Every drawn frame. `sensors` is null when the page did not read them this frame. */
  update(sensors: SensorReadings | null, dt: number): void {
    if (!this.on) return
    if (sensors) this.last = sensors
    const s = this.last
    if (s && this.caps.has('see-wall')) this.updateRays(s)
    const camRate = this.lite ? 4 : 10
    this.camClock += dt
    if (this.design?.head === 'camera' && this.camClock >= 1 / camRate) {
      this.camClock = 0
      this.captureHeadCam()
    }
    this.drawClock += dt
    if (this.drawClock >= 1 / (this.lite ? 8 : 15)) {
      this.drawClock = 0
      this.redraw()
    }
  }

  private updateRays(s: SensorReadings): void {
    const pos = this.rayGeo.getAttribute('position') as THREE.BufferAttribute
    const col = this.rayGeo.getAttribute('color') as THREE.BufferAttribute
    const hp = this.hitGeo.getAttribute('position') as THREE.BufferAttribute
    const hc = this.hitGeo.getAttribute('color') as THREE.BufferAttribute
    const c = new THREE.Color()
    const from = s.beam.from
    for (let i = 0; i < RAY_COUNT; i++) {
      const b = s.beams[i]
      if (!b) {
        pos.setXYZ(i * 2, from.x, from.y, from.z)
        pos.setXYZ(i * 2 + 1, from.x, from.y, from.z)
        hp.setXYZ(i, from.x, -10, from.z)
        continue
      }
      c.set(b.hit ? distColor(b.cm, true) : '#5B6B86')
      pos.setXYZ(i * 2, from.x, from.y, from.z)
      pos.setXYZ(i * 2 + 1, b.to.x, b.to.y, b.to.z)
      col.setXYZ(i * 2, c.r, c.g, c.b)
      col.setXYZ(i * 2 + 1, c.r, c.g, c.b)
      // A miss has no dot: park it under the floor.
      hp.setXYZ(i, b.to.x, b.hit ? b.to.y : -10, b.to.z)
      hc.setXYZ(i, c.r, c.g, c.b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    hp.needsUpdate = true
    hc.needsUpdate = true
  }

  private captureHeadCam(): void {
    const r = this.stage.renderer
    const hidden = [...this.hideForCamera(), this.rayLines, this.hitPoints]
    const was = hidden.map((o) => o.visible)
    hidden.forEach((o) => (o.visible = false))
    const prevTarget = r.getRenderTarget()
    const prevXr = r.xr.enabled
    r.xr.enabled = false
    try {
      r.setRenderTarget(this.rt)
      r.render(this.stage.scene, this.headCam)
      r.readRenderTargetPixels(this.rt, 0, 0, this.camW, this.camH, this.pixels)
    } catch {
      /* a lost context: keep the last picture */
    } finally {
      r.setRenderTarget(prevTarget)
      r.xr.enabled = prevXr
      hidden.forEach((o, i) => (o.visible = was[i]))
    }
    const g = this.camCanvas.getContext('2d')
    if (!g) return
    const img = g.createImageData(this.camW, this.camH)
    // WebGL rows run bottom-up.
    for (let y = 0; y < this.camH; y++) {
      const src = (this.camH - 1 - y) * this.camW * 4
      img.data.set(this.pixels.subarray(src, src + this.camW * 4), y * this.camW * 4)
    }
    g.putImageData(img, 0, 0)
  }

  /** Paint the picture-in-picture. */
  private redraw(): void {
    if (!this.on) return
    const s = this.last
    const cssW = Math.max(140, this.panel.clientWidth - 16)
    const dpr = this.lite ? 1 : Math.min(2, window.devicePixelRatio || 1)
    const hasWall = this.caps.has('see-wall')
    const hasCam = this.design?.head === 'camera'
    const fanH = Math.round(cssW * 0.5)
    const gridH = Math.round(cssW * 0.3)
    const camH = hasCam ? Math.round(cssW * (this.camH / this.camW)) : 0
    const floorH = 46
    const labelH = 14
    const cssH = labelH + (hasWall ? fanH + gridH + 6 : 22) + (hasCam ? labelH + camH + 6 : 0) + labelH + floorH
    if (this.canvas.width !== Math.round(cssW * dpr) || this.canvas.height !== Math.round(cssH * dpr)) {
      this.canvas.width = Math.round(cssW * dpr)
      this.canvas.height = Math.round(cssH * dpr)
      this.canvas.style.height = `${cssH}px`
    }
    const g = this.canvas.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, cssW, cssH)
    g.textBaseline = 'top'
    let y = 0
    const label = (text: string, colour = '#A7B0C0') => {
      g.font = '800 10px system-ui, sans-serif'
      g.fillStyle = colour
      g.fillText(text, 0, y)
      y += labelH
    }
    const need = (cap: Capability) => {
      g.font = '700 11px system-ui, sans-serif'
      g.fillStyle = '#6E7888'
      g.fillText(`🔒 needs ${CAPABILITY_NEEDS[cap]}`, 0, y + 2)
      y += 22
    }

    // ── Echo cone ──
    label(hasWall ? `ECHO · nearest ${s ? (s.distanceCm >= MAX_CM ? '200+' : Math.round(s.distanceCm)) : '–'} cm` : 'ECHO (distance)')
    if (!hasWall) need('see-wall')
    else {
      const cx = cssW / 2
      const by = y + fanH - 6
      const R = fanH - 14
      g.strokeStyle = 'rgba(255,255,255,0.12)'
      g.lineWidth = 1
      for (const k of [0.25, 0.5, 1]) {
        g.beginPath()
        g.arc(cx, by, R * k, Math.PI + 0.6, -0.6)
        g.stroke()
      }
      if (s) {
        for (let col = 0; col < COLS; col++) {
          // The nearest echo of the four rays (level → 30° down) in this direction.
          let best = { cm: MAX_CM, hit: false, yaw: 0 }
          for (let row = 0; row < 4; row++) {
            const b = s.beams[row * COLS + col]
            if (!b) continue
            best.yaw = b.yawDeg
            if (b.hit && b.cm < best.cm) best = { cm: b.cm, hit: true, yaw: b.yawDeg }
          }
          // Spread the 24° cone wider on the little screen so the five directions are readable.
          const a = (best.yaw * 3 * Math.PI) / 180
          const len = (Math.min(MAX_CM, best.cm) / MAX_CM) * R
          const ex = cx - Math.sin(a) * len
          const ey = by - Math.cos(a) * len
          g.strokeStyle = best.hit ? distColor(best.cm, true) : 'rgba(167,176,192,0.35)'
          g.lineWidth = 2
          g.beginPath()
          g.moveTo(cx, by)
          g.lineTo(ex, ey)
          g.stroke()
          if (best.hit) {
            g.fillStyle = distColor(best.cm, true)
            g.beginPath()
            g.arc(ex, ey, 3.5, 0, Math.PI * 2)
            g.fill()
          }
        }
      }
      g.fillStyle = '#FC6818'
      g.beginPath()
      g.moveTo(cx, by - 8)
      g.lineTo(cx - 6, by + 4)
      g.lineTo(cx + 6, by + 4)
      g.closePath()
      g.fill()
      y += fanH
      // 5 × 4 echo picture: every one of the 20 rays.
      const cw = cssW / COLS
      const ch = (gridH - 4) / 4
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < COLS; col++) {
          const b = s?.beams[row * COLS + col]
          // Column 0 is the ray furthest LEFT (+yaw), drawn on the left.
          const x = (COLS - 1 - col) * cw
          g.fillStyle = b ? distColor(b.cm, b.hit) : '#19263F'
          g.fillRect(x + 1, y + row * ch + 1, cw - 2, ch - 2)
          if (this.raw && b && ch >= 10) {
            g.font = '700 9px ui-monospace, monospace'
            g.fillStyle = b.hit && b.cm < 100 ? '#1A1103' : '#EEF2F8'
            g.fillText(b.hit ? String(Math.round(b.cm)) : '–', x + 3, y + row * ch + 2)
          }
        }
      }
      y += gridH + 6
    }

    // ── Head camera ──
    if (hasCam) {
      label('HEAD CAMERA (low-res)')
      g.imageSmoothingEnabled = false
      g.drawImage(this.camCanvas, 0, y, cssW, camH)
      g.strokeStyle = 'rgba(0,229,255,0.5)'
      g.strokeRect(0.5, y + 0.5, cssW - 1, camH - 1)
      y += camH + 6
    }

    // ── Floor: line patch, colour, bumper ──
    label('UNDER ME')
    const cell = Math.min(22, (cssW - 70) / 5)
    if (this.caps.has('follow-line')) {
      const samples = s?.lineSamples ?? [false, false, false, false, false]
      // Sample 0 is the LEFT end of the bar (engine.ts LINE_SAMPLES × the robot's right vector).
      samples.forEach((on, i) => {
        const x = i * (cell + 2)
        g.fillStyle = on ? '#0F172A' : FLOOR_HEX[s?.floorColor ?? 'white']
        g.fillRect(x, y, cell, cell)
        g.strokeStyle = on ? '#FFA878' : 'rgba(255,255,255,0.3)'
        g.lineWidth = on ? 2 : 1
        g.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      })
    } else {
      g.font = '700 10px system-ui, sans-serif'
      g.fillStyle = '#6E7888'
      g.fillText('🔒 line: needs a Line Sensor', 0, y + 4)
    }
    const right = cssW - 60
    if (this.caps.has('see-color')) {
      g.fillStyle = FLOOR_HEX[s?.floorColor ?? 'white']
      g.fillRect(right, y, 22, 22)
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      g.strokeRect(right + 0.5, y + 0.5, 21, 21)
    }
    if (this.caps.has('feel-bump')) {
      g.fillStyle = s?.bumped ? '#EF4444' : '#19263F'
      g.beginPath()
      g.arc(right + 44, y + 11, 10, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      g.stroke()
    }
    g.font = '700 9px system-ui, sans-serif'
    g.fillStyle = '#A7B0C0'
    g.fillText(this.caps.has('see-color') ? (s?.floorColor ?? 'white') : '', right, y + 26)
    if (this.caps.has('feel-bump')) g.fillText(s?.bumped ? 'BUMP!' : 'bumper', right + 34, y + 26)

    // Bumper flash: the whole frame goes red while pressed (no flashing under less motion — it just stays red).
    const bump = Boolean(s?.bumped && this.caps.has('feel-bump'))
    if (bump !== this.bumpOn) {
      this.bumpOn = bump
      this.panel.classList.toggle('border-white/15', !bump)
      this.panel.classList.toggle('border-rose-500', bump)
      if (!this.reduced) this.panel.classList.toggle('animate-pulse', bump)
    }

    // ── Words for screen readers (2 per second at most) and raw numbers ──
    this.labelClock += 1
    if (this.labelClock % (this.lite ? 4 : 8) === 1 || !s) this.canvas.setAttribute('aria-label', this.summary(s))
    if (this.raw) this.rawBox.textContent = this.rawText(s)
  }

  private summary(s: SensorReadings | null): string {
    if (!s) return 'Robot sensor picture: waiting for the robot.'
    const parts: string[] = []
    if (this.caps.has('see-wall')) {
      const hits = s.beams.filter((b) => b.hit).length
      parts.push(s.distanceCm >= MAX_CM ? 'No echo within 2 metres.' : `Nearest echo ${Math.round(s.distanceCm)} centimetres; ${hits} of ${s.beams.length} rays hit something.`)
    } else parts.push('No distance sensor.')
    if (this.design?.head === 'camera') parts.push('The head camera shows the view ahead.')
    if (this.caps.has('follow-line')) parts.push(s.lineSeen ? `The line is under ${s.lineSamples.filter(Boolean).length} of 5 line sensors.` : 'No line under the line sensor.')
    if (this.caps.has('see-color')) parts.push(`Floor colour ${s.floorColor}.`)
    if (this.caps.has('feel-bump')) parts.push(s.bumped ? 'Bumper pressed!' : 'Bumper not pressed.')
    return parts.join(' ')
  }

  private rawText(s: SensorReadings | null): string {
    if (!s) return ''
    const lines: string[] = []
    if (this.caps.has('see-wall')) {
      lines.push(`dist_cm = ${s.distanceCm}`)
      for (let row = 0; row < 4; row++) {
        const cells: string[] = []
        for (let col = COLS - 1; col >= 0; col--) {
          const b = s.beams[row * COLS + col]
          cells.push(b ? (b.hit ? String(Math.round(b.cm)).padStart(3, ' ') : '  –') : '  ?')
        }
        lines.push(`${String(row * 10).padStart(2, ' ')}°↓ ${cells.join(' ')}`)
      }
    }
    if (this.caps.has('follow-line')) lines.push(`line = ${s.lineSamples.map((b) => (b ? 1 : 0)).join('')}  offset = ${s.lineOffset.toFixed(2)}`)
    if (this.caps.has('see-color')) lines.push(`colour = ${s.floorColor}`)
    if (this.caps.has('feel-bump')) lines.push(`bump = ${s.bumped ? 1 : 0}`)
    lines.push(`heading = ${s.headingDeg.toFixed(1)}°  t = ${s.timerS.toFixed(2)} s`)
    return lines.join('\n')
  }

  dispose(): void {
    this.toggle.remove()
    this.panel.remove()
    this.robotRoot.remove(this.headCam)
    this.stage.scene.remove(this.rayLines, this.hitPoints)
    this.rayGeo.dispose()
    this.hitGeo.dispose()
    ;(this.rayLines.material as THREE.Material).dispose()
    ;(this.hitPoints.material as THREE.Material).dispose()
    this.rt.dispose()
  }
}
