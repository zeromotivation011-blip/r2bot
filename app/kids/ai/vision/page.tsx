// app/kids/ai/vision/page.tsx — Vision Lab: teach your robot to see (server component).
// The lab itself is a client component that runs entirely on the device: the
// camera (only after a tap), the feature extraction, k-NN and a tiny neural
// network written from scratch. No AI API, no upload — it costs nothing to run
// and works offline once loaded. This page renders the explanation a parent,
// teacher or search engine needs as real server HTML.

import type { Metadata } from 'next'
import { jsonldScript } from '@/lib/seo/jsonld'
import VisionLabClient from '@/components/kids/ai/vision/VisionLabClient'

export const runtime = 'nodejs'

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/ai/vision`

const TITLE = 'Vision Lab for Kids: Teach a Robot to See with Machine Learning'
const DESCRIPTION =
  'Kids teach their own robot to recognise hand signs and objects, then watch it obey. A real image classifier (nearest neighbours and a tiny neural network) trains live in the browser — nothing is uploaded.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Vision Lab — teach your robot to see',
    description: 'Show examples, train a robot brain on your own device, and watch your robot obey what it sees.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Vision Lab' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Vision Lab: teach your robot to see',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Image classification', 'Training data and bias', 'k-nearest neighbours', 'Neural networks and loss', 'Confidence thresholds'],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

export default function VisionLabPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <p className="text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · AI Lab</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">Vision Lab: teach your robot to see</h1>
        <p className="mt-2 max-w-3xl text-slate-200">Show your robot examples, watch it learn on your own device, and it obeys what it sees.</p>
      </header>

      <VisionLabClient />

      <article className="mx-auto max-w-3xl space-y-4 px-4 pb-24 text-slate-200">
        <h2 className="font-display text-2xl font-bold text-white">What you do</h2>
        <p>
          Make two to four classes — thumbs up, open hand, a red ball, nothing — and show your robot examples with your camera or the built-in sample pictures.
          A robot brain learns them right here on your device, and your own robot drives, stops, spins or follows the ball when it recognises what it sees.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">How a robot learns to see</h2>
        <p>
          A camera gives a robot a grid of coloured dots, not a “hand”. The Vision Lab shrinks each picture to 32 × 32 dots and turns it into numbers: a 16 × 16
          map of what stands out from the background (the shape), a count of how much of each colour there is, and where the edges are and which way they point.
          Those numbers are called features, and they are all the robot ever learns from.
        </p>
        <p>
          The first brain is <strong>k-nearest neighbours</strong>: it keeps every example and, for a new picture, lets the most similar examples vote. From the
          Ace level you can also train a small <strong>neural network</strong> and watch its loss — how wrong it is — fall with each pass over the data.
          Engineers can add a hidden layer, change the learning rate, and switch feature groups off to see which ones do the work.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">Five lessons real engineers learn</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>More, varied examples beat a few perfect ones.</li>
          <li>Change the lighting and a model trained in one room can fail — so teach it in bright and dim light.</li>
          <li>If one class has too few examples, the robot is biased against it.</li>
          <li>A confidence threshold lets a robot stop when it is unsure instead of guessing.</li>
          <li>A “nothing” class stops it seeing signs that are not there.</li>
        </ul>
        <h2 className="font-display text-2xl font-bold text-white">Private by design</h2>
        <p>
          The camera is only switched on after you tap and read why. Pictures never leave the device, are never saved, and are forgotten when you leave the
          page; the camera turns off as soon as you switch away. No account or personal details are needed. Missions for every age band — Cadet (5–7), Pilot
          (8–10), Ace (11–13) and Legend (14–17) — earn XP and the Robot Teacher badge.
        </p>
      </article>
    </>
  )
}
