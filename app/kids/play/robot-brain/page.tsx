// app/kids/play/robot-brain/page.tsx — Train the Robot Brain (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — what machine learning really is, how the
// game models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import RobotBrainClient from '@/components/kids/games/robot-brain/RobotBrainClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/robot-brain`

const TITLE = 'Train the Robot Brain: Machine Learning Game for Kids'
const DESCRIPTION =
  'Kids teach a sorting robot to read hand-drawn symbols with their own examples. A real k-nearest-neighbours classifier runs live: confidence bars, nearest examples, accuracy on unseen data, biased data, confusion matrices and overfitting — four tiers from age 8 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Train the Robot Brain — machine learning with your own drawings',
    description: 'Teach a robot by example, test it on drawings it has never seen, and fix biased data. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT AI Academy: Train the Robot Brain' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Train the Robot Brain',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Supervised learning from labelled examples',
    'Features and feature engineering',
    'k-nearest-neighbours classification',
    'Training, validation and test sets',
    'Biased and mislabelled training data',
    'Confusion matrices and accuracy',
    'Overfitting and data augmentation',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Train the Robot Brain', path: '/kids/play/robot-brain' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up, with a grown-up if needed',
    what: 'Teach Sorta two labels, ← and →. Draw three of each, then watch eight parcels ride the belt. Six correct wins.',
    tip: 'Make the arrow head big and clear: it is the only thing that tells left from right. Watch the live bars while you draw — if they wobble between ← and →, your examples are too alike.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'Three labels: ←, → and ○. The twelve test parcels were drawn by other people, so the score is real accuracy on unseen data. Reach 75%.',
    tip: 'Draw each label a few different ways: big and small, neat and quick, starting from different ends. A brain that has seen variety copes with strangers’ handwriting.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'A hurried intern trained the robot: nine ←, seven ✕ and only one tiny →, plus a few labels that are simply wrong. Run it, read the confusion matrix, then fix the data until it scores 85%.',
    tip: 'Look at the bars beside each label: are they fair? Tap every drawing in a crowded row and ask “does this match its label?” Delete or relabel the ones that don’t, then add → examples.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real data-science challenge',
    what: 'Four labels. Choose the representation (raw pixels or engineered features) and k, clean a factory dataset, add your own drawings, augment them, and check on a validation set. Then pass a one-shot final exam on 24 unseen drawings that are tilted, resized, moved and smudged.',
    tip: 'Never trust training accuracy: with k = 1 it is always 100%. Use the validation set to compare designs in the experiment log, change one thing at a time, and only take the exam when validation is comfortably above the target.',
  },
]

export default function RobotBrainPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <RobotBrainClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-gray-200">
        <h2 className="text-3xl font-black text-white">How a robot learns from examples</h2>
        <p className="mt-3 text-white/80">
          Most robot “intelligence” is not written as rules. Nobody types out every possible way a person might draw an arrow. Instead, engineers
          collect <strong>examples</strong> — drawings, photos or sounds — and give each one a <strong>label</strong> that says what it is. A
          learning algorithm then finds a way to put the right label on new examples it has never seen. This is called{' '}
          <strong>supervised learning</strong>, and it is how warehouse robots read labels, how self-driving cars recognise traffic signs and how
          your phone recognises your face.
        </p>
        <p className="mt-3 text-white/80">
          A computer cannot look at a drawing the way you do. It needs numbers. Turning a drawing into numbers is called choosing{' '}
          <strong>features</strong>. The simplest features are raw pixels: lay a grid over the picture and record how much ink is in each square.
          Better features are <em>engineered</em>: first find where the drawing is and how big it is, centre it and resize it, then count which
          directions the lines go. Engineered features ignore things that do not matter (where you drew, how big) and keep what does (the shape).
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">k-nearest-neighbours: the brain inside the game</h2>
        <p className="mt-3 text-white/80">
          The game uses a real classifier called <strong>k-nearest-neighbours</strong> (k-NN), built from scratch in the page — no ready-made AI
          service. When you draw, the robot turns your drawing into features, measures the distance to every example it has been taught, and picks
          the <em>k</em> closest. Those neighbours vote, and closer neighbours get louder votes. The share of the vote becomes the confidence bars
          you see. Because k-NN keeps every example, the game can show you exactly which of your drawings it was “thinking of”.
        </p>
        <p className="mt-3 text-white/80">
          Choosing k matters. With <strong>k = 1</strong> the robot copies its single closest example, so one wrongly labelled drawing can fool it.
          A larger k lets several examples vote and outvote a mistake — but if k is too big, a label with few examples is always outvoted by the
          crowd. Real data scientists test different values of k on a <strong>validation set</strong> and keep the one that works best on data the
          model has not trained on.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">Good data beats clever code</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-white/80">
          <li>
            <strong>Held-out test data.</strong> A model must be scored on examples it never saw while learning. That is why the test parcels are
            drawn by the game, not by you, and are the same every time you play a tier — so your score is fair and depends only on your teaching.
          </li>
          <li>
            <strong>Biased data.</strong> If one label has far fewer examples, or if some examples carry the wrong label, the model learns the bias.
            Real AI systems have failed this way, for example by working worse for people who were missing from their training photos.
          </li>
          <li>
            <strong>The confusion matrix.</strong> A table with what each example really was in the rows and what the robot said in the columns.
            Numbers on the diagonal are correct; anything off the diagonal shows exactly which labels get mixed up.
          </li>
          <li>
            <strong>Overfitting.</strong> A model that memorises its training data scores perfectly on that data and badly on anything new. With
            k = 1 every training example is its own nearest neighbour, so training accuracy is always 100% — a number that tells you nothing.
            Variety in the data, <strong>data augmentation</strong> (adding tilted, moved and resized copies) and better features all help a model
            generalise.
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">For {t.who}</p>
              <p className="mt-2 text-white/80">{t.what}</p>
              <p className="mt-2 text-sm text-white/75">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-black text-white">Where you will see this in real life</h2>
        <p className="mt-3 text-white/80">
          Parcel-sorting robots read addresses and barcodes, farm robots tell crops from weeds, and robot vacuums learn to spot socks and cables.
          Today’s big neural networks are far more powerful than k-NN, but they share the same rules you practised here: they learn only from the
          examples they are given, they must be tested on data they have never seen, and biased or wrongly labelled data makes them confidently
          wrong. Nothing you draw leaves your device — the whole brain runs inside your browser.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
      </article>
    </>
  )
}
