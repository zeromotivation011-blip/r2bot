// components/kids/settings/access-runtime.ts — the page-wide half of the kids
// access settings (roadmap #25 / #89): "read everything to me" and
// keyboard/switch scanning.
//
// Code-split: lib/kids/settings.ts imports this only when read-aloud or scanning
// is switched on, and calls startAccessRuntime() / stopAccessRuntime() as the
// settings change (and stop when the child leaves /kids). Handlers read the
// settings at event time, so one set of listeners follows every change.
//
// Read-aloud (convention in lib/kids/read-aloud.ts):
//   - tap a text block (p, heading, li, label, caption, cell, [data-read-aloud]) → read it;
//   - tap a button/option → its name is read and the tap still works;
//   - press and hold a control for half a second → its name is read and the press is cancelled;
//   - focus moved by keyboard or by the scanner → the control's name is read;
//   - aria-live / role="status" / role="alert" changes → spoken (feedback in every template).
// Scanning:
//   - 'step': Space moves to the next control (Shift+Space back), Enter picks it;
//   - 'auto': the highlight moves by itself every scanSpeed seconds; Space or Enter
//     (what most switch interfaces send) picks the highlighted control.
//   Scanning stays inside an open dialog, skips hidden/disabled/inert controls,
//   leaves typing in text boxes alone, and pauses while the tab is hidden or for
//   a few seconds after someone touches the screen.

import { readKidsSettings } from '@/lib/kids/settings'
import { accessibleName, readAloud, readAloudModeOn, visibleText } from '@/lib/kids/read-aloud'

const INTERACTIVE =
  'button, a[href], [role="button"], [role="switch"], [role="radio"], [role="checkbox"], [role="tab"], [role="option"], [role="menuitem"], [role="slider"], summary, select, input:not([type="hidden"]), textarea'
const BLOCK =
  '[data-read-aloud], p, h1, h2, h3, h4, h5, h6, li, label, figcaption, td, th, dt, dd, blockquote, legend, caption'
const LIVE = '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]'
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [role="button"]:not([aria-disabled="true"]), [role="switch"], [role="radio"], [role="checkbox"], [role="tab"], [role="option"]'

const HOLD_MS = 550
const TOUCH_PAUSE_MS = 5000

let running = false
let observer: MutationObserver | null = null
let holdTimer = 0
let holdStart: { x: number; y: number; el: Element } | null = null
let swallowClick = false
let holdAt = 0
let lastKeyAt = 0
let scanTimer = 0
let scanMode: 'off' | 'step' | 'auto' = 'off'
let scanSpeed = 0
let pausedUntil = 0
let scanTarget: HTMLElement | null = null
const pendingRegions = new Set<Element>()
let liveTimer = 0
const lastSpoken = new WeakMap<Element, string>()
const changeLog = new WeakMap<Element, number[]>()

const optedOut = (el: Element) => !!el.closest('[data-read-aloud="off"], canvas')

function isEditable(el: Element | null): boolean {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLElement && el.isContentEditable) return true
  if (el instanceof HTMLInputElement) return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(el.type)
  return false
}

/** Text to read for an element: an explicit data-read-aloud value, else its name/text. */
function textFor(el: Element, interactive: boolean): string {
  const explicit = el.getAttribute('data-read-aloud')
  if (explicit && explicit !== 'off' && explicit !== 'true') return explicit
  return interactive ? accessibleName(el) : visibleText(el)
}

// ─── Read-aloud: taps, holds, focus ────────────────────────────────────────

function onPointerDown(e: PointerEvent): void {
  pausedUntil = Date.now() + TOUCH_PAUSE_MS
  if (!readAloudModeOn() || !(e.target instanceof Element) || optedOut(e.target)) return
  const el = e.target.closest(INTERACTIVE) ?? e.target.closest(BLOCK)
  if (!el || isEditable(el)) return
  holdStart = { x: e.clientX, y: e.clientY, el }
  window.clearTimeout(holdTimer)
  holdTimer = window.setTimeout(() => {
    if (!holdStart) return
    holdAt = Date.now()
    const interactive = holdStart.el.matches(INTERACTIVE)
    const t = textFor(holdStart.el, interactive)
    if (t) {
      readAloud(t, { highlight: holdStart.el })
      // A hold reads the control without pressing it.
      swallowClick = interactive
    }
    holdStart = null
  }, HOLD_MS)
}

function onPointerMove(e: PointerEvent): void {
  if (!holdStart) return
  if (Math.abs(e.clientX - holdStart.x) > 12 || Math.abs(e.clientY - holdStart.y) > 12) {
    window.clearTimeout(holdTimer)
    holdStart = null
  }
}

function onPointerEnd(): void {
  window.clearTimeout(holdTimer)
  holdStart = null
}

function onContextMenu(e: MouseEvent): void {
  // A long press on a phone opens the context menu right after our hold read: not then.
  if (holdStart || Date.now() - holdAt < 1200) e.preventDefault()
}

function onClick(e: MouseEvent): void {
  if (swallowClick) {
    swallowClick = false
    e.preventDefault()
    e.stopPropagation()
    return
  }
  if (!readAloudModeOn() || !(e.target instanceof Element) || optedOut(e.target)) return
  // Keyboard "clicks" (Enter/Space) are already read on focus.
  if (e.detail === 0) return
  const control = e.target.closest(INTERACTIVE)
  if (control) {
    if (isEditable(control)) return
    const t = textFor(control, true)
    if (t && t.length <= 200) readAloud(t, { highlight: control })
    return
  }
  const block = e.target.closest(BLOCK)
  if (!block || block === document.body) return
  const t = textFor(block, false)
  if (t) readAloud(t, { highlight: block })
}

function onKeyDownTrack(): void {
  lastKeyAt = Date.now()
}

function onFocusIn(e: FocusEvent): void {
  if (!(e.target instanceof Element)) return
  if (scanTarget && e.target !== scanTarget) clearScanTarget()
  if (!readAloudModeOn() || optedOut(e.target)) return
  // Only focus moved by the keyboard or the scanner (a tap is read by onClick).
  if (Date.now() - lastKeyAt > 800) return
  const t = textFor(e.target, true)
  if (t) readAloud(t, { highlight: e.target })
}

// ─── Read-aloud: live regions (spoken feedback) ─────────────────────────────

function regionOf(n: Node | null): Element | null {
  const el = n instanceof Element ? n : n?.parentElement ?? null
  return el?.closest(LIVE) ?? null
}

function onMutations(list: MutationRecord[]): void {
  if (!readAloudModeOn()) return
  for (const m of list) {
    const r = regionOf(m.target)
    if (r) pendingRegions.add(r)
    m.addedNodes.forEach((n) => {
      if (!(n instanceof Element)) return
      if (n.matches(LIVE)) pendingRegions.add(n)
      n.querySelectorAll(LIVE).forEach((x) => pendingRegions.add(x))
    })
  }
  if (!pendingRegions.size) return
  window.clearTimeout(liveTimer)
  liveTimer = window.setTimeout(flushRegions, 300)
}

function flushRegions(): void {
  const now = Date.now()
  let say = ''
  let highlight: Element | null = null
  pendingRegions.forEach((r) => {
    if (!r.isConnected || optedOut(r)) return
    // A region that changes many times a second (a score or a clock) is noise: skip it while it is busy.
    const log = (changeLog.get(r) ?? []).filter((t) => now - t < 4000)
    log.push(now)
    changeLog.set(r, log)
    if (log.length > 4) return
    const t = visibleText(r, { skipControls: true })
    if (!t || lastSpoken.get(r) === t) return
    lastSpoken.set(r, t)
    // Alerts win over polite updates; otherwise the latest region wins.
    if (!say || r.matches('[role="alert"], [aria-live="assertive"]')) {
      say = t
      highlight = r.getClientRects().length && !r.classList.contains('sr-only') ? r : null
    }
  })
  pendingRegions.clear()
  if (say) readAloud(say, { always: false, highlight })
}

// ─── Scanning ──────────────────────────────────────────────────────────────

function visible(el: HTMLElement): boolean {
  if (el.closest('[inert], [aria-hidden="true"]')) return false
  if (!el.getClientRects().length) return false
  const cs = window.getComputedStyle(el)
  return cs.visibility !== 'hidden' && cs.display !== 'none'
}

function scanRoot(): ParentNode {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]')).filter(visible)
  return dialogs[dialogs.length - 1] ?? document.body
}

/** The controls the scanner steps through, in document order. Exported for tests. */
export function scanList(): HTMLElement[] {
  const root = scanRoot()
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => visible(el) && !el.closest('[data-scan="off"]'))
}

function clearScanTarget(): void {
  scanTarget?.classList.remove('kids-scan-target')
  scanTarget = null
}

function moveScan(dir: 1 | -1): void {
  const list = scanList()
  if (!list.length) return
  const active = (scanTarget && list.includes(scanTarget) ? scanTarget : document.activeElement) as HTMLElement | null
  const i = active ? list.indexOf(active) : -1
  const next = list[i < 0 ? (dir === 1 ? 0 : list.length - 1) : (i + dir + list.length) % list.length]
  lastKeyAt = Date.now()
  clearScanTarget()
  next.focus({ preventScroll: true })
  scanTarget = next
  next.classList.add('kids-scan-target')
  const reduce = document.documentElement.classList.contains('kids-reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
}

function activate(el: HTMLElement): void {
  lastKeyAt = Date.now()
  if (el instanceof HTMLInputElement && (el.type === 'range' || isEditable(el))) {
    // Sliders and text boxes need their own keys: focus them and stop auto-scanning here for a while.
    el.focus()
    pausedUntil = Date.now() + 8000
    return
  }
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    el.focus()
    pausedUntil = Date.now() + 8000
    return
  }
  el.click()
}

function onScanKey(e: KeyboardEvent): void {
  const s = readKidsSettings()
  if (s.scanMode === 'off' || e.ctrlKey || e.metaKey || e.altKey) return
  const target = e.target instanceof Element ? e.target : null
  if (isEditable(target) || (target instanceof HTMLSelectElement)) return
  if (target?.closest('[data-scan="off"]')) return
  const isSpace = e.key === ' ' || e.code === 'Space'
  const isEnter = e.key === 'Enter'
  if (s.scanMode === 'step') {
    if (isSpace) {
      e.preventDefault()
      e.stopPropagation()
      moveScan(e.shiftKey ? -1 : 1)
    } else if (isEnter && target instanceof HTMLElement && target !== document.body) {
      // Native buttons and links already act on Enter; give the rest (role=button divs, tabindex tiles) a click.
      if (!target.matches('button, a[href], summary, input, select, textarea')) {
        e.preventDefault()
        target.click()
      }
    }
    return
  }
  // auto: one switch — Space or Enter picks the highlighted control.
  if (isSpace || isEnter) {
    e.preventDefault()
    e.stopPropagation()
    const el = scanTarget ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null)
    if (el) activate(el)
    else moveScan(1)
    // A short rest after a pick, so the highlight does not run away.
    pausedUntil = Math.max(pausedUntil, Date.now() + s.scanSpeed * 1000)
  }
}

function tickScan(): void {
  if (document.hidden || Date.now() < pausedUntil) return
  moveScan(1)
}

function syncScanTimer(): void {
  const s = readKidsSettings()
  if (s.scanMode === scanMode && s.scanSpeed === scanSpeed && (s.scanMode !== 'auto' || scanTimer)) return
  scanMode = s.scanMode
  scanSpeed = s.scanSpeed
  window.clearInterval(scanTimer)
  scanTimer = 0
  if (scanMode === 'auto') {
    pausedUntil = Date.now() + 1200
    scanTimer = window.setInterval(tickScan, Math.max(800, scanSpeed * 1000))
  }
  if (scanMode === 'off') clearScanTarget()
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

/** Installs the listeners once; re-reads the scan mode/speed on every call. */
export function startAccessRuntime(): void {
  if (typeof window === 'undefined') return
  if (!running) {
    running = true
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerEnd, true)
    document.addEventListener('pointercancel', onPointerEnd, true)
    document.addEventListener('contextmenu', onContextMenu, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDownTrack, true)
    document.addEventListener('keydown', onScanKey, true)
    document.addEventListener('focusin', onFocusIn, true)
    observer = new MutationObserver(onMutations)
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
  }
  syncScanTimer()
}

/** Removes everything (settings switched off, or the child left /kids). */
export function stopAccessRuntime(): void {
  if (!running) return
  running = false
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('pointermove', onPointerMove, true)
  document.removeEventListener('pointerup', onPointerEnd, true)
  document.removeEventListener('pointercancel', onPointerEnd, true)
  document.removeEventListener('contextmenu', onContextMenu, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onKeyDownTrack, true)
  document.removeEventListener('keydown', onScanKey, true)
  document.removeEventListener('focusin', onFocusIn, true)
  observer?.disconnect()
  observer = null
  window.clearTimeout(holdTimer)
  window.clearTimeout(liveTimer)
  window.clearInterval(scanTimer)
  scanTimer = 0
  scanMode = 'off'
  pendingRegions.clear()
  clearScanTarget()
}
