'use client'

// components/kids/three/ARViewClient.tsx
// "See it in your room".
//  (a) Phones/headsets with WebXR immersive-ar: a real AR session. The robot is
//      placed about 1 m in front of you; if the device offers hit-testing, a
//      ring follows the floor and a tap moves the robot onto it.
//  (b) Every other phone (including iPhone Safari): a "magic window" — the
//      back camera as a full-screen video behind a transparent 3D canvas.
//      Drag to move, pinch or slider to resize, and take a photo.
// The camera is only requested when the child presses the button, after we
// explain why. The video never leaves the device.

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { animateRobot, buildRobot } from '@/lib/kids/robot3d'
import type { RobotDesign } from '@/lib/kids/robot-design'
import { playSound } from '@/lib/kids-audio'
import { createStage, prefersReducedMotion, type Stage } from './stage'

type Phase = 'intro' | 'xr' | 'camera' | 'denied' | 'nocamera' | 'error'

interface Props {
  design: RobotDesign
  onClose: () => void
}

export default function ARViewClient({ design, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [arSupported, setArSupported] = useState(false)
  const [scale, setScale] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [hitTest, setHitTest] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const robotRef = useRef<THREE.Group | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scaleRef = useRef(1)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtnRef.current?.focus()
    const xr = navigator.xr
    if (!xr) return
    xr.isSessionSupported('immersive-ar')
      .then(setArSupported)
      .catch(() => setArSupported(false))
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const teardown = useCallback(() => {
    stageRef.current?.dispose()
    stageRef.current = null
    robotRef.current = null
    stopCamera()
  }, [stopCamera])

  useEffect(() => teardown, [teardown])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        teardown()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, teardown])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  // ── (a) WebXR AR ──────────────────────────────────────────────────────────
  const startXR = async () => {
    const host = hostRef.current
    const xr = navigator.xr
    if (!host || !xr) return
    teardown()
    const stage = createStage(host, { alpha: true, xr: true, shadows: false })
    stageRef.current = stage
    const robot = buildRobot(design)
    robot.scale.setScalar(0.35)
    robot.visible = false
    stage.scene.add(robot)
    robotRef.current = robot
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#F59E0B' }),
    )
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    stage.scene.add(reticle)

    let session: XRSession
    try {
      const init: XRSessionInit = { optionalFeatures: ['hit-test', 'dom-overlay', 'local-floor'] }
      if (overlayRef.current) init.domOverlay = { root: overlayRef.current }
      session = await xr.requestSession('immersive-ar', init)
    } catch {
      teardown()
      setPhase('error')
      return
    }
    stage.renderer.xr.setReferenceSpaceType('local')
    await stage.renderer.xr.setSession(session)
    setPhase('xr')

    let hitSource: XRHitTestSource | undefined
    try {
      const viewer = await session.requestReferenceSpace('viewer')
      hitSource = await session.requestHitTestSource?.({ space: viewer })
      setHitTest(Boolean(hitSource))
    } catch {
      hitSource = undefined
    }
    session.addEventListener('select', () => {
      if (reticle.visible) {
        robot.position.setFromMatrixPosition(reticle.matrix)
        playSound('click')
      }
    })
    session.addEventListener('end', () => {
      hitSource?.cancel()
      teardown()
      setPhase('intro')
    })

    let placed = false
    const reduced = prefersReducedMotion()
    stage.onFrame((t, _dt, frame) => {
      if (!placed) {
        // Fixed placement: 1 m in front of where the viewer is looking, a little below eye level.
        const cam = stage.renderer.xr.getCamera()
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)
        fwd.y = 0
        fwd.normalize()
        robot.position.copy(cam.position).add(fwd.multiplyScalar(1)).add(new THREE.Vector3(0, -0.6, 0))
        robot.lookAt(cam.position.x, robot.position.y, cam.position.z)
        robot.visible = true
        placed = true
      }
      if (frame && hitSource) {
        const ref = stage.renderer.xr.getReferenceSpace()
        const hits = frame.getHitTestResults(hitSource)
        const pose = ref && hits.length > 0 ? hits[0].getPose(ref) : undefined
        reticle.visible = Boolean(pose)
        if (pose) reticle.matrix.fromArray(pose.transform.matrix)
      }
      animateRobot(robot, t, { moving: false, reducedMotion: reduced })
    })
  }

  // ── (b) Magic window ──────────────────────────────────────────────────────
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('nocamera')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      setPhase(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
      return
    }
    streamRef.current = stream
    setPhase('camera')
  }

  // Once the camera phase is showing, attach the stream and build the 3D layer.
  useEffect(() => {
    if (phase !== 'camera') return
    const video = videoRef.current
    const host = hostRef.current
    const stream = streamRef.current
    if (!video || !host || !stream) return
    video.srcObject = stream
    void video.play().catch(() => undefined)

    const stage = createStage(host, { alpha: true, fov: 50 })
    stageRef.current = stage
    stage.camera.position.set(0, 1.3, 2.6)
    stage.camera.lookAt(0, 0.3, 0)
    const robot = buildRobot(design)
    stage.scene.add(robot)
    robotRef.current = robot
    // Invisible floor that still catches a soft shadow on top of the video.
    const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.35 }))
    shadowFloor.rotation.x = -Math.PI / 2
    shadowFloor.receiveShadow = true
    stage.scene.add(shadowFloor)

    const reduced = prefersReducedMotion()
    stage.onFrame((t) => {
      robot.scale.setScalar(scaleRef.current)
      animateRobot(robot, t, { moving: false, reducedMotion: reduced })
    })

    // Drag to move, pinch to scale.
    const el = stage.renderer.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchStart = 0
    let pinchScale = 1
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const ray = new THREE.Raycaster()
    const hit = new THREE.Vector3()
    const moveTo = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, stage.camera)
      if (ray.ray.intersectPlane(plane, hit)) {
        robot.position.set(THREE.MathUtils.clamp(hit.x, -3, 3), 0, THREE.MathUtils.clamp(hit.z, -6, 1.6))
      }
    }
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y)
        pinchScale = scaleRef.current
      }
    }
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) moveTo(e.clientX, e.clientY)
      else if (pointers.size === 2 && pinchStart > 0) {
        const [a, b] = [...pointers.values()]
        const next = THREE.MathUtils.clamp((pinchScale * Math.hypot(a.x - b.x, a.y - b.y)) / pinchStart, 0.3, 3)
        scaleRef.current = next
        setScale(next)
      }
    }
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinchStart = 0
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      stage.dispose()
      if (stageRef.current === stage) stageRef.current = null
    }
  }, [phase, design])

  const turn = (deg: number) => {
    const r = robotRef.current
    if (r) r.rotation.y += THREE.MathUtils.degToRad(deg)
  }

  const takePhoto = () => {
    const video = videoRef.current
    const stage = stageRef.current
    const host = hostRef.current
    if (!video || !stage || !host) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(host.clientWidth * dpr)
    const h = Math.round(host.clientHeight * dpr)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) return
    // Same "object-cover" crop as the on-screen video.
    const vw = video.videoWidth || w
    const vh = video.videoHeight || h
    const s = Math.max(w / vw, h / vh)
    g.drawImage(video, (w - vw * s) / 2, (h - vh * s) / 2, vw * s, vh * s)
    stage.renderNow()
    g.drawImage(stage.renderer.domElement, 0, 0, w, h)
    g.fillStyle = 'rgba(15,10,30,0.55)'
    g.fillRect(0, h - 44 * dpr, w, 44 * dpr)
    g.fillStyle = '#FDE68A'
    g.font = `bold ${16 * dpr}px system-ui, sans-serif`
    g.fillText(`${design.name} · built in the R2BOT Robot Workshop`, 14 * dpr, h - 16 * dpr)
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = `${design.name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() || 'robot'}-in-my-room.png`
    a.click()
    playSound('star')
    showToast('📸 Photo saved to your device!')
  }

  const close = () => {
    const session = stageRef.current?.renderer.xr.getSession()
    if (session) void session.end().catch(() => undefined)
    teardown()
    onClose()
  }

  const onScale = (v: number) => {
    scaleRef.current = v
    setScale(v)
  }

  const liveView = phase === 'camera' || phase === 'xr'

  return (
    <div role="dialog" aria-modal="true" aria-label="See your robot in your room" className="fixed inset-0 z-[70] bg-[#0F0A1E] text-white">
      {/* Camera feed + transparent 3D layer */}
      <video ref={videoRef} playsInline muted autoPlay className={`absolute inset-0 h-full w-full object-cover ${phase === 'camera' ? '' : 'hidden'}`} />
      <div ref={hostRef} className={`absolute inset-0 ${liveView ? '' : 'pointer-events-none'}`} />

      <div ref={overlayRef} className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="pointer-events-auto flex items-center justify-between gap-2 p-3">
          <p className="rounded-full bg-black/50 px-4 py-2 text-sm font-bold">📱 {design.name} in your room</p>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/90 px-4 font-bold text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            ✕ Close
          </button>
        </div>

        {phase === 'intro' && (
          <div className="pointer-events-auto m-auto w-[min(92vw,30rem)] rounded-3xl border border-white/10 bg-[#1B1035] p-6 shadow-2xl">
            <h2 className="text-2xl font-black">See your robot in your room</h2>
            {arSupported && (
              <div className="mt-4">
                <p className="text-base text-purple-100">Your device can do real AR. Your robot will appear about one big step in front of you{'—'}tap the floor to move it.</p>
                <button
                  type="button"
                  onClick={() => void startXR()}
                  className="mt-3 min-h-[48px] w-full rounded-2xl bg-amber-500 px-5 font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
                >
                  🕶️ Start AR
                </button>
              </div>
            )}
            <div className="mt-5 rounded-2xl bg-white/5 p-4">
              <p className="font-bold">{arSupported ? 'Or use the magic window' : 'Use the magic window'}</p>
              <p className="mt-1 text-sm text-purple-100">
                To put your robot in the picture, R2BOT needs to use your camera. The video stays on this device{'—'}nothing is recorded or sent anywhere.
                Ask a grown-up before you say yes!
              </p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="mt-3 min-h-[48px] w-full rounded-2xl bg-emerald-400 px-5 font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
              >
                📷 Turn on camera
              </button>
            </div>
          </div>
        )}

        {(phase === 'denied' || phase === 'nocamera' || phase === 'error') && (
          <div className="pointer-events-auto m-auto w-[min(92vw,30rem)] rounded-3xl border border-white/10 bg-[#1B1035] p-6 text-center">
            <p className="text-5xl" aria-hidden>
              {phase === 'denied' ? '🙈' : '🤖'}
            </p>
            <h2 className="mt-2 text-xl font-black">
              {phase === 'denied' ? 'No problem — the camera stays off.' : phase === 'nocamera' ? "We couldn't find a camera." : 'That did not work this time.'}
            </h2>
            <p className="mt-2 text-sm text-purple-100">
              {phase === 'denied'
                ? 'If you change your mind, a grown-up can allow the camera for this site in the browser settings, then try again.'
                : 'You can still spin, zoom and test-drive your robot in the Workshop.'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={() => setPhase('intro')} className="min-h-[44px] rounded-2xl bg-white/10 px-5 font-bold">
                Try again
              </button>
              <button type="button" onClick={close} className="min-h-[44px] rounded-2xl bg-amber-500 px-5 font-bold text-black">
                Back to the Workshop
              </button>
            </div>
          </div>
        )}

        {phase === 'xr' && (
          <p className="pointer-events-none mx-auto mt-auto mb-8 rounded-full bg-black/60 px-4 py-2 text-sm font-bold">
            {hitTest ? 'Point at the floor and tap to move your robot' : 'Walk around your robot!'}
          </p>
        )}

        {phase === 'camera' && (
          <div className="pointer-events-auto mt-auto space-y-3 bg-gradient-to-t from-black/70 to-transparent p-4 pb-6">
            <p className="text-center text-sm font-bold">Drag your robot to move it · pinch to make it bigger or smaller</p>
            <label className="mx-auto flex max-w-md items-center gap-3 text-sm font-bold">
              <span aria-hidden>🔍</span>
              <span className="sr-only">Robot size</span>
              <input
                type="range"
                min={0.3}
                max={3}
                step={0.05}
                value={scale}
                onChange={(e) => onScale(Number(e.target.value))}
                className="h-11 w-full accent-amber-500"
                aria-label="Robot size"
              />
            </label>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => turn(-30)} aria-label="Turn robot left" className="min-h-[52px] min-w-[52px] rounded-full bg-white/90 text-2xl text-black">
                ↺
              </button>
              <button type="button" onClick={takePhoto} className="min-h-[52px] rounded-full bg-amber-500 px-6 text-lg font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white">
                📸 Take photo
              </button>
              <button type="button" onClick={() => turn(30)} aria-label="Turn robot right" className="min-h-[52px] min-w-[52px] rounded-full bg-white/90 text-2xl text-black">
                ↻
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <p role="status" className="fixed left-1/2 top-20 -translate-x-1/2 rounded-full bg-emerald-400 px-5 py-2 font-bold text-black">
          {toast}
        </p>
      )}
    </div>
  )
}
