'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import InlineSignup from '@/components/InlineSignup'
import { trackEvent } from '@/components/SiteViewCounter'

const KEY = 'r2bot_shorts_done'

function readDone(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [] } catch { return [] }
}
function markDone(slug: string) {
  try { const d = new Set(readDone()); d.add(slug); localStorage.setItem(KEY, JSON.stringify([...d])) } catch { /* ignore */ }
}

export function useDone(): string[] {
  const [d, setD] = useState<string[]>([])
  useEffect(() => { setD(readDone()) }, [])
  return d
}

/** Click-to-load YouTube Short (no third-party load until the learner asks). */
export function ShortEmbed({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false)
  return (
    <div style={{ position: 'relative', width: 'min(100%, 270px)', aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', background: '#0A0E17', border: '1px solid rgba(255,255,255,0.14)' }}>
      {play ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      ) : (
        <button onClick={() => setPlay(true)} aria-label={`Play: ${title}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, padding: 0, cursor: 'pointer', background: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg) center/cover` }}>
          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: 999, background: '#FC6818', color: '#0A0E17', fontSize: 28, display: 'grid', placeItems: 'center' }}>▶</span>
        </button>
      )}
    </div>
  )
}

const L_EN = { check: 'QUICK CHECK', before: '· ✓ DONE BEFORE', ok: 'Correct.', no: 'Not quite.', retry: 'Try again', next: 'Next:' }
const L_HI = { check: 'छोटी जाँच', before: '· ✓ पहले पूरा किया', ok: 'सही।', no: 'पूरी तरह नहीं।', retry: 'फिर कोशिश करें', next: 'अगला:' }
const L_ES = { check: 'PREGUNTA RÁPIDA', before: '· ✓ COMPLETADA', ok: 'Correcto.', no: 'No exactamente.', retry: 'Intentar de nuevo', next: 'Siguiente:' }
const L_ZH = { check: '小测验', before: '· ✓ 已完成', ok: '答对了。', no: '再想想。', retry: '再试一次', next: '下一课：' }

export function LessonQuiz({ slug, quiz, nextHref, nextTitle, lang = 'en' }: { slug: string; quiz: { q: string; options: [string, string, string]; answer: number; why: string }; nextHref: string; nextTitle: string; lang?: 'en' | 'zh' | 'hi' | 'es' }) {
  const L = lang === 'zh' ? L_ZH : lang === 'hi' ? L_HI : lang === 'es' ? L_ES : L_EN
  const [pick, setPick] = useState<number | null>(null)
  const done = useDone()
  const correct = pick === quiz.answer
  useEffect(() => {
    if (!correct) return
    markDone(slug)
    // The funnel milestone that matters: someone watched a lesson and got the
    // question right. This is also where the email ask appears, so the two
    // numbers can be compared.
    trackEvent('lesson_quiz_correct')
  }, [correct, slug])
  return (
    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', margin: '24px 0' }}>
      <div style={{ color: '#FC6818', fontWeight: 800, fontSize: 12 }}>{L.check} {done.includes(slug) && pick === null ? L.before : ''}</div>
      <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '8px 0 12px' }}>{quiz.q}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {quiz.options.map((o, i) => {
          const chosen = pick === i
          const bg = pick === null ? 'rgba(255,255,255,0.04)' : i === quiz.answer ? 'rgba(74,222,128,0.18)' : chosen ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.03)'
          return <button key={i} onClick={() => setPick(i)} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, color: '#fff', fontSize: 15, cursor: 'pointer', background: bg, border: '1px solid rgba(255,255,255,0.15)' }}>{o}</button>
        })}
      </div>
      {pick !== null && (
        <div style={{ marginTop: 14 }}>
          <p style={{ color: correct ? '#4ade80' : '#fbbf24', fontWeight: 800, margin: 0 }}>{correct ? L.ok : L.no}</p>
          <p style={{ color: '#e2e8f0', margin: '4px 0 12px', lineHeight: 1.6 }}>{quiz.why}</p>
          {correct ? (
            <>
              <Link href={nextHref} style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 12, background: '#FC6818', color: '#0A0E17', fontWeight: 800, textDecoration: 'none' }}>{L.next} {nextTitle} →</Link>
              <div style={{ marginTop: 18 }}><InlineSignup lang={lang} /></div>
            </>
          ) : (
            <button onClick={() => setPick(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FC6818', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{L.retry}</button>
          )}
        </div>
      )}
    </div>
  )
}

export function ProgressBar({ slugs, lang = 'en' }: { slugs: string[]; lang?: 'en' | 'zh' | 'hi' | 'es' }) {
  const done = useDone()
  const n = slugs.filter((s) => done.includes(s)).length
  return (
    <div style={{ margin: '14px 0' }} aria-label={lang === 'zh' ? `已完成 ${n} / ${slugs.length}` : lang === 'hi' ? `${slugs.length} में से ${n} पूरे` : lang === 'es' ? `${n} de ${slugs.length} lecciones rápidas completadas` : `${n} of ${slugs.length} quick lessons finished`}>
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(n / slugs.length) * 100}%`, background: '#FC6818', transition: 'width .6s' }} />
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{lang === 'zh' ? `已完成 ${n} / ${slugs.length}（保存在本设备）` : lang === 'hi' ? `${slugs.length} में से ${n} पूरे (इसी डिवाइस पर सहेजे)` : lang === 'es' ? `${n} de ${slugs.length} completadas en este dispositivo` : `${n} of ${slugs.length} finished on this device`}</div>
    </div>
  )
}

export function Tick({ slug }: { slug: string }) {
  const done = useDone()
  return done.includes(slug) ? <span aria-label="finished" style={{ color: '#4ade80', fontWeight: 900 }}>✓</span> : null
}
