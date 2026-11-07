'use client'

import Link from 'next/link'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { SHORTS } from '@/lib/shorts'

const PICK = ['ultrasonic-sensor', 'servo-motor', 'gears', 'gyroscope-imu', 'feedback-control', 'warehouse-robots']

export default function HomeShorts() {
  const picks = PICK.map((s) => SHORTS.find((x) => x.slug === s)!).filter(Boolean)
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '70px 20px' }}>
      <p style={{ color: '#FC6818', fontWeight: 800, fontSize: 12, letterSpacing: 2, margin: 0 }}>PLAY FIRST, READ LATER</p>
      <h2 style={{ color: '#fff', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, margin: '6px 0 8px' }}>Learn robotics in one minute, hands on</h2>
      <p style={{ color: '#94a3b8', maxWidth: 640, margin: '0 0 20px' }}>Move the wall below and watch how a robot turns an echo into distance. Then pick a lesson.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, alignItems: 'start' }}>
        <ShortDemo kind="echo" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {picks.map((s) => (
            <Link key={s.slug} href={`/shorts/${s.slug}`} style={{ textDecoration: 'none', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', transition: 'transform .2s' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${s.ids[0]}/mqdefault.jpg`} alt="" loading="lazy" width={320} height={180} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px 10px', color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{s.title.split(':')[0]}</div>
            </Link>
          ))}
        </div>
      </div>
      <p style={{ marginTop: 18 }}><Link href="/shorts" style={{ color: '#FC6818', fontWeight: 800 }}>All {SHORTS.length} Quick Lessons →</Link></p>
    </section>
  )
}
