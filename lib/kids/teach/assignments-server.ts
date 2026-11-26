// lib/kids/teach/assignments-server.ts
//
// SERVER ONLY (imports the catalogue). Row mapping for kids_assignments
// (migration 0055), shared by the teacher routes and the child's missions route.

import { isAssignmentKind, type ChildMission, type KidsAssignment } from '../classroom-assignments'
import { resolveItem } from './catalogue'

export const ASSIGNMENT_COLUMNS = 'id, kind, item_id, title, note, due_date, created_at'

export interface AssignmentDbRow {
  id: string
  kind: string
  item_id: string
  title: string
  note: string | null
  due_date: string | null
  created_at: string
}

export function toAssignment(r: AssignmentDbRow): KidsAssignment | null {
  if (!isAssignmentKind(r.kind)) return null
  const item = resolveItem(r.kind, r.item_id)
  return {
    id: r.id,
    kind: r.kind,
    itemId: r.item_id,
    // The stored title survives a catalogue rename; the link follows the catalogue.
    title: r.title,
    note: r.note,
    dueDate: r.due_date,
    createdAt: r.created_at,
    href: item?.href ?? '/kids',
  }
}

/** What a child's browser receives: no row ids, only what the card shows. */
export function toChildMission(a: KidsAssignment): ChildMission {
  return { kind: a.kind, itemId: a.itemId, title: a.title, note: a.note, dueDate: a.dueDate, href: a.href }
}
