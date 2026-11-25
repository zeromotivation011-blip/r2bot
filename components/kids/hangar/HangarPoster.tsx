// components/kids/hangar/HangarPoster.tsx
// The hangar bay drawn in CSS + SVG, at exactly the size of the 3D view. It is
// what the server sends and what a phone shows while three.js loads (and for
// good if WebGL is not available), so the page never opens on a spinner or
// shifts when the 3D arrives.

interface Props {
  /** The robot's paint, once known. */
  colour: string
  /** Fade out once the 3D view has drawn its first frame. */
  hidden: boolean
  /** WebGL failed: keep the poster and say why the robot is still. */
  failed: boolean
}

export function HangarPoster({ colour, hidden, failed }: Props) {
  return (
    <div className={`absolute inset-0 transition-opacity duration-500 ${hidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`} aria-hidden={hidden || undefined}>
      {/* Walls */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#05080F_0%,#0E1830_55%,#0A1120_100%)]" />
      {/* Light beams */}
      <div className="absolute left-[46%] top-0 h-[78%] w-[46%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,226,204,.28),rgba(255,226,204,0))] [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]" />
      <div className="absolute left-[4%] top-[10%] h-[70%] w-[40%] bg-[linear-gradient(160deg,rgba(252,104,24,.22),rgba(252,104,24,0)_80%)] [clip-path:polygon(0_0,12%_0,100%_100%,55%_100%)]" />
      <div className="absolute right-[4%] top-[14%] h-[66%] w-[38%] bg-[linear-gradient(200deg,rgba(0,229,255,.2),rgba(0,229,255,0)_80%)] [clip-path:polygon(88%_0,100%_0,45%_100%,0_100%)]" />
      {/* Floor + turntable */}
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,#0A1120,#070C18)]" />
      <div className="absolute bottom-[10%] left-1/2 h-[16%] w-[62%] -translate-x-1/2 rounded-[50%] border-2 border-amber-500/70 shadow-[0_0_40px_rgba(252,104,24,.25)]" />
      <div className="absolute bottom-[13%] left-1/2 h-[10%] w-[40%] -translate-x-1/2 rounded-[50%] bg-[#1B2740] shadow-[inset_0_2px_0_rgba(255,255,255,.08)]" />
      {/* A robot silhouette in the robot's own colour */}
      <svg viewBox="0 0 120 120" className="absolute bottom-[16%] left-1/2 h-[46%] -translate-x-1/2 drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]" aria-hidden>
        <line x1="60" y1="8" x2="60" y2="22" stroke="#A7B0C0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="8" r="5" fill="#FC6818" />
        <rect x="34" y="20" width="52" height="30" rx="10" fill="#E2E8F0" />
        <circle cx="49" cy="35" r="6" fill="#0A1120" />
        <circle cx="71" cy="35" r="6" fill="#0A1120" />
        <circle cx="50" cy="34" r="2" fill="#00E5FF" />
        <circle cx="72" cy="34" r="2" fill="#00E5FF" />
        <rect x="26" y="54" width="68" height="42" rx="12" fill={colour} />
        <rect x="44" y="64" width="32" height="16" rx="4" fill="#F8FAFC" opacity=".9" />
        <circle cx="32" cy="100" r="12" fill="#1F2937" />
        <circle cx="88" cy="100" r="12" fill="#1F2937" />
        <circle cx="32" cy="100" r="5" fill="#64748B" />
        <circle cx="88" cy="100" r="5" fill="#64748B" />
      </svg>
      {failed ? (
        <p className="absolute inset-x-4 bottom-4 rounded-2xl bg-[#0A1120]/85 px-3 py-2 text-center text-sm text-[#A7B0C0]">
          This device can’t show 3D right now, but every look you pick is still saved to your robot.
        </p>
      ) : (
        <span className="sr-only">Opening the hangar bay…</span>
      )}
    </div>
  )
}
