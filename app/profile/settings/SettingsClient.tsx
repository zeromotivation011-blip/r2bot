'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SettingsClient() {
  const { user, profile, isLoading, refreshProfile, openAuthModal, signOut } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [bio,         setBio]         = useState('')
  const [city,        setCity]        = useState('')
  const [grade,       setGrade]       = useState('enthusiast')
  const [language,    setLanguage]    = useState('en')
  const [goal,        setGoal]        = useState('')

  const [profMsg, setProfMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwOld,  setPwOld]  = useState('')
  const [pwNew,  setPwNew]  = useState('')
  const [pwConf, setPwConf] = useState('')
  const [pwMsg,  setPwMsg]  = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Auth gate
  useEffect(() => {
    if (isLoading) return
    if (!user) { openAuthModal(); router.replace('/'); }
  }, [user, isLoading, router, openAuthModal])

  // Seed form values from profile
  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setBio(profile.bio ?? '')
    setCity(profile.city ?? '')
    setGrade(profile.grade ?? 'enthusiast')
    setLanguage(profile.preferred_language ?? 'en')
    setGoal(profile.learning_goal ?? '')
  }, [profile])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setProfMsg(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      bio, city, grade,
      preferred_language: language,
      learning_goal: goal,
    })
    if (error) setProfMsg({ type: 'err', text: error.message })
    else { setProfMsg({ type: 'ok', text: '✓ Saved' }); refreshProfile() }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwNew.length < 8) { setPwMsg({ type: 'err', text: 'New password must be at least 8 chars.' }); return }
    if (pwNew !== pwConf) { setPwMsg({ type: 'err', text: 'New passwords do not match.' }); return }
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    if (error) setPwMsg({ type: 'err', text: error.message })
    else {
      setPwMsg({ type: 'ok', text: '✓ Password updated' })
      setPwOld(''); setPwNew(''); setPwConf('')
    }
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
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <Link href="/profile" className="text-sm text-blue-400 hover:text-blue-300">← My profile</Link>
          <h1 className="mt-2 text-3xl font-black">Settings</h1>
          <p className="text-zinc-400 text-sm">Update your profile, change password, manage your account.</p>
        </div>

        {/* Profile form */}
        <form onSubmit={saveProfile} className="rounded-2xl border border-white/10 bg-[#111118] p-5 space-y-3">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <Field label="Display name"  value={displayName} onChange={setDisplayName} maxLength={40} />
          <Field label="Bio"           value={bio}         onChange={setBio} multiline maxLength={200} />
          <Field label="City"          value={city}        onChange={setCity} />
          <div>
            <Lbl>I am a…</Lbl>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="input">
              <option value="6">Class 6</option><option value="7">Class 7</option><option value="8">Class 8</option>
              <option value="9">Class 9</option><option value="10">Class 10</option><option value="11">Class 11</option>
              <option value="12">Class 12</option>
              <option value="teacher">Teacher</option><option value="parent">Parent</option>
              <option value="enthusiast">Enthusiast</option>
            </select>
          </div>
          <div>
            <Lbl>Preferred language</Lbl>
            <div className="flex gap-2">
              {[
                { v: 'en', l: 'English' },
                { v: 'hi', l: 'हिन्दी' },
              ].map(o => (
                <button
                  type="button"
                  key={o.v}
                  onClick={() => setLanguage(o.v)}
                  className={`px-3 py-1.5 text-sm rounded-full border ${language === o.v ? 'bg-blue-500 text-white border-blue-500' : 'border-white/15 bg-[#0a0a0f] text-zinc-300'}`}
                >{o.l}</button>
              ))}
            </div>
          </div>
          <Field label="Learning goal" value={goal} onChange={setGoal} multiline maxLength={200} />
          <button type="submit" className="rounded-xl bg-blue-500 text-white px-4 py-2 text-sm font-bold">Update profile</button>
          {profMsg && <Msg type={profMsg.type}>{profMsg.text}</Msg>}
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className="mt-6 rounded-2xl border border-white/10 bg-[#111118] p-5 space-y-3">
          <h2 className="text-lg font-bold text-white">Change password</h2>
          <Field label="Current password (informational only)" value={pwOld} onChange={setPwOld} type="password" />
          <Field label="New password (8+ chars)" value={pwNew} onChange={setPwNew} type="password" />
          <Field label="Confirm new password"   value={pwConf} onChange={setPwConf} type="password" />
          <button type="submit" className="rounded-xl bg-blue-500 text-white px-4 py-2 text-sm font-bold">Update password</button>
          {pwMsg && <Msg type={pwMsg.type}>{pwMsg.text}</Msg>}
        </form>

        {/* Danger zone */}
        <section className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="text-lg font-bold text-red-300">Danger zone</h2>
          <p className="text-sm text-zinc-300 mt-1">Delete your account. We don\'t retain your data after deletion — contact us so we can fully purge your records.</p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="mt-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-2 text-sm font-bold">Delete account</button>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-red-200">Are you sure? This signs you out — to finish deletion, email <a href="mailto:hello@r2bot.in" className="underline">hello@r2bot.in</a>.</p>
              <div className="flex gap-2">
                <button onClick={async () => { await signOut(); router.replace('/') }} className="rounded-xl bg-red-500 text-white px-4 py-2 text-sm font-bold">Sign me out</button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-xl border border-white/15 bg-[#0a0a0f] text-zinc-300 px-4 py-2 text-sm font-bold">Cancel</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: #0a0a0f;
          border: 1px solid #1f1f2a;
          color: #fff; font-size: 15px;
          padding: 9px 12px; border-radius: 10px;
          outline: none;
        }
        :global(.input:focus) { border-color: #3b82f6; }
      `}</style>
    </main>
  )
}

function Field({ label, value, onChange, multiline, type, maxLength }: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  type?: string
  maxLength?: number
}) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={maxLength}
          rows={3}
          className="input"
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={maxLength}
          className="input"
        />
      )}
    </div>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{children}</p>
}

function Msg({ type, children }: { type: 'ok' | 'err'; children: React.ReactNode }) {
  return (
    <p className={`mt-2 text-xs rounded-lg px-3 py-2 ${type === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
      {children}
    </p>
  )
}
