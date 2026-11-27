'use client'

// components/kids/profiles/PlayTogetherClient.tsx — "Play together" (roadmap #90).
// Two children, one tablet, two jobs, like real rover teams:
//   NAVIGATOR (usually the older child) can open the map and must SAY the way.
//   DRIVER (usually the younger child) presses the arrows and only sees a
//   little fog-window around the robot.
// Opening the map hides the arrows; the first move hides the map again, so
// the pair has to talk. Collect both samples, then reach base. Fewer bumps =
// more stars. Rewards go through reportBestRun for the child playing now, and
// the partner's stars wait on their profile until their next turn
// (addTogetherCredit → ProfileSwitcherClient pays them out). No ranking, no
// comparing: the two share one result.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BAND_ORDER } from '@/lib/kids/bands'
import { getProgress } from '@/lib/kids-progress'
import { KIDS_PROFILE_EVENT, activeProfileId, addTogetherCredit, readProfilesState, type KidsProfile } from '@/lib/kids/profiles'
import { reportBestRun } from '@/lib/kids/universe/rewards'
import { playSound } from '@/lib/kids-audio'
import { TOGETHER_MISSIONS, TOGETHER_N as N, cellAt, samplesOf, starsFor, startOf, type TogetherMission } from '@/lib/kids/together'
import { useKidsReducedMotion } from '@/lib/kids/settings'

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] } as const
type Dir = keyof typeof DIRS

interface Player {
  /** Profile id, or null for someone without a profile on this device. */
  id: string | null
  name: string
  picture: string
  rank: number
}

export default function PlayTogetherClient() {
  const [me, setMe] = useState<Player | null>(null)
  const [others, setOthers] = useState<Player[]>([])
  const [partner, setPartner] = useState<Player | null>(null)
  const [navIsMe, setNavIsMe] = useState(true)
  const [mission, setMission] = useState<TogetherMission | null>(null)

  useEffect(() => {
    const read = () => {
      const st = readProfilesState()
      const active = activeProfileId()
      const p = getProgress()
      const rankOf = (b: string | null | undefined) => (b ? BAND_ORDER.indexOf(b as (typeof BAND_ORDER)[number]) : 1)
      const asPlayer = (x: KidsProfile): Player => ({ id: x.id, name: x.nickname, picture: x.picture, rank: rankOf(x.band) })
      const mine = st?.profiles.find((x) => x.id === active)
      setMe(mine ? asPlayer(mine) : { id: active, name: p.explorerName || 'You', picture: '🚀', rank: rankOf(p.band) })
      setOthers((st?.profiles ?? []).filter((x) => x.id !== active).map(asPlayer))
    }
    read()
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    return () => window.removeEventListener(KIDS_PROFILE_EVENT, read)
  }, [])

  const choosePartner = (p: Player) => {
    setPartner(p)
    // The older child navigates by default; they can swap.
    setNavIsMe(!!me && me.rank >= p.rank)
  }

  if (!me) return <div className="h-80 rounded-[28px] bg-white/5" aria-hidden />

  if (!partner) {
    const guest: Player = { id: null, name: 'A grown-up or friend', picture: '🙂', rank: 3 }
    return (
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-7">
        <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">Who is playing with you, {me.name}?</h2>
        <p className="mt-1 text-base text-[#A7B0C0]">One of you is the navigator with the map. The other is the driver with the controls.</p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...others, guest].map((p) => (
            <li key={p.id ?? 'guest'}>
              <button
                type="button"
                onClick={() => choosePartner(p)}
                className={`flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-[#111C32] p-3 hover:border-amber-400/60 active:scale-[.97] motion-reduce:transform-none ${focus}`}
              >
                <span className="text-4xl" aria-hidden>{p.picture}</span>
                <span className="font-display text-lg font-bold text-[#EEF2F8]">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const navigator = navIsMe ? me : partner
  const driver = navIsMe ? partner : me

  if (!mission) {
    return (
      <section className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard emoji="🗺️" role="Navigator" who={navigator} job="Opens the map and says the way: “Go right 2! Now down!” Never touches the arrows." />
          <RoleCard emoji="🕹️" role="Driver" who={driver} job="Presses the arrows and listens. Only sees a little window around the robot." />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setNavIsMe((v) => !v)} className={`min-h-[48px] rounded-2xl border border-white/15 bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>
            🔁 Swap jobs
          </button>
          <button type="button" onClick={() => setPartner(null)} className={`min-h-[48px] rounded-2xl px-4 font-bold text-[#A7B0C0] hover:text-white ${focus}`}>
            Change partner
          </button>
        </div>
        <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">Pick a mission</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {TOGETHER_MISSIONS.map((m) => {
            const best = getProgress().personalBests[m.id]
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setMission(m)}
                  className={`flex min-h-[120px] w-full flex-col items-start justify-between gap-2 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,.45)] hover:-translate-y-0.5 hover:border-white/25 motion-reduce:transform-none ${focus}`}
                >
                  <span className="text-4xl" aria-hidden>{m.emoji}</span>
                  <span className="font-display text-xl font-bold text-[#EEF2F8]">{m.title}</span>
                  <span className="text-sm text-[#A7B0C0]">
                    Find 2 {m.sample} {m.place}, then get back to {m.base}.{best ? ` Your best: ${'⭐'.repeat(best)}` : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  return (
    <MissionBoard
      key={`${mission.id}-${navigator.name}`}
      mission={mission}
      navigator={navigator}
      driver={driver}
      me={me}
      partner={partner}
      onExit={() => setMission(null)}
      onSwap={() => setNavIsMe((v) => !v)}
    />
  )
}

function RoleCard({ emoji, role, who, job }: { emoji: string; role: string; who: Player; job: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
        <span aria-hidden>{emoji}</span> {role}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-[#EEF2F8]">
        <span aria-hidden>{who.picture}</span> {who.name}
      </p>
      <p className="mt-1 text-base text-[#A7B0C0]">{job}</p>
    </div>
  )
}

interface BoardProps {
  mission: TogetherMission
  navigator: Player
  driver: Player
  me: Player
  partner: Player
  onExit: () => void
  onSwap: () => void
}

function MissionBoard({ mission, navigator, driver, me, partner, onExit, onSwap }: BoardProps) {
  const reduced = useKidsReducedMotion()
  const allSamples = useMemo(() => samplesOf(mission), [mission])
  const [pos, setPos] = useState<[number, number]>(() => startOf(mission))
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const [got, setGot] = useState<string[]>([])
  const [bumps, setBumps] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const [peeks, setPeeks] = useState(0)
  const [say, setSay] = useState(`${navigator.name}, open the map and tell ${driver.name} the way.`)
  const [done, setDone] = useState<number | null>(null)
  const [shake, setShake] = useState(false)

  // Cells the driver has seen stay visible (like a real rover's map building up).
  useEffect(() => {
    setSeen((s) => {
      const n = new Set(s)
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) n.add(`${pos[0] + dr},${pos[1] + dc}`)
      return n
    })
  }, [pos])

  const finish = useCallback(
    (b: number) => {
      const stars = starsFor(b)
      setDone(stars)
      playSound('levelup')
      reportBestRun({ kind: 'challenge', id: mission.id, stars, score: stars })
      if (partner.id && partner.id !== me.id) addTogetherCredit(partner.id, { id: mission.id, stars })
    },
    [mission.id, partner.id, me.id],
  )

  const move = useCallback(
    (d: Dir) => {
      if (done !== null || mapOpen) return
      const [dr, dc] = DIRS[d]
      const r = pos[0] + dr
      const c = pos[1] + dc
      const cell = r < 0 || c < 0 || r >= N || c >= N ? '#' : cellAt(mission, r, c)
      if (cell === '#') {
        const b = bumps + 1
        setBumps(b)
        setSay(`Bonk! ${r < 0 || c < 0 || r >= N || c >= N ? 'That is the edge.' : `A ${mission.rock} is in the way.`} ${navigator.name}, check the map.`)
        playSound('wrong')
        if (!reduced) {
          setShake(true)
          window.setTimeout(() => setShake(false), 250)
        }
        return
      }
      setPos([r, c])
      playSound('click')
      const key = `${r},${c}`
      let nowGot = got
      if (cell === '*' && !got.includes(key)) {
        nowGot = [...got, key]
        setGot(nowGot)
        playSound('star')
        setSay(nowGot.length < allSamples.length ? `Got one ${mission.sample}! One more to find.` : `Both ${mission.sample} found! Now back to ${mission.base}.`)
      } else if (cell === 'G' && nowGot.length < allSamples.length) {
        setSay(`This is ${mission.base}, but you still need ${allSamples.length - nowGot.length} more ${mission.sample}.`)
      } else if (cell !== 'G') {
        setSay(`${driver.name} is driving. ${navigator.name}, what next?`)
      }
      if (cell === 'G' && nowGot.length === allSamples.length) finish(bumps)
    },
    [done, mapOpen, pos, mission, bumps, navigator.name, driver.name, reduced, got, allSamples.length, finish],
  )

  // Keyboard: arrow keys drive (for the driver on a laptop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
      const d = map[e.key]
      if (!d) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      e.preventDefault()
      move(d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  const restart = () => {
    setPos(startOf(mission))
    setSeen(new Set())
    setGot([])
    setBumps(0)
    setPeeks(0)
    setMapOpen(false)
    setDone(null)
    setSay(`${navigator.name}, open the map and tell ${driver.name} the way.`)
  }

  return (
    <section className="space-y-4" aria-label={`${mission.title}: play together`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">
          <span aria-hidden>{mission.emoji}</span> {mission.title}
        </h2>
        <p className="text-base text-[#A7B0C0]">
          {mission.sample} {got.length}/{allSamples.length} · Bumps {bumps}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* The board */}
        <div
          className={`relative mx-auto grid w-full max-w-[420px] grid-cols-7 gap-1 rounded-[20px] border border-white/10 bg-[#111C32] p-2 ${shake ? 'translate-x-1' : ''} transition-transform motion-reduce:transition-none`}
          role="img"
          aria-label={mapOpen ? `Map open. Robot at row ${pos[0] + 1}, column ${pos[1] + 1}.` : `Driver view. Robot at row ${pos[0] + 1}, column ${pos[1] + 1}.`}
        >
          {Array.from({ length: N * N }, (_, i) => {
            const r = Math.floor(i / N)
            const c = i % N
            const k = `${r},${c}`
            const cell = cellAt(mission, r, c)
            const visible = mapOpen || seen.has(k)
            const robot = pos[0] === r && pos[1] === c
            let content = ''
            if (robot) content = '🤖'
            else if (visible) content = cell === '#' ? mission.rock : cell === '*' && !got.includes(k) ? mission.sample : cell === 'G' ? mission.base : ''
            return (
              <span
                key={k}
                aria-hidden
                className={`grid aspect-square place-items-center rounded-lg text-[clamp(1rem,6vw,1.8rem)] ${visible ? (cell === '#' ? 'bg-[#19263F]' : 'bg-[#0A1120]') : 'bg-[#05080F]'} ${robot ? 'ring-2 ring-amber-400' : ''}`}
              >
                {content}
              </span>
            )
          })}
          {done !== null && (
            <div className="absolute inset-0 grid place-items-center rounded-[20px] bg-[#0A1120]/90 p-4 text-center" role="status">
              <div>
                <p className="text-5xl" aria-hidden>{'⭐'.repeat(done)}</p>
                <p className="mt-2 font-display text-2xl font-bold text-[#EEF2F8]">Mission done, team!</p>
                <p className="mt-1 text-base text-[#A7B0C0]">
                  {bumps === 0 ? 'Zero bumps: perfect teamwork.' : `${bumps} bump${bumps === 1 ? '' : 's'}. Clear directions mean fewer bumps.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <p className="min-h-[3.5rem] rounded-2xl border border-white/10 bg-[#111C32] p-3 text-lg font-semibold text-[#EEF2F8]" aria-live="polite">
            {say}
          </p>

          {done === null ? (
            <>
              <div className="rounded-[20px] border border-cyan-400/30 bg-cyan-400/[0.06] p-3">
                <p className="text-sm font-bold uppercase tracking-wider text-cyan-200">
                  🗺️ Navigator: {navigator.picture} {navigator.name}
                </p>
                <button
                  type="button"
                  aria-pressed={mapOpen}
                  onClick={() => {
                    if (!mapOpen) setPeeks((n) => n + 1)
                    setMapOpen((o) => !o)
                    playSound('click')
                  }}
                  className={`mt-2 min-h-[52px] w-full rounded-2xl border border-cyan-400/50 bg-cyan-400/15 px-4 font-bold text-cyan-50 hover:bg-cyan-400/25 ${focus}`}
                >
                  {mapOpen ? 'Close the map (then say the way)' : 'Open the map'}
                </button>
                <p className="mt-1 text-sm text-[#A7B0C0]">Map opened {peeks} time{peeks === 1 ? '' : 's'}.</p>
              </div>

              <div className="rounded-[20px] border border-amber-400/30 bg-amber-400/[0.06] p-3">
                <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  🕹️ Driver: {driver.picture} {driver.name}
                </p>
                {mapOpen ? (
                  <p className="mt-2 rounded-2xl bg-[#0A1120] p-3 text-base text-[#A7B0C0]">Wait: the navigator is reading the map. Listen!</p>
                ) : (
                  <div className="mx-auto mt-2 grid w-[216px] grid-cols-3 gap-2">
                    <span />
                    <Arrow label="Up" glyph="⬆️" onPress={() => move('up')} />
                    <span />
                    <Arrow label="Left" glyph="⬅️" onPress={() => move('left')} />
                    <span />
                    <Arrow label="Right" glyph="➡️" onPress={() => move('right')} />
                    <span />
                    <Arrow label="Down" glyph="⬇️" onPress={() => move('down')} />
                    <span />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  onSwap()
                }}
                className={`min-h-[52px] rounded-2xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}
              >
                🔁 Swap jobs and play again
              </button>
              <button type="button" onClick={restart} className={`min-h-[52px] rounded-2xl border border-white/15 bg-[#19263F] px-5 font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>
                Same jobs again
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onExit} className={`min-h-[48px] rounded-2xl px-4 font-bold text-[#A7B0C0] hover:text-white ${focus}`}>
              ← Other missions
            </button>
            <Link href="/kids" className={`inline-flex min-h-[48px] items-center rounded-2xl px-4 font-bold text-[#A7B0C0] hover:text-white ${focus}`}>
              Home
            </Link>
          </div>
          {partner.id && partner.id !== me.id && done !== null && (
            <p className="text-sm text-[#A7B0C0]">
              {partner.name}&rsquo;s stars are saved too: they get them on their next turn.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Arrow({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={`grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-[#19263F] text-3xl shadow-[0_8px_24px_rgba(0,0,0,.45)] active:scale-[.97] motion-reduce:transform-none ${focus}`}
    >
      <span aria-hidden>{glyph}</span>
    </button>
  )
}
