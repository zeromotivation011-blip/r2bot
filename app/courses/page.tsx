import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublishedCourses, totalMinutes, hasVideo } from '@/lib/courses'
import JourneyClient from './JourneyClient'

export const revalidate = 86400
const BASE = 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'Free Robotics Course Path: 5 Courses, Quizzes and Certificates',
  description: 'Five free robotics courses in order: foundations, build a robot, robot arms, vision and intelligence. Short videos, quizzes and certificates.',
  alternates: { canonical: `${BASE}/courses`, languages: { en: `${BASE}/courses`, 'zh-CN': `${BASE}/zh/courses` } },
}

export default function CoursesPage() {
  const courses = listPublishedCourses()
  return (
    <main className="max-w-5xl mx-auto px-5 py-14">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500">Your robotics journey</p>
      <h1 className="text-3xl md:text-5xl font-black text-white mt-2">Five free courses, from zero to your own robot design</h1>
      <p className="text-gray-400 mt-4 max-w-2xl">Follow the path in order, or jump to the course you need. Every lesson is a short video of about 4 minutes with a quick quiz. Each course ends with a small final activity and a certificate you can verify and share. Everything is free.</p>
      <ul className="mt-5 flex flex-wrap gap-2 text-xs text-gray-300">
        {['50 short lessons', 'Quiz after every lesson', 'Final activity per course', 'Certificate for each course', 'English · plain language'].map((t) => <li key={t} className="rounded-full border border-white/10 px-3 py-1">{t}</li>)}
      </ul>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
          { q: 'Are the R2BOT courses really free?', a: 'Yes. All five courses, quizzes and certificates are free.' },
          { q: 'How long is each lesson?', a: 'Each lesson is a short video of about 4 minutes followed by a quick quiz.' },
          { q: 'Do I get a certificate?', a: 'Yes. Finish all lessons, pass the quizzes and complete the final activity to earn a certificate you can verify and share.' },
          { q: 'Do I need experience?', a: 'No. The first course starts from zero and the path builds up to robot design.' },
        ].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }) }} />
      {courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 p-8 text-gray-300">
          <h2 className="text-xl font-bold text-white">First course is being recorded</h2>
          <p className="mt-2">Meanwhile, start with the free <Link href="/academy" className="text-amber-500 underline">Academy tracks</Link> or the <Link href="/atlas" className="text-amber-500 underline">Atlas</Link>.</p>
        </div>
      ) : (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'ItemList', name: 'R2BOT free robotics course path',
            itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/courses/${c.slug}`, name: c.title })),
          }) }} />
          <JourneyClient courses={courses.map((c, i) => ({
            slug: c.slug, title: c.title, tagline: c.tagline ?? c.description, level: c.levelLabel ?? c.level, order: c.order ?? i + 1,
            lessons: c.lessons.length, videosReady: c.lessons.filter(hasVideo).length, minutes: totalMinutes(c),
            prerequisites: c.prerequisites ?? 'None',
          }))} />
        </>
      )}
      <p className="mt-12 text-sm text-gray-500">Prefer to explore on your own? Try the <Link href="/atlas" className="text-amber-500 underline">Atlas</Link>, the <Link href="/academy" className="text-amber-500 underline">Academy tracks</Link> or the <Link href="/visualizer" className="text-amber-500 underline">simulators</Link>.</p>
    </main>
  )
}
