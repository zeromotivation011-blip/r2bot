'use client'

// components/kids/teen/KidsLookSyncClient.tsx — keeps <html data-kids-band /
// data-kids-look> in step with the playing child (roadmap #83). Mounted once in
// app/kids/layout.tsx, next to the boot script that sets them before first paint.
//
// Follows band changes (KIDS_PROGRESS_EVENT), profile switches (KIDS_PROFILE_EVENT),
// the child's own look choice (KIDS_LOOK_EVENT) and other tabs (storage). In the
// Lab look the tab title says "R2BOT Lab" instead of "R2BOT Kids" (the installed
// app's manifest name cannot change per band, so the name is done in-app).
// Leaving /kids removes the attributes so the main site is never themed.

import { useEffect } from 'react'
import { KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'
import { KIDS_LOOK_EVENT, applyLookToDocument, clearLookFromDocument } from '@/lib/kids/teen'

const KIDS_NAME = 'R2BOT Kids'
const LAB_NAME = 'R2BOT Lab'

export default function KidsLookSyncClient() {
  useEffect(() => {
    let look = applyLookToDocument().look

    const retitle = () => {
      const t = document.title
      const [from, to] = look === 'lab' ? [KIDS_NAME, LAB_NAME] : [LAB_NAME, KIDS_NAME]
      if (t.includes(from)) document.title = t.split(from).join(to)
    }
    const sync = () => {
      look = applyLookToDocument().look
      retitle()
    }
    sync()

    // Next sets (or replaces) the <title> on every navigation, and may stream it
    // into <body>: watch the current <title> node and both parents for a new one.
    let watched: Element | null = null
    const mo = new MutationObserver(() => {
      const t = document.querySelector('title')
      if (t && t !== watched) {
        watched = t
        mo.observe(t, { childList: true, characterData: true, subtree: true })
      }
      retitle()
    })
    mo.observe(document.head, { childList: true })
    mo.observe(document.body, { childList: true })
    watched = document.querySelector('title')
    if (watched) mo.observe(watched, { childList: true, characterData: true, subtree: true })
    // Hydration can rewrite the title just after this effect.
    const late = window.setTimeout(retitle, 400)

    const evs = [KIDS_PROGRESS_EVENT, KIDS_PROFILE_EVENT, KIDS_LOOK_EVENT, 'storage']
    evs.forEach((e) => window.addEventListener(e, sync))
    return () => {
      evs.forEach((e) => window.removeEventListener(e, sync))
      mo.disconnect()
      window.clearTimeout(late)
      clearLookFromDocument()
    }
  }, [])
  return null
}
