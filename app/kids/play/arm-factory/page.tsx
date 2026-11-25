// app/kids/play/arm-factory/page.tsx — Arm Factory, an R2BOT Universe game.
// Server-rendered teaching text (indexable) + the 3D game, which loads
// client-side only behind a same-size skeleton (see ArmFactoryGameClient).

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import ArmFactoryGameClient from '@/components/kids/games/arm-factory/ArmFactoryGameClient'

export const runtime = 'nodejs'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/arm-factory`
const TITLE = 'Arm Factory: Robot Arm Kinematics Game for Kids and Teens'
const DESCRIPTION =
  'Drive a 3D robot arm joint by joint, time grabs on a moving conveyor, solve inverse kinematics round an obstacle and program a pick-and-place cell against grip, torque and cycle-time limits.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Arm Factory — sort parts with a real 3-joint robot arm',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Arm Factory robot arm game' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['VideoGame', 'LearningResource'],
      '@id': `${PAGE_URL}#game`,
      name: 'Arm Factory',
      url: PAGE_URL,
      description: DESCRIPTION,
      inLanguage: 'en',
      learningResourceType: 'Simulation',
      educationalLevel: 'Ages 8–17',
      teaches: ['forward kinematics', 'inverse kinematics', 'robot workspace', 'pick and place programming', 'payload and torque limits'],
      gamePlatform: 'Web browser',
      applicationCategory: 'Game',
      isAccessibleForFree: true,
      publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'Arm Factory', item: PAGE_URL },
      ],
    },
  ],
}

const TIERS = [
  {
    name: 'Cadet',
    who: 'a bright 7–8 year old, with a grown-up nearby',
    body: 'Move each joint with a slider: the base turns, the shoulder lifts, the elbow bends. A white dot shows where the fingers would land and a green ring tells you the part is between them. Grab, lift, turn, drop it in the matching bin. Stuck? Ask for the helper ghost: it shows one pose that works, and you copy it.',
    tip: 'Turn the base first, then lower the hand. Always lift before you turn — the bin walls stop the arm.',
  },
  {
    name: 'Pilot',
    who: 'ages 9–12',
    body: 'Now the belt moves at 8 cm a second and it never waits. Use the teach pendant, the same idea real factory technicians use: drive the arm to a pose, save it, and jump back to it with one press. Park the open gripper over the belt and close it as a part slides in.',
    tip: 'Save P1 low over the belt and P2/P3 high over bins. The fingers take a quarter of a second to close, so grab a moment early.',
  },
  {
    name: 'Ace',
    who: 'ages 12–15',
    body: 'Tap a point and the arm solves its own joint angles with inverse kinematics. Most points have two answers, elbow-up and elbow-down; some break a joint limit. A yellow safety pillar stands between the belt and the bins, and the line drawn in 3D is the real path the hand will take. Red means it will hit.',
    tip: 'A move turns every joint at once, so the hand swings along a curve. Add a high waypoint above the part and above the bin, or tuck the arm in close as it turns.',
  },
  {
    name: 'Legend',
    who: 'ages 14–17 and anyone who likes a hard problem',
    body: 'Write a looping program that sorts a stream of eight parts. Three are heavy steel parts. Move too fast and the needed grip force passes what the rubber fingers can hold, or the shoulder motor overloads, and the line stops. Beat a cycle-time target with steps that run only for heavy or only for light parts.',
    tip: 'Watch the two gauges. A lift straight up asks for the most grip, because the fingers must fight gravity and the upward push together. Ask yourself which steps you even need.',
  },
]

export default function ArmFactoryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <ArmFactoryGameClient />
      <article className="mx-auto max-w-4xl space-y-10 px-4 pb-24 pt-8 text-slate-200">
        <header>
          <p className="text-sm font-black uppercase tracking-wider text-amber-300">R2BOT Universe · Mega Factory</p>
          <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">How a factory robot arm really works</h2>
          <p className="mt-3 text-lg text-slate-300">
            Most robots in the world are not walking humanoids. They are arms bolted to a factory floor, picking parts off conveyor belts and
            putting them somewhere else, thousands of times a day. Arm Factory lets you run one, with the same maths and the same limits the
            real machines have.
          </p>
        </header>

        <section>
          <h3 className="text-2xl font-black text-white">Joints, links and the workspace</h3>
          <p className="mt-2">
            A robot arm is a chain: rigid <b>links</b> joined by motors called <b>joints</b>. Our arm has three. The base joint turns the whole arm
            around, the shoulder lifts the upper arm (45 cm long) and the elbow bends the forearm (40 cm). A wrist below the elbow stays level, so
            the gripper always points straight down — palletising robots in warehouses are built the same way. Every place the fingertips can
            reach makes up the arm&apos;s <b>workspace</b>. In the game it is drawn on the floor as an amber ring: outside it, no choice of joint
            angles can get there. Each joint also has <b>limits</b>. The base cannot spin all the way round, because the cables inside it would
            twist and tear.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-black text-white">Forward and inverse kinematics</h3>
          <p className="mt-2">
            <b>Forward kinematics</b> answers: &ldquo;if the joints are at these angles, where is the hand?&rdquo; For our arm the hand&apos;s
            distance from the base is <i>L1·cos(shoulder) + L2·cos(shoulder + elbow)</i> and its height comes from the same sum with sines. That
            is what you feel in Cadet: change one angle and the hand sweeps along a circle around that joint.
          </p>
          <p className="mt-2">
            <b>Inverse kinematics</b> works backwards: &ldquo;the hand must be here, so what angles do I need?&rdquo; For a two-link arm there is an
            exact answer from the law of cosines, and it usually has <b>two solutions</b>, elbow-up and elbow-down, like bending your own arm with
            the elbow pointing up or down to touch the same spot. A real controller has to choose one, skipping any that break a joint limit or
            hit something. Six-joint industrial arms can have up to eight solutions for one hand position.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-black text-white">Why the hand moves in a curve</h3>
          <p className="mt-2">
            When an arm makes a <b>joint move</b>, every joint starts and stops together, each turning at a steady share of its speed. The joints
            move evenly, but the hand does not travel in a straight line: it swings along a curve. That is why real robot programmers add{' '}
            <b>waypoints</b>, such as &ldquo;above the part&rdquo; and &ldquo;above the bin&rdquo;, so the path stays clear of the machines
            around it. Each joint also speeds up and slows down smoothly (a trapezoid speed profile) instead of jumping to full speed.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-black text-white">Payload, grip and torque</h3>
          <p className="mt-2">
            A gripper holds a part by friction. Our two rubber fingers squeeze with 15.5 newtons each and have a friction coefficient of 0.6, so
            they can hold 18.6 N. A 1.6 kg steel part already weighs 15.7 N. When the arm speeds up, the fingers must also push the part along
            (force = mass × acceleration). Lift it upwards fast and the needed force goes past 18.6 N, and the part slips. The shoulder motor has
            a limit too: it must hold the whole arm up against gravity and give it extra twist to speed it up (torque = inertia × angular
            acceleration). This is why real robots have a <b>payload rating</b> and why engineers slow down moves for heavy parts while leaving
            light ones fast. Our physics is simplified (masses are lumped at the middle of each link) but the trade-off is the real one.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-black text-white">The four tiers</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TIERS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-lg font-black text-amber-300">
                  {t.name} <span className="text-sm font-bold text-white/50">· {t.who}</span>
                </p>
                <p className="mt-1 text-sm">{t.body}</p>
                <p className="mt-2 text-sm text-emerald-200">
                  <b>Tip:</b> {t.tip}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-black text-white">Where you&apos;ll see this for real</h3>
          <p className="mt-2">
            Pick-and-place arms sort parcels in warehouses, put chocolates into boxes, load machines in car factories and pack medicines. Their
            builders tune exactly what you tune here: which waypoints to use, which elbow to choose, and how fast each move can safely go with the
            weight in the gripper. Every second cut from a cycle adds up to thousands of extra parts a day.
          </p>
          <p className="mt-4">
            <Link href="/kids" className="font-black text-amber-300 underline underline-offset-4">
              ← Back to the R2BOT Universe
            </Link>
          </p>
        </section>
      </article>
    </>
  )
}
