'use client'

// components/kids/classroom/TeacherGateClient.tsx
// Shared states for the teacher pages: signed out (inline sign-in), the
// "being switched on" notice before migration 0054 runs, and a plain error.
// The sign-in panel is dynamic() so the auth bundle loads only when shown.

import dynamic from 'next/dynamic'
import Link from 'next/link'

const AuthPanel = dynamic(() => import('@/components/auth/AuthPanel').then((m) => m.AuthPanel), {
  ssr: false,
  loading: () => <div className="h-48 rounded-2xl bg-white/5" aria-hidden />,
})

export function TeacherSignIn({ next }: { next: string }) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-6 sm:p-8">
      <div className="text-5xl" aria-hidden>👩‍🏫</div>
      <h1 className="mt-3 text-2xl font-extrabold text-white">Sign in to run your classes</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
        Teachers use a normal R2BOT account. Children never need one — they join with a class code and a nickname.
      </p>
      <div className="mt-6">
        <AuthPanel mode="signin" next={next} />
      </div>
      <p className="mt-5 text-sm text-slate-400">
        Exploring for your school? Read <Link href="/kids/schools" className="font-semibold text-amber-300 underline-offset-2 hover:underline">R2BOT Kids for schools</Link>.
      </p>
    </div>
  )
}

export function ClassroomNotReady() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 text-center sm:p-8" role="status">
      <div className="text-5xl" aria-hidden>🛠️</div>
      <h1 className="mt-3 text-2xl font-extrabold text-white">Classrooms are being switched on</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-amber-100/90">
        We are getting class codes ready right now. Please try again a little later — everything else in R2BOT Kids works as normal.
      </p>
      <Link href="/kids" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 font-bold text-black hover:bg-amber-400">Back to R2BOT Kids</Link>
    </div>
  )
}

export function ClassroomError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-center" role="alert">
      <p className="text-base font-semibold text-red-100">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-[44px] rounded-xl border border-red-300/50 px-5 font-bold text-red-100 hover:bg-red-500/20">Try again</button>
    </div>
  )
}

export function ClassroomSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-10 w-64 rounded-xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-36 rounded-2xl bg-white/5" />
        <div className="h-36 rounded-2xl bg-white/5" />
        <div className="h-36 rounded-2xl bg-white/5" />
      </div>
    </div>
  )
}
