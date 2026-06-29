import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { loadCourse } from '@/lib/academy/content-loader'
import { CourseLandingClient } from './CourseLandingClient'

interface PageProps {
  params: Promise<{ courseSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseSlug } = await params
  const course = loadCourse(courseSlug)
  if (!course) return { title: 'Course not found · R2BOT Academy' }
  return {
    title: `${course.title} · R2BOT Academy`,
    description: course.subtitle ?? course.description,
  }
}

export default async function CoursePage({ params }: PageProps) {
  const { courseSlug } = await params
  const course = loadCourse(courseSlug)
  if (!course) notFound()
  return (
    <CopilotProvider>
      <Nav />
      <CourseLandingClient course={course} />
    </CopilotProvider>
  )
}
