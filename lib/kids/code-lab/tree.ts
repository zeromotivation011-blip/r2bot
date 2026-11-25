// lib/kids/code-lab/tree.ts
// Immutable edits on a block program: insert, remove, move up/down (stepping
// out of a container at its edges), patch. The editor never mutates in place.

import { BLOCK_INFO } from './blocks'
import type { Block } from './types'

export type Branch = 'body' | 'else'

export interface Loc {
  parentId: string | null
  branch: Branch
  index: number
}

function childLists(b: Block): { branch: Branch; list: Block[] }[] {
  if (b.type === 'repeat' || b.type === 'repeatUntil') return [{ branch: 'body', list: b.body }]
  if (b.type === 'ifWall' || b.type === 'ifLine' || b.type === 'ifColor')
    return [
      { branch: 'body', list: b.body },
      { branch: 'else', list: b.elseBody },
    ]
  return []
}

function withList(b: Block, branch: Branch, list: Block[]): Block {
  if (b.type === 'repeat' || b.type === 'repeatUntil') return { ...b, body: list }
  if (b.type === 'ifWall' || b.type === 'ifLine' || b.type === 'ifColor') return branch === 'body' ? { ...b, body: list } : { ...b, elseBody: list }
  return b
}

export function findBlock(list: Block[], id: string): Block | null {
  for (const b of list) {
    if (b.id === id) return b
    for (const c of childLists(b)) {
      const f = findBlock(c.list, id)
      if (f) return f
    }
  }
  return null
}

export function findLoc(list: Block[], id: string, parentId: string | null = null, branch: Branch = 'body'): Loc | null {
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    if (b.id === id) return { parentId, branch, index: i }
    for (const c of childLists(b)) {
      const f = findLoc(c.list, id, b.id, c.branch)
      if (f) return f
    }
  }
  return null
}

/** Apply `fn` to the list identified by (parentId, branch). parentId null = the top level. */
export function updateList(program: Block[], parentId: string | null, branch: Branch, fn: (l: Block[]) => Block[]): Block[] {
  if (parentId === null) return fn(program)
  return program.map((b) => {
    if (b.id === parentId) {
      const target = childLists(b).find((c) => c.branch === branch)
      return target ? withList(b, branch, fn(target.list)) : b
    }
    let next = b
    for (const c of childLists(b)) next = withList(next, c.branch, updateList(c.list, parentId, branch, fn))
    return next
  })
}

export function insertBlock(program: Block[], parentId: string | null, branch: Branch, index: number, block: Block): Block[] {
  return updateList(program, parentId, branch, (l) => {
    const copy = [...l]
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, block)
    return copy
  })
}

export function removeBlock(program: Block[], id: string): Block[] {
  const loc = findLoc(program, id)
  if (!loc) return program
  return updateList(program, loc.parentId, loc.branch, (l) => l.filter((b) => b.id !== id))
}

export function patchBlock(program: Block[], id: string, patch: (b: Block) => Block): Block[] {
  return program.map((b) => {
    if (b.id === id) return patch(b)
    let next = b
    for (const c of childLists(b)) next = withList(next, c.branch, patchBlock(c.list, id, patch))
    return next
  })
}

/** Move a block one place up (-1) or down (+1). At the edge of a container it steps out, before or after the container. */
export function moveBlock(program: Block[], id: string, delta: -1 | 1): Block[] {
  const loc = findLoc(program, id)
  const block = findBlock(program, id)
  if (!loc || !block) return program
  let siblingsLen = 0
  updateList(program, loc.parentId, loc.branch, (l) => {
    siblingsLen = l.length
    return l
  })
  const target = loc.index + delta
  if (target >= 0 && target < siblingsLen) {
    return updateList(program, loc.parentId, loc.branch, (l) => {
      const copy = [...l]
      ;[copy[loc.index], copy[target]] = [copy[target], copy[loc.index]]
      return copy
    })
  }
  if (loc.parentId === null) return program
  const parentLoc = findLoc(program, loc.parentId)
  if (!parentLoc) return program
  const without = removeBlock(program, id)
  return insertBlock(without, parentLoc.parentId, parentLoc.branch, parentLoc.index + (delta === 1 ? 1 : 0), block)
}

/** Shape check for a program restored from localStorage. */
export function isValidProgram(x: unknown): x is Block[] {
  if (!Array.isArray(x)) return false
  return x.every((b) => {
    if (!b || typeof b !== 'object') return false
    const o = b as Record<string, unknown>
    if (typeof o.id !== 'string' || typeof o.type !== 'string' || !(o.type in BLOCK_INFO)) return false
    if ('body' in o && !isValidProgram(o.body)) return false
    if ('elseBody' in o && !isValidProgram(o.elseBody)) return false
    return true
  })
}
