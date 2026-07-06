// Client-side PDF generation for completion certificates.
// Uses jsPDF at A4 landscape (297×210mm).

import { jsPDF } from 'jspdf';

export type CertificateTrack = 'spark' | 'wire' | 'forge' | 'edge';

export type CertificateParams = {
  recipientName: string;
  track: CertificateTrack;
  lessonTitle: string;
  completedAt: Date;
  certificateId: string;
};

const TRACK_COLORS: Record<CertificateTrack, [number, number, number]> = {
  spark: [0, 184, 212],
  wire: [165, 107, 255],
  forge: [0, 229, 255],
  edge: [255, 184, 0],
};

function trackLabel(t: CertificateTrack): string {
  return { spark: 'SPARK', wire: 'WIRE', forge: 'FORGE', edge: 'EDGE' }[t];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function generateCertificate(params: CertificateParams): void {
  const { recipientName, track, lessonTitle, completedAt, certificateId } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const W = 297;
  const H = 210;
  const CYAN: [number, number, number] = [0, 184, 212];
  const SLATE: [number, number, number] = [148, 163, 184];
  const WHITE: [number, number, number] = [240, 244, 248];
  const TRACK = TRACK_COLORS[track];

  // background fill (R2BOT dark)
  doc.setFillColor(5, 8, 16);
  doc.rect(0, 0, W, H, 'F');

  // outer border 2px cyan, 10mm inset
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, W - 20, H - 20);

  // inner border 0.5px cyan, 12mm inset
  doc.setLineWidth(0.25);
  doc.rect(12, 12, W - 24, H - 24);

  // Track badge (top right)
  const badgeW = 38;
  const badgeH = 12;
  const badgeX = W - 12 - badgeW - 6;
  const badgeY = 18;
  doc.setFillColor(...TRACK);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(trackLabel(track), badgeX + badgeW / 2, badgeY + badgeH / 2 + 1.5, { align: 'center' });

  // Brand: R2BOT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...CYAN);
  doc.text('R2BOT', W / 2, 32, { align: 'center' });

  // tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text('ROBOT, DECODED.', W / 2, 38, { align: 'center' });

  // Decorative line at 45mm
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.3);
  doc.line(20, 48, W - 20, 48);

  // CERTIFICATE OF COMPLETION
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(...SLATE);
  doc.text('CERTIFICATE OF COMPLETION', W / 2, 64, { align: 'center', charSpace: 3 });

  // "This certifies that"
  doc.setFontSize(11);
  doc.text('This certifies that', W / 2, 90, { align: 'center' });

  // recipient
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...WHITE);
  doc.text(recipientName, W / 2, 108, { align: 'center' });

  // underline
  const nameWidth = doc.getTextWidth(recipientName);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - nameWidth / 2 - 4, 113, W / 2 + nameWidth / 2 + 4, 113);

  // "has successfully completed"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE);
  doc.text('has successfully completed', W / 2, 124, { align: 'center' });

  // lesson title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...CYAN);
  doc.text(lessonTitle, W / 2, 138, { align: 'center', maxWidth: W - 60 });

  // closing
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE);
  doc.text('on the R2BOT Learning Platform', W / 2, 152, { align: 'center' });

  // R2 shield/badge in center bottom (simple SVG-ish path: hexagonal cyan outline w/ R2 inside)
  const shieldCX = W / 2;
  const shieldCY = 178;
  const shieldR = 7;
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.5);
  // hexagon
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([shieldCX + shieldR * Math.cos(ang), shieldCY + shieldR * Math.sin(ang)]);
  }
  for (let i = 0; i < 6; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 6];
    doc.line(a[0], a[1], b[0], b[1]);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...CYAN);
  doc.text('R2', shieldCX, shieldCY + 1.5, { align: 'center' });

  // Bottom: issued (left), id (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`Issued: ${formatDate(completedAt)}`, 22, 188);

  const shortId = certificateId.slice(0, 8);
  doc.text(`Certificate ID: ${shortId}`, W - 22, 188, { align: 'right' });

  // verify URL
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Verify at www.r2bot.in/verify/${certificateId}`, W / 2, 195, { align: 'center' });

  // trigger download
  doc.save(`R2BOT-Certificate-${shortId}.pdf`);
}
