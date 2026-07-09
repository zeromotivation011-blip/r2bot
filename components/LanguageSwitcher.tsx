'use client';

// Instant, all-language switcher. Drives a hidden Google Translate element so any
// page translates on the fly with no backend, no API key, and no per-language build.
// The default Google chrome is hidden in globals.css; this renders a native-looking
// dark dropdown that sets the `googtrans` cookie and reloads (the only reliable way
// to persist a choice across Next.js client-side navigation).

import { useEffect, useRef, useState } from 'react';

type Lang = { code: string; label: string; flag: string };

// A broad, high-demand set. Google supports 100+; these cover R2BOT's global audience.
const LANGS: Lang[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

const SCRIPT_ID = 'google-translate-script';

function readGoogtrans(): string {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!m) return 'en';
  // Value is like "/en/hi" (URL-encoded slashes possible).
  const parts = decodeURIComponent(m[1]).split('/').filter(Boolean);
  return parts[parts.length - 1] || 'en';
}

function setGoogtrans(code: string) {
  const host = window.location.hostname;
  const value = `/en/${code}`;
  const bases =
    code === 'en'
      ? [`googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT`]
      : [`googtrans=${value}`];
  // Set on the exact host and on the registrable domain (.r2bot.in) so it sticks
  // across the apex and www.
  const domains = ['', `; domain=${host}`, `; domain=.${host.replace(/^www\./, '')}`];
  for (const base of bases) {
    for (const d of domains) {
      document.cookie = `${base}; path=/${d === '' ? '' : d}`;
    }
  }
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('en');
  const ref = useRef<HTMLDivElement>(null);

  // Inject the Google Translate element + script once.
  useEffect(() => {
    setCurrent(readGoogtrans());

    if (!document.getElementById('google_translate_element')) {
      const host = document.createElement('div');
      host.id = 'google_translate_element';
      host.setAttribute('aria-hidden', 'true');
      host.style.display = 'none';
      document.body.appendChild(host);
    }

    // Define the init callback Google calls when the script loads.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).googleTranslateElementInit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (g?.translate?.TranslateElement) {
        // eslint-disable-next-line no-new
        new g.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element',
        );
      }
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (code: string) => {
    setGoogtrans(code);
    setCurrent(code);
    setOpen(false);
    // Reload so Google applies (or clears) the translation cleanly.
    window.location.reload();
  };

  const active = LANGS.find((l) => l.code === current) ?? LANGS[0];

  return (
    <div ref={ref} className="notranslate" style={{ position: 'relative' }} translate="no">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 999,
          color: '#e2e8f0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          lineHeight: 1,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <span style={{ maxWidth: 74, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active.label}
        </span>
        <span aria-hidden style={{ opacity: 0.6, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 60,
            width: 210,
            maxHeight: 360,
            overflowY: 'auto',
            padding: 6,
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
          }}
        >
          {LANGS.map((l) => {
            const isActive = l.code === current;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => choose(l.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 10px',
                  background: isActive ? 'rgba(245,158,11,0.14)' : 'transparent',
                  border: 'none',
                  borderRadius: 9,
                  color: isActive ? '#fbbf24' : '#e2e8f0',
                  fontSize: 13.5,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>{l.flag}</span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {isActive && <span aria-hidden style={{ color: '#f59e0b' }}>✓</span>}
              </button>
            );
          })}
          <div
            style={{
              padding: '8px 10px 4px',
              fontSize: 11,
              color: '#64748b',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              marginTop: 4,
            }}
          >
            Machine translation · English is the source
          </div>
        </div>
      )}
    </div>
  );
}
