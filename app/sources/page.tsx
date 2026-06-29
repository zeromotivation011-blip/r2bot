import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  title: 'Sources & attribution',
  description: 'Where R2BOT gets its facts, and how to use our content responsibly.',
};

export default function SourcesPage() {
  return (
    <StaticPage
      eyebrow="Sources · Attribution"
      title="How we know what we know."
      lede="Every R2BOT Atlas entry, Pulse story, and Lens summary has its sources listed at the bottom. Here's the broader picture of how we research and cite."
    >
      <h2>Our sourcing rules</h2>
      <ul>
        <li><strong>Primary sources first.</strong> When a robotics company makes a claim, we cite the company&apos;s own page, press release, or product specification — not a secondhand article.</li>
        <li><strong>Peer-reviewed for research claims.</strong> Anything making a technical claim about how something works gets a citation to a peer-reviewed paper, an arXiv preprint, or an established textbook.</li>
        <li><strong>Multiple sources for contested facts.</strong> If two reputable sources disagree, we cite both and say so.</li>
        <li><strong>No anonymous sources.</strong> If we can&apos;t name the source, we don&apos;t use it.</li>
      </ul>

      <h2>The frequent sources</h2>
      <p>You&apos;ll see these cited often across the site:</p>
      <ul>
        <li><strong>IEEE Spectrum</strong> — robotics journalism with strong technical accuracy</li>
        <li><strong>ROS / Open Robotics documentation</strong> — for software references</li>
        <li><strong>International Federation of Robotics (IFR)</strong> — for industry statistics</li>
        <li><strong>arXiv.org</strong> — for AI/robotics research papers</li>
        <li><strong>NASA, ESA, JAXA, ISRO official mission pages</strong> — for space-robotics content</li>
        <li><strong>Boston Dynamics, Tesla, Figure, Unitree, NVIDIA</strong> — for company-specific facts, going straight to their official product pages</li>
        <li><strong>Wikipedia</strong> — never as a final source, but useful for navigating to primary references</li>
      </ul>

      <h2>How to cite R2BOT</h2>
      <p>If you&apos;re writing something that uses an R2BOT entry, please cite us as:</p>
      <p style={{ background: 'rgba(11,37,64,.5)', padding: '14px 18px', borderRadius: 10, fontFamily: 'var(--font-mono), monospace', fontSize: 14 }}>
        Bohra, R. (2026). [Entry title]. R2BOT. https://r2bot.com/atlas/...
      </p>
      <p>
        For academic citation, use the &quot;Last reviewed&quot; date at the top of each Atlas entry
        as the date.
      </p>

      <h2>Re-using R2BOT content</h2>
      <ul>
        <li><strong>Quoting (up to ~300 words):</strong> fine, please link back.</li>
        <li><strong>Embedding our future public widgets:</strong> fine, with attribution.</li>
        <li><strong>Translating into another language for personal/educational use:</strong> fine, please credit and link.</li>
        <li><strong>Republishing on a commercial site:</strong> please get written permission first.</li>
        <li><strong>Training an AI model on R2BOT content:</strong> please get written permission first.</li>
      </ul>

      <h2>Reporting errors</h2>
      <p>
        If you spot a factual error — and we genuinely want to know — email
        <strong> ravi6703@gmail.com</strong> with &quot;R2BOT error&quot; in the subject line and the URL
        of the entry. We aim to verify and fix within 7 days. Each correction updates the
        &quot;Last reviewed&quot; date on the entry.
      </p>

      <h2>Open-source acknowledgements</h2>
      <p>
        R2BOT is built on a stack of open-source software. The big ones we&apos;d like to thank:
      </p>
      <ul>
        <li><strong>Next.js</strong> (MIT) — the framework</li>
        <li><strong>React</strong> (MIT) — the UI library</li>
        <li><strong>Tailwind CSS</strong> (MIT)</li>
        <li><strong>react-markdown</strong> + <strong>remark-gfm</strong> (MIT) — Markdown rendering</li>
        <li><strong>gray-matter</strong> (MIT) — frontmatter parsing</li>
        <li><strong>Supabase</strong> (Apache 2.0) — database and auth</li>
        <li><strong>Lucide Icons</strong> (ISC) — icons</li>
        <li><strong>Inter, Space Grotesk, JetBrains Mono</strong> (SIL Open Font License) — typography</li>
      </ul>
    </StaticPage>
  );
}
