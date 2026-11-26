'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SparkGuide } from '@/components/kids/SparkGuide'
import { ConfettiProvider, useConfettiEventBridge } from '@/components/kids/Confetti'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { levelInfo } from '@/lib/kids/universe/rewards'
import { InstallAppClient } from '@/components/kids/InstallAppClient'
import { KidsClassSync } from '@/components/kids/classroom/KidsClassSyncClient'
import { RewardToast } from '@/components/kids/ui/RewardToastClient'
import { KidsAppLinkGuard } from '@/components/kids/app/KidsAppLinkGuardClient'
import { useKidsVoice } from '@/lib/kids-voice'
import { KIDS_MORE, type KidsNavItem } from '@/lib/kids/nav'
import './kids-animations.css'
import './kids-shell.css'

export default function KidsShell({ children }: { children: React.ReactNode }) {
  return (
    <ConfettiProvider>
      <KidsShellInner>{children}</KidsShellInner>
    </ConfettiProvider>
  )
}

// ONE navigation for the whole kids product (docs/kids-universe.md).
// Primary — five places at most on the phone tab bar: Home · Course · Worlds ·
// Games · Hangar. The desktop header has room for one more, so it also shows
// the Skill Galaxy; on phones the Galaxy moves into "More" (it is also one tap
// from Home, from every world page and from every course session).
interface Tab { href: string; emoji: string; label: string; match: (p: string) => boolean }

const HOME_TAB: Tab = { href: '/kids', emoji: '🏠', label: 'Home', match: (p) => p === '/kids' }
const COURSE_TAB: Tab = { href: '/kids/course', emoji: '🚀', label: 'Course', match: (p) => p.startsWith('/kids/course') || p.startsWith('/kids/lab/episodes') }
const WORLDS_TAB: Tab = { href: '/kids/worlds', emoji: '🧭', label: 'Worlds', match: (p) => p.startsWith('/kids/worlds') }
const GALAXY_TAB: Tab = { href: '/kids/galaxy', emoji: '🌌', label: 'Galaxy', match: (p) => p.startsWith('/kids/galaxy') }
const GAMES_TAB: Tab = { href: '/kids/play', emoji: '🎮', label: 'Games', match: (p) => p.startsWith('/kids/play') }
const HANGAR_TAB: Tab = { href: '/kids/hangar', emoji: '🛸', label: 'Hangar', match: (p) => p.startsWith('/kids/hangar') }

/** Phone tab bar: exactly five. */
const TABS: Tab[] = [HOME_TAB, COURSE_TAB, WORLDS_TAB, GAMES_TAB, HANGAR_TAB]
/** Desktop header (the logo is Home). */
const HEADER_TABS: Tab[] = [COURSE_TAB, WORLDS_TAB, GALAXY_TAB, GAMES_TAB, HANGAR_TAB]

// Secondary — the "More" menu (header, every width) and the "More ways to play" grid on Home.
// The Galaxy entry is shown in More on phones only (kids-more-phone-only), where it is not a tab.
const MORE: (KidsNavItem & { phoneOnly?: boolean })[] = [
  { href: GALAXY_TAB.href, emoji: GALAXY_TAB.emoji, label: 'Skill Galaxy', line: 'Short hands-on robotics missions in ten tracks.', phoneOnly: true },
  ...KIDS_MORE,
]

const MORE_MATCH = (p: string) =>
  KIDS_MORE.some((m) => p.startsWith(m.href)) || p.startsWith('/kids/challenge') || p.startsWith('/kids/my-robot')

/** The More menu: a disclosure button + list. Closes on Escape, outside click and navigation. */
function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btn.current?.focus() }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const on = MORE_MATCH(pathname)
  return (
    <div className="kids-more" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className={`kids-more-btn${on ? ' kids-nav-link-on' : ''}`}
        aria-expanded={open}
        aria-controls="kids-more-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="kids-more-dots">⋯</span>
        <span className="kids-more-label">More</span>
      </button>
      {open && (
        <div id="kids-more-menu" className="kids-more-menu" role="region" aria-label="More places to explore">
          <ul>
            {MORE.map((m) => (
              <li key={m.href} className={m.phoneOnly ? 'kids-more-phone-only' : undefined}>
                <Link href={m.href} className="kids-more-item" aria-current={pathname.startsWith(m.href) ? 'page' : undefined}>
                  <span aria-hidden className="kids-more-emoji">{m.emoji}</span>
                  <span>
                    <span className="kids-more-title">{m.label}</span>
                    <span className="kids-more-line">{m.line}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function KidsShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const [lvl, setLvl] = useState<{ level: number; title: string; xp: number } | null>(null)
  const { voiceOn, toggle, cancel } = useKidsVoice()
  useConfettiEventBridge()

  useEffect(() => {
    const read = () => {
      const xp = getProgress().xp
      const li = levelInfo(xp)
      setLvl({ level: li.level, title: li.title, xp })
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    // Older Robot World screens write progress in several steps; keep a slow poll as a safety net.
    const t = setInterval(read, 4000)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      clearInterval(t)
    }
  }, [])

  // Cancel any in-flight speech when navigating between kids pages.
  useEffect(() => {
    cancel()
  }, [pathname, cancel])

  // Installable app: register the kids service worker (scope /kids only).
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/kids-sw.js', { scope: '/kids' }).catch(() => undefined)
  }, [])

  // Teacher pages and the full-screen story player bring their own chrome.
  const bare = pathname.startsWith('/kids/classroom')

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'var(--void, #0A1120)',
        fontSize: '18px',
      }}
    >

      <header className="kids-nav">
        <Link href="/kids" className="kids-nav-brand" aria-label="R2BOT Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kids-icon.svg" alt="" width={36} height={36} className="kids-nav-logo" />
          <span className="kids-nav-brand-text">R2BOT <span className="kids-nav-brand-kids">Kids</span></span>
        </Link>
        {!bare && (
          <nav className="kids-nav-links" aria-label="Kids sections">
            {HEADER_TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`kids-nav-link${t.match(pathname) ? ' kids-nav-link-on' : ''}`}
                aria-current={t.match(pathname) ? 'page' : undefined}
              >
                <span aria-hidden className="kids-nav-link-emoji">{t.emoji}</span> {t.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="kids-nav-right">
          {!bare && <MoreMenu pathname={pathname} />}
          <InstallAppClient compact />
          <button
            type="button"
            onClick={toggle}
            aria-label={voiceOn ? 'Mute voices' : 'Turn voices on'}
            aria-pressed={voiceOn}
            className="kids-voice-toggle"
          >
            <span aria-hidden>{voiceOn ? '🔊' : '🔇'}</span>
          </button>
          <Link href="/kids/hangar" className="kids-nav-stars" aria-label={lvl ? `Level ${lvl.level}, ${lvl.title}, ${lvl.xp} XP — open your hangar` : 'Open your hangar'}>
            {/* Reserved width so the header never shifts after hydration. */}
            <span className="inline-block min-w-[3.5rem] text-center">{lvl ? `Lv ${lvl.level}` : 'Lv 1'}</span>
          </Link>
        </div>
      </header>

      <main className="kids-main">{children}</main>

      {!bare && (
        <footer className="kids-footer">
          <span className="kids-footer-label">For grown-ups:</span>
          <Link href="/kids/parents">Parents</Link>
          <Link href="/kids/teach">Teachers</Link>
          <Link href="/kids/schools">Schools</Link>
          <Link href="/kids/join">Join a class</Link>
          <Link href="/kids/classroom">Teacher classroom</Link>
          <Link href="/privacy#kids">Privacy</Link>
          <Link href="/">R2BOT.in</Link>
        </footer>
      )}

      {/* Spark's floating helper belongs to the Robot World games; on the story player,
          the 3D workshop and the code editor it would sit on top of the controls. */}
      {(pathname.startsWith('/kids/world') || pathname.startsWith('/kids/challenge') || pathname.startsWith('/kids/my-robot')) && <SparkGuide />}

      {/* Pushes a progress snapshot to the teacher, only if this child joined a class. */}
      <KidsClassSync />
      <RewardToast />
      {/* Inside the store app: links that leave /kids go through a parental gate. */}
      <KidsAppLinkGuard />

      {/* App-style tab bar on phones */}
      {!bare && (
        <nav className="kids-tabbar" aria-label="Kids sections">
          {TABS.map((t) => {
            const on = t.match(pathname)
            return (
              <Link key={t.href} href={t.href} className={`kids-tab${on ? ' kids-tab-on' : ''}`} aria-current={on ? 'page' : undefined}>
                <span className="kids-tab-emoji" aria-hidden>{t.emoji}</span>
                <span className="kids-tab-label">{t.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

    </div>
  )
}
