// lib/academy/courses.ts
// Course / Module / Lesson types for the Academy v2.

import type { ContentBlock } from './blocks'

export type AcademyTrack = 'spark' | 'wire' | 'forge' | 'edge'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'research'

export type LessonType =
  | 'video'
  | 'reading'
  | 'interactive'
  | 'code-challenge'
  | 'simulation'
  | 'hands-on'
  | 'quiz'
  | 'project'
  | 'scorm'
  | 'live'
  | 'podcast'

export interface InstructorRef {
  id: string
  display_name: string
  bio?: string
  credentials?: string[]
  photo_url?: string
  linkedin_url?: string
}

export interface Course {
  id: string
  slug: string
  title: string
  subtitle?: string
  track: AcademyTrack
  level: CourseLevel
  description?: string
  thumbnail_url?: string
  trailer_url?: string
  instructor?: InstructorRef
  price_inr: number
  is_free: boolean
  duration_hours?: number
  total_lessons: number
  total_xp: number
  tags?: string[]
  prerequisites?: string[]      // course slugs
  certificate_template?: string
  published_at?: string
  language: 'en' | 'hi' | 'both'
  cbse_aligned: boolean
  nep_aligned: boolean
  hardware_kit?: string
  modules: Module[]
  // Derived/display
  what_youll_learn?: string[]
  free_preview_lesson_slugs?: string[]
  // Coming-soon state
  coming_soon?: boolean
  waitlist_cta?: string
  hardware_requirements?: { name: string; price_inr?: number; buy_url?: string }[]
}

export interface Module {
  id: string
  course_id: string
  order_index: number
  title: string
  description?: string
  unlock_after_module_id?: string | null
  is_checkpoint: boolean
  duration_minutes: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  module_id: string
  course_id: string
  order_index: number
  slug: string
  title: string
  lesson_type: LessonType
  duration_minutes: number
  xp_reward: number
  is_free_preview: boolean
  passing_score: number
  content_mdx?: string
  content_hi?: string
  objectives: string[]
  atlas_links: string[]
  blocks: ContentBlock[]
}

// ─── Progress shapes (mirrored from Supabase, kept lean for client use) ──

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at?: string
  progress_pct: number
  last_active_at: string
  is_paid: boolean
}

export interface LessonProgress {
  user_id: string
  lesson_id: string
  course_id: string
  started_at: string
  completed_at?: string
  best_score: number
  attempts: number
  time_spent_sec: number
  xp_earned: number
}

export interface BlockProgress {
  user_id: string
  block_id: string
  lesson_id: string
  completed_at: string
  score?: number
  response_data?: unknown
}

export interface QuizAttempt {
  id: string
  user_id: string
  lesson_id: string
  block_id: string
  answers: unknown
  score: number
  passed: boolean
  time_taken_sec?: number
  attempted_at: string
}

export interface ProjectSubmission {
  id: string
  user_id: string
  lesson_id: string
  course_id: string
  content?: string
  repo_url?: string
  demo_url?: string
  images?: string[]
  status: 'submitted' | 'under_review' | 'passed' | 'failed'
  grade?: number
  feedback?: string
  reviewed_by?: string
  submitted_at: string
  reviewed_at?: string
}

export interface CourseCertificate {
  id: string
  cert_id: string
  user_id: string
  course_id: string
  course_title: string
  user_name: string
  issued_at: string
  pdf_url?: string
}

// ─── View model helpers ────────────────────────────────────────────────────

export interface LessonNavRef {
  id: string
  slug: string
  title: string
  module_id: string
  order_index: number
  module_order_index: number
  is_free_preview: boolean
  duration_minutes: number
}

export function flattenLessons(course: Course): LessonNavRef[] {
  const out: LessonNavRef[] = []
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      out.push({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        module_id: mod.id,
        order_index: lesson.order_index,
        module_order_index: mod.order_index,
        is_free_preview: lesson.is_free_preview,
        duration_minutes: lesson.duration_minutes,
      })
    }
  }
  return out
}

export function findLessonBySlug(course: Course, slug: string): { lesson: Lesson; module: Module } | null {
  for (const mod of course.modules) {
    const lesson = mod.lessons.find(l => l.slug === slug)
    if (lesson) return { lesson, module: mod }
  }
  return null
}

export function getNextLesson(course: Course, currentLessonId: string): LessonNavRef | null {
  const flat = flattenLessons(course)
  const idx = flat.findIndex(l => l.id === currentLessonId)
  if (idx < 0 || idx === flat.length - 1) return null
  return flat[idx + 1]
}

export function getPrevLesson(course: Course, currentLessonId: string): LessonNavRef | null {
  const flat = flattenLessons(course)
  const idx = flat.findIndex(l => l.id === currentLessonId)
  if (idx <= 0) return null
  return flat[idx - 1]
}
