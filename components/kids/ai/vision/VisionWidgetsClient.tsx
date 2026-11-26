'use client'
// components/kids/ai/vision/VisionWidgetsClient.tsx
// Small presentational pieces of the Vision Lab: thumbnails, "what the robot
// sees" feature pictures, confidence bars, the loss curve and test results.

import { memo, useEffect, useRef } from 'react'
import { GRAY_SIZE, THUMB, hueBinColour, type Features, type Thumb } from '@/lib/kids/ai/vision/features'
import type { Score } from '@/lib/kids/ai/vision/classifiers'

export interface ClassView {
  id: string
  name: string
  color: string
  icon: string
}

/** A 32×32 example drawn at small size. */
export const ThumbCanvas = memo(function ThumbCanvas({ thumb, size = 40, label }: { thumb: Thumb; size?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.putImageData(new ImageData(new Uint8ClampedArray(thumb.data), THUMB, THUMB), 0, 0)
  }, [thumb])
  return (
    <canvas
      ref={ref}
      width={THUMB}
      height={THUMB}
      role="img"
      aria-label={label}
      className="shrink-0 rounded-md border border-white/10 [image-rendering:pixelated]"
      style={{ width: size, height: size }}
    />
  )
})

function drawGray(canvas: HTMLCanvasElement | null, values: Float32Array, side: number, tint?: [number, number, number]) {
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(side, side)
  for (let i = 0; i < side * side; i++) {
    const v = Math.max(0, Math.min(1, values[i]))
    img.data[i * 4] = tint ? v * tint[0] : v * 255
    img.data[i * 4 + 1] = tint ? v * tint[1] : v * 255
    img.data[i * 4 + 2] = tint ? v * tint[2] : v * 255
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

/** "This is what the robot sees": the three feature groups as pictures. */
export function FeatureView({ feats, compact = false }: { feats: Features | null; compact?: boolean }) {
  const grayRef = useRef<HTMLCanvasElement>(null)
  const edgeRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!feats) return
    drawGray(grayRef.current, feats.gray, GRAY_SIZE)
    drawGray(edgeRef.current, feats.edgeMap, THUMB, [0, 229, 255])
  }, [feats])
  const box = compact ? 'h-20 w-20' : 'h-24 w-24 sm:h-28 sm:w-28'
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <figure className="flex flex-col items-center">
        <canvas
          ref={grayRef}
          width={GRAY_SIZE}
          height={GRAY_SIZE}
          className={`${box} rounded-lg border border-white/10 bg-black [image-rendering:pixelated]`}
          aria-label="What stands out from the background, 16 by 16 squares"
          role="img"
        />
        <figcaption className="mt-1 text-center text-xs text-slate-300">Shape: what stands out (16×16)</figcaption>
      </figure>
      <figure className="flex flex-col items-center">
        <canvas
          ref={edgeRef}
          width={THUMB}
          height={THUMB}
          className={`${box} rounded-lg border border-white/10 bg-black [image-rendering:pixelated]`}
          aria-label="Edges the robot found"
          role="img"
        />
        <figcaption className="mt-1 text-center text-xs text-slate-300">Edges (where brightness jumps)</figcaption>
      </figure>
      <figure className="flex flex-col items-center">
        <div className={`${box} flex items-end gap-[2px] rounded-lg border border-white/10 bg-black/40 p-1`} role="img" aria-label="Colour histogram">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.min(100, (feats?.colour[i] ?? 0) * 250)}%`,
                background: hueBinColour(i),
              }}
            />
          ))}
        </div>
        <figcaption className="mt-1 text-center text-xs text-slate-300">How much of each colour</figcaption>
      </figure>
      <figure className="flex flex-col items-center">
        <div className={`${box} relative rounded-full border border-white/10 bg-black/40`} role="img" aria-label="Edge directions">
          {Array.from({ length: 8 }, (_, i) => {
            const v = Math.min(1, (feats?.orient[i] ?? 0) * 3)
            const deg = (i + 0.5) * 22.5
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-1 origin-left rounded-full bg-cyan-300"
                style={{
                  width: `${8 + v * 40}%`,
                  transform: `rotate(${-deg}deg)`,
                  opacity: 0.35 + v * 0.65,
                }}
              />
            )
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const v = Math.min(1, (feats?.orient[i] ?? 0) * 3)
            const deg = (i + 0.5) * 22.5 + 180
            return (
              <div
                key={`o${i}`}
                className="absolute left-1/2 top-1/2 h-1 origin-left rounded-full bg-cyan-300"
                style={{
                  width: `${8 + v * 40}%`,
                  transform: `rotate(${-deg}deg)`,
                  opacity: 0.35 + v * 0.65,
                }}
              />
            )
          })}
        </div>
        <figcaption className="mt-1 text-center text-xs text-slate-300">Which way the edges point</figcaption>
      </figure>
    </div>
  )
}

/** One bar per class with the confidence threshold marked. */
export function ConfidenceBars({
  classes,
  probs,
  threshold,
  showThreshold,
}: {
  classes: ClassView[]
  probs: number[] | null
  threshold: number
  showThreshold: boolean
}) {
  return (
    <ul className="space-y-1.5" aria-label="How sure the robot is">
      {classes.map((c, i) => {
        const p = probs?.[i] ?? 0
        return (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <span className="w-24 truncate text-slate-200 sm:w-28">
              <span aria-hidden="true">{c.icon} </span>
              {c.name}
            </span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="absolute inset-y-0 left-0 rounded-full motion-safe:transition-[width] motion-safe:duration-200"
                style={{
                  width: `${Math.round(p * 100)}%`,
                  background: c.color,
                }}
              />
              {showThreshold && <span className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${threshold * 100}%` }} aria-hidden="true" />}
            </span>
            <span className="w-10 text-right font-display tabular-nums text-slate-100">{Math.round(p * 100)}%</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Training (orange) and test (cyan) loss per epoch. */
export function LossChart({ train, test, epochs }: { train: number[]; test: number[]; epochs: number }) {
  const W = 300
  const H = 120
  const all = [...train, ...test.filter((v) => Number.isFinite(v))]
  const max = Math.max(0.1, ...all)
  const pts = (a: number[]) =>
    a
      .map((v, i) => (Number.isFinite(v) ? `${((i + 1) / Math.max(1, epochs)) * W},${H - (v / max) * (H - 8)}` : ''))
      .filter(Boolean)
      .join(' ')
  const last = train[train.length - 1]
  const lastTest = test[test.length - 1]
  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full rounded-xl border border-white/10 bg-black/30"
        role="img"
        aria-label={`Loss curve. Training loss now ${last?.toFixed(2) ?? 'not started'}`}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,.07)" />
        ))}
        <polyline points={pts(train)} fill="none" stroke="#FF8A4C" strokeWidth={2.5} strokeLinejoin="round" />
        <polyline points={pts(test)} fill="none" stroke="#00E5FF" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-300">
        <span>
          <span className="text-amber-300">━</span> training loss {Number.isFinite(last) ? last.toFixed(3) : '–'}
        </span>
        <span>
          <span className="text-cyan-300">┅</span> test loss {Number.isFinite(lastTest) ? lastTest.toFixed(3) : '–'}
        </span>
        <span>
          epoch {train.length}/{epochs}
        </span>
      </figcaption>
    </figure>
  )
}

export function ScoreView({ classes, score, dark, showMatrix }: { classes: ClassView[]; score: Score; dark: Score | null; showMatrix: boolean }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p>
          <span className="block text-xs uppercase tracking-wider text-slate-400">Score</span>
          <span className="font-display text-4xl font-bold text-white">{pct(score.accuracy)}</span>
          <span className="ml-2 text-sm text-slate-300">of {score.tested} test pictures right</span>
        </p>
        {dark && (
          <p>
            <span className="block text-xs uppercase tracking-wider text-slate-400">In the dark</span>
            <span className={`font-display text-3xl font-bold ${dark.accuracy >= 0.8 ? 'text-green-400' : 'text-amber-300'}`}>{pct(dark.accuracy)}</span>
          </p>
        )}
      </div>
      <ul className="space-y-1">
        {classes.map((c, i) => {
          const r = score.recall[i]
          return (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate text-slate-200 sm:w-28">{c.name}</span>
              <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Number.isNaN(r) ? 0 : r * 100}%`,
                    background: c.color,
                  }}
                />
              </span>
              <span className="w-12 text-right tabular-nums text-slate-100">{Number.isNaN(r) ? '–' : pct(r)}</span>
            </li>
          )
        })}
      </ul>
      {showMatrix && (
        <div className="overflow-x-auto">
          <table className="text-xs text-slate-200">
            <caption className="mb-1 text-left text-slate-400">Confusion matrix — rows: what it really was · columns: what the robot said</caption>
            <thead>
              <tr>
                <th className="p-1" />
                {classes.map((c) => (
                  <th key={c.id} scope="col" className="max-w-[4.5rem] truncate p-1 font-semibold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {score.confusion.map((row, i) => (
                <tr key={classes[i]?.id ?? i}>
                  <th scope="row" className="max-w-[5rem] truncate p-1 text-left font-semibold">
                    {classes[i]?.name}
                  </th>
                  {row.map((v, j) => (
                    <td key={j} className={`min-w-[2.5rem] p-1 text-center tabular-nums ${i === j ? 'bg-green-500/25' : v ? 'bg-amber-500/25' : 'bg-white/5'}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
