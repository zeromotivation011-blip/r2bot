import type { Metadata } from 'next'
import Link from 'next/link'
import { SHORTS, SHORT_COURSES, shortsInCourse } from '@/lib/shorts'
import { SHORTS_HI } from '@/lib/shorts-hi'
import { ProgressBar, Tick } from '@/components/shorts/ShortsClient'
import InlineSignup from '@/components/InlineSignup'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export const metadata: Metadata = {
  title: 'एक मिनट में रोबोटिक्स: क्विक लेसन',
  description: 'मुफ़्त एक-मिनट के रोबोटिक्स पाठ: वीडियो, एनिमेटेड डेमो और एक छोटा सवाल। सेंसर, मोटर, कंट्रोल, हाथ और काम करते रोबोट, आसान हिंदी में।',
  alternates: { canonical: `${BASE}/hi/shorts`, languages: { en: `${BASE}/shorts`, 'zh-CN': `${BASE}/zh/shorts`, hi: `${BASE}/hi/shorts`, es: `${BASE}/es/shorts` } },
}
const ZH_COURSE: Record<string, { t: string; b: string }> = {
  senses: { t: 'रोबोट कैसे महसूस करते हैं', b: 'आवाज़, दृष्टि, सुनना और संतुलन का एहसास।' },
  motion: { t: 'मोटर और मशीनरी', b: 'गियर, सर्वो, रोबोट आर्म और सटीक दोहराव।' },
  control: { t: 'कंट्रोल और संतुलन', b: 'फ़ीडबैक, सीधे खड़े रहना, लाइन पर चलना।' },
  hands: { t: 'हाथ और स्पर्श', b: 'नरम पकड़, कृत्रिम हाथ और सर्जिकल रोबोट।' },
  work: { t: 'काम करते रोबोट', b: 'वैक्यूम, गोदाम और सीढ़ियों की समस्या।' },
}

export default function ZhShortsHub() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: 0 }}>एक मिनट में रोबोटिक्स: क्विक लेसन</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>एक मिनट का वीडियो देखिए, लाइव डेमो के साथ खेलिए, एक सवाल हल कीजिए। पाँच छोटे कोर्स, कुल {SHORTS.filter((s) => SHORTS_HI[s.slug]).length} पाठ, सब मुफ़्त।</p>
      <ProgressBar slugs={SHORTS.filter((s) => SHORTS_HI[s.slug]).map((s) => s.slug)} lang="hi" />
      {SHORT_COURSES.map((c) => (
        <section key={c.slug} style={{ margin: '32px 0' }}>
          <h2 style={{ color: '#fff', fontSize: 24, margin: 0 }}>{c.icon} {ZH_COURSE[c.slug].t}</h2>
          <p style={{ color: 'var(--text-2)', margin: '4px 0 14px' }}>{ZH_COURSE[c.slug].b}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {shortsInCourse(c.slug).filter((s) => SHORTS_HI[s.slug]).map((s) => (
              <Link key={s.slug} href={`/hi/shorts/${s.slug}`} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${s.ids[0]}/mqdefault.jpg`} alt="" width={64} height={114} loading="lazy" style={{ borderRadius: 8, objectFit: 'cover', width: 64, height: 114 }} />
                <span><span style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{SHORTS_HI[s.slug].title.split(':')[0]} <Tick slug={s.slug} /></span><br /><span style={{ color: 'var(--text-2)', fontSize: 13 }}>{SHORTS_HI[s.slug].summary.slice(0, 60)}…</span></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <div style={{ marginTop: 40 }}><InlineSignup lang="hi" /></div>
      <p style={{ marginTop: 24 }}><Link href="/hi/ai-robotics" style={{ color: '#FC6818' }}>आगे पढ़ें: AI और रोबोटिक्स →</Link></p>
    </main>
  )
}
