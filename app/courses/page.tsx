import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublishedCourses, totalMinutes } from '@/lib/courses'

export const revalidate = 86400
const BASE = 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'Free Robotics Video Courses with Quizzes and Certificates',
  description: 'Short video lessons, quizzes and a certificate of completion. Learn robotics step by step, free, in plain English.',
  alternates: { canonical: `${BASE}/courses` },
}

export default function CoursesPage() {
  const courses = listPublishedCourses()
  return (
    <main className="max-w-5xl mx-auto px-5 py-14">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500">Video courses</p>
      <h1 className="text-3xl md:text-5xl font-black text-white mt-2">Learn robotics, one short video at a time</h1>
      <p className="text-gray-400 mt-4 max-w-2xl">Each course is a set of short lessons with a quick quiz. Your progress is saved, and you earn a certificate you can verify and share. Everything is free.</p>
      {courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 p-8 text-gray-300">
          <h2 className="text-xl font-bold text-white">First course is being recorded</h2>
          <p className="mt-2">Meanwhile, start with the free <Link href="/academy" className="text-amber-500 underline">Academy tracks</Link> or the <Link href="/atlas" className="text-amber-500 underline">Atlas</Link>.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5 mt-10">
          {courses.map((c) => (
            <Link key={c.slug} href={`/courses/${c.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-amber-500/60 transition">
              <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">{c.level} · Free</p>
              <h2 className="text-xl font-extrabold text-white mt-2">{c.title}</h2>
              <p className="text-gray-400 mt-2 text-sm">{c.description}</p>
              <p className="text-gray-500 mt-4 text-xs">{c.lessons.length} lessons · {totalMinutes(c)} min · Certificate</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
