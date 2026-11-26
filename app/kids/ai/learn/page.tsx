// app/kids/ai/learn/page.tsx — Learning Robot: reinforcement learning (server component).

import type { Metadata } from 'next'
import { jsonldScript } from '@/lib/seo/jsonld'
import { LearnLab } from '@/components/kids/ai/think/ThinkLabsClient'
import { KIDS_BASE, LabHeader, labJsonLd, MoreLabs } from '@/components/kids/ai/think/ThinkPageParts'

const PAGE_URL = `${KIDS_BASE}/kids/ai/learn`
const TITLE = 'Reinforcement Learning for Kids: A Robot That Learns'
const DESCRIPTION =
  'A robot learns to reach its goal by trial and error with real Q-learning: see every reward, its Q-value map, a curiosity (epsilon) slider and the reward of every try. Legends teach a two-legged walker to walk. Ages 5–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Learning Robot — learning by trial and error',
    description: 'Rewards, curiosity and a growing map: watch reinforcement learning happen, step by step.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Learning Robot' }],
  },
}

const ld = labJsonLd({
  name: 'Learning Robot: reinforcement learning',
  description: DESCRIPTION,
  url: PAGE_URL,
  crumb: 'Learning Robot',
  teaches: ['Reinforcement learning', 'Rewards', 'Q-learning', 'Exploration vs exploitation (epsilon-greedy)', 'Discount factor', 'Policy search'],
})

export default function LearnPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <LabHeader title="Learning Robot: learning by trial and error" lead="Nobody tells this robot the way. It tries, gets rewards, and slowly builds its own map of what works." />
      <LearnLab />
      <article className="mx-auto mt-6 max-w-3xl space-y-4 px-4 pb-8 text-[17px] text-slate-200">
        <h2 className="font-display text-2xl font-bold text-white">Learning from rewards</h2>
        <p>
          This is <strong>reinforcement learning</strong>: the robot is never shown the answer. It only gets a <strong>reward</strong> after each move — +30
          for the battery cookie, −1 for every step, −2 for bumping a wall, −30 for lava. At first it wanders. Over many tries it learns which moves lead to
          more reward in the end, and the wandering turns into a short, confident path.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">The robot’s map: Q-values</h2>
        <p>
          The robot keeps a table with one number for every square and every move, called a <strong>Q-value</strong>: how much reward it expects if it makes
          that move and then plays well. After each move it updates one number with the rule Q ← Q + α·(reward + γ·best Q of the next square − Q). This is{' '}
          <strong>Q-learning</strong>, published by Chris Watkins in 1989. The coloured squares show the best Q-value of each square — brighter orange means
          closer to the cookie — and the arrows show the move it now thinks is best. Tap any square to see all four numbers.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">Curiosity, patience and an icy floor</h2>
        <p>
          The <strong>curiosity</strong> slider (ε, epsilon) is how often the robot tries a random move instead of its best one. Too little and it can get
          stuck with its first idea; too much and it never uses what it learned — engineers call this the exploration–exploitation trade-off. Older learners
          also set the learning rate (α) and the patience (γ, how much future rewards count), and switch on an icy floor where moves sometimes slip, so the
          robot must learn what is best <em>on average</em>.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">Legend: a walker learns to walk</h2>
        <p>
          The Legend level adds a two-legged walker whose “policy” is five numbers that shape its stride. It changes them a little at random, tests each
          version for eight seconds, and keeps only changes that walk further — a simple form of <strong>policy search</strong>, the family of methods real
          legged robots use, with full physics and millions of tries in simulation.
        </p>
        <p>
          Missions for ages 5 to 17 earn XP and the Map Maker badge. It all runs on your device, with no account and no upload.
        </p>
      </article>
      <MoreLabs current="learn" />
    </>
  )
}
