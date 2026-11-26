'use client'

// components/kids/games/smart-farm/CadetClient.tsx
// Cadet: a 12-plant garden, three days. Every plant has a soil-moisture sensor.
// The child reads the sensors (leaves can look fine while the soil is dry),
// picks the plants that need water, and sends the watering robot.

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { CADET_DAYS, CADET_LINE, CADET_PULSE, CADET_WEATHER, WEATHER_ICON, WEATHER_NAME, cadetDay, cadetGarden, cadetLooks, cadetStars, type CadetDayResult, type CadetPlant } from './model'
import { BTN_GHOST, BTN_PRIMARY, CARD, Debrief, Gauge, usePlayback } from './FarmPartsClient'

const COLS = 4

export default function CadetClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const [plants, setPlants] = useState<CadetPlant[]>(() => cadetGarden(11))
  const [dayIdx, setDayIdx] = useState(0)
  const [chosen, setChosen] = useState<Set<number>>(new Set())
  const [phase, setPhase] = useState<'plan' | 'robot' | 'result'>('plan')
  const [result, setResult] = useState<CadetDayResult | null>(null)
  const totals = useRef({ mistakes: 0, lostHearts: 0, wasted: 0, good: 0 })
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const plan = CADET_WEATHER[dayIdx]
  const order = useMemo(() => [...chosen].sort((a, b) => a - b), [chosen])

  const play = usePlayback(order.length + 1, 450, () => {
    const r = cadetDay(plants, chosen, plan)
    totals.current.mistakes += r.missed.length + r.extra.length
    totals.current.lostHearts += r.wilted.length
    totals.current.wasted += r.wasted
    totals.current.good += r.good.length
    setResult(r)
    setPhase('result')
    playSound(r.missed.length + r.extra.length === 0 ? 'correct' : 'wrong')
  })

  const toggle = (id: number) => {
    if (phase !== 'plan') return
    playSound('click')
    setChosen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }
    const d = moves[e.key]
    if (d === undefined) return
    e.preventDefault()
    const j = i + d
    if (j >= 0 && j < plants.length) btns.current[j]?.focus()
  }

  const nextDay = () => {
    if (!result) return
    if (dayIdx + 1 >= CADET_DAYS) {
      const t = totals.current
      const stars = cadetStars(t.mistakes, t.lostHearts)
      const score = Math.max(0, 100 - t.mistakes * 10 - t.lostHearts * 15 - Math.round(t.wasted / 5))
      onFinish({
        stars,
        score,
        scoreLabel: 'garden points',
        attempts: 1,
        message:
          stars === 3
            ? `Perfect farming! You watered exactly the ${t.good} thirsty plants and wasted no water. The sensors told you what the leaves could not.`
            : stars > 0
              ? `${t.mistakes} watering mistake${t.mistakes === 1 ? '' : 's'}${t.lostHearts ? ` and ${t.lostHearts} wilted plant${t.lostHearts === 1 ? '' : 's'}` : ''}. Water only plants whose sensor is below the line — leaves can look fine while the soil is dry.`
              : 'Too many plants wilted. Look at the sensor, not the leaves: below the orange line means thirsty.',
        badges: stars === 3 ? ['decision-maker'] : undefined,
      })
      return
    }
    setPlants(result.plants)
    setDayIdx((d) => d + 1)
    setChosen(new Set())
    setResult(null)
    setPhase('plan')
    play.reset()
  }

  const robotAt = phase === 'robot' && play.frame >= 0 ? order[Math.min(play.frame, order.length - 1)] : undefined
  const shown = phase === 'result' && result ? result.plants : plants
  const dryCount = plants.filter((p) => p.water < CADET_LINE).length
  const looksFineButDry = plants.filter((p) => p.water < CADET_LINE && cadetLooks(p) === 'happy').length

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#3d6b2a] via-[#2f5421] to-[#213b17] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-lg font-bold text-white">
              Day {dayIdx + 1} of {CADET_DAYS}
            </p>
            <p className="rounded-full bg-[#0A1120]/50 px-3 py-1 text-[15px] font-bold text-white">
              {phase === 'result' ? (
                <>Night has passed — these are tomorrow morning&apos;s readings</>
              ) : (
                <>
                  <span aria-hidden>{WEATHER_ICON[plan.weather]}</span> {WEATHER_NAME[plan.weather]} — soil dries by {plan.dryBy} % today
                </>
              )}
            </p>
          </div>
          <div className="relative grid grid-cols-4 gap-2" role="group" aria-label="Garden: choose the plants to water">
            {shown.map((p, i) => {
              const looks = cadetLooks(p)
              const picked = chosen.has(p.id)
              const status =
                phase === 'result' && result
                  ? result.good.includes(p.id)
                    ? 'good'
                    : result.missed.includes(p.id)
                      ? 'missed'
                      : result.extra.includes(p.id)
                        ? 'extra'
                        : 'ok'
                  : null
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    btns.current[i] = el
                  }}
                  type="button"
                  aria-pressed={picked}
                  aria-label={`Plant ${i + 1}, ${p.crop}: soil ${Math.round(p.water)} percent${p.water < CADET_LINE ? ', below the line' : ''}. ${'♥'.repeat(p.hearts)} ${picked ? 'Will be watered.' : ''}`}
                  onClick={() => toggle(p.id)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`relative flex min-h-[112px] flex-col items-center justify-between rounded-2xl border-2 p-1.5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70 sm:min-h-[128px] ${
                    picked ? 'border-cyan-300 bg-cyan-400/20' : 'border-white/10 bg-[#4a3222]/80 hover:border-white/30'
                  } ${status === 'missed' ? 'ring-4 ring-rose-400/70' : ''} ${status === 'extra' ? 'ring-4 ring-amber-300/70' : ''} ${status === 'good' ? 'ring-4 ring-emerald-400/70' : ''}`}
                >
                  <span className="flex w-full items-start justify-between">
                    <span className="text-[11px] text-rose-300" aria-hidden>
                      {'♥'.repeat(p.hearts)}
                      <span className="opacity-30">{'♥'.repeat(2 - p.hearts)}</span>
                    </span>
                    {picked && phase !== 'result' && (
                      <span aria-hidden className="text-lg">
                        💧
                      </span>
                    )}
                    {status && (
                      <span
                        className={`rounded-md px-1 text-[10px] font-bold leading-tight sm:text-[11px] ${
                          status === 'good' ? 'bg-emerald-400 text-[#0A1120]' : status === 'missed' ? 'bg-rose-500 text-white' : status === 'extra' ? 'bg-amber-300 text-[#1A1103]' : 'bg-white/15 text-white'
                        }`}
                      >
                        {status === 'good' ? '✓ Watered' : status === 'missed' ? '⚠ Thirsty' : status === 'extra' ? '💦 Puddle' : '✓ Fine'}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className={`text-4xl transition-transform sm:text-5xl ${looks === 'droopy' ? 'rotate-[25deg] opacity-60 grayscale-[60%]' : looks === 'ok' ? 'rotate-6' : ''}`}>
                    {p.crop}
                  </span>
                  <Gauge value={p.water} line={CADET_LINE} label="Soil sensor" />
                </button>
              )
            })}
            {robotAt !== undefined && (
              <div
                aria-hidden
                className="pointer-events-none absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-500 text-2xl shadow-lg transition-all duration-300"
                style={{ left: `${((robotAt % COLS) + 0.5) * (100 / COLS)}%`, top: `${(Math.floor(robotAt / COLS) + 0.5) * (100 / 3)}%` }}
              >
                🤖
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {phase === 'plan' && (
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => {
                setPhase('robot')
                play.start()
              }}
            >
              🤖 Send the watering robot ({chosen.size})
            </button>
          )}
          {phase === 'robot' && (
            <button type="button" className={BTN_GHOST} onClick={play.skip}>
              Skip ⏭
            </button>
          )}
          {phase === 'result' && (
            <button type="button" className={BTN_PRIMARY} onClick={nextDay}>
              {dayIdx + 1 >= CADET_DAYS ? 'Finish the season →' : `Next day → (${WEATHER_ICON[CADET_WEATHER[dayIdx + 1].weather]})`}
            </button>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-3">
        <section className={CARD}>
          <h2 className="font-display text-lg font-bold text-[#EEF2F8]">Your job</h2>
          <p className="mt-1 text-[15px] leading-snug text-[#A7B0C0]">
            Each plant has a <b className="text-cyan-200">soil sensor</b> in the ground. Tap the plants whose sensor is <b className="text-rose-300">below the orange line</b>, then send the robot. Each
            watering adds {CADET_PULSE} %.
          </p>
          <ul className="mt-2 space-y-1 text-[14px] text-[#A7B0C0]">
            <li>🟥 Below the line = thirsty: water it.</li>
            <li>🟦 Above the line = fine: water would make a puddle.</li>
            <li>♥ A plant whose soil gets almost empty wilts and loses a heart.</li>
          </ul>
        </section>
        {phase === 'plan' && looksFineButDry > 0 && dayIdx === 0 && (
          <p className="rounded-2xl bg-amber-500/15 p-3 text-[14px] leading-snug text-amber-100">
            💡 Spark says: {looksFineButDry} plant{looksFineButDry === 1 ? ' looks' : 's look'} happy but {looksFineButDry === 1 ? 'its' : 'their'} soil is already dry. Leaves droop late — the sensor knows first!
          </p>
        )}
        {phase === 'plan' && (
          <p className="text-[14px] text-[#6E7888]">
            {chosen.size} chosen · {dryCount} sensor{dryCount === 1 ? '' : 's'} below the line
          </p>
        )}
        {phase === 'result' && result && (
          <Debrief
            tips={[
              ...(result.good.length ? [`${result.good.length} thirsty plant${result.good.length === 1 ? '' : 's'} got water just in time.`] : []),
              ...(result.missed.length ? [`${result.missed.length} thirsty plant${result.missed.length === 1 ? ' was' : 's were'} missed — the sensor was below the line.`] : []),
              ...(result.extra.length ? [`${result.extra.length} plant${result.extra.length === 1 ? ' was' : 's were'} already wet enough. The extra water ran off into a puddle (${Math.round(result.wasted)} % wasted).`] : []),
              ...(result.wilted.length ? [`${result.wilted.length} plant${result.wilted.length === 1 ? '' : 's'} wilted overnight because the soil got almost empty.`] : []),
              ...(result.missed.length + result.extra.length === 0 ? ['Every choice was right. Real farms use soil sensors like these to water only where it is needed.'] : []),
            ]}
          />
        )}
      </aside>
    </div>
  )
}
