import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'R2BOT: रोबोटिक्स सीखिए, मुफ़्त और आसान हिंदी में',
  description: 'R2BOT रोबोट और AI को सरल हिंदी में समझाता है। मुफ़्त गाइड, शब्दावली और पाँच शुरुआती कोर्स।',
  alternates: { canonical: `${BASE}/hi`, languages: { en: `${BASE}/`, 'zh-CN': `${BASE}/zh`, hi: `${BASE}/hi` } },
}
const card = { display: 'block', padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' } as const

export default function HiHome() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>रोबोटिक्स मुफ़्त सीखिए, सरल भाषा में</h1>
      <p style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.9, maxWidth: 720 }}>R2BOT रोबोट और AI को आसान बनाता है। हर विषय में बताया जाता है: यह क्या है, इससे आप क्या कर सकते हैं, और इसके बिना क्या गड़बड़ हो सकती है। सब कुछ मुफ़्त है।</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14, margin: '28px 0' }}>
        <Link href="/hi/shorts" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>क्विक लेसन</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>47 एक-मिनट के पाठ</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>वीडियो, एनिमेटेड डेमो और एक छोटा सवाल।</div></Link>
        <Link href="/hi/ai-robotics" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>AI और रोबोटिक्स</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>12 सरल गाइड</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>विज़न, सीखना, SLAM, प्लानिंग, भाषा मॉडल और सुरक्षा।</div></Link>
        <Link href="/hi/ai-robotics/glossary" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>शब्दावली</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>30 आम शब्द</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>हर शब्द एक वाक्य में, अंग्रेज़ी नाम के साथ।</div></Link>
        <Link href="/india" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>भारत</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>भारत में रोबोटिक्स</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>भारतीय कंपनियाँ, कार्यक्रम और समस्याएँ (अंग्रेज़ी में)।</div></Link>
        <Link href="/courses" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>कोर्स</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>पाँच मुफ़्त कोर्स</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>रोबोट की बुनियाद से रोबोट इंटेलिजेंस तक। वीडियो अंग्रेज़ी में हैं।</div></Link>
      </div>
      <p style={{ color: '#94a3b8', lineHeight: 1.9 }}>ध्यान दें: इंटरैक्टिव डेमो, सिमुलेटर और कोर्स वीडियो अभी अंग्रेज़ी में हैं। हिंदी सामग्री धीरे-धीरे बढ़ाई जा रही है। <Link href="/" style={{ color: '#FC6818' }}>पूरी अंग्रेज़ी साइट देखें →</Link></p>
    </main>
  )
}
