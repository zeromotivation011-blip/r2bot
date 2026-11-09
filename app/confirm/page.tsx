import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'

export const metadata: Metadata = {
  title: 'Email confirmed',
  description: 'Your R2BOT subscription is confirmed. Start with a one-minute robotics lesson.',
  robots: { index: false, follow: true },
  alternates: { canonical: null },
}

export const dynamic = 'force-dynamic'

type State = 'confirmed' | 'already' | 'unknown' | 'unavailable' | 'busy'

const COPY: Record<State, { kicker: string; title: string; body: string }> = {
  confirmed: {
    kicker: 'You are in',
    title: 'Thanks — your email is confirmed.',
    body: 'Here is your first one-minute lesson: watch, play with the demo, answer one question. Your welcome email is on its way.',
  },
  already: {
    kicker: 'Already confirmed',
    title: 'This address was already confirmed.',
    body: 'Nothing more to do. Pick up where you left off with a one-minute lesson.',
  },
  unknown: {
    kicker: 'Link not recognised',
    title: 'We could not match this link.',
    body: 'It may be incomplete or very old. Submit your email again on any page and a fresh link will arrive within a minute.',
  },
  unavailable: {
    kicker: 'Something went wrong',
    title: 'We could not confirm right now.',
    body: 'Please try the link again in a moment. If it keeps failing, reply to the email and we will sort it out.',
  },
  busy: {
    kicker: 'Slow down',
    title: 'Too many attempts.',
    body: 'Please try the link again in an hour.',
  },
}

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams
  const key: State = state && state in COPY ? (state as State) : 'confirmed'
  const c = COPY[key]
  const ok = key === 'confirmed' || key === 'already'
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="flex min-h-[calc(100vh-90px)] items-center justify-center bg-[var(--void)] px-4 pb-16 pt-32">
        <div className="mx-auto max-w-xl text-center">
          <p className={`font-mono text-xs uppercase tracking-[0.35em] ${ok ? 'text-amber-300' : 'text-red-300'}`}>{c.kicker}</p>
          <h1 className="mt-3 text-[clamp(30px,5vw,44px)] font-black leading-tight text-white">{c.title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-300 sm:text-lg">{c.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shorts" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-6 font-bold text-black">
              Start a one-minute lesson
            </Link>
            <Link href="/courses" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/20 px-6 font-semibold text-white">
              See the free course path
            </Link>
          </div>
        </div>
      </main>
    </CopilotProvider>
  )
}
