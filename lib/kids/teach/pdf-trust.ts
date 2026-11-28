// lib/kids/teach/pdf-trust.ts
//
// BROWSER ONLY. downloadTrustPackPdf(): the School Trust & Privacy Pack
// (roadmap #43) as an A4 PDF, made on the device with jsPDF (imported on the
// click, never in a page's first load). Every word comes from ./trust-pack,
// the same data /kids/teach/trust renders, so the PDF and the page agree.
// Nothing is uploaded.

import type { jsPDF as JsPdf } from 'jspdf'
import { pdfSafe, savePdf } from './pdf'
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
  parentLetter,
  snapshotInventory,
} from './trust-pack'

type RGB = [number, number, number]
const NAVY: RGB = [10, 17, 32]
const ORANGE: RGB = [252, 104, 24]
const ORANGE_DARK: RGB = [180, 65, 10]
const INK: RGB = [26, 32, 44]
const GREY: RGB = [90, 100, 116]
const RULE: RGB = [210, 214, 222]

const W = 210
const H = 297
const M = 16
const CW = W - 2 * M

function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

class Writer {
  y = M
  page = 1
  constructor(readonly doc: JsPdf, readonly site: string) {}

  footer() {
    const d = this.doc
    d.setFont('helvetica', 'normal')
    d.setFontSize(8)
    d.setTextColor(...GREY)
    d.text(pdfSafe(`R2BOT Kids - School Trust & Privacy Pack v${TRUST_PACK_VERSION} (${longDate(TRUST_PACK_UPDATED)})`), M, H - 8)
    d.text(`${this.page}`, W - M, H - 8, { align: 'right' })
  }

  ensure(h: number) {
    if (this.y + h <= H - 16) return
    this.footer()
    this.doc.addPage()
    this.page++
    this.y = M
  }

  lines(text: string, size: number, width: number, bold = false): string[] {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    return this.doc.splitTextToSize(pdfSafe(text), width) as string[]
  }

  para(text: string, opts: { size?: number; bold?: boolean; color?: RGB; indent?: number; gap?: number } = {}) {
    const size = opts.size ?? 10
    const indent = opts.indent ?? 0
    const ls = this.lines(text, size, CW - indent, opts.bold)
    const lh = size * 0.45
    for (const l of ls) {
      this.ensure(lh)
      this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
      this.doc.setFontSize(size)
      this.doc.setTextColor(...(opts.color ?? INK))
      this.doc.text(l, M + indent, this.y + lh * 0.8)
      this.y += lh
    }
    this.y += opts.gap ?? 2
  }

  bullet(text: string, size = 10) {
    const ls = this.lines(text, size, CW - 6)
    const lh = size * 0.45
    ls.forEach((l, i) => {
      this.ensure(lh)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(size)
      this.doc.setTextColor(...INK)
      if (i === 0) {
        this.doc.setFillColor(...ORANGE)
        this.doc.circle(M + 1.6, this.y + lh * 0.55, 0.8, 'F')
      }
      this.doc.text(l, M + 6, this.y + lh * 0.8)
      this.y += lh
    })
    this.y += 1.2
  }

  h1(text: string) {
    this.ensure(16)
    this.y += 3
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(15)
    this.doc.setTextColor(...NAVY)
    this.doc.text(pdfSafe(text), M, this.y + 6)
    this.doc.setDrawColor(...ORANGE)
    this.doc.setLineWidth(0.8)
    this.doc.line(M, this.y + 8.5, M + 24, this.y + 8.5)
    this.y += 12
  }

  h2(text: string) {
    this.ensure(10)
    this.y += 1
    this.para(text, { size: 11.5, bold: true, color: ORANGE_DARK, gap: 1 })
  }

  /** A simple table: header row + rows, columns with fixed widths (mm), text wrapped per cell. */
  table(cols: { title: string; w: number }[], rows: string[][], size = 8.5) {
    const lh = size * 0.42
    const pad = 1.6
    const drawRow = (cells: string[], bold: boolean, fill: RGB | null) => {
      const wrapped = cells.map((c, i) => this.lines(c, size, cols[i].w - 2 * pad, bold))
      const h = Math.max(...wrapped.map((w) => w.length)) * lh + 2 * pad
      this.ensure(h)
      let x = M
      if (fill) {
        this.doc.setFillColor(...fill)
        this.doc.rect(M, this.y, CW, h, 'F')
      }
      wrapped.forEach((ls, i) => {
        this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
        this.doc.setFontSize(size)
        this.doc.setTextColor(...(bold ? NAVY : INK))
        ls.forEach((l, j) => this.doc.text(l, x + pad, this.y + pad + lh * (j + 0.8)))
        x += cols[i].w
      })
      this.doc.setDrawColor(...RULE)
      this.doc.setLineWidth(0.2)
      this.doc.line(M, this.y + h, M + CW, this.y + h)
      this.y += h
    }
    drawRow(cols.map((c) => c.title), true, [255, 240, 230])
    rows.forEach((r) => drawRow(r, false, null))
    this.y += 3
  }
}

export async function downloadTrustPackPdf(siteUrl: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = new Writer(doc, siteUrl)
  const host = siteUrl.replace(/^https?:\/\//, '')

  // Cover band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 52, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 52, W, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 168, 120)
  doc.text('R2BOT KIDS  -  FOR SCHOOLS', M, 18)
  doc.setFontSize(24)
  doc.setTextColor(255, 255, 255)
  doc.text('School Trust & Privacy Pack', M, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(220, 226, 236)
  doc.text(pdfSafe(`Version ${TRUST_PACK_VERSION}, ${longDate(TRUST_PACK_UPDATED)}  -  ${host}/kids/teach/trust  -  ${TRUST_CONTACT}`), M, 43)
  w.y = 62

  w.para('For school leaders, data protection officers and IT reviewers. This pack is generated from the R2BOT Kids code, so the data inventory below lists exactly the fields the software stores.', { size: 10.5, color: GREY, gap: 4 })

  w.h1('In one minute')
  ONE_MINUTE.forEach((t) => w.bullet(t))

  w.h1('Data inventory')
  w.para('Server-side tables (Supabase Postgres, row-level security on every table). Nothing about a child exists on the server until the child types a class code.', { gap: 3 })
  for (const t of SERVER_TABLES) {
    w.h2(t.table)
    w.para(`${t.purpose} Created: ${t.createdWhen}`, { size: 9.5 })
    w.table(
      [{ title: 'Field', w: 36 }, { title: 'What it holds', w: 82 }, { title: 'Who sees it', w: 40 }, { title: 'Personal?', w: CW - 158 }],
      t.fields.map((f) => [f.name, f.what, f.seenBy, f.personal]),
    )
  }
  w.h2('The progress snapshot (kids_class_members.snapshot)')
  w.para('Counters only. The server parses the snapshot against this fixed list, clamps every number and drops anything else.', { size: 9.5 })
  w.table(
    [{ title: 'Field', w: 36 }, { title: 'What it holds', w: 100 }, { title: 'Who sees it', w: CW - 136 }],
    snapshotInventory().map((f) => [f.name, f.what, f.seenBy]),
  )

  w.h1('What stays on the device')
  w.table(
    [{ title: 'What', w: 66 }, { title: 'Where', w: 50 }, { title: 'Sent to R2BOT?', w: CW - 116 }],
    DEVICE_ONLY.map((d) => [d.what, d.where, d.leaves]),
  )

  w.h1('Hosting and security')
  w.bullet(HOSTING.summary)
  w.bullet(HOSTING.noChildAccounts)
  w.bullet(HOSTING.analytics)
  w.bullet(HOSTING.region)

  w.h1('Retention and deletion')
  for (const t of SERVER_TABLES) {
    w.h2(t.table)
    w.para(`Retention: ${t.retention}`, { size: 9.5 })
    t.deletion.forEach((d) => w.bullet(d, 9.5))
  }

  w.h1('Subprocessors')
  w.table(
    [{ title: 'Subprocessor', w: 30 }, { title: 'Role', w: 50 }, { title: 'Data', w: 70 }, { title: 'When', w: CW - 150 }],
    SUBPROCESSORS.map((s) => [s.name, s.role, s.data, s.when]),
  )

  w.h1('COPPA, GDPR, UK Children’s Code and DPDP')
  w.para('These notes describe how R2BOT Kids is built. They are not legal advice and not a certification; your school’s own review decides.', { size: 9.5, color: GREY })
  for (const n of LAW_NOTES) {
    w.h2(`${n.law} - ${n.where}`)
    n.points.forEach((p) => w.bullet(p, 9.5))
    w.para(`What the school does: ${n.schoolAction}`, { size: 9.5, bold: true })
  }

  w.h1('Accessibility conformance')
  w.para(`${ACCESSIBILITY.standard}: ${ACCESSIBILITY.overall}.`, { bold: true })
  w.para(ACCESSIBILITY.basis, { size: 9.5 })
  w.table(
    [{ title: 'Area (WCAG)', w: 52 }, { title: 'Status', w: 30 }, { title: 'Notes', w: CW - 82 }],
    ACCESSIBILITY.rows.map((r) => [r.area, r.status, r.notes]),
  )
  w.para(ACCESSIBILITY.contact, { size: 9.5 })

  // The letter starts on its own page so a school can print just that page.
  w.footer()
  doc.addPage()
  w.page++
  w.y = M
  const letter = parentLetter()
  w.h1('Template letter for parents')
  w.para(`Subject: ${letter.subject}`, { bold: true, gap: 4 })
  letter.paragraphs.forEach((p) => w.para(p, { size: 10.5, gap: 3.5 }))
  w.footer()

  await savePdf(doc, 'r2bot-kids-school-trust-pack.pdf')
}
