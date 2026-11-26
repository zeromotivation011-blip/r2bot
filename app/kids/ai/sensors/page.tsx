// app/kids/ai/sensors/page.tsx — Robot Senses (server component).

import type { Metadata } from 'next'
import { jsonldScript } from '@/lib/seo/jsonld'
import { SensesLab } from '@/components/kids/ai/think/ThinkLabsClient'
import { KIDS_BASE, LabHeader, labJsonLd, MoreLabs } from '@/components/kids/ai/think/ThinkPageParts'

const PAGE_URL = `${KIDS_BASE}/kids/ai/sensors`
const TITLE = 'Robot Sensors for Kids: Camera, Lidar and Ultrasonic'
const DESCRIPTION =
  'See one room the way a robot does: camera, depth camera, spinning lidar, ultrasonic cone and line sensor side by side, with lights and noise sliders and “find the obstacle” missions. Ages 5–17, runs on your device.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot Senses — see the world as a robot does',
    description: 'Compare five robot sensors in one room. Turn the lights off, add glass and noise, and find the hidden obstacle.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot Senses' }],
  },
}

const ld = labJsonLd({
  name: 'Robot Senses: see the world as a robot does',
  description: DESCRIPTION,
  url: PAGE_URL,
  crumb: 'Robot Senses',
  teaches: ['Cameras', 'Depth cameras', '2-D lidar', 'Ultrasonic ranging', 'Line sensors', 'Sensor noise', 'Sensor fusion'],
})

export default function SensorsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <LabHeader title="Robot Senses: see the world as a robot does" lead="Drive a robot round a room and watch five sensors at once. Each one sees something the others miss." />
      <SensesLab />
      <article className="mx-auto mt-6 max-w-3xl space-y-4 px-4 pb-8 text-[17px] text-slate-200">
        <h2 className="font-display text-2xl font-bold text-white">Five ways to sense one room</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Camera</strong> — a grid of coloured dots, just like a phone camera. Rich in colour and detail, but it needs light, and clear glass is almost
            invisible to it.
          </li>
          <li>
            <strong>Depth camera</strong> — sends out its own infrared light and measures how far away each dot is. It works in the dark, but infrared passes
            through clear glass, and its readings get noisier the further away things are.
          </li>
          <li>
            <strong>2-D lidar</strong> — a laser that spins and measures hundreds of distances every turn, all in one flat slice 20 cm above the floor. Very
            accurate — but anything lower than its beam, like a small step, slips underneath.
          </li>
          <li>
            <strong>Ultrasonic sensor</strong> — a click of sound and a stopwatch. Sound travels about 343 metres per second, so distance = time × 343 ÷ 2
            (there and back). It hears glass, but its cone is wide, and soft things like a sofa swallow the echo.
          </li>
          <li>
            <strong>Line sensor</strong> — five small infrared eyes pointing at the floor. Black tape reflects less light than the floor, so a line-following
            robot steers to keep the dark reading under its middle eye.
          </li>
        </ul>
        <h2 className="font-display text-2xl font-bold text-white">Find the obstacle</h2>
        <p>
          Missions switch the lights off, add a glass door or a low step, hide a box that only the sensors can find, and turn up the noise. Younger children
          learn which sensor is blind when; older ones learn to average noisy lidar spins into a clean map (the idea behind SLAM) and to pick the pair of
          sensors that covers each other’s blind spots — <strong>sensor fusion</strong>, which every self-driving car and robot vacuum relies on.
        </p>
        <p>
          The room is drawn by one simple ray-caster on your own device, so every view agrees about the same room. No account, no upload, and it works offline
          once loaded. Missions earn XP and the Map Maker badge.
        </p>
      </article>
      <MoreLabs current="sensors" />
    </>
  )
}
