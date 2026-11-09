import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { AUTHOR, authorPersonJsonLd } from '@/lib/author'
import { jsonldScript } from '@/lib/seo/jsonld'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'How R2BOT is written',
  description:
    'R2BOT is written and built by one person, who taught science before moving into robotics. The rules every page follows, and how to tell us something is wrong.',
  alternates: { canonical: `${BASE}/about/how-this-is-written` },
  openGraph: {
    type: 'article',
    url: `${BASE}/about/how-this-is-written`,
    title: 'How R2BOT is written',
    description: AUTHOR.tagline,
  },
}

export const revalidate = 86400

const PRINCIPLES = [
  {
    t: 'Plain words first, then the proper term',
    d: 'Every Atlas entry opens with an explanation you could follow with no background, and only then introduces the vocabulary. If a sentence needs a second sentence to decode it, it gets rewritten.',
  },
  {
    t: 'Sources, or it does not get stated',
    d: 'Specifications, dates and numbers carry a link to where they came from. Where a claim is contested, the page says so instead of picking the tidier version.',
  },
  {
    t: 'What it is for, and what goes wrong without it',
    d: 'A definition on its own is forgettable. Every lesson says what the idea lets you do, what breaks without it, and where it stops working.',
  },
  {
    t: 'Built, not just described',
    d: 'The build courses follow robots that were actually assembled, which is why they spend time on wiring mistakes, calibration and the things that only fail on a real floor.',
  },
  {
    t: 'Free, and no dark patterns',
    d: 'No paywall, no locked lesson, no account needed to read anything. One email a week if you want it, unsubscribe in a click, and we never ask for your phone number.',
  },
]

export default function HowThisIsWrittenPage() {
  return (
    <CopilotProvider>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonldScript(authorPersonJsonLd()) }}
      />
      <main id="main-content" className="mx-auto max-w-3xl px-5 pb-20 pt-28">
        <p className="r2-eyebrow">Who writes this</p>
        <h1 className="r2-display">How R2BOT is written</h1>
        <p className="r2-lede">{AUTHOR.tagline}</p>

        <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-gray-300">
          {AUTHOR.bio.map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
        </div>

        <h2 className="r2-h2" style={{ marginTop: '3rem' }}>The rules every page follows</h2>
        <dl className="mt-4 space-y-5">
          {PRINCIPLES.map((p) => (
            <div key={p.t}>
              <dt className="font-bold text-white">{p.t}</dt>
              <dd className="mt-1 text-gray-400">{p.d}</dd>
            </div>
          ))}
        </dl>

        <h2 className="r2-h2" style={{ marginTop: '3rem' }}>Tell us when something is wrong</h2>
        <p className="mt-3 text-gray-300">
          Robotics moves, and a page that was right last year can be wrong now. If you find an error
          — a wrong number, a dead link, an explanation that does not hold up — email{' '}
          <a href={`mailto:${AUTHOR.email}`} className="r2-link">
            {AUTHOR.email}
          </a>{' '}
          and say which page. Corrections get made and the page&apos;s review date moves.
        </p>

        <h2 className="r2-h2" style={{ marginTop: '3rem' }}>Where to find the work</h2>
        <ul className="mt-3 space-y-2 text-gray-300">
          <li>
            <Link href="/shorts" className="r2-link">Quick Lessons</Link> — one
            robotics idea a minute, with a demo you can play with.
          </li>
          <li>
            <Link href="/courses" className="r2-link">The free course path</Link> —
            five courses from &quot;what is a robot&quot; to designing your own.
          </li>
          <li>
            <Link href="/atlas" className="r2-link">The Atlas</Link> — the
            reference everything else links back into.
          </li>
          <li>
            <a href={AUTHOR.sameAs[0]} rel="me noopener" target="_blank" className="r2-link">
              YouTube
            </a>{' '}
            and{' '}
            <a href={AUTHOR.sameAs[1]} rel="me noopener" target="_blank" className="r2-link">
              Instagram
            </a>{' '}
            — the short videos the lessons are built from.
          </li>
        </ul>

        <p className="mt-12 text-sm text-gray-500">
          More about the project itself on the{' '}
          <Link href="/about" className="r2-link">about page</Link>.
        </p>
      </main>
    </CopilotProvider>
  )
}
