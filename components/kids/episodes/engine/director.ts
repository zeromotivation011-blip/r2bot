// components/kids/episodes/engine/director.ts
// Runs one episode in real time: builds the sets and the cast, keeps the
// episode clock, cuts and moves the camera per beat, plays each voice clip
// on its beat, drives mouths from the clip's loudness envelope, places the
// explanatory effects, lights each set for its time of day, and scores it
// with the generated music bed. Loaded lazily (three.js lives here).

import * as THREE from 'three'
import { createStage, type Stage } from '@/components/kids/three/stage'
import type { RobotDesign } from '@/lib/kids/robot-design'
import { beatAt, type Beat, type CastId, type ChoiceBeat, type EpisodePlan, type ScenePlan, type SetId, type TimeOfDay } from '@/lib/kids/episodes/plan'
import { envelopeAt, type EpisodeData, type VoicedClip } from '@/lib/kids/episodes/types'
import { buildActor, buildHuman, extraLook, idleState, robotMaterials, type Actor, type ActorState, type Emotion, type Gesture } from './characters'
import { Fx, type FxAnchors } from './fx'
import { MusicBed, renderMusicWav, type Mood } from './music'
import { buildSet, type SetBuild } from './sets'
import { Voices } from './voices'

export interface DirectorOptions {
  calm: boolean
  design: RobotDesign
  record: boolean
  onTime: (t: number, beatIndex: number) => void
  onBeat: (beatIndex: number) => void
  onChoice: (choice: ChoiceBeat) => void
  onEnd: () => void
  onPlayState: (playing: boolean) => void
  /** Record mode only: the director ends a choice pause by itself. */
  onChoiceEnd?: () => void
}

/** Seconds into a beat when its voice clip starts. */
export function clipLead(b: Beat): number {
  return b.kind === 'title' ? 0.8 : b.kind === 'next' ? 0.9 : b.kind === 'previously' ? 0.3 : 0
}

interface Placement {
  pos: THREE.Vector3
  yaw: number
}

interface ActorRuntime {
  actor: Actor
  state: ActorState
  from: THREE.Vector3
  to: THREE.Vector3
  yaw: number
  enterAt: number
  enterDur: number
  visible: boolean
}

const SLOT: Record<CastId, [number, number]> = {
  myrobot: [0, 0.95],
  bolt: [0.8, 1.15],
  spark: [0.95, -0.1],
  amara: [-0.95, 0.05],
  lucia: [-1.75, -0.35],
  okafor: [1.85, -0.3],
  noor: [-1.3, 0.95],
  adaeze: [1.85, -0.3],
  mei: [1.85, -0.35],
  haruto: [1.85, -0.3],
  diego: [1.85, -0.3],
  ingrid: [1.85, -0.3],
  lollipop: [2.5, 0.4],
}

/** Where guests stand, in order: right of the group, left, then further out. */
const GUEST_SLOTS: [number, number][] = [
  [1.85, -0.3],
  [-2.4, 0.55],
  [2.7, 0.55],
  [-2.9, -0.55],
  [3.1, -0.9],
  [-3.5, 0.3],
  [3.7, 0.1],
]

const SKY: Record<TimeOfDay, { top: string; horizon: string; bottom: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; elev: number }> = {
  morning: { top: '#6FB7E8', horizon: '#FFE0B8', bottom: '#F5D0A9', sun: '#FFE2B8', sunI: 2.4, hemiSky: '#CFE8FF', hemiGround: '#8A6A4A', hemiI: 1.25, elev: 0.5 },
  day: { top: '#3E9BE0', horizon: '#CBEBFF', bottom: '#DDEFFC', sun: '#FFF6E8', sunI: 2.8, hemiSky: '#D9EEFF', hemiGround: '#7A6A55', hemiI: 1.35, elev: 0.95 },
  evening: { top: '#2E3C7E', horizon: '#FF9E66', bottom: '#F7B58A', sun: '#FFB070', sunI: 1.9, hemiSky: '#8C9BDB', hemiGround: '#5A3A2A', hemiI: 0.95, elev: 0.22 },
  night: { top: '#040A1C', horizon: '#1C2C5C', bottom: '#152245', sun: '#9DB4FF', sunI: 0.7, hemiSky: '#4A5C9A', hemiGround: '#1A2438', hemiI: 0.85, elev: 0.8 },
}

function moodFor(scene: ScenePlan | undefined): Mood {
  if (!scene) return 'bright'
  if (scene.effects.includes('festival')) return 'festive'
  if (scene.set === 'tunnel' || scene.set === 'maze' || scene.fog) return 'mystery'
  if (scene.time === 'night') return 'night'
  if (scene.set === 'workshop' || scene.set === 'house' || scene.set === 'bakery' || scene.time === 'evening') return 'cosy'
  return 'bright'
}

function emotionOf(text: string): Emotion {
  const s = text.toLowerCase()
  if (/oh no|\blost\b|scared|\bsad\b|careful|\boops\b|stuck|cannot|can't|\bhelp\b|\bugh\b|too heavy|slipp|\bbug\b/.test(s)) return 'worried'
  if (/\bwow\b|whoa|what was that|really\?|look!|surprise/.test(s)) return 'surprised'
  if (/!/.test(s) && /(yay|found|hooray|great|love|made it|yes|hello|well done|brilliant|we did|you did|thank|perfect|happy|dance|wheee|good)/.test(s)) return 'happy'
  return 'neutral'
}

function gestureOf(text: string, who: CastId | null): Gesture {
  if (who === 'bolt' || who === 'myrobot' || !who) return 'none'
  const s = text.toLowerCase()
  if (/(hooray|we did it|made it|found it|yay|well done)/.test(s)) return 'cheer'
  if (/\b(hello|hi|bye|good morning|goodbye)\b/.test(s)) return 'wave'
  if (/\b(look|there|this one|over there|see that|watch)\b/.test(s)) return 'point'
  if (/\b(hmm|wonder|think|maybe)\b/.test(s)) return 'think'
  if (/\?\s*$/.test(s.trim())) return 'shrug'
  return 'explain'
}

/** Free geometry, materials and textures of meshes, sprites, points and lines. */
function disposeDeep(root: THREE.Object3D): void {
  root.traverse((o) => {
    const r = o as THREE.Mesh
    r.geometry?.dispose()
    const mats = Array.isArray(r.material) ? r.material : r.material ? [r.material] : []
    for (const m of mats) {
      const map = (m as THREE.MeshStandardMaterial).map
      map?.dispose()
      const em = (m as THREE.MeshStandardMaterial).emissiveMap
      em?.dispose()
      m.dispose()
    }
  })
}

function smooth(x: number): number {
  const k = THREE.MathUtils.clamp(x, 0, 1)
  return k * k * (3 - 2 * k)
}

export class Director {
  private stage: Stage
  private data: EpisodeData
  private plan: EpisodePlan
  private opts: DirectorOptions
  private sets = new Map<SetId, SetBuild>()
  private actors = new Map<CastId, ActorRuntime>()
  private extras: Actor[] = []
  private fx: Fx
  private voices = new Voices()
  private audioCtx: AudioContext | null = null
  private music: MusicBed | null = null
  private sky: THREE.Mesh
  private skyMat: THREE.ShaderMaterial
  private hemi: THREE.HemisphereLight
  private sun: THREE.DirectionalLight
  private fill: THREE.DirectionalLight
  private lamps: THREE.PointLight[] = []
  private time = 0
  private playing = false
  private waiting = false
  private ended = false
  private speed = 1
  private beatIndex = -1
  private sceneIndex = -2
  private currentSet: SetBuild | null = null
  private camFrom = new THREE.Vector3()
  private camTo = new THREE.Vector3()
  private camFromEnd = new THREE.Vector3()
  private camToEnd = new THREE.Vector3()
  private camFov = 35
  private lastTimeEmit = 0
  private sceneStart = 0
  private xrayMats: THREE.MeshStandardMaterial[] = []
  private robotOnTable = false
  private disposed = false
  private renderClock = 0
  private recordLog: { file: string; at: number; offset: number }[] = []
  private delayedStarted = -1
  private xrayInside: THREE.Group | null = null
  private extrasShown = 0

  constructor(container: HTMLElement, data: EpisodeData, plan: EpisodePlan, opts: DirectorOptions) {
    this.data = data
    this.plan = plan
    this.opts = opts
    this.stage = createStage(container, { lights: false, shadows: true, fov: 35 })
    const { scene, renderer } = this.stage
    renderer.toneMappingExposure = 1.1

    // Sky dome
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(clamp(h,0.0,1.0), 0.6)) : mix(horizon, bottom, clamp(-h*3.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }',
    })
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), this.skyMat)
    scene.add(this.sky)

    this.hemi = new THREE.HemisphereLight('#D9EEFF', '#7A6A55', 1.3)
    scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight('#FFF6E8', 2.6)
    this.sun.castShadow = true
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 600
    this.sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048)
    const sc = this.sun.shadow.camera
    sc.left = -9
    sc.right = 9
    sc.top = 9
    sc.bottom = -9
    sc.near = 0.5
    sc.far = 40
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.02
    scene.add(this.sun, this.sun.target)
    this.fill = new THREE.DirectionalLight('#BFD9FF', 0.5)
    this.fill.position.set(-5, 3, 6)
    scene.add(this.fill)
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight('#FFC27A', 0, 7, 1.6)
      this.lamps.push(l)
      scene.add(l)
    }

    // Sets used by this episode (+ the opening).
    const ids = new Set<SetId>([plan.openingSet, ...plan.scenes.map((s) => s.set)])
    for (const id of ids) {
      const s = buildSet(id)
      s.group.visible = false
      scene.add(s.group)
      this.sets.set(id, s)
    }

    // Cast
    const castIds = new Set<CastId>(plan.scenes.flatMap((s) => s.cast))
    for (const id of castIds) {
      const actor = buildActor(id, opts.design)
      actor.root.visible = false
      scene.add(actor.root)
      this.actors.set(id, { actor, state: idleState(), from: new THREE.Vector3(), to: new THREE.Vector3(), yaw: 0, enterAt: -10, enterDur: 0, visible: false })
    }
    const maxExtras = Math.max(0, ...plan.scenes.map((s) => s.extras))
    for (let i = 0; i < maxExtras; i++) {
      const e = buildHuman('extra', extraLook(i * 7 + data.number))
      e.root.visible = false
      scene.add(e.root)
      this.extras.push(e)
    }

    this.fx = new Fx(opts.calm)
    scene.add(this.fx.group)

    this.stage.onFrame((t, dt) => this.liveFrame(t, dt))
    // Record mode: the recorder steps time frame by frame (smooth video at any render speed).
    if (opts.record) this.stage.setActive(false)
    this.enterBeat(0)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  // ── Public controls ───────────────────────────────────────────────────────

  get duration(): number {
    return this.plan.duration
  }

  get currentTime(): number {
    return this.time
  }

  /** Fetch the voice clips. */
  async preload(onProgress?: (done: number, total: number) => void): Promise<void> {
    const files = this.plan.beats.flatMap((b) => (b.clip ? [b.clip.file] : []))
    await this.voices.preload(files, onProgress)
  }

  /** Call from the Play tap: unlocks audio on iOS and starts the music. */
  unlockAudio(): void {
    if (this.opts.record) return
    this.voices.unlock(this.plan.beats.find((b) => b.clip)?.clip?.file)
    if (!this.audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        this.audioCtx = new Ctx()
        this.music = new MusicBed(this.audioCtx)
      }
    }
    void this.audioCtx?.resume().catch(() => undefined)
  }

  play(): void {
    if (this.disposed) return
    if (this.ended) this.seek(0)
    this.playing = true
    this.opts.onPlayState(true)
    this.music?.start()
    this.syncAudio()
  }

  pause(): void {
    this.playing = false
    this.opts.onPlayState(false)
    this.voices.pause()
    this.music?.stop()
  }

  toggle(): void {
    if (this.playing) this.pause()
    else this.play()
  }

  setSpeed(s: number): void {
    this.speed = s
    this.voices.setRate(s)
  }

  setMuted(m: boolean): void {
    this.voices.setMuted(m)
    this.music?.setVolume(m ? 0 : 1)
  }

  seek(t: number): void {
    this.time = THREE.MathUtils.clamp(t, 0, this.plan.duration - 0.01)
    this.ended = false
    this.waiting = false
    this.delayedStarted = -1
    this.voices.stop()
    this.beatIndex = -1
    this.enterBeat(beatAt(this.plan, this.time))
    if (this.playing) this.syncAudio()
  }

  /** Back to the start of the line (or the previous one if we are at its very start). */
  replayLine(): void {
    let i = beatAt(this.plan, this.time)
    while (i > 0 && this.plan.beats[i].kind !== 'line' && this.plan.beats[i].kind !== 'title') i--
    const b = this.plan.beats[i]
    if (this.time - b.start < 0.6) {
      let j = i - 1
      while (j > 0 && this.plan.beats[j].kind !== 'line') j--
      if (j >= 0 && this.plan.beats[j].kind === 'line') i = j
    }
    this.seek(this.plan.beats[i].start)
  }

  /** Jump to the next scene (or the ending). */
  skipScene(): void {
    const cur = this.plan.beats[beatAt(this.plan, this.time)]
    const next = this.plan.beats.find((b) => b.start > this.time && (b.scene !== cur.scene || b.kind === 'next') && b.kind !== 'choice')
    this.seek(next ? next.start : this.plan.duration - 0.05)
  }

  /** The child answered a choice beat. */
  resolveChoice(): void {
    if (!this.waiting) return
    this.waiting = false
    const b = this.plan.beats[this.beatIndex]
    this.time = b.start + b.dur + 0.001
  }

  /** Clip-start log + music, for the MP4 recorder. */
  get recordLogEntries(): { file: string; at: number; offset: number }[] {
    return this.recordLog
  }

  async renderMusic(): Promise<string> {
    const segs: { at: number; mood: Mood }[] = []
    let last: Mood | null = null
    for (const b of this.plan.beats) {
      const m = moodFor(this.plan.scenes[b.scene < 0 ? 0 : b.scene])
      if (m !== last) {
        segs.push({ at: b.start, mood: m })
        last = m
      }
    }
    return renderMusicWav(segs, this.plan.duration)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.voices.dispose()
    this.music?.dispose()
    void this.audioCtx?.close().catch(() => undefined)
    this.fx.dispose()
    for (const s of this.sets.values()) disposeDeep(s.group)
    for (const a of this.actors.values()) disposeDeep(a.actor.root)
    for (const e of this.extras) disposeDeep(e.root)
    if (this.xrayInside) disposeDeep(this.xrayInside)
    this.sky.geometry.dispose()
    this.skyMat.dispose()
    this.stage.dispose()
  }

  private onVisibility = () => {
    if (document.hidden && this.playing && !this.opts.record) this.pause()
  }

  // ── Beats and scenes ─────────────────────────────────────────────────────

  private syncAudio(): void {
    const b = this.plan.beats[this.beatIndex]
    if (!b || !b.clip) return
    const offset = this.time - (b.start + clipLead(b))
    if (offset >= 0 && offset < b.clip.dur) this.startClip(b.clip, offset)
  }

  private startClip(clip: VoicedClip, offset: number): void {
    if (this.opts.record) this.recordLog.push({ file: clip.file, at: this.wallTime, offset })
    else this.voices.play(clip.file, offset)
  }

  private enterBeat(i: number): void {
    if (i === this.beatIndex) return
    this.beatIndex = i
    const b = this.plan.beats[i]
    const sceneIdx = b.scene < 0 ? (b.kind === 'next' ? this.plan.scenes.length - 1 : -1) : b.scene
    if (sceneIdx !== this.sceneIndex) this.enterScene(sceneIdx)
    this.setupShot(b)
    this.fx.setLine(b, this.renderClock)
    // Speaker state
    for (const [id, rt] of this.actors) {
      const speaking = b.speaker === id
      rt.state.speaking = speaking
      rt.state.talk = 0
      if (speaking && b.clip) {
        rt.state.emotion = emotionOf(b.clip.text)
        rt.state.gesture = gestureOf(b.clip.text, id)
        rt.state.gestureT = 0
      } else {
        rt.state.gesture = 'none'
        const se = b.clip && b.speaker ? emotionOf(b.clip.text) : 'neutral'
        rt.state.emotion = se === 'happy' ? 'happy' : se === 'surprised' ? 'surprised' : 'neutral'
      }
    }
    if (b.kind === 'choice' && b.choice) {
      this.waiting = true
      this.voices.stop()
      this.opts.onChoice(b.choice)
    }
    if (this.playing && b.clip && clipLead(b) === 0) this.startClip(b.clip, Math.max(0, this.time - b.start))
    this.opts.onBeat(i)
  }

  private enterScene(idx: number): void {
    const prevScene = this.sceneIndex >= 0 ? this.plan.scenes[this.sceneIndex] : undefined
    this.sceneIndex = idx
    this.sceneStart = this.renderClock
    const scene = idx >= 0 ? this.plan.scenes[idx] : undefined
    const setId: SetId = scene ? scene.set : this.plan.openingSet
    const set = this.sets.get(setId)
    if (!set) return
    for (const s of this.sets.values()) s.group.visible = s === set
    const setChanged = this.currentSet !== set
    this.currentSet = set
    this.music?.setMood(moodFor(scene ?? this.plan.scenes[0]))

    // Lighting for the time of day.
    const time: TimeOfDay = scene ? scene.time : setId === 'hill' ? 'night' : this.plan.scenes[0]?.time ?? 'day'
    this.applyLight(time, scene?.fog ?? false, set)

    // Clock lights found so far, shown on the tower.
    const found = Math.min(12, Math.floor(this.data.number / 2))
    set.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.name.startsWith('clock-light-')) {
        const k = Number(m.name.slice(12))
        const lit = setId === 'hill' ? true : k < found
        const mat = m.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = lit ? 2.2 : 0
        mat.color.set(lit ? '#FFE7A0' : '#57534E')
        for (const c of m.children) c.visible = lit
      }
    })

    // Cast
    const cast = scene?.cast ?? []
    const prevCast = new Set(prevScene && !setChanged ? prevScene.cast : [])
    this.robotOnTable = setId === 'workshop' && !!scene && (scene.closeUp === 'table' || /on the table|robot body/i.test(scene.setting))
    const places = this.layout(cast, scene)
    for (const [id, rt] of this.actors) {
      const p = places.get(id)
      if (!p) {
        rt.visible = false
        rt.actor.root.visible = false
        continue
      }
      const enters = !prevCast.has(id) && !this.opts.calm && idx > 0 && !scene?.closeUp && id !== 'myrobot'
      rt.to.copy(p.pos)
      rt.yaw = p.yaw
      if (enters) {
        const side = p.pos.x >= 0 ? 1 : -1
        rt.from.set(p.pos.x + side * 3.2, p.pos.y, p.pos.z + 0.6)
        rt.enterAt = this.renderClock + Math.random() * 0.4
        rt.enterDur = 1.7
      } else {
        rt.from.copy(p.pos)
        rt.enterAt = -10
        rt.enterDur = 0
      }
      rt.visible = true
      rt.actor.root.visible = true
      rt.actor.root.position.copy(rt.from)
      rt.actor.root.rotation.y = p.yaw
    }
    // Extras in the background
    const n = scene?.extras ?? 0
    this.extras.forEach((e, i) => {
      e.root.visible = i < n
      this.extrasShown = n
      if (i >= n) return
      const x = (i - (n - 1) / 2) * 1.25 + (i % 2 ? 0.3 : -0.3)
      const z = -2.2 - (i % 3) * 0.7
      e.root.position.set(x, 0, z)
      e.root.rotation.y = Math.atan2(-x * 0.4, 2.5 - z) * 0.6
    })

    // X-ray: see inside the child's robot.
    for (const m of this.xrayMats) {
      m.transparent = false
      m.opacity = 1
      m.depthWrite = true
    }
    this.xrayMats = []
    if (this.xrayInside) {
      this.xrayInside.parent?.remove(this.xrayInside)
      disposeDeep(this.xrayInside)
      this.xrayInside = null
    }
    const robot = this.actors.get('myrobot')
    if (scene?.closeUp === 'xray' && robot) {
      this.xrayMats = robotMaterials(robot.actor)
      for (const m of this.xrayMats) {
        m.transparent = true
        m.opacity = 0.28
        m.depthWrite = false
      }
      // What is inside: the battery (energy) and the tiny computer (the brain).
      const inside = new THREE.Group()
      const y = robot.actor.eyeHeight * 0.5
      const battery = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: '#22C55E', emissive: '#22C55E', emissiveIntensity: 1.6 }))
      battery.position.set(-0.06, y - 0.03, 0)
      const brain = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.1), new THREE.MeshStandardMaterial({ color: '#00E5FF', emissive: '#00B8D4', emissiveIntensity: 2 }))
      brain.position.set(0.08, y + 0.04, 0)
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), new THREE.MeshStandardMaterial({ color: '#FC6818', emissive: '#FC6818', emissiveIntensity: 1.2 }))
      wire.rotation.z = Math.PI / 2.6
      wire.position.set(0.01, y + 0.005, 0)
      inside.add(battery, brain, wire)
      robot.actor.root.add(inside)
      this.xrayInside = inside
    }
    if (robot) robot.actor.root.userData.lightOn = scene?.effects.includes('headlight') === true

    const kitPos = setId === 'workshop' ? new THREE.Vector3(0, 0.79, -1.1) : null
    if (scene) this.fx.setScene(scene, set, kitPos)
    else this.fx.setScene({ index: -1, set: setId, time, fog: false, closeUp: null, cast: [], effects: [], afterShare: false, extras: 0, setting: '', action: '' }, set, null)
  }

  private layout(cast: CastId[], scene: ScenePlan | undefined): Map<CastId, Placement> {
    const out = new Map<CastId, Placement>()
    const focus = new THREE.Vector3(0, 0, 1.6)
    let guestSlot = 0
    for (const id of cast) {
      let [x, z] = SLOT[id]
      if (['okafor', 'adaeze', 'mei', 'haruto', 'diego', 'ingrid'].includes(id)) {
        ;[x, z] = GUEST_SLOTS[guestSlot % GUEST_SLOTS.length]
        guestSlot++
      }
      let y = 0
      if (id === 'myrobot' && this.robotOnTable) {
        x = 0
        z = -1.0
        y = 0.79
      }
      if (id === 'bolt' && this.robotOnTable) {
        x = 0.7
        z = 0.3
      }
      const pos = new THREE.Vector3(x, y, z)
      let yaw = Math.atan2(focus.x - x, focus.z - z)
      if (id === 'myrobot') yaw = scene?.closeUp === 'robot-eye' ? Math.PI : 0
      out.set(id, { pos, yaw })
    }
    return out
  }

  private applyLight(time: TimeOfDay, fog: boolean, set: SetBuild): void {
    const p = SKY[time]
    this.skyMat.uniforms.top.value.set(fog ? (time === 'night' ? '#2A3550' : '#C9D3DE') : p.top)
    this.skyMat.uniforms.horizon.value.set(fog ? (time === 'night' ? '#3A4560' : '#E2E8F0') : p.horizon)
    this.skyMat.uniforms.bottom.value.set(fog ? '#CBD5E1' : p.bottom)
    this.hemi.color.set(p.hemiSky)
    this.hemi.groundColor.set(p.hemiGround)
    this.hemi.intensity = set.interior ? Math.max(1.1, p.hemiI) : p.hemiI
    this.sun.color.set(p.sun)
    this.sun.intensity = set.interior ? Math.min(p.sunI, 1.9) : fog ? p.sunI * 0.55 : p.sunI
    const elev = p.elev
    this.sun.position.set(4.5, 2 + elev * 8, 5.5)
    if (set.interior) this.sun.position.set(-3.5, 5.5, 4)
    this.sun.target.position.set(0, 0, -1)
    this.fill.intensity = time === 'night' ? 0.25 : 0.5
    const scene = this.stage.scene
    if (fog) scene.fog = new THREE.Fog(time === 'night' ? '#36405A' : '#D5DCE4', 2.5, 13)
    else if (set.id === 'hill') scene.fog = new THREE.Fog(p.horizon, 30, 90)
    else scene.fog = new THREE.Fog(p.horizon, 18, 70)
    const night = time === 'night' || time === 'evening'
    for (const m of set.glow) m.emissiveIntensity = night ? 1.8 : set.interior ? 1.2 : 0.15
    const stars = set.group.getObjectByName('stars')
    if (stars) stars.visible = time === 'night' && !fog
    this.lamps.forEach((l, i) => {
      const pos = set.lamps[i]
      l.intensity = pos && (night || set.interior) ? (set.interior ? 5 : 7) : 0
      if (pos) l.position.copy(pos)
    })
    this.stage.renderer.toneMappingExposure = time === 'night' ? 1.25 : 1.08
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  private headOf(id: CastId | null): THREE.Vector3 | null {
    if (!id) return null
    const rt = this.actors.get(id)
    if (!rt || !rt.visible) return null
    return rt.to.clone().add(new THREE.Vector3(0, rt.actor.eyeHeight, 0))
  }

  private castCenter(): { center: THREE.Vector3; radius: number; top: number } {
    const pts: THREE.Vector3[] = []
    let top = 1
    for (const rt of this.actors.values()) {
      if (!rt.visible) continue
      pts.push(rt.to)
      top = Math.max(top, rt.to.y + rt.actor.height)
    }
    if (!pts.length) return { center: new THREE.Vector3(0, 0, 0), radius: 1.5, top: 1.5 }
    const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
    const r = Math.max(1.2, ...pts.map((p) => Math.hypot(p.x - c.x, p.z - c.z)))
    return { center: c, radius: r, top }
  }

  private setupShot(b: Beat): void {
    const set = this.currentSet
    if (!set) return
    const aspect = this.stage.camera.aspect || 16 / 9
    const narrow = aspect < 1.2 ? 1.2 / aspect : 1
    const shot = b.shot
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    let push = 0.1
    let fov = 35
    const scene = this.sceneIndex >= 0 ? this.plan.scenes[this.sceneIndex] : undefined
    const subj = shot.subject
    const head = this.headOf(subj)
    let kind = b.kind === 'title' || b.kind === 'previously' || b.kind === 'next' || b.kind === 'card' ? (b.kind === 'previously' ? 'wide' : 'establish') : shot.kind
    const otherHead = this.headOf(shot.other)
    if (kind === 'two' && !(head && otherHead)) kind = 'close'
    switch (kind) {
      case 'establish': {
        from.copy(set.establish.from)
        to.copy(set.establish.to)
        if (narrow > 1) from.lerp(to, -0.25 * (narrow - 1))
        push = 0.14
        fov = 38
        break
      }
      case 'wide': {
        if (!scene || scene.cast.length === 0) {
          // Nobody on set: a second establishing angle, swung round the target.
          const off = set.establish.from.clone().sub(set.establish.to)
          off.applyAxisAngle(new THREE.Vector3(0, 1, 0), shot.side * 0.28)
          off.multiplyScalar(0.8)
          from.copy(set.establish.to).add(off)
          to.copy(set.establish.to)
          push = 0.1
          fov = 36
          break
        }
        const { center, radius, top } = this.castCenter()
        const dist = (2.3 + radius * 1.25) * narrow
        from.set(center.x * 0.7 + (shot.side > 0 ? 0.5 : -0.5), Math.max(1.3, top * 0.85) + 0.35, center.z + dist)
        to.set(center.x * 0.85, Math.max(0.65, top * 0.52), center.z - 0.2)
        push = 0.08
        break
      }
      case 'top': {
        from.set(0, 5.5 * Math.max(1, narrow * 0.8), 2.4)
        to.set(0, 0, 0.5)
        push = 0.05
        fov = 40
        break
      }
      case 'robot-eye': {
        const r = this.actors.get('myrobot')
        const base = r ? r.to.clone() : new THREE.Vector3(0, 0, 0.95)
        const eyeY = base.y + (r ? r.actor.eyeHeight : 0.4)
        from.set(base.x, eyeY + 0.05, base.z - 0.25)
        to.set(base.x, eyeY - 0.1, base.z - 4)
        fov = 50
        push = 0.2
        break
      }
      case 'under': {
        const r = this.actors.get('myrobot')
        const base = r ? r.to.clone() : new THREE.Vector3(0, 0, 0.95)
        from.set(base.x + 0.55, base.y + 0.09, base.z + 0.75)
        to.set(base.x, base.y + 0.14, base.z)
        fov = 42
        push = 0.12
        break
      }
      case 'low': {
        const r = this.actors.get('myrobot')
        const base = r ? r.to.clone() : new THREE.Vector3(0, 0, 0.95)
        const eh = r ? r.actor.eyeHeight : 0.4
        from.set(base.x + 0.35 * shot.side, base.y + eh * 0.55, base.z + 1.25 * narrow)
        to.set(base.x, base.y + eh * 0.95, base.z)
        fov = 40
        push = 0.12
        break
      }
      case 'two': {
        if (head && otherHead) {
          const mid = head.clone().add(otherHead).multiplyScalar(0.5)
          const span = head.distanceTo(otherHead)
          from.set(mid.x, mid.y + 0.25, mid.z + (1.2 + span * 1.1) * narrow)
          to.copy(mid).add(new THREE.Vector3(0, -0.1, 0))
          push = 0.06
        }
        break
      }
      case 'close':
      case 'close-front': {
        if (!head || !subj) {
          const { center, radius, top } = this.castCenter()
          from.set(center.x, top + 0.4, center.z + (2.6 + radius * 1.5) * narrow)
          to.set(center.x, top * 0.5, center.z)
          break
        }
        const rt = this.actors.get(subj)
        const small = subj === 'bolt' || subj === 'myrobot' || subj === 'noor'
        const dist = (small ? 1.25 : subj === 'spark' ? 1.55 : 1.7) * narrow
        if (kind === 'close-front') {
          from.set(head.x * 0.85, head.y + 0.03, head.z + dist)
        } else {
          const yaw = (rt?.yaw ?? 0) + shot.side * 0.42
          from.set(head.x + Math.sin(yaw) * dist, head.y + 0.08, head.z + Math.max(0.45, Math.cos(yaw) * dist))
        }
        to.copy(head).add(new THREE.Vector3(0, -0.06, 0))
        push = 0.12
        fov = 32
        break
      }
      default:
        break
    }
    // Interiors: keep the camera inside the room.
    if (set.interior) {
      from.x = THREE.MathUtils.clamp(from.x, -3.9, 3.9)
      from.y = THREE.MathUtils.clamp(from.y, 0.15, 3.0)
    }
    // The maze: stay between the hedges.
    if (set.id === 'maze') from.x = THREE.MathUtils.clamp(from.x, -3.0, 3.0)
    if (scene?.closeUp === 'table' && kind !== 'establish' && this.robotOnTable && kind === 'wide') {
      from.set(0.6, 1.7, 1.8)
      to.set(0, 0.9, -1)
    }
    this.camFrom.copy(from)
    this.camTo.copy(to)
    const calm = this.opts.calm
    this.camFromEnd.copy(from).lerp(to, calm ? 0 : push)
    this.camToEnd.copy(to)
    if (!calm && (kind === 'establish' || kind === 'wide')) this.camFromEnd.x += shot.side * 0.35
    this.camFov = fov
  }

  /** In close shots, nobody may stand between the camera and the face. */
  private clearSightLine(b: Beat): void {
    const k = b.shot.kind
    if (b.kind !== 'line' || !(k === 'close' || k === 'close-front' || k === 'two' || k === 'low')) return
    const cam = this.stage.camera.position
    const subject = this.headOf(b.shot.subject)
    if (!subject) return
    const seg = subject.clone().sub(cam)
    const len = seg.length()
    seg.normalize()
    const test = (root: THREE.Object3D, h: number) => {
      const p = root.position.clone().add(new THREE.Vector3(0, h * 0.7, 0)).sub(cam)
      const along = p.dot(seg)
      if (along <= 0.05 || along >= len - 0.25) return false
      return p.addScaledVector(seg, -along).length() < 0.32
    }
    for (const [id, rt] of this.actors) {
      if (!rt.visible || id === b.shot.subject || id === b.shot.other) continue
      if (test(rt.actor.root, rt.actor.height)) rt.actor.root.visible = false
    }
    for (const ex of this.extras) if (ex.root.visible && test(ex.root, ex.height)) ex.root.visible = false
  }

  // ── Frame ─────────────────────────────────────────────────────────────────

  /** Live playback: the episode clock follows the wall clock (the voices do), the animation clock the frame clock. */
  private liveFrame(t: number, dt: number): void {
    const now = performance.now()
    const wall = this.lastWall ? Math.min(0.25, (now - this.lastWall) / 1000) : dt
    this.lastWall = now
    this.adaptQuality(wall)
    this.frame(t, dt, wall)
  }

  /** Record mode: advance exactly `dt` seconds, render, and return. */
  renderStep(dt: number): { time: number; wall: number; ended: boolean } {
    this.virtualClock += dt
    this.wallTime += dt
    if (this.waiting) {
      this.choiceWait += dt
      if (this.choiceWait > 3.6) {
        this.choiceWait = 0
        this.resolveChoice()
        this.opts.onChoiceEnd?.()
      }
    }
    this.frame(this.virtualClock, dt, dt)
    this.stage.renderNow()
    return { time: this.time, wall: this.wallTime, ended: this.ended }
  }

  private lastWall = 0
  private virtualClock = 0
  private wallTime = 0
  private choiceWait = 0
  private slowFrames = 0
  private quality = 2

  /** Drop resolution, then shadows, when a device cannot keep up. */
  private adaptQuality(wall: number): void {
    if (this.quality === 0 || !this.playing) return
    this.slowFrames = wall > 0.05 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2)
    if (this.slowFrames > 45) {
      this.slowFrames = 0
      this.quality--
      const r = this.stage.renderer
      if (this.quality === 1) r.setPixelRatio(1)
      else {
        r.shadowMap.enabled = false
        this.sun.castShadow = false
      }
    }
  }

  private frame(t: number, dt: number, wall: number): void {
    if (this.disposed) return
    this.renderClock = t
    const calm = this.opts.calm
    if (this.playing && !this.waiting && !this.ended) {
      this.time += wall * this.speed
      if (this.time >= this.plan.duration) {
        this.time = this.plan.duration
        this.ended = true
        this.playing = false
        this.voices.stop()
        this.music?.stop()
        this.opts.onPlayState(false)
        this.opts.onEnd()
      }
    }
    const bi = beatAt(this.plan, Math.min(this.time, this.plan.duration - 0.001))
    if (bi !== this.beatIndex) this.enterBeat(bi)
    const b = this.plan.beats[this.beatIndex]
    // Start delayed clips (title, next) on time.
    if (this.playing && b.clip && clipLead(b) > 0) {
      const off = this.time - (b.start + clipLead(b))
      if (off >= 0 && off < b.clip.dur && this.delayedStarted !== this.beatIndex) {
        this.delayedStarted = this.beatIndex
        this.startClip(b.clip, off)
      }
    }
    const beatP = b.dur > 0 ? THREE.MathUtils.clamp((this.time - b.start) / b.dur, 0, 1) : 0

    // Music ducks under speech.
    const clipT = b.clip ? this.time - (b.start + clipLead(b)) : -1
    const voiced = b.clip ? clipT >= 0 && clipT <= b.clip.dur : false
    this.music?.duck(voiced ? 0.45 : 1)

    // Camera: a slow push over the beat, a breath of handheld drift.
    const cam = this.stage.camera
    const e = smooth(beatP)
    cam.position.lerpVectors(this.camFrom, this.camFromEnd, e)
    const target = new THREE.Vector3().lerpVectors(this.camTo, this.camToEnd, e)
    if (!calm) {
      cam.position.x += Math.sin(t * 0.5) * 0.015
      cam.position.y += Math.sin(t * 0.37) * 0.01
    }
    cam.lookAt(target)
    if (Math.abs(cam.fov - this.camFov) > 0.01) {
      cam.fov = this.camFov
      cam.updateProjectionMatrix()
    }

    // Actors
    const talk = b.clip && voiced ? envelopeAt(b.clip.env, clipT) : 0
    const speakerHead = this.headOf(b.speaker)
    const robotRt = this.actors.get('myrobot')
    const robotLookTarget = robotRt?.visible ? robotRt.to.clone().add(new THREE.Vector3(0, 0.35, 0)) : null
    for (const [id, rt] of this.actors) {
      if (!rt.visible) continue
      const st = rt.state
      st.gestureT += dt
      const isSpeaker = b.speaker === id
      st.talk = isSpeaker ? talk : 0
      // Entrance walk
      const k = rt.enterDur > 0 ? THREE.MathUtils.clamp((t - rt.enterAt) / rt.enterDur, 0, 1) : 1
      const root = rt.actor.root
      root.position.lerpVectors(rt.from, rt.to, smooth(k))
      st.walking = k > 0 && k < 1 ? 1 : 0
      const walkYaw = k > 0 && k < 1 ? Math.atan2(rt.to.x - rt.from.x, rt.to.z - rt.from.z) : rt.yaw
      root.rotation.y = walkYaw
      if (k <= 0 && rt.enterDur > 0) root.visible = false
      else root.visible = true
      // The child's robot drives on its lines.
      if (id === 'myrobot' && isSpeaker && b.lineEffects.includes('drive') && k >= 1) {
        const p = beatP
        const turnLeft = b.lineEffects.includes('arrow-left')
        const turnRight = b.lineEffects.includes('arrow-right')
        if (turnLeft || turnRight) {
          root.rotation.y = rt.yaw + Math.sin(p * Math.PI) * (turnLeft ? 1.2 : -1.2)
        } else {
          const fwd = Math.sin(p * Math.PI) * 0.45
          root.position.x += Math.sin(rt.yaw) * fwd
          root.position.z += Math.cos(rt.yaw) * fwd
        }
        st.walking = p > 0.05 && p < 0.95 ? 1 : 0
      }
      // Who looks where
      if (b.kind === 'line' && b.speaker) {
        if (isSpeaker) {
          if (b.shot.kind === 'close-front' || b.shot.kind === 'low') st.look = cam.position.clone()
          else {
            // Talk to the listener but play to the camera, so the face reads.
            const listener = this.headOf(b.shot.other) ?? robotLookTarget
            st.look = listener && id !== 'myrobot' ? listener.clone().lerp(cam.position, 0.6) : cam.position.clone()
          }
        } else st.look = speakerHead
      } else {
        st.look = this.fx.clockLight ? this.fx.clockLight.position : robotLookTarget && id !== 'myrobot' ? robotLookTarget : cam.position.clone()
      }
      rt.actor.update(t, dt, st, calm)
    }
    this.extras.forEach((ex, i) => (ex.root.visible = i < this.extrasShown))
    for (const ex of this.extras) if (ex.root.visible) ex.update(t, dt, { ...idleState(), look: speakerHead }, calm)
    this.clearSightLine(b)

    // Set animation + scene hooks
    const set = this.currentSet
    if (set) {
      set.update?.(t, dt, calm)
      const scene = this.sceneIndex >= 0 ? this.plan.scenes[this.sceneIndex] : undefined
      const st = t - this.sceneStart
      if (set.hooks.lift && scene) {
        const raising = /rises|raised|ship toots|sails through/i.test(`${scene.setting} ${scene.action}`)
        set.hooks.lift(raising ? smooth(st / 4) : /\bdown\b/i.test(scene.setting) ? 0 : 0)
      }
      if (set.hooks.ship && scene) set.hooks.ship(scene.effects.includes('ship') ? THREE.MathUtils.clamp(st / 22, 0, 1) : 0)
      if (set.id === 'hill' && scene?.effects.includes('lights-fly')) {
        set.group.traverse((o) => {
          if (o.name.startsWith('clock-light-')) {
            const kk = Number(o.name.slice(12))
            const off = st > 1.2 + kk * 0.22
            const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial
            mat.emissiveIntensity = off ? 0 : 2.2
            mat.color.set(off ? '#57534E' : '#FFE7A0')
            for (const c of o.children) c.visible = !off
          }
        })
      }
    }

    // Effects anchors
    const robotHead = robotRt?.visible
      ? robotRt.actor.root.position.clone().add(new THREE.Vector3(0, robotRt.actor.eyeHeight, 0))
      : this.headOf('spark') ?? new THREE.Vector3(0, 1, 0.5)
    const anchors: FxAnchors = {
      robot: robotRt?.visible ? robotRt.actor.root.position.clone() : null,
      robotHead,
      robotYaw: robotRt?.visible ? robotRt.actor.root.rotation.y : 0,
      speakerHead,
      boltHead: this.headOf('bolt'),
    }
    this.fx.update(t, dt, anchors, beatP)

    // Keep the shadow camera on the action.
    this.sun.target.position.set(cam.position.x * 0.3, 0, Math.min(0, cam.position.z * 0.1) - 1)
    this.sun.position.set(this.sun.target.position.x + 4.5, this.sun.position.y, this.sun.target.position.z + 6)

    if (t - this.lastTimeEmit > 0.066 || !this.playing || this.opts.record) {
      this.lastTimeEmit = t
      this.opts.onTime(this.time, this.beatIndex)
    }
  }
}
