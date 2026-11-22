'use client'

import { useEffect } from 'react'

/**
 * Keeps <html lang> in step with a localised section during client navigation.
 *
 * The root layout renders <html lang="en"> for every route (one root layout, so
 * it cannot know the locale without making every page dynamic). Each locale
 * layout renders <DocumentLang>, whose inline script corrects the attribute
 * before first paint; this effect covers soft navigations into a section and
 * puts "en" back when the visitor leaves it for an English page.
 */
export default function DocumentLangClient({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    return () => {
      root.lang = 'en'
    }
  }, [lang])
  return null
}
