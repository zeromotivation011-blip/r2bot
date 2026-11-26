'use client'

// components/kids/games/smart-farm/PilotClient.tsx
// Pilot: (1) place three soil sensors and set the irrigation threshold, run 12
// days of weather; (2) plan the scouting drone's lawnmower path (height, lane
// spacing, direction) and fly it to find sick plants on the NDVI map.

import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import {
  DRONE_BATTERY_M,
  PILOT_COLS,
  PILOT_DAYS,
  PILOT_PESTS,
  PILOT_PULSE_MM,
  PILOT_ROWS,
  PILOT_SPOTS,
  PILOT_ZONES,
  SOILS,
  WEATHER_ICON,
  footprintCells,
  ndviColour,
  ndviFromHealth,
  pointAlong,
  runDrone,
  runPilotIrrigation,
  spotAt,
  zoneOfCol,
  type DronePlan,
  type PilotIrrigationRun,
} from './model'
import { BTN_GHOST, BTN_PRIMARY, CARD, showField, Choice, Debrief, NdviLegend, Slider, StepBadge, usePlayback } from './FarmPartsClient'

const SPOT_ICON = { shade: '🌳', leak: '💧', hollow: '🕳️' } as const
const MAX_SENSORS = 3

function waterColour(pct: number): string {
  // dry (sandy brown) → wet (deep blue-green)
  const t = Math.max(0, Math.min(1, pct / 100))
  const r = Math.round(200 - 150 * t)
  const g = Math.round(150 - 20 * t)
  const b = Math.round(80 + 110 * t)
  return `rgb(${r},${g},${b})`
}

export default function PilotClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<'irrigate' | 'drone'>('irrigate')
  const [sensors, setSensors] = useState<{ col: number; row: number }[]>([])
  const [threshold, setThreshold] = useState(40)
  const [irr, setIrr] = useState<PilotIrrigationRun | null>(null)
  const [irrShown, setIrrShown] = useState(false)
  const [plan, setPlan] = useState<DronePlan>({ altitude: 10, spacing: 1, dir: 'cols' })
  const [flown, setFlown] = useState(false)
  const [tries, setTries] = useState(1)

  const irrPlay = usePlayback(PILOT_DAYS.length, 420, () => {
    setIrrShown(true)
    if (irr) playSound(irr.stars > 0 ? 'correct' : 'wrong')
  })
  const drone = useMemo(() => runDrone(plan), [plan])
  const steps = 80
  const flyPlay = usePlayback(steps + 1, 45, () => {
    setFlown(true)
    playSound(drone.stars > 0 ? 'correct' : 'wrong')
  })

  const toggleSensor = (col: number, row: number) => {
    if (stage !== 'irrigate' || irrPlay.playing) return
    setIrr(null)
    setIrrShown(false)
    irrPlay.reset()
    setSensors((s) => {
      const has = s.some((x) => x.col === col && x.row === row)
      if (has) {
        playSound('click')
        return s.filter((x) => !(x.col === col && x.row === row))
      }
      if (s.length >= MAX_SENSORS) {
        playSound('wrong')
        return s
      }
      playSound('click')
      return [...s, { col, row }]
    })
  }

  const runIrrigation = () => {
    setIrr(runPilotIrrigation(sensors, threshold))
    setIrrShown(false)
    irrPlay.start()
    showField(fieldRef.current)
  }

  const day = irrPlay.frame
  const health = (col: number) => {
    const z = irr?.zones.find((x) => x.zone.id === zoneOfCol(col).id)
    return z ? 0.35 + 0.6 * z.growth : 0.9
  }
  const isPest = (col: number, row: number) => PILOT_PESTS.some((p) => p.cells.some(([c, r]) => c === col && r === row))

  const finish = () => {
    if (!irr) return
    const stars = Math.min(irr.stars, drone.stars)
    const score = Math.round(irr.growth * 100 - irr.drainedMm + drone.found.filter(Boolean).length * 50)
    onFinish({
      stars,
      score,
      scoreLabel: 'farm points',
      attempts: tries,
      message:
        stars === 3
          ? 'Sensors in typical spots, a threshold that waters before plants get thirsty, and a drone path that covered every cell within one battery. That is precision farming.'
          : `Irrigation ${irr.stars}★, drone ${drone.stars}★. ${drone.stars < irr.stars ? 'The drone plan held you back: ' + (drone.tips[0] ?? '') : irr.tips[0] ?? ''}`,
      badges: stars === 3 ? ['map-maker'] : undefined,
    })
  }

  // ── Field grid (shared by both stages) ────────────────────────────────────
  const fly = flyPlay.frame >= 0 ? (flyPlay.frame / steps) * drone.stopFrac : -1
  const dronePos = fly >= 0 ? pointAlong(drone.path, fly) : null

  const cells = []
  for (let row = 0; row < PILOT_ROWS; row++)
    for (let col = 0; col < PILOT_COLS; col++) {
      const zone = zoneOfCol(col)
      const spot = spotAt(col, row)
      const hasSensor = sensors.some((s) => s.col === col && s.row === row)
      let bg = SOILS[zone.soil].colour
      let label = `Zone ${zone.id}, ${SOILS[zone.soil].name}, column ${col + 1}, row ${row + 1}`
      let content: ReactNode = null
      if (stage === 'irrigate') {
        if (irr && day >= 0) {
          const zr = irr.zones.find((z) => z.zone.id === zone.id)!
          let pct = zr.water[Math.min(day, PILOT_DAYS.length - 1)]
          if (spot?.kind === 'leak') pct = 100
          bg = waterColour(pct)
          label += `, soil ${pct} percent full`
        }
        content = (
          <>
            {spot && (
              <span aria-hidden className="absolute left-0.5 top-0 text-[15px]">
                {SPOT_ICON[spot.kind]}
              </span>
            )}
            {hasSensor && (
              <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-[15px] shadow ring-2 ring-white">
                📟
              </span>
            )}
          </>
        )
        if (spot) label += `. ${spot.label}`
        if (hasSensor) label += '. Sensor here'
      } else {
        const t = drone.seenAt[row][col]
        const visible = fly >= 0 && t >= 0 && t <= fly + 1e-6
        if (visible) {
          const v = isPest(col, row) ? ndviFromHealth(0.2) : ndviFromHealth(health(col))
          bg = ndviColour(v)
          label += `, NDVI ${v.toFixed(2)}`
          const pest = PILOT_PESTS.find((p) => p.cells.some(([c, r]) => c === col && r === row))
          const idx = pest ? PILOT_PESTS.indexOf(pest) : -1
          if (flown && idx >= 0 && drone.found[idx])
            content = (
              <span aria-hidden className="text-[18px]">
                🐛
              </span>
            )
          if (flown && idx >= 0 && !drone.found[idx]) label += ' (looks almost normal from this height)'
        } else {
          bg = '#1b2740'
          label += fly >= 0 ? ', not photographed' : ''
        }
      }
      cells.push(
        <button
          key={`${col}-${row}`}
          type="button"
          aria-label={label}
          aria-pressed={stage === 'irrigate' ? hasSensor : undefined}
          disabled={stage !== 'irrigate'}
          onClick={() => toggleSensor(col, row)}
          className="relative flex aspect-square items-center justify-center border border-black/20 transition-colors duration-300 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/80 disabled:cursor-default motion-reduce:transition-none"
          style={{ background: bg }}
        >
          {content}
        </button>,
      )
    }

  const pathD = drone.path.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
  const fp = footprintCells(plan.altitude)

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-3">
        <div ref={fieldRef} className="rounded-[28px] border border-white/10 bg-[#111C32] p-2 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="font-display font-bold text-[#EEF2F8]">{stage === 'irrigate' ? 'Field: 80 m × 50 m, three soils' : 'Drone NDVI map'}</p>
            {stage === 'irrigate' && day >= 0 && (
              <p className="rounded-full bg-white/10 px-3 py-0.5 text-[14px] font-bold text-white">
                Day {Math.min(day + 1, PILOT_DAYS.length)} <span aria-hidden>{WEATHER_ICON[PILOT_DAYS[Math.min(day, PILOT_DAYS.length - 1)].kind]}</span>
              </p>
            )}
          </div>
          <div className="relative">
            <div className="grid overflow-hidden rounded-2xl" style={{ gridTemplateColumns: `repeat(${PILOT_COLS}, minmax(0, 1fr))` }} role="group" aria-label={stage === 'irrigate' ? 'Field: tap a square to place or remove a soil sensor' : 'Field seen by the drone'}>
              {cells}
            </div>
            {/* zone labels */}
            {stage === 'irrigate' && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-0.5 flex">
                {PILOT_ZONES.map((z) => (
                  <span key={z.id} className="text-center text-[11px] font-bold text-white drop-shadow" style={{ width: `${((z.cols[1] - z.cols[0] + 1) / PILOT_COLS) * 100}%` }}>
                    {z.id} · {SOILS[z.soil].name}
                  </span>
                ))}
              </div>
            )}
            {stage === 'drone' && (
              <svg aria-hidden viewBox={`0 0 ${PILOT_COLS} ${PILOT_ROWS}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                <path d={pathD} fill="none" stroke="#FF8A4C" strokeWidth={0.06} strokeDasharray="0.15 0.1" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
                {dronePos && (
                  <rect x={dronePos[0] - fp / 2} y={dronePos[1] - fp / 2} width={fp} height={fp} fill="rgba(0,229,255,0.18)" stroke="#00E5FF" strokeWidth={0.04} />
                )}
              </svg>
            )}
            {stage === 'drone' && dronePos && (
              <span aria-hidden className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-2xl" style={{ left: `${(dronePos[0] / PILOT_COLS) * 100}%`, top: `${(dronePos[1] / PILOT_ROWS) * 100}%` }}>
                🛸
              </span>
            )}
          </div>
          {stage === 'drone' && (
            <div className="mt-2 px-1">
              <NdviLegend />
            </div>
          )}
        </div>

        {stage === 'irrigate' && irr && (
          <section className={CARD} aria-label="Soil water in each zone, day by day">
            <h3 className="font-display font-bold text-[#EEF2F8]">Each zone, day by day</h3>
            <div className="mt-2 grid gap-2">
              {irr.zones.map((z) => (
                <div key={z.zone.id} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-[13px] font-bold text-[#A7B0C0]">
                    {z.zone.id} · {z.zone.soil}
                  </span>
                  <div className="flex flex-1 items-end gap-0.5" style={{ height: 44 }}>
                    {z.water.map((w, i) => (
                      <div key={i} className="relative flex-1" style={{ height: '100%' }}>
                        <div
                          className={`absolute inset-x-0 bottom-0 rounded-t ${i > day ? 'bg-white/5' : w < 50 ? 'bg-rose-400' : 'bg-cyan-400'}`}
                          style={{ height: `${i > day ? 100 : Math.max(4, w)}%` }}
                        />
                        {i <= day && z.irrigatedDays.includes(i) && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px]">💧</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[#6E7888]">Bars: how full each zone&apos;s soil is at the end of the day. Red = below half full (plants slow down). 💧 = valve opened.</p>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-3">
        {stage === 'irrigate' ? (
          <>
            <section className={CARD}>
              <StepBadge n={1} of={2} label="Smart irrigation" />
              <p className="mt-1 text-[15px] leading-snug text-[#A7B0C0]">
                Each zone has its own valve. Tap the field to place <b className="text-cyan-200">3 soil sensors</b> ({sensors.length}/{MAX_SENSORS}). When a zone&apos;s sensor reads below your
                threshold in the morning, its valve gives {PILOT_PULSE_MM} mm of water.
              </p>
              <ul className="mt-2 space-y-0.5 text-[13px] text-[#A7B0C0]">
                <li>🌳 tree shade · 💧 leaky pipe · 🕳️ low hollow</li>
                <li>Sand holds {SOILS.sand.capacityMm} mm, loam {SOILS.loam.capacityMm} mm, clay {SOILS.clay.capacityMm} mm.</li>
              </ul>
              <div className="mt-3">
                <Slider
                  id="pilot-threshold"
                  label="Water when soil is below"
                  value={threshold}
                  min={20}
                  max={90}
                  step={5}
                  unit=" %"
                  disabled={irrPlay.playing}
                  onChange={(v) => {
                    setThreshold(v)
                    setIrr(null)
                    setIrrShown(false)
                    irrPlay.reset()
                  }}
                  hint="Plants grow at full speed while at least half the soil's water is left."
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!irrPlay.playing && (
                  <button type="button" className={BTN_PRIMARY} disabled={sensors.length === 0} onClick={runIrrigation}>
                    ▶ Run {PILOT_DAYS.length} days
                  </button>
                )}
                {irrPlay.playing && (
                  <button type="button" className={BTN_GHOST} onClick={irrPlay.skip}>
                    Skip ⏭
                  </button>
                )}
              </div>
            </section>
            {irr && irrShown && (
              <>
                <section className={CARD} aria-live="polite">
                  <p className="text-2xl" aria-label={`${irr.stars} stars`}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={i < irr.stars ? '' : 'opacity-20 grayscale'}>
                        ⭐
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-[15px] text-[#EEF2F8]">{irr.message}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/5 p-2">
                      <dt className="text-[11px] text-[#A7B0C0]">Growth</dt>
                      <dd className="font-display text-lg font-bold text-emerald-300">{Math.round(irr.growth * 100)}%</dd>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <dt className="text-[11px] text-[#A7B0C0]">Water used</dt>
                      <dd className="font-display text-lg font-bold text-cyan-200">{irr.usedMm} mm</dd>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <dt className="text-[11px] text-[#A7B0C0]">Drained away</dt>
                      <dd className="font-display text-lg font-bold text-amber-300">{irr.drainedMm} mm</dd>
                    </div>
                  </dl>
                </section>
                {irr.tips.length > 0 && <Debrief tips={irr.tips} />}
                <div className="flex flex-wrap gap-2">
                  {irr.stars > 0 && (
                    <button
                      type="button"
                      className={BTN_PRIMARY}
                      onClick={() => {
                        playSound('click')
                        setStage('drone')
                      }}
                    >
                      Next: drone scouting →
                    </button>
                  )}
                  <button
                    type="button"
                    className={BTN_GHOST}
                    onClick={() => {
                      setTries((t) => t + 1)
                      setIrr(null)
                      setIrrShown(false)
                      irrPlay.reset()
                    }}
                  >
                    Change and re-run
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <section className={CARD}>
              <StepBadge n={2} of={2} label="Drone scouting" />
              <p className="mt-1 text-[15px] leading-snug text-[#A7B0C0]">
                Insects are attacking two patches, too early to see from the path. Plan a <b className="text-[#EEF2F8]">lawnmower path</b>: straight lanes, back and forth. The camera sees a strip
                as wide as the drone is high, and it measures <b className="text-[#EEF2F8]">NDVI</b> — sick leaves show up red.
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <Choice<10 | 20 | 30>
                  label="Flying height"
                  value={plan.altitude}
                  disabled={flyPlay.playing}
                  onChange={(v) => {
                    setPlan((p) => ({ ...p, altitude: v }))
                    setFlown(false)
                    flyPlay.reset()
                  }}
                  options={[
                    { value: 10, label: '10 m', sub: 'strip 1 cell, sharp' },
                    { value: 20, label: '20 m', sub: 'strip 2 cells' },
                    { value: 30, label: '30 m', sub: 'strip 3 cells, blurry' },
                  ]}
                />
                <Slider
                  id="pilot-spacing"
                  label="Lane spacing"
                  value={plan.spacing}
                  min={1}
                  max={4}
                  step={1}
                  unit={plan.spacing === 1 ? ' cell' : ' cells'}
                  disabled={flyPlay.playing}
                  onChange={(v) => {
                    setPlan((p) => ({ ...p, spacing: v }))
                    setFlown(false)
                    flyPlay.reset()
                  }}
                />
                <Choice<'rows' | 'cols'>
                  label="Lanes run"
                  value={plan.dir}
                  disabled={flyPlay.playing}
                  onChange={(v) => {
                    setPlan((p) => ({ ...p, dir: v }))
                    setFlown(false)
                    flyPlay.reset()
                  }}
                  options={[
                    { value: 'rows', label: '↔ Across (80 m)' },
                    { value: 'cols', label: '↕ Up and down (50 m)' },
                  ]}
                />
              </div>
              <div className="mt-3">
                <p className="flex justify-between text-[13px] font-bold text-[#A7B0C0]">
                  <span>Flight plan {drone.lengthM} m</span>
                  <span>Battery {DRONE_BATTERY_M} m</span>
                </p>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Flight uses ${Math.round((drone.lengthM / DRONE_BATTERY_M) * 100)} percent of the battery`}>
                  <div className={`h-full ${drone.ranOut ? 'bg-rose-500' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, (drone.lengthM / DRONE_BATTERY_M) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[12px] text-[#6E7888]">Every change of lane costs about 30 m of battery: slow down, turn, move over, turn, speed up.</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!flyPlay.playing && (
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    onClick={() => {
                      if (flown) setTries((t) => t + 1)
                      setFlown(false)
                      flyPlay.start()
                      showField(fieldRef.current)
                    }}
                  >
                    🛸 {flown ? 'Fly again' : 'Fly the mission'}
                  </button>
                )}
                {flyPlay.playing && (
                  <button type="button" className={BTN_GHOST} onClick={flyPlay.skip}>
                    Skip ⏭
                  </button>
                )}
              </div>
            </section>
            {flown && (
              <>
                <section className={CARD} aria-live="polite">
                  <p className="text-2xl" aria-label={`${drone.stars} stars`}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={i < drone.stars ? '' : 'opacity-20 grayscale'}>
                        ⭐
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-[15px] text-[#EEF2F8]">{drone.message}</p>
                  <p className="mt-1 text-[14px] text-[#A7B0C0]">
                    Covered {drone.coveragePct}% of the field · found {drone.found.filter(Boolean).length} of {PILOT_PESTS.length} patches
                  </p>
                </section>
                {drone.tips.length > 0 && <Debrief tips={drone.tips} />}
                <button type="button" className={BTN_PRIMARY} onClick={finish}>
                  Finish the mission ✓
                </button>
              </>
            )}
          </>
        )}
        {stage === 'drone' && (
          <p className="text-[13px] leading-snug text-[#6E7888]">
            NDVI = (NIR − Red) ÷ (NIR + Red). Healthy leaves reflect lots of near-infrared light (invisible to us) and soak up red light, so they score high.
          </p>
        )}
        {stage === 'irrigate' && <p className="text-[13px] text-[#6E7888]">Sensor spots shown: {PILOT_SPOTS.length} special places. Is a sensor there typical of its zone?</p>}
      </aside>
    </div>
  )
}
