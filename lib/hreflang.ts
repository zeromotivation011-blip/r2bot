// lib/hreflang.ts
//
// One source of truth for hreflang sets. Google only honours a language
// cluster when every page in it lists every other page (and itself); before
// 9 Nov 2026 `/zh` listed two languages while `/` listed four, `/zh/courses`
// listed none, and nothing carried x-default — so the translated pages earned
// no search traffic at all. Every localised route builds its `languages` map
// here, in both directions, with `x-default` pointing at English.
import { getZhTopic } from '@/lib/ai-robotics-zh'
import { getHiTopic } from '@/lib/ai-robotics-hi'
import { getEsTopic } from '@/lib/ai-robotics-es'

const BASE = 'https://www.r2bot.in'

type Locale = 'en' | 'zh-CN' | 'hi' | 'es'
const PREFIX: Record<Locale, string> = { en: '', 'zh-CN': '/zh', hi: '/hi', es: '/es' }

/** Build a reciprocal map for `path` across the given locales; always adds x-default → en. */
export function hreflangFor(path: string, locales: Locale[] = ['en', 'zh-CN', 'hi', 'es']): Record<string, string> {
  const p = path === '/' ? '' : path
  const out: Record<string, string> = {}
  for (const l of locales) out[l] = `${BASE}${PREFIX[l]}${p}` || `${BASE}/`
  if (out.en === BASE) out.en = `${BASE}/`
  out['x-default'] = out.en
  return out
}

export const HREFLANG_HOME = hreflangFor('/')
export const HREFLANG_SHORTS = hreflangFor('/shorts')
export const HREFLANG_COURSES = hreflangFor('/courses', ['en', 'zh-CN'])
export const HREFLANG_AI_HUB = hreflangFor('/ai-robotics')
export const HREFLANG_AI_GLOSSARY = hreflangFor('/ai-robotics/glossary')

/** AI + Robotics topic pages exist per language only where a translation exists. */
export function aiTopicHreflang(slug: string): Record<string, string> {
  const locales: Locale[] = ['en']
  if (getZhTopic(slug)) locales.push('zh-CN')
  if (getHiTopic(slug)) locales.push('hi')
  if (getEsTopic(slug)) locales.push('es')
  return hreflangFor(`/ai-robotics/${slug}`, locales)
}
