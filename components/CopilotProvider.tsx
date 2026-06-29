'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type CopilotPageContext = { title: string; summary?: string; kind: 'atlas' | 'academy' | 'pulse' };

export type CopilotMode = 'answer' | 'teach';

type CopilotState = {
  open: boolean;
  openDrawer: () => void;
  openWith: (q: string) => void;
  closeDrawer: () => void;
  prefill: string | null;
  consumePrefill: () => string | null;
  pageContext: CopilotPageContext | null;
  setPageContext: (ctx: CopilotPageContext | null) => void;
  mode: CopilotMode;
  setMode: (m: CopilotMode) => void;
};

const MODE_KEY = 'r2bot_copilot_mode';

const Ctx = createContext<CopilotState | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<CopilotPageContext | null>(null);
  const [mode, setModeState] = useState<CopilotMode>('answer');

  // Rehydrate mode from localStorage on first mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      if (stored === 'teach' || stored === 'answer') setModeState(stored);
    } catch {
      /* localStorage blocked */
    }
  }, []);

  const setMode = useCallback((m: CopilotMode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* noop */
    }
  }, []);
  // Focus-restore: remember the element that opened the drawer.
  const triggerRef = useRef<HTMLElement | null>(null);

  const recordTrigger = useCallback(() => {
    const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (active && active.tagName !== 'BODY') triggerRef.current = active;
  }, []);

  const openDrawer = useCallback(() => {
    recordTrigger();
    setOpen(true);
  }, [recordTrigger]);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    // Restore focus to the element that triggered the open.
    const el = triggerRef.current;
    triggerRef.current = null;
    if (el && typeof el.focus === 'function') {
      // Defer so the drawer has unmounted/animated out.
      setTimeout(() => el.focus({ preventScroll: true }), 0);
    }
  }, []);

  const openWith = useCallback((q: string) => {
    recordTrigger();
    setPrefill(q);
    setOpen(true);
  }, [recordTrigger]);

  const consumePrefill = useCallback(() => {
    const p = prefill;
    setPrefill(null);
    return p;
  }, [prefill]);

  // Body scroll lock when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Auto-open if the URL says so — used by "Resume" links from Mission Control.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('copilot') === 'open') {
      setOpen(true);
      url.searchParams.delete('copilot');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // ⌘K / Ctrl+K — opens drawer; Escape closes (with focus restore).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) closeDrawer();
        else openDrawer();
      }
      if (e.key === 'Escape' && open) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openDrawer, closeDrawer]);

  return (
    <Ctx.Provider
      value={{
        open,
        openDrawer,
        openWith,
        closeDrawer,
        prefill,
        consumePrefill,
        pageContext,
        setPageContext,
        mode,
        setMode,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCopilot() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCopilot must be used inside CopilotProvider');
  return ctx;
}

/** Set a page-level context that primes R2 with what the user is reading. */
export function CopilotContextBinder({ context }: { context: CopilotPageContext }) {
  const { setPageContext } = useCopilot();
  useEffect(() => {
    setPageContext(context);
    return () => setPageContext(null);
  }, [context, setPageContext]);
  return null;
}
