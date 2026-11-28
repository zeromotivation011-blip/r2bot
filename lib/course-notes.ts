// lib/course-notes.ts — written lesson notes for the video course path.
//
// A course lesson page used to be a ~40-word wrapper around a YouTube video.
// Each lesson with a live video can now carry a sourced written note in
// content/courses/<course>/notes/<lessonId>.md, rendered under the video.
//
// Frontmatter:
//   updated:  YYYY-MM-DD   the note's own date; the sitemap uses it as lastmod
//   reviewed: YYYY-MM-DD   set only after an independent fact-check pass
// A file without `reviewed:` is ignored, so nothing ships unchecked (the same
// rule as content/atlas-i18n).
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface LessonNote {
  body: string
  updated: string
  reviewed: string
  words: number
}

const ROOT = path.join(process.cwd(), 'content', 'courses')
const SAFE = /^[a-z0-9-]+$/

function asDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return typeof v === 'string' ? v.trim() : ''
}

export function loadLessonNote(courseSlug: string, lessonId: string): LessonNote | null {
  if (!SAFE.test(courseSlug) || !SAFE.test(lessonId)) return null
  const f = path.join(ROOT, courseSlug, 'notes', `${lessonId}.md`)
  if (!fs.existsSync(f)) return null
  try {
    const { data, content } = matter(fs.readFileSync(f, 'utf8'))
    const reviewed = asDate(data.reviewed)
    const updated = asDate(data.updated)
    if (!reviewed || !updated) return null
    const body = content.trim()
    if (!body) return null
    return { body, updated, reviewed, words: body.split(/\s+/).length }
  } catch {
    return null
  }
}
