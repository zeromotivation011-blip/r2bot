'use client'

// components/kids/three/WorkshopClient.tsx
// The 3D Robot Workshop UI. This file does not import three.js: the 3D view
// and the AR view are next/dynamic({ ssr: false }) behind a same-size
// skeleton, so the page's text and controls render on the server.

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  capabilitiesOf,
  decodeDesign,
  encodeDesign,
  getPart,
  loadDesign,
  partsForSlot,
  ROBOT_COLORS,
  saveDesign,
  DEFAULT_DESIGN,
  type RobotDesign,
  type Slot,
} from '@/lib/kids/robot-design'
import { CAPABILITY_LABEL, SLOT_LABEL, SLOT_ORDER } from '@/lib/kids/code-lab/labels'
import { getProgress, saveProgress } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { fireConfetti } from '@/components/kids/Confetti'
import type { DriveInput, WorkshopSceneApi } from './WorkshopSceneClient'

function SceneSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1B1035]">
      <div className="h-24 w-24 animate-pulse rounded-3xl bg-white/10" aria-hidden />
      <span className="sr-only">Loading the 3D workshop…</span>
    </div>
  )
}

const WorkshopScene = dynamic(() => import('./WorkshopSceneClient'), { ssr: false, loading: SceneSkeleton })
const ARView = dynamic(() => import('./ARViewClient'), { ssr: false })

type Toast = { text: string; tone: 'good' | 'info' }

export default function WorkshopClient() {
  const [design, setDesign] = useState<RobotDesign>(DEFAULT_DESIGN)
  const [readOnly, setReadOnly] = useState(false)
  const [slot, setSlot] = useState<Slot>('body')
  const [snap, setSnap] = useState<{ slot: Slot; n: number } | null>(null)
  const [driving, setDriving] = useState(false)
  const [inSand, setInSand] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [arOpen, setArOpen] = useState(false)
  const [vrSupported, setVrSupported] = useState(false)
  const [inVR, setInVR] = useState(false)
  const driveInput = useRef<DriveInput>({ up: false, down: false, left: false, right: false })
  const apiRef = useRef<WorkshopSceneApi | null>(null)
  const viewRef = useRef<HTMLDivElement>(null)

  // Load the saved robot, or a shared one from ?r=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('r')
    const shared = code ? decodeDesign(code) : null
    if (shared) {
      setDesign(shared)
      setReadOnly(true)
    } else {
      setDesign(loadDesign())
    }
  }, [])

  const flash = useCallback((text: string, tone: Toast['tone'] = 'good') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const choose = (s: Slot, id: string) => {
    if (readOnly || design[s] === id) return
    primeAudio()
    playSound('click')
    setDesign((d) => ({ ...d, [s]: id }))
    setSnap((p) => ({ slot: s, n: (p?.n ?? 0) + 1 }))
    setDirty(true)
  }

  const setColor = (which: 'primary' | 'accent', c: string) => {
    if (readOnly) return
    playSound('click')
    setDesign((d) => ({ ...d, [which]: c }))
    setDirty(true)
  }

  const save = () => {
    const clean = { ...design, name: design.name.trim().slice(0, 20) || DEFAULT_DESIGN.name }
    setDesign(clean)
    saveDesign(clean)
    saveProgress({ robotsBuilt: getProgress().robotsBuilt + 1 })
    setDirty(false)
    playSound('star')
    fireConfetti({ count: 40 })
    flash(`💾 ${clean.name} is saved! It will drive in the Code Lab.`)
  }

  const share = async () => {
    const url = `${window.location.origin}/kids/workshop?r=${encodeURIComponent(encodeDesign(design))}`
    try {
      await navigator.clipboard.writeText(url)
      flash('🔗 Link copied! Anyone with it can see your robot.', 'info')
      setShareUrl(null)
    } catch {
      setShareUrl(url)
    }
  }

  const downloadCard = async () => {
    const shot = apiRef.current?.capture() ?? null
    const card = await drawRobotCard(design, shot)
    if (!card) return
    const a = document.createElement('a')
    a.href = card
    a.download = `${design.name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() || 'robot'}-robot-card.png`
    a.click()
    playSound('star')
    flash('🖼️ Robot card downloaded!')
  }

  const buildOwn = () => {
    window.history.replaceState(null, '', '/kids/workshop')
    setReadOnly(false)
    setDesign(loadDesign())
    setDriving(false)
  }

  const enterVR = async () => {
    try {
      await apiRef.current?.enterVR()
    } catch {
      flash('VR could not start on this device.', 'info')
    }
  }

  // Keyboard driving.
  useEffect(() => {
    if (!driving) return
    const map: Record<string, keyof DriveInput> = {
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    }
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = map[e.code]
      if (!k) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      e.preventDefault()
      driveInput.current[k] = v
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      driveInput.current = { up: false, down: false, left: false, right: false }
    }
  }, [driving])

  const caps = capabilitiesOf(design)
  const capList = [...caps]
  const current = getPart(slot, design[slot])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      {readOnly && (
        <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">
            👀 You are looking at <span className="text-amber-300">{design.name}</span>, a robot built by another R2BOT inventor.
          </p>
          <button type="button" onClick={buildOwn} className="min-h-[48px] rounded-2xl bg-amber-500 px-5 font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white">
            🔧 Build your own
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ── 3D view ── */}
        <section aria-label="Your robot in 3D" className="py-0">
          <div ref={viewRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#1B1035] shadow-2xl">
            <WorkshopScene
              design={design}
              snap={snap}
              driving={driving}
              driveInput={driveInput}
              apiRef={apiRef}
              onSand={setInSand}
              onVRSupport={setVrSupported}
              onVRChange={setInVR}
              label={`3D model of ${design.name}. Drag to spin, pinch or scroll to zoom.`}
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-sm font-black">🤖 {design.name}</div>
            {!driving && <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-purple-100">Drag to spin · pinch to zoom</p>}
            {driving && inSand && !caps.has('rough-ground') && (
              <p role="status" className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-sm font-black text-black">
                🏜️ Wheels slipping in the sand! Tracks or legs would cross it.
              </p>
            )}
            {driving && <DrivePad input={driveInput} />}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                primeAudio()
                playSound('click')
                setDriving((v) => !v)
              }}
              aria-pressed={driving}
              className="min-h-[48px] rounded-2xl bg-sky-500 px-4 font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              {driving ? '🔧 Back to building' : '🏁 Test drive'}
            </button>
            {!readOnly && (
              <button type="button" onClick={save} className="min-h-[48px] rounded-2xl bg-emerald-400 px-4 font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white">
                💾 Save{dirty ? ' *' : ''}
              </button>
            )}
            <button type="button" onClick={() => void share()} className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400">
              🔗 Share
            </button>
            <button type="button" onClick={() => void downloadCard()} className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400">
              🖼️ Robot card
            </button>
            <button
              type="button"
              onClick={() => {
                setDriving(false)
                setArOpen(true)
              }}
              className="min-h-[48px] rounded-2xl bg-fuchsia-500 px-4 font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              📱 See it in your room
            </button>
            {vrSupported && !inVR && (
              <button type="button" onClick={() => void enterVR()} className="min-h-[48px] rounded-2xl bg-indigo-500 px-4 font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white">
                🥽 Stand next to it (VR)
              </button>
            )}
          </div>
          {shareUrl && (
            <label className="mt-3 block text-sm">
              <span className="font-bold">Copy this link to share your robot:</span>
              <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="mt-1 min-h-[44px] w-full rounded-xl bg-black/40 px-3 font-mono text-xs" />
            </label>
          )}
          {driving && <p className="mt-2 text-sm text-purple-200">Drive with the arrow buttons or your keyboard arrows. Try the sandy patch — which parts get across?</p>}

          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <h2 className="text-lg font-black">{design.name} can…</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {capList.length === 0 && <li className="text-sm text-purple-200">Nothing yet — give it something to move with!</li>}
              {capList.map((c) => (
                <li key={c} className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-200">
                  ✓ {CAPABILITY_LABEL[c]}
                </li>
              ))}
            </ul>
            <Link href="/kids/code-lab" className="mt-3 inline-flex min-h-[44px] items-center font-black text-amber-300 underline-offset-4 hover:underline">
              Program {design.name} in the Code Lab →
            </Link>
          </div>
        </section>

        {/* ── Parts ── */}
        <section aria-label="Choose parts" className={`py-0 ${readOnly ? 'opacity-60' : ''}`}>
          <div role="tablist" aria-label="Robot slots" className="flex flex-wrap gap-1 rounded-2xl bg-white/5 p-1">
            {SLOT_ORDER.map((s) => (
              <button
                key={s}
                role="tab"
                type="button"
                aria-selected={slot === s}
                onClick={() => setSlot(s)}
                className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-black focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${slot === s ? 'bg-amber-500 text-black' : 'text-purple-100 hover:bg-white/10'}`}
              >
                {getPart(s, design[s])?.emoji} {SLOT_LABEL[s]}
              </button>
            ))}
          </div>

          <div role="tabpanel" aria-label={SLOT_LABEL[slot]} className="mt-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {partsForSlot(slot).map((p) => {
                const on = design[slot] === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={on}
                    onClick={() => choose(slot, p.id)}
                    className={`min-h-[72px] rounded-2xl border-2 p-2 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                      on ? 'border-amber-400 bg-amber-400/15' : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="block text-2xl" aria-hidden>
                      {p.emoji}
                    </span>
                    <span className="block text-sm font-black leading-tight">{p.name}</span>
                  </button>
                )
              })}
            </div>

            {current && (
              <article className="mt-3 rounded-2xl border border-white/10 bg-[#1B1035] p-4" aria-live="polite">
                <h3 className="text-xl font-black">
                  {current.emoji} {current.name}
                </h3>
                <p className="mt-1 text-purple-100">{current.what}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="rounded-xl bg-emerald-400/10 p-2">
                    <dt className="font-black text-emerald-300">✅ With it</dt>
                    <dd>{current.withIt}</dd>
                  </div>
                  {current.withoutIt !== '—' && (
                    <div className="rounded-xl bg-rose-400/10 p-2">
                      <dt className="font-black text-rose-300">❌ Without it</dt>
                      <dd>{current.withoutIt}</dd>
                    </div>
                  )}
                  <div className="rounded-xl bg-sky-400/10 p-2">
                    <dt className="font-black text-sky-300">🌍 Real robots</dt>
                    <dd>{current.realWorld}</dd>
                  </div>
                </dl>
              </article>
            )}
          </div>

          <fieldset className="mt-4 rounded-2xl bg-white/5 p-4" disabled={readOnly}>
            <legend className="sr-only">Colours</legend>
            {(['primary', 'accent'] as const).map((which) => (
              <div key={which} className="mb-3 last:mb-0">
                <p className="mb-1 text-sm font-black">{which === 'primary' ? 'Main colour' : 'Trim colour'}</p>
                <div className="flex flex-wrap gap-2">
                  {ROBOT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`${which === 'primary' ? 'Main' : 'Trim'} colour ${c}`}
                      aria-pressed={design[which].toLowerCase() === c.toLowerCase()}
                      onClick={() => setColor(which, c)}
                      className={`h-11 w-11 rounded-full border-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-white ${design[which].toLowerCase() === c.toLowerCase() ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <label className="mt-4 block rounded-2xl bg-white/5 p-4">
            <span className="text-sm font-black">Robot name</span>
            <span className="block text-xs text-purple-200">A name for your robot — not your own name.</span>
            <input
              value={design.name}
              readOnly={readOnly}
              maxLength={20}
              onChange={(e) => {
                const name = e.target.value.replace(/[^A-Za-z0-9 ]/g, '')
                setDesign((d) => ({ ...d, name }))
                setDirty(true)
              }}
              className="mt-2 min-h-[48px] w-full rounded-xl bg-black/40 px-3 text-lg font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
            />
          </label>
        </section>
      </div>

      {toast && (
        <p
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 font-black shadow-xl ${toast.tone === 'good' ? 'bg-emerald-400 text-black' : 'bg-sky-400 text-black'}`}
        >
          {toast.text}
        </p>
      )}

      {arOpen && <ARView design={design} onClose={() => setArOpen(false)} />}
    </div>
  )
}

function DrivePad({ input }: { input: React.MutableRefObject<DriveInput> }) {
  const hold = (k: keyof DriveInput) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      input.current[k] = true
    },
    onPointerUp: () => {
      input.current[k] = false
    },
    onPointerCancel: () => {
      input.current[k] = false
    },
    onPointerLeave: () => {
      input.current[k] = false
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') input.current[k] = true
    },
    onKeyUp: () => {
      input.current[k] = false
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })
  const btn = 'h-14 w-14 select-none rounded-2xl bg-white/85 text-2xl font-black text-black shadow-lg active:bg-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 touch-none'
  return (
    <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1" aria-label="Drive controls">
      <span />
      <button type="button" aria-label="Forward" className={btn} {...hold('up')}>
        ▲
      </button>
      <span />
      <button type="button" aria-label="Turn left" className={btn} {...hold('left')}>
        ◀
      </button>
      <button type="button" aria-label="Reverse" className={btn} {...hold('down')}>
        ▼
      </button>
      <button type="button" aria-label="Turn right" className={btn} {...hold('right')}>
        ▶
      </button>
    </div>
  )
}

/** Draw a shareable robot card (1080×1350 PNG data URL). */
async function drawRobotCard(design: RobotDesign, shot: string | null): Promise<string | null> {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return null
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#2E1065')
  bg.addColorStop(1, '#0F0A1E')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = design.primary
  g.fillRect(0, 0, W, 18)

  g.fillStyle = '#FDE68A'
  g.font = 'bold 40px system-ui, sans-serif'
  g.fillText('ROBOT CARD', 60, 90)
  g.fillStyle = '#FFFFFF'
  g.font = '900 88px system-ui, sans-serif'
  g.fillText(design.name, 60, 185)

  // Robot picture (cover-cropped into a rounded frame).
  const fx = 60
  const fy = 225
  const fw = W - 120
  const fh = 620
  g.save()
  g.beginPath()
  g.roundRect(fx, fy, fw, fh, 36)
  g.clip()
  g.fillStyle = '#1B1035'
  g.fillRect(fx, fy, fw, fh)
  if (shot) {
    const img = new Image()
    await new Promise<void>((res) => {
      img.onload = () => res()
      img.onerror = () => res()
      img.src = shot
    })
    if (img.width > 0) {
      const s = Math.max(fw / img.width, fh / img.height)
      g.drawImage(img, fx + (fw - img.width * s) / 2, fy + (fh - img.height * s) / 2, img.width * s, img.height * s)
    }
  }
  g.restore()

  // Parts.
  g.font = 'bold 34px system-ui, sans-serif'
  let y = fy + fh + 70
  for (const s of SLOT_ORDER) {
    const p = getPart(s, design[s])
    if (!p) continue
    g.fillStyle = '#C4B5FD'
    g.fillText(`${SLOT_LABEL[s]}:`, 60, y)
    g.fillStyle = '#FFFFFF'
    g.fillText(`${p.emoji} ${p.name}`, 380, y)
    y += 52
  }
  const caps = [...capabilitiesOf(design)].map((cap) => CAPABILITY_LABEL[cap])
  g.fillStyle = '#6EE7B7'
  g.font = 'bold 30px system-ui, sans-serif'
  const canText = `Can ${caps.length ? caps.join(', ') : 'think about moving'}.`
  wrapText(g, canText, 60, y + 14, W - 120, 40)

  g.fillStyle = '#A78BFA'
  g.font = 'bold 28px system-ui, sans-serif'
  g.fillText('Built in the R2BOT Robot Workshop · r2bot.in/kids/workshop', 60, H - 50)
  return c.toDataURL('image/png')
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y)
      line = w
      y += lh
    } else line = test
  }
  if (line) g.fillText(line, x, y)
}
