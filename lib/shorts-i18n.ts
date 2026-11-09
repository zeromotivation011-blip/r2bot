// Which languages a Quick Lesson exists in (used for hreflang so we never point at a missing page).
import { SHORTS_ZH } from '@/lib/shorts-zh'
import { SHORTS_HI } from '@/lib/shorts-hi'
import { SHORTS_ES } from '@/lib/shorts-es'

const BASE = 'https://www.r2bot.in'

export function lessonLanguages(slug: string): Record<string, string> {
  const l: Record<string, string> = { en: `${BASE}/shorts/${slug}` }
  if (SHORTS_ZH[slug]) l['zh-CN'] = `${BASE}/zh/shorts/${slug}`
  if (SHORTS_HI[slug]) l.hi = `${BASE}/hi/shorts/${slug}`
  if (SHORTS_ES[slug]) l.es = `${BASE}/es/shorts/${slug}`
  l['x-default'] = l.en
  return l
}
