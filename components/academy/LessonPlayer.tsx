'use client'

// components/academy/LessonPlayer.tsx
// Renders a Lesson as a sequence of ContentBlocks. Tracks per-block completion
// in localStorage via lib/academy/progress. Sidebar shows the full course nav.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Course, Lesson } from '@/lib/academy/courses'
import { flattenLessons, getNextLesson, getPrevLesson } from '@/lib/academy/courses'
import {
  recordBlockResult,
  getBlockRecord,
  completeLesson,
  isEnrolled,
  enrollLocally,
} from '@/lib/academy/progress'
import { BlockRenderer } from './blocks/BlockRegistry'
import { LessonComplete } from './LessonComplete'
import { scheduleReview } from '@/lib/academy/spaced-repetition'

interface LessonPlayerProps {
  course: Course
  lesson: Lesson
  onLessonComplete?: (result: { xpAdded: number; finalScore: number }) => void
}

interface BlockStateEntry {
  completed: boolean
  score?: number
}

export function LessonPlayer({ course, lesson, onLessonComplete }: LessonPlayerProps) {
  const flat = useMemo(() => flattenLessons(course), [course])
  const lessonIdx = flat.findIndex(l => l.id === lesson.id)
  const total = course.total_lessons || flat.length
  const progressPct = total > 0 ? Math.round(((lessonIdx + 1) / total) * 100) : 0

  // Block completion state: blockId -> { completed, score }
  const [blockState, setBlockState] = useState<Record<string, BlockStateEntry>>({})
  // Currently active (visible) block index — others can be visible too but only this one is "current"
  const [activeIdx, setActiveIdx] = useState(0)
  const [lessonDone, setLessonDone] = useState(false)
  const [completeOverlay, setCompleteOverlay] = useState<{ xpAdded: number; finalScore: number } | null>(null)

  // Auto-enroll on first lesson view (local-first).
  useEffect(() => {
    if (!isEnrolled(course.id)) enrollLocally(course.id, !course.is_free && course.price_inr > 0)
  }, [course.id, course.is_free, course.price_inr])

  // Hydrate completed blocks from local storage on mount / when lesson changes.
  useEffect(() => {
    const initial: Record<string, BlockStateEntry> = {}
    for (const b of lesson.blocks) {
      const rec = getBlockRecord(b.id)
      if (rec?.completed) {
        initial[b.id] = { completed: true, score: rec.score }
      }
    }
    setBlockState(initial)
    // Set active to the first incomplete required block, or last block if all done.
    const firstPending = lesson.blocks.findIndex(b => !initial[b.id]?.completed)
    setActiveIdx(firstPending >= 0 ? firstPending : Math.max(0, lesson.blocks.length - 1))
    setLessonDone(false)
  }, [lesson.id, lesson.blocks])

  const allRequiredDone = useMemo(() => {
    return lesson.blocks
      .filter(b => b.is_required !== false)
      .every(b => blockState[b.id]?.completed)
  }, [lesson.blocks, blockState])

  const handleBlockComplete = useCallback(
    (blockIdx: number, result: { score?: number; responseData?: unknown }) => {
      const block = lesson.blocks[blockIdx]
      if (!block) return
      setBlockState(prev => ({
        ...prev,
        [block.id]: { completed: true, score: result.score },
      }))
      recordBlockResult({
        blockId: block.id,
        lessonId: lesson.id,
        courseId: course.id,
        score: result.score,
        responseData: result.responseData,
        completed: true,
      })
      // Advance to next block if there is one
      if (blockIdx < lesson.blocks.length - 1) {
        setActiveIdx(blockIdx + 1)
      }
    },
    [lesson.blocks, lesson.id, course.id],
  )

  const handleFinishLesson = useCallback(() => {
    if (!allRequiredDone) return
    const scoredBlocks = lesson.blocks
      .map(b => blockState[b.id]?.score)
      .filter((s): s is number => typeof s === 'number')
    const finalScore = scoredBlocks.length
      ? Math.round(scoredBlocks.reduce((a, b) => a + b, 0) / scoredBlocks.length)
      : 100
    const { xpAdded } = completeLesson({
      lessonId: lesson.id,
      courseId: course.id,
      finalScore,
      xpReward: lesson.xp_reward,
    })
    // Schedule the lesson for spaced repetition. Map finalScore → SM-2 quality (0..5).
    const quality = Math.max(0, Math.min(5, Math.round(finalScore / 20)))
    scheduleReview({
      lessonId: lesson.id,
      courseSlug: course.slug,
      lessonTitle: lesson.title,
      quality,
    })
    setLessonDone(true)
    setCompleteOverlay({ xpAdded, finalScore })
    onLessonComplete?.({ xpAdded, finalScore })
  }, [allRequiredDone, lesson.blocks, lesson.id, lesson.title, lesson.xp_reward, blockState, course.id, course.slug, onLessonComplete])

  const prev = getPrevLesson(course, lesson.id)
  const next = getNextLesson(course, lesson.id)

  return (
    <div className="acad-player">
      {/* Top bar */}
      <header className="acad-top">
        <Link href={`/academy/c/${course.slug}`} className="acad-top-back" aria-label="Back to course">← Course</Link>
        <div className="acad-top-trail">
          <span className="acad-top-track">{course.track}</span>
          <span className="acad-top-sep">·</span>
          <span className="acad-top-course">{course.title}</span>
        </div>
        <div className="acad-top-progress">
          <div className="acad-top-progress-bar">
            <div className="acad-top-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="acad-top-progress-label">{progressPct}%</span>
        </div>
      </header>

      <div className="acad-grid">
        {/* Content column */}
        <main className="acad-content">
          <header className="acad-lesson-head">
            <p className="acad-lesson-eyebrow">
              Lesson {lessonIdx + 1} of {total} · {lesson.duration_minutes} min · +{lesson.xp_reward} XP
            </p>
            <h1 className="acad-lesson-title">{lesson.title}</h1>
            {lesson.objectives.length > 0 && (
              <ul className="acad-lesson-objectives">
                {lesson.objectives.map((o, i) => (
                  <li key={i}><span aria-hidden>✓</span>{o}</li>
                ))}
              </ul>
            )}
          </header>

          <ol className="acad-blocks">
            {lesson.blocks.map((block, i) => {
              const completed = Boolean(blockState[block.id]?.completed)
              const isActive = i === activeIdx
              return (
                <li
                  key={block.id}
                  className={`acad-block ${completed ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}
                >
                  <div className="acad-block-meta">
                    <span className="acad-block-num">{i + 1}</span>
                    <span className="acad-block-type">{block.type}</span>
                    {block.is_required === false && <span className="acad-block-optional">optional</span>}
                    {completed && <span className="acad-block-done">✓ done</span>}
                  </div>
                  <BlockRenderer
                    block={block}
                    isCompleted={completed}
                    isActive={isActive}
                    onComplete={(r) => handleBlockComplete(i, r)}
                  />
                </li>
              )
            })}
          </ol>

          <footer className="acad-lesson-foot">
            {!allRequiredDone ? (
              <p className="acad-foot-hint">Complete all required blocks above to finish this lesson.</p>
            ) : (
              <button
                type="button"
                onClick={handleFinishLesson}
                disabled={lessonDone}
                className="acad-finish-btn"
              >
                {lessonDone ? 'Lesson Complete ✓' : `Mark Lesson Complete →`}
              </button>
            )}
            <nav className="acad-lesson-nav">
              {prev && <Link href={`/academy/c/${course.slug}/learn/${prev.slug}`} className="acad-nav-link">← {prev.title}</Link>}
              <div style={{ flex: 1 }} />
              {next && <Link href={`/academy/c/${course.slug}/learn/${next.slug}`} className="acad-nav-link">{next.title} →</Link>}
            </nav>
          </footer>
        </main>

        {/* Sidebar */}
        <aside className="acad-sidebar">
          <h2 className="acad-side-h2">Course outline</h2>
          {course.modules.map(mod => (
            <section key={mod.id} className="acad-side-mod">
              <p className="acad-side-mod-label">
                Module {mod.order_index + 1}: {mod.title}
              </p>
              <ul className="acad-side-lessons">
                {mod.lessons.map(l => {
                  const isCurrent = l.id === lesson.id
                  const isDone = Boolean(getBlockRecord(l.blocks[l.blocks.length - 1]?.id ?? '')?.completed)
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/academy/c/${course.slug}/learn/${l.slug}`}
                        className={`acad-side-link ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`}
                      >
                        <span className="acad-side-link-mark" aria-hidden>
                          {isCurrent ? '→' : isDone ? '✓' : '○'}
                        </span>
                        <span className="acad-side-link-text">{l.title}</span>
                        <span className="acad-side-link-time">{l.duration_minutes} min</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </aside>
      </div>

      {completeOverlay && (
        <LessonComplete
          variant="lesson"
          xpAdded={completeOverlay.xpAdded}
          lessonTitle={lesson.title}
          objectives={lesson.objectives}
          nextLessonHref={next ? `/academy/c/${course.slug}/learn/${next.slug}` : null}
          backToCourseHref={`/academy/c/${course.slug}`}
          onClose={() => setCompleteOverlay(null)}
        />
      )}

      <PlayerStyles />
    </div>
  )
}

function PlayerStyles() {
  return (
    <style jsx global>{`
      .acad-player {
        max-width: 1200px;
        margin: 0 auto;
        padding: 16px 18px 60px;
        color: #f4f4f5;
      }
      .acad-top {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
        padding: 12px 14px;
        background: rgba(15, 18, 32, 0.6);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        backdrop-filter: blur(8px);
      }
      .acad-top-back {
        min-height: 40px; padding: 0 14px;
        display: inline-flex; align-items: center;
        background: rgba(0,184,212,0.08);
        color: #d6f1ff;
        border: 1px solid rgba(0,184,212,0.25);
        border-radius: 10px;
        text-decoration: none; font-weight: 700;
      }
      .acad-top-trail {
        font-size: 13px;
        color: #94a3b8;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .acad-top-track {
        text-transform: uppercase; letter-spacing: 2px; font-size: 11px;
        color: #fbbf24; font-weight: 900;
      }
      .acad-top-sep { margin: 0 8px; color: #475569; }
      .acad-top-progress {
        display: flex; align-items: center; gap: 10px;
        min-width: 160px;
      }
      .acad-top-progress-bar {
        position: relative;
        width: 130px; height: 6px;
        background: rgba(255,255,255,0.08);
        border-radius: 999px;
        overflow: hidden;
      }
      .acad-top-progress-fill {
        position: absolute; inset: 0;
        background: linear-gradient(90deg, #00E5FF, #A56BFF);
        transition: width 0.3s ease;
      }
      .acad-top-progress-label {
        font-size: 12px; font-weight: 900; color: #fde047;
        font-variant-numeric: tabular-nums;
      }

      .acad-grid {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 20px;
      }
      @media (max-width: 960px) {
        .acad-grid { grid-template-columns: 1fr; }
        .acad-sidebar { order: -1; }
      }

      .acad-content {
        background: rgba(15, 10, 30, 0.55);
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 18px;
        padding: clamp(18px, 3vw, 32px);
      }
      .acad-lesson-head { margin-bottom: 22px; }
      .acad-lesson-eyebrow {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: #fde047; font-weight: 800; margin: 0 0 6px;
      }
      .acad-lesson-title {
        font-size: clamp(26px, 4vw, 40px);
        font-weight: 900; color: #fff;
        margin: 0 0 14px; line-height: 1.15;
      }
      .acad-lesson-objectives {
        list-style: none; padding: 0; margin: 0;
        display: grid; gap: 6px;
      }
      .acad-lesson-objectives li {
        display: flex; gap: 10px; align-items: flex-start;
        font-size: 14px; color: #c4b5fd;
      }
      .acad-lesson-objectives li span {
        color: #10b981; font-weight: 900;
      }

      .acad-blocks {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column; gap: 18px;
      }
      .acad-block {
        background: rgba(11, 18, 32, 0.5);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 16px;
        transition: border-color .2s, box-shadow .2s;
      }
      .acad-block.is-active {
        border-color: rgba(0, 229, 255, 0.45);
        box-shadow: 0 0 22px rgba(0,229,255,0.12);
      }
      .acad-block.is-done {
        border-color: rgba(16, 185, 129, 0.4);
      }
      .acad-block-meta {
        display: flex; align-items: center; gap: 10px;
        margin-bottom: 12px;
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: #94a3b8; font-weight: 800;
      }
      .acad-block-num {
        width: 24px; height: 24px;
        display: grid; place-items: center;
        background: rgba(0,229,255,0.18);
        color: #00E5FF;
        border-radius: 50%;
        font-size: 12px; font-weight: 900;
      }
      .acad-block.is-done .acad-block-num {
        background: rgba(16,185,129,0.22);
        color: #10b981;
      }
      .acad-block-type { color: #c4b5fd; }
      .acad-block-optional {
        margin-left: auto;
        background: rgba(255,255,255,0.06);
        padding: 2px 8px; border-radius: 999px;
        color: #94a3b8;
      }
      .acad-block-done {
        margin-left: auto;
        color: #10b981; font-weight: 900;
      }

      .acad-block-stub {
        padding: 22px;
        background: rgba(255,255,255,0.02);
        border: 1px dashed rgba(255,255,255,0.15);
        border-radius: 10px;
        text-align: center;
      }
      .acad-block-stub-label {
        margin: 0 0 6px;
        color: #fde047; font-weight: 800;
      }
      .acad-block-stub-id {
        margin: 0 0 14px;
        color: #64748b;
        font-family: monospace; font-size: 11px;
      }
      .acad-block-stub-btn {
        min-height: 44px; padding: 0 18px;
        background: linear-gradient(135deg, #00E5FF, #A56BFF);
        color: #0f0a1e;
        border: none; border-radius: 10px;
        font-weight: 900; font-size: 14px;
        cursor: pointer;
      }
      .acad-block-stub-btn:hover { transform: translateY(-1px); }

      .acad-lesson-foot { margin-top: 22px; }
      .acad-foot-hint {
        text-align: center; color: #fcd34d;
        font-weight: 700; font-size: 14px;
        padding: 12px;
        background: rgba(251,191,36,0.08);
        border: 1px solid rgba(251,191,36,0.25);
        border-radius: 10px;
      }
      .acad-finish-btn {
        display: block; width: 100%;
        min-height: 56px; padding: 0 24px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none; border-radius: 14px;
        font-size: 17px; font-weight: 900;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(16,185,129,0.35);
      }
      .acad-finish-btn:disabled {
        opacity: 0.6; cursor: not-allowed;
        background: rgba(255,255,255,0.06);
        color: #94a3b8; box-shadow: none;
      }
      .acad-lesson-nav {
        margin-top: 14px;
        display: flex; gap: 8px; align-items: center;
      }
      .acad-nav-link {
        font-size: 13px; color: #c4b5fd;
        text-decoration: none; font-weight: 700;
        padding: 8px 12px;
        border-radius: 8px;
      }
      .acad-nav-link:hover { color: #fde047; background: rgba(255,255,255,0.04); }

      .acad-sidebar {
        position: sticky; top: 16px;
        align-self: flex-start;
        background: rgba(11, 18, 32, 0.6);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 16px;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
      }
      .acad-side-h2 {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: #94a3b8; font-weight: 800;
        margin: 0 0 12px;
      }
      .acad-side-mod {
        margin-bottom: 14px;
      }
      .acad-side-mod-label {
        font-size: 13px; font-weight: 800; color: #fde047;
        margin: 0 0 6px;
      }
      .acad-side-lessons { list-style: none; padding: 0; margin: 0; }
      .acad-side-link {
        display: grid;
        grid-template-columns: 18px 1fr auto;
        gap: 8px; align-items: center;
        padding: 8px 10px;
        border-radius: 8px;
        text-decoration: none;
        color: #c4b5fd;
        font-size: 13px; font-weight: 600;
        transition: background .15s, color .15s;
      }
      .acad-side-link:hover { background: rgba(0,184,212,0.08); color: #fff; }
      .acad-side-link.is-current {
        background: rgba(0,184,212,0.14);
        color: #fff;
        border-left: 3px solid #00E5FF;
        padding-left: 7px;
      }
      .acad-side-link.is-done .acad-side-link-mark { color: #10b981; }
      .acad-side-link-mark { font-weight: 900; }
      .acad-side-link-time { font-size: 11px; color: #64748b; }

      @media (max-width: 720px) {
        .acad-top { grid-template-columns: auto 1fr; }
        .acad-top-progress { display: none; }
        .acad-top-trail { font-size: 12px; }
      }
    `}</style>
  )
}
