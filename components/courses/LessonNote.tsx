// Server component: the written note under a course lesson video.
// Rendered on the server so the text is in the HTML Google and readers get,
// and passed into the client LessonClient as a ready-made node.
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AUTHOR } from '@/lib/author'

/** Internal links go through next/link; external ones open in a new tab. */
function MdLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const cls = 'text-amber-300 underline underline-offset-2 hover:text-amber-200'
  if (href && href.startsWith('/')) return <Link href={href} className={cls}>{children}</Link>
  return <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
}

export default function LessonNote({ body, updated }: { body: string; updated: string }) {
  return (
    <article id="lesson-note" className="mt-10 border-t border-white/10 pt-8">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Lesson notes</p>
      <p className="mt-1 text-sm text-gray-400">
        By <Link href={AUTHOR.url} className="text-gray-200 hover:underline">{AUTHOR.name}</Link> · Updated {updated}
      </p>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: () => null,
          h2: ({ children }) => <h2 className="mt-9 text-xl md:text-2xl font-black text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-6 text-lg font-bold text-white">{children}</h3>,
          p: ({ children }) => <p className="mt-4 text-base leading-relaxed text-zinc-200">{children}</p>,
          a: ({ href, children }) => <MdLink href={href}>{children}</MdLink>,
          ul: ({ children }) => <ul className="mt-4 ml-5 list-disc space-y-2 text-zinc-200">{children}</ul>,
          ol: ({ children }) => <ol className="mt-4 ml-5 list-decimal space-y-2 text-zinc-200 break-words">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="mt-5 pl-4 border-l-4 border-amber-500 text-zinc-300">{children}</blockquote>,
          table: ({ children }) => <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm text-zinc-200">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-white/20 py-2 pr-4 font-bold text-white">{children}</th>,
          td: ({ children }) => <td className="border-b border-white/10 py-2 pr-4 align-top">{children}</td>,
          hr: () => <hr className="my-8 border-white/10" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  )
}
