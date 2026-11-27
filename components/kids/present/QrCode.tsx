// components/kids/present/QrCode.tsx — a QR code as inline SVG (no request,
// no dependency), from lib/kids/teach/qr.ts. Dark modules on white with the
// 4-module quiet zone the standard asks for. Safe in server and client trees.

import { qrMatrix, qrSvgPath } from '@/lib/kids/teach/qr'

export function QrCode({ text, size = 160, label }: { text: string; size?: number; label: string }) {
  const m = qrMatrix(text)
  const n = m.length + 8
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges" className="block rounded-lg bg-white">
      <rect width={n} height={n} fill="#fff" />
      <path d={qrSvgPath(m)} fill="#0A1120" />
    </svg>
  )
}

export default QrCode
