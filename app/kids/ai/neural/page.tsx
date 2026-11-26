// app/kids/ai/neural/page.tsx — Neural Playground (server component).
// The lab trains a real neural network on the child's device; this page adds
// the explanation a parent, teacher or search engine needs as server HTML.

import type { Metadata } from 'next'
import { jsonldScript } from '@/lib/seo/jsonld'
import { NeuralLab } from '@/components/kids/ai/think/ThinkLabsClient'
import { KIDS_BASE, LabHeader, labJsonLd, MoreLabs } from '@/components/kids/ai/think/ThinkPageParts'

const PAGE_URL = `${KIDS_BASE}/kids/ai/neural`
const TITLE = 'Neural Network Playground for Kids: Train a Robot Brain'
const DESCRIPTION =
  'Kids place dots, then watch a real neural network learn to sort them in the browser: draw a perceptron line by hand, then add hidden layers to solve XOR, circles and spirals. Ages 5–17, nothing uploaded.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Neural Playground — train a robot brain',
    description: 'Draw the line yourself, then watch neurons and weights learn live on your own device.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Neural Playground' }],
  },
}

const ld = labJsonLd({
  name: 'Neural Playground: train a robot brain',
  description: DESCRIPTION,
  url: PAGE_URL,
  crumb: 'Neural Playground',
  teaches: ['Perceptron', 'Decision boundary', 'Hidden layers and XOR', 'Loss and gradient descent', 'Learning rate', 'Feature engineering'],
})

export default function NeuralPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <LabHeader title="Neural Playground: train a robot brain" lead="Put orange and blue dots on the board. Then teach a robot brain to tell them apart — first by hand, then by watching it learn." />
      <NeuralLab />
      <article className="mx-auto mt-6 max-w-3xl space-y-4 px-4 pb-8 text-[17px] text-slate-200">
        <h2 className="font-display text-2xl font-bold text-white">What a neural network does</h2>
        <p>
          A neural network is a robot brain made of tiny calculators called <strong>neurons</strong>. Each neuron multiplies its inputs by numbers called{' '}
          <strong>weights</strong>, adds them up, and passes the answer on. In this playground the inputs are where a dot sits on the board (x and y), and the
          last neuron answers one question: is this spot orange or blue? The shading on the board is that answer for every spot at once — the{' '}
          <strong>decision boundary</strong> is where the colours meet.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">From one line to many</h2>
        <p>
          A single neuron can only draw one straight line. You can be that neuron: turn and slide the line until each colour is on its own side. Then let the
          robot do it with the <strong>perceptron rule</strong> Frank Rosenblatt published in 1958 — find one dot it got wrong and tip the line towards fixing
          it, again and again. Some puzzles, like the checkerboard called XOR, cannot be split by any single straight line. Add a <strong>hidden layer</strong>{' '}
          and each hidden neuron draws its own line; the output neuron combines them into curves, rings and even spirals.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">How it learns</h2>
        <p>
          The <strong>loss</strong> measures how wrong the network is on all the dots. Each training step nudges every weight a tiny amount in the direction
          that makes the loss smaller — this is <strong>gradient descent</strong>, worked out by <strong>backpropagation</strong>. The learning rate sets the
          size of each nudge: too small and it crawls, too big and it jumps about. It is the same idea, at a much larger scale, behind the networks that let
          robots see and chatbots write.
        </p>
        <h2 className="font-display text-2xl font-bold text-white">Missions for every age</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Cadet (5–7): draw the line, place your own dots, and let the robot fix its mistakes.</li>
          <li>Pilot (8–10): train one neuron, then discover why it gets stuck on XOR.</li>
          <li>Ace (11–13): solve XOR with a hidden layer and fence in a circle with three neurons.</li>
          <li>Legend (14–17): untangle the spirals with a deep network, and replace a hidden layer with better inputs (feature engineering).</li>
        </ul>
        <p>
          Everything runs on your own device: no account, no upload, and it keeps working without the internet once loaded. Missions earn XP and the Robot
          Teacher badge.
        </p>
      </article>
      <MoreLabs current="neural" />
    </>
  )
}
