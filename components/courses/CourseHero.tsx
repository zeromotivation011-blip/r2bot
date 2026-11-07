'use client'

import { useState } from 'react'
import { CourseArt } from '@/components/courses/CourseArt'

/**
 * The top of a course landing page: cover art that becomes a video on click.
 *
 * A course page opened with a paragraph of text and a lesson list, which reads
 * like a syllabus rather than a course you can start. Every learning platform
 * worth copying puts something to press play on above the fold, because that is
 * the question a visitor is actually asking: what is this going to be like?
 *
 * Shows the trailer when one is set. With no trailer it previews the first
 * lesson that has a video, labelled honestly as a preview — so there is always
 * a video here, and we never pretend a lesson is a trailer.
 *
 * Click-to-load, like the Quick Lesson embeds: nothing from YouTube is
 * requested until someone asks for it.
 */
export function CourseHero({
  slug,
  order,
  title,
  videoId,
  isTrailer,
  previewLessonTitle,
}: {
  slug: string
  order: number
  title: string
  videoId: string | null
  isTrailer: boolean
  previewLessonTitle?: string
}) {
  const [playing, setPlaying] = useState(false)

  if (!videoId) {
    return (
      <CourseArt
        slug={slug}
        order={order}
        title={title}
        className="aspect-video w-full rounded-2xl border border-white/10"
      />
    )
  }

  return (
    <figure className="m-0">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title={isTrailer ? `${title} — trailer` : `${title} — preview`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={isTrailer ? `Play the trailer for ${title}` : `Play a preview of ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer border-0 p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-amber-500 text-2xl text-black shadow-lg">
              ▶
            </span>
            <span className="absolute bottom-3 left-4 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
              {isTrailer ? 'Watch the trailer' : 'Watch a preview'}
            </span>
          </button>
        )}
      </div>
      {!isTrailer && previewLessonTitle && (
        <figcaption className="mt-2 text-xs text-gray-500">
          Preview: lesson 1 — {previewLessonTitle}
        </figcaption>
      )}
    </figure>
  )
}
