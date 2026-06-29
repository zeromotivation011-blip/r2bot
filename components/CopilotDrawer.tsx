'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCopilot } from './CopilotProvider';
import { MiniLogo } from './MorphingLogo';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { inlineAtlasLinks, type TermMap } from '@/lib/inline-atlas-links';
import { UpgradeModal } from './UpgradeModal';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string; suggestions?: string[] };

type Track = 'spark' | 'wire' | 'forge' | 'edge';

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Hi! I'm R2 Co-pilot — the AI brain of R2BOT. Ask me anything about robotics, in any language, at any level. I'll explain it like you've never heard the terms before.\n\nTry one of the chips below, or type your own question.",
};

const QUICK_QS = [
  'What is SLAM?',
  'How does Optimus walk?',
  'Best robot kit for a 10-year-old',
  'Difference between AI and a robot',
];

const HISTORY_KEY = 'r2bot_copilot_history';
const RESUME_KEY = 'r2bot_copilot_resume';

function loadStoredHistory(): Message[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (m): m is Message =>
          !!m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string',
      )
      .slice(-16);
  } catch {
    return null;
  }
}

function parseSuggestions(text: string): { clean: string; suggestions: string[] } {
  const m = text.match(/\bSUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/);
  if (!m || m.index === undefined) return { clean: text, suggestions: [] };
  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(m[1]);
    if (Array.isArray(parsed)) {
      suggestions = parsed
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 3);
    }
  } catch {
    /* keep raw text, drop suggestions */
  }
  return { clean: text.slice(0, m.index).trimEnd(), suggestions };
}

// --- Speech recognition typings (Chrome / Edge) ---
type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
function getSpeechRecognition(): SRConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function CopilotDrawer() {
  const { open, closeDrawer, consumePrefill, pageContext, mode, setMode } = useCopilot();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [termMap, setTermMap] = useState<TermMap>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the rolling history in a ref too — avoids re-render bursts during streaming.
  const historyRef = useRef<Message[]>([WELCOME]);

  // --- Hydrate: session history, current_track, term map, voice support ---
  useEffect(() => {
    // 1) Resume payload takes precedence (from "Resume" on the dashboard).
    if (typeof window !== 'undefined') {
      const resume = sessionStorage.getItem(RESUME_KEY);
      if (resume) {
        try {
          const parsed = JSON.parse(resume);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const next = parsed
              .filter(
                (m: Message) =>
                  !!m &&
                  (m.role === 'user' || m.role === 'assistant') &&
                  typeof m.content === 'string',
              )
              .slice(-16);
            setMessages([WELCOME, ...next]);
            historyRef.current = [WELCOME, ...next];
            sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            sessionStorage.removeItem(RESUME_KEY);
          }
        } catch {
          sessionStorage.removeItem(RESUME_KEY);
        }
      } else {
        const stored = loadStoredHistory();
        if (stored && stored.length > 0) {
          setMessages([WELCOME, ...stored]);
          historyRef.current = [WELCOME, ...stored];
        }
      }
    }

    // 2) Voice support detection.
    setVoiceSupported(!!getSpeechRecognition());

    // 3) Pull track + signed-in state from Supabase profile.
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setSignedIn(!!user);
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('current_track')
          .eq('id', user.id)
          .maybeSingle();
        const t = data?.current_track;
        if (t === 'spark' || t === 'wire' || t === 'forge' || t === 'edge') {
          setCurrentTrack(t);
        }
      } catch {
        /* anonymous user — no problem */
      }
    })();

    // 4) Fetch Atlas term map for inline-link enrichment.
    (async () => {
      try {
        const res = await fetch('/api/atlas/terms');
        if (!res.ok) return;
        const json = (await res.json()) as TermMap;
        setTermMap(json);
      } catch {
        /* degrade silently */
      }
    })();
  }, []);

  // Mirror messages → historyRef + sessionStorage (skip the static welcome).
  useEffect(() => {
    historyRef.current = messages;
    if (typeof window === 'undefined') return;
    const toStore = messages.filter((m) => m !== WELCOME).slice(-16);
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(toStore));
    } catch {
      /* quota — ignore */
    }
  }, [messages]);

  // Focus input on open + handle prefill.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      const p = consumePrefill();
      if (p) {
        setInput(p);
        void send(p);
      }
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll on new message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // Save indicator — reset whenever messages change so it never gets stuck.
  useEffect(() => {
    if (saved) setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // --- Send a message to the API. ---
  const send = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || busy) return;
      setInput('');
      setBusy(true);

      // Last 4 (user/assistant) pairs from real history (drop welcome + any in-flight empty bubble).
      const realHistory = historyRef.current
        .filter((m) => m !== WELCOME && m.content.length > 0)
        .slice(-8);

      const apiHistory = realHistory.map((m) => ({ role: m.role, content: m.content }));

      const next: Message[] = [
        ...historyRef.current,
        { role: 'user', content: q },
        { role: 'assistant', content: '' },
      ];
      setMessages(next);

      try {
        const res = await fetch('/api/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: q,
            history: apiHistory,
            pageContext,
            mode,
            currentTrack,
            suggestions: true,
          }),
        });
        if (res.status === 429) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string; message?: string; upgradeUrl?: string; loginUrl?: string;
          };
          if (data.loginUrl) {
            // Anonymous user — inline CTA, no modal.
            const text =
              (data.error || "You've hit the free message limit.") +
              '\n\n[Sign in →](/login) · [Upgrade to Pro →](/pricing)';
            setMessages((curr) => {
              const updated = [...curr];
              updated[updated.length - 1] = { role: 'assistant', content: text };
              return updated;
            });
          } else {
            // Authenticated free user — open upgrade modal + brief inline notice.
            setUpgradeReason(data.error || "You've used your 10 free R2 messages today.");
            setUpgradeOpen(true);
            const text = data.message || data.error || 'Upgrade to Pro for unlimited R2.';
            setMessages((curr) => {
              const updated = [...curr];
              updated[updated.length - 1] = { role: 'assistant', content: text };
              return updated;
            });
          }
          return;
        }
        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || 'Co-pilot is offline. Check the ANTHROPIC_API_KEY env var.');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          setMessages((curr) => {
            const updated = [...curr];
            // While streaming we hide a SUGGESTIONS tail that's still incomplete by
            // stripping any line beginning with SUGGESTIONS: from the visible text.
            const visible = buf.replace(/\n?\s*SUGGESTIONS:[\s\S]*$/i, '');
            updated[updated.length - 1] = { role: 'assistant', content: visible };
            return updated;
          });
        }
        // Stream done — extract suggestions cleanly.
        const { clean, suggestions } = parseSuggestions(buf);
        setMessages((curr) => {
          const updated = [...curr];
          updated[updated.length - 1] = { role: 'assistant', content: clean, suggestions };
          return updated;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong.';
        setMessages((curr) => {
          const updated = [...curr];
          updated[updated.length - 1] = {
            role: 'assistant',
            content:
              `${msg}\n\nThis is expected if no ANTHROPIC_API_KEY is set in Vercel. ` +
              `Once configured, R2 Co-pilot answers live with Claude.`,
          };
          return updated;
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, currentTrack, mode, pageContext],
  );

  // --- Voice input ---
  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) finalText += txt;
        else interim += txt;
      }
      setInput((finalText + interim).trim());
      // 2-second silence timer auto-stops capture.
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => stopListening(), 2000);
    };
    rec.onerror = () => stopListening();
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [stopListening]);

  // --- Save conversation ---
  const handleSave = useCallback(async () => {
    if (!signedIn) {
      window.location.href = '/login?next=/';
      return;
    }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?next=/';
        return;
      }
      const payload = messages
        .filter((m) => m !== WELCOME && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }));
      if (payload.length === 0) return;
      const { error } = await supabase.from('copilot_sessions').insert({
        user_id: user.id,
        messages: payload,
        context_slug: pageContext?.title ?? null,
      });
      if (!error) setSaved(true);
    } catch {
      /* swallow — UI just won't show "saved" */
    } finally {
      setSaving(false);
    }
  }, [messages, pageContext, signedIn]);

  if (!open) return null;

  return (
    <div
      className="copilot-drawer open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
    >
      <div className="copilot-panel">
        <div className="copilot-head">
          <div className="copilot-head-l">
            <MiniLogo size={38} />
            <div>
              <div className="name">R2 Co-pilot</div>
              <div className="status">
                Online · Claude-powered
                {currentTrack && (
                  <>
                    {' · '}
                    <span style={{ color: 'var(--cyan)' }}>{currentTrack} track</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || messages.filter((m) => m !== WELCOME).length === 0}
              aria-label={signedIn ? 'Save this chat' : 'Sign in to save'}
              title={signedIn ? 'Save this chat' : 'Sign in to save →'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: saved ? 'var(--cyan-bright)' : 'var(--mist)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span aria-hidden="true">💾</span>
              {saving ? 'Saving…' : saved ? 'Saved' : signedIn === false ? 'Sign in to save' : 'Save chat'}
            </button>
            <button
              className="toast-close"
              onClick={closeDrawer}
              aria-label="Close"
              style={{ width: 36, height: 36, fontSize: 20 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Mode toggle — Answer vs Teach Me */}
        <div
          role="tablist"
          aria-label="Co-pilot mode"
          style={{
            display: 'inline-flex',
            margin: '4px 0 12px',
            padding: 3,
            borderRadius: 999,
            background: 'rgba(11,37,64,.55)',
            border: '1px solid var(--border)',
            alignSelf: 'flex-start',
          }}
        >
          {(['answer', 'teach'] as const).map((m) => {
            const isActive = mode === m;
            const label = m === 'answer' ? '💡 Answer' : '🎓 Teach Me';
            return (
              <button
                key={m}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setMode(m);
                  if (m === 'teach') setBannerDismissed(false);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background: isActive ? 'var(--cyan)' : 'transparent',
                  color: isActive ? '#001318' : '#C8D0DC',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  letterSpacing: '.02em',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {mode === 'teach' && !bannerDismissed && (
          <div
            role="status"
            style={{
              marginBottom: 12,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,176,32,.10)',
              border: '1px solid rgba(255,176,32,.45)',
              color: 'var(--amber)',
              fontSize: 13,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{ flex: 1 }}>
              🎓 Teach Me mode — R2 will guide you with questions instead of answers.
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--amber)',
                cursor: 'pointer',
                fontSize: 16,
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>
        )}

        <div ref={scrollRef} style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            const rendered = m.role === 'assistant' ? inlineAtlasLinks(m.content, termMap) : m.content;
            return (
              <div key={i} className="copilot-msg">
                <div className={`copilot-avatar ${m.role === 'user' ? 'user' : ''}`}>
                  {m.role === 'user' ? 'You' : 'R2'}
                </div>
                <div className={`copilot-bubble-msg ${m.role === 'user' ? 'user' : ''}`}>
                  {m.content ? (
                    m.role === 'assistant' ? (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              const isInternal = href?.startsWith('/');
                              return (
                                <a
                                  href={href}
                                  target={isInternal ? '_blank' : '_blank'}
                                  rel="noopener noreferrer"
                                  style={{
                                    color: 'var(--cyan)',
                                    textDecoration: 'underline',
                                    textDecorationStyle: 'dotted',
                                  }}
                                >
                                  {children}
                                </a>
                              );
                            },
                            p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
                          }}
                        >
                          {rendered}
                        </ReactMarkdown>
                        {m.suggestions && m.suggestions.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap',
                              marginTop: 10,
                            }}
                          >
                            {m.suggestions.map((s) => (
                              <button
                                key={s}
                                onClick={() => void send(s)}
                                disabled={busy}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 999,
                                  border: '1px solid var(--border-2)',
                                  background: 'rgba(11,37,64,.5)',
                                  color: '#C8D0DC',
                                  fontSize: 12.5,
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  transition: 'all .15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--cyan)';
                                  e.currentTarget.style.color = 'var(--cyan-bright)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--border-2)';
                                  e.currentTarget.style.color = '#C8D0DC';
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      m.content
                    )
                  ) : busy && isLast ? (
                    <span className="mono" style={{ color: 'var(--cyan)' }}>
                      R2 thinking…
                    </span>
                  ) : (
                    ''
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="copilot-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          {voiceSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-label={listening ? 'Stop listening' : 'Voice input'}
              title="Voice input (Chrome only)"
              style={{
                background: listening ? 'rgba(255,72,72,.18)' : 'transparent',
                border: `1px solid ${listening ? '#ff5757' : 'var(--border)'}`,
                color: listening ? '#ff5757' : 'var(--mist)',
                borderRadius: 999,
                width: 36,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginRight: 6,
                animation: listening ? 'r2VoicePulse 1s ease-in-out infinite' : 'none',
              }}
            >
              <style>{`
                @keyframes r2VoicePulse {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(255,87,87,.55); }
                  50% { box-shadow: 0 0 0 6px rgba(255,87,87,0); }
                }
              `}</style>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? 'Listening…' : 'What is a quadruped robot?'}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()}>
            {busy ? '...' : 'Send'}
          </button>
        </form>

        <div className="copilot-quick">
          {QUICK_QS.map((q) => (
            <button key={q} className="chip" onClick={() => void send(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}
