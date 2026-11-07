'use client'

import { useState } from 'react'

/**
 * "Put this on your site" — the snippet, visible, with one copy button.
 *
 * The share row already had an "⧉ Embed" button, but it sat as the fifth small
 * ghost button in a row and nobody was going to find it. A teacher or blogger
 * who would happily host the tool needs to see that they can, and see the code.
 *
 * Every embed carries a visible attribution link back to the simulator page, so
 * this is the one feature on the site that can realistically earn the inbound
 * links a new domain has none of.
 */
export function EmbedThis({ id, title, url }: { id: string; title: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const embedUrl = url.replace(`/visualizer/${id}`, `/visualizer/embed/${id}`)
  const snippet = `<iframe src="${embedUrl}" width="100%" height="560" style="border:0;border-radius:12px" loading="lazy" title="${title}"></iframe>`

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'share', {
        method: 'copy_embed_block',
        content_id: id,
      })
    } catch {
      /* clipboard can be blocked; the snippet is selectable anyway */
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-bold text-white">Put this on your site</h2>
      <p className="mt-1 text-sm text-gray-400">
        Free to embed in a lesson page, a blog post or a school site. No account, no API key, no
        tracking of your readers. Paste this where you want it:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[12px] leading-relaxed text-gray-300">
        <code>{snippet}</code>
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="min-h-[44px] rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 font-bold text-amber-400"
        >
          {copied ? '✓ Copied' : 'Copy embed code'}
        </button>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener"
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Preview the embed
        </a>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        All we ask is that you leave the small R2BOT credit under the tool.
      </p>
    </section>
  )
}
