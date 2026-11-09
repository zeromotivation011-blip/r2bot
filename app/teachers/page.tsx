import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'Teach Robotics with R2BOT: A Free Guide for Teachers',
  description: 'How to use R2BOT in class: a simple lesson plan, free videos with quizzes, printable activities and embeddable demos. No sign-up needed for students to read.',
  alternates: { canonical: `${BASE}/teachers` },
}

const faq = [
  { q: 'Is R2BOT free for classrooms?', a: 'Yes. The guides, demos, directory, printable activities and courses are free to use in class.' },
  { q: 'Do students need accounts?', a: 'No account is needed to read the guides, try the demos or print the activities. An account is only needed to save quiz progress and earn certificates.' },
  { q: 'Can I put a demo on my school website?', a: 'Yes. Every interactive AI guide has a Copy embed code button that gives you a small frame to paste into your page.' },
  { q: 'What age is it for?', a: 'The AI guides and courses suit ages 13 and up and adults. The kids activities are written for parents and teachers to run with younger children. We do not collect data from children.' },
]
const steps = [
  { t: 'Start with a question (5 min)', d: 'Show the class a robot vacuum or a delivery robot. Ask: what does it need to sense, decide and do? Then open the guide "What is AI in robotics".' },
  { t: 'Try a demo together (10 min)', d: 'Pick one interactive demo, such as path planning or sensor fusion. Ask students to predict what happens before they click.' },
  { t: 'Do the printable activity (15 min)', d: 'Use the kids activities page for hands-on tasks that need only paper and household items.' },
  { t: 'Name the idea (5 min)', d: 'Read the "With it / Without it" box in the guide. Students write one sentence: what would go wrong without this idea?' },
  { t: 'Go further at home', d: 'Share the free course path. Each lesson is about 4 minutes with a quiz, and each course ends with a certificate students can share.' },
]
export default function TeachersPage() {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>Teach robotics with R2BOT</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 18, lineHeight: 1.8 }}>A free, plain-English toolkit for one 40-minute class. No sign-up needed to read, try demos or print activities.</p>
      <h2 style={{ color: '#fff', fontSize: 22, marginTop: 28 }}>A 40-minute lesson plan</h2>
      <ol style={{ color: 'var(--text-2)', lineHeight: 1.9, paddingLeft: 20 }}>
        {steps.map((s) => <li key={s.t} style={{ marginBottom: 10 }}><strong style={{ color: '#fff' }}>{s.t}.</strong> {s.d}</li>)}
      </ol>
      <h2 style={{ color: '#fff', fontSize: 22, marginTop: 28 }}>What to open</h2>
      <ul style={{ color: 'var(--text-2)', lineHeight: 2, paddingLeft: 20 }}>
        <li><Link href="/ai-robotics" style={{ color: '#FC6818' }}>AI and robotics guides and demos</Link> (also in <Link href="/hi" style={{ color: '#FC6818' }}>Hindi</Link>, <Link href="/es" style={{ color: '#FC6818' }}>Spanish</Link> and <Link href="/zh" style={{ color: '#FC6818' }}>Chinese</Link>)</li>
        <li><Link href="/kids/activities" style={{ color: '#FC6818' }}>Printable activities</Link></li>
        <li><Link href="/robots/directory" style={{ color: '#FC6818' }}>Robot directory</Link> and <Link href="/robots/compare" style={{ color: '#FC6818' }}>compare tool</Link></li>
        <li><Link href="/courses" style={{ color: '#FC6818' }}>Free course path</Link> with quizzes and certificates</li>
        <li><Link href="/india" style={{ color: '#FC6818' }}>Robotics in India</Link>: competitions, programmes and careers</li>
      </ul>
      <h2 style={{ color: '#fff', fontSize: 22, marginTop: 28 }}>Questions</h2>
      {faq.map((f) => <div key={f.q} style={{ margin: '12px 0' }}><h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 4px' }}>{f.q}</h3><p style={{ color: 'var(--text-2)', margin: 0, lineHeight: 1.8 }}>{f.a}</p></div>)}
    </main>
  )
}
