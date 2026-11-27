'use client'

// components/kids/robodex/RobodexClient.tsx — the child's Robodex (roadmap #32).
//
// Reads ONLY this device's stores (lib/kids/robodex/store.ts): on open it syncs
// the collection with what the child has already done, so earlier play counts.
// Found cards show their front; tapping one opens a band-aware back (a story
// read aloud for Explorers, facts for Builders and Inventors, specs and the
// /robots page for teens, and "who builds this?" for everyone). Locked cards
// say exactly how to find them. No random packs, no buying, no comparing.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import type { BandId } from '@/lib/kids/bands'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'
import { readAloud, readAloudSupported, stopReadAloud } from '@/lib/kids/read-aloud'
import { useKidsReducedMotion, useKidsSettings } from '@/lib/kids/settings'
import { ROBODEX_EVENT, markRobodexSeen, readRobodex, syncRobodex, type RobodexState } from '@/lib/kids/robodex/store'
import type { RobodexCardView, RobodexWorldView } from '@/lib/kids/robodex/view'

type Tab = 'story' | 'facts' | 'specs' | 'who'

const TABS: { id: Tab; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'facts', label: 'Facts' },
  { id: 'specs', label: 'Specs' },
  { id: 'who', label: 'Who builds it?' },
]

function defaultTab(band: BandId | null): Tab {
  if (band === 'engineers') return 'specs'
  if (band === 'builders' || band === 'inventors') return 'facts'
  return 'story'
}

const isTeen = (band: BandId | null) => band === 'inventors' || band === 'engineers'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export interface RobodexClientProps {
  cards: RobodexCardView[]
  worlds: RobodexWorldView[]
}

export default function RobodexClient({ cards, worlds }: RobodexClientProps) {
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<RobodexState>({ found: {}, seen: [] })
  const [band, setBand] = useState<BandId | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setState(readRobodex())
    setBand(getProgress().band)
  }, [])

  useEffect(() => {
    syncRobodex()
    refresh()
    setReady(true)
    // Deep link: /kids/robodex#card-<id> opens that card (the discovery toast links here).
    const fromHash = () => {
      const hash = window.location.hash.startsWith('#card-') ? window.location.hash.slice(6) : ''
      if (hash && cards.some((c) => c.id === hash)) setOpenId(hash)
    }
    fromHash()
    const onProgress = () => {
      syncRobodex()
      refresh()
    }
    window.addEventListener(ROBODEX_EVENT, refresh)
    window.addEventListener(KIDS_PROGRESS_EVENT, onProgress)
    window.addEventListener(KIDS_PROFILE_EVENT, onProgress)
    window.addEventListener('storage', onProgress)
    window.addEventListener('hashchange', fromHash)
    return () => {
      window.removeEventListener('hashchange', fromHash)
      window.removeEventListener(ROBODEX_EVENT, refresh)
      window.removeEventListener(KIDS_PROGRESS_EVENT, onProgress)
      window.removeEventListener(KIDS_PROFILE_EVENT, onProgress)
      window.removeEventListener('storage', onProgress)
    }
  }, [cards, refresh])

  const found = useMemo(() => new Set(Object.keys(state.found)), [state.found])
  const seen = useMemo(() => new Set(state.seen), [state.seen])
  const totals = useMemo(() => {
    const out = new Map<string, { found: number; total: number }>()
    for (const c of cards) {
      const row = out.get(c.world) ?? { found: 0, total: 0 }
      row.total += 1
      if (found.has(c.id)) row.found += 1
      out.set(c.world, row)
    }
    return out
  }, [cards, found])

  const shown = filter === 'all' ? cards : cards.filter((c) => c.world === filter)
  const open = openId ? cards.find((c) => c.id === openId) ?? null : null

  const openCard = (id: string) => {
    setOpenId(id)
    if (found.has(id)) {
      markRobodexSeen(id)
      setState(readRobodex())
    }
  }

  return (
    <section aria-labelledby="robodex-collection-h" className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="robodex-collection-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
          Your collection
        </h2>
        <p className="font-display text-lg font-bold text-amber-300" aria-live="polite">
          {ready ? `${found.size} of ${cards.length} real robots found` : `${cards.length} real robots to find`}
        </p>
      </div>

      <div role="group" aria-label="Show robots from" className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All worlds" count={ready ? `${found.size}/${cards.length}` : `${cards.length}`} />
        {worlds.map((w) => {
          const t = totals.get(w.id) ?? { found: 0, total: 0 }
          return (
            <FilterChip
              key={w.id}
              active={filter === w.id}
              onClick={() => setFilter(w.id)}
              label={`${w.emoji} ${w.name}`}
              count={ready ? `${t.found}/${t.total}` : `${t.total}`}
              progress={ready && t.total ? t.found / t.total : 0}
            />
          )
        })}
      </div>

      {ready && found.size === 0 && (
        <p className="mt-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.06] p-3 text-[16px] text-[#EEF2F8]">
          Your Robodex is empty for now. Every mission, game and story in the Worlds can reveal a real robot. Tap any card to see how to find it.
        </p>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Robodex cards">
        {shown.map((c) => {
          const has = ready && found.has(c.id)
          const isNew = has && !seen.has(c.id)
          const w = worlds.find((x) => x.id === c.world)
          return (
            <li key={c.id} id={`card-${c.id}`}>
              <button
                type="button"
                onClick={() => openCard(c.id)}
                aria-haspopup="dialog"
                aria-label={has ? `${c.name}, ${c.type}${isNew ? ', new' : ''}. Open card.` : `Locked card from ${w?.name ?? 'a world'}. How to find it.`}
                className={`relative flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-1 rounded-[20px] border p-3 text-center transition-transform motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[.97] ${focusRing} ${
                  has
                    ? `border-white/[0.16] bg-gradient-to-br ${w?.gradient ?? 'from-slate-600 to-slate-800'}`
                    : 'border-dashed border-white/[0.16] bg-[#111C32]'
                } ${isNew ? 'ring-2 ring-amber-400' : ''}`}
              >
                {isNew && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[12px] font-black uppercase text-[#1A1103]">New</span>
                )}
                <span className={`text-4xl ${has ? '' : 'opacity-40 grayscale'}`} aria-hidden>
                  {has ? c.emoji : w?.emoji ?? '❔'}
                </span>
                <span className={`font-display text-[16px] font-bold leading-tight ${has ? 'text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]' : 'text-[#A7B0C0]'}`}>
                  {has ? c.name : '? ? ?'}
                </span>
                <span className={`text-[13px] ${has ? 'text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,.6)]' : 'text-[#6E7888]'}`}>{has ? c.type : 'How to find it'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {open && (
        <CardDialog
          card={open}
          world={worlds.find((x) => x.id === open.world) ?? null}
          has={ready && found.has(open.id)}
          day={state.found[open.id] ?? null}
          band={band}
          onClose={() => {
            stopReadAloud()
            setOpenId(null)
            const el = document.querySelector<HTMLButtonElement>(`#card-${open.id} button`)
            el?.focus()
          }}
        />
      )}
    </section>
  )
}

function FilterChip({ active, onClick, label, count, progress }: { active: boolean; onClick: () => void; label: string; count: string; progress?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative flex min-h-[48px] shrink-0 items-center gap-2 overflow-hidden rounded-2xl border px-3 text-[15px] font-bold ${focusRing} ${
        active ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/[0.16] bg-[#19263F] text-[#EEF2F8] hover:border-white/30'
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-lg px-1.5 font-display ${active ? 'bg-[#1A1103]/15' : 'bg-white/10 text-amber-300'}`}>{count}</span>
      {progress !== undefined && progress > 0 && !active && <span aria-hidden className="absolute bottom-0 left-0 h-1 bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} />}
    </button>
  )
}

interface CardDialogProps {
  card: RobodexCardView
  world: RobodexWorldView | null
  has: boolean
  day: string | null
  band: BandId | null
  onClose: () => void
}

function CardDialog({ card, world, has, day, band, onClose }: CardDialogProps) {
  const [tab, setTab] = useState<Tab>(defaultTab(band))
  const settings = useKidsSettings()
  const reduced = useKidsReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [canSpeak, setCanSpeak] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    setCanSpeak(readAloudSupported())
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = panel.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const listen = () => {
    if (speaking) {
      stopReadAloud()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    readAloud(card.story, { onEnd: () => setSpeaking(false) })
  }

  const tabBtn = (t: (typeof TABS)[number]) => (
    <button
      key={t.id}
      type="button"
      role="tab"
      id={`rdx-tab-${t.id}`}
      aria-selected={tab === t.id}
      aria-controls={`rdx-panel-${t.id}`}
      onClick={() => setTab(t.id)}
      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-[15px] font-bold ${focusRing} ${tab === t.id ? 'bg-amber-500 text-[#1A1103]' : 'text-[#A7B0C0] hover:text-[#EEF2F8]'}`}
    >
      {t.label}
    </button>
  )

  // A portal: .kids-main is its own stacking context, so a fixed dialog inside it would sit under the tab bar.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0A1120]/80 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdx-dialog-h"
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/[0.16] bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:rounded-[28px] ${reduced ? '' : 'motion-safe:animate-[rdxIn_.25s_cubic-bezier(.22,.61,.36,1)]'}`}
      >
        <style>{`@keyframes rdxIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>
        <div className={`relative rounded-t-[28px] bg-gradient-to-br p-5 ${has ? world?.gradient ?? 'from-slate-600 to-slate-800' : 'from-[#19263F] to-[#111C32]'}`}>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close card"
            className={`absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A1120]/60 text-2xl text-white hover:bg-[#0A1120]/80 ${focusRing}`}
          >
            <span aria-hidden>×</span>
          </button>
          <p className="text-[13px] font-bold uppercase tracking-wider text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">
            {world ? `${world.emoji} ${world.name}` : 'Robodex'}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-5xl" aria-hidden>
              {has ? card.emoji : '❔'}
            </span>
            <div>
              <h2 id="rdx-dialog-h" className="font-display text-2xl font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">
                {has ? card.name : 'Not found yet'}
              </h2>
              <p className="text-[15px] text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">{has ? card.type : 'A real robot is hiding here.'}</p>
            </div>
          </div>
          {has && <p className="mt-3 text-[17px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">{card.front}</p>}
        </div>

        {!has ? (
          <div className="p-5">
            <h3 className="font-display text-lg font-bold text-[#EEF2F8]">How to find it</h3>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">Do any one of these and the card is yours. Cards are never random and never bought.</p>
            <ul className="mt-3 grid gap-2">
              {card.hints.map((h) => (
                <li key={h.href + h.text}>
                  <Link href={h.href} className={`flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-white/[0.16] bg-[#19263F] px-4 py-2 text-[16px] font-semibold text-[#EEF2F8] hover:border-amber-400/60 ${focusRing}`}>
                    <span>{h.text}</span>
                    <span aria-hidden className="text-amber-300">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-5">
            <div role="tablist" aria-label="Card back" className="flex gap-1 overflow-x-auto rounded-2xl bg-[#0A1120] p-1">
              {TABS.map(tabBtn)}
            </div>

            <div role="tabpanel" id={`rdx-panel-${tab}`} aria-labelledby={`rdx-tab-${tab}`} className="mt-4 text-[17px] leading-relaxed text-[#EEF2F8]">
              {tab === 'story' && (
                <div>
                  <p className="text-[19px] leading-relaxed" data-read-aloud="text">{card.story}</p>
                  {canSpeak && settings.voice && (
                    <button
                      type="button"
                      onClick={listen}
                      className={`mt-4 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 ${focusRing}`}
                    >
                      <span aria-hidden>{speaking ? '■' : '🔊'}</span> {speaking ? 'Stop' : 'Listen'}
                    </button>
                  )}
                </div>
              )}
              {tab === 'facts' && (
                <ul className="grid gap-2">
                  {card.facts.map((f) => (
                    <li key={f} className="flex gap-2 rounded-2xl bg-white/[0.04] p-3">
                      <span aria-hidden className="text-cyan-300">●</span>
                      <span>{f}</span>
                    </li>
                  ))}
                  <li className="text-[15px] text-[#A7B0C0]">{card.realExamples}</li>
                </ul>
              )}
              {tab === 'specs' && (
                <div>
                  <dl className="grid gap-2 text-[16px]">
                    <SpecRow label="How it moves" value={card.specs.dof} />
                    <SpecRow label="Senses" value={card.specs.sensors.join(' · ')} />
                    <SpecRow label="Autonomy" value={`${card.specs.autonomy}. ${card.specs.autonomyLong}`} />
                    <SpecRow label="Power" value={card.specs.power} />
                  </dl>
                  <p className="mt-3 text-[16px] text-[#A7B0C0]">{card.howItWorks}</p>
                  {card.robotSlug && isTeen(band) && (
                    <GrownUpLink
                      href={`/robots/${card.robotSlug}`}
                      message="This opens a robot profile on the main R2BOT site."
                      className={`mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-cyan-400/40 px-4 font-bold text-cyan-300 hover:border-cyan-300 ${focusRing}`}
                    >
                      Full profile of a real example →
                    </GrownUpLink>
                  )}
                </div>
              )}
              {tab === 'who' && (
                <div>
                  <p>{card.builders}</p>
                  {card.makers.length > 0 && (
                    <>
                      <h3 className="mt-4 font-display text-lg font-bold">Meet a maker</h3>
                      <ul className="mt-2 grid gap-2">
                        {card.makers.map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`/kids/careers/${m.id}`}
                              className={`flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-white/[0.16] bg-[#19263F] px-4 py-2 hover:border-amber-400/60 ${focusRing}`}
                            >
                              <span>
                                <span className="block font-bold">{m.name}</span>
                                <span className="block text-[14px] text-[#A7B0C0]">{m.role}</span>
                              </span>
                              <span aria-hidden className="text-amber-300">→</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
            {day && <p className="mt-4 text-[14px] text-[#6E7888]">Found on {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <dt className="text-[13px] font-bold uppercase tracking-wider text-[#6E7888]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}
