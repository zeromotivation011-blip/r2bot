'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SparkGuide } from '@/components/kids/SparkGuide'
import { ConfettiProvider, useConfettiEventBridge } from '@/components/kids/Confetti'
import { getProgress } from '@/lib/kids-progress'
import { useKidsVoice } from '@/lib/kids-voice'
import './kids-animations.css'

export default function KidsShell({ children }: { children: React.ReactNode }) {
  return (
    <ConfettiProvider>
      <KidsShellInner>{children}</KidsShellInner>
    </ConfettiProvider>
  )
}

function KidsShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const isEntry = pathname === '/kids'
  const [stars, setStars] = useState(0)
  const { voiceOn, toggle, cancel } = useKidsVoice()
  useConfettiEventBridge()

  useEffect(() => {
    const tick = () => setStars(getProgress().totalStars)
    tick()
    const t = setInterval(tick, 1500)
    return () => clearInterval(t)
  }, [])

  // Cancel any in-flight speech when navigating between kids pages.
  useEffect(() => {
    cancel()
  }, [pathname, cancel])

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

      {!isEntry && (
        <header className="kids-nav">
          <Link href="/kids/world" className="kids-nav-brand">
            <span className="kids-nav-brand-emoji" aria-hidden>🌟</span>
            <span className="kids-nav-brand-text">Robot World</span>
          </Link>
          <nav className="kids-nav-links">
            <Link href="/kids/world" className="kids-nav-link">🗺️ World</Link>
            <Link href="/kids/my-robot" className="kids-nav-link">🤖 My Robot</Link>
            <Link href="/kids/parents" className="kids-nav-link kids-nav-link-quiet">👪 Parents</Link>
          </nav>
          <div className="kids-nav-stars">⭐ {stars}</div>
        </header>
      )}

      <main className="kids-main">{children}</main>

      <SparkGuide />

      {/* Global voice mute toggle — always reachable */}
      <button
        type="button"
        onClick={toggle}
        aria-label={voiceOn ? 'Mute Spark voice' : 'Unmute Spark voice'}
        aria-pressed={voiceOn}
        className="kids-voice-toggle"
      >
        <span aria-hidden>{voiceOn ? '🔊' : '🔇'}</span>
      </button>

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
          color: #fde68a;
          font-weight: 800;
          text-decoration: none;
          border: 2px solid #312e81;
          transition: transform .15s, background .15s;
        }
        .kids-nav-link:hover { transform: scale(1.05); background: #2a1860; }
        .kids-nav-link-quiet { background: transparent; color: #c4b5fd; border-color: #4c1d95; }
        .kids-nav-stars {
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          color: #1a1040;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(251, 191, 36, 0.35);
        }
        .kids-main {
          position: relative; z-index: 1;
          padding-bottom: 60px;
        }
        @media (max-width: 640px) {
          .kids-nav { padding: 10px 12px; }
          .kids-nav-brand-text { display: none; }
          .kids-nav-link { padding: 0 10px; font-size: 13px; }
          .kids-nav-stars { padding: 8px 10px; font-size: 13px; }
        }
        .kids-voice-toggle {
          position: fixed;
          left: 16px;
          bottom: 16px;
          z-index: 40;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 2px solid rgba(124, 58, 237, 0.55);
          background: linear-gradient(135deg, #2a1860, #1a1040);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(0,0,0,0.4);
          display: grid;
          place-items: center;
          transition: transform .15s, box-shadow .15s, background .15s;
        }
        .kids-voice-toggle:hover {
          transform: scale(1.07);
          box-shadow: 0 12px 30px rgba(124,58,237,0.55);
        }
        .kids-voice-toggle:focus-visible {
          outline: 3px solid #fbbf24;
          outline-offset: 3px;
        }
      `}</style>
    </div>
  )
}
