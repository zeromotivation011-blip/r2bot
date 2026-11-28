// scripts/kids-app/overrides/app/kids/present/page.tsx — STANDALONE app only (scripts/kids-app/build-export.mjs copies it over the
// website's page in the scratch build). Present mode needs the R2BOT server, which the
// app does not have, so the app shows a calm note instead of an error.

import type { Metadata } from 'next'
import Link from 'next/link'
import { NeedsWebNote } from '@/components/kids/app/NeedsWebNote'

export const metadata: Metadata = { title: 'Present mode — R2BOT Kids', robots: { index: false, follow: false } }

export default function NeedsWebPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8">
      <NeedsWebNote as="h1" what="Present mode" />
      <Link href="/kids/" className="mt-6 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-6 text-lg font-bold text-[#1A1103] hover:bg-amber-400">
        Back to R2BOT Kids
      </Link>
    </div>
  )
}
