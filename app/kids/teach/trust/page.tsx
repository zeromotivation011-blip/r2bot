// app/kids/teach/trust/page.tsx — the School Trust & Privacy Pack (roadmap
// #43). Server component, SSG, indexable: school leaders and data protection
// officers search for "<product> privacy for schools", and this is the full
// text. The same data (lib/kids/teach/trust-pack.ts) makes the PDF.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import {
  ACCESSIBILITY,
  DEVICE_ONLY,
  HOSTING,
  LAW_NOTES,
  ONE_MINUTE,
  SERVER_TABLES,
  SUBPROCESSORS,
  TRUST_CONTACT,
  TRUST_PACK_UPDATED,
  TRUST_PACK_VERSION,
  TRUST_SECTIONS,
  parentLetter,
  snapshotInventory,
} from '@/lib/kids/teach/trust-pack'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import TrustActionsClient from './TrustActionsClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/trust`
const TITLE = 'R2BOT Kids School Trust & Privacy Pack: Data, Deletion, COPPA, GDPR, DPDP'
const DESCRIPTION =
  'Everything a school’s data protection review needs about R2BOT Kids: every field stored, who sees it, retention and deletion, hosting, subprocessors, COPPA, GDPR, UK Children’s Code and DPDP notes, WCAG 2.1 AA status and a template parent letter. PDF download.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'article', url: PAGE_URL, siteName: 'R2BOT', title: 'R2BOT Kids — School Trust & Privacy Pack', description: DESCRIPTION, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids trust pack' }] },
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-2xl font-bold text-white sm:text-3xl'
const th = 'border-b border-white/15 px-3 py-2 text-left text-sm font-bold text-white'
const td = 'border-b border-white/10 px-3 py-2 align-top text-[15px] leading-relaxed text-slate-300'

function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function TrustPackPage() {
  const letter = parentLetter()
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${PAGE_URL}#page`,
        name: TITLE,
        description: DESCRIPTION,
        url: PAGE_URL,
        inLanguage: 'en',
        dateModified: TRUST_PACK_UPDATED,
        author: authorRef(),
        audience: { '@type': 'EducationalAudience', educationalRole: 'administrator' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
          { '@type': 'ListItem', position: 2, name: 'For schools', item: `${BASE}/kids/schools` },
          { '@type': 'ListItem', position: 3, name: 'Trust & Privacy Pack', item: PAGE_URL },
        ],
      },
    ],
  }

  return (
    <article className="teach-doc mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav aria-label="Breadcrumb" className="teach-no-print text-sm">
        <Link href="/kids/schools" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">← R2BOT Kids for schools</Link>
      </nav>

      <header>
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">For schools · Version {TRUST_PACK_VERSION} · {prettyDate(TRUST_PACK_UPDATED)}</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl">School Trust &amp; Privacy Pack</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          Schools adopt classroom technology after a data review. This pack answers that review in one place: every field
          R2BOT Kids stores about a child or a teacher, who can see it, how long it is kept and how it is deleted, where it is
          hosted and who processes it, how the product lines up with children’s privacy law, how accessible it is today, and
          a letter you can send to parents. It is generated from the code itself, so the inventory lists exactly what the
          software stores.
        </p>
        <div className="teach-no-print mt-6"><TrustActionsClient /></div>
        <nav aria-label="Sections" className="teach-no-print mt-6">
          <ol className="flex flex-wrap gap-2">
            {TRUST_SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-bold text-white hover:bg-white/10">{s.title}</a></li>
            ))}
          </ol>
        </nav>
      </header>

      <section id="summary" className={`${card} mt-10 scroll-mt-4`} aria-labelledby="summary-h">
        <h2 id="summary-h" className={h2}>In one minute</h2>
        <ul className="mt-4 space-y-2">
          {ONE_MINUTE.map((t) => <li key={t} className="flex gap-2 text-[17px] text-slate-100"><span aria-hidden className="text-emerald-400">✓</span>{t}</li>)}
        </ul>
      </section>

      <section id="inventory" className="mt-12 scroll-mt-4" aria-labelledby="inv-h">
        <h2 id="inv-h" className={h2}>Data inventory</h2>
        <p className="mt-2 max-w-3xl text-[16px] text-slate-300">Server-side tables, in a Supabase Postgres database with row-level security on every table. Nothing about a child exists on the server until the child types a class code or someone saves a Robot Passport in the Garage.</p>
        {SERVER_TABLES.map((t) => (
          <div key={t.table} className={`${card} mt-5`}>
            <h3 className="font-display text-xl font-bold text-white"><code className="text-amber-300">{t.table}</code></h3>
            <p className="mt-1 text-[15px] text-slate-300">{t.purpose} <strong className="text-white">Created:</strong> {t.createdWhen}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead><tr><th scope="col" className={th}>Field</th><th scope="col" className={th}>What it holds</th><th scope="col" className={th}>Who sees it</th><th scope="col" className={th}>Personal?</th></tr></thead>
                <tbody>
                  {t.fields.map((f) => (
                    <tr key={f.name}><td className={`${td} font-mono text-sm text-white`}>{f.name}</td><td className={td}>{f.what}</td><td className={td}>{f.seenBy}</td><td className={td}>{f.personal}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div className={`${card} mt-5`}>
          <h3 className="font-display text-xl font-bold text-white">The progress snapshot</h3>
          <p className="mt-1 text-[15px] text-slate-300">What a child’s device sends to the class, and nothing more: the server reads it against this fixed list, clamps every number and drops anything else.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead><tr><th scope="col" className={th}>Field</th><th scope="col" className={th}>What it holds</th><th scope="col" className={th}>Who sees it</th></tr></thead>
              <tbody>
                {snapshotInventory().map((f) => (
                  <tr key={f.name}><td className={`${td} font-mono text-sm text-white`}>{f.name}</td><td className={td}>{f.what}</td><td className={td}>{f.seenBy}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="device" className={`${card} mt-12 scroll-mt-4`} aria-labelledby="dev-h">
        <h2 id="dev-h" className={h2}>What stays on the device</h2>
        <ul className="mt-4 space-y-3">
          {DEVICE_ONLY.map((d) => (
            <li key={d.what} className="text-[16px] text-slate-200"><strong className="text-white">{d.what}.</strong> {d.where}. <span className="text-slate-300">Sent to R2BOT: {d.leaves}.</span></li>
          ))}
        </ul>
      </section>

      <section id="hosting" className={`${card} mt-12 scroll-mt-4`} aria-labelledby="host-h">
        <h2 id="host-h" className={h2}>Hosting and security</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-slate-200">
          <li>{HOSTING.summary}</li>
          <li>{HOSTING.noChildAccounts}</li>
          <li>{HOSTING.analytics}</li>
          <li>{HOSTING.region}</li>
        </ul>
      </section>

      <section id="deletion" className="mt-12 scroll-mt-4" aria-labelledby="del-h">
        <h2 id="del-h" className={h2}>Retention and deletion</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SERVER_TABLES.map((t) => (
            <div key={t.table} className={card}>
              <h3 className="font-bold text-white"><code className="text-amber-300">{t.table}</code></h3>
              <p className="mt-1 text-[15px] text-slate-300"><strong className="text-white">Kept:</strong> {t.retention}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-slate-200">{t.deletion.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="subprocessors" className="mt-12 scroll-mt-4" aria-labelledby="sub-h">
        <h2 id="sub-h" className={h2}>Subprocessors</h2>
        <div className={`${card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[620px] border-collapse">
            <thead><tr><th scope="col" className={th}>Who</th><th scope="col" className={th}>Role</th><th scope="col" className={th}>Data</th><th scope="col" className={th}>When</th></tr></thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}><td className={`${td} font-bold text-white`}>{s.name}</td><td className={td}>{s.role}</td><td className={td}>{s.data}</td><td className={td}>{s.when}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] text-slate-300">
          Some browsers send speech typed with the microphone button to their maker to turn it into text (for example Chrome to
          Google). R2BOT receives only the text, and typing always works instead.
        </p>
      </section>

      <section id="law" className="mt-12 scroll-mt-4" aria-labelledby="law-h">
        <h2 id="law-h" className={h2}>COPPA, GDPR, UK Children’s Code and DPDP</h2>
        <p className="mt-2 max-w-3xl text-[15px] text-slate-300">How R2BOT Kids is built, law by law, and what the school does. These are notes, not legal advice or a certification: your school’s own review decides.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {LAW_NOTES.map((n) => (
            <div key={n.law} className={card}>
              <h3 className="font-display text-lg font-bold text-white">{n.law}</h3>
              <p className="text-sm font-semibold text-amber-300">{n.where}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-200">{n.points.map((p) => <li key={p}>{p}</li>)}</ul>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-300"><strong className="text-white">What the school does:</strong> {n.schoolAction}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="accessibility" className="mt-12 scroll-mt-4" aria-labelledby="a11y-h">
        <h2 id="a11y-h" className={h2}>Accessibility conformance</h2>
        <p className="mt-2 text-lg font-bold text-white">{ACCESSIBILITY.standard}: {ACCESSIBILITY.overall}</p>
        <p className="mt-1 max-w-3xl text-[15px] text-slate-300">{ACCESSIBILITY.basis}</p>
        <div className={`${card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[560px] border-collapse">
            <thead><tr><th scope="col" className={th}>Area</th><th scope="col" className={th}>Status</th><th scope="col" className={th}>Notes</th></tr></thead>
            <tbody>
              {ACCESSIBILITY.rows.map((r) => (
                <tr key={r.area}><td className={`${td} text-white`}>{r.area}</td><td className={`${td} whitespace-nowrap font-bold ${r.status === 'Supports' ? 'text-emerald-300' : 'text-amber-300'}`}>{r.status}</td><td className={td}>{r.notes}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[15px] text-slate-300">{ACCESSIBILITY.contact}</p>
      </section>

      <section id="letter" className={`${card} mt-12 scroll-mt-4 print:[break-before:page]`} aria-labelledby="letter-h">
        <h2 id="letter-h" className={h2}>Template letter for parents</h2>
        <p className="teach-no-print mt-1 text-sm text-slate-400">Copy it into your school’s letterhead and fill in the square brackets.</p>
        <div className="mt-4 rounded-2xl bg-white/[0.03] p-5">
          <p className="font-bold text-white">Subject: {letter.subject}</p>
          {letter.paragraphs.map((p) => <p key={p} className="mt-3 text-[16px] leading-relaxed text-slate-200">{p}</p>)}
        </div>
      </section>

      <footer className="teach-no-print mt-12 flex flex-wrap items-center gap-4">
        <TrustActionsClient compact />
        <p className="text-[15px] text-slate-300">Questions: <GrownUpLink href={`mailto:${TRUST_CONTACT}`} className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">{TRUST_CONTACT}</GrownUpLink> · <GrownUpLink href="/privacy#kids" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">Privacy policy (children’s section)</GrownUpLink></p>
      </footer>
    </article>
  )
}
