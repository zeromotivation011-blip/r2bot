// components/kids/hangar/passport-delete.ts
//
// "Delete my Passport" — ONE implementation, used by the Garage
// (BackupCodeClient, behind requireGrownUp) and the parent hub
// (PassportDeleteCardClient, already behind the parental gate). Deleting removes
// the Passport row from R2BOT at once (Trust Pack: "deleted at once"); progress
// on this device stays. If the deleted words are the ones this device updates,
// the device forgets them too.

import { requireGrownUp } from '@/components/kids/app/ParentalGateClient'
import { deletePassport, loadSavedPassport, rememberPassport } from '@/lib/kids/passport-client'

export type PassportDeleteOutcome =
  | { kind: 'cancelled' }
  | { kind: 'deleted'; text: string }
  | { kind: 'failed'; error: string; notReady?: boolean; offline?: boolean }

export interface PassportDeleteOptions {
  /** Ask the parental gate first (the Garage). The parent hub is already behind it. */
  gate: boolean
}

export async function deletePassportAsGrownUp(code: string, { gate }: PassportDeleteOptions): Promise<PassportDeleteOutcome> {
  if (gate) {
    const ok = await requireGrownUp({ message: 'This deletes the Robot Passport from R2BOT. Progress on this device stays.' })
    if (!ok) return { kind: 'cancelled' }
  }
  if (!window.confirm(`Delete the Passport ${code}? The words will stop working on every device. Progress on this device stays.`)) return { kind: 'cancelled' }
  const r = await deletePassport(code)
  // Already gone (deleted elsewhere, or purged after 400 days unused) counts as deleted.
  if (!r.ok && !r.notFound) return { kind: 'failed', error: r.error, notReady: r.notReady, offline: r.offline }
  if (loadSavedPassport()?.code === code) rememberPassport(null)
  return { kind: 'deleted', text: 'The Passport is deleted. Progress on this device is still here.' }
}
