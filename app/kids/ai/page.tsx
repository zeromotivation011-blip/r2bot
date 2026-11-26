// app/kids/ai/page.tsx — R2BOT Kids AI Academy hub (server component).
// Explains, at a child's level, what AI is inside a robot, how chatbots work
// and how to use AI safely, and links every AI activity in R2BOT Kids. The
// only client code is the Ask Spark button (it opens its own Spark sheet).

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { AskSparkButton } from '@/components/kids/ai/think/ThinkLabsClient'
import { KIDS_BASE } from '@/components/kids/ai/think/ThinkPageParts'

const PAGE_URL = `${KIDS_BASE}/kids/ai`
const TITLE = 'AI for Kids: How Robots Think — R2BOT Kids AI Academy'
const DESCRIPTION =
  'How do robots think? Kids aged 5–17 train a neural network, watch a robot learn by trial and error, see through robot sensors, teach a robot to see and talk to their own robot — plus how chatbots work and how to use AI safely.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'AI Academy — how robots think',
    description: 'Hands-on AI labs for kids: neural networks, learning robots, robot senses, vision and talking to robots.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids AI Academy' }],
  },
}

interface Card {
  href: string
  title: string
  line: string
  tag: string
  gradient: string
}

const LABS: Card[] = [
  { href: '/kids/ai/neural', title: 'Neural Playground', line: 'Place dots and watch a tiny brain learn to sort them — from one line to spirals.', tag: 'Neural networks', gradient: 'from-orange-400 to-rose-600' },
  { href: '/kids/ai/learn', title: 'Learning Robot', line: 'A robot learns the way to its goal by trial, error and rewards.', tag: 'Reinforcement learning', gradient: 'from-emerald-400 to-teal-700' },
  { href: '/kids/ai/sensors', title: 'Robot Senses', line: 'Camera, depth, lidar, ultrasonic and line sensors — side by side.', tag: 'Perception', gradient: 'from-cyan-400 to-sky-700' },
  { href: '/kids/ai/vision', title: 'Vision Lab', line: 'Teach your robot to recognise hand signs and objects with your camera.', tag: 'Machine vision', gradient: 'from-sky-400 to-blue-700' },
  { href: '/kids/ai/talk', title: 'Talk to your robot', line: 'Give orders in plain words and see how a robot turns them into a program.', tag: 'Language', gradient: 'from-amber-300 to-orange-600' },
]

const MORE: Card[] = [
  { href: '/kids/play/robot-brain', title: 'Robot Brain', line: 'A game about training a robot brain with examples.', tag: 'Game', gradient: 'from-rose-400 to-red-700' },
  { href: '/kids/play/maze-mapper', title: 'Maze Mapper', line: 'Help a robot map a maze it has never seen and plan the way out.', tag: 'Game', gradient: 'from-lime-400 to-green-700' },
  { href: '/kids/galaxy/ai', title: 'AI & Maps track', line: 'Every AI and mapping mission in the Skill Galaxy, by age.', tag: 'Skill Galaxy', gradient: 'from-yellow-300 to-amber-600' },
  { href: '/kids/worlds/guardians', title: 'Robot Guardians', line: 'Keep robots safe, fair and kind with the Robot Harm Check.', tag: 'AI safety', gradient: 'from-emerald-400 to-teal-700' },
]

const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      name: 'R2BOT Kids AI Academy: how robots think',
      description: DESCRIPTION,
      url: PAGE_URL,
      inLanguage: 'en',
      isAccessibleForFree: true,
      audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
      about: ['Artificial intelligence', 'Machine learning', 'Neural networks', 'Reinforcement learning', 'Robot sensors', 'Large language models', 'AI safety'],
      hasPart: [...LABS, ...MORE].map((c) => ({ '@type': 'LearningResource', name: c.title, url: `${KIDS_BASE}${c.href}`, description: c.line })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${KIDS_BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'AI Academy', item: PAGE_URL },
      ],
    },
  ],
}

function CardLink({ c }: { c: Card }) {
  return (
    <li>
      <Link
        href={c.href}
        className="group flex h-full min-h-[96px] gap-3 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/20 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
      >
        <span aria-hidden className={`h-auto w-2 flex-none rounded-full bg-gradient-to-b ${c.gradient}`} />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wide text-amber-300">{c.tag}</span>
          <span className="block font-display text-lg font-bold text-white">{c.title}</span>
          <span className="block text-[15px] text-slate-300">{c.line}</span>
        </span>
      </Link>
    </li>
  )
}

export default function KidsAiHubPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <header className="mx-auto max-w-6xl px-4 pb-2 pt-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center text-sm font-bold uppercase tracking-wider text-amber-300">
          <Link href="/kids" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            R2BOT Kids
          </Link>
          <span aria-hidden className="mx-1.5 text-slate-500">
            /
          </span>
          AI Academy
        </nav>
        <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">How robots think</h1>
        <p className="mt-2 max-w-3xl text-[17px] text-slate-200">
          Robots do not think like you — but they can learn. Try the labs below. Neural Playground, Learning Robot and Robot Senses run entirely on your own device. Questions you ask Spark go to R2BOT’s server to be answered and are not saved.
        </p>
      </header>

      <section aria-labelledby="labs" className="mx-auto max-w-6xl px-4 pt-3">
        <h2 id="labs" className="sr-only">
          AI labs
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LABS.map((c) => (
            <CardLink key={c.href} c={c} />
          ))}
          <li className="flex min-h-[96px] flex-col justify-between gap-2 rounded-[20px] border border-amber-400/40 bg-amber-500/[0.08] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <span>
              <span className="block text-xs font-bold uppercase tracking-wide text-amber-300">Your AI helper</span>
              <span className="block font-display text-lg font-bold text-white">Ask Spark</span>
              <span className="block text-[15px] text-slate-300">Stuck, or curious? Spark answers robot questions and gives hints, never the whole answer.</span>
            </span>
            <AskSparkButton />
          </li>
        </ul>
      </section>

      <article className="mx-auto mt-8 max-w-3xl space-y-4 px-4 text-[17px] text-slate-200">
        <h2 className="font-display text-2xl font-bold text-white">What is AI in a robot?</h2>
        <p>
          Every robot runs a loop: <strong>sense</strong> the world, <strong>think</strong> about what to do, <strong>act</strong> with motors — then sense
          again. For a long time the “think” part was rules a person wrote by hand: <em>if the wall is closer than 20 cm, turn right</em>. Rules work well
          when the world is simple. But nobody can write a rule for every face, every voice or every messy room.
        </p>
        <p>
          <strong>Artificial intelligence (AI)</strong> is the name for programs that do things we would call clever, and most AI today is{' '}
          <strong>machine learning</strong>: instead of writing the rules, people give the computer lots of examples and let it find the patterns itself.
          Show a robot thousands of pictures labelled “cat” and it learns what cats tend to look like. Reward a robot every time it reaches its charger and it
          learns the way there. A robot vacuum uses AI to map your home; a self-driving car uses it to spot people and bikes; a warehouse arm uses it to pick
          up a box it has never seen before.
        </p>

        <h2 className="font-display text-2xl font-bold text-white">Three ways machines learn</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Learning from examples</strong> (supervised learning): you give the answers, it learns the pattern. Try it in the{' '}
            <Link href="/kids/ai/neural" className="font-semibold text-amber-300 underline underline-offset-4">
              Neural Playground
            </Link>{' '}
            and the{' '}
            <Link href="/kids/ai/vision" className="font-semibold text-amber-300 underline underline-offset-4">
              Vision Lab
            </Link>
            .
          </li>
          <li>
            <strong>Learning from rewards</strong> (reinforcement learning): no answers, just a score for doing well. Watch it in the{' '}
            <Link href="/kids/ai/learn" className="font-semibold text-amber-300 underline underline-offset-4">
              Learning Robot
            </Link>
            .
          </li>
          <li>
            <strong>Learning from senses</strong>: all of it starts with data from sensors, and every sensor has blind spots. See them in{' '}
            <Link href="/kids/ai/sensors" className="font-semibold text-amber-300 underline underline-offset-4">
              Robot Senses
            </Link>
            .
          </li>
        </ul>

        <h2 className="font-display text-2xl font-bold text-white">How do chatbots work?</h2>
        <p>
          Chatbots such as ChatGPT, Gemini and Claude are built on <strong>large language models</strong>. A language model has read an enormous amount of
          text and learned one main skill: <strong>predicting the next word</strong>. Given “The robot picked up the…”, it has seen enough sentences to guess
          that “box” is more likely than “ocean”. It writes a whole answer by guessing one word (or piece of a word) at a time, again and again, very fast.
        </p>
        <p>
          That is why chatbots can sound so clever — and why they <strong>can be wrong</strong>. They produce what sounds likely from the patterns in their
          text, which is not the same as checking a fact. A chatbot can say something untrue in a very confident voice. Good habits: check important answers
          in another source, ask a grown-up when it matters, and never share your name, address, school or photos with any chatbot.
        </p>

        <h2 className="font-display text-2xl font-bold text-white">Keeping AI safe and fair</h2>
        <p>
          An AI only knows what its examples taught it. If the examples are unfair or missing people, the AI will be unfair too — engineers call this{' '}
          <strong>bias</strong>. Robots that move can also hurt people, so real robots have emergency stops, speed limits near people and a human in charge of
          big decisions. Learn the six-question Robot Harm Check in the{' '}
          <Link href="/kids/worlds/guardians" className="font-semibold text-amber-300 underline underline-offset-4">
            Robot Guardians
          </Link>{' '}
          world.
        </p>
        <p className="text-slate-300">
          Every lab has missions for four levels — Cadet (ages 5–7), Pilot (8–10), Ace (11–13) and Legend (14–17) — that earn XP and badges such as Robot
          Teacher and Map Maker. No account, email or personal details are needed.
        </p>
      </article>

      <section aria-labelledby="more" className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        <h2 id="more" className="font-display text-2xl font-bold text-white">
          More AI to play
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MORE.map((c) => (
            <CardLink key={c.href} c={c} />
          ))}
        </ul>
      </section>
    </>
  )
}
