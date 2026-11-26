// lib/kids/classroom-schools.ts
//
// Shared, pure types and helpers for R2BOT Kids schools (migration 0055): a
// teacher creates a school, colleagues join it with an 8-character school
// code, and the school admin sees every class with a school-wide summary.
// Safe in the browser and on the server.

import type { BandId } from './bands'
import { JOIN_CODE_ALPHABET } from './classroom'

export const SCHOOL_CODE_RE = /^[A-HJKMNP-Z2-9]{8}$/

/** Uppercase and strip spaces and dashes: "abcd-2345" and "ABCD 2345" both work. */
export function normaliseSchoolCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').slice(0, 16)
}

export function isValidSchoolCode(code: string): boolean {
  return SCHOOL_CODE_RE.test(code) && [...code].every((ch) => JOIN_CODE_ALPHABET.includes(ch))
}

/** "ABCD 2345". */
export function formatSchoolCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code
}

export interface SchoolTeacher {
  /** The teacher's user id — sent to the school admin only (to remove someone). */
  id: string | null
  displayName: string
  role: 'admin' | 'teacher'
  joinedAt: string
  isMe: boolean
}

/** One class in the admin's school view: counts only, never nicknames. */
export interface SchoolClassRow {
  id: string
  className: string
  teacherName: string
  band: BandId
  children: number
  activeThisWeek: number
  stars: number
  sessionsDone: number
  activitiesDone: number
  assignments: number
  /** True for the admin's own classes (those open on click). */
  mine: boolean
}

export interface SchoolSummary {
  classes: number
  teachers: number
  children: number
  activeThisWeek: number
  stars: number
  sessionsDone: number
  activitiesDone: number
  assignments: number
}

export interface KidsSchoolInfo {
  id: string
  name: string
  role: 'admin' | 'teacher'
  /** The invite code — admin only. */
  code: string | null
  myDisplayName: string | null
  createdAt: string
  teachers: SchoolTeacher[]
  /** The signed-in teacher's own classes and whether each is in the school. */
  myClasses: { id: string; className: string; inSchool: boolean }[]
  /** Admin only: every class in the school. */
  classes: SchoolClassRow[] | null
  /** Admin only. */
  summary: SchoolSummary | null
}

export type SchoolResponse =
  | { school: KidsSchoolInfo }
  | { school: null; suggestedName?: string }
