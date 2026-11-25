// app/api/kids/classroom/classes/[classId]/members/[memberId]/route.ts
//
// Teacher: remove a child from the class. Deletes the member row (nickname and
// snapshot). The child's browser learns on its next sync (404 removed) and
// forgets the membership; their progress on the device is untouched.
// Auth: signed-in user must own the class, and the member must belong to it.

import type { NextRequest } from 'next/server'
import {
  adminOrNull,
  currentTeacher,
  isUuid,
  jsonError,
  loadOwnedClass,
  notReadyResponse,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ classId: string; memberId: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId, memberId } = await ctx.params
  if (!isUuid(classId) || !isUuid(memberId)) return jsonError(404, 'Not found.')
  const user = await currentTeacher()
  if (!user) return jsonError(401, 'Sign in first.')
  const admin = adminOrNull()
  if (!admin) return notReadyResponse()
  const cls = await loadOwnedClass(admin, classId, user.id)
  if (cls === 'missing-table') return notReadyResponse()
  if (!cls) return jsonError(404, 'Not found.')

  const { error } = await admin
    .from('kids_class_members')
    .delete()
    .eq('id', memberId)
    .eq('class_id', classId)
  if (error) return jsonError(500, 'Could not remove the student.')
  return Response.json({ ok: true })
}
