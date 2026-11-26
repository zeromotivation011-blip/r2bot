// lib/kids/teach/pdf.ts
//
// BROWSER ONLY. PDF downloads for R2BOT Kids teachers and children, made in
// the browser with jsPDF (already a dependency; loaded with import() on the
// click, so it never sits in a page's first-load bundle):
//   - downloadGuidePdf()            a session's teacher guide (A4 portrait)
//   - downloadTrainingCertificate() the teacher-training certificate (A4 landscape)
//   - downloadKidCertificate()      a child's level certificate (A4 landscape)
// Nothing is uploaded: names typed here stay on the device.
//
// jsPDF's built-in Helvetica only covers Western European text, so free-text
// NAMES (which may be in any script) are drawn onto a canvas with the
// system font and placed as an image; fixed text goes through pdfSafe().

import type { jsPDF as JsPdf } from 'jspdf'
import type { TeacherGuide } from './guides'

type RGB = [number, number, number]
const NAVY: RGB = [10, 17, 32]
const ORANGE: RGB = [252, 104, 24]
const ORANGE_DARK: RGB = [194, 65, 12]
const INK: RGB = [26, 32, 44]
const GREY: RGB = [90, 100, 116]
const LIGHT: RGB = [255, 244, 236]

const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'

/** Text Helvetica can print: arrows and stars become ASCII, anything else outside WinAnsi is dropped. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[→⟶➜]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[★⭐]/g, '*')
    .replace(/[✓✔]/g, 'v')
    .replace(/[×]/g, 'x')
    .replace(/[‘’]/g, (c) => c)
    .split('')
    .filter((c) => c.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.includes(c))
    .join('')
    .replace(/[ \t]+/g, ' ')
}

async function newDoc(orientation: 'portrait' | 'landscape'): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ orientation, unit: 'mm', format: 'a4' })
}

function save(doc: JsPdf, filename: string): void {
  doc.save(filename)
}

/** Draw text with the system font on a canvas (any script) and return it as a PNG with its size in mm. */
function textAsImage(text: string, opts: { px: number; color: string; weight?: number; maxWidthMm: number }): { url: string; w: number; h: number } | null {
  if (typeof document === 'undefined') return null
  const scale = 3
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const font = `${opts.weight ?? 800} ${opts.px * scale}px "Space Grotesk", "Segoe UI", system-ui, -apple-system, "Noto Sans", sans-serif`
  ctx.font = font
  const width = Math.ceil(ctx.measureText(text).width) + 8 * scale
  const height = Math.ceil(opts.px * 1.45 * scale)
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  ctx.font = font
  ctx.fillStyle = opts.color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 4 * scale, height / 2)
  // 1 CSS px at 96 dpi = 0.2646 mm.
  let w = (width / scale) * 0.2646
  let h = (height / scale) * 0.2646
  if (w > opts.maxWidthMm) {
    h = h * (opts.maxWidthMm / w)
    w = opts.maxWidthMm
  }
  return { url: canvas.toDataURL('image/png'), w, h }
}

function drawCentredName(doc: JsPdf, name: string, centreX: number, centreY: number, px: number, color: RGB, maxWidthMm: number): void {
  const img = textAsImage(name, { px, color: `rgb(${color.join(',')})`, maxWidthMm })
  if (img) {
    doc.addImage(img.url, 'PNG', centreX - img.w / 2, centreY - img.h / 2, img.w, img.h)
    return
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(px)
  doc.setTextColor(...color)
  doc.text(pdfSafe(name) || 'Explorer', centreX, centreY, { align: 'center', baseline: 'middle' })
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'r2bot'
}

export function longDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** A small Spark-style robot head, drawn with shapes (no image assets needed). */
function drawRobot(doc: JsPdf, x: number, y: number, size: number): void {
  const s = size
  doc.setFillColor(...ORANGE)
  doc.roundedRect(x, y + s * 0.12, s, s * 0.78, s * 0.18, s * 0.18, 'F')
  doc.setFillColor(...NAVY)
  doc.roundedRect(x + s * 0.12, y + s * 0.26, s * 0.76, s * 0.42, s * 0.12, s * 0.12, 'F')
  doc.setFillColor(0, 229, 255)
  doc.circle(x + s * 0.35, y + s * 0.47, s * 0.07, 'F')
  doc.circle(x + s * 0.65, y + s * 0.47, s * 0.07, 'F')
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(s * 0.04)
  doc.line(x + s * 0.5, y + s * 0.12, x + s * 0.5, y)
  doc.setFillColor(...ORANGE)
  doc.circle(x + s * 0.5, y, s * 0.06, 'F')
}

// ── Teacher guide ────────────────────────────────────────────────────────────

export async function downloadGuidePdf(g: TeacherGuide, siteUrl: string): Promise<void> {
  const doc = await newDoc('portrait')
  const W = 210
  const H = 297
  const M = 16
  const CW = W - M * 2
  let y = 0
  let page = 1

  const footer = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GREY)
    doc.text(pdfSafe(`R2BOT Kids · Teacher guide · Level 1, Session ${g.number}: ${g.title}`), M, H - 8)
    doc.text(`${siteUrl.replace(/^https?:\/\//, '')}${g.guideHref}  ·  page ${page}`, W - M, H - 8, { align: 'right' })
  }
  const newPage = () => {
    footer()
    doc.addPage()
    page++
    y = M
  }
  const ensure = (h: number) => {
    if (y + h > H - 16) newPage()
  }
  const lines = (text: string, size: number, width: number): string[] => {
    doc.setFontSize(size)
    return doc.splitTextToSize(pdfSafe(text), width) as string[]
  }
  const para = (text: string, opts: { size?: number; color?: RGB; bold?: boolean; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10
    const indent = opts.indent ?? 0
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    const ls = lines(text, size, CW - indent)
    const lh = size * 0.42
    for (const l of ls) {
      ensure(lh)
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...(opts.color ?? INK))
      doc.text(l, M + indent, y + lh * 0.8)
      y += lh
    }
    y += opts.gap ?? 1.6
  }
  const heading = (text: string, minutes?: number) => {
    ensure(16)
    y += 3
    doc.setFillColor(...ORANGE)
    doc.rect(M, y, 2.2, 6.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...NAVY)
    doc.text(pdfSafe(text), M + 5, y + 4.9)
    if (minutes) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...GREY)
      doc.text(`${minutes} min`, W - M, y + 4.9, { align: 'right' })
    }
    y += 9.5
  }
  const bullets = (items: string[], size = 10) => {
    for (const it of items) {
      doc.setFont('helvetica', 'normal')
      const ls = lines(it, size, CW - 6)
      const lh = size * 0.42
      ensure(lh * Math.min(ls.length, 3))
      doc.setFillColor(...ORANGE)
      doc.circle(M + 1.6, y + lh * 0.55, 0.8, 'F')
      for (const l of ls) {
        ensure(lh)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(size)
        doc.setTextColor(...INK)
        doc.text(l, M + 6, y + lh * 0.8)
        y += lh
      }
      y += 1.4
    }
    y += 1
  }

  // Header band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 38, 'F')
  drawRobot(doc, M, 9, 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ORANGE)
  doc.text(pdfSafe(`R2BOT KIDS · TEACHER GUIDE · LEVEL 1 · SESSION ${g.number} OF 24`), M + 24, 13)
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text(pdfSafe(g.title), M + 24, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(200, 210, 225)
  const sub = [g.act ? `Act: ${g.act.title}` : null, `${g.durationMin} minutes`, g.kind === 'project' ? 'Project session' : 'Lesson', 'Ages 5–7 (Explorers)'].filter(Boolean).join('  ·  ')
  doc.text(pdfSafe(sub), M + 24, 29)
  y = 46

  para(g.objective, { size: 11.5, bold: true, color: NAVY, gap: 2 })
  para(`Concepts: ${g.concepts.join(', ')}`, { size: 9, color: GREY, gap: 3 })

  heading('Learning objectives')
  bullets(g.objectives.map((o) => `${o.text}${o.discussionOnly ? ' (through discussion)' : ''} — “${o.kidText}”`))

  heading('The 40-minute plan')
  for (const t of g.timing) {
    doc.setFont('helvetica', 'normal')
    const ls = lines(t.activity, 9.5, CW - 22)
    const lh = 4
    ensure(lh * ls.length + 2)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(M, y, 16, lh * ls.length + 1.5, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...ORANGE_DARK)
    doc.text(`${t.minutes} min`, M + 8, y + 4, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    ls.forEach((l, i) => doc.text(l, M + 20, y + 4 + i * lh))
    y += lh * ls.length + 3
  }

  heading(`Unplugged warm-up: ${g.warmup.title}`, g.warmup.minutes)
  bullets(g.warmup.steps)
  para(`Materials: ${g.warmup.materials.join(', ')}`, { size: 9, color: GREY })

  heading('What children do on screen')
  for (const a of g.activities) {
    para(`${a.step.toUpperCase()} — ${a.title}`, { size: 10, bold: true, color: NAVY, gap: 0.6 })
    para(a.detail, { size: 9.5, indent: 4 })
  }

  heading('Discussion questions')
  bullets(g.discussion)

  heading('Misconceptions to listen for')
  for (const m of g.misconceptions) {
    para(`“${m.idea}”`, { size: 10, bold: true, color: ORANGE_DARK, gap: 0.6 })
    para(m.correction, { size: 9.5, indent: 4 })
  }

  heading('Differentiation')
  para('Ready for more', { size: 10, bold: true, color: NAVY, gap: 0.6 })
  bullets(g.differentiation.faster)
  para('Needs more time', { size: 10, bold: true, color: NAVY, gap: 0.6 })
  bullets(g.differentiation.slower)

  heading('Materials')
  bullets(g.materials)

  if (g.notes.length) {
    heading('Notes for the classroom')
    bullets(g.notes, 9)
  }

  if (g.extensions.length) {
    heading('Extend in the Skill Galaxy')
    bullets(g.extensions.map((e) => `${e.title} (${e.track}) — ${siteUrl.replace(/^https?:\/\//, '')}${e.href}`))
  }

  heading('Send home to families')
  para(`Today: ${g.parent.today}`, { size: 9.5 })
  para(`Try at home: ${g.parent.tryAtHome}`, { size: 9.5 })
  para(`Ask your child: ${g.parent.askYourChild}`, { size: 9.5 })

  footer()
  save(doc, `r2bot-kids-teacher-guide-level-1-session-${String(g.number).padStart(2, '0')}-${slug(g.title)}.pdf`)
}

// ── Certificates ─────────────────────────────────────────────────────────────

function certificateFrame(doc: JsPdf, W: number, H: number): void {
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 14, 'F')
  doc.rect(0, H - 14, W, 14, 'F')
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(1.6)
  doc.roundedRect(10, 20, W - 20, H - 40, 6, 6, 'S')
  doc.setLineWidth(0.4)
  doc.roundedRect(13, 23, W - 26, H - 46, 4.5, 4.5, 'S')
  // Corner stars
  doc.setFillColor(...ORANGE)
  for (const [cx, cy] of [[22, 32], [W - 22, 32], [22, H - 32], [W - 22, H - 32]] as const) {
    doc.circle(cx, cy, 1.8, 'F')
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('R2BOT KIDS', 16, 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...ORANGE)
  doc.text('r2bot.in/kids', W - 16, 9, { align: 'right' })
}

export interface KidCertificateInput {
  /** The explorer name the child chose (any script). */
  name: string
  robotName: string
  level: 1 | 2 | 3 | 4
  title: string
  /** Certificate wording with {name} and {robotName}. */
  wording: string
  sessions: number
  badges: number
  date: Date
}

export async function downloadKidCertificate(c: KidCertificateInput): Promise<void> {
  const doc = await newDoc('landscape')
  const W = 297
  const H = 210
  certificateFrame(doc, W, H)

  drawRobot(doc, W / 2 - 11, 30, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE_DARK)
  doc.text(pdfSafe(`CERTIFICATE OF ACHIEVEMENT · LEVEL ${c.level}`), W / 2, 63, { align: 'center' })
  doc.setFontSize(26)
  doc.setTextColor(...NAVY)
  doc.text(pdfSafe(c.title), W / 2, 75, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...GREY)
  doc.text('This certificate is proudly presented to', W / 2, 87, { align: 'center' })

  drawCentredName(doc, c.name, W / 2, 101, 34, ORANGE, 200)
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.5)
  doc.line(W / 2 - 70, 111, W / 2 + 70, 111)

  // Wording: the name parts come from the curriculum's template. Names in
  // non-Latin scripts would not print in Helvetica, so the sentence says
  // "this explorer" when a name has characters Helvetica cannot draw.
  const safeName = pdfSafe(c.name) === c.name ? c.name : 'This explorer'
  const safeRobot = pdfSafe(c.robotName) === c.robotName ? c.robotName : 'their robot'
  const wording = c.wording.split('{name}').join(safeName).split('{robotName}').join(safeRobot)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11.5)
  doc.setTextColor(...INK)
  const ls = doc.splitTextToSize(pdfSafe(wording), 220) as string[]
  ls.slice(0, 5).forEach((l, i) => doc.text(l, W / 2, 121 + i * 5.6, { align: 'center' }))

  // Stats row
  const statsY = 158
  const stats = [
    [String(c.sessions), 'sessions finished'],
    [String(c.badges), 'badges earned'],
    [pdfSafe(longDate(c.date)), 'awarded on'],
  ]
  stats.forEach(([v, k], i) => {
    const x = W / 2 + (i - 1) * 70
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...NAVY)
    doc.text(v, x, statsY, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GREY)
    doc.text(k, x, statsY + 5, { align: 'center' })
  })

  doc.setFontSize(8.5)
  doc.setTextColor(...GREY)
  doc.text('Every child who learns the skills earns this same certificate. No rankings, ever.', W / 2, H - 28, { align: 'center' })
  save(doc, `r2bot-kids-level-${c.level}-certificate.pdf`)
}

export interface TrainingCertificateInput {
  name: string
  modules: number
  minutes: number
  date: Date
}

export async function downloadTrainingCertificate(c: TrainingCertificateInput): Promise<void> {
  const doc = await newDoc('landscape')
  const W = 297
  const H = 210
  certificateFrame(doc, W, H)

  drawRobot(doc, W / 2 - 10, 32, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE_DARK)
  doc.text('CERTIFICATE OF COMPLETION', W / 2, 64, { align: 'center' })
  doc.setFontSize(24)
  doc.setTextColor(...NAVY)
  doc.text('R2BOT Kids Teacher Training', W / 2, 76, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...GREY)
  doc.text('This certifies that', W / 2, 89, { align: 'center' })

  drawCentredName(doc, c.name, W / 2, 103, 30, ORANGE, 200)
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.5)
  doc.line(W / 2 - 70, 112, W / 2 + 70, 112)

  doc.setFontSize(11.5)
  doc.setTextColor(...INK)
  const text = `has completed all ${c.modules} modules of the R2BOT Kids teacher training (about ${c.minutes} minutes): how R2BOT Kids works, running a 40-minute class, using the physics lab, assigning and tracking work, supporting every child, and safety and privacy.`
  const ls = doc.splitTextToSize(pdfSafe(text), 210) as string[]
  ls.forEach((l, i) => doc.text(l, W / 2, 123 + i * 5.6, { align: 'center' }))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text(pdfSafe(longDate(c.date)), W / 2, 160, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text('date completed', W / 2, 165, { align: 'center' })
  doc.setFontSize(8.5)
  doc.text('Self-paced professional learning. Not an accredited qualification.', W / 2, H - 28, { align: 'center' })
  save(doc, 'r2bot-kids-teacher-training-certificate.pdf')
}
