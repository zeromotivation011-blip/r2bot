'use client'

// components/kids/games/smart-farm/AceClient.tsx
// Ace: program the picking robot's vision rule. Its camera turns each tomato
// into a redness score R ÷ (R + G). A threshold picks; an "unsure" band sends
// borderline fruit to a person; white balance (a grey card) removes the colour
// of the light. Three rows are picked under midday sun, sunset and shade.

import { useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { LIGHTS, RIPE_AT, aceRows, aceSamples, cameraRGB, rednessIndex, runAce, type AceDecision, type AceRule, type Fruit, type Light, type PickOutcome } from './model'
import { BTN_GHOST, BTN_PRIMARY, CARD, showField, Choice, Debrief, Slider, StepBadge, usePlayback } from './FarmPartsClient'

const SEED = 7
const X0 = 0.2
const X1 = 0.95

function fruitFill(f: Fruit, light: Light, wb: boolean): string {
  let [r, g, b] = cameraRGB(f, light)
  if (wb) {
    r /= light.gain[0] * light.bright
    g /= light.gain[1] * light.bright
    b /= light.gain[2] * light.bright
  }
  const k = 255 / 0.85
  return `rgb(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k * 1.4))})`
}

const OUTCOME: Record<PickOutcome, { icon: string; text: string; cls: string }> = {
  'picked-ripe': { icon: '🧺', text: 'picked, ripe', cls: 'bg-emerald-500 text-[#0A1120]' },
  'left-unripe': { icon: '✓', text: 'left to ripen', cls: 'bg-white/20 text-white' },
  'picked-unripe': { icon: '✗', text: 'picked green!', cls: 'bg-rose-500 text-white' },
  'missed-ripe': { icon: '!', text: 'missed a ripe one', cls: 'bg-amber-400 text-[#1A1103]' },
  unsure: { icon: '?', text: 'unsure: sent to a person', cls: 'bg-cyan-400 text-[#0A1120]' },
}

/** Dots on a number line: each fruit's score, coloured by the truth. */
function StripPlot({ rows, rule, label }: { rows: { name: string; icon: string; items: { index: number; ripe: boolean }[] }[]; rule: AceRule; label: string }) {
  const W = 320
  const rowH = 26
  const H = rows.length * rowH + 22
  const x = (v: number) => 56 + ((v - X0) / (X1 - X0)) * (W - 64)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <rect x={x(rule.threshold - rule.margin)} y={0} width={Math.max(0, x(rule.threshold + rule.margin) - x(rule.threshold - rule.margin))} height={rows.length * rowH} fill="rgba(0,229,255,0.15)" />
      <line x1={x(rule.threshold)} x2={x(rule.threshold)} y1={0} y2={rows.length * rowH} stroke="#FFA878" strokeWidth={2} />
      {rows.map((r, i) => (
        <g key={r.name} transform={`translate(0 ${i * rowH})`}>
          <text x={2} y={rowH / 2 + 4} fontSize={11} fill="#A7B0C0">
            {r.icon} {r.name}
          </text>
          <line x1={56} x2={W - 8} y1={rowH / 2} y2={rowH / 2} stroke="rgba(255,255,255,.12)" />
          {r.items.map((it, j) => (
            <circle key={j} cx={x(Math.max(X0, Math.min(X1, it.index)))} cy={rowH / 2 + ((j % 3) - 1) * 4} r={4.5} fill={it.ripe ? '#ef4444' : '#22c55e'} stroke="#0A1120" strokeWidth={1} />
          ))}
        </g>
      ))}
      {[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) => (
        <text key={t} x={x(t)} y={H - 6} fontSize={10} fill="#6E7888" textAnchor="middle">
          {t.toFixed(1)}
        </text>
      ))}
    </svg>
  )
}

export default function AceClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => aceRows(SEED), [])
  const samples = useMemo(() => aceSamples(SEED), [])
  const [rule, setRule] = useState<AceRule>({ threshold: 0.5, whiteBalance: false, margin: 0 })
  const [ran, setRan] = useState(false)
  const [runs, setRuns] = useState(0)
  const result = useMemo(() => runAce(rows, rule), [rows, rule])
  const order: AceDecision[] = result.decisions
  const play = usePlayback(order.length + 1, 110, () => {
    setRan(true)
    playSound(result.stars > 0 ? 'correct' : 'wrong')
  })
  const shownUpTo = ran ? order.length : play.frame

  const change = (patch: Partial<AceRule>) => {
    setRule((r) => ({ ...r, ...patch }))
    setRan(false)
    play.reset()
  }

  const noon = LIGHTS[0]
  const sampleRows = [{ name: 'Checked', icon: '👩‍🌾', items: samples.map((f) => ({ index: rednessIndex(f, noon, rule.whiteBalance), ripe: f.ripeness >= RIPE_AT })) }]

  const finish = () =>
    onFinish({
      stars: result.stars,
      score: result.points,
      scoreLabel: 'harvest points',
      attempts: Math.max(1, runs),
      message: `${result.correct} of ${order.length} tomatoes judged right, ${result.unripePicked} green ones picked, ${result.ripeMissed} ripe ones missed, ${result.unsure} sent to a person. ${
        rule.whiteBalance ? 'White balance removed the colour of the light.' : 'Without white balance, the colour of the light changed every score.'
      }`,
      badges: result.stars === 3 ? ['colour-coder'] : undefined,
    })

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-3">
        <div ref={fieldRef} className="rounded-[28px] border border-white/10 bg-[#111C32] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p className="px-1 font-display font-bold text-[#EEF2F8]">What the robot&apos;s camera sees{rule.whiteBalance ? ' (white-balanced)' : ''}</p>
          <div className="mt-2 flex flex-col gap-2">
            {LIGHTS.map((L) => {
              const tint = L.id === 'sunset' ? 'from-orange-500/40 to-amber-700/30' : L.id === 'shade' ? 'from-sky-800/50 to-slate-800/50' : 'from-yellow-200/25 to-lime-700/20'
              return (
                <section key={L.id} className={`rounded-2xl bg-gradient-to-r ${rule.whiteBalance ? 'from-white/5 to-white/5' : tint} p-2`} aria-label={`${L.name} row`}>
                  <p className="text-[13px] font-bold text-white">
                    <span aria-hidden>{L.icon}</span> {L.name}
                    {ran && (
                      <span className="ml-2 font-normal text-[#A7B0C0]">
                        {result.byLight[L.id].correct}/{rows[L.id].length} right
                      </span>
                    )}
                  </p>
                  <ol className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-12">
                    {rows[L.id].map((f) => {
                      const k = order.findIndex((d) => d.fruit.id === f.id)
                      const d = k >= 0 && k < shownUpTo ? order[k] : null
                      const active = play.playing && k === play.frame
                      const o = d ? OUTCOME[d.outcome] : null
                      return (
                        <li key={f.id} className="relative flex flex-col items-center" aria-label={d ? `Score ${d.index.toFixed(2)}: ${o?.text}` : 'Tomato, not judged yet'}>
                          <span
                            aria-hidden
                            className={`block h-9 w-9 rounded-full shadow-inner ring-2 transition sm:h-10 sm:w-10 ${active ? 'scale-110 ring-amber-300' : 'ring-black/30'} ${d && (d.outcome === 'picked-ripe' || d.outcome === 'picked-unripe') ? 'opacity-40' : ''}`}
                            style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.45), ${fruitFill(f, L, rule.whiteBalance)} 45%)` }}
                          />
                          <span aria-hidden className="absolute -top-1 left-1/2 -translate-x-1/2 text-[11px]">
                            🌿
                          </span>
                          {o && <span className={`absolute -bottom-1 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black ${o.cls}`}>{o.icon}</span>}
                          {active && (
                            <span aria-hidden className="absolute -top-6 text-lg">
                              🦾
                            </span>
                          )}
                          {d && ran && <span className="mt-1 text-[10px] tabular-nums text-[#A7B0C0]">{d.index.toFixed(2)}</span>}
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )
            })}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px] text-[#A7B0C0]">
            {(Object.keys(OUTCOME) as PickOutcome[]).map((k) => (
              <li key={k} className="flex items-center gap-1">
                <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black ${OUTCOME[k].cls}`}>{OUTCOME[k].icon}</span>
                {OUTCOME[k].text}
              </li>
            ))}
          </ul>
        </div>

        {ran && (
          <section className={CARD}>
            <h3 className="font-display font-bold text-[#EEF2F8]">Every tomato&apos;s score, by light</h3>
            <p className="text-[13px] text-[#A7B0C0]">Red dots were really ripe, green dots were not. The orange line is your threshold; the blue band is “unsure”.</p>
            <StripPlot
              label="Scores of all tomatoes in the three lights"
              rule={rule}
              rows={LIGHTS.map((L) => ({ name: L.id, icon: L.icon, items: result.decisions.filter((d) => d.light === L.id).map((d) => ({ index: d.index, ripe: d.fruit.ripeness >= RIPE_AT })) }))}
            />
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-3">
        <section className={CARD}>
          <StepBadge n={1} of={1} label="Program the picking robot" />
          <p className="mt-1 text-[15px] leading-snug text-[#A7B0C0]">
            The camera gives every tomato a <b className="text-[#EEF2F8]">redness score</b> = red ÷ (red + green). Green tomatoes score about 0.3, deep red ones about 0.8. A farmer checked 8 tomatoes at
            midday:
          </p>
          <StripPlot label="Scores of the 8 tomatoes the farmer checked at midday" rule={rule} rows={sampleRows} />
          <div className="mt-2 flex flex-col gap-3">
            <Slider id="ace-threshold" label="Pick when score is above" value={rule.threshold} min={0.4} max={0.85} step={0.01} unit="" onChange={(v) => change({ threshold: v })} disabled={play.playing} />
            <Slider
              id="ace-margin"
              label="Unsure band (±)"
              value={rule.margin}
              min={0}
              max={0.06}
              step={0.01}
              unit=""
              onChange={(v) => change({ margin: v })}
              disabled={play.playing}
              hint="Scores this close to the line are not picked: a person checks them. Safer, but it costs time."
            />
            <Choice<'off' | 'on'>
              label="White balance (grey card)"
              value={rule.whiteBalance ? 'on' : 'off'}
              disabled={play.playing}
              onChange={(v) => change({ whiteBalance: v === 'on' })}
              options={[
                { value: 'off', label: 'Off', sub: 'raw camera colours' },
                { value: 'on', label: 'On', sub: 'divide out the light' },
              ]}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!play.playing && (
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => {
                  setRuns((n) => n + 1)
                  setRan(false)
                  play.start()
                  showField(fieldRef.current)
                }}
              >
                🦾 {ran ? 'Pick again' : 'Start picking'}
              </button>
            )}
            {play.playing && (
              <button type="button" className={BTN_GHOST} onClick={play.skip}>
                Skip ⏭
              </button>
            )}
          </div>
        </section>
        {ran && (
          <>
            <section className={CARD} aria-live="polite">
              <p className="text-2xl" aria-label={`${result.stars} stars`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < result.stars ? '' : 'opacity-20 grayscale'}>
                    ⭐
                  </span>
                ))}
              </p>
              <p className="mt-1 text-[15px] text-[#EEF2F8]">{result.message}</p>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-[13px] text-[#A7B0C0]">
                {LIGHTS.map((L) => (
                  <div key={L.id} className="col-span-2 flex justify-between rounded-lg bg-white/5 px-2 py-1">
                    <dt>
                      {L.icon} {L.name}
                    </dt>
                    <dd>
                      ✗ {result.byLight[L.id].unripePicked} · ! {result.byLight[L.id].ripeMissed} · ? {result.byLight[L.id].unsure}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            {result.tips.length > 0 && <Debrief tips={result.tips} />}
            <button type="button" className={result.stars > 0 ? BTN_PRIMARY : BTN_GHOST} onClick={finish}>
              {result.stars > 0 ? 'Finish the harvest ✓' : 'End round'}
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
