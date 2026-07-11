'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ROBOT_PARTS } from '@/lib/kids-world-data'

type Tab = 'overview' | 'atlas' | 'robot' | 'achievements'

interface ProgressBlob<T = unknown> { progress_key: string; progress_data: T; synced_at: string }

export default function ProfileClient() {
  const { user, profile, isLoading, refreshProfile, openAuthModal } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [progress, setProgress] = useState<ProgressBlob[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  // Redirect unauth users to home
  useEffect(() => {
    if (isLoading) return
    if (!user) { openAuthModal(); router.replace('/'); }
  }, [user, isLoading, router, openAuthModal])

  useEffect(() => {
    if (!user) return
    (async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('user_progress_sync')
        .select('progress_key, progress_data, synced_at')
        .eq('user_id', user.id)
      if (Array.isArray(data)) setProgress(data as ProgressBlob[])
    })()
  }, [user])

  const mastered = useMemo(() => {
    const row = progress.find(p => p.progress_key === 'r2bot_atlas_mastered')
    return Array.isArray(row?.progress_data) ? (row!.progress_data as string[]) : []
  }, [progress])

  const kids = useMemo(() => {
    const row = progress.find(p => p.progress_key === 'r2bot_kids_v2')
    return (row?.progress_data ?? {}) as {
      totalStars?: number
      completedLevels?: string[]
      completedZones?: string[]
      earnedParts?: string[]
      robotName?: string
    }
  }, [progress])

  const xp = (profile?.atlas_mastered_count ?? mastered.length) * 10
          + (profile?.kids_stars ?? kids.totalStars ?? 0) * 5
          + (profile?.streak_days ?? 0) * 20

  const initial = (profile?.display_name || user?.email || '?').slice(0, 1).toUpperCase()

  const togglePublic = async () => {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('profiles').update({ is_public: !profile?.is_public }).eq('id', user.id)
    refreshProfile()
  }

  const saveName = async () => {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('profiles').upsert({ id: user.id, display_name: nameDraft })
    setEditingName(false)
    refreshProfile()
  }

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] grid place-items-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white pt-24 pb-20 px-4">
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-white/10 bg-[#111118] p-5 h-fit">
          <div
            className="w-20 h-20 rounded-full grid place-items-center text-3xl font-black mx-auto"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#0a0a0f' }}
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : initial}
          </div>

          {editingName ? (
            <div className="mt-4 text-center">
              <input
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/15 rounded-lg px-3 py-1.5 text-center text-white"
              />
              <div className="flex gap-1 mt-2 justify-center">
                <button onClick={saveName} className="text-xs px-3 py-1 rounded-full bg-blue-500 text-white">Save</button>
                <button onClick={() => setEditingName(false)} className="text-xs px-3 py-1 rounded-full bg-[#1f1f2a] text-zinc-300">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameDraft(profile?.display_name || '') }}
              className="mt-4 text-center w-full font-bold text-lg text-white hover:text-amber-300"
            >
              {profile?.display_name || user.email?.split('@')[0] || 'Robotics Learner'}
            </button>
          )}
          <p className="text-center text-xs text-zinc-400">{user.email}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {profile?.grade && <span className="text-[10px] uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-full px-2 py-0.5 font-bold">Class {profile.grade}</span>}
            {profile?.city  && <span className="text-[10px] uppercase tracking-wider bg-white/[0.04] border border-white/10 text-zinc-300 rounded-full px-2 py-0.5 font-bold">{profile.city}</span>}
          </div>

          <div className="mt-5 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">XP</p>
            <p className="text-3xl font-black text-amber-400">{xp.toLocaleString()}</p>
          </div>

          {(profile?.streak_days ?? 0) > 0 && (
            <p className="mt-3 text-center text-sm text-orange-300 font-bold">🔥 {profile?.streak_days} day streak</p>
          )}

          <label className="mt-5 flex items-center justify-between text-xs text-zinc-300">
            <span>Public profile</span>
            <input
              type="checkbox"
              checked={!!profile?.is_public}
              onChange={togglePublic}
              className="accent-blue-500"
            />
          </label>

          <Link href="/profile/settings" className="mt-3 block text-center text-xs font-bold text-blue-400 hover:text-blue-300">⚙️ Settings →</Link>
        </aside>

        {/* Main */}
        <section>
          <div className="flex gap-1 border-b border-white/10 mb-5 overflow-x-auto">
            {(['overview', 'atlas', 'robot', 'achievements'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 ${
                  tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t === 'overview' ? 'Overview' : t === 'atlas' ? 'My Atlas' : t === 'robot' ? 'My Robot' : 'Achievements'}
              </button>
            ))}
          </div>

          {tab === 'overview' && <OverviewTab progress={progress} mastered={mastered} kids={kids} />}
          {tab === 'atlas'    && <AtlasTab mastered={mastered} />}
          {tab === 'robot'    && <RobotTab kids={kids} />}
          {tab === 'achievements' && <AchievementsTab mastered={mastered} kids={kids} streak={profile?.streak_days ?? 0} progress={progress} />}
        </section>
      </div>
    </main>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ progress, mastered, kids }: {
  progress: ProgressBlob[]
  mastered: string[]
  kids: { totalStars?: number; completedLevels?: string[] }
}) {
  const { user, refreshProfile, profile } = useAuth()
  const [goal, setGoal] = useState(profile?.learning_goal ?? '')
  useEffect(() => { setGoal(profile?.learning_goal ?? '') }, [profile?.learning_goal])

  const saveGoal = async () => {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('profiles').update({ learning_goal: goal }).eq('id', user.id)
    refreshProfile()
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Atlas Mastered" value={mastered.length} sub="/ 426 terms" />
        <StatCard label="Kids Stars"     value={kids.totalStars ?? 0} sub="from Robot World" />
        <StatCard label="Levels Done"    value={kids.completedLevels?.length ?? 0} sub="of 14 kids levels" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111118] p-5 mb-5">
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Recent activity</p>
        <ul className="mt-3 space-y-2">
          {progress.length === 0 && <li className="text-sm text-zinc-500">No synced progress yet — keep learning, this fills up automatically.</li>}
          {progress.slice(0, 5).map(p => (
            <li key={p.progress_key} className="flex items-center justify-between text-sm">
              <span className="text-zinc-200">📦 {p.progress_key.replace(/^r2bot_/, '').replace(/_/g, ' ')}</span>
              <span className="text-xs text-zinc-500">{new Date(p.synced_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111118] p-5">
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Learning goal</p>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          rows={3}
          placeholder="e.g. By December, master 50 Atlas terms and build my first robot arm."
          className="mt-2 w-full bg-[#0a0a0f] border border-white/15 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500"
        />
        <button onClick={saveGoal} className="mt-2 rounded-lg bg-blue-500 text-white px-4 py-2 text-sm font-bold">Save</button>
      </div>
    </>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">{label}</p>
      <p className="text-3xl font-black text-blue-400 mt-1">{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  )
}

// ─── Atlas tab ────────────────────────────────────────────────────────────
function AtlasTab({ mastered }: { mastered: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111118] p-5">
      <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">Atlas Mastered</p>
      <p className="mt-1 text-2xl font-black text-white">{mastered.length} <span className="text-zinc-500 text-base font-normal">/ 426 terms</span></p>
      <div className="mt-3 h-2 bg-black/40 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, (mastered.length / 426) * 100)}%` }} />
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {mastered.length === 0 ? (
          <p className="text-sm text-zinc-500">You haven\'t mastered any terms yet. Open the Atlas and tap "Mark mastered" on any term.</p>
        ) : mastered.map(slug => (
          <Link key={slug} href={`/atlas/concept/${slug}`} className="text-xs bg-[#0a0a0f] border border-white/10 text-zinc-200 px-2.5 py-1 rounded-full hover:border-amber-400/40">📚 {slug}</Link>
        ))}
      </div>
      <Link href="/atlas" className="mt-5 inline-block rounded-xl bg-blue-500 text-white px-4 py-2 text-sm font-bold">Keep learning →</Link>
    </div>
  )
}

// ─── Robot tab ────────────────────────────────────────────────────────────
function RobotTab({ kids }: {
  kids: { totalStars?: number; completedLevels?: string[]; completedZones?: string[]; earnedParts?: string[]; robotName?: string }
}) {
  const earned = new Set(kids.earnedParts ?? [])
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111118] p-5">
      <p className="text-xs uppercase tracking-widest text-purple-300 font-bold">{kids.robotName || 'My Robot'}</p>
      <p className="mt-1 text-2xl font-black text-white">⭐ {kids.totalStars ?? 0} stars</p>
      <p className="text-sm text-zinc-400">🔧 {(kids.earnedParts ?? []).length} / 6 robot parts collected</p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ROBOT_PARTS.map(p => {
          const owned = earned.has(p.id)
          return (
            <div key={p.id} className={`rounded-xl border p-3 text-center ${owned ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-[#0a0a0f]'}`}>
              <span className={`text-2xl ${owned ? '' : 'opacity-40 grayscale'}`}>{p.emoji}</span>
              <p className="mt-1 text-xs font-bold text-white">{p.name}</p>
              {!owned && <p className="text-[10px] text-zinc-500 mt-0.5">Locked</p>}
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ─── Achievements tab ─────────────────────────────────────────────────────
interface Badge { id: string; emoji: string; title: string; hint: string; unlocked: boolean; date?: string }

function AchievementsTab({ mastered, kids, streak, progress }: {
  mastered: string[]
  kids: { totalStars?: number; completedLevels?: string[]; earnedParts?: string[] }
  streak: number
  progress: ProgressBlob[]
}) {
  const pulseSaved = useMemo(() => {
    const row = progress.find(p => p.progress_key === 'r2bot_pulse_saved')
    return Array.isArray(row?.progress_data) ? (row!.progress_data as unknown[]).length : 0
  }, [progress])

  const badges: Badge[] = [
    { id: 'first-steps', emoji: '🌟', title: 'First Steps',  hint: 'Complete 1 Atlas term', unlocked: mastered.length >= 1 },
    { id: 'bookworm',    emoji: '📚', title: 'Bookworm',     hint: 'Master 10 Atlas terms', unlocked: mastered.length >= 10 },
    { id: 'scholar',     emoji: '🧠', title: 'Scholar',      hint: 'Master 50 Atlas terms', unlocked: mastered.length >= 50 },
    { id: 'robot-builder', emoji: '🤖', title: 'Robot Builder', hint: 'Collect all 6 robot parts', unlocked: (kids.earnedParts ?? []).length >= 6 },
    { id: 'on-fire',     emoji: '🔥', title: 'On Fire',       hint: 'Maintain a 7-day streak', unlocked: streak >= 7 },
    { id: 'top-class',   emoji: '🏆', title: 'Top of Class',  hint: 'Complete 5 school missions', unlocked: (kids.completedLevels?.length ?? 0) >= 5 },
    { id: 'world-explorer', emoji: '🌍', title: 'World Explorer', hint: 'Open the World Map 3+ times', unlocked: false },
    { id: 'news-junkie', emoji: '📰', title: 'News Junkie',   hint: 'Save 10 Pulse articles', unlocked: pulseSaved >= 10 },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {badges.map(b => (
        <div
          key={b.id}
          className={`rounded-2xl border p-4 text-center ${b.unlocked ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5' : 'border-white/10 bg-[#111118] grayscale opacity-70'}`}
        >
          <div className="text-3xl">{b.unlocked ? b.emoji : '?'}</div>
          <p className="mt-2 text-sm font-bold text-white">{b.title}</p>
          <p className="mt-1 text-[10px] text-zinc-400">{b.hint}</p>
          {b.unlocked && <p className="mt-1 text-[10px] text-amber-300 font-bold">UNLOCKED</p>}
        </div>
      ))}
    </div>
  )
}
