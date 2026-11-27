'use client'

// components/kids/games/robot-brain/SorterSceneClient.tsx
// Owns the depot canvas: sizing, the animation loop (paused when the tab is
// hidden), reduced motion and calm (the kids settings, which include the
// device preference), and handing a test run to the scene.

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useKidsCalm, useKidsReducedMotion } from '@/lib/kids/settings'
import { SorterScene, type RunParcel, type SceneCallbacks } from './scene'
import type { ClassId, Drawing } from './symbols'

export interface SorterSceneHandle {
  run: (parcels: RunParcel[], cb: SceneCallbacks) => void
  stop: () => void
}

interface Props {
  classes: ClassId[]
  idleDrawing: Drawing
  idlePred: ClassId | null
  idleConf: number
  speed: number
  label: string
}

export const SorterSceneClient = forwardRef<SorterSceneHandle, Props>(function SorterSceneClient(
  { classes, idleDrawing, idlePred, idleConf, speed, label },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SorterScene | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reduced = useKidsReducedMotion()
  const calm = useKidsCalm()

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !wrap || !ctx) return
    const scene = new SorterScene(ctx)
    sceneRef.current = scene

    const size = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      scene.resize(r.width, r.height, dpr)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(wrap)

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (!document.hidden) scene.frame(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onVis = () => {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reduced)
    sceneRef.current?.setCalm(calm)
  }, [reduced, calm])

  useEffect(() => {
    sceneRef.current?.setClasses(classes)
  }, [classes])

  useEffect(() => {
    sceneRef.current?.setIdle(idleDrawing, idlePred, idleConf)
  }, [idleDrawing, idlePred, idleConf])

  useEffect(() => {
    sceneRef.current?.setSpeed(speed)
  }, [speed])

  useImperativeHandle(
    ref,
    () => ({
      run: (parcels, cb) => sceneRef.current?.startRun(parcels, cb),
      stop: () => sceneRef.current?.stopRun(),
    }),
    [],
  )

  return (
    <div ref={wrapRef} className="relative h-[250px] w-full overflow-hidden rounded-[20px] border border-white/10 sm:h-[300px]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={label} />
    </div>
  )
})
