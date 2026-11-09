import type { Metadata } from 'next'
import Link from 'next/link'
import { COMPANIES, MARKETS, MILESTONES, PROGRAMMES, STAGES } from '@/lib/india'
import ProblemExplorer from './ProblemExplorer'
import { jsonldScript } from '@/lib/seo/jsonld'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'Robotics in India: Learn, Build and Find Your Path',
  description: 'A free guide to robotics in India: ISRO milestones, Indian robotics companies, school and college programmes, where to buy parts, and a learning path by stage.',
  alternates: { canonical: `${BASE}/india` },
}
const card = { padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const
const h2 = { color: '#fff', fontSize: 24, fontWeight: 800, margin: '36px 0 14px' } as const

export default function IndiaHub() {
  const faq = [
    { q: 'Can I learn robotics in India for free?', a: 'Yes. R2BOT has a free course path, simulators and guides. You need a computer or phone. Parts for a first robot are optional.' },
    { q: 'Where can I buy robot parts in India?', a: 'Online hobby-electronics stores and local electronics markets such as Lamington Road in Mumbai, Nehru Place in Delhi, SP Road in Bengaluru and Ritchie Street in Chennai.' },
    { q: 'Do I need a degree to work in robotics?', a: 'Many roles ask for one, but projects, competitions and open-source work also open doors.' },
  ]
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>Robotics in India</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 18, lineHeight: 1.6, maxWidth: 740 }}>
        From a Mars orbiter to robots that clean sewers, India is building real robots. This page shows what is happening, who is building it, and how you can start from wherever you are. Free, in plain English.
      </p>

      <h2 style={h2}>Milestones from Indian space robotics</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {MILESTONES.map((m) => <div key={m.title} style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 12 }}>{m.year}</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '4px 0' }}>{m.title}</div><p style={{ color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{m.text}</p></div>)}
      </div>
      <p style={{ color: 'var(--text-2)', marginTop: 12 }}>More robots from India: <Link href="/robots/vyommitra" style={{ color: '#FC6818' }}>Vyommitra</Link>, <Link href="/robots/drdo-daksh" style={{ color: '#FC6818' }}>DRDO Daksh</Link>, <Link href="/robots/grey-orange-butler" style={{ color: '#FC6818' }}>GreyOrange Butler</Link>, <Link href="/robots/mitra" style={{ color: '#FC6818' }}>Mitra</Link>. See the <Link href="/robots/directory" style={{ color: '#FC6818' }}>robot directory</Link>.</p>

      <h2 style={h2}>Try it: which Indian problem would you solve with a robot?</h2>
      <div style={card}><ProblemExplorer /></div>

      <h2 style={h2}>Your path, by stage</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
        {STAGES.map((s) => <div key={s.stage} style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>{s.stage.toUpperCase()}</div><ul style={{ color: '#e2e8f0', lineHeight: 1.65, paddingLeft: 18, margin: '8px 0 0' }}>{s.steps.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
      </div>
      <p style={{ color: 'var(--text-2)', marginTop: 12 }}>Start here: <Link href="/courses" style={{ color: '#FC6818' }}>free course path</Link>, <Link href="/build" style={{ color: '#FC6818' }}>guided projects</Link>, <Link href="/careers" style={{ color: '#FC6818' }}>career paths</Link>.</p>

      <h2 style={h2}>Programmes and places to look</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {PROGRAMMES.map((p) => <div key={p.name} style={card}><div style={{ color: '#fff', fontWeight: 800 }}>{p.name}</div><p style={{ color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.6 }}>{p.text}</p></div>)}
      </div>

      <h2 style={h2}>Companies building robots in India</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        {COMPANIES.map((c) => <div key={c.name} style={card}><div style={{ color: '#fff', fontWeight: 800 }}>{c.name}</div><p style={{ color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.55 }}>{c.what}</p></div>)}
      </div>
      <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 8 }}>This is a starting list, not a ranking. Check each company's own site for current work.</p>

      <h2 style={h2}>Where to buy parts</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>Online hobby-electronics stores deliver across India. For same-day parts and to compare, try these electronics markets:</p>
      <ul style={{ color: '#e2e8f0', lineHeight: 1.9 }}>{MARKETS.map((m) => <li key={m.city}><b>{m.city}</b>: {m.place}</li>)}</ul>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>Tip: parts ordered from abroad can take weeks to arrive. Plan around that, or pick parts you can find locally. Always check the seller's reviews and ask for a bill.</p>

      <h2 style={h2}>Common questions</h2>
      {faq.map((f) => <div key={f.q} style={{ margin: '12px 0' }}><h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 4px' }}>{f.q}</h3><p style={{ color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{f.a}</p></div>)}
    </main>
  )
}
