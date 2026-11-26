// app/kids/play/robot-surgeon/page.tsx — Robot Hospital (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — the real medical robotics, how the game
// models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import RobotSurgeonClient from '@/components/kids/games/robot-surgeon/RobotSurgeonClient'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/robot-surgeon'

const TITLE = 'Robot Hospital: Surgical Robot Game for Kids (Motion Scaling, Bionic Hands, Safety)'
const DESCRIPTION =
  'Drive a hospital delivery robot, steady a surgical robot’s tool with motion scaling and tremor filtering, tune a bionic hand that reads muscle signals, and run a remote surgery-assist session with a force limit and safety interlocks. Four tiers for ages 7–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot Hospital — steady hands, bionic hands and safe robots',
    description: 'Motion scaling, tremor filters, EMG-controlled prosthetic hands and surgical safety interlocks, in a real simulation. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Robot Hospital game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot Hospital',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 7–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Tele-operated surgical robots: the surgeon stays in control',
    'Motion scaling and tremor filtering',
    'Laser safety fields and stopping distance on mobile robots',
    'Myoelectric prosthetic hands: EMG envelopes, thresholds and hysteresis',
    'Force limits, interlocks and safety checklists',
    'Teleoperation with network delay',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot Hospital', path: '/kids/worlds/hospital' },
  { name: 'Robot Hospital game', path: '/kids/play/robot-surgeon' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 7 and up',
    what: 'Medicine Run. Drive a delivery robot from the pharmacy to three ward doors and back to its charger, while nurses, visitors and a wheelchair user move along the corridors.',
    tip: 'Switch to careful speed whenever someone is inside the dotted ring. The red ring is the robot’s stop zone: it grows when you go fast, because a fast robot needs more room to brake. Plan the order of the wards so you never drive the same corridor twice.',
  },
  {
    name: 'Pilot',
    who: 'about 9 and up',
    what: 'Steady Hands. Sit at a surgeon’s console and guide a tool tip along a narrow channel on a practice board. Choose 1:1, 3:1 or 5:1 motion scaling, and switch the tremor filter on or off.',
    tip: 'At 1:1 every wobble of your finger reaches the tool. Scaling divides the shake, and the filter removes most of what is left — but more scaling means more hand travel, so lift your finger and drag again (that is the clutch). Try every setting and compare your runs.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Bionic Hand. A prosthetic hand listens to a noisy muscle signal. Set a pinch line, a power-grip line, a hysteresis band and a smoothing window, then test the hand through a morning of grapes, bottles, pens and door handles.',
    tip: 'Use the squeeze buttons first and watch where the orange envelope sits when relaxed, pinching and squeezing hard. Put each line in a gap. Smoothing flattens the short spikes from bumping the arm, but too much makes the hand slow.',
  },
  {
    name: 'Legend',
    who: '14 and up',
    what: 'Remote Assist. Arm the robot with a safety checklist (some items are traps), choose its force limit, then mark four targets with a gentle touch. Everything you see is 0.4 s late, and the bedside team will need your attention.',
    tip: 'The force limit is enforced on the robot itself, with no delay — think about where to put it compared with the marking window and the safe maximum. With delay, move, wait for the picture, then move again.',
  },
]

export default function RobotSurgeonPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <RobotSurgeonClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <p className="text-sm font-bold uppercase tracking-wide text-rose-300">
          <Link href="/kids/worlds/hospital" className="hover:underline">
            Robot Hospital
          </Link>{' '}
          · flagship game
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8]">Robots that help doctors and patients</h2>
        <p className="mt-3">
          Hospitals around the world use robots every day, but probably not the way you imagine. The most famous medical robots do not operate on their
          own. In robot-assisted surgery, a surgeon sits at a console a few metres from the patient, looks into a 3D viewer and moves two hand controls.
          The robot copies those moves with thin instruments that go into the body through small cuts. <strong className="text-[#EEF2F8]">The surgeon is
          always in control</strong>: the robot does not decide anything by itself. What it adds is precision — smaller, steadier, more accurate moves than a
          human hand can make on its own.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The ideas inside the game</h2>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Motion scaling.</strong> The console can shrink every hand movement. At 3:1, moving your hand 3 cm moves the
          instrument 1 cm. That turns big, comfortable hand movements into tiny, precise ones — the price is that your hand has to travel further, so
          surgeons use a clutch to re-centre their hands without moving the tools.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Tremor filtering.</strong> Every human hand shakes very slightly, roughly 8 to 12 times a second. A filter
          lets slow, intended movement through and blocks fast shakes, so the instrument tip stays steady. The game exaggerates the shake so you can see
          it, and uses a real low-pass filter: the faster the shake, the more it is cut.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Prosthetic hands driven by muscles.</strong> When a muscle tightens, its fibres make tiny electrical
          signals. Sensors on the skin pick these up — this is called surface electromyography, or EMG. The raw signal looks like random noise that gets
          bigger the harder you squeeze, so a myoelectric hand rectifies and smooths it into an <em>envelope</em>, then compares it with thresholds to
          decide: open, pinch or grip. Hysteresis and smoothing stop it reacting to noise or to a knock on the arm.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Safety by design.</strong> Hospital delivery robots carry laser scanners with a slow zone and a stop zone,
          and the stop zone grows with speed because stopping distance grows with the square of speed. Surgical systems check that the surgeon is
          looking into the viewer and freeze the instruments when they look away. Force limits stop a tool pushing too hard. Before every operation, the
          team works through a checklist — the World Health Organization’s Surgical Safety Checklist is used in hospitals in many countries.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Delay.</strong> Signals take time to travel. In 2001 a surgeon in New York operated on a patient in
          Strasbourg, France, through a robot, with a delay of about 155 milliseconds. The more delay, the slower and more carefully you have to move —
          and the more the robot’s own local safety limits matter, because they work instantly where the robot is.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">What is simplified.</strong> The game uses a soft practice pad and abstract shapes, never real anatomy. The
          tremor is bigger than a real surgeon’s, and the prosthetic hand uses one muscle signal with two thresholds; many real hands use two or more
          electrodes, timing rules or pattern recognition. The physics — scaling, filtering, stopping distances, spring-like contact force and delay — is
          real.
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
          Robot-assisted surgery is used in many countries for operations where small cuts help patients recover faster. Autonomous delivery robots carry
          medicine, meals and linen along hospital corridors and can call lifts by themselves. Ultraviolet disinfection robots clean empty rooms. Robotic
          exoskeletons help people relearn to walk after an injury or a stroke, and myoelectric hands give people who were born without a hand, or who lost
          one, a hand they control with their own muscles. In every case the same rule holds: the robot helps, a person decides, and safety comes first.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/hospital" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Explore the Robot Hospital world →
          </Link>
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'robot-surgeon', name: 'Robot Hospital' }} />
      </article>
    </>
  )
}
