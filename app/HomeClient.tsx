'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Reveal } from '@/components/Reveal'
import { FeatureTour } from '@/components/FeatureTour'
import ShortDemo from '@/components/shorts/ShortsDemos'
import HomeShorts from '@/components/landing/HomeShorts'
import ContinueStrip from '@/components/landing/ContinueStrip'

type Track = 'spark' | 'wire' | 'forge' | 'edge'

interface Personalization {
  signedIn: boolean
  firstName: string | null
  track: Track | null
}

export interface HomeNewsItem { title: string; url: string; source: string; topic: string }
/** thumbnailUrl is empty for the curated Lens write-ups, which have no
 *  YouTube id — they are our own pages, not embeds. */
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
    <main style={{ background: 'var(--void)', color: '#fff' }}>
      <FeatureTour />
      <Hero personalization={personalization} atlasCount={atlasCount} projectCount={projectCount} />
      {showDiagnosticBanner && (
        <section style={{
          padding: '20px 20px', background: 'rgba(252,104,24,0.08)',
          borderBottom: '1px solid rgba(252,104,24,0.25)',
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 14, color: '#FFC9A8', fontWeight: 700 }}>
              🎯 Find your level — take the 5-minute test to get your personalized roadmap.
            </span>
            <Link href="/diagnostic" style={{
              padding: '8px 18px', background: '#FF8A4C', color: '#1a0f00',
              borderRadius: 999, fontSize: 13, fontWeight: 900, textDecoration: 'none',
            }}>
              Take the test →
            </Link>
          </div>
        </section>
      )}
      {/* Eleven sections, all the same shape, all the same height. Cut to six
          that each do a different job and look different doing it.
          Removed: the emoji ticker (a marquee of facts the hero already
          states); MissionStrip (a two-screen detour into why-we-exist in the
          middle of the funnel — it is the whole of /mission); IndiaSpotlight
          (India is a key region, not the identity, and it was a full section
          of the global homepage); and Testimonials, which was a second
          feature grid saying the same six things as Features, two screens
          after it, and claimed "20+ guided robot projects" when there are
          ten. */}
      <ContinueStrip />
      <Reveal><HomeShorts /></Reveal>
      <Reveal><CoursePath /></Reveal>
      <Reveal><Features atlasCount={atlasCount} /></Reveal>
      <Reveal><SimulatorShowcase /></Reveal>
      <Reveal><Latest news={news} videos={videos} /></Reveal>
      <Reveal><NewsletterCTA /></Reveal>

      <style jsx global>{`
        :global(body) { background: var(--void); }
      `}</style>
    </main>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────
function Hero({ personalization, atlasCount, projectCount }: { personalization: Personalization; atlasCount: number; projectCount: number }) {
  const continueHref = personalization.track ? `/academy/${personalization.track}` : '/start'
  const primaryLabel = personalization.track
    ? `Continue ${TRACK_LABEL[personalization.track]}`
    : 'Start learning'
  return (
    <section className="r2-hero">
      {/* A grid, faint, fading out. Was competing with the headline at 0.035;
          the background should be felt rather than seen. */}
      <div aria-hidden className="r2-hero__grid" />

      <div className="r2-wrap r2-hero__inner">
        <div className="r2-hero__copy">
          {personalization.signedIn && personalization.firstName && (
            <p className="r2-meta" style={{ marginBottom: 10 }}>
              Welcome back, {personalization.firstName}.
            </p>
          )}

          <p className="r2-eyebrow">Robot, decoded</p>

          {/* No orange mid-sentence. A headline that needs a colour change to
              hold attention is a headline that is too long. */}
          <h1 className="r2-display">The clearest way to learn robotics on the internet.</h1>

          <p className="r2-lede">
            {atlasCount.toLocaleString()} concepts explained from first principles, nine simulators
            that run in your browser, {projectCount} robots you build yourself, and an AI mentor that
            only answers from what we have actually written down.
          </p>

          <div className="r2-hero__actions">
            <Link href={continueHref} className="r2-btn r2-btn--primary">
              {primaryLabel}
            </Link>
            <Link href="/shorts" className="r2-btn r2-btn--ghost">
              Watch a one-minute lesson
            </Link>
          </div>

          {/* The four stat boxes counted themselves up in a row of identical
              cards, which turned "7 simulators" into a claim that looked like
              it was trying too hard. One quiet line states the same facts and
              gets read. */}
          <p className="r2-hero__proof">
            Free, with no account needed to read any of it · 47 one-minute lessons ·
            5 video courses · 4 learning tracks
          </p>
        </div>

        {/* Right: the real thing, not a drawing of it.
         *
         * This was a cartoon robot with a smiley face and four differently
         * coloured floating labels — the single element that set "kids' site"
         * for every visitor in the first second. The echo demo is a real
         * lesson from /shorts, it is interactive on first paint, and it makes
         * the argument the headline is making. */}
        <div className="r2-hero__demo">
          <ShortDemo kind="echo" />
          <p className="r2-meta r2-hero__demo-cap">
            Drag the slider. This is a real lesson, not a screenshot —{' '}
            <Link href="/shorts/ultrasonic-sensor" className="r2-link">see the full one</Link>
          </p>
        </div>
      </div>
    </section>
  )
}


// ─── COURSE PATH ──────────────────────────────────────────────────────────
/**
 * The course path was five identical cards in a row with filled orange number
 * badges and a filled orange button under them — the same shape as every
 * other section on the page. It is a *path*, so it is drawn as one: a rail
 * with the five stops on it, left-aligned, with the copy beside it rather
 * than centred above it. Different shape, same information, and it reads as
 * a sequence instead of a menu.
 */
function CoursePath() {
  const steps = [
    { n: 1, name: 'Robotics Foundations', sub: 'How robots sense, think and act' },
    { n: 2, name: 'Build Your First Robot', sub: 'A small wheeled robot, step by step' },
    { n: 3, name: 'Robot Arms', sub: 'Build an arm that picks up a cup' },
    { n: 4, name: 'Robot Vision', sub: 'Give your robot a camera' },
    { n: 5, name: 'Robot Intelligence', sub: 'Maps, planning, speech and safety' },
  ]
  return (
    <section className="r2-section">
      <div className="r2-wrap r2-split">
        <div className="r2-split__copy">
          <p className="r2-eyebrow">The free course path</p>
          <h2 className="r2-h2">Five courses, zero to your own robot design</h2>
          <p className="r2-body" style={{ marginTop: '1rem' }}>
            Fifty short video lessons, a quiz after each one, a final activity and a certificate
            for every course. 23 videos are live; the rest are being recorded.
          </p>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/courses" className="r2-link">See the full course path</Link>
          </p>
        </div>

        <ol className="r2-rail">
          {steps.map((c) => (
            <li key={c.n} className="r2-rail__item">
              <Link href="/courses" className="r2-rail__link">
                <span className="r2-rail__n" aria-hidden>{c.n}</span>
                <span>
                  <span className="r2-rail__name">{c.name}</span>
                  <span className="r2-meta">{c.sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/**
 * "Six worlds. One platform." was six cards, each with a 36px emoji, an
 * orange uppercase badge and an orange "Explore →". Eighteen orange elements
 * in one section, and emoji at that size is the fastest way to look like a
 * side project.
 *
 * It is the breadth claim, so it is drawn as an index: a dense two-column
 * list with hairline rules. Breadth reads better as a list than as cards —
 * cards make six things look like six things, a list makes them look like a
 * table of contents.
 */
function Features({ atlasCount }: { atlasCount: number }) {
  const rows = [
    { name: 'Atlas', sub: `${atlasCount.toLocaleString()} robotics concepts — sensors, motors, AI, SLAM — explained from first principles and linked to each other.`, href: '/atlas' },
    { name: 'Academy', sub: 'Four written tracks, beginner to research. Project-based, with certificates.', href: '/academy' },
    { name: 'Simulators', sub: 'Nine real-time simulators — PID, kinematics, sensor fusion, pathfinding — running in the browser.', href: '/visualizer' },
    { name: 'ROS 2 Playground', sub: 'A live Linux shell. Write real ROS 2 commands with nothing to install.', href: '/ros2' },
    { name: 'R2 Co-pilot', sub: 'An AI mentor on every page that answers only from what we have written, and cites it.', href: '/copilot' },
    { name: 'Robotics in daily life', sub: 'Surgical robots, warehouses, self-driving cars — the machines already around you.', href: '/daily-life' },
  ]
  return (
    <section className="r2-section r2-section--band">
      <div className="r2-wrap">
        <p className="r2-eyebrow">Everything inside</p>
        <h2 className="r2-h2">Six places to go, one way in</h2>
        <p className="r2-body" style={{ marginTop: '0.75rem' }}>
          Each one stands alone, and connects to the others when you want to go deeper.
        </p>

        <ul className="r2-index">
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="r2-index__row">
                <span className="r2-h3">{r.name}</span>
                <span className="r2-body r2-index__sub">{r.sub}</span>
                <span className="r2-index__arrow" aria-hidden>&rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─── SIMULATOR SHOWCASE ───────────────────────────────────────────────────
function SimulatorShowcase() {
  const sims = [
    { name: 'PID Controller', slug: 'pid', desc: 'Tune P, I and D and watch the robot reach its target' },
    { name: 'Arm Kinematics', slug: 'ik', desc: 'Forward and inverse kinematics for a robot arm' },
    { name: 'Sensor Fusion', slug: 'fusion', desc: 'A Kalman filter combining GPS and IMU' },
    { name: 'A* Pathfinder', slug: 'astar', desc: 'Draw a maze and watch A* find the shortest path' },
  ]
  return (
    <section className="r2-section">
      <div className="r2-wrap r2-split">
        <div className="r2-split__copy">
          <p className="r2-eyebrow">Interactive simulators</p>
          <h2 className="r2-h2">Learn by doing, with no hardware</h2>
          <p className="r2-body" style={{ marginTop: '1rem' }}>
            Nine simulators run entirely in your browser, each linked to the lesson that explains
            it. Every one has a share and embed link — like Desmos, but for robots — so you can
            send a tuned controller to your class.
          </p>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/visualizer" className="r2-link">Open the simulator lab</Link>
          </p>
        </div>

        <div className="r2-sims">
          {sims.map((s) => (
            <Link key={s.slug} href={`/visualizer#${s.slug}`} className="r2-card">
              <span className="r2-h3" style={{ fontSize: 'var(--t-body)' }}>{s.name}</span>
              <span className="r2-meta" style={{ display: 'block', marginTop: '0.4rem', lineHeight: 1.5 }}>{s.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}


// ─── NEWS TEASER (live, from the automated aggregator) ────────────────────
/**
 * News and Lens were two full-height sections in a row, each with its own
 * eyebrow, its own 40px headline, its own "All x →" link and its own tinted
 * background — the Lens one a red/orange gradient that appeared nowhere else
 * on the site. Two sections saying "here is what is new" is one section.
 *
 * It is also the one place on the page where a two-column layout is right:
 * headlines read as a list, videos read as a grid, and putting them side by
 * side is the only section on the page with that shape.
 */
function Latest({ news, videos }: { news: HomeNewsItem[]; videos: HomeVideoItem[] }) {
  return (
    <section className="r2-section r2-section--band">
      <div className="r2-wrap">
        <p className="r2-eyebrow">Updated every day, automatically</p>
        <h2 className="r2-h2">What happened in robotics this week</h2>

        <div className="r2-latest">
          <div>
            <div className="r2-latest__head">
              <h3 className="r2-h3">Headlines</h3>
              <Link href="/news" className="r2-link">All news</Link>
            </div>
            {news.length === 0 ? (
              <Link href="/news" className="r2-card r2-empty">
                Robotics headlines from IEEE, MIT and The Robot Report — open the feed
              </Link>
            ) : (
              <ul className="r2-latest__list">
                {news.slice(0, 5).map((n) => (
                  <li key={n.url}>
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="r2-latest__item">
                      <span className="r2-latest__title">{n.title}</span>
                      <span className="r2-meta">{n.source} · {n.topic}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="r2-latest__head">
              <h3 className="r2-h3">Worth watching</h3>
              <Link href="/lens" className="r2-link">All videos</Link>
            </div>
            {videos.length === 0 ? (
              <Link href="/lens" className="r2-card r2-empty">
                The best robotics videos on the internet, summarised — open Lens
              </Link>
            ) : (
              <div className="r2-latest__videos">
                {videos.slice(0, 4).map((v) => {
                  const external = v.url.startsWith('http')
                  const inner = (
                    <>
                      {v.thumbnailUrl ? (
                        <span
                          className="r2-vid__thumb"
                          style={{ backgroundImage: `url(${v.thumbnailUrl})` }}
                          aria-hidden
                        />
                      ) : (
                        <span className="r2-vid__thumb r2-vid__thumb--none" aria-hidden />
                      )}
                      <span className="r2-vid__meta">
                        <span className="r2-vid__title">{v.title}</span>
                        <span className="r2-meta">{v.channel}</span>
                      </span>
                    </>
                  )
                  return external ? (
                    <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="r2-card r2-vid">
                      {inner}
                    </a>
                  ) : (
                    <Link key={v.url} href={v.url} className="r2-card r2-vid">{inner}</Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}


// ─── NEWSLETTER ───────────────────────────────────────────────────────────
function NewsletterCTA() {
  const [email, setEmail] = useState('')
  // Honeypot: a real person never sees this field, so anything in it is a bot.
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [errText, setErrText] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading'); setErrText(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'home-digest', page: '/', honeypot: trap }),
      })
      const json = await res.json()
      if (json.ok) { setStatus('ok'); setEmail('') }
      else { setStatus('err'); setErrText(json.error || 'Something went wrong.') }
    } catch {
      setStatus('err'); setErrText('Network error. Try again.')
    }
  }

  return (
    <section style={{ padding: '72px 20px', background: 'var(--void)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <p className="r2-eyebrow">R2BOT Weekly</p>
        <h2 className="r2-h2" style={{ marginBottom: 12 }}>
          This week in robotics, every Friday
        </h2>
        <p className="r2-body" style={{ marginInline: 'auto', marginBottom: 28 }}>
          IFR reports, new research, standout robotics startups, and R2BOT updates. Curated, not dumped.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto 12px', flexWrap: 'wrap' }}>
          <input
            type="text" tabIndex={-1} autoComplete="off" aria-hidden value={trap}
            onChange={e => setTrap(e.target.value)} name="company"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              flex: '1 1 200px', minWidth: 0, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#f4f4f5', padding: '12px 16px',
              borderRadius: 12, fontSize: 14, outline: 'none',
            }}
          />
          <button
            type="submit" disabled={status === 'loading'}
            style={{
              padding: '12px 20px', flex: '1 1 auto', background: 'var(--amber)', color: 'var(--amber-ink)',
              fontWeight: 650, fontSize: 14, border: 'none',
              borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44,
              opacity: status === 'loading' ? 0.6 : 1,
            }}
          >
            {status === 'loading' ? '…' : 'Subscribe'}
          </button>
        </form>
        {status === 'ok'  && <p style={{ color: 'var(--green)', fontSize: 13 }}>✓ Subscribed. Welcome to R2BOT Weekly.</p>}
        {status === 'err' && <p style={{ color: '#F87171', fontSize: 13 }} role="alert">{errText}</p>}
        <p className="r2-meta" style={{ marginTop: 8 }}>One email a week. Free. We never ask for your phone number or share your email. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}

