'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SparkGuide } from '@/components/kids/SparkGuide'
import { ConfettiProvider, useConfettiEventBridge } from '@/components/kids/Confetti'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { levelInfo } from '@/lib/kids/universe/rewards'
import { InstallAppClient } from '@/components/kids/InstallAppClient'
import { KidsClassSync } from '@/components/kids/classroom/KidsClassSyncClient'
import { RewardToast } from '@/components/kids/ui/RewardToastClient'
import { useKidsVoice } from '@/lib/kids-voice'
import './kids-animations.css'
import './kids-shell.css'

export default function KidsShell({ children }: { children: React.ReactNode }) {
  return (
    <ConfettiProvider>
      <KidsShellInner>{children}</KidsShellInner>
    </ConfettiProvider>
  )
}

const TABS: { href: string; emoji: string; label: string; match: (p: string) => boolean }[] = [
  { href: '/kids', emoji: '🏠', label: 'Home', match: (p) => p === '/kids' },
  { href: '/kids/stories', emoji: '🎬', label: 'Stories', match: (p) => p.startsWith('/kids/stories') },
  { href: '/kids/workshop', emoji: '🛠️', label: 'Build', match: (p) => p.startsWith('/kids/workshop') || p.startsWith('/kids/my-robot') },
  { href: '/kids/code-lab', emoji: '🧩', label: 'Code', match: (p) => p.startsWith('/kids/code-lab') },
  { href: '/kids/world', emoji: '🗺️', label: 'World', match: (p) => p.startsWith('/kids/world') || p.startsWith('/kids/challenge') },
]

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
            {TABS.slice(1).map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`kids-nav-link${t.match(pathname) ? ' kids-nav-link-on' : ''}`}
                aria-current={t.match(pathname) ? 'page' : undefined}
              >
                <span aria-hidden>{t.emoji}</span> {t.label === 'Build' ? 'Workshop' : t.label === 'Code' ? 'Code Lab' : t.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="kids-nav-right">
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
          <Link href="/kids/parents">Parents</Link>
          <Link href="/kids/schools">Schools</Link>
          <Link href="/kids/join">Join a class</Link>
          <Link href="/kids/my-robot">Robot card</Link>
          <Link href="/kids/activities">Printables</Link>
          <Link href="/">R2BOT for grown-ups</Link>
        </footer>
      )}

      {/* Spark's floating helper belongs to the Robot World games; on the story player,
          the 3D workshop and the code editor it would sit on top of the controls. */}
      {(pathname.startsWith('/kids/world') || pathname.startsWith('/kids/challenge') || pathname.startsWith('/kids/my-robot')) && <SparkGuide />}

      {/* Pushes a progress snapshot to the teacher, only if this child joined a class. */}
      <KidsClassSync />
      <RewardToast />

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
