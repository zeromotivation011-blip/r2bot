// app/kids/play/robot-city/page.tsx — Robot City (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — the real autonomous-vehicle ideas, how the
// game models them, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import RobotCityClient from '@/components/kids/games/robot-city/RobotCityClient'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/robot-city'

const TITLE = 'Robot City: Self-Driving Car Game for Kids'
const DESCRIPTION =
  'Help a delivery robot cross busy roads, tune a self-driving car’s speed and following gap against its stopping distance, time the traffic lights of a busy junction, and write the rules a robotaxi follows when the unexpected happens. Four tiers for ages 8–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot City — self-driving cars, delivery robots and smart traffic lights',
    description: 'Stopping distances, safe following gaps, traffic-signal timing and behaviour rules for autonomous cars, in a real simulation. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Robot City game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot City',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Stopping distance = reaction distance + braking distance, and why it grows with speed squared',
    'Right-of-way at signal crossings, zebra crossings and plain roads',
    'Following gaps as time gaps; seeing distance in fog and rain',
    'Traffic-signal timing: cycle length, lost time, throughput and waiting',
    'How autonomous vehicles perceive, predict, plan and act',
    'Behaviour rules, rule priority, safety test suites and remote assistance',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot City', path: '/kids/worlds/city' },
  { name: 'Robot City game', path: '/kids/play/robot-city' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up',
    what: 'Crossing Patrol. A pavement delivery robot carries a parcel across a signal crossing, a zebra crossing and a road with no crossing at all. It stops at every kerb and asks you, its remote helper, “Go?”',
    tip: 'Every car paints an orange stopping zone on the road in front of it. If any zone already reaches the crossing, that car could not stop in time — wait. At the traffic lights, only start on the walking signal, even if the road looks empty.',
  },
  {
    name: 'Pilot',
    who: 'about 9 and up',
    what: 'Safe Speed. Choose a self-driving car’s cruise speed and following gap. It then drives a test route by itself: the car ahead brakes suddenly, and later rain and fog hide a broken-down van.',
    tip: 'Read the “stopping distance” panel before you drive. On a wet road the car must be able to stop inside the 30 m it can see. The gap is in seconds, so it grows by itself when the car goes faster. Too small and you bump the car ahead; too big and too few cars fit through the lane. The parcel also has a time limit, so crawling fails too.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Junction Timer. Set the green time for each road at a busy crossroads, and try the smart sensor mode. Three simulated minutes of human and self-driving traffic show the average and the longest wait.',
    tip: 'Give more green to the busier road. Very short cycles waste time on amber and all-red; very long cycles leave the other road waiting. Look at the queue numbers, not just the lights.',
  },
  {
    name: 'Legend',
    who: '14 and up',
    what: 'Rulebook. Write up to eight IF … THEN rules for a robotaxi, put them in priority order, and pass a six-scenario safety test suite: a ball then a child, an ambulance, sun glare at a red light, a plastic bag with a car close behind, road works, and an ordinary trip.',
    tip: 'Watch the replay of every failed test and read which rule was in control. Protecting people goes at the top. Do not over-react: an emergency stop for a plastic bag can cause a crash behind you. When the car cannot understand a scene, it should stop safely and ask a person. For 3 stars the rulebook must also pass a hidden stress test with a slower reaction time, so leave a margin.',
  },
]

export default function RobotCityPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <RobotCityClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-300">
          <Link href="/kids/worlds/city" className="hover:underline">
            Robot City
          </Link>{' '}
          · flagship game
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8]">How self-driving cars and city robots stay safe</h2>
        <p className="mt-3">
          In a growing number of cities, robots already share the street with us. Driverless taxis carry passengers in parts of the United States and China,
          small six-wheeled robots deliver groceries along pavements in Europe and North America, and traffic lights in many cities change their timing as
          traffic changes. Every one of these robots runs the same loop, many times a second: <strong className="text-[#EEF2F8]">perceive</strong> the world
          with cameras, lidar and radar; <strong className="text-[#EEF2F8]">predict</strong> what other road users will do next;{' '}
          <strong className="text-[#EEF2F8]">plan</strong> a safe path and speed; and <strong className="text-[#EEF2F8]">control</strong> the motors, steering
          and brakes to follow it.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The ideas inside the game</h2>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Stopping distance.</strong> Nothing stops instantly. First comes the reaction distance — the car keeps moving at
          full speed while the driver (or the computer) notices and reacts. Then comes the braking distance, which is the speed squared divided by twice the
          braking deceleration. Because of that square, going from 30 to 60 km/h makes the braking distance four times longer, not twice. Every car in the
          game paints its stopping distance on the road, and every result is calculated from it.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Reaction time.</strong> A self-driving computer can react in a fraction of a second; a person surprised by a
          sudden event often needs around 1.5 seconds. But a robot can only react to what its sensors can see. In fog, heavy rain or glare, cameras and lidar
          see less far, so a safe car must slow down until it can stop within the distance it can see.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Right-of-way.</strong> Crossings work because everyone follows the same rules. At a signal crossing you wait for
          the walk signal; at a zebra crossing drivers must give way — but only if they still have room to stop; on a road with no crossing you need a gap
          big enough to get all the way across.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Traffic signal timing.</strong> Each change of the lights wastes a few seconds of amber and all-red when nobody
          moves. Short cycles waste lots of that lost time; long cycles make people wait through long reds. In 1958 the British engineer F. V. Webster
          published a formula for the best cycle length, still taught today. Smart signals use sensors in the road or cameras to end a green early when
          nobody is waiting. Self-driving cars that start the moment the light turns green could let more cars through each green.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Rules, priorities and testing.</strong> Real self-driving software is far more than a list of rules, but it
          still has priorities: protecting people comes first, emergency vehicles must get through, and when the car cannot understand a scene — road works
          with a person waving — it stops safely and asks a remote assistant, a trained person in a control centre who sends it a plan. Before a car drives
          without a safety driver, its software is tested on millions of simulated scenarios, on closed tracks and on public roads with trained safety
          drivers ready to take over.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">What is simplified.</strong> The game uses one lane at a time, fixed reaction times and tidy weather. Real cars
          estimate grip, track hundreds of objects and predict many possible futures. The physics — reaction distance, braking distance, time gaps, queues
          and signal timing — is real.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
              <h3 className="font-display text-xl font-bold text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-[#6E7888]">For {t.who}</p>
              <p className="mt-2">{t.what}</p>
              <p className="mt-2 text-[15px]">
                <span className="font-bold text-[#EEF2F8]">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Where this happens for real</h2>
        <p className="mt-3">
          Waymo runs driverless taxis in several US cities, and Baidu’s Apollo Go operates robotaxis in Wuhan and other cities in China. Starship
          Technologies, founded in Estonia, has delivery robots that drive along pavements at walking pace on university campuses and in towns in Europe and
          the United States, with people on hand to help remotely when needed. Adaptive traffic-signal systems such as SCOOT, developed in the UK, and SCATS,
          developed in Sydney, adjust the lights in cities around the world. In every case the goal is the same: move people and goods efficiently — and
          never at the cost of safety.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/city" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Explore the Robot City world →
          </Link>
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'robot-city', name: 'Robot City' }} />
      </article>
    </>
  )
}
