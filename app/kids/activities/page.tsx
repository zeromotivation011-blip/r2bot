import type { Metadata } from 'next'
import Link from 'next/link'
import { KID_ACTS } from '@/lib/kids-activities'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'Screen-Free Robotics Activities for Kids (Printable)',
  description: 'Seven hands-on robotics activities for kids using household items: balloon car, human line follower, sensor hunt and more. Free and printable.',
  alternates: { canonical: `${BASE}/kids/activities` },
}
const box = { padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 16, breakInside: 'avoid' as const }

export default function KidsActivities() {
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Screen-free robotics activities for kids',
    itemListElement: KID_ACTS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title })) }
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '110px 20px 80px' }}>
      <style>{`@media print { nav, header, footer, .no-print { display:none !important } body { background:#fff !important } main, main * { color:#000 !important; background:transparent !important; border-color:#999 !important } main { padding-top: 0 !important } }`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/kids/parents" className="no-print" style={{ color: '#94a3b8', fontSize: 13 }}>← For parents</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '8px 0 8px' }}>Screen-free robotics activities</h1>
      <p style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 1.6 }}>Seven activities with things you already have at home. No account, no sign-up, nothing collected. Use your browser's Print button to make a copy to keep.</p>
      {KID_ACTS.map((a) => (
        <section key={a.id} style={box}>
          <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>AGES {a.ages.toUpperCase()} · {a.minutes} MIN</div>
          <h2 style={{ color: '#fff', fontSize: 22, margin: '4px 0 10px' }}>{a.title}</h2>
          <p style={{ color: '#e2e8f0', margin: '0 0 6px' }}><b>You need:</b> {a.materials.join(', ')}.</p>
          <ol style={{ color: '#e2e8f0', lineHeight: 1.7, paddingLeft: 22 }}>{a.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p style={{ color: '#e2e8f0', margin: '8px 0' }}><b>The robotics idea:</b> {a.idea}</p>
          <p style={{ color: '#cbd5e1', margin: 0 }}><b>Ask your child:</b> {a.ask}</p>
          {a.safety && <p style={{ color: '#fbbf24', margin: '8px 0 0', fontSize: 14 }}><b>Safety:</b> {a.safety}</p>}
        </section>
      ))}
      <p style={{ color: '#cbd5e1' }}>Ready for the screen? <Link href="/kids" style={{ color: '#FC6818', fontWeight: 700 }}>Robot World</Link> is a free adventure for ages 5 to 14.</p>
    </main>
  )
}
