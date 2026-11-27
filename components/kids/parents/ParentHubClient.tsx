'use client'

// components/kids/parents/ParentHubClient.tsx — the parent hub (/kids/parents),
// shown only after the parental gate.
//
// Everything here is read from, or written to, THIS DEVICE: the progress store
// (lib/kids-progress.ts), Skill Galaxy results (lib/kids/activities/progress.ts),
// the child's robot (lib/kids/robot-design.ts) and the parent controls
// (lib/kids/parent-controls.ts). Nothing about the child is fetched or sent.
// The one network call is the optional weekly email, which the PARENT types,
// through /api/leads → captureLead() (lib/lead-capture.ts).

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { KIDS_PROGRESS_EVENT, collectedStars, getProgress, resetProgress, type KidsProgress } from '@/lib/kids-progress'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { getBadge, levelInfo } from '@/lib/kids/universe/rewards'
import { getPart, loadDesign, ROBOT_CHANGED_EVENT, type RobotDesign, type Slot } from '@/lib/kids/robot-design'
import {
  DAILY_MINUTE_CHOICES,
  updateParentControls,
  useKidsUsage,
  useParentControls,
} from '@/lib/kids/parent-controls'

export interface HubSession {
  id: string
  number: number
  title: string
  badgeId: string
  badgeName: string
  badgeIcon: string
  today: string
  tryAtHome: string
}

export interface HubTrack {
  id: string
  name: string
  icon: string
  total: number
}

export interface ParentHubProps {
  sessions: HubSession[]
  tracks: HubTrack[]
  /** Activity id → index into `tracks`. */
  activityTrack: Record<string, number>
}

const DAY = 86_400_000

/** Screen-free ideas with examples from anywhere in the world. */
const HOME_IDEAS = [
  { title: 'Sensor I-spy', body: 'Walk round your home or street and find five sensors: an automatic door, a phone that turns its screen sideways, a motion light, a lift button, a thermostat. Ask: what does each one feel, and what does it do next?' },
  { title: 'Direction robot', body: 'One person is the robot (eyes closed). The other gives only exact commands, such as "forward 3 steps" or "turn right", to reach a cushion. No pointing, no "over there". That is programming.' },
  { title: 'IF–THEN dinner game', body: 'Take turns saying a rule: "IF I clap, THEN you touch your nose." Add an ELSE when it gets easy. Robots run on rules like these.' },
  { title: 'Robot recipe', body: 'Ask your child to write the steps to make a sandwich or a bowl of cereal for a robot that does exactly what it reads. Follow them literally. Missing steps are bugs!' },
  { title: 'Take it apart', body: 'With supervision, open an old toy or torch. Find the four robot parts: something that senses, something that decides, something that moves, and the battery.' },
]

function inLastWeek(iso: string, now: number): boolean {
  const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  return Number.isFinite(t) && t > now - 7 * DAY && t <= now + DAY
}

/** "you made a robot move" → "made a robot move" (said about the child). */
function plain(earnedFor: string): string {
  return earnedFor
    .replace(/^you\s+/i, '')
    .replace(/\byour own\b/gi, 'their own')
    .replace(/\byour\b/gi, 'their')
    .replace(/\byou\b/gi, 'they')
    .replace(/\.$/, '')
}

interface Snap {
  p: KidsProgress
  acts: ActivitiesDone
  robot: RobotDesign
  now: number
}

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'body', label: 'Body' },
  { slot: 'drive', label: 'Moves on' },
  { slot: 'head', label: 'Head' },
  { slot: 'sensor', label: 'Sensor' },
  { slot: 'tool', label: 'Tool' },
]

const card = 'rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl'
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function ParentHubClient({ sessions, tracks, activityTrack }: ParentHubProps) {
  const [snap, setSnap] = useState<Snap | null>(null)

  useEffect(() => {
    const read = () => setSnap({ p: getProgress(), acts: getActivitiesDone(), robot: loadDesign(), now: Date.now() })
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener(ROBOT_CHANGED_EVENT, read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener(ROBOT_CHANGED_EVENT, read)
    }
  }, [])

  const view = useMemo(() => {
    if (!snap) return null
    const { p, acts, now } = snap
    const byBadge = new Map(sessions.map((s) => [s.badgeId, s]))
    const learned: { key: string; icon: string; text: string; sub?: string }[] = []
    const sessionsThisWeek: HubSession[] = []
    for (const [id, date] of Object.entries(p.badges ?? {})) {
      if (!inLastWeek(date, now)) continue
      const s = byBadge.get(id)
      if (s) {
        sessionsThisWeek.push(s)
        learned.push({ key: id, icon: s.badgeIcon, text: `Session ${s.number}: ${s.title}`, sub: s.today })
        continue
      }
      const b = getBadge(id)
      if (b) learned.push({ key: id, icon: b.icon, text: `${b.name}: they ${plain(b.earnedFor)}.` })
    }
    sessionsThisWeek.sort((a, b) => a.number - b.number)

    const trackDone = tracks.map(() => 0)
    const trackWeek = tracks.map(() => 0)
    let activitiesWeek = 0
    for (const [id, r] of Object.entries(acts)) {
      const ti = activityTrack[id]
      const recent = Boolean(r.at && inLastWeek(r.at, now))
      if (recent) activitiesWeek += 1
      if (ti === undefined) continue
      trackDone[ti] += 1
      if (recent) trackWeek[ti] += 1
    }
    for (let i = 0; i < tracks.length; i++) {
      if (trackWeek[i] > 0) {
        learned.push({
          key: `track-${tracks[i].id}`,
          icon: tracks[i].icon,
          text: `${trackWeek[i]} Skill Galaxy ${trackWeek[i] === 1 ? 'activity' : 'activities'} in ${tracks[i].name}`,
        })
      }
    }

    const doneSessions = sessions.filter((s) => (p.sessionsDone?.[s.id] ?? 0) > 0)
    const latest = sessionsThisWeek[sessionsThisWeek.length - 1] ?? doneSessions[doneSessions.length - 1] ?? null
    const fallback = HOME_IDEAS[Math.floor(now / DAY) % HOME_IDEAS.length]
    const idea = latest ? { title: `After “${latest.title}”`, body: latest.tryAtHome } : fallback

    return {
      name: p.explorerName || 'Your child',
      level: levelInfo(p.xp ?? 0),
      stars: collectedStars(p),
      days: (p.playDays ?? []).filter((d) => inLastWeek(d, now)).length,
      sessionsDone: doneSessions.length,
      activitiesWeek,
      activitiesTotal: Object.keys(acts).length,
      learned,
      trackDone,
      idea,
      empty: learned.length === 0,
    }
  }, [snap, sessions, tracks, activityTrack])

  return (
    <div id="parent-hub" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Parent hub</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
            {view ? `${view.name === 'Your child' ? 'Your child’s' : `${view.name}’s`} week` : 'This week'}
          </h2>
          <p className="mt-1 text-sm text-[#A7B0C0]">From progress saved on this device. Nothing about your child leaves it.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={`min-h-[48px] rounded-2xl border border-white/15 bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>
            Print
          </button>
          <Link href="/kids" className={`inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}>
            Done: back to Kids
          </Link>
        </div>
      </div>

      {/* At a glance */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Days explored', view ? `${view.days} of 7` : '–'],
          ['Course sessions', view ? `${view.sessionsDone} of ${sessions.length}` : '–'],
          ['Activities this week', view ? String(view.activitiesWeek) : '–'],
          ['Explorer level', view ? `${view.level.level} · ${view.level.title}` : '–'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-[#A7B0C0]">{k}</dt>
            <dd className="mt-1 font-display text-lg font-bold text-[#EEF2F8] sm:text-xl">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Learned this week */}
        <section aria-labelledby="hub-learned" className={card}>
          <h2 id="hub-learned" className={h2}>What they learned this week</h2>
          {!view ? (
            <div className="mt-4 h-24 rounded-2xl bg-white/5" aria-hidden />
          ) : view.empty ? (
            <p className="mt-3 text-[15px] leading-relaxed text-[#A7B0C0]">
              Nothing new on this device in the last seven days, and that is fine. A good start is the first course session, best done together:{' '}
              <Link href="/kids/course/1/1" className={`font-semibold text-amber-300 underline-offset-2 hover:underline ${focus}`}>open Session 1</Link>.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {view.learned.slice(0, 12).map((l) => (
                <li key={l.key} className="flex gap-3 rounded-2xl bg-[#0A1120]/60 p-3">
                  <span aria-hidden className="text-2xl leading-none">{l.icon}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-[#EEF2F8]">{l.text}</span>
                    {l.sub && <span className="mt-0.5 block text-sm leading-relaxed text-[#A7B0C0]">{l.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Try at home */}
        <section aria-labelledby="hub-home" className={`${card} border-amber-400/30`}>
          <h2 id="hub-home" className={h2}>Try this at home</h2>
          {view ? (
            <>
              <p className="mt-3 font-display text-lg font-bold text-amber-300">{view.idea.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[#EEF2F8]">{view.idea.body}</p>
              <p className="mt-3 text-sm text-[#A7B0C0]">About 10 minutes, no screen needed. More ideas in <Link href="/kids/activities" className={`font-semibold text-amber-300 hover:underline ${focus}`}>Make at Home</Link>.</p>
            </>
          ) : (
            <div className="mt-4 h-24 rounded-2xl bg-white/5" aria-hidden />
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Galaxy tracks */}
        <section aria-labelledby="hub-tracks" className={card}>
          <h2 id="hub-tracks" className={h2}>Skill Galaxy tracks</h2>
          <p className="mt-1 text-sm text-[#A7B0C0]">Activities finished in each of the ten tracks (all age groups).</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {tracks.map((t, i) => {
              const done = view?.trackDone[i] ?? 0
              const pct = t.total ? Math.min(100, Math.round((100 * done) / t.total)) : 0
              return (
                <li key={t.id} className="rounded-2xl bg-[#0A1120]/60 p-3">
                  <p className="flex items-center justify-between gap-2 text-sm font-semibold text-[#EEF2F8]">
                    <span><span aria-hidden>{t.icon} </span>{t.name}</span>
                    <span className="text-[#A7B0C0]">{done} / {t.total}</span>
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-white/10" role="progressbar" aria-label={`${t.name}: ${done} of ${t.total}`} aria-valuemin={0} aria-valuemax={t.total} aria-valuenow={done}>
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Robot */}
        <section aria-labelledby="hub-robot" className={card}>
          <h2 id="hub-robot" className={h2}>Their robot</h2>
          {snap ? (
            <>
              <p className="mt-2 font-display text-lg font-bold text-amber-300">{snap.robot.name}</p>
              <ul className="mt-3 space-y-2">
                {SLOTS.map(({ slot, label }) => {
                  const part = getPart(slot, snap.robot[slot])
                  if (!part || part.id === 'none') return null
                  return (
                    <li key={slot} className="flex gap-3 rounded-2xl bg-[#0A1120]/60 p-3">
                      <span aria-hidden className="text-2xl leading-none">{part.emoji}</span>
                      <span>
                        <span className="block text-sm font-semibold text-[#EEF2F8]">{label}: {part.name}</span>
                        <span className="block text-sm leading-snug text-[#A7B0C0]">{part.withIt}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-sm text-[#A7B0C0]">
                {view ? `${view.stars} stars collected. ` : ''}Ask them to show you the robot in the{' '}
                <Link href="/kids/hangar" className={`font-semibold text-amber-300 hover:underline ${focus}`}>Hangar</Link>.
              </p>
            </>
          ) : (
            <div className="mt-4 h-32 rounded-2xl bg-white/5" aria-hidden />
          )}
        </section>
      </div>

      <ControlsCard />
      <WeeklyEmailCard />
      <DeviceDataCard onReset={() => setSnap((s) => (s ? { ...s, p: getProgress(), acts: getActivitiesDone() } : s))} />
    </div>
  )
}

// ── Controls ────────────────────────────────────────────────────────────────

function Toggle({ id, label, line, checked, onChange }: { id: string; label: string; line: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#0A1120]/60 p-3">
      <span>
        <span id={`${id}-l`} className="block font-semibold text-[#EEF2F8]">{label}</span>
        <span id={`${id}-d`} className="block text-sm leading-snug text-[#A7B0C0]">{line}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-11 w-[76px] shrink-0 items-center rounded-full border transition-colors ${checked ? 'border-amber-400 bg-amber-500' : 'border-white/20 bg-[#19263F]'} ${focus}`}
      >
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        <span aria-hidden className={`absolute left-1 h-9 w-9 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-[32px]' : ''}`} />
      </button>
    </div>
  )
}

function ControlsCard() {
  const c = useParentControls()
  const usage = useKidsUsage()
  const [saved, setSaved] = useState('')
  const minutesToday = Math.floor(usage.seconds / 60)
  const save = (msg: string) => {
    setSaved(msg)
    window.setTimeout(() => setSaved(''), 2500)
  }

  return (
    <section aria-labelledby="hub-controls" className={`${card} print:hidden`}>
      <h2 id="hub-controls" className={h2}>Controls on this device</h2>
      <p className="mt-1 text-sm text-[#A7B0C0]">
        Saved on this device only. Time limits are gentle: your child sees a kind “time for a break” message and is never cut off in the middle of an activity.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-[#0A1120]/60 p-3">
          <label htmlFor="hub-budget" className="block font-semibold text-[#EEF2F8]">Daily time</label>
          <p className="text-sm text-[#A7B0C0]">Played today on this device: {minutesToday} {minutesToday === 1 ? 'minute' : 'minutes'}.</p>
          <select
            id="hub-budget"
            value={c.dailyMinutes}
            onChange={(e) => { updateParentControls({ dailyMinutes: Number(e.target.value) }); save('Daily time saved') }}
            className={`mt-2 min-h-[48px] w-full rounded-2xl border border-white/15 bg-[#19263F] px-3 text-base text-[#EEF2F8] ${focus}`}
          >
            {DAILY_MINUTE_CHOICES.map((m) => (
              <option key={m} value={m}>{m === 0 ? 'No daily limit' : m < 60 ? `${m} minutes a day` : `${m / 60} ${m === 60 ? 'hour' : 'hours'} a day`}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-[#0A1120]/60 p-3">
          <div className="flex items-center justify-between gap-4">
            <span>
              <span id="hub-quiet-l" className="block font-semibold text-[#EEF2F8]">Quiet hours</span>
              <span className="block text-sm text-[#A7B0C0]">A “time to rest” message between these times.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={c.quietHours.on}
              aria-labelledby="hub-quiet-l"
              onClick={() => { updateParentControls({ quietHours: { ...c.quietHours, on: !c.quietHours.on } }); save('Quiet hours saved') }}
              className={`relative inline-flex h-11 w-[76px] shrink-0 items-center rounded-full border transition-colors ${c.quietHours.on ? 'border-amber-400 bg-amber-500' : 'border-white/20 bg-[#19263F]'} ${focus}`}
            >
              <span className="sr-only">{c.quietHours.on ? 'On' : 'Off'}</span>
              <span aria-hidden className={`absolute left-1 h-9 w-9 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${c.quietHours.on ? 'translate-x-[32px]' : ''}`} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['start', 'end'] as const).map((k) => (
              <label key={k} className="text-sm font-semibold text-[#A7B0C0]">
                {k === 'start' ? 'From' : 'Until'}
                <input
                  type="time"
                  value={c.quietHours[k]}
                  disabled={!c.quietHours.on}
                  onChange={(e) => { if (e.target.value) { updateParentControls({ quietHours: { ...c.quietHours, [k]: e.target.value } }); save('Quiet hours saved') } }}
                  className={`mt-1 block min-h-[48px] w-full rounded-2xl border border-white/15 bg-[#19263F] px-3 text-base text-[#EEF2F8] disabled:opacity-50 ${focus}`}
                />
              </label>
            ))}
          </div>
        </div>

        <Toggle
          id="hub-spark"
          label="Ask Spark"
          line="The robot helper that answers questions. Off swaps it for a “Need help?” button that still shows helplines."
          checked={c.askSpark}
          onChange={(v) => { updateParentControls({ askSpark: v }); save(`Ask Spark ${v ? 'on' : 'off'}`) }}
        />
        <Toggle
          id="hub-camera"
          label="Camera: Workshop AR and Vision Lab"
          line="“See it in my room” in the Workshop and “Use my camera” in the Vision Lab. The video never leaves the device."
          checked={c.camera}
          onChange={(v) => { updateParentControls({ camera: v }); save(`Camera ${v ? 'on' : 'off'}`) }}
        />
        <Toggle
          id="hub-links"
          label="Links that leave R2BOT Kids"
          line="When on, a grown-up still has to answer the sum first."
          checked={c.outboundLinks}
          onChange={(v) => { updateParentControls({ outboundLinks: v }); save(`Outside links ${v ? 'on' : 'off'}`) }}
        />
      </div>
      <p className="mt-3 min-h-[1.5rem] text-sm font-semibold text-emerald-300" role="status" aria-live="polite">{saved}</p>
    </section>
  )
}

// ── Weekly email (the parent's address, typed by the parent) ────────────────

function WeeklyEmailCard() {
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [agree, setAgree] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'pending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!agree) { setError('Please tick the box to confirm you are the parent or carer.'); setState('error'); return }
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'kids-parents', page: '/kids/parents', honeypot: hp, meta: { audience: 'kids-parent', list: 'weekly' } }),
      })
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; pending?: boolean; error?: string }
      if (!res.ok || !d.ok) {
        setState('error')
        setError(d.error || 'That did not work. Please check the address and try again.')
        return
      }
      setState(d.pending ? 'pending' : 'done')
    } catch {
      setState('error')
      setError('No connection. Please try again later.')
    }
  }

  return (
    <section aria-labelledby="hub-email" className={`${card} print:hidden`}>
      <h2 id="hub-email" className={h2}>A weekly email for you (optional)</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">
        R2BOT Weekly arrives on Fridays: one robotics idea to explore together, and what is new in R2BOT Kids. It is about robotics, not about your child: their progress never leaves this device. Unsubscribe in one click.
      </p>
      {state === 'pending' || state === 'done' ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 font-semibold text-emerald-200" role="status">
          {state === 'pending' ? 'Nearly done: check your inbox and tap the link to confirm your address.' : 'You are on the list. See you on Friday!'}
        </p>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3" noValidate>
          <label htmlFor="hub-email-in" className="block text-sm font-semibold text-[#EEF2F8]">Your email address (parent or carer)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="hub-email-in"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`min-h-[48px] flex-1 rounded-2xl border border-white/15 bg-[#19263F] px-4 text-base text-[#EEF2F8] placeholder:text-[#6E7888] ${focus}`}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={state === 'sending'} className={`min-h-[48px] rounded-2xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 disabled:opacity-60 ${focus}`}>
              {state === 'sending' ? 'Sending…' : 'Send me R2BOT Weekly'}
            </button>
          </div>
          {/* Honeypot: people never see or fill this. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="hub-email-hp">Leave this empty</label>
            <input id="hub-email-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <label className="flex min-h-[44px] items-start gap-3 text-sm text-[#A7B0C0]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-amber-500" />
            <span>I am the parent or carer, and I would like the weekly email. Please do not enter a child’s email address.</span>
          </label>
          <p className="min-h-[1.25rem] text-sm font-semibold text-rose-300" role="alert">{state === 'error' ? error : ''}</p>
        </form>
      )}
    </section>
  )
}

// ── Device data ─────────────────────────────────────────────────────────────

function DeviceDataCard({ onReset }: { onReset: () => void }) {
  const [msg, setMsg] = useState('')
  const reset = () => {
    if (!window.confirm('Reset your child’s progress on this device? Stars, badges, levels and completed sessions will be cleared. Save a backup code in the Hangar first if you may want it back.')) return
    resetProgress()
    onReset()
    setMsg('Progress reset on this device.')
  }
  return (
    <section aria-labelledby="hub-data" className={`${card} print:hidden`}>
      <h2 id="hub-data" className={h2}>Data on this device</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">
        Progress, the robot and these controls live in this browser. To move them to another device, use the backup code in the{' '}
        <Link href="/kids/hangar" className={`font-semibold text-amber-300 hover:underline ${focus}`}>Hangar</Link>. Accessibility and sound are in{' '}
        <Link href="/kids/settings" className={`font-semibold text-amber-300 hover:underline ${focus}`}>Settings</Link>.
      </p>
      <button type="button" onClick={reset} className={`mt-4 min-h-[48px] rounded-2xl border-2 border-rose-400/70 px-4 font-bold text-rose-200 hover:bg-rose-500/10 ${focus}`}>
        Reset progress on this device
      </button>
      <p className="mt-2 min-h-[1.25rem] text-sm font-semibold text-emerald-300" role="status">{msg}</p>
    </section>
  )
}
