// lib/kids/classroom-kind-store.ts
//
// Browser-only, for the LEADER's device (teacher, club leader, parent): the kind
// of each class they made (school / club / family / library, roadmap #84) while
// migration 0059 has not run. The server then has no column for it, so the
// create form keeps the choice here and the Classroom reads it back. Once the
// column exists the class page sends any kept kind to the server once and
// forgets it. Not a child's store (no profiles, no backup code): it holds class
// ids and a word, nothing about any child.

import { DEFAULT_CLASS_KIND, isClassKind, type ClassKind, type KidsClassSummary } from './classroom'

export const CLASS_KINDS_KEY = 'r2bot_kids_teacher_class_kinds_v1'

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readAll(): Record<string, ClassKind> {
  const s = storage()
  if (!s) return {}
  try {
    const raw: unknown = JSON.parse(s.getItem(CLASS_KINDS_KEY) ?? '{}')
    const out: Record<string, ClassKind> = {}
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [id, k] of Object.entries(raw as Record<string, unknown>)) {
        if (/^[0-9a-f-]{36}$/i.test(id) && isClassKind(k)) out[id] = k
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, ClassKind>): void {
  const s = storage()
  if (!s) return
  try {
    if (Object.keys(all).length) s.setItem(CLASS_KINDS_KEY, JSON.stringify(all))
    else s.removeItem(CLASS_KINDS_KEY)
  } catch {
    /* storage blocked: the class reads as a school class */
  }
}

/** The kind kept on this device for a class, or null. */
export function localClassKind(classId: string): ClassKind | null {
  return readAll()[classId] ?? null
}

/** Keep a class's kind on this device (a school class needs nothing kept). */
export function rememberClassKind(classId: string, kind: ClassKind): void {
  const all = readAll()
  if (kind === DEFAULT_CLASS_KIND) delete all[classId]
  else all[classId] = kind
  writeAll(all)
}

export function forgetClassKind(classId: string): void {
  const all = readAll()
  if (!(classId in all)) return
  delete all[classId]
  writeAll(all)
}

/**
 * The kind to show for a class: the server's once 0059 has run (unless this
 * device still holds a kind to send, see pendingClassKind), else the one kept
 * here, else school.
 */
export function displayClassKind(cls: Pick<KidsClassSummary, 'id' | 'kind' | 'kindReady'>): ClassKind {
  const local = localClassKind(cls.id)
  if (cls.kindReady) return local && cls.kind === DEFAULT_CLASS_KIND ? local : isClassKind(cls.kind) ? cls.kind : DEFAULT_CLASS_KIND
  return local ?? DEFAULT_CLASS_KIND
}

/**
 * A kind this device kept before 0059 that the server does not have yet: send
 * it (PATCH action 'kind') and forget it. Only when the server still says
 * "school" — a kind changed on the server since then wins.
 */
export function pendingClassKind(cls: Pick<KidsClassSummary, 'id' | 'kind' | 'kindReady'>): ClassKind | null {
  if (!cls.kindReady) return null
  const local = localClassKind(cls.id)
  if (!local) return null
  if (cls.kind !== DEFAULT_CLASS_KIND) {
    forgetClassKind(cls.id)
    return null
  }
  return local
}
