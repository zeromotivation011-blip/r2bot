// lib/build/types.ts
// Types for the /build adaptive robot-building project section.

export type RobotLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ProjectComponent {
  name: string
  optional?: boolean
}

export interface ProjectMeta {
  id: string
  slug: string
  title: string
  tagline: string
  level: RobotLevel
  duration_hours: number
  total_xp: number
  components: ProjectComponent[]
  simulation_only: boolean
  color: string
  icon: string
}

export type NodeType =
  | 'question'
  | 'explanation'
  | 'simulation'
  | 'checkpoint'
  | 'complete'

export type QuestionStyle = 'mcq' | 'boolean' | 'number-input' | 'code-fill'

export interface NodeQuestion {
  style: QuestionStyle
  prompt: string
  options?: string[]
  correct: string | number
  explanation_correct: string
  explanation_wrong: string
}

export type BranchOn = 'correct' | 'wrong' | 'next'

export interface NodeBranch {
  on: BranchOn
  to: string
}

export interface TreeNode {
  id: string
  type: NodeType
  title: string
  body: string
  hint?: string
  hint2?: string
  simulation_url?: string
  question?: NodeQuestion
  branches: NodeBranch[]
  xp: number
}

export interface ProjectTree {
  root: string
  nodes: Record<string, TreeNode>
}

export interface LoadedProject {
  meta: ProjectMeta
  tree: ProjectTree
}
