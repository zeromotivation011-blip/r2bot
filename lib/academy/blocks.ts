// lib/academy/blocks.ts
// Content block types for the Academy lesson player.
// Each block has a discriminated union: { type, data } where data shape is keyed by type.

export type BlockType =
  | 'video'
  | 'text'
  | 'quiz-mcq'
  | 'code-challenge'
  | 'simulation'
  | 'match-pairs'
  | 'fill-blank'
  | 'hands-on'
  | 'scorm'
  | 'discussion'
  | 'flashcard'

// ─── Per-block data shapes ─────────────────────────────────────────────────

export interface VideoBlockData {
  provider: 'youtube' | 'vimeo' | 'self-hosted'
  video_id: string
  title: string
  duration_seconds: number
  transcript_en: string
  transcript_hi?: string
  chapters: { time: number; label: string }[]
  auto_advance?: boolean
  completion_threshold?: number  // 0..1, default 0.8
}

export interface TextBlockData {
  content_mdx: string
  content_hi?: string
  estimated_read_minutes: number
}

export interface QuizOption {
  id: string
  text: string
  text_hi?: string
  image?: string
  correct: boolean
  explanation: string
}

export interface QuizMcqBlockData {
  question: string
  question_hi?: string
  image?: string
  options: QuizOption[]
  allow_multiple?: boolean
  hint?: string
  points: number
}

export type CodeLanguage = 'python' | 'cpp' | 'javascript' | 'arduino'

export interface CodeTestCase {
  input?: string
  expected_output: string
  hidden?: boolean
}

export interface CodeChallengeBlockData {
  language: CodeLanguage
  starter_code: string
  instructions: string
  instructions_hi?: string
  test_cases: CodeTestCase[]
  solution: string
  hints: string[]
  points: number
}

export type SimulationKind =
  | 'line-follower'
  | 'pid-controller'
  | 'pathfinder'
  | 'arm-kinematics'
  | 'sensor-fusion'
  | 'grid-navigator'
  | 'custom'

export interface SimulationBlockData {
  sim_type: SimulationKind
  embed_url?: string
  config: Record<string, unknown>
  task_description: string
  success_condition: string
  points: number
}

export interface MatchPair {
  left: string
  right: string
  left_image?: string
  right_image?: string
}

export interface MatchPairsBlockData {
  instruction: string
  pairs: MatchPair[]
  points: number
}

export interface FillBlankSlot {
  id: string
  correct_answers: string[]
  hint?: string
}

export interface FillBlankBlockData {
  template: string                // text with __ID__ tokens or plain ___ gaps
  blanks: FillBlankSlot[]
  points: number
}

export type HandsOnDifficulty = 'easy' | 'medium' | 'hard'
export type HandsOnSubmission = 'photo' | 'video' | 'code' | 'description'

export interface HandsOnHardware {
  name: string
  buy_url_india?: string
  price_inr?: number
}

export interface HandsOnStep {
  order: number
  instruction: string
  image?: string
  video_url?: string
  checkpoint: string
}

export interface HandsOnRubricItem {
  criterion: string
  max_points: number
}

export interface HandsOnBlockData {
  title: string
  difficulty: HandsOnDifficulty
  time_estimate_minutes: number
  hardware_required: HandsOnHardware[]
  steps: HandsOnStep[]
  submission_type: HandsOnSubmission
  rubric: HandsOnRubricItem[]
  points: number
}

export interface ScormBlockData {
  package_url: string
  scorm_version: '1.2' | '2004'
  width: number
  height: number
  completion_criteria: 'passed' | 'completed' | 'passed_or_completed'
}

export interface DiscussionBlockData {
  prompt: string
  prompt_hi?: string
  min_words: number
  peer_visible: boolean
}

export interface FlashcardItem {
  front: string
  back: string
  front_image?: string
  back_image?: string
}

export interface FlashcardBlockData {
  cards: FlashcardItem[]
  points_per_card: number
}

// ─── Discriminated union ───────────────────────────────────────────────────

export type ContentBlock =
  | { id: string; type: 'video';          data: VideoBlockData;         is_required?: boolean; order_index: number }
  | { id: string; type: 'text';           data: TextBlockData;          is_required?: boolean; order_index: number }
  | { id: string; type: 'quiz-mcq';       data: QuizMcqBlockData;       is_required?: boolean; order_index: number }
  | { id: string; type: 'code-challenge'; data: CodeChallengeBlockData; is_required?: boolean; order_index: number }
  | { id: string; type: 'simulation';     data: SimulationBlockData;    is_required?: boolean; order_index: number }
  | { id: string; type: 'match-pairs';    data: MatchPairsBlockData;    is_required?: boolean; order_index: number }
  | { id: string; type: 'fill-blank';     data: FillBlankBlockData;     is_required?: boolean; order_index: number }
  | { id: string; type: 'hands-on';       data: HandsOnBlockData;       is_required?: boolean; order_index: number }
  | { id: string; type: 'scorm';          data: ScormBlockData;         is_required?: boolean; order_index: number }
  | { id: string; type: 'discussion';     data: DiscussionBlockData;    is_required?: boolean; order_index: number }
  | { id: string; type: 'flashcard';      data: FlashcardBlockData;     is_required?: boolean; order_index: number }

// ─── Per-block progress / result ──────────────────────────────────────────

export interface BlockResult {
  blockId: string
  completed: boolean
  score?: number          // 0..points for graded blocks
  responseData?: unknown
  completedAt?: string
}

// ─── Validators ────────────────────────────────────────────────────────────
// Light runtime guards used when loading JSON from disk or Supabase.

export function isVideoBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'video' }> {
  return b.type === 'video'
}
export function isTextBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'text' }> {
  return b.type === 'text'
}
export function isQuizMcqBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'quiz-mcq' }> {
  return b.type === 'quiz-mcq'
}
export function isCodeChallengeBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'code-challenge' }> {
  return b.type === 'code-challenge'
}
export function isSimulationBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'simulation' }> {
  return b.type === 'simulation'
}
export function isMatchPairsBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'match-pairs' }> {
  return b.type === 'match-pairs'
}
export function isFillBlankBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'fill-blank' }> {
  return b.type === 'fill-blank'
}
export function isHandsOnBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'hands-on' }> {
  return b.type === 'hands-on'
}
export function isScormBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'scorm' }> {
  return b.type === 'scorm'
}
export function isDiscussionBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'discussion' }> {
  return b.type === 'discussion'
}
export function isFlashcardBlock(b: ContentBlock): b is Extract<ContentBlock, { type: 'flashcard' }> {
  return b.type === 'flashcard'
}

// Block is "graded" if it can produce a score.
export const GRADED_BLOCK_TYPES: ReadonlySet<BlockType> = new Set([
  'quiz-mcq', 'code-challenge', 'simulation', 'match-pairs',
  'fill-blank', 'hands-on', 'scorm', 'flashcard',
])

export function isGradedBlock(b: ContentBlock): boolean {
  return GRADED_BLOCK_TYPES.has(b.type)
}
