'use client'

// Course landing page — Tailwind + inline styles (no styled-jsx)

import Link from 'next/link'
import { useState } from 'react'
import type { Course } from '@/lib/academy/courses'
import { enrollLocally, isEnrolled } from '@/lib/academy/progress'

const TRACK_ACCENT: Record<string, string> = {
  spark: '#00B8D4',
  wire:  '#A56BFF',
  forge: '#00E5FF',
  edge:  '#FFB800',
}

export function CourseLandingClient({ course }: { course: Course }) {
  const [openModule, setOpenModule] = useState<string | null>(course.modules[0]?.id ?? null)
  const [enrolled, setEnrolled] = useState(() => isEnrolled(course.id))
  const [waitlisted, setWaitlisted] = useState(false)
  const [waitlistBusy, setWaitlistBusy] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const accent = TRACK_ACCENT[course.track] ?? '#00E5FF'

  const handleEnroll = () => {
    enrollLocally(course.id, course.price_inr > 0)
    setEnrolled(true)
  }

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistError(null)
    setWaitlistBusy(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'academy-waitlist',
          page: typeof window !== 'undefined' ? window.location.pathname : null,
          meta: {
            courseId: course.id,
            courseSlug: course.slug,
            courseTitle: course.title,
            track: course.track,
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setWaitlistError(data.error || 'Something went wrong. Please try again.')
        return
      }
      try {
        ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
          'event', 'lead_capture', { method: 'academy-waitlist', course: course.slug },
        )
      } catch { /* ignore */ }
      setWaitlisted(true)
    } catch {
      setWaitlistError('Network error. Please try again.')
    } finally {
      setWaitlistBusy(false)
    }
  }

  const firstLesson = course.modules[0]?.lessons[0]
  const firstLessonHref = firstLesson
    ? `/academy/c/${course.slug}/learn/${firstLesson.slug}`
    : `/academy/c/${course.slug}`

  const lessonIcon = (type: string) =>
    type === 'video' ? '🎬' : type === 'quiz' ? '✏️' : type === 'code-challenge' ? '💻' :
    type === 'simulation' ? '🤖' : type === 'hands-on' ? '🔧' : '📖'

  const isComing = Boolean(course.coming_soon)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 18px 100px', color: '#f4f4f5' }}>

      {/* ── HERO ────────────────────────────────────────────── */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: course.thumbnail_url ? '1fr auto' : '1fr',
        gap: 24,
        alignItems: 'center',
        padding: 28,
        background: `linear-gradient(135deg, ${accent}22, rgba(0,229,255,0.08))`,
        border: `1px solid ${accent}44`,
        borderRadius: 22,
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isComing && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            background: `${accent}22`, border: `1px solid ${accent}66`,
            color: accent, fontWeight: 900, fontSize: 11,
            letterSpacing: 2, textTransform: 'uppercase',
            padding: '4px 12px', borderRadius: 999,
          }}>
            Coming Soon
          </div>
        )}
        <div>
          <p style={{ fontSize: 11, letterSpacing: 3, color: accent, fontWeight: 900, margin: '0 0 8px', textTransform: 'uppercase' }}>
            {course.track} Track · {course.level}
          </p>
          <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.15 }}>
            {course.title}
          </h1>
          {course.subtitle && (
            <p style={{ color: '#c4b5fd', fontSize: 17, margin: '0 0 18px', lineHeight: 1.4 }}>
              {course.subtitle}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              `📚 ${course.total_lessons} lessons`,
              course.duration_hours ? `⏱ ${course.duration_hours}h` : null,
              `⭐ ${course.total_xp} XP`,
              course.cbse_aligned ? '🇮🇳 CBSE aligned' : null,
              course.nep_aligned ? '🇮🇳 NEP 2020 aligned' : null,
              course.language === 'both' ? '🌐 Hindi + English' : null,
            ].filter(Boolean).map((label, i) => (
              <span key={i} style={{
                fontSize: 13, color: '#d6f1ff', fontWeight: 700,
                padding: '4px 12px', borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
              }}>{label}</span>
            ))}
          </div>
        </div>
        {course.thumbnail_url && (
          <img src={course.thumbnail_url} alt="" style={{ maxWidth: 220, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
      </header>

      {/* ── BODY GRID ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* MAIN */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* About */}
          {course.description && (
            <Section title="About this course" accent={accent}>
              <p style={{ color: '#c8d0dc', lineHeight: 1.7, margin: 0 }}>{course.description}</p>
            </Section>
          )}

          {/* What you'll learn */}
          {course.what_youll_learn && course.what_youll_learn.length > 0 && (
            <Section title="What you'll learn" accent={accent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {course.what_youll_learn.map((o, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#d1fae5', fontSize: 14 }}>
                    <span style={{ color: '#10b981', fontWeight: 900, marginTop: 2 }}>✓</span>
                    <span>{o}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Hardware requirements */}
          {course.hardware_requirements && course.hardware_requirements.length > 0 && (
            <Section title="Hardware you'll need" accent={accent}>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>
                Estimated total cost: ₹{course.hardware_requirements.reduce((s, h) => s + (h.price_inr ?? 0), 0).toLocaleString('en-IN')} — all available on Amazon.in, Flipkart, and Robocraze.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {course.hardware_requirements.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: '#e2e8f0' }}>{h.name}</span>
                    {h.price_inr && <span style={{ color: '#fde047', fontWeight: 700 }}>₹{h.price_inr}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Course structure */}
          <Section title="Course structure" accent={accent}>
            {isComing && course.modules.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                Detailed lesson breakdown will be published when this course launches.
                Join the list below to get notified first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {course.modules.map(mod => {
                  const expanded = openModule === mod.id
                  return (
                    <div key={mod.id} style={{
                      background: 'rgba(11,18,32,0.7)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}>
                      <button
                        type="button"
                        onClick={() => setOpenModule(expanded ? null : mod.id)}
                        style={{
                          width: '100%', padding: '14px 16px',
                          background: 'transparent', border: 'none',
                          display: 'grid', gridTemplateColumns: '32px 1fr auto 28px', gap: 12,
                          alignItems: 'center', cursor: 'pointer', color: '#f4f4f5',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, display: 'grid', placeItems: 'center',
                          background: `${accent}28`, color: accent,
                          fontWeight: 900, borderRadius: '50%', fontSize: 13,
                        }}>
                          {mod.order_index + 1}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{mod.title}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {mod.lessons.length > 0 ? `${mod.lessons.length} lessons` : mod.duration_minutes ? `~${mod.duration_minutes} min` : ''}
                        </span>
                        <span style={{
                          width: 24, height: 24, display: 'grid', placeItems: 'center',
                          background: 'rgba(255,255,255,0.07)', borderRadius: 6, fontWeight: 900,
                        }}>
                          {expanded ? '−' : '+'}
                        </span>
                      </button>

                      {expanded && mod.description && (
                        <div style={{ padding: '4px 16px 14px 60px', color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                          {mod.description}
                          {isComing && (
                            <span style={{ color: accent, fontWeight: 700, marginLeft: 8 }}>— Full lesson list at launch</span>
                          )}
                        </div>
                      )}

                      {expanded && mod.lessons.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: '4px 12px 12px', margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {mod.lessons.map(l => (
                            <li key={l.id}>
                              <Link
                                href={`/academy/c/${course.slug}/learn/${l.slug}`}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '24px 1fr auto auto',
                                  gap: 10, alignItems: 'center',
                                  padding: '10px 12px', borderRadius: 8,
                                  textDecoration: 'none', color: '#c4b5fd', fontSize: 14,
                                }}
                              >
                                <span>{lessonIcon(l.lesson_type)}</span>
                                <span style={{ fontWeight: 600 }}>{l.title}</span>
                                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {l.duration_minutes} min · +{l.xp_reward} XP
                                </span>
                                {l.is_free_preview && (
                                  <span style={{
                                    background: 'rgba(16,185,129,0.2)', color: '#6ee7b7',
                                    fontSize: 10, letterSpacing: 1,
                                    padding: '2px 8px', borderRadius: 999, fontWeight: 900,
                                  }}>
                                    Preview
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Instructor */}
          {course.instructor && (
            <Section title="Your instructor" accent={accent}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {course.instructor.photo_url && (
                  <img src={course.instructor.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div>
                  <p style={{ fontWeight: 900, color: '#fde047', margin: '0 0 4px' }}>{course.instructor.display_name}</p>
                  {course.instructor.bio && (
                    <p style={{ color: '#c8d0dc', fontSize: 14, margin: '0 0 10px', lineHeight: 1.5 }}>{course.instructor.bio}</p>
                  )}
                  {course.instructor.credentials && course.instructor.credentials.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {course.instructor.credentials.map((c, i) => (
                        <span key={i} style={{
                          background: 'rgba(255,255,255,0.05)', padding: '4px 10px',
                          borderRadius: 999, fontSize: 11, color: '#c4b5fd', fontWeight: 700,
                        }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Prerequisites */}
          {course.prerequisites && course.prerequisites.length > 0 && (
            <Section title="Before you start" accent={accent}>
              <ul style={{ color: '#c8d0dc', paddingLeft: 20, lineHeight: 1.7, margin: 0 }}>
                {course.prerequisites.map((p, i) => <li key={i}>{p.replace(/-/g, ' ')}</li>)}
              </ul>
            </Section>
          )}
        </main>

        {/* ── SIDEBAR CTA ──────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 16 }}>
          <div style={{
            background: `linear-gradient(135deg, ${accent}18, rgba(165,107,255,0.12))`,
            border: `1px solid ${accent}44`,
            borderRadius: 18, padding: 24,
          }}>
            {isComing ? (
              /* COMING SOON — waitlist CTA */
              <>
                <p style={{ fontSize: 13, color: accent, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 10px' }}>
                  Launching soon
                </p>
                <p style={{ color: '#c4b5fd', fontSize: 14, margin: '0 0 18px', lineHeight: 1.5 }}>
                  {course.waitlist_cta ?? 'Be the first to know when this course launches.'}
                </p>
                {!waitlisted ? (
                  <form onSubmit={handleWaitlist} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '11px 14px',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 10, color: '#f4f4f5',
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={waitlistBusy}
                      style={{
                        padding: '13px 20px',
                        background: `linear-gradient(135deg, ${accent}, #A56BFF)`,
                        color: '#0f0a1e', fontWeight: 900, fontSize: 15,
                        border: 'none', borderRadius: 10,
                        cursor: waitlistBusy ? 'not-allowed' : 'pointer',
                        opacity: waitlistBusy ? 0.7 : 1,
                      }}
                    >
                      {waitlistBusy ? 'Adding you…' : 'Notify me at launch →'}
                    </button>
                    {waitlistError && (
                      <p role="alert" style={{ margin: 0, fontSize: 13, color: '#f87171' }}>
                        {waitlistError}
                      </p>
                    )}
                  </form>
                ) : (
                  <div style={{
                    padding: '14px 18px',
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: 10, color: '#6ee7b7', fontSize: 14, fontWeight: 700,
                  }}>
                    ✓ You're on the list. We'll email you first.
                  </div>
                )}
              </>
            ) : (
              /* LIVE COURSE — enroll CTA */
              <>
                {/* Enrol / Continue button */}
                {!enrolled ? (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    style={{
                      display: 'block', width: '100%', textAlign: 'center',
                      padding: '14px 20px', minHeight: 52,
                      background: `linear-gradient(135deg, ${accent}, #A56BFF)`,
                      color: '#0f0a1e', fontWeight: 900, fontSize: 16,
                      border: 'none', borderRadius: 12, cursor: 'pointer',
                    }}
                  >
                    🚀 Start Learning
                  </button>
                ) : (
                  <Link href={firstLessonHref} style={{
                    display: 'block', textAlign: 'center',
                    padding: '14px 20px',
                    background: `linear-gradient(135deg, ${accent}, #A56BFF)`,
                    color: '#0f0a1e', fontWeight: 900, fontSize: 16,
                    borderRadius: 12, textDecoration: 'none',
                  }}>
                    Continue learning →
                  </Link>
                )}

                {/* Preview link */}
                {firstLesson && !enrolled && (
                  <Link href={firstLessonHref} style={{
                    display: 'block', textAlign: 'center', marginTop: 10,
                    color: accent, fontWeight: 700, fontSize: 13, textDecoration: 'underline',
                  }}>
                    Preview first lesson →
                  </Link>
                )}
              </>
            )}

            {/* Perks */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#c8d0dc' }}>
              {[
                '📜 Verifiable certificate on completion',
                '🔄 Spaced repetition reviews built in',
                '💬 Community discussion per lesson',
                '📱 Mobile-friendly · works on 3G',
                course.language === 'both' ? '🌐 Hindi + English content' : '🇮🇳 Built for Indian learners',
              ].map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          {/* Stats strip */}
          <div style={{
            marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}>
            {[
              { label: 'Lessons', value: course.total_lessons },
              { label: 'XP to earn', value: `${course.total_xp.toLocaleString('en-IN')} XP` },
              { label: 'Duration', value: course.duration_hours ? `${course.duration_hours}h` : '—' },
              { label: 'Level', value: course.level },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '10px 14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: accent }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── HELPER ────────────────────────────────────────────────────
function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <section style={{
      background: 'rgba(15,18,32,0.6)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16, padding: 22,
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: accent, margin: '0 0 16px' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}
