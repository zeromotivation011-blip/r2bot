'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface BlogPostLite {
  slug: string
  title: string
  description: string
  date: string
  author: string
  authorRole: string
  tags: string[]
  readTime: number
  coverEmoji: string
  featured: boolean
  keywords: string[]
}

interface BlogPostFull extends BlogPostLite {
  content: string
}

const TAG_COLOR: Record<string, string> = {
  Beginner:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Career:      'bg-purple-500/15 text-purple-300 border-purple-500/30',
  Arduino:     'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Schools:     'bg-amber-500/15 text-amber-300 border-amber-500/30',
  India:       'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Hindi:       'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'AI & ML':   'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Tutorials:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
}
function tagClass(tag: string) { return TAG_COLOR[tag] || 'bg-white/[0.04] text-zinc-300 border-white/15' }

interface TocEntry { id: string; text: string; level: number }

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractToc(md: string): TocEntry[] {
  const out: TocEntry[] = []
  for (const line of md.split('\n')) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line)
    if (!m) continue
    const level = m[1].length
    const text = m[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
    out.push({ id: slugify(text), text, level })
  }
  return out
}

export default function BlogPostClient({ post, related, url }: { post: BlogPostFull; related: BlogPostLite[]; url: string }) {
  const toc = useMemo(() => extractToc(post.content), [post.content])
  const [helpfulVote, setHelpfulVote] = useState<'up' | 'down' | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(`r2bot_blog_vote_${post.slug}`)
      if (v === 'up' || v === 'down') setHelpfulVote(v)
    } catch {}
  }, [post.slug])

  const vote = (v: 'up' | 'down') => {
    setHelpfulVote(v)
    try { localStorage.setItem(`r2bot_blog_vote_${post.slug}`, v) } catch {}
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const tweet = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title + ' — ' + url)}`, '_blank', 'noopener')
  }
  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' — ' + url)}`, '_blank', 'noopener')
  }

  const authorInitial = post.author.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white pt-24 pb-20 px-4">
      <div className="mx-auto max-w-6xl">
        <Link href="/blog" className="text-sm text-blue-400 hover:text-blue-300">← All articles</Link>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
          {/* Article */}
          <article>
            <div className="text-7xl">{post.coverEmoji}</div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map(t => (
                <span key={t} className={`text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${tagClass(t)}`}>{t}</span>
              ))}
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-black text-white leading-[1.05]">{post.title}</h1>
            <p className="mt-3 text-lg text-zinc-300">{post.description}</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-zinc-400 border-y border-white/10 py-3">
              <span className="w-9 h-9 rounded-full grid place-items-center font-black text-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#f97316)', color: '#0a0a0f' }}>{authorInitial}</span>
              <span><strong className="text-white">{post.author}</strong> · {post.authorRole}</span>
              <span className="ml-auto text-zinc-500">{fmtDate(post.date)} · {post.readTime} min read</span>
            </div>

            <div className="prose-r2bot">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: () => null, // h1 already rendered above
                  h2: ({ children }) => {
                    const text = childrenToText(children); const id = slugify(text)
                    return <h2 id={id} className="mt-10 text-2xl md:text-3xl font-black text-white">{children}</h2>
                  },
                  h3: ({ children }) => {
                    const text = childrenToText(children); const id = slugify(text)
                    return <h3 id={id} className="mt-7 text-xl font-bold text-white">{children}</h3>
                  },
                  p: ({ children }) => <p className="mt-4 text-base leading-relaxed text-zinc-200">{children}</p>,
                  a: ({ href, children }) => (
                    <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{children}</a>
                  ),
                  ul: ({ children }) => <ul className="mt-4 ml-5 list-disc space-y-2 text-zinc-200">{children}</ul>,
                  ol: ({ children }) => <ol className="mt-4 ml-5 list-decimal space-y-2 text-zinc-200">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                  code: ({ children }) => <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                  blockquote: ({ children }) => (
                    <blockquote className="mt-5 pl-4 border-l-4 border-amber-500 text-zinc-300 italic">{children}</blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="bg-white/[0.04] text-left px-3 py-2 text-xs uppercase tracking-wider text-zinc-400">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 border-t border-white/10 text-zinc-200">{children}</td>,
                  hr: () => <hr className="my-8 border-white/10" />,
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Was this helpful */}
            <div className="mt-12 rounded-2xl border border-white/10 bg-[#111118] p-5 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-bold text-white">Was this article helpful?</p>
              <div className="flex gap-2">
                <button onClick={() => vote('up')}   className={`px-4 py-2 rounded-xl text-sm font-bold border ${helpfulVote === 'up'   ? 'bg-emerald-500 text-white border-emerald-500' : 'border-white/15 text-zinc-200 hover:border-emerald-500/50'}`}>👍 Yes</button>
                <button onClick={() => vote('down')} className={`px-4 py-2 rounded-xl text-sm font-bold border ${helpfulVote === 'down' ? 'bg-red-500 text-white border-red-500'           : 'border-white/15 text-zinc-200 hover:border-red-500/50'}`}>👎 Could be better</button>
              </div>
            </div>

            {/* Atlas CTA */}
            <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
              <p className="text-xs uppercase tracking-widest font-black text-blue-300">Learn deeper</p>
              <p className="mt-2 text-lg font-bold text-white">Master every concept mentioned in this article — for free.</p>
              <p className="mt-1 text-sm text-zinc-300">R2BOT's Atlas has 265+ robotics concepts explained in simple language with Indian examples.</p>
              <Link href="/atlas" className="mt-3 inline-block rounded-xl bg-blue-500 text-white px-4 py-2 text-sm font-bold">Explore R2BOT Atlas →</Link>
            </div>

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-12">
                <h3 className="text-xl font-black text-white">More articles</h3>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {related.map(r => (
                    <Link key={r.slug} href={`/blog/${r.slug}`} className="block rounded-xl border border-white/10 bg-[#111118] p-4 hover:border-blue-500/40">
                      <div className="text-2xl">{r.coverEmoji}</div>
                      <p className="mt-2 text-sm font-bold text-white leading-snug line-clamp-2">{r.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{r.readTime} min · {fmtDate(r.date)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Sidebar */}
          <aside className="md:sticky md:top-24 self-start space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Author</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grid place-items-center font-black text-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#f97316)', color: '#0a0a0f' }}>{authorInitial}</span>
                <div>
                  <p className="text-sm font-bold text-white">{post.author}</p>
                  <p className="text-xs text-zinc-400">{post.authorRole}</p>
                </div>
              </div>
            </div>

            {toc.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">On this page</p>
                <ol className="mt-2 space-y-1.5">
                  {toc.map(t => (
                    <li key={t.id} className={t.level === 3 ? 'pl-3' : ''}>
                      <a href={`#${t.id}`} className="text-sm text-zinc-300 hover:text-blue-300">{t.text}</a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Share</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={copy}     className="text-xs rounded-lg bg-white/[0.05] border border-white/15 text-zinc-200 px-3 py-1.5 hover:border-blue-500/40">{copied ? '✓ Copied' : '🔗 Copy link'}</button>
                <button onClick={tweet}    className="text-xs rounded-lg bg-white/[0.05] border border-white/15 text-zinc-200 px-3 py-1.5 hover:border-blue-500/40">𝕏 Twitter</button>
                <button onClick={whatsapp} className="text-xs rounded-lg bg-white/[0.05] border border-white/15 text-zinc-200 px-3 py-1.5 hover:border-emerald-500/40">WhatsApp</button>
              </div>
            </div>

            {related.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Related</p>
                <ul className="mt-2 space-y-2">
                  {related.map(r => (
                    <li key={r.slug}>
                      <Link href={`/blog/${r.slug}`} className="block text-sm text-zinc-300 hover:text-blue-300 leading-snug">
                        <span className="mr-1.5">{r.coverEmoji}</span>{r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}

function childrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(c => childrenToText(c as React.ReactNode)).join('')
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    return childrenToText(((children as { props: { children?: React.ReactNode } }).props).children)
  }
  return ''
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso }
}
