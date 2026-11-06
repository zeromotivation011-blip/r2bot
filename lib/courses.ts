// lib/courses.ts — video courses (YouTube lessons + quiz + progress + certificate).
// Content lives in content/courses/<slug>/course.json. Quiz answers stay on the
// server: the public shape below strips them before they reach the browser.
import fs from 'node:fs'
import path from 'node:path'

export interface QuizQuestion { q: string; options: string[]; answer: number; why?: string }
export interface CourseLesson {
  id: string
  title: string
  summary: string
  youtubeId: string
  /** Video number in the production list (1-50), used to match uploads to lessons. */
  videoNo?: number
  durationMin: number
  quiz: QuizQuestion[]
}
export interface Course {
  slug: string
  title: string
  description: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  status: 'published' | 'draft'
  instructor: string
  updated: string
  outcomes: string[]
  lessons: CourseLesson[]
  /** Position in the learning journey (1 = first). */
  order?: number
  tagline?: string
  outcome?: string
  levelLabel?: string
  whoFor?: string
  prerequisites?: string
  presenters?: string[]
  /** 'ready' = videos available, 'soon' = still being produced (informational). */
  availability?: 'ready' | 'soon'
  minutes?: number
  /** A written task done after the lessons; required for the certificate once its table exists. */
  finalActivity?: { lessonId: string; title: string; prompt: string }
}
export type PublicLesson = Omit<CourseLesson, 'quiz'> & { quiz: Omit<QuizQuestion, 'answer' | 'why'>[] }
export const ASSIGNMENT_MIN_CHARS = 30
export const ASSIGNMENT_MAX_CHARS = 1500

const ROOT = path.join(process.cwd(), 'content', 'courses')

export function loadAllCourses(): Course[] {
  if (!fs.existsSync(ROOT)) return []
  const out: Course[] = []
  for (const dir of fs.readdirSync(ROOT)) {
    const f = path.join(ROOT, dir, 'course.json')
    if (!fs.existsSync(f)) continue
    try {
      const c = JSON.parse(fs.readFileSync(f, 'utf8')) as Course
      c.slug = dir
      out.push(c)
    } catch { /* skip malformed course */ }
  }
  return out
}

/** Drafts are visible only outside production so they can be previewed. */
export function isVisible(c: Course): boolean {
  return c.status === 'published' || process.env.NODE_ENV !== 'production'
}

export function listPublishedCourses(): Course[] {
  return loadAllCourses()
    .filter((c) => c.status === 'published')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title))
}

/** A lesson has a real video once a YouTube id has been set. */
export function hasVideo(l: { youtubeId: string }): boolean {
  const id = (l.youtubeId ?? '').trim()
  return id.length > 0 && !id.startsWith('REPLACE')
}

export function loadCourseBySlug(slug: string): Course | null {
  const c = loadAllCourses().find((x) => x.slug === slug)
  return c && isVisible(c) ? c : null
}

export function toPublicLesson(l: CourseLesson): PublicLesson {
  return { ...l, quiz: l.quiz.map(({ q, options }) => ({ q, options })) }
}

export const PASS_MARK = 0.7
export const WATCH_REQUIRED = 0.85
export function totalMinutes(c: Course): number {
  if (c.minutes) return c.minutes
  return c.lessons.reduce((a, l) => a + l.durationMin, 0)
}
