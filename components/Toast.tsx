'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastState = { id: number; msg: string };
type Ctx = { show: (msg: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const show = useCallback((msg: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 160,
          zIndex: 80,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              background: 'rgba(11,37,64,.95)',
              border: '1px solid var(--border-2)',
              color: 'var(--mist)',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,.4)',
              backdropFilter: 'blur(8px)',
              maxWidth: 320,
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  // Soft-fail if used outside provider — bookmark/understood components shouldn't crash a page.
  return ctx ?? { show: () => {} };
}
