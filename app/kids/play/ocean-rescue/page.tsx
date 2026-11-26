// app/kids/play/ocean-rescue/page.tsx — Deep Sea Rescue (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — the real ocean robotics, how the game models
// it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import OceanRescueClient from '@/components/kids/games/ocean-rescue/OceanRescueClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/ocean-rescue'

const TITLE = 'Deep Sea Rescue: Underwater Robot Game for Kids (ROVs, AUVs, Sonar)'
const DESCRIPTION =
  'Pilot an underwater robot through currents and darkness to rescue a lost sensor buoy. Kids learn buoyancy and ballast, pressure with depth, sonar echoes at 1,500 m/s, tethers and navigation without GPS — four tiers for ages 5 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Deep Sea Rescue — pilot and program underwater robots',
    description: 'Buoyancy, sonar, currents and autonomous navigation in a real physics simulator. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Deep Sea Rescue underwater robot game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Deep Sea Rescue',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Buoyancy and Archimedes’ principle',
    'Ballast and neutral buoyancy',
    'Pressure increases about 1 atmosphere per 10 m of seawater',
    'Sonar ranging with the speed of sound in water',
    'Tethered ROVs versus autonomous AUVs',
    'Dead reckoning and Doppler velocity logs',
    'Multibeam sonar survey planning',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Ocean Lab', path: '/kids/worlds/ocean' },
  { name: 'Deep Sea Rescue', path: '/kids/play/ocean-rescue' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 5–7 with a grown-up, and up',
    what: 'Fly a tethered robot in a harbour. It is already balanced, so it hovers when you let go. Ping the sonar, follow the arrow to the buoy, hold still to grab it and bring it up to the ship.',
    tip: 'The robot keeps gliding after you let go — water is heavy to push aside. Tap the arrows near the seabed instead of holding them. Watch the buoy: in the dark it looks grey, and it turns orange only when your lights reach it.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'Balance the robot yourself before diving, cross a current that drags on the tether, and find the buoy with a sonar that only tells you the distance.',
    tip: 'Set the ballast until the net force is close to 0 N. One ping gives a circle; ping again from somewhere else and the buoy sits where the circles cross. The current flows between 5 and 22 m deep — try travelling underneath it. After grabbing, pump ballast out: the buoy weighs 12 N in water.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'No cable and no radio. Write the mission for an autonomous robot — waypoints, height above the seabed, speed and sonar rules — then watch it search the canyon alone.',
    tip: 'Compare the orange line (where it went) with the dashed cyan line (where it thinks it went). If they split apart, it was too high for its Doppler velocity log. Space your search lines so the pale hearing band covers the whole circle.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real survey-planning problem',
    what: 'Map a whole reef with a multibeam sonar fan before the 60 Wh battery or the 60-minute clock runs out. 90 % of the map must be sharp and placed correctly.',
    tip: 'Height sets three things at once: the swath width (about 3.5 × height), the size of each sonar spot (detail — it must be 0.6 m or smaller, which means flying no higher than about 23 m), and whether the DVL can lock (within 30 m). Then pick a spacing a little narrower than the swath and the cheapest speed between “always-on electronics” and “drag grows with speed cubed”.',
  },
]

export default function OceanRescuePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <OceanRescueClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <p className="text-sm font-bold uppercase tracking-wide text-cyan-300">
          <Link href="/kids/worlds/ocean" className="inline-flex min-h-[44px] items-center hover:underline">
            Ocean Lab
          </Link>{' '}
          · flagship game
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8]">Why the deep sea needs robots</h2>
        <p className="mt-3">
          More than half of our planet is covered by ocean deeper than 3,000 m, and most of the seafloor has never been seen up close. People cannot go
          there easily: the water is cold, dark and crushing. Every 10 m of seawater adds about one more atmosphere of pressure on top of the one
          atmosphere of air above it. At 100 m that is 11 atmospheres; at the bottom of the Challenger Deep, almost 11,000 m down, it is more than
          1,000. So scientists, rescue teams and engineers send robots: to film new animals, inspect pipelines and cables, find lost equipment and
          map the seafloor.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Three kinds of underwater robot</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong className="text-[#EEF2F8]">ROVs</strong> (remotely operated vehicles) are connected to a ship by a cable called a{' '}
            <em>tether</em>. Power goes down it and live video comes up, so a pilot can steer by joystick and grab things with robot arms. The price is
            the cable: it limits how far the robot can go, and in a current the long cable is pushed hard, often harder than the robot itself.
          </li>
          <li>
            <strong className="text-[#EEF2F8]">AUVs</strong> (autonomous underwater vehicles) have no cable. They carry batteries and follow a
            program. Survey AUVs map large areas of seafloor and search for lost aircraft, shipwrecks and equipment.
          </li>
          <li>
            <strong className="text-[#EEF2F8]">Gliders</strong> move by changing their buoyancy: they pump oil into an outside bladder (or water in and out) to
            sink and rise, and their wings turn that up-and-down motion into forward motion. Using very little power, they can collect ocean data
            for months. In 2009 a glider called RU27 crossed the Atlantic Ocean in 221 days.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The physics inside the game</h2>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Buoyancy.</strong> Archimedes worked out that water pushes up on an object with a force equal to the
          weight of the water it pushes aside. Seawater is about 1,025 kg per cubic metre. If the robot weighs more than the water it displaces, it
          sinks; less, and it floats up. When the two are equal it is <em>neutrally buoyant</em> and hovers. Many small ROVs are balanced with foam
          and small weights before a dive; submarines, some robots and gliders change their buoyancy during the dive. The game&apos;s robot has a
          ballast tank: pumping water in makes it heavier.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Light and colour.</strong> Sunlight fades quickly with depth, and red fades first, then green, while blue
          goes deepest. In coastal water like the game&apos;s, it is already dim a few tens of metres down. That is why underwater robots carry
          lamps, and why an orange buoy looks grey-green until the robot&apos;s light lands on it.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Sound, not radio.</strong> Seawater conducts electricity, so the radio waves used by phones and Wi-Fi die
          out within metres, and GPS does not work underwater. Sound travels well: about 1,500 m every second in seawater, over four times faster
          than in air. A sonar ping that comes back after 0.040 s has travelled 60 m in total, so the object is 30 m away. The lost buoy carries an
          acoustic transponder that answers each ping, exactly like the lost scientific instruments that ships search for.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Navigating without GPS.</strong> An AUV adds up its own speed and heading to keep track of where it
          is. This is called <em>dead reckoning</em>. A Doppler velocity log (DVL) bounces sonar off the seabed to measure speed over the ground, but
          only when it is close enough to the bottom. The game&apos;s DVL locks within 30 m; real ones manage from about 30 m to a few hundred metres,
          depending on their frequency. Too high, and the robot only knows its speed through the water, so a current carries it away without it
          noticing. A ship can also track it with an acoustic positioning system and send it position fixes.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">What is simplified.</strong> The force model is real (buoyancy, thrust, water drag, added mass,
          tether drag and currents, stepped 60 times a second). The sonar animation is slowed down so you can see it. The AUVs get small batteries
          so a mission fits a few minutes of play; real survey AUVs work for hours.
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
          Ocean scientists send ROVs to film deep-sea vents and coral, and AUVs to map the seafloor before anyone visits. Engineers send robots
          along undersea pipelines and the internet cables that link continents, looking for damage. Small ROVs help find and recover lost fishing
          nets that would otherwise keep trapping animals. Search teams have used AUVs with sonar to find aircraft and ship wrecks thousands of
          metres down. Every one of them has to solve the problems in this game: stay balanced, beat the current, see in the dark with sound, and know
          where it is without GPS.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/ocean" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            Explore the Ocean Lab world →
          </Link>
          <Link href="/kids" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
      </article>
    </>
  )
}
