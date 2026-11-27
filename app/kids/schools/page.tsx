// app/kids/schools/page.tsx — R2BOT Kids for schools (server-rendered, indexable).
import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { CLASS_PLANS, LESSON_SHAPE } from '@/lib/kids/classroom-plan'
import { LessonPlanPanel } from '@/components/kids/classroom/LessonPlanPanel'
import PilotFormClient from './PilotFormClient'
import TrustActionsClient from '@/app/kids/teach/trust/TrustActionsClient'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')
const PAGE_URL = `${BASE}/kids/schools`

const TITLE = 'Robotics for Schools: R2BOT Kids Classroom for Grades K–12'
const DESCRIPTION =
  'Teach robotics in any classroom with no kit and no lab: story episodes, a 3D robot workshop, block-coding missions and a teacher dashboard. Children join with a code and a nickname — no accounts.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids for schools — robotics in any classroom',
    description: 'Story episodes, a 3D robot workshop, block coding and a classroom dashboard. Runs in a browser. No kit, no lab, no child accounts.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids for schools' }],
  },
}

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: 'R2BOT', url: BASE },
      audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'For schools', item: PAGE_URL },
      ],
    },
  ],
}

const PILLARS = [
  {
    emoji: '🎬', title: 'Story Theatre',
    body: 'Short animated episodes introduce each idea — sense, think, act; loops; sensors; feedback — through characters children care about. Perfect as a five-minute hook on the board.',
  },
  {
    emoji: '🔧', title: '3D Robot Workshop',
    body: 'Children build their own robot part by part — bodies, wheels or legs, sensors, tools — and learn what each part does by seeing what breaks without it. AR and VR views on supported devices.',
  },
  {
    emoji: '🧩', title: 'Code Lab',
    body: 'Block-coding missions that drive the robot the child built. A robot without a distance sensor cannot use the “wall ahead?” block — that is the lesson. Older students see the Python behind the blocks.',
  },
  {
    emoji: '📊', title: 'Classroom dashboard',
    body: 'Create a class in a minute, print a join card, and watch stars, episodes, missions and robots appear on your roster. See where the class is stuck, export a CSV, follow a six-week plan.',
  },
]

const DEVICES = ['Chromebooks and laptops', 'Tablets and phones', 'Interactive whiteboards and smartboards', 'Shared computer-lab machines']

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do we need robot kits, a lab or any installation?',
    a: 'No. Everything runs in a modern web browser on the devices you already have. Many teachers run the story and unplugged parts on one board and have pairs share a device for the hands-on part.',
  },
  {
    q: 'Do children need an email address or an account?',
    a: 'No. A child types the class code and a nickname — a first name or a made-up name. We never ask a child for an email, a password, a birthday or a photo. The teacher signs in with an ordinary R2BOT account.',
  },
  {
    q: 'What does the teacher see?',
    a: 'For each nickname: stars, Story Theatre episodes watched, Code Lab missions solved and how many stars, Robot World levels completed, the robot they built and when they last played. Plus class totals and the levels or missions most children found hard.',
  },
  {
    q: 'Which ages and grades does it cover?',
    a: 'Four bands from ages 5 to 17: Explorers (Grades K–2), Builders (3–5), Inventors (6–8) and Engineers (9–12). Each band has its own six-week plan, and a class is set to one band.',
  },
  {
    q: 'How long is a lesson?',
    a: 'A lesson is designed for 40 minutes: a five-minute story hook, ten minutes of unplugged activity with no screens, twenty minutes hands-on, and five minutes of sharing.',
  },
  {
    q: 'Does it follow a curriculum standard?',
    a: 'The plans are written to map onto widely used frameworks such as the CSTA K-12 Computer Science Standards, and onto the emphasis on coding and experiential learning in India’s NEP 2020. R2BOT is not certified or endorsed by CSTA or any government body; the mapping is ours, and we share it so you can check it against your own curriculum.',
  },
  {
    q: 'How does a child leave a class, and what is deleted?',
    a: 'On the join page there is a “Leave class” button. It deletes the child’s nickname and class progress from R2BOT immediately. A teacher can also remove a child, or delete the whole class, at any time.',
  },
  {
    q: 'What languages does it work in?',
    a: 'R2BOT Kids is in English today. Classes run worldwide; examples are chosen to make sense in any country.',
  },
]

const H2 = 'text-2xl font-extrabold text-white sm:text-3xl'
const CARD = 'rounded-3xl border border-white/10 bg-slate-950/80 p-6'

export default function KidsSchoolsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(pageJsonLd) }} />
      <article className="mx-auto w-full max-w-6xl space-y-20 px-4 pb-24 pt-10 text-slate-200">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">R2BOT Kids · For schools</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">
              Robotics in any classroom. No kit. No lab. No child accounts.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              Story episodes, a 3D robot workshop and block-coding missions that children love — and a classroom
              dashboard that shows you who is flying and who is stuck. It runs in a browser on the devices your school
              already has, from Grade K to Grade 12.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#pilot" className="inline-flex min-h-[52px] items-center rounded-xl bg-amber-500 px-6 text-lg font-extrabold text-black hover:bg-amber-400">Request a school pilot</a>
              <Link href="/kids/classroom" className="inline-flex min-h-[52px] items-center rounded-xl border border-white/20 px-6 text-lg font-bold text-white hover:bg-white/5">Create a class now</Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">Teachers sign in with an R2BOT account. Children join with a code and a nickname.</p>
          </div>
          <div className={`${CARD} text-center`} aria-hidden>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-300">On the classroom wall</p>
            <p className="mt-3 font-mono text-5xl font-black tracking-[0.15em] text-white">ABC 234</p>
            <p className="mt-2 text-slate-300">r2bot.in/kids/join</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl bg-white/5 p-3"><div className="text-2xl">🧒</div>Code + nickname</div>
              <div className="rounded-xl bg-white/5 p-3"><div className="text-2xl">🤖</div>Build &amp; code</div>
              <div className="rounded-xl bg-white/5 p-3"><div className="text-2xl">📊</div>Teacher sees progress</div>
            </div>
          </div>
        </header>

        {/* ── What it is ───────────────────────────────────────────── */}
        <section aria-labelledby="what-h">
          <h2 id="what-h" className={H2}>What your class gets</h2>
          <p className="mt-2 max-w-3xl text-slate-300">Four connected tools built around one idea: every robot senses, thinks and acts. Children meet the idea in a story, build it in the workshop, and program it in the Code Lab.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {PILLARS.map((p) => (
              <div key={p.title} className={CARD}>
                <div className="text-4xl" aria-hidden>{p.emoji}</div>
                <h3 className="mt-3 text-xl font-extrabold text-white">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-300">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Curriculum by band ───────────────────────────────────── */}
        <section aria-labelledby="curriculum-h">
          <h2 id="curriculum-h" className={H2}>Curriculum by grade band</h2>
          <p className="mt-2 max-w-3xl text-slate-300">A class is set to one band. Each band has a six-week plan; the ideas grow from “a robot follows steps” to feedback control and autonomy.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {KIDS_BANDS.map((b) => (
              <div key={b.id} className={CARD}>
                <div className={`inline-flex rounded-xl bg-gradient-to-r ${b.gradient} px-3 py-1 text-sm font-extrabold text-white`}>{b.emoji} {b.name}</div>
                <p className="mt-3 text-sm font-semibold text-slate-400">Ages {b.ages} · {b.grades}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-200">{b.outcome}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Six weeks</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-slate-300">
                  {CLASS_PLANS[b.id].map((w) => <li key={w.week}>{w.concept}</li>)}
                </ol>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <LessonPlanPanel band="builders" headingLevel={3} />
            <p className="mt-2 text-sm text-slate-400">Example: the Builders plan. Every band’s plan is in the teacher dashboard.</p>
          </div>
        </section>

        {/* ── 40 minutes ───────────────────────────────────────────── */}
        <section aria-labelledby="lesson-h">
          <h2 id="lesson-h" className={H2}>How a class runs in 40 minutes</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {LESSON_SHAPE.map((s, i) => (
              <li key={s.label} className={CARD}>
                <p className="font-mono text-sm font-bold text-amber-300">{String(i + 1).padStart(2, '0')} · {s.minutes} MIN</p>
                <h3 className="mt-2 text-lg font-extrabold text-white">{s.label}</h3>
                <p className="mt-1 text-[15px] text-slate-300">{s.detail}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-3xl text-slate-300">
            The unplugged part matters: children act the idea out — following each other’s instructions, being a sensor,
            playing “if red, hop” — before they touch a screen. It works with one projector and no devices at all.
          </p>
        </section>

        {/* ── Teacher tools (0055) ─────────────────────────────────── */}
        <section aria-labelledby="tools-h">
          <h2 id="tools-h" className={H2}>Tools for teachers and school leads</h2>
          <p className="mt-2 max-w-3xl text-slate-300">Everything a teacher needs to run R2BOT Kids without extra prep, and everything a school lead needs to see it working.</p>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: '📘', title: 'A lesson guide for every session', body: 'Every session of all four levels has a printable plan: warm-up, timing, discussion, misconceptions, differentiation and a note for families. Download as PDF or share to Google Classroom.', href: '/kids/teach', cta: 'Browse the guides' },
              { emoji: '📽️', title: 'Present mode for one projector', body: 'Any session, episode or simulator full screen: a 5/10/20/5 lesson timer, the join code with a QR code, slow motion, freeze-and-draw, “ask the class” prompts and a hands-up check.', href: '/kids/present', cta: 'Open Present mode' },
              { emoji: '✂️', title: 'Unplugged lessons, no devices', body: 'A no-device version of every Level 1 session: a human-robot floor grid, printable command cards, sense–think–act sorting cards and paper gears.', href: '/kids/teach/unplugged', cta: 'See the unplugged lessons' },
              { emoji: '🧩', title: 'Clubs, families and libraries', body: 'Mixed-age club sessions of 60–90 minutes, a family class for homeschoolers, and a printable drop-in kit for libraries and community centres.', href: '/kids/teach/clubs', cta: 'Run a club' },
              { emoji: '🍎', title: 'Assignments with due dates', body: 'Assign a course session, any Skill Galaxy activity or a game to a class. Children see “From your teacher” missions; you see who has finished.', href: '/kids/classroom', cta: 'Open the Classroom' },
              { emoji: '🏫', title: 'One school, every class', body: 'Create a school and invite colleagues with a school code. The school admin sees every class with a school-wide summary — counts only, never children’s nicknames.', href: '/kids/classroom/school', cta: 'Set up a school' },
              { emoji: '🎓', title: 'Teacher training with a certificate', body: 'Six short self-paced modules, about 45 minutes: running a class, the physics lab, assigning and tracking, supporting every child, safety and privacy.', href: '/kids/teach/training', cta: 'Start the training' },
              { emoji: '📜', title: 'Certificates for children', body: 'A child who finishes all 24 sessions of Level 1 can download a certificate with their explorer name and robot. Every child who learns the skills earns the same one.', href: '/kids/course/1', cta: 'See Level 1' },
              { emoji: '🏠', title: 'A weekly report for families', body: 'Parents get a printable weekly report from their child’s own device: what was learned, badges earned and a five-minute activity to try at home.', href: '/kids/parents', cta: 'For parents' },
            ].map((t) => (
              <li key={t.title} className={`${CARD} flex flex-col`}>
                <div className="text-3xl" aria-hidden>{t.emoji}</div>
                <h3 className="mt-3 text-lg font-extrabold text-white">{t.title}</h3>
                <p className="mt-1 flex-1 text-[15px] leading-relaxed text-slate-300">{t.body}</p>
                <Link href={t.href} className="mt-4 inline-flex min-h-[44px] items-center font-bold text-amber-300 hover:underline">{t.cta} →</Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Devices ──────────────────────────────────────────────── */}
        <section aria-labelledby="devices-h" className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 id="devices-h" className={H2}>No lab or kit needed</h2>
            <p className="mt-3 leading-relaxed text-slate-300">
              There is nothing to buy, install or charge. R2BOT Kids runs in a current web browser, so a class can use
              whatever is in the room. One device per pair is plenty; the story and unplugged parts need only the board.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {DEVICES.map((d) => (
              <li key={d} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 font-semibold text-white">
                <span aria-hidden className="text-emerald-400">✓</span>{d}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Privacy ──────────────────────────────────────────────── */}
        <section aria-labelledby="privacy-h" className={`${CARD} border-emerald-400/25`}>
          <h2 id="privacy-h" className={H2}>Built for children’s privacy</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
              <li><strong className="text-white">No child accounts.</strong> A child types a class code and a nickname. No email, password, birthday or photo — ever.</li>
              <li><strong className="text-white">Nicknames are checked.</strong> Anything that looks like an email or phone number is refused, and so are rude words.</li>
              <li><strong className="text-white">Only progress is shared,</strong> and only with that class’s teacher: stars, episodes, missions, levels, the robot they built and when they last played.</li>
            </ul>
            <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
              <li><strong className="text-white">Deletion is one tap.</strong> “Leave class” deletes the nickname and class progress at once; teachers can remove a child or delete a class at any time.</li>
              <li><strong className="text-white">No ads, no selling data,</strong> no public profiles, no chat between children.</li>
              <li><strong className="text-white">Designed with COPPA and GDPR (including its rules for children) in mind:</strong> collect the minimum, keep it inside the class, delete it on request.</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] leading-relaxed text-slate-200">
              <strong className="text-white">School Trust &amp; Privacy Pack.</strong> Every field stored and who sees it, retention and
              deletion, hosting and subprocessors, COPPA, GDPR, UK Children’s Code and DPDP notes, accessibility status and a template
              letter for parents — generated from the code.
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <TrustActionsClient compact />
              <Link href="/kids/teach/trust" className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">Read it online →</Link>
            </div>
          </div>
        </section>

        {/* ── Alignment ────────────────────────────────────────────── */}
        <section aria-labelledby="align-h">
          <h2 id="align-h" className={H2}>How it fits your curriculum</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className={CARD}>
              <h3 className="text-lg font-extrabold text-white">CSTA K-12 Computer Science Standards</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
                The Code Lab and plans cover the Algorithms &amp; Programming strand: sequences for the youngest, with
                loops acted out unplugged (for example 1A-AP-10), then loops and debugging, with a first step into
                conditionals (1B-AP-10), then nested loops and decisions for middle school. Unplugged activities support
                the Computing Systems strand — what sensors and actuators are and how they work together.
              </p>
            </div>
            <div className={CARD}>
              <h3 className="text-lg font-extrabold text-white">India: NEP 2020</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
                The National Education Policy 2020 asks for coding and computational thinking from the middle stage and
                for experiential, activity-based learning throughout. Each R2BOT Kids lesson pairs an unplugged activity
                with hands-on building and coding, and the bands are labelled with both Grades and Classes.
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">These are our own mappings, offered to help you plan. R2BOT is not certified or endorsed by CSTA or any education ministry.</p>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className={H2}>Questions schools ask</h2>
          <div className="mt-5 space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-white/10 bg-slate-950/70">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-lg font-bold text-white">
                  {f.q}
                  <span aria-hidden className="text-slate-400 transition group-open:rotate-180">▾</span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Pilot form ───────────────────────────────────────────── */}
        <section id="pilot" aria-labelledby="pilot-h" className="scroll-mt-24 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 id="pilot-h" className={H2}>Request a school pilot</h2>
              <p className="mt-3 leading-relaxed text-slate-300">
                Tell us about your school. We will help you set up your first classes, share the lesson plans for your
                grades, and check in after the first few weeks to hear what worked.
              </p>
              <ul className="mt-5 space-y-2 text-[15px] text-slate-200">
                <li>✓ Setup help for your teachers</li>
                <li>✓ Lesson plans for every band you teach</li>
                <li>✓ A direct line for feedback that shapes what we build</li>
              </ul>
              <p className="mt-5 text-sm text-slate-400">Prefer to start straight away? <Link href="/kids/classroom" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 underline-offset-2 hover:underline">Create a class</Link> — it takes about a minute.</p>
            </div>
            <PilotFormClient />
          </div>
        </section>
      </article>
    </>
  )
}
