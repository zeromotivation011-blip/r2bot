// app/kids/ai/talk/page.tsx — Talk to Your Robot (server component)
// The app screen (TalkClient) is a client island; the teaching text a parent,
// teacher or search engine needs is rendered here on the server. The parser
// runs on the device; the physics stage and the block editor load lazily.

import type { Metadata } from 'next'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import TalkClient from '@/components/kids/ai/talk/TalkClient'
import { KIDS_STANDALONE } from '@/lib/kids/app-context'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/ai/talk`

const TITLE = 'Talk to Your Robot: How Robots Turn Words into Programs (Kids, 5–17)'
const DESCRIPTION =
  'Kids say or type what a robot should do, see how it splits the words into actions, numbers and sensor conditions, answer its questions when the words are vague, then run the blocks on their own robot in a real-physics arena. 24 missions for ages 5 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Talk to Your Robot — words in, robot program out',
    description: 'See how a robot parses language, where words are too vague, and debug the plan in a physics simulator.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids: Talk to Your Robot' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Talk to Your Robot',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Natural-language commands for robots', 'Ambiguity and clarifying questions', 'Sensor conditions (until, if)', 'Loops', 'Debugging a program'],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Talk to Your Robot', path: '/kids/ai/talk' },
])

export default function TalkPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <header className="mx-auto max-w-7xl px-3 pb-3 pt-4 sm:px-4 sm:pt-6">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · AI Lab</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-4xl">Talk to your robot</h1>
        <p className="mt-1 max-w-3xl text-[17px] text-slate-300">Say what it should do. Watch how it understands you — then make it work.</p>
      </header>

      <TalkClient />

      <article className="mx-auto max-w-3xl px-4 pb-16 text-[17px] leading-relaxed text-slate-300">
        <h2 className="font-display text-2xl font-bold text-white">How does a robot understand words?</h2>
        <p className="mt-3">
          When you tell a friend “go to the door and grab the box”, they fill in everything you left out. A robot cannot. Before it can move, a robot has to turn
          your sentence into exact instructions: which motor, how fast, for how long, and when to stop. Engineers call this <strong className="text-white">parsing</strong>.
        </p>
        <p className="mt-3">
          This lab shows every step. First the sentence is split into pieces at words like “then” and “and”. Each word is tagged: an <em>action</em> (drive, turn,
          grab), a <em>direction</em> (left, right, backwards), a <em>number</em> and its <em>unit</em> (30 cm, 2 seconds, 90 degrees) or a <em>condition</em> a
          sensor can check (“until the wall is close”, “when you see red”). The tags become an intent — MOVE forward 30 cm — and the intent becomes blocks your
          robot really runs, in a physics arena where wheels can slip and a fast robot rolls on after it stops.
        </p>
        <h2 className="mt-8 font-display text-2xl font-bold text-white">Where words are not enough</h2>
        <p className="mt-3">
          “Turn” — left or right? How far is “a bit”? Does “drive back” mean reverse, or drive forwards after a U-turn? Instead of guessing silently, the robot
          asks, or writes down the guess it made, so you can see exactly where ambiguity comes from. “Close” has to become a number of centimetres. “Pick up the
          red box” only works if the robot drives up to the box first — its claw cannot find things by name.
        </p>
        <h2 className="mt-8 font-display text-2xl font-bold text-white">Missions for every age</h2>
        <p className="mt-3">
          There are 24 missions, six for each age band. Explorers (5–7) learn that order and distance matter. Builders (8–10) use loops, colour sensors and a
          claw. Inventors (11–13) chain sensor steps through a maze and write rules that check again and again. Engineers (14–17) work out star angles,
          beat momentum when parking and follow a line with proportional steering. “Fix it” missions start with someone else’s plan that fails: find the
          word that is wrong.
        </p>
        {KIDS_STANDALONE ? (
          <p className="mt-3">
            The robot’s language brain runs inside the app, with no internet, and nothing a child types leaves the device or is saved. There is no
            microphone and no AI helper in the app. Every plan is checked block by block before the robot will run it, and the robot only says kind words.
          </p>
        ) : (
          <p className="mt-3">
            The robot’s language brain runs on the device, even offline, and R2BOT saves nothing a child types. The optional microphone uses the
            browser’s own speech service, which may send the recording to that company (Google, in Chrome and on Android) to turn it into words. Where it is
            switched on, an optional AI helper can try a phrase the robot’s own brain does not know: only the words it did not understand are sent, only when
            the child presses the button, and never anything that looks like a name, address, email or phone number. R2BOT stores none of it, though the AI
            provider may keep requests for a short time for safety checks. Every answer is checked block by block before the robot will run it, and the
            robot only says kind words.
          </p>
        )}
      </article>
    </>
  )
}
