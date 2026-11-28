// scripts/kids-app/overrides/app/not-found.tsx — "page not found" inside the app
// (www/404.html). The website's 404 loads the adult nav and the Co-pilot; this
// one is a calm kids page with one way home.

import Link from 'next/link'

export default function AppNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A1120] px-6 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/kids-icon.svg" alt="" width={72} height={72} />
      <h1 className="mt-4 font-display text-3xl font-bold">This robot got lost</h1>
      <p className="mt-2 max-w-md text-lg text-[#C9D1DE]">That page is not in the app. Everything else is waiting for you at home.</p>
      <Link href="/kids/" className="mt-6 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-6 text-lg font-bold text-[#1A1103] hover:bg-amber-400">
        Back to R2BOT Kids
      </Link>
    </main>
  )
}
