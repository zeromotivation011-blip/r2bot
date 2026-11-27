// lib/kids/teach/qr.ts
//
// A small QR Code encoder (ISO/IEC 18004) for the join-code corner of Present
// mode and printed join cards: byte mode, error correction level M, versions
// 1–10 (up to 213 bytes — a join URL is about 45). No dependency: the repo has
// no QR package and a join card must work offline. Pure, deterministic, safe
// on the server and in the browser.
//
// qrMatrix(text) → modules[row][col] (true = dark), without the quiet zone.
// qrSvgPath(matrix) → one SVG path for all dark modules (render with a 4-module
// quiet zone around it).

type EcBlocks = { ec: number; groups: [count: number, data: number][] }

/** Error-correction level M, versions 1–10. */
const EC_M: EcBlocks[] = [
  { ec: 10, groups: [[1, 16]] },
  { ec: 16, groups: [[1, 28]] },
  { ec: 26, groups: [[1, 44]] },
  { ec: 18, groups: [[2, 32]] },
  { ec: 24, groups: [[2, 43]] },
  { ec: 16, groups: [[4, 27]] },
  { ec: 18, groups: [[4, 31]] },
  { ec: 22, groups: [[2, 38], [2, 39]] },
  { ec: 22, groups: [[3, 36], [2, 37]] },
  { ec: 26, groups: [[4, 43], [1, 44]] },
]

const ALIGN: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]]

// ── GF(256) and Reed–Solomon ────────────────────────────────────────────────
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

function rsGenerator(degree: number): number[] {
  let g = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(g.length + 1).fill(0)
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j]
      next[j + 1] ^= mul(g[j], EXP[i])
    }
    g = next
  }
  return g
}

function rsRemainder(data: number[], degree: number): number[] {
  const gen = rsGenerator(degree)
  const rem = new Array<number>(degree).fill(0)
  for (const d of data) {
    const factor = d ^ rem[0]
    rem.shift()
    rem.push(0)
    for (let i = 0; i < degree; i++) rem[i] ^= mul(gen[i + 1], factor)
  }
  return rem
}

// ── Data codewords ──────────────────────────────────────────────────────────
function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

function dataCapacity(v: number): number {
  return EC_M[v - 1].groups.reduce((n, [c, d]) => n + c * d, 0)
}

function pickVersion(bytes: number): number {
  for (let v = 1; v <= 10; v++) {
    const ccBits = v < 10 ? 8 : 16
    if (4 + ccBits + bytes * 8 <= dataCapacity(v) * 8) return v
  }
  throw new Error('Text too long for a version 1–10 QR code')
}

function codewords(text: string, v: number): number[] {
  const bytes = utf8(text)
  const bits: number[] = []
  const put = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  put(0b0100, 4)
  put(bytes.length, v < 10 ? 8 : 16)
  for (const b of bytes) put(b, 8)
  const cap = dataCapacity(v) * 8
  put(0, Math.min(4, cap - bits.length))
  while (bits.length % 8) bits.push(0)
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0))
  for (let pad = 0xec; data.length < cap / 8; pad = pad === 0xec ? 0x11 : 0xec) data.push(pad)

  // Split into blocks, add EC, interleave.
  const spec = EC_M[v - 1]
  const blocks: number[][] = []
  let k = 0
  for (const [count, size] of spec.groups) for (let i = 0; i < count; i++) {
    blocks.push(data.slice(k, k + size))
    k += size
  }
  const ecBlocks = blocks.map((b) => rsRemainder(b, spec.ec))
  const out: number[] = []
  const maxData = Math.max(...blocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.length) out.push(b[i])
  for (let i = 0; i < spec.ec; i++) for (const e of ecBlocks) out.push(e[i])
  return out
}

// ── Matrix ──────────────────────────────────────────────────────────────────
type Grid = { size: number; dark: boolean[][]; fn: boolean[][] }

function bchFormat(mask: number): number {
  const data = (0b00 << 3) | mask // level M = 00
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return ((data << 10) | rem) ^ 0x5412
}

function bchVersion(v: number): number {
  let rem = v
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  return (v << 12) | rem
}

function baseGrid(v: number): Grid {
  const size = v * 4 + 17
  const dark = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (r: number, c: number, d: boolean) => {
    dark[r][c] = d
    fn[r][c] = true
  }
  // Timing patterns.
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0)
    set(i, 6, i % 2 === 0)
  }
  // Finders + separators.
  for (const [fr, fc] of [[3, 3], [3, size - 4], [size - 4, 3]]) {
    for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
      const r = fr + dr
      const c = fc + dc
      if (r < 0 || c < 0 || r >= size || c >= size) continue
      const d = Math.max(Math.abs(dr), Math.abs(dc))
      set(r, c, d !== 2 && d !== 4)
    }
  }
  // Alignment patterns.
  const pos = ALIGN[v - 1]
  for (const r of pos) for (const c of pos) {
    if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1)
  }
  // Reserve format areas (filled per mask) and the dark module.
  drawFormat({ size, dark, fn }, 0)
  // Version information (v ≥ 7).
  if (v >= 7) {
    const bits = bchVersion(v)
    for (let i = 0; i < 18; i++) {
      const d = ((bits >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      set(a, b, d)
      set(b, a, d)
    }
  }
  return { size, dark, fn }
}

function drawFormat(g: Grid, mask: number): void {
  const bits = bchFormat(mask)
  const size = g.size
  const set = (r: number, c: number, d: boolean) => {
    g.dark[r][c] = d
    g.fn[r][c] = true
  }
  const bit = (i: number) => ((bits >>> i) & 1) === 1
  for (let i = 0; i <= 5; i++) set(i, 8, bit(i))
  set(7, 8, bit(6))
  set(8, 8, bit(7))
  set(8, 7, bit(8))
  for (let i = 9; i < 15; i++) set(8, 14 - i, bit(i))
  for (let i = 0; i < 8; i++) set(8, size - 1 - i, bit(i))
  for (let i = 8; i < 15; i++) set(size - 15 + i, 8, bit(i))
  set(size - 8, 8, true)
}

function placeData(g: Grid, cw: number[]): void {
  const size = g.size
  let i = 0
  const total = cw.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j
        const upward = ((right + 1) & 2) === 0
        const r = upward ? size - 1 - vert : vert
        if (g.fn[r][c]) continue
        if (i < total) g.dark[r][c] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1
        i++
      }
    }
  }
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

function applyMask(g: Grid, m: number): void {
  for (let r = 0; r < g.size; r++) for (let c = 0; c < g.size; c++) if (!g.fn[r][c] && MASKS[m](r, c)) g.dark[r][c] = !g.dark[r][c]
}

function penalty(d: boolean[][]): number {
  const n = d.length
  let score = 0
  const line = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      let run = 1
      for (let j = 1; j <= n; j++) {
        if (j < n && get(i, j) === get(i, j - 1)) run++
        else {
          if (run >= 5) score += 3 + (run - 5)
          run = 1
        }
      }
      for (let j = 0; j + 10 < n + 0; j++) {
        const s = Array.from({ length: 11 }, (_, k) => get(i, j + k))
        const p1 = [true, false, true, true, true, false, true, false, false, false, false]
        const p2 = [false, false, false, false, true, false, true, true, true, false, true]
        if (s.every((v, k) => v === p1[k]) || s.every((v, k) => v === p2[k])) score += 40
      }
    }
  }
  line((i, j) => d[i][j])
  line((i, j) => d[j][i])
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = d[r][c]
    if (v === d[r][c + 1] && v === d[r + 1][c] && v === d[r + 1][c + 1]) score += 3
  }
  const darkCount = d.reduce((a, row) => a + row.filter(Boolean).length, 0)
  const pct = (darkCount * 100) / (n * n)
  score += Math.floor(Math.abs(pct - 50) / 5) * 10
  return score
}

/** QR modules for `text` (true = dark), level M, the smallest version 1–10 that fits. */
export function qrMatrix(text: string): boolean[][] {
  const v = pickVersion(utf8(text).length)
  const cw = codewords(text, v)
  let best: boolean[][] | null = null
  let bestScore = Infinity
  for (let m = 0; m < 8; m++) {
    const g = baseGrid(v)
    placeData(g, cw)
    applyMask(g, m)
    drawFormat(g, m)
    const s = penalty(g.dark)
    if (s < bestScore) {
      bestScore = s
      best = g.dark
    }
  }
  return best as boolean[][]
}

/** One SVG path ("M x y h1 v1 h-1 z" per dark module), offset by `quiet` modules. */
export function qrSvgPath(matrix: boolean[][], quiet = 4): string {
  const parts: string[] = []
  matrix.forEach((row, r) => row.forEach((d, c) => { if (d) parts.push(`M${c + quiet} ${r + quiet}h1v1h-1z`) }))
  return parts.join('')
}
