// components/kids/app/NeedsWebNote.tsx — the calm note the STANDALONE app shows
// where a feature needs the R2BOT server (joining a class, teacher dashboards,
// the Robot Passport's server copy, the AI helpers). No hooks and no client
// code, so a server page and a client island can both render it.
//
// The standalone app (lib/kids/app-context.ts, KIDS_STANDALONE) holds every
// /kids page on the device and never talks to a server. Instead of an error or
// a spinner the child sees this: what the part is, that a grown-up can use it
// on the website, and that everything else here works.

export interface NeedsWebNoteProps {
  /** What this part is, in plain words, e.g. "Joining a class". */
  what: string
  /** One more line, optional. */
  detail?: string
  className?: string
  /** Heading level for the title (default: a plain paragraph). */
  as?: 'h1' | 'h2' | 'p'
}

export function NeedsWebNote({ what, detail, className, as = 'p' }: NeedsWebNoteProps) {
  const Title = as
  return (
    <div
      role="note"
      data-kids-needs-web=""
      className={`rounded-[24px] border border-cyan-300/30 bg-cyan-400/[0.06] p-4 text-left sm:p-5 ${className ?? ''}`}
    >
      <Title className="font-display text-xl font-bold text-white">
        <span aria-hidden>🌐 </span>
        {what} needs a grown-up on r2bot.in
      </Title>
      <p className="mt-2 text-base leading-relaxed text-[#C9D1DE]">
        This app keeps everything on this device and works with no internet, so this part is not in it.
        A grown-up can use it on the website, www.r2bot.in/kids. Your robot, games, stories and stars all work right here.
      </p>
      {detail && <p className="mt-2 text-base leading-relaxed text-[#C9D1DE]">{detail}</p>}
    </div>
  )
}

export default NeedsWebNote
