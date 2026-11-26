// app/kids/play/safety-inspector/page.tsx — Robot Safety Inspector (server component)
// The flagship game of the Robot Guardians world. The game is a client island
// loaded with next/dynamic; everything a parent, teacher or search engine
// needs — the Robot Harm Check, how real engineers judge risk, how the game
// models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import SafetyInspectorClient from '@/components/kids/games/safety-inspector/SafetyInspectorClient'
import { HARM_CHECK } from '@/components/kids/games/safety-inspector/harm'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/safety-inspector'

const TITLE = 'Robot Safety Inspector: a Game About Robot Safety and Ethics for Kids'
const DESCRIPTION =
  'Inspect a factory, a smart home, a robot street and a hospital. Kids learn the six-question Robot Harm Check (body, data, fairness, control, people, planet), risk = likelihood × severity, trade-offs and safety cases. Ages 7–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot Safety Inspector — find every way a robot could cause harm',
    description: 'The Robot Harm Check, risk matrices and safety cases, in a game. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Robot Safety Inspector game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot Safety Inspector',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 7–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Identifying physical hazards of robots: pinch points, speed and force, guarding, emergency stops',
    'Privacy and data from robot cameras and microphones',
    'Fairness and bias in robot AI',
    'Human control and safe failure',
    'Effects of robots on jobs and people',
    'Environmental impact of robots: energy, batteries and e-waste',
    'Risk = likelihood × severity, mitigation and residual risk',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot Guardians', path: '/kids/worlds/guardians' },
  { name: 'Robot Safety Inspector', path: '/kids/play/safety-inspector' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 7 and up',
    what: 'Gearworks Factory. Inspect a big robot arm, a conveyor belt, a parts-carrying robot and more. Find the four dangers to people’s bodies and pick the fix that really stops each one. A Hint button points you to the next danger.',
    tip: 'A sign or “be careful” is a reminder, not a fix. Look for fixes that work even when someone is tired or distracted: a guard, a light curtain, a stop button you can reach.',
  },
  {
    name: 'Pilot',
    who: 'about 9 and up',
    what: 'A smart home with a robot vacuum, two smart speakers, a robot pet and a building kit. Each hazard belongs to a different Harm Check question. Name it, then fix it.',
    tip: 'Ask all six questions of every device. A speaker that cannot understand Grandma is not dangerous to her body, but it is unfair. A vacuum’s camera is a data question.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Robot Street: delivery robots, a self-driving car and a police officer at a junction. You have 15 coins, and the city only approves the robots if every Harm Check question’s risk is 9 or less. Some fixes create a new hazard somewhere else.',
    tip: 'Spend first where likelihood × severity is biggest. Watch the risk bars after each choice: turning cameras off helps privacy but blinds the car; recording everything helps safety but harms privacy.',
  },
  {
    name: 'Legend',
    who: '14 and up — real engineering',
    what: 'City Hospital is buying MediRun, a medicine-delivery robot. Build its safety case: rate every hazard on a 5 × 5 risk matrix, choose mitigations within 11 coins, accept one residual risk honestly, set a top speed that lets it stop inside its LiDAR field, and answer three challenges from the hospital board.',
    tip: 'Budget cannot buy every best fix, so one low risk has to stay amber and be written down. For speed, work out d = v·t + v²/(2a) and keep it under the field length, but not so slow that medicines arrive late.',
  },
]

export default function SafetyInspectorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <SafetyInspectorClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">
          <Link href="/kids/worlds/guardians" className="underline-offset-4 hover:underline">
            Robot Guardians world
          </Link>
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8]">How do you know if a robot could cause harm?</h2>
        <p className="mt-3">
          Robots are brilliant helpers: they weld cars, vacuum floors, deliver parcels and carry medicines. But a robot is also a machine that moves
          with force, sees with cameras, makes decisions with software and is built from metals and batteries. Each of those can hurt someone if it
          is designed carelessly. Real safety engineers do not wait for an accident. They go looking for harm first, write down every hazard they
          find, decide how serious it is, and change the design until the risk is low enough. That is the job you do in this game.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The Robot Harm Check: six questions for any robot</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {HARM_CHECK.map((q) => (
            <li key={q.id} className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
              <p className="font-display text-lg font-bold text-[#EEF2F8]">
                <span aria-hidden>{q.icon}</span> {q.n}. {q.name}: {q.question}
              </p>
              <p className="mt-1 text-[15px]">Look for: {q.lookFor.join('; ')}.</p>
            </li>
          ))}
        </ol>
        <p className="mt-4">
          The first question is the one people think of: can the robot hurt a body? Industrial robot arms are strong and fast, so factories put them
          behind fences with interlocked gates, or use light curtains (rows of light beams that stop the robot when a person breaks them). Smaller
          collaborative robots, or cobots, are designed to limit their own speed and force so they can work beside people. Every machine needs an
          emergency stop that anyone can reach. The other five questions catch harms that do not leave a bruise: a camera that sends pictures of your
          home to strangers, a voice assistant that understands some accents and not others, a car that guesses when it should stop and ask, a
          company that replaces workers without a plan, and a robot that is thrown away whole because its battery was glued in.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Risk = likelihood × severity</h2>
        <p className="mt-3">
          Not every hazard is equally worrying. Engineers rate each one on two scales: how likely it is to happen, and how bad it would be if it
          did. Multiply them and you get a risk score. In this game both scales run from 1 to 5, so risk runs from 1 to 25: 1–4 is green (low),
          5–9 amber and 10 or more red. A fix lowers the likelihood, the severity or both, and what is left afterwards is called the residual risk.
          Zero risk is impossible, so a good engineer reduces the biggest risks first and is honest about what remains. Standards such as ISO 12100
          (safety of machinery) and ISO 10218 (industrial robots) describe this process, and medical robots follow ISO 14971.
        </p>
        <p className="mt-3">
          There is a catch, and it is the heart of the harder tiers: a fix can create a new hazard. Turning a self-driving car’s cameras off is
          perfect for privacy and terrible for safety. Filming every corridor helps a hospital robot steer but records patients in their gowns.
          Real safety reviews always ask “what new risk did this fix bring?”, and so does the game.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">What the game simulates</h2>
        <p className="mt-3">
          Every hazard has an expert rating and every fix a residual rating. When you press Run, each moment plays out with your fix: a worker steps
          towards the arm, a child runs out between vans, a photo heads for the cloud. Then the game simulates a whole year, day by day. Each day,
          every hazard has a chance of causing an incident that grows with its likelihood, and incidents with severity 4 or 5 count as serious. The
          random numbers are seeded, so the same choices always give the same year and a result is fair. At Legend, MediRun’s stopping distance is
          worked out from real physics: reaction distance (speed × reaction time) plus braking distance (speed² ÷ twice the deceleration).
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
              <h3 className="font-display text-xl font-bold text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-[#6E7888]">For {t.who}</p>
              <p className="mt-2 text-[15px] text-[#EEF2F8]">{t.what}</p>
              <p className="mt-2 text-[15px]">
                <span className="font-bold text-[#EEF2F8]">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Where this happens for real</h2>
        <p className="mt-3">
          Car factories in Germany, Japan, Korea and the USA run thousands of fenced robot arms and a growing number of cobots. Hospitals in many
          countries use delivery robots that ride lifts on their own. Sidewalk delivery robots trundle around university campuses and city
          neighbourhoods, and self-driving taxis carry passengers in several cities. Behind every one of them is a team asking the same six
          questions you asked here — and writing a safety case before the robot ever meets the public.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/guardians" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Explore the Robot Guardians world →
          </Link>
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
      </article>
    </>
  )
}
