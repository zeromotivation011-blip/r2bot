// Server component: one Atlas entry in a language other than English.
//
// Each language route (app/<lang>/atlas/[type]/[slug]/page.tsx) is a thin
// wrapper around the three exports here, so the six languages cannot drift
// apart. Only reviewed translations from lib/atlas-i18n.ts render; anything
// else is a 404 (the routes set dynamicParams = false).
//
// Deliberately leaner than the English page: no Co-pilot prompts, compare
// widget or English-only cards in the middle of a translated article. The
// reader gets the translated entry, the English sources, links to the other
// translated entries, and a clear way to the English original.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { getAtlasEntry } from '@/lib/atlas'
import {
  ATLAS_LANG_META,
  atlasPath,
  getTranslatedEntry,
  listTranslations,
  type AtlasLang,
} from '@/lib/atlas-i18n'
import { atlasHreflang } from '@/lib/hreflang'
import { AtlasDiagram, type DiagramSpec } from '@/components/atlas/AtlasDiagram'

const BASE = 'https://www.r2bot.in'

/** Interface strings. Kept short and reviewed with the first translations. */
const T: Record<AtlasLang, {
  concept: string
  inSimpleWords: string
  sources: string
  sourcesNote: string
  translatedFrom: (date: string) => string
  readEnglish: string
  reviewed: string
  report: string
  reportLink: string
  faqHeadings: string[]
  titleSuffix: string
}> = {
  es: {
    concept: 'Concepto',
    inSimpleWords: 'En palabras sencillas',
    sources: 'Fuentes',
    sourcesNote: 'Las fuentes están en su idioma original.',
    translatedFrom: (d) => `Traducción de la entrada en inglés, revisada el ${d}.`,
    readEnglish: 'Leer el original en inglés',
    reviewed: 'Revisado',
    report: '¿Ves algún error?',
    reportLink: 'Avísanos',
    faqHeadings: ['preguntas frecuentes'],
    titleSuffix: ': qué es y cómo funciona',
  },
  pt: {
    concept: 'Conceito',
    inSimpleWords: 'Em palavras simples',
    sources: 'Fontes',
    sourcesNote: 'As fontes estão no idioma original.',
    translatedFrom: (d) => `Tradução do verbete em inglês, revisada em ${d}.`,
    readEnglish: 'Ler o original em inglês',
    reviewed: 'Revisado',
    report: 'Encontrou algum erro?',
    reportLink: 'Avise-nos',
    faqHeadings: ['perguntas frequentes'],
    titleSuffix: ': o que é e como funciona',
  },
  hi: {
    concept: 'अवधारणा',
    inSimpleWords: 'आसान शब्दों में',
    sources: 'स्रोत',
    sourcesNote: 'स्रोत अपनी मूल भाषा में हैं।',
    translatedFrom: (d) => `अंग्रेज़ी प्रविष्टि का अनुवाद, ${d} को जाँचा गया।`,
    readEnglish: 'मूल अंग्रेज़ी में पढ़ें',
    reviewed: 'जाँचा गया',
    report: 'कोई गलती दिखी?',
    reportLink: 'हमें बताएँ',
    faqHeadings: ['अक्सर पूछे जाने वाले सवाल', 'आम सवाल'],
    titleSuffix: ': क्या है और इसकी कार्यप्रणाली',
  },
  zh: {
    concept: '概念',
    inSimpleWords: '用简单的话说',
    sources: '参考来源',
    sourcesNote: '参考来源保留原文语言。',
    translatedFrom: (d) => `本文译自英文条目，审校日期 ${d}。`,
    readEnglish: '阅读英文原文',
    reviewed: '审校',
    report: '发现错误？',
    reportLink: '告诉我们',
    faqHeadings: ['常见问题'],
    titleSuffix: '是什么？原理详解',
  },
  de: {
    concept: 'Begriff',
    inSimpleWords: 'In einfachen Worten',
    sources: 'Quellen',
    sourcesNote: 'Die Quellen liegen in der Originalsprache vor.',
    translatedFrom: (d) => `Übersetzung des englischen Eintrags, geprüft am ${d}.`,
    readEnglish: 'Englisches Original lesen',
    reviewed: 'Geprüft',
    report: 'Fehler entdeckt?',
    reportLink: 'Sag uns Bescheid',
    faqHeadings: ['häufige fragen'],
    titleSuffix: ': Definition und Funktionsweise',
  },
  ja: {
    concept: '概念',
    inSimpleWords: 'かんたんに言うと',
    sources: '出典',
    sourcesNote: '出典は原語のまま掲載しています。',
    translatedFrom: (d) => `英語版の項目を翻訳し、${d} にレビューしました。`,
    readEnglish: '英語の原文を読む',
    reviewed: 'レビュー済み',
    report: '誤りを見つけましたか？',
    reportLink: 'お知らせください',
    faqHeadings: ['よくある質問'],
    titleSuffix: 'とは？仕組みを解説',
  },
}

type Params = { type: string; slug: string }

export function translatedStaticParams(lang: AtlasLang): Params[] {
  return listTranslations(lang).map((e) => ({ type: e.type, slug: e.slug }))
}

export async function translatedMetadata(lang: AtlasLang, params: Promise<Params>): Promise<Metadata> {
  const { type, slug } = await params
  const t = getTranslatedEntry(lang, type, slug)
  if (!t) return {}
  const canonical = `${BASE}${atlasPath(type, slug, lang)}`
  const withSuffix = `${t.title}${T[lang].titleSuffix}`
  const title = withSuffix.length <= 60 ? withSuffix : t.title
  const description = t.summary.length <= 160 ? t.summary : `${t.summary.slice(0, 157).replace(/\s+\S*$/, '')}…`
  return {
    title,
    description,
    alternates: { canonical, languages: atlasHreflang(type, slug) },
    openGraph: { title: `${title} | R2BOT`, description: t.summary, url: canonical, type: 'article', locale: ATLAS_LANG_META[lang].hreflang.replace('-', '_') },
  }
}

/** Q&A from the translated "frequently asked questions" section, for FAQPage JSON-LD. */
function extractFaq(body: string, headings: string[]): Array<{ q: string; a: string }> {
  const lines = body.split('\n')
  const start = lines.findIndex((l) => {
    const m = l.match(/^##[ \t]+(.+?)\s*$/)
    return Boolean(m && headings.includes(m[1].toLowerCase()))
  })
  if (start === -1) return []
  const out: Array<{ q: string; a: string }> = []
  let q: string | null = null
  let a: string[] = []
  const flush = () => {
    const answer = a.join(' ').replace(/\s+/g, ' ').trim()
    if (q && answer.length > 10) out.push({ q, a: answer })
  }
  for (const line of lines.slice(start + 1)) {
    if (/^##[ \t]+/.test(line)) break
    const h3 = line.match(/^###[ \t]+(.+?)\s*$/)
    if (h3) { flush(); q = h3[1]; a = []; continue }
    if (q) a.push(line)
  }
  flush()
  const clean = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_]/g, '').trim()
  return out.map(({ q: question, a: answer }) => ({ q: clean(question), a: clean(answer) }))
}

/** Point /atlas links at the same-language page when it exists; leave everything else alone. */
function localiseHref(href: string, lang: AtlasLang): string {
  const m = href.match(/^\/atlas\/([a-z]+)\/([a-z0-9-]+)(#.*)?$/)
  if (!m) return href
  return getTranslatedEntry(lang, m[1], m[2]) ? `${atlasPath(m[1], m[2], lang)}${m[3] ?? ''}` : href
}

export function AtlasTranslatedEntry({ lang, type, slug }: { lang: AtlasLang; type: string; slug: string }) {
  const t = getTranslatedEntry(lang, type, slug)
  if (!t) notFound()
  const en = getAtlasEntry(type as Parameters<typeof getAtlasEntry>[0], slug)
  if (!en) notFound()

  const s = T[lang]
  const canonical = `${BASE}${atlasPath(type, slug, lang)}`
  const englishHref = atlasPath(type, slug)
  const inLanguage = ATLAS_LANG_META[lang].hreflang
  const faq = extractFaq(t.body, s.faqHeadings)

  const ld: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      inLanguage,
      headline: t.title,
      description: t.summary,
      dateModified: t.reviewed,
      author: authorRef(),
      publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      url: canonical,
      translationOfWork: { '@type': 'TechArticle', '@id': `${BASE}${englishHref}`, inLanguage: 'en' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Atlas', item: `${BASE}/atlas` },
        { '@type': 'ListItem', position: 2, name: t.title, item: canonical },
      ],
    },
  ]
  if (faq.length > 0) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage,
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }

  return (
    <main id="main-content" className="pt-28 pb-24 md:pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <article className="mx-auto max-w-[800px] px-5 md:px-7">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-400">
          <Link href="/atlas" className="hover:text-amber-400">Atlas</Link>
          <span aria-hidden="true" className="mx-2">/</span>
          <span>{s.concept}</span>
        </nav>

        <div className="atlas-meta mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="tag">{s.concept}</span>
          <span className="muted-tag">{s.reviewed} · {t.reviewed}</span>
          <Link
            href={englishHref}
            hrefLang="en"
            className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 px-3 text-zinc-300 hover:border-amber-500 hover:text-amber-400"
          >
            English →
          </Link>
        </div>

        <h1 className="display mb-4 text-4xl leading-tight text-[var(--mist)] md:text-6xl">{t.title}</h1>

        <p className="mb-7 border-l-[3px] border-[var(--cyan)] pl-5 text-xl leading-relaxed text-[#C8D0DC]">
          {t.summary}
        </p>

        {t.laymanExplanation && (
          <section className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-400">{s.inSimpleWords}</p>
            <p className="text-[17px] leading-relaxed text-zinc-200">{t.laymanExplanation}</p>
          </section>
        )}

        <div id="atlas-body" className="prose" lang={inLanguage}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: () => null,
              a(props) {
                const { href, children } = props as { href?: string; children?: ReactNode }
                const target = href ? localiseHref(href, lang) : undefined
                const external = Boolean(target && /^https?:\/\//.test(target))
                return external
                  ? <a href={target} target="_blank" rel="noopener noreferrer">{children}</a>
                  : <a href={target}>{children}</a>
              },
              code(props) {
                const { className, children } = props as { className?: string; children?: ReactNode }
                if (/language-diagram/.exec(className || '')) {
                  try {
                    return <AtlasDiagram spec={JSON.parse(String(children).trim()) as DiagramSpec} />
                  } catch {
                    return <code className={className}>{children}</code>
                  }
                }
                return <code className={className}>{children}</code>
              },
            }}
          >
            {t.body}
          </ReactMarkdown>
        </div>

        <p className="mt-10 text-sm text-zinc-400">
          {s.translatedFrom(t.reviewed)}{' '}
          <Link href={englishHref} hrefLang="en" className="text-[var(--cyan)] underline-offset-4 hover:underline">
            {s.readEnglish} →
          </Link>
        </p>

        {en.sources && en.sources.length > 0 && (
          <section className="mt-8 border-t border-[var(--border)] pt-6">
            <h2 className="section-eyebrow">{s.sources}</h2>
            <p className="mb-3 text-xs text-zinc-500">{s.sourcesNote}</p>
            <ul className="m-0 list-none p-0">
              {en.sources.map((src) => (
                <li key={src.url} className="mb-2.5">
                  <a href={src.url} target="_blank" rel="noopener noreferrer" lang="en" className="text-[14.5px] text-[var(--cyan)]">
                    {src.title} →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-center text-sm text-zinc-500">
          {s.report}{' '}
          <a
            href={`mailto:hello@r2bot.in?subject=${encodeURIComponent(`Error report (${lang}): ${en.title}`)}&body=${encodeURIComponent(`Page: ${canonical}\n`)}`}
            className="text-[var(--cyan)]"
          >
            {s.reportLink} →
          </a>
        </p>
      </article>
    </main>
  )
}
