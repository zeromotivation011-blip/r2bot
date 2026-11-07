import Link from 'next/link'

/**
 * The one next step at the end of an Atlas entry.
 *
 * An Atlas page used to end with about a dozen competing actions — share, save,
 * mark as understood, ask the Co-pilot (twice), a quiz, a three-question check,
 * three "keep going" cards, a discussion box showing zero questions and an
 * error-report link — and no single obvious thing to do next. Worse, the one
 * that read as primary was "Ask R2 Co-pilot", which captures no email, saves no
 * progress and starts no path: a dead end dressed as a call to action.
 *
 * This is one card, in priority order:
 *   1. the 60-second video lesson on the same idea, if there is one
 *   2. the hands-on Academy lesson that teaches it
 *   3. the course path
 *
 * The Quick Lesson comes first on purpose: it is the only one of the three that
 * ends in a quiz, which is where we ask for an email — after someone has got
 * something, not before.
 */
export interface AtlasNextStepProps {
  /** The Atlas entry's title, for copy. */
  topic: string
  lesson?: { title: string; href: string } | null
  academy?: { title: string; href: string; track: string; emoji: string } | null
}

export function AtlasNextStep({ topic, lesson, academy }: AtlasNextStepProps) {
  const step = lesson
    ? {
        eyebrow: 'Next: one minute',
        title: `Watch how ${topic} actually works`,
        body: 'A one-minute video, an interactive demo you can poke at, and one question to check it landed.',
        cta: 'Watch the one-minute lesson →',
        href: lesson.href,
        icon: '⚡',
      }
    : academy
      ? {
          eyebrow: `Next: ${academy.track} track`,
          title: academy.title,
          body: `A hands-on lesson that puts ${topic} to work, with sources at the end.`,
          cta: 'Open the lesson →',
          href: academy.href,
          icon: academy.emoji,
        }
      : {
          eyebrow: 'Next: the course path',
          title: 'Five free courses, from zero to your own robot design',
          body: 'Short videos with a quiz after each one, a final activity and a certificate per course.',
          cta: 'See the course path →',
          href: '/courses',
          icon: '🎬',
        }

  return (
    <section className="my-10 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">{step.eyebrow}</p>
      <div className="mt-3 flex items-start gap-4">
        <span className="text-3xl leading-none" aria-hidden>{step.icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-white">{step.title}</h2>
          <p className="mt-1 text-sm text-gray-300">{step.body}</p>
          <Link
            href={step.href}
            className="mt-4 inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-black"
          >
            {step.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
