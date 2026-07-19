'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Reveal } from '@/components/Reveal'
import { FeatureTour } from '@/components/FeatureTour'

type Track = 'spark' | 'wire' | 'forge' | 'edge'

interface Personalization {
  signedIn: boolean
  firstName: string | null
  track: Track | null
}

export interface HomeNewsItem { title: string; url: string; source: string; topic: string }
export interface HomeVideoItem { title: string; url: string; thumbnailUrl: string; channel: string }

interface HomeClientProps {
  atlasCount: number
  projectCount: number
  news?: HomeNewsItem[]
  videos?: HomeVideoItem[]
}

function usePersonalization(): Personalization {
  const [state, setState] = useState<Personalization>({ signedIn: false, firstName: null, track: null })

  useEffect(() => {
    let cancelled = false
    // Anonymous bootstrap from localStorage.
    try {
      const t = window.localStorage.getItem('r2bot_track')
      if (t === 'spark' || t === 'wire' || t === 'forge' || t === 'edge') {
        setState((s) => ({ ...s, track: t as Track }))
      }
    } catch { /* ignore */ }

    ;(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('display_name, diagnostic_track')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        const firstName = (data?.display_name as string | null)?.split(' ')[0]
          ?? (user.email ?? '').split('@')[0]
          ?? null
        const track = data?.diagnostic_track
        setState({
          signedIn: true,
          firstName: firstName || null,
          track: track === 'spark' || track === 'wire' || track === 'forge' || track === 'edge' ? (track as Track) : null,
        })
      } catch { /* personalization is best-effort */ }
    })()
    return () => { cancelled = true }
  }, [])

  return state
}

const TRACK_LABEL: Record<Track, string> = {
  spark: 'Spark', wire: 'Wire', forge: 'Forge', edge: 'Edge',
}

export default function HomeClient({ atlasCount, projectCount, news = [], videos = [] }: HomeClientProps) {
  const personalization = usePersonalization()
  const showDiagnosticBanner = personalization.signedIn && !personalization.track
  return (
    <main style={{ background: '#0a0a0f', color: '#fff' }}>
      <FeatureTour />
      <Hero personalization={personalization} atlasCount={atlasCount} projectCount={projectCount} />
      {showDiagnosticBanner && (
        <section style={{
          padding: '20px 20px', background: 'rgba(245,158,11,0.08)',
          borderBottom: '1px solid rgba(245,158,11,0.25)',
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 14, color: '#fde68a', fontWeight: 700 }}>
              🎯 Find your level — take the 5-minute test to get your personalized roadmap.
            </span>
            <Link href="/diagnostic" style={{
              padding: '8px 18px', background: '#fbbf24', color: '#1a0f00',
              borderRadius: 999, fontSize: 13, fontWeight: 900, textDecoration: 'none',
            }}>
              Take the test →
            </Link>
          </div>
        </section>
      )}
      <Ticker atlasCount={atlasCount} />
      <Reveal><MissionStrip /></Reveal>
      <Reveal><Features atlasCount={atlasCount} /></Reveal>
      <Reveal><SimulatorShowcase /></Reveal>
      <Reveal><IndiaSpotlight /></Reveal>
      <Reveal><Testimonials /></Reveal>
      <Reveal><NewsTeaser items={news} /></Reveal>
      <Reveal><LensTeaser items={videos} /></Reveal>
      <Reveal><NewsletterCTA /></Reveal>
      <Footer />

      <style jsx global>{`
        :global(body) { background: #0a0a0f; }
      `}</style>
    </main>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────
function Hero({ personalization, atlasCount, projectCount }: { personalization: Personalization; atlasCount: number; projectCount: number }) {
  const continueHref = personalization.track ? `/academy/${personalization.track}` : '/academy'
  const primaryLabel = personalization.track
    ? `Continue ${TRACK_LABEL[personalization.track]} →`
    : 'Start Learning →'
  return (
    <section
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        padding: '120px 20px 60px',
        background:
          'radial-gradient(circle at 18% 32%, rgba(0,184,212,.14), transparent 50%), radial-gradient(circle at 82% 60%, rgba(165,107,255,.12), transparent 50%), #0a0a0f',
      }}
    >
      {/* Grid background */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      {/* Glow orbs */}
      <div aria-hidden style={{ position: 'absolute', top: '15%', left: '5%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(0,229,255,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '20%', right: '8%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(165,107,255,0.07)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          {personalization.signedIn && personalization.firstName && (
            <p style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 700, margin: '0 0 8px' }}>
              Welcome back, <span style={{ color: '#fbbf24' }}>{personalization.firstName}</span>.
            </p>
          )}
          <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 16px' }}>
            R2BOT · ROBOT, decoded — for the world
          </p>

          <h1 style={{
            fontSize: 'clamp(38px, 5.5vw, 70px)',
            fontWeight: 900,
            lineHeight: 1.04,
            margin: '0 0 20px',
            letterSpacing: '-1px',
          }}>
            The{' '}
            <span style={{ background: 'linear-gradient(90deg, #00E5FF, #A56BFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              clearest way to learn robotics
            </span>
            {' '}on the internet.
          </h1>

          <p style={{ fontSize: 18, color: '#c4b5fd', maxWidth: 560, lineHeight: 1.65, margin: '0 0 10px' }}>
            Project-based robotics learning from first principles to AI — with an AI mentor, real simulators, and hands-on builds. For students, career-switchers, and the curious, everywhere.
          </p>
          <p style={{ fontSize: 16, color: '#f97316', fontWeight: 700, margin: '0 0 28px' }}>
            Learn it. Build it. Ship it.
          </p>

          {/* Stats pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
            <StatPill n={atlasCount} label="Atlas concepts" color="#00E5FF" />
            <StatPill n={9}           label="Simulators"     color="#A56BFF" />
            <StatPill n={projectCount} label="Robot Projects" color="#fbbf24" />
            <StatPill n={4}           label="Learning tracks" color="#10b981" displayValue="4" />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href={continueHref} style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 54, padding: '0 28px',
              background: 'linear-gradient(135deg, #00E5FF, #A56BFF)',
              color: '#0f0a1e', borderRadius: 14,
              fontSize: 16, fontWeight: 900, textDecoration: 'none',
              boxShadow: '0 10px 36px rgba(0,229,255,0.28)',
              transition: 'transform .15s, box-shadow .15s',
            }}>
              {primaryLabel}
            </Link>
            <Link href="/visualizer" style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 54, padding: '0 24px',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 14, fontSize: 16, fontWeight: 800,
              textDecoration: 'none', transition: 'border-color .15s',
            }}>
              🤖 Try Simulator
            </Link>
          </div>
        </div>

        {/* Right: Robot + floating cards */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="hero-right-desktop">
          <FloatingRobot />
          {/* Floating feature cards */}
          <div style={{ position: 'absolute', top: 20, right: -20, background: 'rgba(15,10,30,0.92)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 14, padding: '10px 14px', minWidth: 150, backdropFilter: 'blur(12px)' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#00E5FF', margin: 0 }}>{atlasCount.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 700 }}>Robotics concepts in Atlas</p>
          </div>
          <div style={{ position: 'absolute', bottom: 60, left: -28, background: 'rgba(15,10,30,0.92)', border: '1px solid rgba(165,107,255,0.3)', borderRadius: 14, padding: '10px 14px', minWidth: 160, backdropFilter: 'blur(12px)' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#A56BFF', margin: 0 }}>AI Co-pilot</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 700 }}>Your 24/7 robotics mentor</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) { .hero-right-desktop { display: none !important; } }
      `}</style>
    </section>
  )
}

function StatPill({ n, label, color, displayValue }: { n: number; label: string; color: string; displayValue?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const startedRef = useRef(false)
  const rafRef = useRef(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (displayValue != null) return
    const el = ref.current
    if (!el) return
    const run = () => {
      if (startedRef.current) return
      startedRef.current = true
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduceMotion || n <= 0) { setCount(Math.max(0, n)); return }
      const start = performance.now()
      const dur = 900
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur)
        setCount(Math.round(n * (1 - Math.pow(1 - t, 3))))
        if (t < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }
    const obs = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) run() },
      { threshold: 0.25 },
    )
    obs.observe(el)
    const timer = window.setTimeout(run, 500)
    return () => { obs.disconnect(); window.clearTimeout(timer); cancelAnimationFrame(rafRef.current) }
  }, [n, displayValue])

  return (
    <div ref={ref} style={{
      background: '#111118', border: '1px solid #1f1f2a',
      borderRadius: 16, padding: '12px 18px',
    }}>
      <p style={{
        fontSize: 28, fontWeight: 900, margin: 0, tabularNums: 'true',
        background: `linear-gradient(90deg, ${color}, #fff)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      } as React.CSSProperties}>{displayValue ?? count.toLocaleString()}</p>
      <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{label}</p>
    </div>
  )
}

function FloatingRobot() {
  return (
    <div style={{ position: 'relative', width: 280, height: 340 }}>
      <svg viewBox="0 0 220 260" width="280" height="340" aria-hidden style={{ animation: 'float 4s ease-in-out infinite' }}>
        <defs>
          <linearGradient id="rg1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#00B8D4" />
            <stop offset="100%" stopColor="#0080A0" />
          </linearGradient>
          <linearGradient id="rg2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#A56BFF" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <line x1="110" y1="14" x2="110" y2="36" stroke="#fbbf24" strokeWidth="3" />
        <circle cx="110" cy="10" r="6" fill="#fde047" />
        <rect x="50" y="36" width="120" height="80" rx="16" fill="url(#rg1)" stroke="#00E5FF" strokeWidth="1.5" />
        <rect x="62" y="48" width="96" height="50" rx="8" fill="#0a0a0f" />
        <circle cx="88" cy="70" r="7" fill="#00E5FF" />
        <circle cx="132" cy="70" r="7" fill="#A56BFF" />
        <circle cx="90" cy="68" r="2.5" fill="#0a0a0f" />
        <circle cx="134" cy="68" r="2.5" fill="#0a0a0f" />
        <path d="M82 88 Q110 102 138 88" stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="62" y="122" width="96" height="76" rx="10" fill="url(#rg2)" />
        <rect x="84" y="138" width="52" height="32" rx="4" fill="#0a0a0f" />
        <circle cx="94" cy="154" r="3" fill="#fde047" />
        <circle cx="106" cy="154" r="3" fill="#10b981" />
        <circle cx="118" cy="154" r="3" fill="#ef4444" />
        <rect x="22" y="130" width="34" height="14" rx="6" fill="#00B8D4" />
        <rect x="164" y="130" width="34" height="14" rx="6" fill="#00B8D4" />
        <circle cx="82" cy="216" r="20" fill="#1f1f2a" stroke="#00B8D4" strokeWidth="2" />
        <circle cx="138" cy="216" r="20" fill="#1f1f2a" stroke="#00B8D4" strokeWidth="2" />
        <circle cx="82" cy="216" r="7" fill="#0a0a0f" />
        <circle cx="138" cy="216" r="7" fill="#0a0a0f" />
      </svg>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  )
}

// ─── TICKER ───────────────────────────────────────────────────────────────
function Ticker({ atlasCount }: { atlasCount: number }) {
  const items = [
    '⚡ Spark · Wire · Forge · Edge — four complete robotics tracks',
    '🌐 In English — Hindi & Spanish coming',
    '🔬 9 in-browser simulators — no install needed',
    `📚 ${atlasCount.toLocaleString()} Atlas concepts`,
    '🤖 R2 Co-pilot — your AI robotics mentor',
    '🌍 50 countries on the robotics map',
    '🛠️ 20+ guided robot builds',
    '🎓 Certificates for every course',
    '🔥 Spaced repetition built in',
  ]
  return (
    <section style={{ background: '#08080d', borderTop: '1px solid #1f1f2a', borderBottom: '1px solid #1f1f2a', overflow: 'hidden', height: 44, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <div className="ticker-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
          {[...items, ...items].map((t, i) => (
            <span key={i} style={{ padding: '0 28px', color: '#cbd5e1', fontSize: 13, fontWeight: 600, borderRight: '1px solid #1f1f2a' }}>{t}</span>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { animation: ticker 55s linear infinite; }
      `}</style>
    </section>
  )
}

// ─── MISSION STRIP ────────────────────────────────────────────────────────
function MissionStrip() {
  return (
    <section style={{
      padding: '72px 20px',
      background: 'linear-gradient(135deg, rgba(0,229,255,0.07), rgba(165,107,255,0.07))',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#00E5FF', fontWeight: 900, margin: '0 0 16px' }}>
          Our Mission
        </p>
        <h2 style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 900, color: '#fff', margin: '0 0 18px', lineHeight: 1.2 }}>
          Make robotics as learnable as a language.
        </h2>
        <p style={{ fontSize: 17, color: '#94a3b8', maxWidth: 720, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Robotics is about to reshape every industry on Earth. Yet most people who are curious about it have never seen a robot up close — let alone programmed one.
          R2BOT exists to close that gap for everyone: structured courses, real simulators, an AI mentor, and the clearest robotics knowledge on the internet.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
          {[
            { stat: '4 Tracks', sub: 'Spark → Wire → Forge → Edge' },
            { stat: 'Multilingual', sub: 'English now — more languages coming' },
            { stat: 'No hardware needed', sub: 'Simulators do the heavy lifting' },
            { stat: 'AI Co-pilot', sub: 'Your 24/7 robotics mentor' },
          ].map(({ stat, sub }) => (
            <div key={stat} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '14px 20px', minWidth: 160, textAlign: 'center',
            }}>
              <p style={{ fontWeight: 900, fontSize: 15, color: '#00E5FF', margin: '0 0 4px' }}>{stat}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FEATURES ─────────────────────────────────────────────────────────────
function Features({ atlasCount }: { atlasCount: number }) {
  const cards = [
    { icon: '🎓', name: 'Academy',            sub: '4 tracks from beginner to AI. Project-based. Certificates that mean something.', badge: 'Spark → Edge', cta: 'Explore Academy →', href: '/academy', color: '#00E5FF' },
    { icon: '🧠', name: 'Atlas',              sub: `${atlasCount.toLocaleString()} robotics concepts — sensors, motors, AI, SLAM — defined clearly and connected.`, badge: `${atlasCount.toLocaleString()} concepts`, cta: 'Open Atlas →', href: '/atlas', color: '#A56BFF' },
    { icon: '🤖', name: 'Simulators',         sub: '9 real-time robotics simulators. Line followers, PID, kinematics, sensor fusion — in your browser.', badge: '9 simulators', cta: 'Launch Simulator →', href: '/visualizer', color: '#FFB800' },
    { icon: '🌐', name: 'ROS2 Playground',    sub: 'A live Linux shell in your browser. Write real ROS2 commands, no setup required.', badge: 'Live shell', cta: 'Open Playground →', href: '/ros2', color: '#10b981' },
    { icon: '🤖', name: 'R2 Co-pilot',            sub: 'Your AI mentor. Ask anything, get precise answers grounded in the Atlas. Available on every page.', badge: 'AI Mentor', cta: 'Meet R2 →', href: '/copilot', color: '#f59e0b' },
    { icon: '🌍', name: 'Robotics in Daily Life', sub: 'From surgical robots to self-driving cars — see how robotics is changing the world right now.', badge: 'Real world', cta: 'Explore →', href: '/daily-life', color: '#ef4444' },
  ]
  return (
    <section style={{ padding: '80px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
          <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#A56BFF', fontWeight: 900, margin: '0 0 12px' }}>
            Everything Inside
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, margin: 0, color: '#fff' }}>
            Six worlds. One platform.
          </h2>
          <p style={{ marginTop: 10, color: '#64748b', fontSize: 15 }}>
            Each piece stands alone — and connects when you're ready to go deeper.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {cards.map(c => (
            <Link
              key={c.name}
              href={c.href}
              style={{
                display: 'block', padding: 24,
                background: '#111118', border: '1px solid #1f1f2a',
                borderRadius: 18, textDecoration: 'none',
                transition: 'transform .2s, border-color .2s, box-shadow .2s',
                '--accent': c.color,
              } as React.CSSProperties}
              className="feat-card r2-lift"
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>{c.name}</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 14px' }}>{c.sub}</p>
              <span style={{
                display: 'inline-block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px',
                fontWeight: 900, padding: '4px 10px', borderRadius: 999,
                background: c.color + '20', color: c.color,
              }}>{c.badge}</span>
              <p style={{ marginTop: 14, fontSize: 14, fontWeight: 800, color: c.color }}>{c.cta}</p>
            </Link>
          ))}
        </div>
      </div>
      <style jsx>{`
        .feat-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent, #00E5FF);
          box-shadow: 0 18px 50px rgba(0,0,0,.4), 0 0 0 1px var(--accent, #00E5FF);
        }
      `}</style>
    </section>
  )
}

// ─── SIMULATOR SHOWCASE ───────────────────────────────────────────────────
function SimulatorShowcase() {
  const sims = [
    { name: 'PID Controller',      slug: 'pid',    color: '#00E5FF', desc: 'Tune P, I, and D gains and watch the robot reach its target' },
    { name: 'Arm Kinematics',      slug: 'ik',     color: '#A56BFF', desc: 'Forward + inverse kinematics for a robotic arm' },
    { name: 'Sensor Fusion',       slug: 'fusion', color: '#FFB800', desc: 'Kalman filter combining GPS + IMU for accuracy' },
    { name: 'A* Pathfinder',       slug: 'astar',  color: '#10b981', desc: 'Draw a maze and watch A* find the shortest path' },
  ]
  return (
    <section style={{
      padding: '80px 20px',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0818 50%, #0a0a0f 100%)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#FFB800', fontWeight: 900, margin: '0 0 14px' }}>
              Interactive Simulators
            </p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.2 }}>
              Learn by doing — no hardware required.
            </h2>
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px' }}>
              9 real-time robotics simulators run entirely in your browser. Each one is linked to a lesson in the Academy — watch the theory, then run the simulation and see it come alive.
            </p>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 28px' }}>
              Every simulator has share and embed links — like Desmos but for robots. Share your tuned controller with your class.
            </p>
            <Link href="/visualizer" style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 50, padding: '0 24px',
              background: 'linear-gradient(135deg, #FFB800, #f97316)',
              color: '#0f0a1e', borderRadius: 12, fontWeight: 900, fontSize: 15,
              textDecoration: 'none', boxShadow: '0 8px 24px rgba(255,184,0,0.22)',
            }}>
              Open Simulator Lab →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            {sims.map(s => (
              <Link
                key={s.slug}
                href={`/visualizer#${s.slug}`}
                style={{
                  display: 'block', padding: '18px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${s.color}33`,
                  borderRadius: 14, textDecoration: 'none',
                  transition: 'transform .15s, border-color .15s',
                }}
                className="sim-card r2-lift"
              >
                <p style={{ fontWeight: 900, color: s.color, fontSize: 13, margin: '0 0 6px' }}>{s.name}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .sim-card:hover { transform: translateY(-2px); border-color: currentColor !important; }
        @media (max-width: 768px) { .sim-card { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  )
}

// ─── INDIA SPOTLIGHT ──────────────────────────────────────────────────────
function IndiaSpotlight() {
  return (
    <section style={{
      position: 'relative', padding: '80px 20px',
      background: 'linear-gradient(180deg, rgba(249,115,22,.08) 0%, rgba(16,185,129,.06) 100%), #0a0a0f',
      borderTop: '1px solid rgba(249,115,22,.18)', borderBottom: '1px solid rgba(16,185,129,.15)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#f97316', fontWeight: 900, margin: '0 0 14px' }}>
              Global · Built for the world
            </p>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.2 }}>
              Built for the world. Priced for everyone.
            </h2>
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 560 }}>
              Robotics is the fastest-growing field on Earth. R2BOT makes it learnable anywhere — free to explore, affordable to master, in plain English (with more languages coming).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              <Pillar emoji="🌍" title="Learn anywhere" body="Runs in your browser — no hardware, no install, no borders." />
              <Pillar emoji="🛠️" title="Learn by building" body="20+ guided robot projects, in sim or on real hardware." />
              <Pillar emoji="🤖" title="AI mentor" body="R2 Co-pilot answers anything, grounded in the Atlas." />
            </div>
            <Link href="/atlas" style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 20px',
              background: '#f97316', color: '#0f0a1e', borderRadius: 12,
              fontWeight: 900, fontSize: 14, textDecoration: 'none',
            }}>
              Explore the Robotics Atlas →
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GlobalReach />
          </div>
        </div>
      </div>
    </section>
  )
}

function Pillar({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div style={{
      borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
      background: '#111118', padding: 16,
    }}>
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <p style={{ marginTop: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', color: '#f97316', fontWeight: 900 }}>{title}</p>
      <p style={{ marginTop: 4, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{body}</p>
    </div>
  )
}

function GlobalReach() {
  const nodes = [
    { cx: 96,  cy: 96,  r: 4 },
    { cx: 120, cy: 150, r: 4 },
    { cx: 150, cy: 84,  r: 4 },
    { cx: 168, cy: 150, r: 4 },
    { cx: 196, cy: 108, r: 5 },
    { cx: 212, cy: 150, r: 4 },
  ]
  return (
    <svg viewBox="0 0 280 280" width="240" height="240" aria-hidden style={{ filter: 'drop-shadow(0 12px 30px rgba(249,115,22,0.22))' }}>
      <defs>
        <radialGradient id="globe-g" cx="40%" cy="35%" r="75%">
          <stop offset="0%"  stopColor="#1b2540" />
          <stop offset="70%" stopColor="#0d1526" />
          <stop offset="100%" stopColor="#080b14" />
        </radialGradient>
      </defs>
      <circle cx="140" cy="130" r="110" fill="url(#globe-g)" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.5" />
      {[70, 100, 130, 160, 190].map((cy, i) => (
        <ellipse key={i} cx="140" cy={cy} rx={Math.max(18, 108 - Math.abs(130 - cy) * 0.9)} ry="10"
          fill="none" stroke="#334155" strokeWidth="1" strokeOpacity="0.5" />
      ))}
      {[30, 62, 94].map((rx, i) => (
        <ellipse key={i} cx="140" cy="130" rx={rx} ry="110"
          fill="none" stroke="#334155" strokeWidth="1" strokeOpacity="0.5" />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r={n.r + 4} fill="#f97316" opacity="0.18" />
          <circle cx={n.cx} cy={n.cy} r={n.r} fill="#f97316" />
        </g>
      ))}
      <text x="140" y="258" fontSize="12" fontWeight="800" fill="#fbbf24" textAnchor="middle" letterSpacing="1">
        Learners in 50+ countries
      </text>
    </svg>
  )
}

// ─── WHY R2BOT — honest value props (no fabricated testimonials) ──────────
function Testimonials() {
  const points = [
    { icon: '🎮', label: 'Interactive', color: '#00E5FF',
      body: 'Concepts link to live simulators you tune in the browser. Read the theory, then run it — PID, kinematics, sensor fusion, pathfinding.' },
    { icon: '🪜', label: 'Beginner → Advanced', color: '#A56BFF',
      body: 'Every Atlas entry ladders from a plain-English analogy to the real math and code — so it answers your first question and your deepest one.' },
    { icon: '🤖', label: 'AI Mentor', color: '#10b981',
      body: 'R2 Co-pilot is on every page. It answers grounded in the Atlas, cites its sources, and is built not to invent specs.' },
    { icon: '🛠️', label: 'Learn by Building', color: '#FFB800',
      body: '20+ guided robot projects with full parts lists and code — in simulation, or on real hardware when you\'re ready.' },
    { icon: '📡', label: 'Always Current', color: '#f97316',
      body: 'The best robotics news and YouTube explainers are pulled in and summarized automatically, every single day.' },
    { icon: '🎁', label: 'Free to Explore', color: '#ef4444',
      body: 'The full Atlas, the Spark beginner track, and daily Co-pilot cost nothing. No card required to start learning.' },
  ]
  return (
    <section style={{ padding: '80px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
          <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#00E5FF', fontWeight: 900, margin: '0 0 12px' }}>
            Why R2BOT
          </p>
          <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, margin: 0 }}>
            Built to make robotics actually click.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {points.map(p => (
            <div key={p.label} className="r2-lift" style={{
              background: '#111118', border: '1px solid #1f1f2a',
              borderRadius: 18, padding: '22px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{
                  width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
                  background: p.color + '18', border: `1px solid ${p.color}33`, fontSize: 20,
                }}>{p.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: p.color, background: p.color + '14', borderRadius: 999,
                  padding: '4px 10px', border: `1px solid ${p.color}33`,
                }}>{p.label}</span>
              </div>
              <p style={{ fontSize: 14, color: '#c8d0dc', lineHeight: 1.7, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
          New here?{' '}
          <Link href="/academy" style={{ color: '#00E5FF', textDecoration: 'underline' }}>Start with the free Spark track →</Link>
        </p>
      </div>
    </section>
  )
}

// ─── NEWS TEASER (live, from the automated aggregator) ────────────────────
function NewsTeaser({ items }: { items: HomeNewsItem[] }) {
  return (
    <section style={{ padding: '72px 20px', background: '#0a0a0f', borderTop: '1px solid #1f1f2a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#00E5FF', display: 'inline-block', animation: 'r2pulse 1.6s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: '#7dd3fc', letterSpacing: '2px', textTransform: 'uppercase' }}>Live · Auto-updated</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, margin: 0, color: '#fff' }}>
              Latest in robotics
            </h2>
          </div>
          <Link href="/news" style={{ fontSize: 14, fontWeight: 800, color: '#00E5FF', textDecoration: 'none' }}>
            All news →
          </Link>
        </div>

        {items.length === 0 ? (
          <Link href="/news" style={{
            display: 'block', padding: 28, textAlign: 'center', borderRadius: 16,
            border: '1px dashed rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8', textDecoration: 'none', fontWeight: 700,
          }}>
            Fresh robotics headlines from IEEE, MIT, The Robot Report and more — open the News feed →
          </Link>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {items.map((n) => (
              <a
                key={n.url}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="r2-lift"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 10, padding: 18,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, textDecoration: 'none', minHeight: 118,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#7dd3fc' }}>
                  {n.source} · {n.topic}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#f4f4f5', lineHeight: 1.35 }}>
                  {n.title}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`@keyframes r2pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }`}</style>
    </section>
  )
}

// ─── LENS TEASER (live, auto-ingested YouTube videos) ─────────────────────
function LensTeaser({ items }: { items: HomeVideoItem[] }) {
  return (
    <section style={{
      padding: '72px 20px',
      background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06))',
      borderTop: '1px solid rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.10)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#ef4444" aria-hidden><path d="M19.6 3H4.4A2.4 2.4 0 0 0 2 5.4v13.2A2.4 2.4 0 0 0 4.4 21h15.2A2.4 2.4 0 0 0 22 18.6V5.4A2.4 2.4 0 0 0 19.6 3zM10 15.5v-7l6 3.5-6 3.5z"/></svg>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#fca5a5', letterSpacing: '2px', textTransform: 'uppercase' }}>Lens · Best videos, decoded</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, margin: 0, color: '#fff' }}>
              Don&apos;t watch 45 minutes to learn 4.
            </h2>
          </div>
          <Link href="/lens" style={{ fontSize: 14, fontWeight: 800, color: '#fca5a5', textDecoration: 'none' }}>
            All videos →
          </Link>
        </div>

        {items.length === 0 ? (
          <Link href="/lens" style={{
            display: 'block', padding: 28, textAlign: 'center', borderRadius: 16,
            border: '1px dashed rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)',
            color: '#fca5a5', textDecoration: 'none', fontWeight: 700,
          }}>
            The best robotics videos on the internet, summarized — open Lens →
          </Link>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {items.map((v) => (
              <a
                key={v.url}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="r2-lift"
                style={{
                  display: 'block', borderRadius: 14, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16 / 9', background: `#000 center/cover url(${v.thumbnailUrl})` }}>
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.25)',
                  }}>
                    <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(239,68,68,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </span>
                </div>
                <div style={{ padding: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#f4f4f5', margin: '0 0 6px', lineHeight: 1.35 }}>{v.title}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 700 }}>{v.channel}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── SCHOOLS TEASER ───────────────────────────────────────────────────────
function SchoolsTeaser() {
  return (
    <section style={{ padding: '80px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(0,229,255,0.08))',
          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 24, padding: '48px 40px',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#10b981', fontWeight: 900, margin: '0 0 12px' }}>
              For Schools
            </p>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.2 }}>
              Bring robotics to your classroom.
            </h2>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 560 }}>
              Auto-graded missions, teacher progress dashboard, CBSE-aligned curriculum, and verifiable certificates — everything a school needs to run a robotics programme.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {['Browser-based simulators', 'Grade-wise curriculum', 'Teacher dashboard', 'Hindi + English', 'Bulk certificates', 'CBSE aligned'].map(f => (
                <span key={f} style={{
                  fontSize: 12, fontWeight: 700, color: '#10b981',
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                  padding: '4px 12px', borderRadius: 999,
                }}>
                  {f}
                </span>
              ))}
            </div>
            <Link href="/schools" style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 22px',
              background: '#10b981', color: '#0f0a1e', borderRadius: 12,
              fontWeight: 900, fontSize: 15, textDecoration: 'none',
            }}>
              Bring R2BOT to my school →
            </Link>
          </div>
          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: 56 }}>🏫</div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0 0', fontWeight: 700 }}>Grades 6–12</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── NEWSLETTER ───────────────────────────────────────────────────────────
function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [errText, setErrText] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading'); setErrText(null)
    try {
      const res = await fetch('/api/news/subscribe', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (json.ok) { setStatus('ok'); setEmail('') }
      else { setStatus('err'); setErrText(json.error || 'Something went wrong.') }
    } catch {
      setStatus('err'); setErrText('Network error. Try again.')
    }
  }

  return (
    <section style={{ padding: '72px 20px', background: '#08080d', borderTop: '1px solid #1f1f2a', borderBottom: '1px solid #1f1f2a' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 12px' }}>
          R2BOT Weekly
        </p>
        <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>
          This week in robotics, every Friday.
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
          IFR reports, new research, standout robotics startups, and R2BOT updates. Curated, not dumped.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto 12px' }}>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#f4f4f5', padding: '12px 16px',
              borderRadius: 12, fontSize: 14, outline: 'none',
            }}
          />
          <button
            type="submit" disabled={status === 'loading'}
            style={{
              padding: '0 20px', background: '#fbbf24', color: '#0f0a1e',
              fontWeight: 900, fontSize: 14, border: 'none',
              borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: status === 'loading' ? 0.6 : 1,
            }}
          >
            {status === 'loading' ? '…' : 'Subscribe'}
          </button>
        </form>
        {status === 'ok'  && <p style={{ color: '#10b981', fontSize: 13 }}>✓ Subscribed. Welcome to R2BOT Weekly.</p>}
        {status === 'err' && <p style={{ color: '#ef4444', fontSize: 13 }}>{errText}</p>}
        <p style={{ fontSize: 11, color: '#374151', marginTop: 8 }}>No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}

// ─── FOOTER ───────────────────────────────────────────────────────────────
function Footer() {
  const cols: { h: string; links: { label: string; href: string }[] }[] = [
    { h: 'Academy',  links: [{ label: 'Spark Track', href: '/academy' }, { label: 'Wire Track', href: '/academy' }, { label: 'Forge Track', href: '/academy' }, { label: 'Edge Track', href: '/academy' }] },
    { h: 'Explore',  links: [{ label: 'Atlas', href: '/atlas' }, { label: 'Simulators', href: '/visualizer' }, { label: 'Lens', href: '/lens' }, { label: 'Blog', href: '/blog' }] },
    { h: 'Discover', links: [{ label: 'Daily Life', href: '/daily-life' }, { label: 'Career Paths', href: '/careers' }, { label: 'Daily News', href: '/news' }, { label: 'Diagnostic Test', href: '/diagnostic' }] },
    { h: 'Company',  links: [{ label: 'Mission', href: '/mission' }, { label: 'Contact', href: 'mailto:hello@r2bot.in' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }] },
  ]
  return (
    <footer style={{ padding: '56px 20px', background: '#08080d', borderTop: '1px solid #1f1f2a' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 32, marginBottom: 40 }}>
          <div>
            <p style={{ fontWeight: 900, fontSize: 24, color: '#fff', margin: '0 0 8px' }}>
              R<span style={{ color: '#fbbf24' }}>2</span>BOT
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              ROBOT, decoded — for the world. From your first concept to job-ready.
            </p>
            <p style={{ fontSize: 14, color: '#f97316', fontWeight: 700, margin: 0 }}>
              Learn it. Build it. Ship it.
            </p>
          </div>
          {cols.map(c => (
            <div key={c.h}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', color: '#374151', fontWeight: 900, margin: '0 0 12px' }}>{c.h}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 24, borderTop: '1px solid #1f1f2a', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#374151' }}>Made with ❤️ for robotics learners worldwide · © 2026 R2BOT</p>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="https://www.instagram.com/r2bot.in" target="_blank" rel="noopener" style={{ fontSize: 13, color: '#e1306c', textDecoration: 'none', fontWeight: 700 }}>◉ Instagram</a>
            <a href="https://www.youtube.com/channel/UCkqlyCeLtTpT_j6Q-3NFxww" target="_blank" rel="noopener" style={{ fontSize: 13, color: '#ef4444', textDecoration: 'none', fontWeight: 700 }}>▶ YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
