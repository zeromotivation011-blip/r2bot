// components/kids/portfolio/certificate-pdf.ts
// BROWSER ONLY, loaded with import() on a click. Certificates for everything
// (roadmap #45), drawn with the same frame, robot and name rendering as the
// level certificates (lib/kids/teach/pdf.ts, jsPDF, already a dependency):
//   - downloadAchievementCertificate()  one child's World / milestone certificate
//   - downloadClassCertificates()       a teacher's class set: one page per child,
//                                       with the school name and a signature line
// Nothing is uploaded: names typed here stay on the device.

import type { jsPDF as JsPdf } from 'jspdf'
import {
  certificateFrame,
  drawCentredName,
  drawRobot,
  GREY,
  INK,
  longDate,
  NAVY,
  newKidsPdf,
  ORANGE,
  ORANGE_DARK,
  pdfSafe,
  pdfSlug,
  savePdf,
} from '@/lib/kids/teach/pdf'

export interface AchievementInput {
  /** The child's chosen name (any script). */
  name: string
  /** e.g. "Ocean Lab Specialist". */
  title: string
  /** e.g. "WORLD CERTIFICATE". */
  kicker: string
  /** What was done, e.g. "finished 6 Ocean Lab missions and played its flagship game". */
  earnedFor: string
  skills: string[]
  date: Date
  /** Optional school name (class sets). */
  school?: string
  /** Optional teacher / signer name, printed under the signature line (class sets). */
  signer?: string
}

function drawPage(doc: JsPdf, c: AchievementInput): void {
  const W = 297
  const H = 210
  certificateFrame(doc, W, H)
  drawRobot(doc, W / 2 - 10, 28, 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE_DARK)
  doc.text(pdfSafe(c.kicker.toUpperCase()), W / 2, 58, { align: 'center' })
  doc.setFontSize(26)
  doc.setTextColor(...NAVY)
  doc.text(pdfSafe(c.title) || 'Certificate', W / 2, 70, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...GREY)
  doc.text('This certificate is proudly presented to', W / 2, 81, { align: 'center' })

  drawCentredName(doc, c.name, W / 2, 94, 32, ORANGE, 200)
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.5)
  doc.line(W / 2 - 70, 103, W / 2 + 70, 103)

  doc.setFontSize(12)
  doc.setTextColor(...INK)
  const line = doc.splitTextToSize(pdfSafe(`for having ${c.earnedFor}.`), 220) as string[]
  line.slice(0, 2).forEach((l, i) => doc.text(l, W / 2, 112 + i * 6, { align: 'center' }))

  // Skills shown, two columns.
  const skills = c.skills.map(pdfSafe).filter(Boolean).slice(0, 8)
  if (skills.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...ORANGE_DARK)
    doc.text('SKILLS SHOWN', W / 2, 128, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...INK)
    const half = Math.ceil(skills.length / 2)
    skills.forEach((s, i) => {
      const col = skills.length > 3 ? (i < half ? 0 : 1) : 0
      const row = skills.length > 3 ? (i < half ? i : i - half) : i
      const x = skills.length > 3 ? (col === 0 ? 50 : W / 2 + 8) : W / 2 - 60
      const text = (doc.splitTextToSize(`•  ${s}`, 112) as string[])[0]
      doc.text(text, x, 135 + row * 6)
    })
  }

  // Footer row: school / date / signature.
  const y = 170
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  if (c.school) {
    const school = pdfSafe(c.school)
    if (school === c.school) doc.text(school, 70, y, { align: 'center' })
    else drawCentredName(doc, c.school, 70, y - 1, 13, NAVY, 100)
  }
  doc.text(pdfSafe(longDate(c.date)), W / 2, y, { align: 'center' })
  doc.setDrawColor(...GREY)
  doc.setLineWidth(0.3)
  doc.line(W - 115, y + 1, W - 30, y + 1)
  if (c.signer) {
    const signer = pdfSafe(c.signer)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(12)
    if (signer === c.signer) doc.text(signer, W - 72.5, y - 2, { align: 'center' })
    else drawCentredName(doc, c.signer, W - 72.5, y - 3, 13, NAVY, 80)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  if (c.school) doc.text('school', 70, y + 5, { align: 'center' })
  doc.text('awarded on', W / 2, y + 5, { align: 'center' })
  doc.text(c.signer ? 'signed' : 'signed by a teacher or grown-up', W - 72.5, y + 5, { align: 'center' })

  doc.setFontSize(8.5)
  doc.text('Every child who learns the skills earns this same certificate. No rankings, ever.', W / 2, H - 28, { align: 'center' })
}

export async function downloadAchievementCertificate(c: AchievementInput): Promise<void> {
  const doc = await newKidsPdf('landscape')
  drawPage(doc, c)
  await savePdf(doc, `r2bot-kids-${pdfSlug(c.title)}-certificate.pdf`)
}

export interface ClassSetInput extends Omit<AchievementInput, 'name'> {
  names: string[]
}

/** One A4 landscape page per child, same certificate, school and signer. */
export async function downloadClassCertificates(c: ClassSetInput): Promise<void> {
  const doc = await newKidsPdf('landscape')
  c.names.forEach((name, i) => {
    if (i > 0) doc.addPage('a4', 'landscape')
    drawPage(doc, { ...c, name })
  })
  await savePdf(doc, `r2bot-kids-${pdfSlug(c.title)}-class-set.pdf`)
}
