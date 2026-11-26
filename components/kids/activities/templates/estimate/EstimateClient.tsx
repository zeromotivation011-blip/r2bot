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
import { band as passBand, fromFactors, nice, sliderScale, snapTo, SLIDER_STEPS, type Answer, type Factor, type Params } from './logic'
import { FeedbackPanel, TemplateCard, btnPrimary, useAttempts } from '../gear-train/TemplateFrameClient'
import { Glyph } from '../spot-in-scene/glyphs'

const slider = 'h-11 w-full cursor-pointer rounded-xl accent-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const scale = sliderScale

export default function EstimateClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const sc = scale(p.min, p.max, p.log)
  const [value, setValue] = useState(() => snapTo(sc.toValue(p.log ? SLIDER_STEPS / 2 : 0), p.step, p.min, p.max))
  const [factors, setFactors] = useState<number[]>(() => (p.factors ?? []).map((f) => snapTo(scale(f.min, f.max, f.log).toValue(SLIDER_STEPS / 2), f.step, f.min, f.max)))
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
    att.submit(p.factors ? { value: estimate, factors, attempt: att.attempts } : { value, attempt: att.attempts })
  }

  return (
    <TemplateCard label="Estimate">
      <p className="font-display text-xl font-bold leading-snug text-[#EEF2F8]">{p.question}</p>

      <div className="mt-4 flex flex-col items-center rounded-[20px] border border-white/10 bg-[#0A1120] p-4" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">Your estimate</p>
        <p className="font-display text-5xl font-bold tabular-nums text-amber-300 sm:text-6xl">{nice(estimate)}</p>
        <p className="text-[15px] font-semibold text-[#A7B0C0]">{p.unit}</p>
        {p.picture && !p.factors && <Tower p={p} count={Math.max(0, Math.min(60, Math.round(value)))} />}
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
            max={SLIDER_STEPS}
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

/**
 * The guess as a stack of icons beside the reference, both drawn with ONE
 * unit: the reference is exactly `answer` icons tall. The scene has a fixed
 * height, so icons shrink as the stack grows and the card never gets taller.
 */
function Tower({ p, count }: { p: Params; count: number }) {
  const pic = p.picture!
  const H = 200 // drawing height in px (viewBox units = px at full width)
  const top = 16
  const ground = top + H
  const unit = H / Math.max(count, p.answer * 1.15, 1)
  const iconW = Math.max(14, Math.min(48, unit * 3.2))
  const refTok = pic.reference ? pic.reference.trim().split(/\s+/)[0] : ''
  const refName = pic.reference ? pic.reference.trim().replace(/^\S+\s*/, '') : ''
  const refH = p.answer * unit
  const towerX = 70
  const refX = 170
  const reached = count >= p.answer
  return (
    <figure className="mt-3 w-full max-w-[320px]">
      <svg viewBox={`0 0 260 ${ground + 22}`} className="h-auto w-full" aria-hidden>
        <line x1={10} x2={250} y1={ground} y2={ground} stroke="#6E7888" strokeWidth={2} />
        {Array.from({ length: count }, (_, i) => (
          <g key={i}>
            <Glyph icon={pic.icon} x={towerX} y={ground - unit * (i + 0.5)} size={Math.max(unit * 1.25, Math.min(iconW, unit * 2.4))} />
          </g>
        ))}
        {refTok && (refTok === '🚪' || refTok === 'svg:door' ? (
          <g>
            <rect x={refX - refH * 0.22} y={ground - refH} width={refH * 0.44} height={refH} rx={3} fill="#7C4A2A" stroke="#C08457" strokeWidth={2} />
            <rect x={refX - refH * 0.16} y={ground - refH * 0.93} width={refH * 0.32} height={refH * 0.38} rx={2} fill="none" stroke="#C08457" strokeWidth={1.5} />
            <rect x={refX - refH * 0.16} y={ground - refH * 0.48} width={refH * 0.32} height={refH * 0.42} rx={2} fill="none" stroke="#C08457" strokeWidth={1.5} />
            <circle cx={refX + refH * 0.14} cy={ground - refH * 0.5} r={Math.max(2, refH * 0.025)} fill="#FFD166" />
          </g>
        ) : (
          <Glyph icon={refTok} x={refX} y={ground - refH / 2} size={refH} />
        ))}
        {refTok && <line x1={towerX - iconW / 2 - 4} x2={refX + refH * 0.24 + 4} y1={ground - refH} y2={ground - refH} stroke="#A7B0C0" strokeWidth={1} strokeDasharray="4 4" />}
        <text x={towerX} y={ground + 17} fontSize={13} fill="#FFA878" textAnchor="middle">
          your {count}
        </text>
        {refName && (
          <text x={refX} y={ground + 17} fontSize={13} fill="#A7B0C0" textAnchor="middle">
            {refName}
          </text>
        )}
      </svg>
      <figcaption className="sr-only">
        {`Your tower of ${count} is ${reached ? 'as tall as or taller than' : 'shorter than'} the ${refName || 'reference'}.`}
      </figcaption>
    </figure>
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
        max={SLIDER_STEPS}
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
