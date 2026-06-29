'use client'
// app/schools/SchoolsClient.tsx — all interactive UI for the Schools B2B page

import { useState } from 'react'
import Link from 'next/link'

/* ─── Data ────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "We introduced R2BOT in our Grade 8 science period. Within two weeks every student had built and tested their own line-follower — completely in the browser. Parents were sending videos.",
    name: 'Priya Sharma', role: 'Science & Computer Teacher', school: 'Kendriya Vidyalaya, Pune', avatar: '👩‍🏫',
  },
  {
    quote: "Our school had zero robotics infrastructure. R2BOT removed that excuse entirely. The CBSE alignment table alone saved me 3 hours of lesson planning.",
    name: 'Rajesh Verma', role: 'STEM Coordinator', school: 'Delhi Public School, Noida', avatar: '👨‍💼',
  },
  {
    quote: "Students who never touched a keyboard were coding robots by day 3. The Hindi + English dual language is a huge equaliser for our Tier-2 city students.",
    name: 'Anita Kulkarni', role: 'Principal', school: 'Vidya Bhavan English Medium, Nashik', avatar: '👩‍💼',
  },
  {
    quote: "The teacher dashboard shows me exactly which student is stuck on which concept. I can intervene before the student gives up — that's never been possible before.",
    name: 'Suresh Pillai', role: 'ICT Teacher', school: 'Christ Nagar School, Thiruvananthapuram', avatar: '👨‍🏫',
  },
]

const FEATURES_TEACHER = [
  { icon: '📋', title: 'Class Codes', body: "Generate a 6-character class code instantly. Share with students on WhatsApp — they join in one tap, no email required." },
  { icon: '📊', title: 'Live Progress Table', body: "See every student's lesson completion, quiz scores, XP earned, and simulator attempts — all in one real-time table." },
  { icon: '🎯', title: 'Mission Assignment', body: "Assign specific simulator missions as homework. Set due dates. Auto-grade triggers the moment a student submits." },
  { icon: '📄', title: 'Worksheet Generator', body: "One click generates a printable worksheet for any lesson — questions, diagrams, fill-in-the-blanks. PDF-ready." },
  { icon: '📬', title: 'Student Alerts', body: "Get notified when a student is stuck (no activity for 24h). Reach out before they drop off." },
  { icon: '📁', title: 'CSV Export', body: "Export the full class progress as CSV. Paste into your school's report system in seconds." },
  { icon: '📝', title: 'Lesson Notes', body: "Add private notes on each student visible only to you. Track learning patterns across the term." },
  { icon: '🔁', title: 'Reassignment', body: "Failed a quiz? Re-assign it with one click. Set a new attempt limit and schedule." },
]

const FEATURES_STUDENT = [
  { icon: '🤖', title: 'Browser Simulator', body: "No download. No kit. Open a tab, program a robot, watch it move — works on any school or home laptop." },
  { icon: '🏆', title: 'XP & Leaderboard', body: "Earn XP for every lesson and quiz. See where you stand in your class on a weekly leaderboard." },
  { icon: '🎓', title: 'Certificates', body: "Complete a track, earn a verifiable certificate with a unique ID. Share on LinkedIn or print for your portfolio." },
  { icon: '🌐', title: 'Hindi + English', body: "Every lesson available in English, Hindi, or both. Switch mid-lesson without losing progress." },
  { icon: '📱', title: 'Works on Phone', body: "Full learning experience on a smartphone. Students with no laptop can still complete lessons and quizzes." },
  { icon: '🔄', title: 'Spaced Repetition', body: "Smart review system (SM-2) resurfaces concepts you're about to forget — the same technique used by medical students." },
]

const FEATURES_ADMIN = [
  { icon: '🏫', title: 'Multi-Class Management', body: "One admin account to manage every class in the school. Assign teachers to classes. Revoke access instantly." },
  { icon: '📈', title: 'School Analytics', body: "School-wide metrics: total active students, average quiz score, lessons completed this week, certificates issued." },
  { icon: '👥', title: 'Teacher Accounts', body: "Add/remove teachers. Set per-teacher class limits. Each teacher sees only their own classes." },
  { icon: '🔒', title: 'Student Privacy', body: "Full DPDP-compliant student data handling. No third-party ad trackers. Student data stays in India." },
  { icon: '📜', title: 'Certificate Registry', body: "Admin-level certificate log: verify any certificate issued by your school by ID or student name." },
  { icon: '🛠️', title: 'Custom Branding', body: "Add your school logo and name to all student-facing dashboards and certificates." },
]

const ALIGNMENT = [
  { grade: '6',    cbse: 'Computer Awareness — Introduction to Technology',     unit: 'What Even IS a Robot?',          mins: 15, nep: true  },
  { grade: '7',    cbse: 'Around Us — Technology in Daily Life',                unit: "Robots You've Used Today",       mins: 12, nep: true  },
  { grade: '8',    cbse: 'How Things Work — Machines & Mechanisms',             unit: 'How Robots Move',                mins: 20, nep: true  },
  { grade: '9',    cbse: 'Sensors & Systems (Optional Robotics module)',        unit: 'How Robots See and Feel',        mins: 22, nep: true  },
  { grade: '9',    cbse: 'Algorithms & Flowcharts — CS Chapter 2',             unit: 'Talk to a Robot',                mins: 25, nep: false },
  { grade: '10',   cbse: 'Electronics — IoT Basics',                           unit: 'Arduino: Your First Robot Brain',mins: 25, nep: false },
  { grade: '10',   cbse: 'Control Systems (CBSE Skill Subject)',               unit: 'PID — How Robots Stay Balanced', mins: 28, nep: true  },
  { grade: '11',   cbse: 'Computer Science — Chapter 3: Python & Libraries',   unit: 'Python × Robotics',             mins: 30, nep: false },
  { grade: '12',   cbse: 'Artificial Intelligence (Skill Elective)',            unit: 'Vision + ROS2 intro + AI',      mins: 40, nep: true  },
]

const HOW_IT_WORKS = [
  { n: 1, title: 'School registers (5 min)',        body: "Teacher or admin fills the form below. We send a welcome kit with class-join codes within 24 hours.", detail: 'No procurement. No paper. No IT department needed.' },
  { n: 2, title: 'Students join + diagnostic',      body: "Students enter the 6-char class code, take a 20-question placement test, and get placed in Beginner / Explorer / Builder.", detail: 'Personalised from day one — no one is left behind.' },
  { n: 3, title: 'Teach → Simulate → Build',        body: "Teachers assign lessons. Students read, simulate, quiz — then optionally build a physical project.", detail: 'Each lesson is self-contained. Works as homework or in-period.' },
  { n: 4, title: 'Certify + Showcase',              body: "Completing a track earns a school-issued certificate. Students can submit builds to the R2BOT community gallery.", detail: 'Real credentials on a shareable portfolio.' },
]

const STATS = [
  { n: '92%',    label: 'of Indian schools have no robotics lab',               tone: 'red'     as const },
  { n: '₹15k+', label: 'average cost of a single robot kit — per student',     tone: 'amber'   as const },
  { n: '0',      label: 'lab, kit, or installation needed with R2BOT',          tone: 'emerald' as const },
  { n: '3 min',  label: 'from class code to first simulator session',           tone: 'cyan'    as const },
]

const FAQ = [
  { q: 'Does R2BOT require any hardware?', a: 'No. The entire R2BOT platform — lessons, quizzes, simulators, projects — runs in any modern browser. Students who want to extend their projects can optionally buy an Arduino kit (~₹1,500), but this is never required.' },
  { q: 'Is it available in Hindi?', a: 'Yes. Every lesson is available in English, Hindi, or a bilingual toggle. Students can switch languages mid-lesson without losing progress.' },
  { q: 'Is the content aligned to CBSE / NEP 2020?', a: "Yes. We have a full alignment table mapping every R2BOT unit to a CBSE chapter for grades 6–12. NEP 2020's competency-based learning framework is the design foundation of our curriculum." },
  { q: 'How do teachers access the dashboard?', a: 'Teachers sign up with a school email, create a class, and share the join code. The dashboard is web-based — no app download needed.' },
  { q: 'What data do you collect on students?', a: 'R2BOT collects only what is needed for the learning experience: username, progress data, and quiz scores. No ads, no data sold, DPDP-compliant. Student data is stored in Indian data centres.' },
  { q: 'Can we try before committing?', a: "Absolutely. Register below and we'll set up a 30-day pilot for your school — no commitment needed." },
]

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatCard({ n, label, tone }: { n: string; label: string; tone: 'red' | 'amber' | 'emerald' | 'cyan' }) {
  const col = { red: '#f87171', amber: '#fbbf24', emerald: '#34d399', cyan: '#22d3ee' }[tone]
  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 24 }}>
      <p style={{ fontSize: 36, fontWeight: 900, color: col, margin: 0 }}>{n}</p>
      <p style={{ marginTop: 8, fontSize: 13, color: '#9ca3af' }}>{label}</p>
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', padding: 20 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
      <p style={{ marginTop: 6, fontSize: 12, color: '#9ca3af', lineHeight: 1.65 }}>{body}</p>
    </div>
  )
}

function StepCard({ n, title, body, detail }: { n: number; title: string; body: string; detail: string }) {
  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: '#f59e0b', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>{n}</div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
          <p style={{ marginTop: 6, fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{body}</p>
          <p style={{ marginTop: 8, fontSize: 12, color: '#fbbf24', fontWeight: 500 }}>{detail}</p>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}>
        <span>{q}</span>
        <span style={{ flexShrink: 0, color: '#fbbf24', fontSize: 18 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <p style={{ paddingBottom: 16, fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{a}</p>}
    </div>
  )
}

function SchoolContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [formData, setFormData] = useState({ schoolName: '', city: '', grade: '', teacherName: '', email: '', phone: '', message: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    // TODO: POST /api/schools/interest
    await new Promise(r => setTimeout(r, 900))
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div style={{ borderRadius: 20, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>We&apos;ll reach out within 24 hours!</h3>
        <p style={{ marginTop: 8, color: '#9ca3af', fontSize: 14 }}>Check your email — we&apos;ll send a personalised demo link and onboarding kit for {formData.schoolName || 'your school'}.</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 5 }

  return (
    <form onSubmit={handleSubmit} style={{ borderRadius: 20, border: '1px solid rgba(251,191,36,0.15)', background: 'rgba(255,255,255,0.02)', padding: 32 }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 0, marginBottom: 24 }}>Get your school started</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={labelStyle}>School name *</span>
          <input name="schoolName" required value={formData.schoolName} onChange={handleChange} placeholder="e.g. Delhi Public School, Rohini" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>City *</span>
          <input name="city" required value={formData.city} onChange={handleChange} placeholder="e.g. Bengaluru" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Grades you teach</span>
          <select name="grade" value={formData.grade} onChange={handleChange} style={{ ...inputStyle, background: '#0a0a12' }}>
            <option value="">Select grades</option>
            <option value="6-7">Grade 6–7</option>
            <option value="8-9">Grade 8–9</option>
            <option value="10">Grade 10</option>
            <option value="11-12">Grade 11–12</option>
            <option value="6-12">All grades (6–12)</option>
          </select>
        </label>
        <label>
          <span style={labelStyle}>Your name *</span>
          <input name="teacherName" required value={formData.teacherName} onChange={handleChange} placeholder="Teacher / Principal / STEM Lead" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>School email *</span>
          <input name="email" required type="email" value={formData.email} onChange={handleChange} placeholder="you@schooldomain.in" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>WhatsApp number</span>
          <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 98xxx xxxxx" style={inputStyle} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span style={labelStyle}>Anything specific you want to achieve?</span>
          <textarea name="message" rows={3} value={formData.message} onChange={handleChange}
            placeholder="e.g. We want to launch a robotics club, we're submitting for ATL, our Grade 9 has 200 students…"
            style={{ ...inputStyle, resize: 'none' }} />
        </label>
      </div>
      <button type="submit" disabled={status === 'sending'}
        style={{ marginTop: 20, width: '100%', background: '#f59e0b', color: '#000', padding: '13px 24px', borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: status === 'sending' ? 'not-allowed' : 'pointer', opacity: status === 'sending' ? 0.7 : 1 }}>
        {status === 'sending' ? 'Sending…' : 'Request your school pilot →'}
      </button>
      <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#4b5563' }}>
        No credit card. No commitment. We reply within 24 hours on business days.
      </p>
    </form>
  )
}

/* ─── Main export ────────────────────────────────────────────────── */
export function SchoolsClient() {
  return (
    <main style={{ background: '#07070f', color: '#fff', minHeight: '100vh' }}>

      {/* HERO */}
      <section style={{ borderBottom: '1px solid #1a1a2e', padding: '80px 24px 64px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 100, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)', padding: '4px 14px', fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>
            🏫 R2BOT for Schools
          </span>
          <h1 style={{ marginTop: 20, fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.08, maxWidth: 800 }}>
            Robotics in every classroom.
            <br />
            <span style={{ background: 'linear-gradient(90deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              No lab. No kits. No setup.
            </span>
          </h1>
          <p style={{ marginTop: 16, fontSize: 17, color: '#9ca3af', maxWidth: 640, lineHeight: 1.7 }}>
            India&apos;s only school robotics platform built for the classroom — not the robotics club. CBSE &amp; NEP 2020 aligned, Hindi + English, browser-native.
          </p>
          <p style={{ marginTop: 8, fontSize: 13, color: '#f59e0b', fontWeight: 500 }}>रोबोटिक्स को हर कक्षा में लेकर जाओ।</p>
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a href="#contact" style={{ background: '#f59e0b', color: '#000', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              Get Your School Started →
            </a>
            <Link href="/schools/teacher" style={{ border: '1px solid #374151', background: 'rgba(255,255,255,0.03)', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Teacher Dashboard
            </Link>
            <Link href="/schools/simulate" style={{ border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', padding: '12px 24px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Try Simulator →
            </Link>
          </div>
          <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {['CBSE & NEP 2020 aligned', 'Hindi + English', 'Works on any browser', 'No hardware needed', 'Auto-graded missions'].map(b => (
              <span key={b} style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#10b981' }}>✓</span> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ borderBottom: '1px solid #1a1a2e', background: 'rgba(255,255,255,0.01)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>The state of school robotics in India</h2>
          <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>Most students read about robots in a textbook and never touch one. We&apos;re changing that.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {STATS.map(s => <StatCard key={s.n} {...s} />)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ borderBottom: '1px solid #1a1a2e', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>How it works</h2>
          <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>From registration to first robot in under 48 hours.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {HOW_IT_WORKS.map(s => <StepCard key={s.n} {...s} />)}
          </div>
        </div>
      </section>

      {/* TEACHER FEATURES */}
      <section style={{ borderBottom: '1px solid #1a1a2e', background: 'rgba(255,255,255,0.01)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 100, padding: '3px 12px', fontSize: 12, color: '#fbbf24', marginBottom: 12 }}>👩‍🏫 For Teachers</span>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Everything a robotics teacher needs</h2>
          <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>Run the curriculum without needing to know any robotics yourself.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            {FEATURES_TEACHER.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* STUDENT FEATURES */}
      <section style={{ borderBottom: '1px solid #1a1a2e', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 100, padding: '3px 12px', fontSize: 12, color: '#00e5ff', marginBottom: 12 }}>🧑‍🎓 For Students</span>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Students love the experience</h2>
          <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>Gamified, bilingual, browser-native. Students keep coming back — even after school hours.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            {FEATURES_STUDENT.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ADMIN FEATURES */}
      <section style={{ borderBottom: '1px solid #1a1a2e', background: 'rgba(255,255,255,0.01)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 100, padding: '3px 12px', fontSize: 12, color: '#10b981', marginBottom: 12 }}>🏫 For Admins</span>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>School-wide control and visibility</h2>
          <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>One admin panel. Every teacher, every class, every certificate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            {FEATURES_ADMIN.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* CBSE ALIGNMENT TABLE */}
      <section style={{ borderBottom: '1px solid #1a1a2e', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>CBSE &amp; NEP 2020 alignment</h2>
          <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: 14 }}>Map every R2BOT unit directly onto a syllabus chapter. Lesson plans included.</p>
          <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #1a1a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', color: '#9ca3af' }}>
                  {['Grade', 'CBSE / ICSE Chapter', 'R2BOT Unit', 'Duration', 'NEP'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALIGNMENT.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1a1a2e', background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: '#fbbf24', fontWeight: 600 }}>{r.grade}</td>
                    <td style={{ padding: '11px 16px', color: '#d1d5db' }}>{r.cbse}</td>
                    <td style={{ padding: '11px 16px', color: '#00e5ff', fontWeight: 500 }}>{r.unit}</td>
                    <td style={{ padding: '11px 16px', color: '#9ca3af' }}>{r.mins} min</td>
                    <td style={{ padding: '11px 16px' }}>{r.nep ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓</span> : <span style={{ color: '#374151' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ borderBottom: '1px solid #1a1a2e', background: 'rgba(255,255,255,0.01)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>What educators are saying</h2>
          <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>Early access schools across India.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 22 }}>
                <p style={{ fontSize: 28, marginBottom: 10 }}>{t.avatar}</p>
                <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.75, fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#fbbf24', margin: '2px 0 0' }}>{t.role}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{t.school}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderBottom: '1px solid #1a1a2e', padding: '56px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 28 }}>Frequently asked questions</h2>
          {FAQ.map(f => <FaqItem key={f.q} {...f} />)}
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" style={{ padding: '64px 24px 80px', background: 'linear-gradient(135deg, rgba(251,191,36,0.04) 0%, rgba(249,115,22,0.04) 100%)' }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Bring R2BOT to your school</h2>
            <p style={{ color: '#9ca3af', marginTop: 10, fontSize: 15, lineHeight: 1.7 }}>
              Founder-led onboarding for the first 50 schools. Fill the form — we set up a personalised demo and 30-day pilot. No commitment required.
            </p>
            <p style={{ color: '#fbbf24', fontSize: 13, marginTop: 6 }}>अपने स्कूल में रोबोटिक्स लाएं — 30 दिन का पायलट, कोई प्रतिबद्धता नहीं।</p>
          </div>
          <SchoolContactForm />
          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, fontSize: 13, color: '#6b7280' }}>
            <a href="mailto:schools@r2bot.in" style={{ color: '#9ca3af', textDecoration: 'none' }}>📧 schools@r2bot.in</a>
            <a href="https://wa.me/919999999999?text=Hi%2C+I'm+interested+in+R2BOT+for+my+school" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>💬 WhatsApp us</a>
            <span>📍 India-wide (virtual onboarding)</span>
          </div>
        </div>
      </section>

    </main>
  )
}
