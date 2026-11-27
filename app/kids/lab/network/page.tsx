// app/kids/lab/network/page.tsx — Link Lab (roadmap #88), server component.
// Connected robots: drive a rover over a slow, lossy, jumbled or broken radio
// link and fix it the way engineers do (acks and retries, sequence numbers,
// a watchdog stop). The teaching text is rendered here on the server; the
// lab itself is a light client island (2D canvas, no heavy libraries).

import type { Metadata } from 'next'
import Link from 'next/link'
import LinkLabClient from '@/components/kids/net/LinkLabClient'
import { PresentButton } from '@/components/kids/present/PresentButton'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { getActivity } from '@/lib/kids/activities/content'
import { NET_ACTIVITY_IDS } from '@/components/kids/net/net-activities'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/lab/network`

const TITLE = 'Robot Link Lab for Kids: Latency, Packet Loss and Safe Teleoperation'
const DESCRIPTION =
  'Drive a robot over a slow, lossy radio link and watch delay and dropped messages break it, then fix it like an engineer: acknowledgements and retries, sequence numbers and a watchdog stop. Ages 11–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Link Lab: keep a robot safe when the radio fails',
    description: 'Latency, packet loss, jitter and radio shadows, and the fixes real robots use.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Link Lab' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'R2BOT Link Lab',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 11–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Teleoperation and why delay makes robots overshoot',
    'Packet loss, acknowledgements and retries',
    'Jitter, out-of-order messages and sequence numbers',
    'Watchdog (deadman) timeouts that stop a robot when its link fails',
    'Reliable and best-effort messaging in ROS 2',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Link Lab', path: '/kids/lab/network' },
])

export default function LinkLabPage() {
  // Only link the Galaxy activities that are live (registered in the activity index).
  const activities = NET_ACTIVITY_IDS.map((id) => getActivity(id)).filter((a): a is NonNullable<typeof a> => !!a)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <p className="text-sm font-black uppercase tracking-wider text-amber-300">R2BOT Kids · Link Lab</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">Keep a robot safe when the radio fails</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-200">
          Almost every real robot is connected: to a tablet, a control room, a fleet server or a rover team on another planet. Radio links are slow, they lose
          messages and sometimes they go silent. Drive a rover over a bad link, watch exactly how it breaks, then fix it with the tricks engineers use.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <PresentButton source={{ kind: 'path', path: '/kids/lab/network' }} />
          <Link href="/kids/lab/network/guardian" className="inline-flex min-h-[44px] items-center rounded-2xl border border-white/15 px-4 text-sm font-bold text-slate-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            🛡️ Robot Security Check (Robot Guardians)
          </Link>
        </div>
      </header>

      <LinkLabClient />

      <article className="mx-auto max-w-4xl space-y-5 px-4 pb-16 text-slate-200">
        <h2 className="font-display text-2xl font-black text-white">What you are learning</h2>
        <section>
          <h3 className="text-lg font-black text-white">Teleoperation and delay</h3>
          <p>
            Teleoperation means driving a robot from somewhere else: a bomb-disposal robot from a van, an underwater robot from a ship, a surgical robot from the
            surgeon’s console. Every command travels over a link and every camera picture travels back. The time each trip takes is called latency. With 0.7 seconds
            each way, you see where the robot was 0.7 seconds ago, and it does what you said 0.7 seconds ago: you are late twice. That is why a robot overshoots, and why
            Mars rover drivers plan a whole day of driving instead of steering live. Driving slower, moving in short nudges and waiting for the picture to catch up, or
            showing a predicted position, all help.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Lost messages, acks and retries</h3>
          <p>
            Radio messages (packets) get lost: another device talks at the same time, a wall blocks the signal, a motor makes electrical noise. If a STOP message is lost,
            a simple robot never hears it and keeps doing the last thing it was told. The fix is an acknowledgement, or ACK: every command carries a number, the robot
            replies “got number 7”, and the sender repeats the command until that reply arrives. The internet’s TCP protocol and ROS 2’s “reliable” setting both work
            this way. Retries cost something: every copy uses up the link, so engineers choose the retry time a little longer than one round trip.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Jitter and sequence numbers</h3>
          <p>
            Messages do not all take the same time. When the delay wobbles (jitter), an older message can arrive after a newer one. A robot that obeys whatever arrived
            last can be sent backwards in time: an old FORWARD lands after your STOP and the robot lurches. Sequence numbers fix it: the robot remembers the newest number
            it has obeyed and throws away anything older.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Watchdogs: no link, no motion</h3>
          <p>
            Retries cannot help when the link is dead, for example in the radio shadow of a steel shelf or a tunnel. So the robot must protect itself. The operator sends
            the current command many times a second (a heartbeat). The robot runs a watchdog timer: if nothing fresh arrives for, say, half a second, it stops on its own.
            Industrial radio remotes, many drones and ROS 2 teleop tools use the same idea, often called a deadman. The timeout is a trade-off: too short and the robot
            stops for every slow patch, too long and it drives blind for too far.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">How the lab works</h3>
          <p>
            The rover, the radio and the messages are simulated with a fixed time step and fixed random seeds, so the same driving on the same level always gives the same
            result. You see only the video that reached you; after the run, the orange line shows where the robot really went. Each level earns up to three stars: dock
            safely, use the right protection for that link, and keep the run clean. Numbers here are typical, not measured from a particular robot.
          </p>
        </section>

        <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
          <h3 className="text-lg font-black text-white">Keep going in Robot Guardians</h3>
          <p className="mt-1">
            A connected robot also needs protecting from people who should not control it. In the{' '}
            <Link href="/kids/lab/network/guardian" className="font-bold text-amber-300 underline underline-offset-2">
              Robot Security Check
            </Link>{' '}
            you find a school robot that still has its factory password and fix it with a signed update, a strong passphrase and least privilege. It is part of the{' '}
            <Link href="/kids/worlds/guardians" className="font-bold text-amber-300 underline underline-offset-2">
              Robot Guardians world
            </Link>
            .
          </p>
          {activities.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/kids/galaxy/${a.track}/${a.id}`}
                    className="flex min-h-[48px] items-center rounded-2xl border border-white/10 bg-[#19263F] px-3 py-2 text-[15px] font-semibold text-white hover:border-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </>
  )
}
