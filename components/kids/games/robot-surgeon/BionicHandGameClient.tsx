'use client'

// components/kids/games/robot-surgeon/BionicHandGameClient.tsx
// ACE — Bionic Hand: tune how a prosthetic hand turns a noisy muscle signal
// (EMG) into grip commands. Try it with your own "squeezes", then run a
// morning of real tasks and see how well the hand obeys. Model in ./emg.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { COL, fitCanvas, useSimLoop } from './shared'
import {
  DEFAULT_SETTINGS,
  FS,
  SCRIPT,
  SCRIPT_END,
  SLUGGISH_S,
  emgAccuracy,
  emgResponse,
  emgStars,
  intentAt,
  makeEmg,
  scriptActivation,
  stepEmg,
  type EmgSettings,
  type EmgState,
  type Grip,
} from './emg'
import { Debrief, GhostButton, HoldButton, Panel, PrimaryButton, Slider, Stat, type DebriefLine } from './UiClient'

type Mode = 'try' | 'test' | 'debrief'

const GRIP_LABEL: Record<Grip, string> = { open: 'Open', pinch: 'Pinch', power: 'Power grip' }

function HandSvg({ grip }: { grip: Grip }) {
  // Finger curl: open 0°, pinch: index+thumb meet, power: all fingers wrap.
  const curl = grip === 'open' ? 0 : grip === 'pinch' ? 1 : 2
  const finger = (x: number, len: number, i: number) => {
    const bend = curl === 2 ? 70 : curl === 1 && i < 2 ? 55 : curl === 1 ? 15 : 0
    return (
      <g key={x} transform={`translate(${x} 62)`}>
        <g style={{ transition: 'transform 180ms cubic-bezier(.22,.61,.36,1)' }} transform={`rotate(${bend * 0.5})`}>
          <rect x={-6} y={-len / 2} width={12} height={len / 2} rx={6} fill="#D9E2F1" />
          <g transform={`translate(0 ${-len / 2}) rotate(${bend * 0.5})`}>
            <rect x={-6} y={-len / 2} width={12} height={len / 2 + 4} rx={6} fill="#B8C4D8" />
          </g>
        </g>
      </g>
    )
  }
  return (
    <svg viewBox="0 0 160 170" className="h-full w-full" aria-hidden>
      <rect x="38" y="60" width="84" height="70" rx="22" fill="#2B3B5C" stroke="#FC6818" strokeWidth="3" />
      <rect x="54" y="128" width="52" height="34" rx="10" fill="#19263F" stroke="rgba(255,255,255,.2)" />
      <circle cx="80" cy="145" r="5" fill={grip === 'open' ? '#6E7888' : '#00E5FF'} />
      {[52, 70, 88, 106].map((x, i) => finger(x, [52, 60, 58, 48][i], i))}
      <g transform="translate(40 100)">
        <g style={{ transition: 'transform 180ms cubic-bezier(.22,.61,.36,1)' }} transform={`rotate(${curl === 0 ? -40 : curl === 1 ? 10 : 25})`}>
          <rect x={-34} y={-7} width={36} height={14} rx={7} fill="#D9E2F1" />
        </g>
      </g>
    </svg>
  )
}

export default function BionicHandGameClient({ onFinish }: { onFinish: (r: RoundResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [settings, setSettings] = useState<EmgSettings>(DEFAULT_SETTINGS)
  const sim = useRef<EmgState>(makeEmg(DEFAULT_SETTINGS))
  const [mode, setMode] = useState<Mode>('try')
  const squeeze = useRef(0) // target activation while trying
  const act = useRef(0)
  const carry = useRef(0)
  const [hud, setHud] = useState<{ grip: Grip; env: number; t: number; task: string; icon: string; intent: Grip }>({ grip: 'open', env: 0, t: 0, task: '', icon: '🖐️', intent: 'open' })
  const lastGrip = useRef<Grip>('open')

  const update = (patch: Partial<EmgSettings>) => {
    if (mode !== 'try') return
    const next = { ...settings, ...patch }
    if (next.powerAt < next.pinchAt + 5) next.powerAt = Math.min(100, next.pinchAt + 5)
    setSettings(next)
    sim.current = makeEmg(next, 3 + Math.round(Math.random() * 1000))
  }

  const step = useCallback(
    (dt: number) => {
      const s = sim.current
      carry.current += dt * FS
      const n = Math.floor(carry.current)
      carry.current -= n
      if (mode === 'try') {
        // muscles tighten and relax over ~0.15 s
        act.current += (squeeze.current - act.current) * Math.min(1, dt / 0.08)
        const a = act.current
        stepEmg(s, n, (t) => a * (1 + 0.06 * Math.sin(t * 3)), false)
      } else if (mode === 'test') {
        stepEmg(s, n, scriptActivation, true)
        if (s.t >= SCRIPT_END) {
          playSound(emgStars(s) > 0 ? 'star' : 'wrong')
          setMode('debrief')
        }
      }
      if (s.grip !== lastGrip.current) {
        lastGrip.current = s.grip
        playSound('click')
      }
    },
    [mode],
  )

  const draw = useCallback(() => {
    const f = fitCanvas(canvas.current)
    if (!f) return
    const { ctx, w, h } = f
    const s = sim.current
    ctx.fillStyle = '#0E1830'
    ctx.fillRect(0, 0, w, h)
    const top = 8
    const rawH = h * 0.34
    const envTop = top + rawH + 14
    const envH = h - envTop - 22
    // raw EMG
    ctx.fillStyle = COL.text3
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('RAW MUSCLE SIGNAL (EMG)', 10, top + 10)
    const n = s.rawHist.length
    const N = (FS * 4) / 4
    const dx = w / N
    ctx.strokeStyle = 'rgba(167,176,192,.65)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = (N - n + i) * dx
      const y = top + rawH / 2 - Math.max(-1, Math.min(1, s.rawHist[i] / 1.2)) * (rawH / 2 - 4)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    // envelope panel
    const Y = (v: number) => envTop + envH - (Math.min(100, v) / 100) * envH
    ctx.fillStyle = 'rgba(255,255,255,.03)'
    ctx.fillRect(0, envTop, w, envH)
    const band = (v: number, colour: string, label: string) => {
      const hh = settings.hyst / 2
      ctx.fillStyle = colour.replace('1)', '.14)')
      ctx.fillRect(0, Y(v + hh), w, Math.max(1, Y(v - hh) - Y(v + hh)))
      ctx.strokeStyle = colour
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(0, Y(v))
      ctx.lineTo(w, Y(v))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = colour
      ctx.textAlign = 'right'
      ctx.fillText(`${label} ${v}%`, w - 6, Y(v) - 4)
    }
    band(settings.pinchAt, 'rgba(0,229,255,1)', 'pinch')
    band(settings.powerAt, 'rgba(252,104,24,1)', 'power')
    // grip strip under the envelope
    for (let i = 0; i < n; i++) {
      const g = s.gripHist[i]
      if (g === 'open') continue
      ctx.fillStyle = g === 'pinch' ? 'rgba(0,229,255,.55)' : 'rgba(252,104,24,.7)'
      ctx.fillRect((N - n + i) * dx, h - 14, dx + 0.5, 8)
    }
    ctx.strokeStyle = '#FFA878'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = (N - n + i) * dx
      const y = Y(s.envHist[i])
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = COL.text3
    ctx.textAlign = 'left'
    ctx.fillText('ENVELOPE (smoothed, % of max)', 10, envTop + 12)
    ctx.fillText('HAND', 10, h - 4)
  }, [settings])

  useSimLoop(mode !== 'debrief', step, draw, 60)

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = sim.current
      const seg = intentAt(s.t)
      setHud({ grip: s.grip, env: s.env, t: s.t, task: seg.task, icon: seg.icon, intent: seg.intent })
    }, 120)
    return () => window.clearInterval(id)
  }, [])

  // Keyboard: hold P (pinch squeeze) or G (strong squeeze) while trying.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (mode !== 'try' || e.repeat) return
      if (e.code === 'KeyP') squeeze.current = 0.36
      if (e.code === 'KeyG') squeeze.current = 0.72
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'KeyG') squeeze.current = 0.05
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [mode])

  const startTest = () => {
    squeeze.current = 0.05
    sim.current = makeEmg(settings)
    lastGrip.current = 'open'
    setMode('test')
    playSound('click')
  }

  const s = sim.current
  const finish = () => {
    const stars = emgStars(s)
    onFinish({
      stars,
      score: Math.round(emgAccuracy(s) * 1000) / 10,
      scoreLabel: '% of the morning the hand obeyed',
      message:
        stars > 0
          ? `The hand did what its owner meant ${Math.round(emgAccuracy(s) * 100)}% of the time, answering in ${(emgResponse(s) * 1000).toFixed(0)} ms on average.`
          : 'The hand often did something its owner did not mean. Look at where the envelope sits for relaxed, pinch and power, and put each threshold in a gap.',
      badges: stars === 3 ? ['decision-maker'] : undefined,
    })
  }

  const debrief = (): DebriefLine[] => {
    const resp = emgResponse(s)
    const lines: DebriefLine[] = [
      { icon: '🎯', text: `The hand matched what its owner meant ${Math.round(emgAccuracy(s) * 100)}% of the time (the first ${0.35} s after each change is not counted — muscles and motors need a moment).` },
    ]
    lines.push(
      s.drops
        ? { icon: '💧', text: `It dropped something ${s.drops} time${s.drops === 1 ? '' : 's'}: the envelope dipped under the pinch line while holding. Hysteresis (a band around each line) or more smoothing stops these dips from counting.` }
        : { icon: '💧', text: 'It never dropped anything — the envelope stayed above the line while holding.' },
    )
    lines.push(
      s.falseGrabs
        ? { icon: '⚡', text: `It grabbed by itself ${s.falseGrabs} time${s.falseGrabs === 1 ? '' : 's'} while its owner was relaxed — bumps of the arm made short spikes. A longer smoothing window flattens short spikes; a higher pinch line ignores them.` }
        : { icon: '⚡', text: 'Bumps of the arm did not fool it: no grabs while relaxed.' },
    )
    if (s.wrongGrip > FS * 0.5) lines.push({ icon: '✊', text: 'Sometimes it pinched when power was meant, or the other way round. Put the power line in the gap between a pinch squeeze (about 36%) and a strong squeeze (about 72%).' })
    lines.push(
      resp > SLUGGISH_S
        ? { icon: '🐌', text: `It answered in ${(resp * 1000).toFixed(0)} ms on average — sluggish. The longer the smoothing window, the slower the hand. Find the shortest window that still ignores the bumps.` }
        : { icon: '⚡', text: `It answered in ${(resp * 1000).toFixed(0)} ms on average — quick enough to feel natural.` },
    )
    return lines
  }

  const testing = mode === 'test'

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
          <canvas ref={canvas} className="h-[260px] w-full rounded-[28px] border border-white/10 sm:h-[320px]" role="img" aria-label={`Muscle signal graph. Envelope ${Math.round(hud.env)}%. Hand: ${GRIP_LABEL[hud.grip]}.`} />
          <div className="flex flex-col items-center justify-between rounded-[28px] border border-white/10 bg-[#111C32] p-2">
            <p className="text-center text-[12px] font-bold uppercase tracking-wide text-[#6E7888]">Bionic hand</p>
            <div className="h-[130px] w-full sm:h-[170px]">
              <HandSvg grip={hud.grip} />
            </div>
            <p className={`font-display text-base font-bold ${hud.grip === 'open' ? 'text-[#EEF2F8]' : hud.grip === 'pinch' ? 'text-cyan-300' : 'text-amber-300'}`} aria-live="polite">
              {GRIP_LABEL[hud.grip]}
            </p>
          </div>
        </div>
        {mode === 'try' && (
          <Panel>
            <p className="text-[15px] leading-snug text-[#EEF2F8]">
              <b>Be the muscle.</b> Hold a squeeze button and watch the raw signal grow, the orange envelope rise and the hand respond.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <HoldButton label="Pinch squeeze" className="flex-1 px-3 text-base" onChange={(d) => (squeeze.current = d ? 0.36 : 0.05)}>
                🤏 Pinch squeeze <span className="ml-1 text-xs text-[#A7B0C0]">(P)</span>
              </HoldButton>
              <HoldButton label="Strong squeeze" className="flex-1 px-3 text-base" onChange={(d) => (squeeze.current = d ? 0.72 : 0.05)}>
                ✊ Strong squeeze <span className="ml-1 text-xs text-[#A7B0C0]">(G)</span>
              </HoldButton>
            </div>
            <PrimaryButton className="mt-3 w-full" onClick={startTest}>
              Run the morning test (24 s) →
            </PrimaryButton>
          </Panel>
        )}
        {testing && (
          <Panel>
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {hud.icon}
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#6E7888]">Its owner wants to</p>
                <p className="font-display text-lg font-bold text-[#EEF2F8]">
                  {hud.task} → <span className={hud.intent === 'pinch' ? 'text-cyan-300' : hud.intent === 'power' ? 'text-amber-300' : 'text-[#EEF2F8]'}>{GRIP_LABEL[hud.intent]}</span>
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${hud.grip === hud.intent ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>{hud.grip === hud.intent ? '✓ obeying' : '✗ not yet'}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (hud.t / SCRIPT_END) * 100)}%` }} />
            </div>
          </Panel>
        )}
        {mode === 'debrief' && <Debrief title={emgStars(s) > 0 ? 'Morning complete' : 'The hand needs tuning'} good={emgStars(s) > 0} lines={debrief()} onContinue={finish} />}
      </div>

      <div className="flex flex-col gap-3">
        <Panel>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Envelope" value={`${Math.round(hud.env)}%`} />
            <Stat label={testing ? 'Obeyed so far' : 'Hand'} value={testing ? `${Math.round(emgAccuracy(s) * 100)}%` : GRIP_LABEL[hud.grip]} />
          </div>
        </Panel>
        <Panel title="Controller settings">
          <div className="flex flex-col gap-3">
            <Slider id="emg-pinch" label="Pinch line" unit="%" min={5} max={90} step={1} value={settings.pinchAt} disabled={mode !== 'try'} onChange={(v) => update({ pinchAt: v })} hint="Envelope above this → pinch." />
            <Slider id="emg-power" label="Power line" unit="%" min={10} max={100} step={1} value={settings.powerAt} disabled={mode !== 'try'} onChange={(v) => update({ powerAt: v })} hint="Envelope above this → power grip." />
            <Slider id="emg-hyst" label="Hysteresis band" unit="%" min={0} max={20} step={1} value={settings.hyst} disabled={mode !== 'try'} onChange={(v) => update({ hyst: v })} hint="Switch on at line + half the band, off at line − half." />
            <Slider id="emg-win" label="Smoothing window" unit="ms" min={20} max={400} step={10} value={settings.windowMs} disabled={mode !== 'try'} onChange={(v) => update({ windowMs: v })} hint="Longer = smoother, but slower to react." />
            {mode === 'try' && (
              <GhostButton onClick={() => update({ ...DEFAULT_SETTINGS })} className="text-sm">
                Reset to factory settings
              </GhostButton>
            )}
          </div>
        </Panel>
        <Panel>
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#6E7888]">The morning test</p>
          <ul className="mt-1 flex flex-wrap gap-1 text-xl" aria-label="Tasks in the morning test">
            {SCRIPT.segs
              .filter((x) => x.intent !== 'open')
              .map((x) => (
                <li key={x.from} title={x.task}>
                  {x.icon}
                </li>
              ))}
          </ul>
          <p className="mt-1 text-[13px] leading-snug text-[#A7B0C0]">Grapes and pens need a pinch; a bottle and a door handle need a power grip. Watch out: the arm gets bumped a few times while relaxed.</p>
        </Panel>
      </div>
    </div>
  )
}
