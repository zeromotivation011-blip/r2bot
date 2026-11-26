'use client'

// components/kids/activities/templates/estimate/EstimateClient.tsx
// Direct mode: one big slider (log scale for huge ranges) with the number in
// giant digits and, for young children, a tower of icons that grows beside a
// reference object. Factor mode: one slider per Fermi factor and a live
// equation (constant × a ÷ b = estimate). "Lock it in" checks; a correct
// estimate (or finishing) reveals the true value on a number line together
// with the reasoning an engineer would use.

import { useMemo, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { band as passBand, fromFactors, nice, type Answer, type Factor, type Params } from './logic'
import { FeedbackPanel, TemplateCard, btnPrimary, useAttempts } from '../gear-train/TemplateFrameClient'
import { IconBox } from '../spot-in-scene/glyphs'

const slider = 'h-11 w-full cursor-pointer rounded-xl accent-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

/** Map a slider position 0..1000 to a value and back (linear or log). */
function scale(min: number, max: number, log?: boolean) {
  return {
    toValue: (s: number) => (log ? min * Math.pow(max / min, s / 1000) : min + ((max - min) * s) / 1000),
    toSlider: (v: number) => (log ? (1000 * Math.log(v / min)) / Math.log(max / min) : (1000 * (v - min)) / (max - min)),
  }
}

function snapTo(v: number, step: number, min: number, max: number) {
  const s = Math.round(v / step) * step
  return Math.max(min, Math.min(max, Math.round(s * 1e6) / 1e6))
}

export default function EstimateClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const sc = scale(p.min, p.max, p.log)
  const [value, setValue] = useState(() => snapTo(sc.toValue(p.log ? 500 : 0), p.step, p.min, p.max))
  const [factors, setFactors] = useState<number[]>(() => (p.factors ?? []).map((f) => snapTo(scale(f.min, f.max, f.log).toValue(f.log ? 500 : 500), f.step, f.min, f.max)))
  const solved = !!att.result?.correct
  const estimate = p.factors ? fromFactors(p, factors) : value
  const showTruth = solved || att.done

  const edit = (fn: () => void) => {
    if (solved) return
    if (att.result) att.clear()
    fn()
  }

  const submit = () => {
    playSound('click')
    att.submit(p.factors ? { value: estimate, factors } : { value })
  }

  const towerCount = p.picture && !p.factors ? Math.max(0, Math.min(60, Math.round(value))) : 0

  return (
    <TemplateCard label="Estimate">
      <p className="font-display text-xl font-bold leading-snug text-[#EEF2F8]">{p.question}</p>

      <div className="mt-4 flex flex-col items-center rounded-[20px] border border-white/10 bg-[#0A1120] p-4" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">Your estimate</p>
        <p className="font-display text-5xl font-bold tabular-nums text-amber-300 sm:text-6xl">{nice(estimate)}</p>
        <p className="text-[15px] font-semibold text-[#A7B0C0]">{p.unit}</p>
        {p.picture && !p.factors && (
          <div className="mt-3 flex items-end gap-4" aria-hidden>
            <div className="flex w-[64px] flex-col-reverse items-center">
              {Array.from({ length: towerCount }, (_, i) => (
                <span key={i} className="-mt-1.5 motion-safe:animate-[fadeIn_.15s_ease-out]">
                  <IconBox icon={p.picture!.icon} px={Math.max(10, Math.min(22, 260 / Math.max(1, towerCount)))} />
                </span>
              ))}
            </div>
            {p.picture.reference && (
              <div className="flex flex-col items-center text-[#A7B0C0]">
                <span className="text-[72px] leading-none">{[...p.picture.reference][0]}</span>
                <span className="text-xs">{p.picture.reference.replace(/^\S+\s*/, '')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {p.factors ? (
        <div className="mt-4 flex flex-col gap-3">
          {p.factors.map((f, i) => (
            <FactorSlider
              key={f.label}
              f={f}
              value={factors[i]}
              disabled={solved}
              onChange={(v) => edit(() => setFactors((fs) => fs.map((x, j) => (j === i ? v : x))))}
              showTrue={showTruth}
            />
          ))}
          <p className="rounded-2xl border border-white/10 bg-[#111C32] p-3 font-display text-[15px] text-[#EEF2F8]">
            {p.factors.map((f, i) => `${i === 0 ? '' : f.op === 'mul' ? ' × ' : ' ÷ '}${nice(factors[i])}`).join('')}
            {p.constantNote ? <span className="text-[#A7B0C0]"> {p.constantNote}</span> : null} = <b className="text-amber-300">{nice(estimate)}</b> {p.unit}
          </p>
        </div>
      ) : (
        <label className="mt-4 block">
          <span className="sr-only">Estimate in {p.unit}</span>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(sc.toSlider(value))}
            disabled={solved}
            onChange={(e) => edit(() => setValue(snapTo(sc.toValue(Number(e.target.value)), p.step, p.min, p.max)))}
            aria-valuetext={`${nice(value)} ${p.unit}`}
            className={slider}
          />
          <span className="flex justify-between text-[13px] text-[#A7B0C0]">
            <span>{nice(p.min)}</span>
            {p.log && <span>(each step ×{nice(Math.pow(p.max / p.min, 0.25))})</span>}
            <span>{nice(p.max)}</span>
          </span>
          <span className="mt-2 flex flex-wrap gap-2">
            {[-10, -1, 1, 10].map((d) => (
              <button
                key={d}
                type="button"
                disabled={solved}
                onClick={() => edit(() => setValue((v) => snapTo(v + d * p.step, p.step, p.min, p.max)))}
                className="min-h-[44px] min-w-[52px] rounded-2xl border border-white/15 bg-white/[0.06] font-display font-bold text-[#EEF2F8] active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40"
              >
                {d > 0 ? `+${nice(d * p.step)}` : `−${nice(-d * p.step)}`}
              </button>
            ))}
          </span>
        </label>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={submit}>
            Lock it in
          </button>
        </div>
      )}
      <FeedbackPanel att={att} />

      {showTruth && <Reveal p={p} estimate={estimate} />}
    </TemplateCard>
  )
}

function FactorSlider({ f, value, disabled, onChange, showTrue }: { f: Factor; value: number; disabled: boolean; onChange: (v: number) => void; showTrue: boolean }) {
  const sc = scale(f.min, f.max, f.log)
  return (
    <label className="block rounded-2xl border border-white/10 bg-[#111C32] p-3">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold text-[#EEF2F8]">
          {f.op === 'div' ? '÷ ' : '× '}
          {f.label}
        </span>
        <span className="font-display text-lg font-bold text-amber-300">
          {nice(value)} <span className="text-sm text-[#A7B0C0]">{f.unit}</span>
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(sc.toSlider(value))}
        disabled={disabled}
        onChange={(e) => onChange(snapTo(sc.toValue(Number(e.target.value)), f.step, f.min, f.max))}
        aria-valuetext={`${nice(value)} ${f.unit}`}
        className={slider}
      />
      {showTrue && (
        <span className="mt-1 block text-[13px] text-[#00E5FF]">
          Real value ≈ {nice(f.trueValue)} {f.unit}. {f.note}
        </span>
      )}
    </label>
  )
}

/** Number line with the pass band, the child's estimate and the true value. */
function Reveal({ p, estimate }: { p: Params; estimate: number }) {
  const [lo, hi] = passBand(p)
  const vals = [p.min, p.max, estimate, lo, hi]
  const min = Math.max(p.log ? 1e-9 : -Infinity, Math.min(...vals))
  const max = Math.max(...vals)
  const useLog = !!p.log
  const X = useMemo(() => {
    const a = useLog ? Math.log(min) : min
    const b = useLog ? Math.log(max) : max
    return (v: number) => 20 + (360 * ((useLog ? Math.log(Math.max(v, min)) : v) - a)) / (b - a || 1)
  }, [min, max, useLog])
  return (
    <div className="mt-3 rounded-[20px] border border-[#00B8D4]/30 bg-[#00B8D4]/[0.06] p-4 motion-safe:animate-[fadeUp_.35s_ease-out]">
      <p className="font-display text-lg font-bold text-[#00E5FF]">
        The real answer: about {nice(p.answer)} {p.unit}
      </p>
      <svg viewBox="0 0 400 70" className="mt-2 w-full" role="img" aria-label={`Your estimate ${nice(estimate)}, real value ${nice(p.answer)}, good-estimate zone ${nice(lo)} to ${nice(hi)}`}>
        <line x1={20} x2={380} y1={40} y2={40} stroke="#6E7888" strokeWidth={2} />
        <rect x={X(lo)} y={30} width={Math.max(2, X(hi) - X(lo))} height={20} rx={6} fill="#22C55E" opacity={0.25} />
        <g>
          <line x1={X(p.answer)} x2={X(p.answer)} y1={24} y2={56} stroke="#22C55E" strokeWidth={3} />
          <text x={X(p.answer)} y={68} fontSize={11} fill="#22C55E" textAnchor="middle">
            real {nice(p.answer)}
          </text>
        </g>
        <g>
          <path d={`M${X(estimate)} 30 l-7 -12 h14 Z`} fill="#FC6818" />
          <text x={X(estimate)} y={12} fontSize={11} fill="#FFA878" textAnchor="middle">
            you {nice(estimate)}
          </text>
        </g>
      </svg>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[16px] leading-relaxed text-[#EEF2F8]">
        {p.reasoning.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
    </div>
  )
}
