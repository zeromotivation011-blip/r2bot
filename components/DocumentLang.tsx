import DocumentLangClient from '@/components/DocumentLangClient'

/** BCP 47 tags used by the localised sections. Anything else is refused at compile time. */
export type DocumentLangTag = 'es' | 'pt-BR' | 'hi' | 'zh-CN' | 'de' | 'ja'

/**
 * Sets the document language for a localised section (/es, /pt, /hi, /zh, /de, /ja).
 *
 * The wrapper <div lang> in each locale layout already marks the content, but
 * the document itself said "en", so assistive tech and parsers that only read
 * <html lang> treated Spanish or Chinese text as English. The inline script runs
 * as the body is parsed, before hydration (the root <html> carries
 * suppressHydrationWarning for this and the "js" class); the client component
 * keeps it right across soft navigations.
 */
export function DocumentLang({ lang }: { lang: DocumentLangTag }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(lang)}` }} />
      <DocumentLangClient lang={lang} />
    </>
  )
}
