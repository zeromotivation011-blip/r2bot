import Link from 'next/link'
import { AUTHOR } from '@/lib/author'

/**
 * The site footer, as a server component so every page can carry it.
 *
 * There was no shared footer: the homepage defined its own inside HomeClient
 * and nothing else had one. Combined with ~40 pages that also had no nav, a
 * visitor landing on a Quick Lesson from YouTube had no route into the rest of
 * the site at all except links inside the prose.
 *
 * Also where the surfaces that are real but not nav-worthy live — the Lab and
 * the Showcase while they are still empty, and the language versions.
 */

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Learn',
    links: [
      { label: 'Quick Lessons', href: '/shorts' },
      { label: 'Free course path', href: '/courses' },
      { label: 'Academy', href: '/academy' },
      { label: 'Find my level', href: '/diagnostic' },
      { label: 'Daily Challenge', href: '/challenge' },
    ],
  },
  {
    heading: 'Reference',
    links: [
      { label: 'Atlas', href: '/atlas' },
      { label: 'AI + Robotics', href: '/ai-robotics' },
      { label: 'Robots', href: '/robots' },
      { label: 'Simulators', href: '/visualizer' },
      { label: 'Robot projects', href: '/build' },
    ],
  },
  {
    heading: 'Discover',
    links: [
      { label: 'News', href: '/news' },
      { label: 'Lens', href: '/lens' },
      { label: 'Blog', href: '/blog' },
      { label: 'Robotics in daily life', href: '/daily-life' },
      { label: 'Career paths', href: '/careers' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'The Lab', href: '/lab' },
      { label: 'Project showcase', href: '/showcase' },
      { label: 'Robotics in India', href: '/india' },
      { label: 'For teachers', href: '/teachers' },
      { label: 'Sources we cite', href: '/sources' },
    ],
  },
  {
    heading: 'R2BOT',
    links: [
      { label: 'About', href: '/about' },
      { label: `Written by ${AUTHOR.name}`, href: '/author/ravi' },
      { label: 'Mission', href: '/mission' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

const LANGUAGES = [
  { label: 'English', href: '/' },
  { label: '中文', href: '/zh' },
  { label: 'हिंदी', href: '/hi' },
  { label: 'Español', href: '/es' },
]

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[var(--void)]">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                {col.heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="inline-flex min-h-[32px] items-center text-sm text-gray-400 hover:text-amber-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6">
          <p className="text-sm text-gray-500">
            Robotics, in plain English. Free, and written by one person.
          </p>
          <nav aria-label="Language" className="flex flex-wrap gap-3">
            {LANGUAGES.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-gray-400 hover:text-amber-400">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex gap-4">
            <a
              href="https://www.youtube.com/@R2BOTINDIA"
              target="_blank"
              rel="noopener"
              className="text-sm text-gray-400 hover:text-amber-400"
            >
              YouTube
            </a>
            <a
              href="https://www.instagram.com/r2bot.in"
              target="_blank"
              rel="noopener"
              className="text-sm text-gray-400 hover:text-amber-400"
            >
              Instagram
            </a>
            <a href={`mailto:${AUTHOR.email}`} className="text-sm text-gray-400 hover:text-amber-400">
              Contact
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-600">
          © {new Date().getFullYear()} R2BOT. Everything here is free to read and free to use in a
          classroom.
        </p>
      </div>
    </footer>
  )
}
