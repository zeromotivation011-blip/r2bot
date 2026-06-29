'use client'

// components/academy/MarkCompleteButton.tsx — Lesson completion toggle
// On first load, fetches lesson_completions to show the right initial state.
// On click, POSTs to /api/academy/complete-lesson.

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface MarkCompleteButtonProps {
  courseSlug: string
  lessonSlug: string
  xpReward?: number
}

export function MarkCompleteButton({ courseSlug, lessonSlug, xpReward = 50 }: MarkCompleteButtonProps) {
  const [state, setState] = useState<'idle' | 'submitting' | 'completed'>('idle')
  const [courseComplete, setCourseComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) { setAuthed(false); return }
        setAuthed(true)
        const { data } = await supabase
          .from('lesson_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_slug', courseSlug)
          .eq('lesson_slug', lessonSlug)
          .maybeSingle()
        if (!cancelled && data) setState('completed')
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [courseSlug, lessonSlug])

  const handleClick = async () => {
    setError(null)
    if (authed === false) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setState('submitting')
    try {
      const res = await fetch('/api/academy/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, lessonSlug, xpEarned: xpReward }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || 'Could not record completion.')
        setState('idle')
        return
      }
      setState('completed')
      if (json.courseComplete) setCourseComplete(true)
    } catch {
      setError('Network error — try again.')
      setState('idle')
    }
  }

  const isDone = state === 'completed'
  return (
    <div style={{ marginTop: 24, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'submitting' || isDone}
        aria-pressed={isDone}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          minHeight: 50, padding: '0 24px',
          background: isDone ? '#10b981' : '#fbbf24',
          color: isDone ? '#022c22' : '#1a0f00',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 900,
          cursor: state === 'submitting' || isDone ? 'default' : 'pointer',
          boxShadow: isDone ? 'none' : '0 8px 24px rgba(251,191,36,0.28)',
          opacity: state === 'submitting' ? 0.7 : 1,
        }}
      >
        {isDone ? 'Completed ✓' : state === 'submitting' ? 'Saving…' : 'Mark complete ✓'}
      </button>
      {error && <p style={{ marginTop: 10, color: '#fca5a5', fontSize: 13 }}>{error}</p>}
      {courseComplete && (
        <p style={{ marginTop: 12, color: '#34d399', fontWeight: 700, fontSize: 14 }}>
          🎉 Course complete! Check your dashboard for the certificate.
        </p>
      )}
    </div>
  )
}
