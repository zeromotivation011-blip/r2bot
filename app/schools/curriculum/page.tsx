import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';

export const metadata: Metadata = {
  title: 'Robotics Curriculum Map — R2BOT for Schools',
  description: 'How R2BOT robotics tracks map to CBSE/NCERT and ICSE curriculum for Class 9–12. Download full curriculum guide.',
  alternates: { canonical: `${BASE_URL}/schools/curriculum` },
};

const MAPPING: { track: string; emoji: string; rTrack: string; cbse: string; icse: string; ncert: string }[] = [
  {
    track: 'Spark · Beginner',
    emoji: '⚡',
    rTrack: '6 lessons · 500 XP',
    cbse: 'Class 9 IT (402): Introduction to IT systems, networks, basic programming',
    icse: 'Class 9 Computer Applications: Object-oriented programming basics',
    ncert: 'NCF Stage 3: Computational thinking and basic algorithms',
  },
  {
    track: 'Wire · Intermediate',
    emoji: '🔌',
    rTrack: '6 lessons · 1,075 XP',
    cbse: 'Class 11 CS (083): Functions, control flow, data structures; Class 11 IT (802): Networking & protocols',
    icse: 'Class 10 Computer Applications: Functions, arrays; Class 11 CS: Embedded systems intro',
    ncert: 'NCF Stage 4: Modular programming, problem decomposition',
  },
  {
    track: 'Forge · Advanced',
    emoji: '🔥',
    rTrack: '4 lessons · 1,550 XP',
    cbse: 'Class 12 CS (083): AI & machine learning; Class 12 IT (802): IoT and analytics',
    icse: 'Class 12 CS: Object-oriented design, recursion, algorithms',
    ncert: 'NCF Stage 5: AI, ethics, design',
  },
  {
    track: 'Edge · Research',
    emoji: '🛰',
    rTrack: '3 lessons · 1,900 XP',
    cbse: 'Class 12 AI (417): Neural networks, NLP, computer vision',
    icse: 'Class 12 CS extension: ML algorithms',
    ncert: 'Tertiary readiness: independent capstone projects',
  },
];

export default function CurriculumPage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#050810] min-h-screen pt-32 pb-16">
        <div className="mx-auto max-w-5xl px-4">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-cyan-200">
              📚 Curriculum Mapping
            </span>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              R2BOT &lt;&gt; CBSE / ICSE / NCERT
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-300">
              How each R2BOT track aligns with India&apos;s school curricula.
            </p>
          </header>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/15">
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">R2BOT Track</th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">CBSE</th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">ICSE</th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">NCERT</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map((m) => (
                  <tr key={m.track} className="border-b border-white/5 odd:bg-white/[0.02]">
                    <td className="px-3 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl" aria-hidden>{m.emoji}</span>
                        <div>
                          <p className="m-0 font-bold text-white">{m.track}</p>
                          <p className="m-0 font-mono text-[10px] text-zinc-400">{m.rTrack}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top text-zinc-200">{m.cbse}</td>
                    <td className="px-3 py-4 align-top text-zinc-200">{m.icse}</td>
                    <td className="px-3 py-4 align-top text-zinc-200">{m.ncert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-5">
              <h2 className="text-base font-black text-white">📥 Curriculum Map (PDF)</h2>
              <p className="mt-1 text-sm text-zinc-200">
                Print-ready curriculum map for sharing with your HOD or principal.
              </p>
              <a
                href="/curriculum.pdf"
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-amber-400 px-4 py-2 text-sm font-extrabold text-[#1a0f00] hover:scale-[1.02]"
              >
                Download PDF →
              </a>
              <p className="mt-2 text-[10px] text-zinc-500">
                Note: the PDF file should be added at <code>public/curriculum.pdf</code> by your team.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.06] p-5">
              <h2 className="text-base font-black text-white">📝 Atal Tinkering Labs</h2>
              <p className="mt-1 text-sm text-zinc-200">
                All R2BOT projects build with ATL-standard components. Map your lab inventory directly to R2BOT lessons.
              </p>
              <Link
                href="/schools/register"
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-500/20"
              >
                Register your ATL school →
              </Link>
            </div>
          </section>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
