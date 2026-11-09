'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/** Only ever redirect to a path on this site. */
function safeNext(raw: string | null): string {
  // A leading `/\\` parses as a protocol-relative URL too, so reject both.
  if (!raw || !/^\/(?![\/\\])/.test(raw)) return '/dashboard'
  return raw
}

export function AuthCallbackClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = safeNext(params.get('next'))
    let cancelled = false

    const run = async () => {
      const supabase = createSupabaseBrowserClient()

      // Supabase puts errors in the fragment too (expired or already-used link).
      const hash = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
      )
      const hashError = hash.get('error_description') || hash.get('error')
      const queryError = params.get('error_description') || params.get('error')
      if (hashError || queryError) {
        setError(hashError || queryError)
        return
      }

      // OAuth and any PKCE link arrive as ?code=. Implicit magic links do not,
      // and supabase-js has already consumed the fragment by the time this runs.
      const code = params.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !cancelled) {
          setError(exchangeError.message)
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      if (data.session) {
        router.replace(next)
        return
      }

      // The fragment is read on an event, which can land after this effect.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && !cancelled) router.replace(next)
      })
      const timeout = window.setTimeout(() => {
        if (!cancelled) setError('That sign-in link has expired or has already been used.')
      }, 8000)

      return () => {
        sub.subscription.unsubscribe()
        window.clearTimeout(timeout)
      }
    }

    const cleanup = run()
    return () => {
      cancelled = true
      void cleanup.then((fn) => fn?.())
    }
  }, [params, router])

  return (
    <main className="r2-wrap r2-wrap--narrow" style={{ paddingBlock: '8rem', textAlign: 'center' }}>
      {error ? (
        <>
          <h1 className="r2-h2">That link didn&apos;t work</h1>
          <p className="r2-body" style={{ marginInline: 'auto', marginTop: '1rem' }}>{error}</p>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/login" className="r2-btn r2-btn--primary">Send a new link</Link>
          </p>
        </>
      ) : (
        <>
          <h1 className="r2-h2">Signing you in…</h1>
          <p className="r2-body" style={{ marginInline: 'auto', marginTop: '1rem' }}>
            One moment. If nothing happens,{' '}
            <Link href="/login" className="r2-link">request a new link</Link>.
          </p>
        </>
      )}
    </main>
  )
}
