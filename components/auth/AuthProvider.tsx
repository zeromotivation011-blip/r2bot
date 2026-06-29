'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  grade?: string | null
  city?: string | null
  atlas_mastered_count?: number | null
  kids_stars?: number | null
  schools_missions_completed?: number | null
  streak_days?: number | null
  is_public?: boolean | null
  preferred_language?: string | null
  learning_goal?: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  openAuthModal: () => void
  isAuthModalOpen: boolean
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// localStorage keys we sync to the cloud after sign-in.
const SYNC_KEYS = [
  'r2bot_atlas_mastered',
  'r2bot_kids_v2',
  'r2bot_pulse_saved',
  'r2bot_pulse_watchlist',
  'r2bot_history_birth_year',
] as const

function readLocal<T = unknown>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    if (raw.startsWith('[') || raw.startsWith('{')) return JSON.parse(raw) as T
    return raw as unknown as T
  } catch { return null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) return null
    return data as Profile | null
  }, [])

  const syncLocalToCloud = useCallback(async (userId: string) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const rows: { user_id: string; progress_key: string; progress_data: unknown }[] = []
      for (const key of SYNC_KEYS) {
        const v = readLocal(key)
        if (v === null || v === undefined) continue
        rows.push({ user_id: userId, progress_key: key, progress_data: v as object })
      }
      if (rows.length === 0) return
      await supabase.from('user_progress_sync').upsert(rows, { onConflict: 'user_id,progress_key' })

      // Update profile counters from the synced data
      const mastered = readLocal<string[]>('r2bot_atlas_mastered') ?? []
      const kids    = readLocal<{ totalStars?: number; completedLevels?: string[] }>('r2bot_kids_v2')
      const updates: Partial<Profile> = {
        atlas_mastered_count: Array.isArray(mastered) ? mastered.length : 0,
        kids_stars: kids?.totalStars ?? 0,
      }
      await supabase
        .from('profiles')
        .update({ ...updates, last_active_at: new Date().toISOString() })
        .eq('id', userId)
    } catch {
      // Swallow — local sync is best-effort
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
  }, [user, fetchProfile])

  // Auth state listener
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let mounted = true

    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!mounted) return
      setUser(u ?? null)
      if (u) {
        const p = await fetchProfile(u.id)
        setProfile(p)
      }
      setIsLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const p = await fetchProfile(u.id)
        setProfile(p)
        if (event === 'SIGNED_IN') {
          // Fire-and-forget — the user can navigate while we sync.
          syncLocalToCloud(u.id)
        }
      } else {
        setProfile(null)
      }
    })

    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [fetchProfile, syncLocalToCloud])

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, profile, isLoading,
      signOut, refreshProfile,
      openAuthModal: () => setIsAuthModalOpen(true),
      closeAuthModal: () => setIsAuthModalOpen(false),
      isAuthModalOpen,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Default stub so components outside the provider (or during prerender) don't crash.
    return {
      user: null,
      profile: null,
      isLoading: false,
      signOut: async () => {},
      refreshProfile: async () => {},
      openAuthModal: () => {},
      closeAuthModal: () => {},
      isAuthModalOpen: false,
    }
  }
  return ctx
}
