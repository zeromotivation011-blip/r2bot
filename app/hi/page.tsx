import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'R2BOT: रोबोटिक्स सीखिए, मुफ़्त और आसान हिंदी में',
  description: 'R2BOT रोबोट और AI को सरल हिंदी में समझाता है। मुफ़्त गाइड, शब्दावली और पाँच शुरुआती कोर्स।',
  alternates: { canonical: `${BASE}/hi`, languages: { en: `${BASE}/`, 'zh-CN': `${BASE}/zh`, hi: `${BASE}/hi` } },
}

export default function HiHome() {
  return (
    <main className="r2-wrap r2-wrap--narrow" style={{ paddingTop: 110, paddingBottom: 80 }}>
      <h1 className="r2-display">रोबोटिक्स मुफ़्त सीखिए, सरल भाषा में</h1>
      <p className="r2-lede">R2BOT रोबोट और AI को आसान बनाता है। हर विषय में बताया जाता है: यह क्या है, इससे आप क्या कर सकते हैं, और इसके बिना क्या गड़बड़ हो सकती है। सब कुछ मुफ़्त है।</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14, margin: '28px 0' }}>
        <Link href="/hi/shorts" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>क्विक लेसन</div><div className="r2-h3" style={{ margin: '6px 0' }}>47 एक-मिनट के पाठ</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>वीडियो, एनिमेटेड डेमो और एक छोटा सवाल।</div></Link>
        <Link href="/hi/ai-robotics" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>AI और रोबोटिक्स</div><div className="r2-h3" style={{ margin: '6px 0' }}>12 सरल गाइड</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>विज़न, सीखना, SLAM, प्लानिंग, भाषा मॉडल और सुरक्षा।</div></Link>
        <Link href="/hi/ai-robotics/glossary" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>शब्दावली</div><div className="r2-h3" style={{ margin: '6px 0' }}>30 आम शब्द</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>हर शब्द एक वाक्य में, अंग्रेज़ी नाम के साथ।</div></Link>
        <Link href="/india" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>भारत</div><div className="r2-h3" style={{ margin: '6px 0' }}>भारत में रोबोटिक्स</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>भारतीय कंपनियाँ, कार्यक्रम और समस्याएँ (अंग्रेज़ी में)।</div></Link>
        <Link href="/courses" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>कोर्स</div><div className="r2-h3" style={{ margin: '6px 0' }}>पाँच मुफ़्त कोर्स</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>रोबोट की बुनियाद से रोबोट इंटेलिजेंस तक। वीडियो अंग्रेज़ी में हैं।</div></Link>
      </div>
      <p className="r2-body" style={{ lineHeight: 1.9 }}>ध्यान दें: इंटरैक्टिव डेमो, सिमुलेटर और कोर्स वीडियो अभी अंग्रेज़ी में हैं। हिंदी सामग्री धीरे-धीरे बढ़ाई जा रही है। <Link href="/" className="r2-link">पूरी अंग्रेज़ी साइट देखें →</Link></p>
    </main>
  )
}
