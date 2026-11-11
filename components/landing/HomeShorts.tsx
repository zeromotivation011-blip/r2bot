import Link from 'next/link'

export interface HomeShortPick { slug: string; title: string; videoId: string }
export interface HomeShortCourse { slug: string; title: string; count: number }

/**
 * Quick Lessons on the homepage.
 *
 * Was: an orange eyebrow, a 38px headline, the echo demo, and six YouTube
 * thumbnails. The echo demo now opens the page — having it twice on one
 * screen was the clearest sign that the homepage had been assembled section
 * by section rather than designed.
 *
 * What is left is the thing the hero cannot show: that there are 47 of these
 * and they are organised into five short courses. Image-led, because the
 * thumbnails are real and good, and because every other section on this page
 * is type-led.
 */
export const HOME_SHORT_PICKS = ['ultrasonic-sensor', 'servo-motor', 'gears', 'gyroscope-imu', 'feedback-control', 'warehouse-robots']

/**
 * Server component. It used to be a client component that imported the whole
 * lesson catalogue (every lesson's text, in the browser bundle) just to show
 * six thumbnails and five counts. The page now passes exactly those.
 */
export default function HomeShorts({ picks, courses, total }: { picks: HomeShortPick[]; courses: HomeShortCourse[]; total: number }) {

  return (
    <section className="r2-section">
      <div className="r2-wrap">
        <p className="r2-eyebrow">One minute each</p>
        <h2 className="r2-h2">{total} quick lessons, grouped into five short courses</h2>
        <p className="r2-body" style={{ marginTop: '0.75rem' }}>
          A one-minute video, a demo you can play with, and one question to check it landed.
          Start anywhere.
        </p>

        <div className="r2-shorts-grid">
          {picks.map((s) => (
            <Link key={s.slug} href={`/shorts/${s.slug}`} className="r2-shot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${s.videoId}/mqdefault.jpg`}
                alt=""
                loading="lazy"
                width={320}
                height={180}
                className="r2-shot__img"
              />
              <span className="r2-shot__title">{s.title.split(':')[0]}</span>
            </Link>
          ))}
        </div>

        <div className="r2-shorts-courses">
          {courses.map((c) => (
            <Link key={c.slug} href={`/shorts/course/${c.slug}`} className="r2-chip">
              {c.title}
              <span className="r2-meta">{c.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
