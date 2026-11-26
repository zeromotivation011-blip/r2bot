// app/kids/classroom/school/page.tsx — R2BOT Kids school: create or join a
// school, invite colleagues with the school code, and (admin) see every class
// with a school-wide summary. Teacher-only, noindex (server shell).
import type { Metadata } from 'next'
import SchoolClient from './SchoolClient'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Your school — R2BOT Kids Classroom',
  description: 'Create a school, invite colleagues with a school code, and see every class in one place.',
  alternates: { canonical: `${BASE}/kids/classroom/school` },
  robots: { index: false, follow: false },
}

export default function KidsSchoolPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8">
      <SchoolClient />
    </div>
  )
}
