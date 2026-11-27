// lib/kids/classroom-pdf.ts
//
// BROWSER ONLY. Classroom PDFs, made on the device with jsPDF (loaded with
// import() on the click, so it never sits in a first-load bundle):
//   - downloadGradebookPdf()      children × concepts (A4 landscape), roadmap #31
//   - downloadStandardsPdf()      one level's standards alignment (A4 portrait), #31
//   - downloadClassCertificate()  the Class Power-Up certificate (A4 landscape), #40
// Nothing is uploaded. Nicknames and class names may be in any script, so they
// are drawn with the system font on a canvas and placed as images; fixed text
// goes through pdfSafe() from the teacher-guide PDFs.

import type { jsPDF as JsPdf } from 'jspdf'
import { longDate, pdfSafe } from './teach/pdf'
import { CONCEPT_INFO, STATUS_LABEL, type ConceptId } from './universe/mastery'
import { STATUS_STYLE, type GradeRow } from './classroom-insights'
import type { ClassGoal } from './classroom-goal'
import type { StandardsLevel } from './classroom-standards'

type RGB = [number, number, number]
const NAVY: RGB = [10, 17, 32]
const ORANGE: RGB = [252, 104, 24]
const ORANGE_DARK: RGB = [194, 65, 12]
const INK: RGB = [26, 32, 44]
const GREY: RGB = [90, 100, 116]
const RULE: RGB = [200, 205, 214]

async function newDoc(orientation: 'portrait' | 'landscape'): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ orientation, unit: 'mm', format: 'a4' })
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'class'
}

/** Any-script text as a PNG (system font), sized in mm. Null outside a browser. */
function textImage(text: string, px: number, color: RGB, weight: number, maxWidthMm: number): { url: string; w: number; h: number } | null {
  if (typeof document === 'undefined') return null
  const scale = 3
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const font = `${weight} ${px * scale}px "Space Grotesk", "Segoe UI", system-ui, -apple-system, "Noto Sans", sans-serif`
  ctx.font = font
  const width = Math.ceil(ctx.measureText(text).width) + 4 * scale
  const height = Math.ceil(px * 1.4 * scale)
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  ctx.font = font
  ctx.fillStyle = `rgb(${color.join(',')})`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 2 * scale, height / 2)
  let w = (width / scale) * 0.2646
  let h = (height / scale) * 0.2646
  if (w > maxWidthMm) {
    h *= maxWidthMm / w
    w = maxWidthMm
  }
  return { url: canvas.toDataURL('image/png'), w, h }
}

/** Free text (a nickname, a class name): exact in Helvetica when it can be, else as an image. */
function freeText(doc: JsPdf, text: string, x: number, yMid: number, sizePt: number, color: RGB, maxWidthMm: number, align: 'left' | 'center' | 'right' = 'left', bold = true): void {
  if (pdfSafe(text) === text) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(sizePt)
    doc.setTextColor(...color)
    const fitted = doc.splitTextToSize(text, maxWidthMm) as string[]
    doc.text(fitted[0] ?? '', x, yMid, { align, baseline: 'middle' })
    return
  }
  const img = textImage(text, sizePt * 1.33, color, bold ? 800 : 500, maxWidthMm)
  if (!img) return
  const left = align === 'center' ? x - img.w / 2 : align === 'right' ? x - img.w : x
  doc.addImage(img.url, 'PNG', left, yMid - img.h / 2, img.w, img.h)
}

function footer(doc: JsPdf, W: number, H: number, page: number, note: string): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GREY)
  doc.text(pdfSafe(note), 12, H - 7)
  doc.text(`Page ${page}`, W - 12, H - 7, { align: 'right' })
}

// ── Gradebook ────────────────────────────────────────────────────────────────

export interface GradebookPdfInput {
  className: string
  teacherName: string | null
  rows: readonly GradeRow[]
  concepts: readonly ConceptId[]
  date: Date
}

export async function downloadGradebookPdf(g: GradebookPdfInput): Promise<void> {
  const doc = await newDoc('landscape')
  const W = 297
  const H = 210
  const M = 12
  const nameW = 42
  const perPage = 14 // concepts per page width
  const conceptPages: ConceptId[][] = []
  for (let i = 0; i < g.concepts.length; i += perPage) conceptPages.push(g.concepts.slice(i, i + perPage))
  if (!conceptPages.length) conceptPages.push([])
  let page = 0

  const header = (cols: ConceptId[], first: boolean) => {
    page += 1
    if (!first) doc.addPage()
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text('R2BOT Kids · Gradebook by concept', M, 10)
    freeText(doc, g.className, W - M, 10, 11, [255, 168, 120], 120, 'right')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GREY)
    const legend = `${pdfSafe(longDate(g.date))}${g.teacherName && pdfSafe(g.teacherName) === g.teacherName ? ` · ${g.teacherName}` : ''} · S = secure, L = learning, F = needs a recharge, · = not started, ! = finding it hard. Evidence: first-try wins / tries.`
    doc.text(legend, M, 22)
    const colW = cols.length ? (W - 2 * M - nameW) / cols.length : 0
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...INK)
    cols.forEach((id, i) => {
      const x = M + nameW + i * colW + colW / 2
      const lines = doc.splitTextToSize(pdfSafe(CONCEPT_INFO[id].name), colW - 1.5) as string[]
      lines.slice(0, 2).forEach((l, li) => doc.text(l, x, 29 + li * 3.4, { align: 'center' }))
    })
    doc.setDrawColor(...RULE)
    doc.line(M, 34.5, W - M, 34.5)
    return colW
  }

  const rowH = 9.2
  conceptPages.forEach((cols, pi) => {
    let colW = header(cols, pi === 0)
    let y = 37
    for (const r of g.rows) {
      if (y + rowH > H - 14) {
        footer(doc, W, H, page, 'Concept status from first-try wins in the Skill Galaxy (3 wins, 3 activities, 2 kinds, 21 days = secure). Never a ranking.')
        colW = header(cols, false)
        y = 37
      }
      freeText(doc, r.member.nickname, M, y + rowH / 2, 9.5, INK, nameW - 3)
      cols.forEach((id, i) => {
        const c = r.cells[id]
        const st = STATUS_STYLE[c.status]
        const x = M + nameW + i * colW
        doc.setFillColor(...(r.hasData ? st.pdf : ([245, 246, 248] as RGB)))
        doc.roundedRect(x + 0.6, y + 0.6, colW - 1.2, rowH - 1.2, 1.2, 1.2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...INK)
        const letter = r.hasData ? `${c.status === 'new' ? '.' : st.letter}${c.needsHelp ? '!' : ''}` : '-'
        doc.text(letter, x + colW / 2, y + 4, { align: 'center' })
        if (r.hasData && c.tries > 0) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...GREY)
          doc.text(`${c.wins}/${c.tries}`, x + colW / 2, y + 7.4, { align: 'center' })
        }
      })
      y += rowH
    }
    if (!g.rows.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(...GREY)
      doc.text('No children have joined this class yet.', M, 46)
    }
    footer(doc, W, H, page, 'Concept status from first-try wins in the Skill Galaxy (3 wins, 3 activities, 2 kinds, 21 days = secure). Never a ranking.')
  })
  doc.save(`r2bot-kids-gradebook-${slug(g.className)}-${g.date.toISOString().slice(0, 10)}.pdf`)
}

// ── Standards (one level) ────────────────────────────────────────────────────

export async function downloadStandardsPdf(lv: StandardsLevel, siteUrl: string): Promise<void> {
  const doc = await newDoc('portrait')
  const W = 210
  const H = 297
  const M = 16
  const CW = W - 2 * M
  let y = 0
  let page = 1
  const note = `R2BOT Kids · Standards alignment · Level ${lv.level} (${lv.band}) · ${siteUrl}/kids/teach/standards`

  const ensure = (need: number) => {
    if (y + need <= H - 16) return
    footer(doc, W, H, page, note)
    doc.addPage()
    page += 1
    y = 18
  }
  const heading = (t: string) => {
    ensure(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(...ORANGE_DARK)
    doc.text(pdfSafe(t), M, y)
    y += 2
    doc.setDrawColor(...ORANGE)
    doc.setLineWidth(0.4)
    doc.line(M, y, M + 24, y)
    y += 5
  }
  const para = (t: string, size = 9.5, color: RGB = INK, indent = 0) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(pdfSafe(t), CW - indent) as string[]
    for (const l of lines) {
      ensure(5)
      doc.text(l, M + indent, y)
      y += size * 0.45
    }
    y += 1.2
  }
  const item = (code: string, text: string, sessions: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    const codeW = code ? Math.max(22, doc.getTextWidth(pdfSafe(code)) + 3) : 0
    const lines = doc.splitTextToSize(pdfSafe(text), CW - codeW) as string[]
    const sl = sessions ? (doc.splitTextToSize(pdfSafe(sessions), CW - codeW) as string[]) : []
    ensure((lines.length + sl.length) * 4.4 + 2)
    if (code) {
      doc.setTextColor(...NAVY)
      doc.text(pdfSafe(code), M, y)
    }
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    lines.forEach((l, i) => doc.text(l, M + codeW, y + i * 4.3))
    y += lines.length * 4.3
    doc.setFontSize(8.3)
    doc.setTextColor(...GREY)
    sl.forEach((l, i) => doc.text(l, M + codeW, y + i * 3.8))
    y += sl.length * 3.8 + 2
  }

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 34, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 168, 120)
  doc.text(pdfSafe(`R2BOT KIDS · LEVEL ${lv.level} · ${lv.band.toUpperCase()} · AGES ${lv.ages}`), M, 12)
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(pdfSafe(`Standards alignment: ${lv.season}`), M, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(220, 226, 236)
  doc.text(pdfSafe(`${lv.sessionCount} sessions of 40 minutes · CSTA ${lv.cstaLevel} (${lv.cstaGrades})`), M, 29)
  y = 44

  heading('CSTA K-12 Computer Science Standards (2017)')
  for (const s of lv.csta) item(s.id, `${s.summary}${s.focus ? '' : ' (contributes)'}`, `Sessions: ${s.sessions.join(', ')}`)
  if (lv.cstaNotCovered.length) {
    para('Not covered:', 9, GREY)
    for (const n of lv.cstaNotCovered) para(`- ${n}`, 8.8, GREY, 3)
  }
  heading('NGSS (engineering design and physical science)')
  if (lv.ngss.length) for (const s of lv.ngss) item(s.id, s.summary, `Sessions: ${s.sessions.join(', ')}`)
  else para('No direct NGSS performance expectation at this level.', 9, GREY)
  heading('England: National Curriculum (computing; design and technology)')
  para(lv.uk.stage, 9, GREY)
  for (const s of lv.uk.statements) item(s.subject, s.text, `Sessions: ${s.sessions.join(', ')}`)
  heading('India: NEP 2020 (in general terms; no codes exist)')
  para(lv.india.stage, 9, GREY)
  for (const t of lv.india.themes) para(`- ${t}`, 9, INK, 3)
  heading('Concepts across the level')
  for (const c of lv.concepts) item('', `${c.name}: ${c.spiral}`, `Sessions: ${c.sessions.join(', ')}`)
  y += 3
  para(lv.disclaimer, 8, GREY)
  footer(doc, W, H, page, note)
  doc.save(`r2bot-kids-standards-level-${lv.level}.pdf`)
}

// ── Class Power-Up certificate ───────────────────────────────────────────────

export interface ClassCertificateInput {
  className: string
  teacherName: string | null
  schoolName: string | null
  goal: ClassGoal
  done: number
  helpers: number
  date: Date
}

export async function downloadClassCertificate(c: ClassCertificateInput): Promise<void> {
  const doc = await newDoc('landscape')
  const W = 297
  const H = 210
  doc.setFillColor(255, 248, 242)
  doc.rect(0, 0, W, H, 'F')
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(1.6)
  doc.roundedRect(10, 10, W - 20, H - 20, 6, 6, 'S')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.4)
  doc.roundedRect(15, 15, W - 30, H - 30, 4, 4, 'S')

  // A simple flag (the class cosmetic at 100%).
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(1.2)
  doc.line(W / 2 - 10, 26, W / 2 - 10, 50)
  doc.setFillColor(...ORANGE)
  doc.triangle(W / 2 - 9.4, 27, W / 2 + 14, 33, W / 2 - 9.4, 39, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE_DARK)
  doc.text('CLASS POWER-UP COMPLETE', W / 2, 62, { align: 'center' })
  doc.setFontSize(12)
  doc.setTextColor(...GREY)
  doc.setFont('helvetica', 'normal')
  doc.text('This certificate is proudly presented to the whole class', W / 2, 72, { align: 'center' })
  freeText(doc, c.className, W / 2, 88, 30, NAVY, 230, 'center')
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.5)
  doc.line(W / 2 - 70, 98, W / 2 + 70, 98)

  const goalTitle = pdfSafe(c.goal.title) === c.goal.title ? `“${c.goal.title}”` : 'their class goal'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12.5)
  doc.setTextColor(...INK)
  const text = `Together, this class completed ${goalTitle}: ${c.done} things learned, built and solved against a target of ${c.goal.target}, between ${longDate(new Date(`${c.goal.start}T12:00:00`))} and ${longDate(new Date(`${c.goal.end}T12:00:00`))}. Every child's work filled the same meter.`
  const lines = doc.splitTextToSize(pdfSafe(text), 220) as string[]
  lines.slice(0, 4).forEach((l, i) => doc.text(l, W / 2, 110 + i * 6.2, { align: 'center' }))

  const who = [c.teacherName, c.schoolName].filter((x): x is string => !!x)
  if (who.length) freeText(doc, who.join(' · '), W / 2, 146, 12, GREY, 200, 'center', false)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text(pdfSafe(longDate(c.date)), W / 2, 158, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GREY)
  doc.text('A co-operative goal: one meter, no scores, no rankings. R2BOT Kids · r2bot.in/kids', W / 2, H - 26, { align: 'center' })
  doc.save(`r2bot-kids-class-power-up-${slug(c.className)}.pdf`)
}

/** Labels for the status legend (used by the gradebook UI and PDF together). */
export const STATUS_LEGEND = (['secure', 'learning', 'fading', 'new'] as const).map((s) => ({ status: s, label: STATUS_LABEL[s] }))
