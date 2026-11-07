// Automatic emails: welcome series (day 2, day 5), course nudges (day 2, 5, 10
// of inactivity), and certificate congratulations. Runs from the existing
// daily cron (Vercel Hobby allows only 2 crons). Every send is logged in
// email_log so nobody ever gets the same email twice.
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { listPublishedCourses } from '@/lib/courses'
import { BASE_URL, button, esc, renderEmail } from '@/lib/email-layout'
import { getNewsData } from '@/lib/news'
import { getAllAtlasEntries } from '@/lib/atlas'
import { SHORTS } from '@/lib/shorts'

const DAY = 86_400_000
const MAX_PER_RUN = 80 // stay well inside Resend free limits (100/day)

type Result = { welcome: number; nudges: number; certs: number; weekly: number; errors: string[] }

export async function runEmailAutomation(): Promise<Result> {
  const out: Result = { welcome: 0, nudges: 0, certs: 0, weekly: 0, errors: [] }
  const apiKey = process.env.RESEND_API_KEY
  const fromEnv = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !fromEnv) { out.errors.push('RESEND_API_KEY / RESEND_FROM_EMAIL missing'); return out }
  const from: string = fromEnv

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const sb = createSupabaseAdminClient()
  let budget = MAX_PER_RUN

  async function sendOnce(email: string, kind: string, subject: string, html: string): Promise<boolean> {
    if (budget <= 0) return false
    const { error: dup } = await sb.from('email_log').insert({ email: email.toLowerCase(), kind })
    if (dup) return false // already sent (unique violation) or log table missing
    const { error } = await resend.emails.send({ from, to: email, subject, html })
    if (error) {
      out.errors.push(`${kind}: ${error.message}`)
      await sb.from('email_log').delete().eq('email', email.toLowerCase()).eq('kind', kind)
      return false
    }
    budget -= 1
    return true
  }

  // ── 1. Welcome series for newsletter subscribers ───────────────────────
  try {
    const { data: subs } = await sb.from('newsletter_subscribers')
      .select('email, subscribed_at, unsubscribe_token').eq('active', true)
      .gte('subscribed_at', new Date(Date.now() - 8 * DAY).toISOString())
    for (const s of subs ?? []) {
      const age = (Date.now() - new Date(s.subscribed_at as string).getTime()) / DAY
      const unsub = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(String(s.unsubscribe_token ?? ''))}`
      const email = String(s.email)
      if (age >= 2) {
        const html = renderEmail({
          preheader: 'Five minutes, no setup, no cost.',
          heading: 'Try a robot simulator today',
          bodyHtml: `<p>Reading about robots is good. Driving one is better. Our free simulators run in your browser. Nothing to install.</p><p>Try one and change a setting. Watch what breaks. That is how engineers learn.</p>${button('Open the simulators', `${BASE_URL}/visualizer`)}`,
          unsubscribeUrl: unsub,
        })
        if (await sendOnce(email, 'welcome-2', 'Try a robot simulator (5 minutes)', html)) out.welcome++
      }
      if (age >= 5) {
        const html = renderEmail({
          preheader: 'Five short courses. Quizzes, a final activity and a certificate.',
          heading: 'Your free robotics learning path',
          bodyHtml: `<p>R2BOT has a free path of five courses, from "what is a robot" to robot vision and AI. Each lesson is about four minutes. Pass the quiz, finish the final activity, and get a certificate you can share.</p>${button('See the free course path', `${BASE_URL}/courses`)}`,
          unsubscribeUrl: unsub,
        })
        if (await sendOnce(email, 'welcome-3', 'Your free robotics course path', html)) out.welcome++
      }
    }
  } catch (e) { out.errors.push(`welcome: ${(e as Error).message}`) }

  // ── 2. Course nudges + certificate congratulations ─────────────────────
  try {
    const courses = listPublishedCourses().filter((c) => c.lessons.some((l) => l.youtubeId))
    const bySlug = new Map(courses.map((c) => [c.slug, c]))
    if (bySlug.size) {
      const slugs = [...bySlug.keys()]
      const { data: comps } = await sb.from('lesson_completions')
        .select('user_id, course_slug, completed_at').in('course_slug', slugs)
      const { data: watch } = await sb.from('video_watch')
        .select('user_id, course_slug, updated_at').in('course_slug', slugs)
      const { data: certs } = await sb.from('certificates')
        .select('user_id, lesson_slug, certificate_id, issued_at').eq('track', 'video')

      // last activity and completion count per user+course
      const last = new Map<string, { user: string; course: string; at: number; done: number }>()
      const touch = (u: string, c: string, t: string, isDone: boolean) => {
        const k = `${u}|${c}`
        const cur = last.get(k) ?? { user: u, course: c, at: 0, done: 0 }
        cur.at = Math.max(cur.at, new Date(t).getTime())
        if (isDone) cur.done++
        last.set(k, cur)
      }
      for (const r of comps ?? []) touch(r.user_id, r.course_slug, r.completed_at, true)
      for (const r of watch ?? []) touch(r.user_id, r.course_slug, r.updated_at, false)

      const certKey = new Set((certs ?? []).map((c) => `${c.user_id}|${String(c.lesson_slug).replace('course:', '')}`))
      const userIds = [...new Set([...last.values()].map((v) => v.user).concat((certs ?? []).map((c) => c.user_id)))]
      const { data: profs } = userIds.length
        ? await sb.from('profiles').select('id, email, display_name, email_digest_enabled, digest_unsubscribe_token').in('id', userIds)
        : { data: [] as Array<Record<string, unknown>> }
      const prof = new Map((profs ?? []).map((p) => [String(p.id), p]))

      for (const v of last.values()) {
        const p = prof.get(v.user); const c = bySlug.get(v.course)
        if (!p?.email || !c || p.email_digest_enabled === false || certKey.has(`${v.user}|${v.course}`)) continue
        const idle = (Date.now() - v.at) / DAY
        const step = idle >= 10 ? 10 : idle >= 5 ? 5 : idle >= 2 ? 2 : 0
        if (!step) continue
        const name = String(p.display_name ?? '').split(' ')[0] || 'there'
        const left = Math.max(c.lessons.length - v.done, 0)
        const copy: Record<number, { subj: string; line: string }> = {
          2: { subj: `Pick up "${c.title}" where you left off`, line: `You are ${v.done} of ${c.lessons.length} lessons in. The next one takes about four minutes.` },
          5: { subj: `${left} short lessons left in "${c.title}"`, line: `Only ${left} lesson${left === 1 ? '' : 's'} to go. Small steps add up, and the certificate is close.` },
          10: { subj: `Still want to finish "${c.title}"?`, line: `No pressure. Your progress is saved, so you can continue in a few minutes whenever you like.` },
        }
        const unsub = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(String(p.digest_unsubscribe_token ?? ''))}`
        const html = renderEmail({
          preheader: copy[step].line, heading: `Hi ${esc(name)}, your course is waiting`,
          bodyHtml: `<p>${esc(copy[step].line)}</p>${button('Continue the course', `${BASE_URL}/courses/${c.slug}`)}`,
          unsubscribeUrl: unsub,
        })
        if (await sendOnce(String(p.email), `nudge-${step}:${c.slug}`, copy[step].subj, html)) out.nudges++
      }

      for (const ct of certs ?? []) {
        if (Date.now() - new Date(ct.issued_at as string).getTime() > 3 * DAY) continue
        const p = prof.get(String(ct.user_id)); if (!p?.email) continue
        const slug = String(ct.lesson_slug).replace('course:', ''); const c = bySlug.get(slug); if (!c) continue
        const idx = courses.findIndex((x) => x.slug === slug); const next = courses[idx + 1]
        const verify = `${BASE_URL}/verify/${ct.certificate_id}`
        const unsub = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(String(p.digest_unsubscribe_token ?? ''))}`
        const html = renderEmail({
          preheader: 'Your certificate is ready to share.', heading: `Congratulations, you finished ${esc(c.title)}`,
          bodyHtml: `<p>Your certificate is ready. Anyone can check it at this link:</p><p><a href="${verify}" style="color:#FC6818">${verify}</a></p>${button('View my certificate', verify)}${next ? `<p>Next in the path: <strong>${esc(next.title)}</strong>.</p>${button('Start the next course', `${BASE_URL}/courses/${next.slug}`)}` : ''}`,
          unsubscribeUrl: unsub,
        })
        if (await sendOnce(String(p.email), `cert:${ct.certificate_id}`, `Your certificate: ${c.title}`, html)) out.certs++
      }
    }
  } catch (e) { out.errors.push(`nudges: ${(e as Error).message}`) }

  // ── 3. R2BOT Weekly for every newsletter subscriber (Fridays, UTC) ─────
  try {
    const now = new Date()
    if (now.getUTCDay() === 5) {
      const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1)
      const week = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - yearStart) / (7 * DAY))
      const kind = `weekly-${now.getUTCFullYear()}-${week}`
      let stories: { title: string; summary: string; href: string }[] = []
      try {
        const news = await getNewsData()
        stories = news.articles.slice(0, 3).map((a) => ({ title: a.title, summary: a.aiSummary || a.description || '', href: a.url }))
      } catch { stories = [] }
      const atlas = [...getAllAtlasEntries()].sort((a, b) => a.slug.localeCompare(b.slug))
      const term = atlas.length ? atlas[week % atlas.length] : null
      const storiesHtml = stories.length
        ? `<h3 style="margin:18px 0 6px">In the news</h3>` + stories.map((st) => `<p style="margin:0 0 12px"><a href="${esc(st.href)}" style="color:#0B2540;font-weight:700">${esc(st.title)}</a><br>${esc(st.summary.slice(0, 180))}</p>`).join('')
        : ''
      const termHtml = term ? `<h3 style="margin:18px 0 6px">Term of the week</h3><p style="margin:0 0 6px"><a href="${BASE_URL}/atlas/${esc(term.type)}/${esc(term.slug)}" style="color:#0B2540;font-weight:700">${esc(term.title)}</a> explained in plain English.</p>` : ''
      const lesson = SHORTS[week % SHORTS.length]
      const lessonHtml = `<h3 style="margin:18px 0 6px">One-minute lesson</h3><p style="margin:0 0 6px"><a href="${BASE_URL}/shorts/${esc(lesson.slug)}" style="color:#0B2540;font-weight:700">${esc(lesson.title)}</a><br>${esc(lesson.summary)} Watch it, play with the demo, answer one question.</p>`
      const { data: subs } = await sb.from('newsletter_subscribers').select('email, unsubscribe_token').eq('active', true)
      for (const sub of subs ?? []) {
        const unsub = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(String(sub.unsubscribe_token ?? ''))}`
        const html = renderEmail({
          preheader: 'Robotics this week, in plain English.',
          heading: 'R2BOT Weekly',
          bodyHtml: `<p>Three things worth knowing this week.</p>${storiesHtml}${lessonHtml}${termHtml}<h3 style="margin:18px 0 6px">Keep learning</h3><p style="margin:0 0 6px">Five free courses with quizzes and certificates.</p>${button('Open the courses', `${BASE_URL}/courses`)}`,
          unsubscribeUrl: unsub,
        })
        if (await sendOnce(String(sub.email), kind, 'R2BOT Weekly: robotics in plain English', html)) out.weekly++
      }
    }
  } catch (e) { out.errors.push(`weekly: ${e instanceof Error ? e.message : String(e)}`) }

  return out
}
