// app/kids/classroom/page.tsx — teacher dashboard for R2BOT Kids classes (server shell).
import type { Metadata } from 'next'
import ClassroomClient from './ClassroomClient'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Classroom — R2BOT Kids for teachers',
  description: 'Create a class, share a join code, and see every child’s robotics progress.',
  alternates: { canonical: `${BASE}/kids/classroom` },
  robots: { index: false, follow: false },
}

export default function KidsClassroomPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8">
      <ClassroomClient />
    </div>
  )
}
