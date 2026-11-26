'use client'

// components/kids/games/smart-farm/LegendClient.tsx
// Legend: run a whole 40-day season. Set the irrigation controller, sensor
// redundancy, drone scouting and weeding, then face the season's random
// events (storms, heatwaves, aphids, a stuck sensor, wrong forecasts). Meet
// four goals at once — harvest, water, energy, chemicals — and explain why.

import { useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  DEFAULT_LEGEND_PLAN,
  LEGEND_COLS,
  LEGEND_DAYS,
  LEGEND_ROWS,
  LEGEND_ZONES,
  SEASON_NAMES,
  SOILS,
  WEATHER_ICON,
  legendGoals,
  legendSeason,
  legendStars,
  runLegend,
  type LegendPlan,
  type WeedMethod,
} from './model'
import { BTN_GHOST, BTN_PRIMARY, CARD, showField, Choice, Debrief, Slider, usePlayback } from './FarmPartsClient'

function soilWaterColour(pct: number): string {
  const t = Math.max(0, Math.min(1, pct / 100))
  if (t < 0.5) {
    // dry: from cracked tan to olive
    const u = t / 0.5
    return `rgb(${Math.round(196 - 90 * u)},${Math.round(150 - 10 * u)},${Math.round(90 - 30 * u)})`
  }
  const u = (t - 0.5) / 0.5
  return `rgb(${Math.round(106 - 70 * u)},${Math.round(140 - 10 * u)},${Math.round(60 + 60 * u)})`
}

export default function LegendClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [seasonId, setSeasonId] = useState(0)
  const [plan, setPlan] = useState<LegendPlan>(DEFAULT_LEGEND_PLAN)
  const [ran, setRan] = useState(false)
  const [runs, setRuns] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const season = useMemo(() => legendSeason(seasonId), [seasonId])
  const goals = useMemo(() => legendGoals(season), [season])
  const result = useMemo(() => runLegend(plan, season), [plan, season])
  const play = usePlayback(LEGEND_DAYS, 260, () => {
    setRan(true)
    playSound(result.baseStars > 0 ? 'correct' : 'wrong')
  })
  const day = ran ? LEGEND_DAYS - 1 : play.frame
  const today = day >= 0 ? result.log[day] : null

  const edit = (p: Partial<LegendPlan>) => {
    setPlan((x) => ({ ...x, ...p }))
    setRan(false)
    setAnswer(null)
    play.reset()
  }

  const recent = useMemo(() => {
    if (day < 0) return []
    const out: { day: number; text: string }[] = []
    for (let d = 0; d <= day; d++) for (const e of result.log[d].events) out.push({ day: d, text: e })
    return out.slice(-6).reverse()
  }, [day, result])

  const finish = () => {
    const right = answer === result.question.answer
    const stars = legendStars(result.baseStars, right)
    const met = result.targets.filter((t) => t.ok).length
    onFinish({
      stars,
      score: Math.round(result.yieldPct * 10 - result.waterMm - result.energyKWh * 5 - result.chemicalsL * 40),
      scoreLabel: 'season score',
      attempts: Math.max(1, runs),
      message: `${season.name}: ${met} of 4 goals met (harvest ${result.yieldPct} %, water ${Math.round(result.waterMm)} mm, energy ${result.energyKWh} kWh, chemicals ${result.chemicalsL} L). ${
        right ? 'And you explained why — that is what engineers do after every season.' : 'Your explanation missed the main cause: ' + result.question.explain
      }`,
      badges: stars === 3 ? ['right-tool'] : undefined,
    })
  }

  const cells = []
  for (let r = 0; r < LEGEND_ROWS; r++)
    for (let c = 0; c < LEGEND_COLS; c++) {
      const z = Math.floor(c / 3)
      const pct = today ? today.water[z] : 80
      const local = (c * 7 + r * 13) % 18
      const pest = today && z === season.pest.zone && local < today.infected
      const weedy = today && ((c * 5 + r * 3) % 10) / 10 < today.weeds * 0.8
      cells.push(
        <div key={`${c}-${r}`} className="relative flex aspect-square items-center justify-center border border-black/20 text-[14px] transition-colors duration-200 motion-reduce:transition-none" style={{ background: soilWaterColour(pct) }}>
          <span aria-hidden className={pct < 25 ? 'opacity-60 grayscale' : ''}>
            {pest ? '🐛' : weedy ? '🌿' : '🥬'}
          </span>
          {today?.irrigated[z] && r === 0 && c % 3 === 1 && (
            <span aria-hidden className="absolute -top-1 right-0 text-[11px]">
              💧
            </span>
          )}
        </div>,
      )
    }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-3">
        <div ref={fieldRef} className="rounded-[28px] border border-white/10 bg-[#111C32] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="font-display font-bold text-[#EEF2F8]">
              {season.name} · {day >= 0 ? `Day ${day + 1} of ${LEGEND_DAYS}` : 'Ready to plant'}
            </p>
            {today && (
              <p className="rounded-full bg-white/10 px-3 py-0.5 text-[14px] font-bold text-white">
                <span aria-hidden>{WEATHER_ICON[today.weather.kind]}</span> {today.weather.rain > 0 ? `${today.weather.rain} mm rain` : `plants drink ${today.weather.et} mm`}
              </p>
            )}
          </div>
          <div className="relative mt-2">
            <div className="grid overflow-hidden rounded-2xl" style={{ gridTemplateColumns: `repeat(${LEGEND_COLS}, minmax(0, 1fr))` }} role="img" aria-label={today ? `Day ${day + 1}: soil ${today.water.map((w, i) => `${LEGEND_ZONES[i]} ${w} percent`).join(', ')}` : 'The field before the season'}>
              {cells}
            </div>
          </div>
          <div className="mt-1 grid grid-cols-3 text-center text-[12px] font-bold text-[#A7B0C0]">
            {LEGEND_ZONES.map((z, i) => (
              <span key={z}>
                {SOILS[z].name} {today ? `· ${today.water[i]}%` : ''}
              </span>
            ))}
          </div>
          {/* Weather strip */}
          <ol className="mt-2 flex gap-px overflow-hidden rounded-lg" aria-label="Season weather">
            {season.days.map((d, i) => (
              <li
                key={i}
                title={`Day ${i + 1}`}
                className={`flex h-6 flex-1 items-center justify-center text-[9px] sm:text-[11px] ${i === day ? 'bg-amber-500' : i < day ? 'bg-white/15' : 'bg-white/5'}`}
                aria-label={`Day ${i + 1}: ${d.kind}`}
              >
                <span aria-hidden className="hidden sm:inline">
                  {i <= day || ran ? WEATHER_ICON[d.kind] : '·'}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <section className={CARD} aria-live="polite" aria-label="Farm diary">
          <h3 className="font-display font-bold text-[#EEF2F8]">Farm diary</h3>
          {recent.length === 0 ? (
            <p className="mt-1 text-[14px] text-[#A7B0C0]">Events appear here as the season runs. You do not know them in advance — your rules must cope.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-[14px] leading-snug text-[#EEF2F8]">
              {recent.map((e, i) => (
                <li key={`${e.day}-${i}`}>
                  <span className="font-display font-bold text-amber-300">Day {e.day + 1}</span> {e.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        {ran && (
          <section className={CARD}>
            <h3 className="font-display font-bold text-[#EEF2F8]">Season goals</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {result.targets.map((t) => (
                <li key={t.id} className={`rounded-xl px-3 py-2 ${t.ok ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                  <p className="text-[13px] font-bold text-[#A7B0C0]">
                    {t.ok ? '✅' : '❌'} {t.label} <span className="font-normal">(goal {t.goal})</span>
                  </p>
                  <p className="font-display text-xl font-bold text-[#EEF2F8]">{t.value}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-3">
        <section className={CARD}>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Plan the season</p>
          <div className="mt-2 flex flex-col gap-3">
            <Choice<number>
              label="Season"
              value={seasonId}
              disabled={play.playing}
              onChange={(v) => {
                setSeasonId(v)
                setRan(false)
                setAnswer(null)
                play.reset()
              }}
              options={SEASON_NAMES.map((s, i) => ({ value: i, label: s.name }))}
            />
            <p className="-mt-2 text-[13px] text-[#A7B0C0]">
              {season.blurb} Goals: harvest ≥ {goals.yield} %, water ≤ {goals.water} mm, energy ≤ {goals.energy} kWh, chemicals ≤ {goals.chem} L.
            </p>
            <Slider id="legend-threshold" label="Irrigate when soil below" value={plan.threshold} min={20} max={90} step={5} unit=" %" disabled={play.playing} onChange={(v) => edit({ threshold: v })} />
            <Slider
              id="legend-pulse"
              label="Water per irrigation"
              value={plan.pulseMm}
              min={5}
              max={25}
              step={5}
              unit=" mm"
              disabled={play.playing}
              onChange={(v) => edit({ pulseMm: v })}
              hint={`Sand holds only ${SOILS.sand.capacityMm} mm, loam ${SOILS.loam.capacityMm} mm, clay ${SOILS.clay.capacityMm} mm. Water above full drains away.`}
            />
            <Choice<'yes' | 'no'>
              label="Check the rain forecast?"
              value={plan.useForecast ? 'yes' : 'no'}
              disabled={play.playing}
              onChange={(v) => edit({ useForecast: v === 'yes' })}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Skip if ≥ 8 mm forecast' },
              ]}
            />
            <Choice<'1' | '2'>
              label="Soil sensors per zone"
              value={plan.doubleSensors ? '2' : '1'}
              disabled={play.playing}
              onChange={(v) => edit({ doubleSensors: v === '2' })}
              options={[
                { value: '1', label: 'One' },
                { value: '2', label: 'Two', sub: 'they check each other' },
              ]}
            />
            <Choice<0 | 3 | 5 | 10>
              label="Drone scouting (NDVI)"
              value={plan.scoutEvery}
              disabled={play.playing}
              onChange={(v) => edit({ scoutEvery: v })}
              options={[
                { value: 0, label: 'Never' },
                { value: 3, label: 'Every 3 days' },
                { value: 5, label: 'Every 5 days' },
                { value: 10, label: 'Every 10 days' },
              ]}
            />
            <Choice<WeedMethod>
              label="Weeds"
              value={plan.weeding}
              disabled={play.playing}
              onChange={(v) => edit({ weeding: v })}
              options={[
                { value: 'none', label: 'Leave them' },
                { value: 'spray', label: 'Herbicide spray', sub: '2 L once' },
                { value: 'robot-fortnight', label: 'Robot, 2-weekly', sub: '1.5 kWh a pass' },
                { value: 'robot-weekly', label: 'Robot, weekly', sub: '1.5 kWh a pass' },
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
                  setAnswer(null)
                  play.start()
                  showField(fieldRef.current)
                }}
              >
                ▶ {ran ? 'Run the season again' : 'Run the season'}
              </button>
            )}
            {play.playing && (
              <button type="button" className={BTN_GHOST} onClick={play.skip}>
                Skip to harvest ⏭
              </button>
            )}
          </div>
        </section>

        {ran && (
          <section className={CARD} aria-live="polite">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Explain why</p>
            <p className="mt-1 text-[15px] font-bold text-[#EEF2F8]">{result.question.prompt}</p>
            <div className="mt-2 flex flex-col gap-1.5" role="radiogroup" aria-label={result.question.prompt}>
              {result.question.options.map((o) => {
                const picked = answer === o.id
                const right = answer !== null && o.id === result.question.answer
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    disabled={answer !== null}
                    onClick={() => {
                      setAnswer(o.id)
                      playSound(o.id === result.question.answer ? 'correct' : 'wrong')
                    }}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-[14px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                      right ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100' : picked ? 'border-rose-400 bg-rose-500/20 text-rose-100' : 'border-white/15 bg-white/5 text-[#EEF2F8] hover:bg-white/10'
                    }`}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </section>
        )}
        {ran && answer !== null && (
          <>
            <Debrief tips={[result.question.explain]}>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-[13px] text-[#A7B0C0]">
                <dt>Harvest lost to dry soil</dt>
                <dd className="text-right text-[#EEF2F8]">{result.lost.drought} %</dd>
                <dt>…to waterlogged clay</dt>
                <dd className="text-right text-[#EEF2F8]">{result.lost.waterlog} %</dd>
                <dt>…to aphids</dt>
                <dd className="text-right text-[#EEF2F8]">{result.lost.pests} %</dd>
                <dt>…to weeds</dt>
                <dd className="text-right text-[#EEF2F8]">{result.lost.weeds} %</dd>
                <dt>Water drained past roots</dt>
                <dd className="text-right text-[#EEF2F8]">{result.drainedMm} mm</dd>
                <dt>Energy: pump / weeding / drone</dt>
                <dd className="text-right text-[#EEF2F8]">
                  {result.energyParts.pump} / {result.energyParts.weeding} / {result.energyParts.drone}
                </dd>
              </dl>
            </Debrief>
            <button type="button" className={BTN_PRIMARY} onClick={finish}>
              Finish the season ✓
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
