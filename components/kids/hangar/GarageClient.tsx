'use client'

// components/kids/hangar/GarageClient.tsx
// The Garage half of /kids/hangar (roadmap #7, "one robot, one Garage"):
//   - the ROBOT CARD (what used to be /kids/my-robot): the robot's name, its
//     parts, and a shareable PNG card. The name is RobotDesign.name, the same
//     name the Workshop, Code Lab, Classroom and certificates use.
//   - the SPARK TRAIL PARTS the child earned by finishing zones. Each one FITS
//     a real Workshop slot (TRAIL_PART_FITS in lib/kids/robot-design.ts), so
//     "Fit it" changes the one robot everywhere. The Rocket Booster is a bay
//     add-on (cosmetics.booster) with no engineering effect.
// This file never writes progress: earned parts come from lib/kids-progress.ts,
// rewards only ever from lib/kids/universe/rewards.ts.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { checkNickname } from '@/lib/kids/classroom'
import { collectedStars } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { useKidsVoice } from '@/lib/kids-voice'
import {
  DEFAULT_DESIGN,
  fitTrailPart,
  getPart,
  isTrailPartFitted,
  saveDesign,
  TRAIL_PART_FITS,
  type RobotDesign,
  type Slot,
} from '@/lib/kids/robot-design'
import { bestTitle, levelInfo } from '@/lib/kids/universe/rewards'
import { BOOSTER_PART_ID, saveCosmetics } from './cosmetics'
import { useHangarState } from './useHangarState'

/** A Spark Trail part, as the server page passes it (keeps the big zone data off the client). */
export interface TrailPartInfo {
  id: string
  name: string
  emoji: string
  description: string
  zoneName: string
}

const SLOTS: Slot[] = ['body', 'drive', 'head', 'tool', 'sensor']
const SLOT_LABEL: Record<Slot, string> = { body: 'Body', drive: 'Drive', head: 'Head', tool: 'Tool', sensor: 'Floor sensor' }
/** The progress store's starter robot name, from before there was one robot. */
const OLD_DEFAULT_NAME = 'Spark Jr.'

const btn =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 font-display text-base font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60'
const primaryBtn = `${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`
const secondaryBtn = `${btn} border border-white/15 bg-white/[0.06] text-white hover:border-white/30`

/** Robot names are letters, numbers and spaces only (the share code allows nothing else). */
function cleanName(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 20)
}

export function GarageClient({ trailParts }: { trailParts: TrailPartInfo[] }) {
  const { ready, progress, design, cosmetics } = useHangarState()
  const { speak } = useKidsVoice()
  const [draft, setDraft] = useState('')
  const [nameError, setNameError] = useState('')
  const [say, setSay] = useState('')
  const [sharing, setSharing] = useState(false)

  // The name box follows the saved name until the child starts typing.
  useEffect(() => {
    if (ready) setDraft(design.name)
  }, [ready, design.name])

  const announce = useCallback((text: string) => {
    setSay('')
    window.setTimeout(() => setSay(text), 30)
  }, [])

  const earned = new Set(ready ? progress.earnedParts : [])
  const foundCount = trailParts.filter((p) => earned.has(p.id)).length
  const oldName = cleanName(progress.robotName ?? '').trim()
  const offerOldName =
    ready && design.name === DEFAULT_DESIGN.name && oldName.length >= 2 && oldName !== cleanName(OLD_DEFAULT_NAME).trim() && checkNickname(oldName).ok

  const saveName = (raw: string) => {
    const name = cleanName(raw).trim()
    const check = checkNickname(name)
    if (!check.ok) {
      setNameError(check.error.replace(/^Your name/, 'Your robot’s name'))
      return
    }
    setNameError('')
    if (name === design.name) {
      announce(`Your robot is already called ${name}.`)
      return
    }
    primeAudio()
    playSound('correct')
    saveDesign({ ...design, name })
    announce(`Your robot is now called ${name}.`)
  }

  const fit = (part: TrailPartInfo) => {
    primeAudio()
    if (!earned.has(part.id)) {
      playSound('click')
      announce(`${part.name} is still on the Spark Trail. Finish ${part.zoneName} to earn it.`)
      return
    }
    if (part.id === BOOSTER_PART_ID) {
      const on = !cosmetics.booster
      playSound(on ? 'correct' : 'click')
      saveCosmetics({ ...cosmetics, booster: on })
      announce(on ? `${part.name} on. Look at the back of ${design.name} in the bay.` : `${part.name} off.`)
      return
    }
    const fitInfo = TRAIL_PART_FITS[part.id]
    const wp = fitInfo?.slot && fitInfo.part ? getPart(fitInfo.slot, fitInfo.part) : undefined
    if (!wp) return
    if (isTrailPartFitted(design, part.id)) {
      announce(`${design.name} already has the ${wp.name}.`)
      return
    }
    playSound('correct')
    saveDesign(fitTrailPart(design, part.id))
    const line = `${part.name} fitted. ${design.name} now has the ${wp.name}. ${wp.withIt}`
    announce(line)
    speak(line)
  }

  const shareCard = async () => {
    if (sharing) return
    primeAudio()
    playSound('click')
    setSharing(true)
    try {
      const blob = await drawCard(design, {
        level: levelInfo(progress.xp),
        worn: bestTitle(progress.unlocks)?.name ?? null,
        stars: collectedStars(progress),
        found: foundCount,
        total: trailParts.length,
        booster: cosmetics.booster,
      })
      if (!blob) {
        announce('Sorry, this device could not draw the card.')
        return
      }
      const fileName = `${(design.name || 'my-robot').replace(/\s+/g, '-')}-robot-card.png`
      const file = new File([blob], fileName, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.canShare?.({ files: [file] }) && typeof nav.share === 'function') {
        try {
          await nav.share({ files: [file], title: `${design.name}, my R2BOT robot` })
          announce('Robot card shared.')
          return
        } catch {
          /* cancelled or blocked: fall through to a download */
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      announce('Robot card saved as a picture.')
    } finally {
      setSharing(false)
    }
  }

  const lvl = levelInfo(progress.xp)

  return (
    <section aria-labelledby="garage-h" className="mx-auto max-w-6xl px-4 pt-4">
      <h2 id="garage-h" className="sr-only">
        Robot card and Spark Trail parts
      </h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* ── Robot card ── */}
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <h3 className="font-display text-2xl font-bold text-white">Robot card</h3>
            <p className="text-sm text-[#A7B0C0]">{ready ? `Rank ${lvl.level} · ${collectedStars(progress)} ★` : ' '}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveName(draft)
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="garage-robot-name" className="text-xs font-bold uppercase tracking-wider text-[#A7B0C0]">
              Robot name
            </label>
            <div className="flex gap-2">
              <input
                id="garage-robot-name"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                maxLength={20}
                value={draft}
                disabled={!ready}
                onChange={(e) => {
                  setDraft(cleanName(e.target.value))
                  setNameError('')
                }}
                aria-invalid={nameError ? true : undefined}
                aria-describedby="garage-name-help"
                className="min-h-[48px] min-w-0 flex-1 rounded-2xl border-2 border-white/10 bg-[#0A1120] px-4 font-display text-lg font-bold text-white placeholder:text-[#6E7888] focus:border-amber-400 focus:outline-none"
              />
              <button type="submit" disabled={!ready || cleanName(draft).trim() === design.name} className={primaryBtn}>
                Save
              </button>
            </div>
            <p id="garage-name-help" className={`text-sm ${nameError ? 'font-semibold text-amber-300' : 'text-[#A7B0C0]'}`}>
              {nameError || 'A robot name, not your own name. Letters and numbers only.'}
            </p>
            {offerOldName && (
              <button type="button" onClick={() => saveName(oldName)} className={`${secondaryBtn} self-start text-sm`}>
                Use your old robot name: {oldName}
              </button>
            )}
          </form>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={`${design.name}’s parts`}>
            {SLOTS.map((slot) => {
              const p = getPart(slot, design[slot])
              return (
                <li key={slot} className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1120]/60 px-3 py-2">
                  <span className="text-2xl" aria-hidden>
                    {ready ? p?.emoji : ''}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[#A7B0C0]">{SLOT_LABEL[slot]}</span>
                    <span className="block truncate font-semibold text-white">{ready ? p?.name : ' '}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button type="button" onClick={shareCard} disabled={!ready || sharing} className={primaryBtn}>
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M10 2.5 6 6.5l1.4 1.4L9 6.3V13h2V6.3l1.6 1.6L14 6.5l-4-4ZM4 11v5.5h12V11h2v7.5H2V11h2Z" />
              </svg>
              {sharing ? 'Making card…' : 'Share robot card'}
            </button>
            <Link href="/kids/workshop" className={secondaryBtn}>
              Change parts in the Workshop →
            </Link>
          </div>
          <p className="text-sm text-[#A7B0C0]">The card is a picture made on this device. It shows your robot, never your name.</p>
        </div>

        {/* ── Spark Trail parts ── */}
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-display text-2xl font-bold text-white">Spark Trail parts</h3>
            <p className="text-sm text-[#A7B0C0]">
              {ready && (
                <>
                  <span className="font-display font-bold text-white">
                    {foundCount} of {trailParts.length}
                  </span>{' '}
                  found ·{' '}
                </>
              )}
              One for each zone you finish.
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {trailParts.map((p) => {
              const own = ready && earned.has(p.id)
              const isBooster = p.id === BOOSTER_PART_ID
              const fitInfo = TRAIL_PART_FITS[p.id]
              const wp = fitInfo?.slot && fitInfo.part ? getPart(fitInfo.slot, fitInfo.part) : undefined
              const on = own && (isBooster ? cosmetics.booster : isTrailPartFitted(design, p.id))
              const action = !own ? 'Locked' : isBooster ? (on ? 'Take it off' : 'Add to robot') : on ? 'Fitted' : 'Fit to robot'
              return (
                <li
                  key={p.id}
                  className={`flex flex-col gap-2 rounded-[20px] border-2 p-3 ${
                    on ? 'border-amber-400 bg-amber-500/10' : own ? 'border-white/10 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0A1120] text-2xl ${own ? '' : 'opacity-40 grayscale'}`} aria-hidden>
                      {p.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold leading-tight text-white">{p.name}</p>
                      <p className="text-sm leading-snug text-[#A7B0C0]">
                        {!own
                          ? `Finish ${p.zoneName} to earn it.`
                          : isBooster
                            ? 'Two boosters on your robot’s back, in the bay.'
                            : wp
                              ? `Fits as the ${wp.name}.`
                              : p.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fit(p)}
                    aria-pressed={own ? on : undefined}
                    aria-disabled={!own || undefined}
                    aria-label={own ? `${action}: ${p.name}` : `${p.name} is locked. Finish ${p.zoneName} on the Spark Trail.`}
                    className={`${btn} min-h-[44px] w-full text-sm ${
                      !own
                        ? 'border border-white/[0.08] bg-transparent text-[#6E7888]'
                        : on
                          ? 'border border-amber-400/60 bg-amber-500/15 text-amber-200'
                          : 'bg-amber-500 text-[#1A1103] hover:bg-amber-400'
                    }`}
                  >
                    {on && !isBooster ? '✓ ' : ''}
                    {action}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/kids/spark-trail" className={secondaryBtn}>
              Find more parts on the Spark Trail →
            </Link>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {say}
      </p>
    </section>
  )
}

// ── The shareable card (1200×630, drawn on a canvas on this device) ─────────

interface CardFacts {
  level: { level: number; title: string }
  /** The best title the child has earned (bestTitle()), worn on the card. */
  worn: string | null
  stars: number
  found: number
  total: number
  booster: boolean
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** A flat drawing of the robot from its design: body shape, drive, head, tool and floor sensor. */
function drawRobot(ctx: CanvasRenderingContext2D, d: RobotDesign, cx: number, base: number, booster: boolean) {
  const P = d.primary
  const A = d.accent
  const tall = d.body === 'tall'
  const bodyW = d.body === 'bug' ? 190 : d.body === 'tall' ? 150 : 210
  const bodyH = tall ? 210 : d.body === 'bug' ? 110 : 150
  const driveH = d.drive === 'legs' ? 80 : 60
  const bodyTop = base - driveH - bodyH
  // Boosters behind the body.
  if (booster) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#EF4444'
      rr(ctx, cx + s * (bodyW / 2 + 8) - 14, bodyTop + 20, 28, bodyH - 30, 12)
      ctx.fill()
      ctx.fillStyle = '#FC6818'
      ctx.beginPath()
      ctx.moveTo(cx + s * (bodyW / 2 + 8) - 12, bodyTop + bodyH - 10)
      ctx.lineTo(cx + s * (bodyW / 2 + 8), bodyTop + bodyH + 30)
      ctx.lineTo(cx + s * (bodyW / 2 + 8) + 12, bodyTop + bodyH - 10)
      ctx.fill()
    }
  }
  // Drive.
  ctx.fillStyle = '#1E293B'
  if (d.drive === 'tracks') {
    rr(ctx, cx - bodyW / 2 - 10, base - driveH, bodyW + 20, driveH, 30)
    ctx.fill()
    ctx.fillStyle = A
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.arc(cx - bodyW / 2 + 22 + i * ((bodyW - 44) / 3), base - driveH / 2, 16, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (d.drive === 'legs') {
    ctx.strokeStyle = A
    ctx.lineWidth = 16
    ctx.lineCap = 'round'
    for (const s of [-1, -0.35, 0.35, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * (bodyW / 2 - 20), base - driveH)
      ctx.lineTo(cx + s * (bodyW / 2 + 5), base - driveH / 2)
      ctx.lineTo(cx + s * (bodyW / 2 - 10), base - 4)
      ctx.stroke()
    }
  } else {
    const n = d.drive === 'wheels4' ? 4 : 2
    for (let i = 0; i < n; i++) {
      const x = n === 2 ? cx + (i ? 1 : -1) * (bodyW / 2 - 30) : cx - bodyW / 2 + 25 + i * ((bodyW - 50) / 3)
      ctx.fillStyle = '#1E293B'
      ctx.beginPath()
      ctx.arc(x, base - 30, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = A
      ctx.beginPath()
      ctx.arc(x, base - 30, 11, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Body.
  ctx.fillStyle = P
  if (d.body === 'dome') {
    ctx.beginPath()
    ctx.ellipse(cx, bodyTop + bodyH, bodyW / 2, bodyH, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
  } else if (d.body === 'bug') {
    ctx.beginPath()
    ctx.ellipse(cx, bodyTop + bodyH / 2, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    rr(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, 26)
    ctx.fill()
  }
  ctx.fillStyle = A
  rr(ctx, cx - bodyW / 4, bodyTop + bodyH * 0.45, bodyW / 2, 14, 7)
  ctx.fill()
  // Floor sensor.
  if (d.sensor !== 'none') {
    ctx.fillStyle = d.sensor === 'line' ? '#22D3EE' : d.sensor === 'color' ? '#F472B6' : '#94A3B8'
    rr(ctx, cx - 30, bodyTop + bodyH - 6, 60, 12, 6)
    ctx.fill()
  }
  // Head.
  const headW = 150
  const headH = 92
  const headTop = bodyTop - headH - 8
  ctx.fillStyle = P
  rr(ctx, cx - headW / 2, headTop, headW, headH, 22)
  ctx.fill()
  ctx.fillStyle = '#0A1120'
  rr(ctx, cx - headW / 2 + 16, headTop + 14, headW - 32, headH - 28, 14)
  ctx.fill()
  ctx.fillStyle = '#22D3EE'
  if (d.head === 'camera') {
    ctx.beginPath()
    ctx.arc(cx, headTop + headH / 2, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0A1120'
    ctx.beginPath()
    ctx.arc(cx, headTop + headH / 2, 8, 0, Math.PI * 2)
    ctx.fill()
  } else if (d.head === 'screen') {
    ctx.beginPath()
    ctx.arc(cx - 24, headTop + headH / 2 - 6, 7, 0, Math.PI * 2)
    ctx.arc(cx + 24, headTop + headH / 2 - 6, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#22D3EE'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(cx, headTop + headH / 2, 20, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
  } else {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + s * 28, headTop + headH / 2, 15, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (d.head === 'antenna') {
    ctx.strokeStyle = A
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(cx, headTop)
    ctx.lineTo(cx, headTop - 50)
    ctx.stroke()
    ctx.fillStyle = '#FC6818'
    ctx.beginPath()
    ctx.arc(cx, headTop - 56, 10, 0, Math.PI * 2)
    ctx.fill()
  }
  // Tool, on the right arm.
  if (d.tool !== 'none') {
    const ax = cx + bodyW / 2
    const ay = bodyTop + bodyH * 0.35
    ctx.fillStyle = A
    rr(ctx, ax - 4, ay - 10, 60, 20, 10)
    ctx.fill()
    ctx.fillStyle = d.tool === 'light' ? '#FDE68A' : d.tool === 'pen' ? '#F472B6' : '#CBD5E1'
    if (d.tool === 'gripper') {
      rr(ctx, ax + 52, ay - 26, 14, 22, 5)
      ctx.fill()
      rr(ctx, ax + 52, ay + 4, 14, 22, 5)
      ctx.fill()
    } else if (d.tool === 'scoop') {
      ctx.beginPath()
      ctx.arc(ax + 66, ay, 22, -0.5 * Math.PI, 0.5 * Math.PI)
      ctx.fill()
    } else {
      rr(ctx, ax + 52, ay - 14, 28, 28, 8)
      ctx.fill()
    }
  }
}

function drawCard(d: RobotDesign, f: CardFacts): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  const g = ctx.createLinearGradient(0, 0, 1200, 630)
  g.addColorStop(0, '#111C32')
  g.addColorStop(1, '#0A1120')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1200, 630)
  // Fixed star field (the same picture every time).
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  for (let i = 0; i < 50; i++) {
    const x = (i * 263) % 1200
    const y = (i * 151 + 37) % 630
    ctx.beginPath()
    ctx.arc(x, y, (i % 3) * 0.6 + 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  // Bay floor behind the robot.
  ctx.fillStyle = '#19263F'
  ctx.beginPath()
  ctx.ellipse(890, 540, 250, 40, 0, 0, Math.PI * 2)
  ctx.fill()
  drawRobot(ctx, d, 890, 540, f.booster)

  const font = 'system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillStyle = '#FBBF24'
  ctx.font = `bold 30px ${font}`
  ctx.fillText('R2BOT Kids · My robot', 60, 84)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold 76px ${font}`
  ctx.fillText(d.name || 'My Robot', 60, 172, 620)
  ctx.fillStyle = '#A7B0C0'
  ctx.font = `600 28px ${font}`
  ctx.fillText(`Rank ${f.level.level} ${f.worn ?? f.level.title} · ${f.stars} stars`, 60, 222, 620)
  ctx.font = `26px ${font}`
  let y = 290
  for (const slot of SLOTS) {
    const p = getPart(slot, d[slot])
    if (!p || p.id === 'none') continue
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(`${p.emoji}  ${p.name}`, 60, y, 620)
    y += 44
  }
  ctx.fillStyle = '#FBBF24'
  ctx.font = `600 24px ${font}`
  ctx.fillText(`Spark Trail parts found: ${f.found} of ${f.total}`, 60, Math.max(y + 10, 500))
  ctx.fillStyle = '#F59E0B'
  ctx.font = `bold 22px ${font}`
  ctx.fillText('Built in the R2BOT Kids Garage · r2bot.in/kids', 60, 584)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
