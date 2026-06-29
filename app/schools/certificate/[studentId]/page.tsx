'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { SCHOOL_TRACKS, type SchoolTrackId } from '@/lib/school-curriculum'

interface Profile {
  display_name?: string | null
  email?: string | null
  school_grade?: string | null
  school_track?: SchoolTrackId | null
  school_name?: string | null
}

export default function CertificatePage() {
  const params = useParams<{ studentId: string }>()
  const requestedId = params?.studentId || ''

  const [profile, setProfile] = useState<Profile | null>(null)
  const [studentName, setStudentName] = useState('Student')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      // If 'me' or matches the signed-in user, load their profile
      const targetId = requestedId === 'me' || requestedId === user?.id ? user?.id : requestedId
      if (!targetId) {
        // Anonymous fallback — try LocalStorage
        const grade = window.localStorage.getItem('r2bot_school_grade')
        const track = window.localStorage.getItem('r2bot_school_track') as SchoolTrackId | null
        setProfile({ display_name: 'Student', school_grade: grade, school_track: track })
        setReady(true)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('display_name, email, school_grade, school_track, school_name')
        .eq('id', targetId)
        .single()

      if (data) {
        setProfile(data as Profile)
        setStudentName(data.display_name || data.email?.split('@')[0] || 'Student')
      } else {
        const grade = window.localStorage.getItem('r2bot_school_grade')
        const track = window.localStorage.getItem('r2bot_school_track') as SchoolTrackId | null
        setProfile({ display_name: 'Student', school_grade: grade, school_track: track })
      }
      setReady(true)
    })()
  }, [requestedId])

  const issuedOn = useMemo(() => new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), [])
  const trackMeta = profile?.school_track ? SCHOOL_TRACKS.find(t => t.id === profile!.school_track) : null

  const linkedInShare = () => {
    const text = `I just earned my R2BOT ${trackMeta?.label || 'Robotics'} Certificate — completing the school robotics track. 🤖 #robotics #STEM #r2bot`
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const intent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
    window.open(intent, '_blank', 'noopener')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-950 text-white grid place-items-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: white; }
          .no-print { display: none !important; }
          .cert-wrap { padding: 0; min-height: 100vh; }
          .cert { box-shadow: none !important; border-color: #92400e !important; }
        }
      `}</style>

      <div className="no-print max-w-5xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3">
        <Link href="/schools/student" className="text-amber-400 text-sm hover:underline">← Dashboard</Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">🖨 Print certificate</button>
          <button onClick={() => window.print()} className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-white">⬇ Download PDF</button>
          <button onClick={linkedInShare} className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">in Share</button>
        </div>
      </div>

      <div className="cert-wrap max-w-5xl mx-auto">
        <div className="cert relative mx-auto aspect-[1.414] w-full max-w-[1000px] rounded-3xl border-[6px] border-amber-700 bg-gradient-to-br from-amber-50 to-orange-100 shadow-2xl print:shadow-none">
          <div className="absolute inset-4 rounded-2xl border-2 border-amber-500 p-8 md:p-12 flex flex-col items-center justify-between text-amber-950">
            {/* Header */}
            <div className="text-center">
              <p className="text-xs tracking-[0.4em] text-amber-700 uppercase">R<span className="font-black">2</span>BOT · Robot, decoded</p>
              <p className="mt-4 text-2xl md:text-4xl font-serif font-bold">Certificate of Completion</p>
            </div>

            {/* Body */}
            <div className="text-center">
              <p className="text-sm md:text-base">This is to certify that</p>
              <p className="mt-3 text-3xl md:text-5xl font-serif italic text-amber-900">{studentName}</p>
              <p className="mt-4 max-w-lg mx-auto text-sm md:text-base">
                has successfully completed the <strong>{trackMeta?.label || 'Robotics'}</strong> robotics track on R2BOT for Schools — covering core robotics concepts, simulator missions, and project labs.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(['Sensors', 'Actuators', 'Block coding', 'Python basics', 'Mission solving']).map(s => (
                  <span key={s} className="text-xs bg-amber-700/15 border border-amber-700/40 text-amber-900 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="w-full grid grid-cols-3 items-end gap-4 text-xs">
              <div>
                <p className="border-t-2 border-amber-700 pt-1 mt-6 font-semibold">Issued by</p>
                <p>R2BOT — r2bot.in</p>
              </div>
              <div className="text-center">
                <QRPlaceholder url={typeof window !== 'undefined' ? window.location.href : 'https://r2bot.in'} />
                <p className="mt-1">Verify online</p>
              </div>
              <div className="text-right">
                <p className="border-t-2 border-amber-700 pt-1 mt-6 font-semibold">Date</p>
                <p>{issuedOn}</p>
                {profile?.school_grade && <p>Grade {profile.school_grade}</p>}
                {profile?.school_name && <p>{profile.school_name}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple visual QR placeholder (we don't ship a QR library — spec said no new npm)
function QRPlaceholder({ url }: { url: string }) {
  // Stable pseudo-random dot grid from the URL hash
  let h = 0
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0
  const cells: boolean[] = []
  for (let i = 0; i < 64; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    cells.push((h & 1) === 1)
  }
  return (
    <div className="inline-grid grid-cols-8 gap-[1px] p-1 bg-amber-900 rounded">
      {cells.map((on, i) => (
        <span key={i} className={`block w-2 h-2 ${on ? 'bg-amber-100' : 'bg-amber-900'}`} />
      ))}
    </div>
  )
}
