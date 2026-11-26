// app/kids/play/bio-bots/page.tsx — Robo Zoo: Bio-Bot Lab (server component)
// The game is a client island loaded with next/dynamic; the teaching text —
// what biomimicry is, the real robots, how the game models them and tips per
// tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import BioBotsClient from '@/components/kids/games/bio-bots/BioBotsClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/bio-bots'

const TITLE = 'Bio-Bot Lab: Biomimicry Robot Game for Kids — Gecko, Snake, Bird and Goat Robots'
const DESCRIPTION =
  'Build robots that copy animals. Kids test gecko feet on glass, snake bodies in pipes, flapping wings over rivers and four-legged gaits on a swaying bridge — with real physics: support polygons, friction, lift and cost of transport. Four tiers for ages 5 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robo Zoo: Bio-Bot Lab — robots that copy animals',
    description: 'Gecko feet, snake waves, flapping wings and walking gaits, tested in a real physics model. Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Bio-Bot Lab game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robo Zoo: Bio-Bot Lab',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Biomimicry in robot design',
    'Static stability and the support polygon',
    'Duty factor and walking gaits',
    'Friction and dry adhesion',
    'Lift versus weight in flapping flight',
    'Energy cost of transport',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robo Zoo', path: '/kids/worlds/zoo' },
  { name: 'Bio-Bot Lab', path: '/kids/play/bio-bots' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 6 and up',
    what: 'Five challenges: clean a skyscraper window, find a leak in a pipe, cross a river, pick a ripe tomato and more. Pick the animal trick that fits, then watch the robot try it.',
    tip: 'Ask what makes the place hard. Smooth and straight up? Something has to hold on. Narrow? The body has to be thin. Soft and squashy? The grip has to be soft too.',
  },
  {
    name: 'Pilot',
    who: 'about 9 and up',
    what: 'Three stations, one number each: the duty factor of a four-legged walk on a swaying bridge, the width of a snake’s wave in a sloping pipe, and the flap rate of a small flapper hopping a river.',
    tip: 'Watch the top view on the bridge: the centre of mass must stay inside the green shape made by the feet on the ground. For the snake, the wave must be wider than the gap to the wall, but not so wide that the motors stall. For the flapper, find the slowest rate that still lifts it.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Three missions — an earthquake search, a bridge inspection and a flooded cave — each a chain of terrains on a 7 Wh battery. Combine modules so every stretch can be crossed without running flat.',
    tip: 'Each module adds mass, and the energy of every metre is cost of transport × weight × distance. Carry only what a stretch needs, and add a cheap module (like wheels) only where it saves more energy than its weight costs.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real design problem',
    what: 'Design one robot for eight courses you cannot see. You only know the mix of terrains and their lengths. Survive at least seven, then explain the trade-offs.',
    tip: 'Find the hardest constraint first. Wings can lift only 40 N, so a robot that must fly has to stay under about 4 kg — that decides what else it may carry. Then make the gait careful only where it has to be.',
  },
]

export default function BioBotsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <BioBotsClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <h2 className="font-display text-3xl font-black text-[#EEF2F8]">Biomimicry: robots that copy animals</h2>
        <p className="mt-3">
          Animals have had hundreds of millions of years to solve the problems robot engineers face today: how to climb a wall, squeeze through a gap,
          walk on rough ground without falling, or fly on very little energy. <strong className="text-[#EEF2F8]">Biomimicry</strong> means studying how
          an animal does something and building a machine that uses the same trick. Engineers rarely copy the whole animal. They copy the{' '}
          <em>principle</em> — the reason it works — and build it from metal, plastic, motors and code.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-[#EEF2F8]">The real robots behind the game</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong className="text-[#EEF2F8]">Gecko feet.</strong> A gecko’s toes are covered in millions of tiny hairs that split into even tinier
            tips. They touch a surface so closely that weak attraction forces between molecules (van der Waals forces) add up to a strong hold — no glue,
            no suction. Stanford’s Stickybot climbed glass with gecko-inspired dry adhesive in 2006, and the same idea now appears in grippers designed to
            grab objects in space.
          </li>
          <li>
            <strong className="text-[#EEF2F8]">Snake robots.</strong> A long, thin body made of many joints can slither into pipes and through rubble.
            Carnegie Mellon University’s snake robots have inspected pipes and joined search teams after the 2017 earthquake in Mexico City, and the
            Norwegian swimming snake robot Eelume is designed to inspect underwater equipment.
          </li>
          <li>
            <strong className="text-[#EEF2F8]">Four-legged robots.</strong> Robots such as Spot and ANYmal walk through factories, tunnels and power
            stations where wheels would get stuck, choosing their gait the way a dog or a goat does.
          </li>
          <li>
            <strong className="text-[#EEF2F8]">Flapping flyers.</strong> Harvard’s RoboBee, about the size of a paper clip, first flew under control in 2013,
            flapping its wings about 120 times a second. TU Delft’s DelFly flies by flapping too.
          </li>
          <li>
            <strong className="text-[#EEF2F8]">Fish, octopus and birds.</strong> MIT’s soft robot fish SoFi swam alongside real fish on a coral reef in
            Fiji in 2018. Festo’s OctopusGripper wraps a soft arm around objects. Stanford’s SNAG (2021) used bird-like legs and grasping feet to perch on
            branches.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-black text-[#EEF2F8]">The science the game simulates</h2>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Stability.</strong> Look down on a standing robot and join the feet that touch the ground: that shape is the{' '}
          <em>support polygon</em>. If the centre of mass sits above it, the robot can freeze and not fall — that is <em>static stability</em>. A
          four-legged robot that lifts one foot at a time keeps three down, and the game computes the triangle they make at every instant. To keep
          three feet down, each foot must touch the ground at least three quarters of each step (a <em>duty factor</em> of 0.75 or more). Fast gaits like
          a trot keep only two feet down; they stay up by moving, which is <em>dynamic stability</em>.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Grip.</strong> Friction is the coefficient μ times how hard two surfaces press together. A snake in a pipe
          presses its curves against the walls to make that push; too gentle and it slides back, too hard and its motors stall. Gecko pads hold by adhesion
          instead, and engineers design them to hold at least twice the robot’s weight.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Lift.</strong> Flapping wings push air down, so the air pushes the robot up. In the game, lift grows with the
          flap rate squared but the power needed grows with it cubed — so the best flyers flap just fast enough.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Energy.</strong> Biologists and engineers compare a mouse, a horse and a robot with one number, the{' '}
          <em>cost of transport</em>: energy used ÷ (weight × distance). Rolling is cheap, walking costs more, slithering more still. Every kilogram you
          add costs energy on every metre. The numbers in the game are simplified, but the rules are the real ones, and the same design always gives the
          same result.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-[#EEF2F8]">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <h3 className="font-display text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-[#6E7888]">For {t.who}</p>
              <p className="mt-2 text-[#EEF2F8]">{t.what}</p>
              <p className="mt-2 text-[15px]">
                <span className="font-black text-[#EEF2F8]">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-black text-[#EEF2F8]">Why it matters</h2>
        <p className="mt-3">
          Robots are leaving tidy factory floors for collapsed buildings, pipes, forests, farms and the sea. Wheels are wonderful on flat ground and
          hopeless almost everywhere else. Each animal in the Robo Zoo is a ready-made answer to one of those places — and the hard part, which you
          practise at Legend, is choosing which answers one robot can afford to carry.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/zoo" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Explore the Robo Zoo world →
          </Link>
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'bio-bots', name: getGame('bio-bots')?.name ?? 'Bio-Bot Lab' }} />
      </article>
    </>
  )
}
