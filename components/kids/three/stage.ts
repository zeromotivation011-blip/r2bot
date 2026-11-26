// components/kids/three/stage.ts
// One place that owns a WebGL renderer for the kids 3D views: soft lights,
// shadows, devicePixelRatio capped at 2, resize-aware, paused while the tab is
// hidden, and fully disposed on unmount. Only imported by components that are
// themselves loaded with next/dynamic({ ssr: false }).

import * as THREE from 'three'
import { disposeObject } from '@/lib/kids/robot3d'

export interface Stage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  /** Called every frame with elapsed seconds and the delta. */
  onFrame: (fn: (t: number, dt: number, frame?: XRFrame) => void) => void
  /** Render now (for screenshots). */
  renderNow: () => void
  /**
   * Opt-in: pause the animation loop while the view has nothing to animate or is
   * scrolled off-screen (saves battery on phones). Defaults to active; the loop
   * still also pauses while the tab is hidden. Ignored while an XR session runs.
   */
  setActive: (active: boolean) => void
  dispose: () => void
}

export interface StageOptions {
  alpha?: boolean
  background?: string | null
  shadows?: boolean
  fov?: number
  xr?: boolean
  /** Add the default soft key/fill lights. */
  lights?: boolean
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createStage(container: HTMLElement, opts: StageOptions = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: opts.alpha ?? false, preserveDrawingBuffer: false })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  if (opts.shadows !== false) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
  }
  renderer.xr.enabled = opts.xr === true
  const canvas = renderer.domElement
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.touchAction = 'none'
  container.appendChild(canvas)

  const scene = new THREE.Scene()
  if (opts.background) scene.background = new THREE.Color(opts.background)

  const camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, 0.05, 100)

  if (opts.lights !== false) {
    scene.add(new THREE.HemisphereLight('#E0E7FF', '#1E2A44', 1.4))
    const key = new THREE.DirectionalLight('#FFF7ED', 2.2)
    key.position.set(3, 6, 4)
    key.castShadow = opts.shadows !== false
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -6
    key.shadow.camera.right = 6
    key.shadow.camera.top = 6
    key.shadow.camera.bottom = -6
    key.shadow.radius = 4
    key.shadow.bias = -0.0005
    scene.add(key)
    const rim = new THREE.DirectionalLight('#00B8D4', 0.8)
    rim.position.set(-4, 3, -4)
    scene.add(rim)
  }

  const resize = () => {
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    if (renderer.xr.isPresenting) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(container)

  let frameFn: ((t: number, dt: number, frame?: XRFrame) => void) | null = null
  const timer = new THREE.Timer()
  const loop = (time: number, frame?: XRFrame) => {
    timer.update(time)
    const dt = Math.min(0.05, timer.getDelta())
    frameFn?.(timer.getElapsed(), dt, frame)
    renderer.render(scene, camera)
  }
  let running = false
  let disposed = false
  const start = () => {
    if (running) return
    running = true
    timer.reset()
    renderer.setAnimationLoop(loop)
  }
  const stop = () => {
    if (!running || renderer.xr.isPresenting) return
    running = false
    renderer.setAnimationLoop(null)
  }
  let active = true
  const onVis = () => (document.hidden || !active ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  if (!document.hidden) start()

  return {
    scene,
    camera,
    renderer,
    onFrame: (fn) => {
      frameFn = fn
    },
    renderNow: () => renderer.render(scene, camera),
    setActive: (a) => {
      if (disposed || a === active) return
      active = a
      onVis()
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      document.removeEventListener('visibilitychange', onVis)
      ro.disconnect()
      renderer.setAnimationLoop(null)
      const session = renderer.xr.getSession()
      if (session) void session.end().catch(() => undefined)
      disposeObject(scene)
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
