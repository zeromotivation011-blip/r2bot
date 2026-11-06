import type { Metadata } from 'next'
import Link from 'next/link'
import { HI_TOPICS } from '@/lib/ai-robotics-hi'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'AI और रोबोटिक्स: सरल हिंदी गाइड',
  description: 'रोबोट में AI कैसे काम करता है, सरल हिंदी में: विज़न, सीखना, SLAM, पाथ प्लानिंग, भाषा मॉडल और सुरक्षा, असली उदाहरणों के साथ। मुफ़्त।',
  alternates: { canonical: `${BASE}/hi/ai-robotics`, languages: { en: `${BASE}/ai-robotics`, 'zh-CN': `${BASE}/zh/ai-robotics`, hi: `${BASE}/hi/ai-robotics` } },
}
const card = { display: 'block', padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' } as const

export default function HiAiHub() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 80px' }}>
      <Link href="/hi" style={{ color: '#94a3b8', fontSize: 13 }}>← होम</Link>
      <h1 style={{ fontSize: 'clamp(30px,5vw,42px)', fontWeight: 900, color: '#fff', margin: '8px 0 10px' }}>AI और रोबोटिक्स, आसान भाषा में</h1>
      <p style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.9, maxWidth: 740 }}>रोबोट को महसूस करना, सोचना और करना होता है। AI सोचने का एक तरीक़ा है। हर गाइड तीन बातें बताती है: यह क्या है, आप इससे क्या कर सकते हैं, और इसके बिना क्या ग़लत हो सकता है।</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14, margin: '24px 0' }}>
        {HI_TOPICS.map((t) => (
          <Link key={t.slug} href={`/hi/ai-robotics/${t.slug}`} style={card}>
            <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>{t.level} · {t.minutes} मिनट</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '6px 0' }}>{t.title}</div>
            <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8 }}>{t.short}</div>
          </Link>
        ))}
      </div>
      <p style={{ color: '#cbd5e1', lineHeight: 1.9 }}>कोई शब्द समझ नहीं आया? <Link href="/hi/ai-robotics/glossary" style={{ color: '#FC6818', fontWeight: 700 }}>शब्दावली देखिए</Link>। डेमो आज़माना है? <Link href="/ai-robotics" style={{ color: '#FC6818', fontWeight: 700 }}>अंग्रेज़ी पेज पर 10 इंटरैक्टिव डेमो हैं</Link>।</p>
    </main>
  )
}
