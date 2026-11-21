// lib/atlas-i18n.ts
//
// Translated Atlas entries. Server-only (reads the filesystem).
//
// WHERE THE FILES LIVE: content/atlas-i18n/<lang>/<type>/<slug>.mdx, one file per
// translated entry, mirroring content/atlas/<type>/<slug>.mdx. They sit in their
// own tree on purpose: lib/atlas.ts and scripts/seed-atlas.ts both read every
// file under content/atlas, so a sibling `bipedal-robot.es.mdx` there would
// become a second English entry with the slug "bipedal-robot.es" and be pushed
// into the search index.
//
// THE RULES:
// - A page exists in a language only when its translation file exists. There is
//   no machine fallback and no "coming soon" page: untranslated URLs 404
//   (dynamicParams = false on every language route).
// - A translation ships only after an independent review pass (a second reader
//   checking accuracy and natural phrasing as a native-speaking robotics
//   teacher). `reviewed` in the frontmatter records the date of that pass;
//   a file without it is ignored, so an unreviewed draft can never go live.
// - hreflang for every Atlas page is built from this file through
//   lib/hreflang.ts, so the English page and each translation list each other.
//
// Frontmatter of a translation:
//   title, summary            — translated (required)
//   laymanExplanation         — translated (optional)
//   sourceLastReviewed        — the English entry's lastReviewed it was made from
//   reviewed                  — date of the independent review (required)
// Sources are not translated; the English entry's list is shown.
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { AtlasType } from '@/lib/atlas'

export type AtlasLang = 'es' | 'pt' | 'hi' | 'zh' | 'de' | 'ja'

/** Rollout order (Spanish first, then Portuguese, Hindi, Chinese, German, Japanese). */
export const ATLAS_LANGS: AtlasLang[] = ['es', 'pt', 'hi', 'zh', 'de', 'ja']

/** hreflang / BCP 47 code and URL prefix for each language. */
export const ATLAS_LANG_META: Record<AtlasLang, { hreflang: string; prefix: string; name: string }> = {
  es: { hreflang: 'es', prefix: '/es', name: 'Español' },
  pt: { hreflang: 'pt-BR', prefix: '/pt', name: 'Português (Brasil)' },
  hi: { hreflang: 'hi', prefix: '/hi', name: 'हिन्दी' },
  zh: { hreflang: 'zh-CN', prefix: '/zh', name: '中文' },
  de: { hreflang: 'de', prefix: '/de', name: 'Deutsch' },
  ja: { hreflang: 'ja', prefix: '/ja', name: '日本語' },
}

export type TranslatedAtlasEntry = {
  lang: AtlasLang
  type: AtlasType
  slug: string
  title: string
  summary: string
  laymanExplanation?: string
  body: string
  reviewed: string
  sourceLastReviewed?: string
}

const ROOT = path.join(process.cwd(), 'content', 'atlas-i18n')

function dateString(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 10)
  return undefined
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim() : undefined
}

function parse(lang: AtlasLang, type: AtlasType, slug: string, file: string): TranslatedAtlasEntry | null {
  const { data, content } = matter(fs.readFileSync(file, 'utf8'))
  const title = str(data.title)
  const summary = str(data.summary)
  const reviewed = dateString(data.reviewed)
  // No title, no summary, no body or no review: not publishable.
  if (!title || !summary || !reviewed || !content.trim()) return null
  return {
    lang,
    type,
    slug,
    title,
    summary,
    laymanExplanation: str(data.laymanExplanation),
    body: content,
    reviewed,
    sourceLastReviewed: dateString(data.sourceLastReviewed),
  }
}

let cache: Map<string, TranslatedAtlasEntry> | null = null

/** Every publishable translation, keyed `lang/type/slug`. Built once per process. */
function all(): Map<string, TranslatedAtlasEntry> {
  if (cache) return cache
  const out = new Map<string, TranslatedAtlasEntry>()
  if (fs.existsSync(ROOT)) {
    for (const lang of ATLAS_LANGS) {
      const langDir = path.join(ROOT, lang)
      if (!fs.existsSync(langDir)) continue
      for (const type of fs.readdirSync(langDir)) {
        const dir = path.join(langDir, type)
        if (!fs.statSync(dir).isDirectory()) continue
        for (const f of fs.readdirSync(dir)) {
          if (!f.endsWith('.mdx') && !f.endsWith('.md')) continue
          const slug = f.replace(/\.(mdx|md)$/, '')
          const entry = parse(lang, type as AtlasType, slug, path.join(dir, f))
          if (entry) out.set(`${lang}/${type}/${slug}`, entry)
        }
      }
    }
  }
  cache = out
  return out
}

export function isAtlasLang(v: string): v is AtlasLang {
  return (ATLAS_LANGS as string[]).includes(v)
}

export function getTranslatedEntry(lang: AtlasLang, type: string, slug: string): TranslatedAtlasEntry | null {
  return all().get(`${lang}/${type}/${slug}`) ?? null
}

/** All translations in one language (for generateStaticParams and the sitemap). */
export function listTranslations(lang?: AtlasLang): TranslatedAtlasEntry[] {
  const list = Array.from(all().values())
  return lang ? list.filter((e) => e.lang === lang) : list
}

/** Languages (in rollout order) that have a published translation of this entry. */
export function translationLangs(type: string, slug: string): AtlasLang[] {
  return ATLAS_LANGS.filter((l) => all().has(`${l}/${type}/${slug}`))
}

/** The URL of an Atlas entry in a language (English when lang is undefined). */
export function atlasPath(type: string, slug: string, lang?: AtlasLang): string {
  return `${lang ? ATLAS_LANG_META[lang].prefix : ''}/atlas/${type}/${slug}`
}
