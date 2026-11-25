// app/kids/join/page.tsx — a child joins their teacher's class (server shell).
import type { Metadata } from 'next'
import JoinClient from './JoinClient'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Join your class — R2BOT Kids',
  description: 'Type the code your teacher gave you and a nickname. No email, no password, no account.',
  alternates: { canonical: `${BASE}/kids/join` },
  // A form, not content: nothing here should rank.
  robots: { index: false, follow: true },
}

export default function KidsJoinPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-8 sm:pt-12">
      <JoinClient />
    </div>
  )
}
