// app/kids/lab/network/guardian/page.tsx — Robot Security Check (roadmap #88),
// the Robot Guardians mission on connected robots. Server component: the
// teaching text is server-rendered; the four-step mission is a light client
// island. Defensive only: spot a factory password, install only a signed
// update, choose a strong passphrase, give an app only what its job needs.

import type { Metadata } from 'next'
import Link from 'next/link'
import SecurityCheckClient from '@/components/kids/net/SecurityCheckClient'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { getActivity } from '@/lib/kids/activities/content'
import { NET_ACTIVITY_IDS } from '@/components/kids/net/net-activities'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/lab/network/guardian`

const TITLE = 'Robot Cybersecurity for Kids: Default Passwords, Signed Updates and Least Privilege'
const DESCRIPTION =
  'A Robot Guardians mission for ages 8–17: find the school robot that still has its factory password, fix it with a signed update, choose a strong passphrase and give its app only the permissions it needs.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot Security Check — a Robot Guardians mission',
    description: 'Default passwords, signed updates and least privilege, for young robot guardians.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot Security Check' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot Security Check',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activity',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Why factory default passwords are dangerous', 'Signed software updates and fingerprints (hashes)', 'Strong passphrases', 'Least privilege', 'Reporting a weakness responsibly'],
  isPartOf: { '@type': 'LearningResource', name: 'Robot Guardians', url: `${BASE}/kids/worlds/guardians` },
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot Guardians', path: '/kids/worlds/guardians' },
  { name: 'Robot Security Check', path: '/kids/lab/network/guardian' },
])

export default function RobotSecurityCheckPage() {
  const activities = NET_ACTIVITY_IDS.map((id) => getActivity(id)).filter((a): a is NonNullable<typeof a> => !!a)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <header className="mx-auto max-w-4xl px-4 pb-4 pt-6">
        <p className="text-sm font-black uppercase tracking-wider text-emerald-300">
          <Link href="/kids/worlds/guardians" className="inline-flex min-h-[44px] items-center hover:underline">
            🛡️ Robot Guardians
          </Link>{' '}
          · Mission
        </p>
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl">Robot Security Check</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-200">
          A robot that is connected to a network can be controlled from far away. That is useful, and it is also a risk: if the wrong person can control a robot, it
          can hurt someone or spy on them. Robot Guardians keep connected robots safe. Check the school’s robots, find the weak one and fix it, step by step.
        </p>
      </header>

      <SecurityCheckClient />

      <article className="mx-auto max-w-4xl space-y-5 px-4 pb-16 text-slate-200">
        <h2 className="font-display text-2xl font-black text-white">What you are learning</h2>
        <section>
          <h3 className="text-lg font-black text-white">Factory passwords</h3>
          <p>
            Many devices used to leave the factory with the same password on every single unit, such as “admin” or “1234”, printed in the manual for anyone to read.
            Automated programs search networks for devices that still use them. Some countries now ban this: in the UK, since April 2024, connected devices may not ship
            with one shared default password. A Robot Guardian’s first question about any connected robot is: has anyone changed the factory password?
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Updates, and why they must be signed</h3>
          <p>
            Every software update fixes mistakes, and once a mistake is public, a robot that never updates keeps it for good. But an update is also the most powerful
            thing you can send to a robot: it changes what the robot does. So robots should install only updates their maker has signed. The maker works out a
            fingerprint of the file (a hash) and signs it with a secret key; every robot holds the matching public key and checks the signature before installing.
            Change even one letter of the file and the fingerprint changes completely, so a tampered update fails the check. In the mission you can see this happen.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Strong passwords</h3>
          <p>
            A password is strong when a guessing program would have to try a huge number of possibilities. Length matters most. Five words picked at random are long,
            easy to remember and very hard to guess; a short password with a few symbols is not. Guessers try common patterns first, such as names, years and “P@ss”.
            Good robots also lock for a while after a few wrong tries. The passwords in the mission are examples only: never use a password you have seen anywhere online.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Least privilege</h3>
          <p>
            Least privilege means giving every app, program and person only the powers their job needs. A delivery app needs the wheels, the map and a camera to avoid
            people; it does not need the microphone, pupils’ details or the power to change other robots. Then, if the app has a bug or someone steals its password,
            the damage stays small. Robot software such as ROS 2 can enforce this, giving each part of the robot its own key and a list of what it may do.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">The Guardian rule</h3>
          <p>
            Guardians defend. If you notice a weakness in a device that is not yours, do not try it out, even to help: logging in to someone else’s device without
            permission is wrong and in many countries against the law. Tell the person in charge, such as a teacher, a parent or the school IT team. Companies call this
            responsible disclosure, and many thank people who report problems safely.
          </p>
        </section>

        <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
          <h3 className="text-lg font-black text-white">More for connected robots</h3>
          <p className="mt-1">
            Robots also need protecting when their radio link is slow or breaks. In the{' '}
            <Link href="/kids/lab/network" className="font-bold text-amber-300 underline underline-offset-2">
              Link Lab
            </Link>{' '}
            you drive a rover over a bad link and fix it with acks, sequence numbers and a watchdog stop.
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
