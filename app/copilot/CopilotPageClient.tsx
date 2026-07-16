'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MODES, MODE_BY_ID, type CopilotMode } from './copilot-modes';
import { autoLinkAtlasTerms, findRelatedLesson } from './copilot-links';
import { UpgradeModal } from '@/components/UpgradeModal';
import { trackEvent } from '@/lib/analytics';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ratedAt?: number;
  rating?: 1 | -1 | null;
};

const HIGHLIGHTJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
const HIGHLIGHTJS_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';

declare global {
  interface Window {
    hljs?: { highlightElement: (el: HTMLElement) => void };
  }
}

function loadHighlightJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.hljs) return Promise.resolve();
  return new Promise((resolve) => {
    if (!document.querySelector(`link[href="${HIGHLIGHTJS_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = HIGHLIGHTJS_CSS;
      document.head.appendChild(link);
    }
    if (document.querySelector(`script[src="${HIGHLIGHTJS_CDN}"]`)) {
      // Already loading
      const checker = setInterval(() => {
        if (window.hljs) {
          clearInterval(checker);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = HIGHLIGHTJS_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

const RATING_KEY = 'r2bot-copilot-ratings-v1';

type RatingsAgg = { up: number; down: number };

function loadRatings(): RatingsAgg {
  if (typeof window === 'undefined') return { up: 0, down: 0 };
  try {
    const raw = localStorage.getItem(RATING_KEY);
    return raw ? (JSON.parse(raw) as RatingsAgg) : { up: 0, down: 0 };
  } catch {
    return { up: 0, down: 0 };
  }
}

function saveRatings(r: RatingsAgg) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RATING_KEY, JSON.stringify(r));
  } catch {
    // best-effort
  }
}

export function CopilotPageClient() {
  const [mode, setMode] = useState<CopilotMode>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<RatingsAgg>({ up: 0, down: 0 });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const modeDef = MODE_BY_ID.get(mode)!;

  useEffect(() => {
    loadHighlightJs();
    setRatings(loadRatings());
  }, []);

  // Auto-submit if /copilot?q=... is present (used by Atlas "Teach me this" links).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.trim().length > 0) {
      setInput(q);
      // Defer to next tick so input state is set before sendMessage reads history.
      const t = window.setTimeout(() => {
        sendMessage(q);
      }, 50);
      // Strip the query param so reloads don't re-fire.
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url.toString());
      } catch {
        // best-effort
      }
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Highlight any new code blocks after each render.
    if (typeof window === 'undefined' || !window.hljs) return;
    document.querySelectorAll('pre code').forEach((el) => {
      window.hljs!.highlightElement(el as HTMLElement);
    });
  }, [messages, loading]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed };
      const assistantId = crypto.randomUUID();
      const placeholder: Message = { id: assistantId, role: 'assistant', content: '' };
      setMessages((prev) => [...prev, userMsg, placeholder]);
      setInput('');
      setLoading(true);
      trackEvent('copilot_message', { surface: 'copilot_page' });

      try {
        const res = await fetch('/api/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
            modeSystemPrompt: modeDef.systemPrompt,
          }),
        });
        if (res.status === 429) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string; message?: string; upgradeUrl?: string; loginUrl?: string;
          };
          if (data.loginUrl) {
            const text =
              (data.error || "You've hit the free message limit.") +
              '\n\n[Sign in →](/login) · [Upgrade to Pro →](/pricing)';
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m)),
            );
          } else {
            setUpgradeReason(data.error || "You've used your 10 free R2 messages today.");
            setUpgradeOpen(true);
            const text = data.message || data.error || 'Upgrade to Pro for unlimited R2.';
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m)),
            );
          }
          return;
        }
        if (!res.body) throw new Error('No response body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: buf } : m)),
          );
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    '\n\n[Sorry — R2 had a hiccup reaching the model. Try again, and check that ANTHROPIC_API_KEY is configured.]',
                }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, modeDef.systemPrompt],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const onModeChange = (next: CopilotMode) => {
    if (next === mode) return;
    setMode(next);
    if (messages.length > 0) {
      // Keep history but signal mode change to user.
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `*Switched to ${MODE_BY_ID.get(next)!.label} mode.*`,
        },
      ]);
    }
  };

  const onRate = (msg: Message, rating: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, rating, ratedAt: Date.now() } : m)),
    );
    setRatings((prev) => {
      const next: RatingsAgg = {
        up: prev.up + (rating === 1 ? 1 : 0),
        down: prev.down + (rating === -1 ? 1 : 0),
      };
      saveRatings(next);
      return next;
    });
  };

  const onSaveChat = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const text = messages
      .map((m) => `## ${m.role === 'user' ? 'You' : 'R2'}\n\n${m.content}\n`)
      .join('\n');
    const header = `R2 Co-pilot conversation — ${new Date().toLocaleString()}\nMode: ${modeDef.label}\n\n`;
    const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `r2bot-chat-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ratingsTotal = ratings.up + ratings.down;
  const helpfulPct = ratingsTotal > 0 ? Math.round((ratings.up / ratingsTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4">
      {/* Header */}
      <header className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
          🤖 R2 Co-pilot · v2
        </span>
        <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
          Your AI Robotics{' '}
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
            Mentor
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-zinc-400">
          Debug ROS2 errors, decode papers, plan your first robot, or map out your career roadmap.
        </p>
        {ratingsTotal >= 5 ? (
          <p className="mt-2 text-xs text-zinc-500">
            {helpfulPct}% of {ratingsTotal} ratings found R2 helpful
          </p>
        ) : null}
      </header>

      {/* Mode selector */}
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/30'
              }`}
            >
              <span aria-hidden>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mb-4 text-center text-xs text-zinc-500">{modeDef.description}</p>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="mb-4 max-h-[58vh] min-h-[200px] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4"
      >
        {messages.length === 0 ? (
          <div className="py-10 text-center text-zinc-500">
            Pick a quick prompt below, or type your own question to get started.
          </div>
        ) : (
          <ul className="space-y-5">
            {messages.map((m) => (
              <li key={m.id}>
                {m.role === 'user' ? (
                  <UserBubble content={m.content} />
                ) : (
                  <AssistantBubble msg={m} onRate={onRate} />
                )}
              </li>
            ))}
            {loading ? <TypingIndicator /> : null}
          </ul>
        )}
      </div>

      {/* Quick prompts */}
      <div className="mb-3 flex flex-wrap gap-2">
        {modeDef.quickPrompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setInput(p)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-amber-400/40 hover:text-amber-200"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask R2 in ${modeDef.label} mode…`}
          aria-label="Ask R2"
          className="flex-1 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-400/60"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 font-bold text-[#1a0f00] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '…' : 'Send'}
        </button>
        <button
          type="button"
          onClick={onSaveChat}
          disabled={messages.length === 0}
          className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          title="Save chat to .txt"
        >
          💾 Save
        </button>
      </form>

      <p className="mt-3 text-center text-[11px] text-zinc-500">
        Powered by Anthropic Claude. R2 may be wrong — always verify safety-critical answers.
      </p>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-amber-500/15 px-4 py-2.5 text-sm text-amber-100">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ msg, onRate }: { msg: Message; onRate: (m: Message, r: 1 | -1) => void }) {
  const linked = useMemo(() => (msg.content ? autoLinkAtlasTerms(msg.content) : ''), [msg.content]);
  const related = useMemo(() => (msg.content ? findRelatedLesson(msg.content) : null), [msg.content]);

  const onShare = async () => {
    const shareText = `Ask R2BOT:\n\n${msg.content}\n\n— https://www.r2bot.in/copilot`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'R2 Co-pilot answer', text: shareText });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      }
    } catch {
      // user cancelled or share failed silently
    }
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] flex-1">
        <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100">
          <div className="prose prose-invert max-w-none prose-pre:m-0 prose-pre:rounded-xl prose-code:before:hidden prose-code:after:hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre(props) {
                  return <CodeBlockWithCopy {...(props as { children?: React.ReactNode })} />;
                },
                a(props) {
                  return (
                    <a
                      {...props}
                      target={(props.href || '').startsWith('/') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="text-amber-300 underline decoration-amber-400/40 hover:decoration-amber-400"
                    />
                  );
                },
              }}
            >
              {linked || (msg.content ? msg.content : '')}
            </ReactMarkdown>
          </div>
        </div>

        {msg.content && msg.content.length > 30 ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => onRate(msg, 1)}
              aria-pressed={msg.rating === 1}
              className={`rounded-md border px-2 py-1 transition-colors ${
                msg.rating === 1
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              👍 Helpful
            </button>
            <button
              type="button"
              onClick={() => onRate(msg, -1)}
              aria-pressed={msg.rating === -1}
              className={`rounded-md border px-2 py-1 transition-colors ${
                msg.rating === -1
                  ? 'border-red-400/50 bg-red-500/10 text-red-200'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              👎 Not really
            </button>
            <button
              type="button"
              onClick={onShare}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 transition-colors hover:border-white/30"
            >
              🔗 Share
            </button>
            {related ? (
              <a
                href={related.href}
                className="ml-auto rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-amber-200 hover:bg-amber-500/20"
              >
                📚 Want to go deeper? → {related.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CodeBlockWithCopy({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement | null>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort
    }
  };

  return (
    <div className="not-prose relative my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0c0f17]">
      <button
        type="button"
        onClick={onCopy}
        className="absolute right-2 top-2 z-10 rounded-md border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 hover:bg-black/60"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <pre ref={ref} className="overflow-x-auto p-4 text-xs leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function TypingIndicator() {
  return (
    <li className="flex justify-start">
      <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300 [animation-delay:.15s]" />
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300 [animation-delay:.3s]" />
          <span className="text-zinc-400">R2 is thinking…</span>
        </span>
      </div>
    </li>
  );
}
