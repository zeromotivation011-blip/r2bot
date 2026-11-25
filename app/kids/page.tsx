// app/kids/page.tsx — R2BOT Kids hub (server component).
//
// Until 25 Nov 2026 this route rendered an empty div and then a client-only
// intro, so crawlers and slow phones saw nothing. The hub is now real HTML:
// the four age bands, the five things a child can do, and the school and
// parent paths. Two small client islands add personalisation (chosen band,
// "continue", stars) and the install-app button.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { KidsHubClient } from './KidsHubClient'
import { InstallAppClient } from '@/components/kids/InstallAppClient'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'R2BOT Kids: Build, Code and Explore Robots (Ages 5–17)',
  description:
    'Kids build their own robot in 3D, see it in their room in AR, code it through missions, and learn robotics from animated story episodes. Ages 5–17, for homes and schools.',
  keywords: [
    'robotics for kids',
    'robotics for children',
    'kids coding robot game',
    'build a robot online for kids',
    'robotics curriculum for schools',
    'block coding for kids',
    'STEM robotics',
  ],
  alternates: { canonical: `${BASE}/kids` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids`,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — build it, code it, watch it come alive',
    description: 'A hands-on robotics playground for ages 5–17: 3D robot workshop, AR, coding missions and animated stories.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids' }],
  },
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'R2BOT Kids',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (web browser; installable)',
  description:
    'Hands-on robotics for ages 5–17: build a robot in 3D, view it in augmented reality, program it with blocks, and learn from animated story episodes.',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children aged 5 to 17' },
  isAccessibleForFree: true,
  url: `${BASE}/kids`,
}

const MODES: { href: string; emoji: string; title: string; line: string; detail: string; tone: string }[] = [
  {
    href: '/kids/stories',
    emoji: '🎬',
    title: 'Story Theatre',
    line: 'Animated robot cartoons you can talk back to.',
    detail: 'Spark and friends get into trouble, and you choose what happens next. Every episode teaches one big idea.',
    tone: 'from-pink-500/25 to-rose-600/10 border-pink-400/40',
  },
  {
    href: '/kids/workshop',
    emoji: '🛠️',
    title: 'Robot Workshop',
    line: 'Build your own robot in 3D, then see it in your room.',
    detail: 'Pick a body, wheels or legs, eyes and tools. Each part tells you what it does and what goes wrong without it.',
    tone: 'from-amber-500/25 to-orange-600/10 border-amber-400/40',
  },
  {
    href: '/kids/code-lab',
    emoji: '🧩',
    title: 'Code Lab',
    line: 'Snap blocks together to drive YOUR robot.',
    detail: 'Missions grow from first steps to loops, sensors and mazes. Older kids see the Python behind the blocks.',
    tone: 'from-sky-500/25 to-blue-600/10 border-sky-400/40',
  },
  {
    href: '/kids/world',
    emoji: '🗺️',
    title: 'Robot World',
    line: 'Six worlds of quick games with Spark.',
    detail: 'Spot robots at home, sort robot parts, beat boss challenges, and collect parts for your robot.',
    tone: 'from-emerald-500/25 to-green-600/10 border-emerald-400/40',
  },
  {
    href: '/kids/activities',
    emoji: '✂️',
    title: 'Make at Home',
    line: 'Paper robots and unplugged games.',
    detail: 'Printable builds that need nothing but paper, scissors and a kitchen drawer — no screen needed.',
    tone: 'from-violet-500/25 to-purple-600/10 border-violet-400/40',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What ages is R2BOT Kids for?',
    a: 'Ages 5 to 17, in four bands that follow school grades: Explorers (5–7), Builders (8–10), Inventors (11–13) and Engineers (14–17). The same robot your child builds at 7 is the one they program with sensors at 12.',
  },
  {
    q: 'Does my child need a robot kit?',
    a: 'No. Everything runs in a web browser on a phone, tablet, laptop or classroom smartboard. The robots are built and tested virtually; the Make at Home activities use paper and household things.',
  },
  {
    q: 'Do children need an account or an email address?',
    a: 'No. Progress is saved on the device. If a teacher sets up a class, children join with a class code and a nickname only — never an email, password or birthday.',
  },
  {
    q: 'Is it really hands-on?',
    a: 'Yes. Children choose every part of their robot, see it in 3D (and in their own room with augmented reality), then write programs that drive it through missions. A robot without a distance sensor really cannot see the wall — they learn by building and testing.',
  },
  {
    q: 'Can schools use it?',
    a: 'Yes. Teachers create a class in a minute, print a join card, and see every child’s progress on a dashboard, with a suggested six-week plan for each age band.',
  },
]

export default function KidsHubPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(appJsonLd) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:pt-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-sm font-bold text-amber-300">
              <span aria-hidden>🤖</span> Robotics for ages 5–17
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
              Build a robot.
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                Code it. Watch it come alive.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-violet-100/80">
              Design your own robot in 3D, see it standing in your room, then teach it to drive, sort, draw and
              explore — with Spark and friends cheering you on.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/kids/workshop"
                className="inline-flex min-h-[52px] items-center rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 text-lg font-black text-slate-900 shadow-lg shadow-orange-500/30 transition hover:scale-[1.03]"
              >
                Build my robot →
              </Link>
              <Link
                href="/kids/stories"
                className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-violet-400/50 bg-violet-950/40 px-6 text-lg font-bold text-violet-100 transition hover:border-violet-300"
              >
                ▶ Watch a story
              </Link>
            </div>
          </div>
          <KidsHeroArt />
        </div>
      </section>

      {/* ── Personal strip + band picker (client island) ─────────────────── */}
      <KidsHubClient />

      {/* ── Five ways to play ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="modes-h">
        <h2 id="modes-h" className="text-2xl font-black text-white sm:text-3xl">
          Five ways to learn robotics
        </h2>
        <p className="mt-1 text-violet-200/70">Watch it, build it, code it, play it, make it.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className={`group flex h-full flex-col rounded-3xl border-2 bg-gradient-to-br p-5 transition hover:-translate-y-1 hover:shadow-xl ${m.tone}`}
              >
                <span className="text-4xl transition group-hover:scale-110" aria-hidden>
                  {m.emoji}
                </span>
                <h3 className="mt-3 text-xl font-black text-white">{m.title}</h3>
                <p className="mt-1 font-semibold text-white/90">{m.line}</p>
                <p className="mt-2 text-sm text-white/65">{m.detail}</p>
                <span className="mt-auto pt-4 text-sm font-black text-amber-300">Let’s go →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Learning journey by band ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="journey-h">
        <h2 id="journey-h" className="text-2xl font-black text-white sm:text-3xl">
          One robot, from first steps to real engineering
        </h2>
        <p className="mt-1 max-w-2xl text-violet-200/70">
          Each band builds on the last. The ideas are the same ones real robotics engineers use — sense, think,
          act — explained with things children already know.
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {KIDS_BANDS.map((b, i) => (
            <li key={b.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${b.gradient}`} aria-hidden />
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">Step {i + 1}</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-black text-white">
                <span aria-hidden>{b.emoji}</span> {b.name}
              </h3>
              <p className="text-sm font-semibold text-white/60">
                Ages {b.ages} · {b.grades}
              </p>
              <p className="mt-3 font-semibold text-white/90">{b.promise}</p>
              <p className="mt-2 text-sm text-white/60">{b.outcome}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Schools, parents, class code ─────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        <Link
          href="/kids/schools"
          className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-transparent p-6 transition hover:border-amber-300 md:col-span-2"
        >
          <p className="text-sm font-bold uppercase tracking-wider text-amber-300">For schools</p>
          <h2 className="mt-1 text-2xl font-black text-white">Run a robotics class with no lab and no kits</h2>
          <p className="mt-2 text-white/70">
            Create a class in a minute, print a join card, and follow every child’s robots, stories and missions on
            one dashboard — with a six-week plan for each age band.
          </p>
          <span className="mt-4 inline-block font-black text-amber-300">See how schools use it →</span>
        </Link>
        <div className="grid gap-4">
          <Link href="/kids/join" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25">
            <h2 className="text-lg font-black text-white">🎟️ Got a class code?</h2>
            <p className="mt-1 text-sm text-white/65">Join your teacher’s class with just a nickname.</p>
          </Link>
          <Link href="/kids/parents" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25">
            <h2 className="text-lg font-black text-white">👪 For parents</h2>
            <p className="mt-1 text-sm text-white/65">What your child learns, screen-time tips, and progress.</p>
          </Link>
        </div>
      </section>

      {/* ── App install ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-violet-400/30 bg-violet-900/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">📱 Put R2BOT Kids on your home screen</h2>
            <p className="mt-1 text-sm text-violet-100/70">
              It opens full-screen like an app, remembers your robot, and keeps working on a weak connection.
            </p>
          </div>
          <InstallAppClient />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pb-24 pt-10">
        <h2 className="text-2xl font-black text-white">Questions parents and teachers ask</h2>
        <dl className="mt-4 divide-y divide-white/10">
          {FAQ.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-bold text-white">{f.q}</dt>
              <dd className="mt-1 text-violet-100/70">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}

/** Static SVG scene: Spark-style robot on a workbench with floating parts. Server-rendered, CSS-animated. */
function KidsHeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-hidden>
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-amber-400/20 blur-2xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full">
        <defs>
          <linearGradient id="kh-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FDBA4D" />
            <stop offset="1" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="kh-bench" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4C1D95" />
            <stop offset="1" stopColor="#2E1065" />
          </linearGradient>
        </defs>
        {/* bench */}
        <rect x="40" y="310" width="320" height="26" rx="10" fill="url(#kh-bench)" />
        <ellipse cx="200" cy="312" rx="92" ry="10" fill="#000" opacity=".25" />
        <g className="kh-bob">
          {/* wheels */}
          <circle cx="150" cy="292" r="22" fill="#1E293B" stroke="#0F172A" strokeWidth="5" />
          <circle cx="250" cy="292" r="22" fill="#1E293B" stroke="#0F172A" strokeWidth="5" />
          <circle cx="150" cy="292" r="7" fill="#60A5FA" />
          <circle cx="250" cy="292" r="7" fill="#60A5FA" />
          {/* body */}
          <rect x="118" y="190" width="164" height="104" rx="28" fill="url(#kh-body)" />
          <rect x="160" y="222" width="80" height="42" rx="12" fill="#1E1B4B" />
          <circle cx="180" cy="243" r="6" fill="#34D399" className="kh-blink-led" />
          <circle cx="200" cy="243" r="6" fill="#FBBF24" />
          <circle cx="220" cy="243" r="6" fill="#F472B6" />
          {/* neck + head */}
          <rect x="190" y="170" width="20" height="24" rx="6" fill="#64748B" />
          <rect x="130" y="92" width="140" height="88" rx="34" fill="#E2E8F0" />
          <rect x="146" y="108" width="108" height="56" rx="24" fill="#0F172A" />
          <g className="kh-eyes">
            <ellipse cx="178" cy="136" rx="11" ry="13" fill="#38BDF8" />
            <ellipse cx="222" cy="136" rx="11" ry="13" fill="#38BDF8" />
            <circle cx="182" cy="131" r="4" fill="#fff" />
            <circle cx="226" cy="131" r="4" fill="#fff" />
          </g>
          {/* antenna */}
          <line x1="200" y1="92" x2="200" y2="62" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          <circle cx="200" cy="56" r="10" fill="#F472B6" className="kh-blink-led" />
          {/* arm waving */}
          <g className="kh-wave">
            <rect x="276" y="200" width="16" height="64" rx="8" fill="#94A3B8" />
            <circle cx="284" cy="200" r="13" fill="#3B82F6" />
          </g>
          <rect x="108" y="206" width="16" height="60" rx="8" fill="#94A3B8" />
        </g>
        {/* floating parts */}
        <g className="kh-float-a">
          <circle cx="62" cy="110" r="22" fill="#1E293B" stroke="#60A5FA" strokeWidth="4" />
          <circle cx="62" cy="110" r="6" fill="#60A5FA" />
        </g>
        <g className="kh-float-b">
          <rect x="314" y="86" width="52" height="30" rx="10" fill="#10B981" />
          <circle cx="330" cy="101" r="8" fill="#ECFDF5" />
          <circle cx="350" cy="101" r="8" fill="#ECFDF5" />
        </g>
        <g className="kh-float-c">
          <path d="M330 200 l18 -10 l18 10 l0 20 l-18 10 l-18 -10z" fill="#A78BFA" />
        </g>
        <g className="kh-float-a">
          <text x="44" y="236" fontSize="30">⭐</text>
        </g>
      </svg>
      <style>{`
        @keyframes kh-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes kh-float { 0%,100% { transform: translateY(0) rotate(0) } 50% { transform: translateY(-14px) rotate(6deg) } }
        @keyframes kh-wave { 0%,100% { transform: rotate(0) } 50% { transform: rotate(-28deg) } }
        @keyframes kh-blink { 0%,90%,100% { opacity: 1 } 95% { opacity: .2 } }
        @keyframes kh-eyes { 0%,92%,100% { transform: scaleY(1) } 96% { transform: scaleY(.1) } }
        .kh-bob { animation: kh-bob 3s ease-in-out infinite; }
        .kh-float-a { animation: kh-float 4s ease-in-out infinite; transform-box: fill-box; }
        .kh-float-b { animation: kh-float 5s ease-in-out infinite .6s; transform-box: fill-box; }
        .kh-float-c { animation: kh-float 4.6s ease-in-out infinite 1.2s; transform-box: fill-box; }
        .kh-wave { animation: kh-wave 1.6s ease-in-out infinite; transform-origin: 284px 262px; }
        .kh-blink-led { animation: kh-blink 2.4s linear infinite; }
        .kh-eyes { animation: kh-eyes 4s linear infinite; transform-origin: 200px 136px; transform-box: view-box; }
        @media (prefers-reduced-motion: reduce) {
          .kh-bob, .kh-float-a, .kh-float-b, .kh-float-c, .kh-wave, .kh-blink-led, .kh-eyes { animation: none; }
        }
      `}</style>
    </div>
  )
}
