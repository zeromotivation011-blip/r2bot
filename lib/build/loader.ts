// lib/build/loader.ts
// Server-only loaders for the /build robot project section.

import fs from 'node:fs'
import path from 'node:path'
import type { LoadedProject, ProjectMeta, ProjectTree } from './types'

const BUILD_ROOT = path.join(process.cwd(), 'content', 'build')

function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

export function listProjectSlugs(): string[] {
  if (!fs.existsSync(BUILD_ROOT)) return []
  return fs
    .readdirSync(BUILD_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) =>
      fs.existsSync(path.join(BUILD_ROOT, name, 'project.json')),
    )
}

export function loadProjectMeta(slug: string): ProjectMeta | null {
  return readJsonSafe<ProjectMeta>(
    path.join(BUILD_ROOT, slug, 'project.json'),
  )
}

export function loadProjectTree(slug: string): ProjectTree | null {
  return readJsonSafe<ProjectTree>(
    path.join(BUILD_ROOT, slug, 'tree.json'),
  )
}

export function loadProject(slug: string): LoadedProject | null {
  const meta = loadProjectMeta(slug)
  if (!meta) return null
  const tree = loadProjectTree(slug)
  if (!tree) return null
  return { meta, tree }
}

export function loadAllProjects(): ProjectMeta[] {
  return listProjectSlugs()
    .map(loadProjectMeta)
    .filter((m): m is ProjectMeta => m !== null)
}
