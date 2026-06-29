// lib/academy/content-loader.ts
// Loads Academy v2 course content from local JSON files on the server.
// Falls back to a slim shim if a course hasn't been migrated yet.

import fs from 'node:fs'
import path from 'node:path'
import type { Course, Module, Lesson } from './courses'

const ROOT = path.join(process.cwd(), 'content', 'academy')

interface CourseMetaFile {
  id: string
  slug: string
  title: string
  subtitle?: string
  track: 'spark' | 'wire' | 'forge' | 'edge'
  level: 'beginner' | 'intermediate' | 'advanced' | 'research'
  description?: string
  thumbnail_url?: string
  trailer_url?: string
  instructor?: { id: string; display_name: string; bio?: string; credentials?: string[]; photo_url?: string; linkedin_url?: string }
  price_inr?: number
  is_free?: boolean
  duration_hours?: number
  tags?: string[]
  prerequisites?: string[]
  certificate_template?: string
  published_at?: string
  language?: 'en' | 'hi' | 'both'
  cbse_aligned?: boolean
  nep_aligned?: boolean
  hardware_kit?: string
  what_youll_learn?: string[]
  free_preview_lesson_slugs?: string[]
  coming_soon?: boolean
  waitlist_cta?: string
  hardware_requirements?: { name: string; price_inr?: number; buy_url?: string }[]
}

interface ModuleMetaFile {
  id: string
  order_index: number
  title: string
  description?: string
  is_checkpoint?: boolean
  duration_minutes?: number
}

interface LessonMetaFile {
  id: string
  module_id: string
  order_index: number
  slug: string
  title: string
  lesson_type: Lesson['lesson_type']
  duration_minutes?: number
  xp_reward?: number
  is_free_preview?: boolean
  passing_score?: number
  content_mdx?: string
  content_hi?: string
  objectives?: string[]
  atlas_links?: string[]
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

export function listCourseSlugs(): string[] {
  if (!fs.existsSync(ROOT)) return []
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(ROOT, name, 'course.json')))
}

export function loadCourse(slug: string): Course | null {
  const dir = path.join(ROOT, slug)
  const meta = readJsonSafe<CourseMetaFile>(path.join(dir, 'course.json'))
  if (!meta) return null

  const modulesMeta = readJsonSafe<ModuleMetaFile[]>(path.join(dir, 'modules.json')) ?? []
  const lessonsDir = path.join(dir, 'lessons')
  const lessonDirs = fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
    : []

  // Map: module_id → Lesson[]
  const lessonsByModule = new Map<string, Lesson[]>()
  let totalLessons = 0
  let totalXp = 0

  for (const lessonSlug of lessonDirs) {
    const lessonDir = path.join(lessonsDir, lessonSlug)
    const lessonMeta = readJsonSafe<LessonMetaFile>(path.join(lessonDir, 'lesson.json'))
    if (!lessonMeta) continue
    const blocksJson = readJsonSafe<Lesson['blocks']>(path.join(lessonDir, 'blocks.json')) ?? []
    const lesson: Lesson = {
      id: lessonMeta.id,
      module_id: lessonMeta.module_id,
      course_id: meta.id,
      order_index: lessonMeta.order_index,
      slug: lessonMeta.slug,
      title: lessonMeta.title,
      lesson_type: lessonMeta.lesson_type,
      duration_minutes: lessonMeta.duration_minutes ?? 10,
      xp_reward: lessonMeta.xp_reward ?? 100,
      is_free_preview: lessonMeta.is_free_preview ?? false,
      passing_score: lessonMeta.passing_score ?? 75,
      content_mdx: lessonMeta.content_mdx,
      content_hi: lessonMeta.content_hi,
      objectives: lessonMeta.objectives ?? [],
      atlas_links: lessonMeta.atlas_links ?? [],
      blocks: blocksJson,
    }
    totalLessons++
    totalXp += lesson.xp_reward
    const arr = lessonsByModule.get(lesson.module_id) ?? []
    arr.push(lesson)
    lessonsByModule.set(lesson.module_id, arr)
  }

  const modules: Module[] = modulesMeta
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map(m => ({
      id: m.id,
      course_id: meta.id,
      order_index: m.order_index,
      title: m.title,
      description: m.description,
      is_checkpoint: m.is_checkpoint ?? false,
      duration_minutes: m.duration_minutes ?? 0,
      lessons: (lessonsByModule.get(m.id) ?? []).sort((a, b) => a.order_index - b.order_index),
    }))

  return {
    id: meta.id,
    slug: meta.slug,
    title: meta.title,
    subtitle: meta.subtitle,
    track: meta.track,
    level: meta.level,
    description: meta.description,
    thumbnail_url: meta.thumbnail_url,
    trailer_url: meta.trailer_url,
    instructor: meta.instructor,
    price_inr: meta.price_inr ?? 0,
    is_free: meta.is_free ?? (meta.price_inr ?? 0) === 0,
    duration_hours: meta.duration_hours,
    total_lessons: totalLessons,
    total_xp: totalXp,
    tags: meta.tags,
    prerequisites: meta.prerequisites,
    certificate_template: meta.certificate_template,
    published_at: meta.published_at,
    language: meta.language ?? 'en',
    cbse_aligned: meta.cbse_aligned ?? false,
    nep_aligned: meta.nep_aligned ?? false,
    hardware_kit: meta.hardware_kit,
    modules,
    what_youll_learn: meta.what_youll_learn,
    free_preview_lesson_slugs: meta.free_preview_lesson_slugs,
    coming_soon: meta.coming_soon,
    waitlist_cta: meta.waitlist_cta,
    hardware_requirements: meta.hardware_requirements,
  }
}

export function loadLesson(courseSlug: string, lessonSlug: string): { course: Course; lesson: Lesson } | null {
  const course = loadCourse(courseSlug)
  if (!course) return null
  for (const mod of course.modules) {
    const lesson = mod.lessons.find(l => l.slug === lessonSlug)
    if (lesson) return { course, lesson }
  }
  return null
}
