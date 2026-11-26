// app/kids/play/smart-farm/page.tsx — Smart Farm (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — the real agricultural robotics, how the
// game models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import SmartFarmClient from '@/components/kids/games/smart-farm/SmartFarmClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/smart-farm'

const TITLE = 'Smart Farm: Farm Robot Game for Kids (Soil Sensors, Drones, Picking Robots)'
const DESCRIPTION =
  'Run a farm with robots. Kids read soil-moisture sensors, set irrigation thresholds, plan a drone’s lawnmower survey with an NDVI camera, program a tomato-picking robot that light tries to fool, and balance harvest, water, energy and chemicals over a season — four tiers from age 7 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Smart Farm — grow more food with less water, using robots',
    description: 'Soil sensors, irrigation control, drone NDVI scouting, vision picking robots and a whole season to optimise. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Smart Farm agricultural robot game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Smart Farm',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 7–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Soil-moisture sensors and precision irrigation',
    'Thresholds and control rules',
    'Representative sensor placement',
    'Drone coverage paths (lawnmower / boustrophedon)',
    'NDVI vegetation index from near-infrared and red light',
    'Machine vision for ripeness, and white balance',
    'Trade-offs between yield, water, energy and chemicals',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Smart Farm', path: '/kids/worlds/farm' },
  { name: 'Smart Farm game', path: '/kids/play/smart-farm' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 7 and up',
    what: 'Twelve plants, three days. Every plant has a soil sensor. Water the ones whose sensor is below the orange line, then send the watering robot.',
    tip: 'Do not trust the leaves. A plant can look perfectly happy while its soil is already dry — leaves droop only when it is nearly too late. Water above the line just makes puddles.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'Place three soil sensors in a field with sandy soil, loam and clay, choose the threshold that opens each zone’s valve, then plan a drone survey to find insect damage on its NDVI map.',
    tip: 'Put one sensor in a typical spot of each zone — not in the tree’s shade, the leaky-pipe puddle or the hollow. For the drone, the lane spacing must not be wider than the strip the camera sees, and fewer, longer lanes save battery.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Program a tomato-picking robot: a redness threshold, an “unsure” band that sends borderline fruit to a person, and white balance. It picks three rows — in midday sun, orange sunset light and blue-grey shade.',
    tip: 'Orange light makes green tomatoes look red; shade makes ripe ones look dull. No single threshold fixes that. White balance does: the camera looks at a grey card, learns the colour of the light and divides it out. Then a small unsure band catches the noisy ones.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real farm-management problem',
    what: 'Plan a 40-day season: irrigation threshold and pulse size, forecast checking, sensor redundancy, drone scouting and weeding. Then live through storms, heatwaves, aphids and a stuck sensor. Meet four goals — harvest, water, energy and chemicals — and explain what cost you most.',
    tip: 'Sandy soil holds only 30 mm, so big pulses on a high threshold drain away. Drone flights are cheap; spotting aphids early saves a whole-field spray. Two sensors per zone catch a stuck one the same day.',
  },
]

export default function SmartFarmPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <SmartFarmClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <p className="text-sm font-bold uppercase tracking-wide text-lime-300">
          <Link href="/kids/worlds/farm" className="hover:underline">
            Smart Farm world
          </Link>{' '}
          · flagship game
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8]">Why farms need robots</h2>
        <p className="mt-3">
          Farms feed eight billion people, and farming uses about 70 % of all the fresh water people take from rivers, lakes and the ground. Water is
          running short in many regions, fertiliser and weed-killers can wash into rivers, and in many countries there are not enough people to do
          the hard work of weeding and picking. Robots help by doing the same jobs <strong className="text-[#EEF2F8]">more precisely</strong>:
          water only where the soil is dry, spray only the sick plants or the weeds, pick only the ripe fruit. This is called precision
          agriculture, and it is used on small market gardens and on enormous grain farms alike.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The real science inside the game</h2>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Soil as a sponge.</strong> Each kind of soil holds a different amount of water that roots can use: sand
          holds little and dries fast, clay holds a lot but drains slowly. Every day the crop drinks some (more in hot, sunny weather), rain adds
          some, and anything above “full” drains down past the roots and is wasted. The game uses this daily water balance, the same idea as the
          FAO-56 method that agronomists use, including its rule of thumb that many crops start to slow down once about half the usable water is
          gone.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Sensors and thresholds.</strong> A soil-moisture sensor measures how wet the soil is. An irrigation
          controller opens a valve when the reading falls below a threshold. Too low a threshold and plants get thirsty; too high, and water is
          poured on soil that is already nearly full. A sensor only tells you about the spot it is in, so where you put it matters as much as the
          threshold.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Drones and NDVI.</strong> Healthy leaves reflect a lot of near-infrared light, which our eyes cannot
          see, and absorb red light for photosynthesis. A drone camera measures both and calculates NDVI = (NIR − Red) ÷ (NIR + Red). Healthy crops
          score high (roughly 0.6–0.9), stressed crops lower, bare soil close to 0.1. Sick patches often show up on an NDVI map before a person
          walking the field would notice them. To photograph a whole field, drones fly a <em>lawnmower</em> (boustrophedon) path: straight lanes,
          back and forth. With a typical camera, the strip seen on the ground is about as wide as the drone is high.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">Vision for picking.</strong> As a tomato ripens, its green chlorophyll breaks down and red lycopene
          builds up. A picking robot can score ripeness from the ratio of red to green in its camera image. But the colour a camera records is the
          colour of the fruit multiplied by the colour of the light. Real robots correct for this with white balance, controlled lighting
          (flash), or by training on images taken in many lights.
        </p>
        <p className="mt-3">
          <strong className="text-[#EEF2F8]">What is simplified.</strong> One number stands for each zone’s soil water, weeds and pests follow
          simple growth rules, and the season is 40 days instead of a full growing season. The trade-offs are real: water versus harvest,
          energy versus chemicals, early detection versus late, blanket treatment.
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
          Self-driving tractors steer with satellite positioning corrected to within a few centimetres (RTK GPS), so they can drive the same rows
          season after season. Camera-guided sprayers such as John Deere’s See &amp; Spray look for weeds and spray only those, cutting herbicide use
          sharply. Weeding robots such as Naïo’s Oz and the solar-powered FarmDroid remove weeds without chemicals, and Carbon Robotics’ LaserWeeder
          burns them with lasers. Drones scout and spray rice, tea and cotton fields across Asia, and in dairies from New Zealand to the Netherlands
          cows walk into milking robots whenever they choose. Picking robots for strawberries, apples and tomatoes are still being improved —
          judging ripeness under changing outdoor light is one of the hard problems you just solved.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/farm" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Explore the Smart Farm world →
          </Link>
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
      </article>
    </>
  )
}
