// components/kids/three/stage.ts
// One place that owns a WebGL renderer for the kids 3D views: soft lights,
// shadows, devicePixelRatio capped at 2, resize-aware, paused while the tab is
// hidden, and fully disposed on unmount. Only imported by components that are
// themselves loaded with next/dynamic({ ssr: false }).
//
// No black screens (roadmap #16). Budget phones drop the WebGL context when
// memory runs low (or another tab needs the GPU). Every stage watches for
// `webglcontextlost`: it shows a poster in place of the canvas (the robot in
// navy + orange, a kind line and a 48px "Try again" button), lets three.js
// restore the context, and removes the poster on `webglcontextrestored`. If
// WebGL cannot start at all, createStage() shows the same poster and throws a
// WebGLUnavailableError, so a caller's existing try/catch keeps its own
// fallback and a caller without one still leaves the child a readable screen.
// A view that makes its own WebGLRenderer calls guardWebGLContext() for the same
// behaviour (one line).

import * as THREE from 'three'
import { disposeObject } from '@/lib/kids/robot3d'
import { kidsReducedMotion, kidsRenderHints } from '@/lib/kids/settings'

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
  /**
   * The poster shown when the 3D view is lost or cannot start. `false` = the
   * caller draws its own (e.g. the Hangar's HangarPoster); then use onContextLost.
   */
  poster?: false | PosterCopy
  /** Called with true when the GPU context is lost and false when it comes back. */
  onContextLost?: (lost: boolean) => void
}

export interface PosterCopy {
  title?: string
  line?: string
}

/** Thrown by createStage() when the browser cannot start WebGL at all (the poster is already shown). */
export class WebGLUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('WebGL is not available on this device')
    this.name = 'WebGLUnavailableError'
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause
  }
}

/** Cheap check before loading a heavy 3D chunk: can this browser make a WebGL context at all? */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const POSTER_ATTR = 'data-kids-3d-poster'

/**
 * Put the "3D is resting" poster over `container` (idempotent). Returns a
 * remover. Plain DOM (no React) so it works from any renderer, even one whose
 * React tree is mid-unmount. Text stays readable with Lite 3D, large text and
 * high contrast because it is ordinary text on the kids navy.
 */
export function showPoster(container: HTMLElement, copy: PosterCopy = {}, onRetry?: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined
  const existing = container.querySelector<HTMLElement>(`[${POSTER_ATTR}]`)
  if (existing) return () => existing.remove()
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
  const el = document.createElement('div')
  el.setAttribute(POSTER_ATTR, '')
  el.setAttribute('role', 'status')
  el.className =
    'absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,#05080F_0%,#0E1830_55%,#0A1120_100%)] p-4 text-center'
  el.innerHTML = `
    <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
      <ellipse cx="60" cy="112" rx="40" ry="6" fill="#FC6818" opacity=".25"/>
      <line x1="60" y1="8" x2="60" y2="22" stroke="#A7B0C0" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="8" r="5" fill="#FC6818"/>
      <rect x="34" y="20" width="52" height="30" rx="10" fill="#E2E8F0"/>
      <path d="M43 36q6-5 12 0M65 36q6-5 12 0" stroke="#0A1120" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="26" y="54" width="68" height="42" rx="12" fill="#FC6818"/>
      <rect x="44" y="64" width="32" height="16" rx="4" fill="#F8FAFC" opacity=".9"/>
      <circle cx="32" cy="100" r="12" fill="#1F2937"/><circle cx="88" cy="100" r="12" fill="#1F2937"/>
    </svg>
    <p class="font-display text-lg font-bold text-[#EEF2F8]"></p>
    <p class="max-w-xs text-sm leading-snug text-[#A7B0C0]"></p>
    <button type="button" class="mt-1 min-h-[48px] rounded-2xl bg-amber-500 px-5 font-display text-base font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">Try again</button>`
  const [title, line] = Array.from(el.querySelectorAll('p'))
  title.textContent = copy.title ?? 'The 3D view is taking a nap'
  line.textContent = copy.line ?? 'Your device needed a rest. Your robot and your progress are safe.'
  const btn = el.querySelector('button')
  if (btn) {
    if (onRetry) btn.addEventListener('click', onRetry)
    else btn.remove()
  }
  container.appendChild(el)
  return () => el.remove()
}

export interface ContextGuardOptions {
  poster?: false | PosterCopy
  onContextLost?: (lost: boolean) => void
}

/**
 * Watch a renderer's canvas for a lost GPU context: show the poster (unless
 * `poster: false`), tell the caller, and clean up when the context returns.
 * three.js itself pauses its animation loop and rebuilds GPU state on restore.
 * "Try again" asks the browser for the context back; if it has not returned
 * after 2.5 s the page reloads (progress lives in localStorage, so nothing is lost).
 * Returns a remover.
 */
export function guardWebGLContext(renderer: THREE.WebGLRenderer, container: HTMLElement, opts: ContextGuardOptions = {}): () => void {
  const canvas = renderer.domElement
  let hidePoster: (() => void) | null = null
  let retryTimer = 0
  // Fetched now: getExtension() returns null once the context is lost.
  let ext: WEBGL_lose_context | null = null
  try {
    ext = renderer.getContext().getExtension('WEBGL_lose_context')
  } catch {
    ext = null
  }
  const retry = () => {
    try {
      ext?.restoreContext()
    } catch {
      /* only valid after loseContext(); the browser restores on its own otherwise */
    }
    window.clearTimeout(retryTimer)
    retryTimer = window.setTimeout(() => {
      if (renderer.getContext().isContextLost()) window.location.reload()
    }, 2500)
  }
  const onLost = (e: Event) => {
    // Tell the browser we want the context back (three.js also does this).
    e.preventDefault()
    if (opts.poster !== false && !hidePoster) hidePoster = showPoster(container, opts.poster || {}, retry)
    opts.onContextLost?.(true)
  }
  const onRestored = () => {
    window.clearTimeout(retryTimer)
    hidePoster?.()
    hidePoster = null
    opts.onContextLost?.(false)
  }
  canvas.addEventListener('webglcontextlost', onLost, false)
  canvas.addEventListener('webglcontextrestored', onRestored, false)
  return () => {
    window.clearTimeout(retryTimer)
    canvas.removeEventListener('webglcontextlost', onLost, false)
    canvas.removeEventListener('webglcontextrestored', onRestored, false)
    hidePoster?.()
    hidePoster = null
  }
}

/** Device prefers-reduced-motion OR the kids "Less motion" setting (lib/kids/settings.ts). */
export function prefersReducedMotion(): boolean {
  return kidsReducedMotion()
}

export function createStage(container: HTMLElement, opts: StageOptions = {}): Stage {
  // Lite graphics (kids Settings, for older phones): pixel ratio 1, no antialias, no shadows.
  const hints = kidsRenderHints(2)
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: hints.antialias, alpha: opts.alpha ?? false, preserveDrawingBuffer: false })
  } catch (err) {
    // No WebGL (blocked, too old, or the GPU process crashed): a poster, never a black box.
    if (opts.poster !== false) {
      showPoster(container, {
        title: opts.poster?.title ?? 'This device can’t show 3D right now',
        line: opts.poster?.line ?? 'Everything else still works, and your robot and progress are saved.',
      })
    }
    opts.onContextLost?.(true)
    throw new WebGLUnavailableError(err)
  }
  renderer.setPixelRatio(hints.dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  if (opts.shadows !== false && hints.shadows) {
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
  const unguard = guardWebGLContext(renderer, container, { poster: opts.poster, onContextLost: opts.onContextLost })

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
      unguard()
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
