'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SparkGuide } from '@/components/kids/SparkGuide'
import { ConfettiProvider, useConfettiEventBridge } from '@/components/kids/Confetti'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { InstallAppClient } from '@/components/kids/InstallAppClient'
import { KidsClassSync } from '@/components/kids/classroom/KidsClassSyncClient'
import { useKidsVoice } from '@/lib/kids-voice'
import './kids-animations.css'

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
  const [stars, setStars] = useState(0)
  const { voiceOn, toggle, cancel } = useKidsVoice()
  useConfettiEventBridge()

  useEffect(() => {
    const read = () => setStars(getProgress().totalStars)
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
        background: 'var(--spark-bg, #0F0A1E)',
        fontSize: '18px',
      }}
    >
      {/* Twinkling stars backdrop — applied to all kids pages */}
      <div className="kids-bg-stars" aria-hidden="true" />

      <header className="kids-nav">
        <Link href="/kids" className="kids-nav-brand" aria-label="R2BOT Kids home">
          <span className="kids-nav-brand-emoji" aria-hidden>🤖</span>
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
          <div className="kids-nav-stars" aria-label={`${stars} stars`}>⭐ {stars}</div>
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

      <style jsx global>{`
        :root {
          --spark-yellow: #FFD700;
          --spark-orange: #FF6B35;
          --spark-purple: #7C3AED;
          --spark-green: #10B981;
          --spark-blue: #3B82F6;
          --spark-red: #EF4444;
          --spark-bg: #0F0A1E;
          --spark-card: #1A1040;
        }
        .kids-bg-stars {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 12% 14%, #ffffff66 50%, transparent 60%),
            radial-gradient(1.5px 1.5px at 30% 80%, #ffffff66 50%, transparent 60%),
            radial-gradient(2px 2px at 70% 22%, #ffffff66 50%, transparent 60%),
            radial-gradient(1px 1px at 85% 65%, #ffffff66 50%, transparent 60%),
            radial-gradient(2px 2px at 50% 50%, #ffffff44 50%, transparent 60%),
            radial-gradient(1.5px 1.5px at 92% 9%, #ffffff66 50%, transparent 60%),
            radial-gradient(1px 1px at 20% 60%, #ffffff44 50%, transparent 60%);
          animation: kids-twinkle 6s linear infinite alternate;
        }
        @keyframes kids-twinkle {
          0%   { opacity: .55 }
          100% { opacity: .95 }
        }
        .kids-nav {
          position: sticky; top: 0; z-index: 30;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 20px;
          background: rgba(15, 10, 30, 0.85);
          backdrop-filter: blur(8px);
          border-bottom: 2px solid rgba(124, 58, 237, 0.3);
        }
        .kids-nav-brand {
          display: inline-flex; align-items: center; gap: 8px;
          font-weight: 900; font-size: 18px;
          color: var(--spark-yellow);
          text-decoration: none;
          letter-spacing: 0.5px;
        }
        .kids-nav-brand-emoji { font-size: 22px; }
        .kids-nav-links {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .kids-nav-link {
          min-height: 48px;
          display: inline-flex; align-items: center;
          padding: 0 14px;
          border-radius: 14px;
          background: #1a1040;
          color: #FFC9A8;
          font-weight: 800;
          text-decoration: none;
          border: 2px solid #312e81;
          transition: transform .15s, background .15s;
        }
        .kids-nav-link:hover { transform: scale(1.05); background: #2a1860; }
        .kids-nav-link-on { background: #3b1d8a; color: #fff; border-color: #a78bfa; }
        .kids-nav-brand-kids { color: #fff; }
        .kids-nav-right { display: flex; align-items: center; gap: 8px; }
        .kids-nav-stars {
          background: linear-gradient(135deg, #FC6818, #FF8A4C);
          color: #1a1040;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 16px;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(255,138,76, 0.35);
        }
        .kids-main {
          position: relative; z-index: 1;
          padding-bottom: 40px;
        }
        .kids-footer {
          position: relative; z-index: 1;
          display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px;
          padding: 24px 16px 32px;
          border-top: 1px solid rgba(124, 58, 237, 0.25);
          font-size: 14px;
        }
        .kids-footer a { color: #c4b5fd; text-decoration: none; padding: 10px 2px; font-weight: 700; }
        .kids-footer a:hover { color: #fff; text-decoration: underline; }
        .kids-voice-toggle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid rgba(124, 58, 237, 0.55);
          background: linear-gradient(135deg, #2a1860, #1a1040);
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform .15s;
        }
        .kids-voice-toggle:hover { transform: scale(1.07); }
        .kids-voice-toggle:focus-visible, .kids-tab:focus-visible, .kids-nav-link:focus-visible {
          outline: 3px solid #FF8A4C;
          outline-offset: 3px;
        }
        .kids-tabbar { display: none; }
        @media (max-width: 900px) {
          .kids-nav-links { display: none; }
        }
        @media (max-width: 900px) {
          .kids-tabbar {
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 35;
            display: grid; grid-template-columns: repeat(5, 1fr);
            padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
            background: rgba(15, 10, 30, 0.94);
            backdrop-filter: blur(10px);
            border-top: 2px solid rgba(124, 58, 237, 0.35);
          }
          .kids-tab {
            min-height: 56px;
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
            border-radius: 14px;
            color: #c4b5fd; text-decoration: none; font-weight: 800; font-size: 12px;
          }
          .kids-tab-emoji { font-size: 22px; line-height: 1; transition: transform .15s; }
          .kids-tab-on { background: #2a1860; color: #fff; }
          .kids-tab-on .kids-tab-emoji { transform: scale(1.15); }
          .kids-main { padding-bottom: 24px; }
          .kids-footer { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
        }
        @media (max-width: 640px) {
          .kids-nav { padding: 10px 12px; }
          .kids-nav-stars { padding: 8px 10px; font-size: 14px; }
          .kids-voice-toggle { width: 44px; height: 44px; }
        }
      `}</style>
    </div>
  )
}
