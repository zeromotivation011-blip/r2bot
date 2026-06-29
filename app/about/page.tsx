import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  title: 'About R2BOT',
  description: "Why R2BOT exists — the brand promise, the founder, and what we're building.",
};

export default function AboutPage() {
  return (
    <StaticPage eyebrow="About R2BOT" title="ROBOT, decoded." lede="R2BOT is the world's most accessible robotics platform. Every robot, every breakthrough, every concept — explained in plain English.">
      <h2>Why this exists</h2>
      <p>
        Most robotics content online is broken in one direction or the other. IEEE Spectrum
        writes for engineers, MIT writes for PhD students, YouTube does 45-minute reaction videos.
        The middle layer — clear, accurate, accessible explanations for any curious human — is missing.
      </p>
      <p>
        R2BOT is that middle layer. A 14-year-old in Patna and a 45-year-old engineer in
        Bengaluru should both be able to land on the same page, understand it, and leave knowing
        something they didn&apos;t know before.
      </p>

      <h2>The brand mark</h2>
      <p>
        Our name reads as <strong>ROBOT</strong> when you let the &quot;2&quot; do double-duty as a &quot;0&quot;.
        Tilt the &quot;2&quot; again and you see infinity (∞). One glyph, three meanings:
      </p>
      <ul>
        <li><strong>The digit (2)</strong> — for the AI co-pilot at the brand&apos;s core.</li>
        <li><strong>The zero (0)</strong> — for the zero-barrier promise. Open to every learner.</li>
        <li><strong>The infinity (∞)</strong> — for the endless loop of curiosity, learning, and robotics itself.</li>
      </ul>

      <h2>What you&apos;ll find here</h2>
      <ul>
        <li><strong><a href="/pulse">Pulse</a></strong> — daily robotics stories from the USA, China, India, Japan, Europe — decoded.</li>
        <li><strong><a href="/atlas">Atlas</a></strong> — the encyclopedia. Every concept, robot, person, company — in plain English.</li>
        <li><strong><a href="/lens">Lens</a></strong> — the best robotics videos on the internet, summarized so you don&apos;t have to watch 45 minutes to learn 4.</li>
        <li><strong><a href="/diagnostic">Academy</a></strong> — structured courses from Spark (beginner) to Edge (frontier research).</li>
        <li><strong>R2 Co-pilot</strong> — the AI brain. Press ⌘K anywhere. Ask anything.</li>
      </ul>

      <h2>The promise</h2>
      <ul>
        <li><strong>Open to every learner</strong> — every Atlas entry, every course, R2 Co-pilot. Paid for by affiliate links and ethical sponsorships. Never your data.</li>
        <li><strong>Plain English, always</strong> — every page begins with the answer in one sentence. Jargon is defined the moment we use it.</li>
        <li><strong>Cited, never invented</strong> — R2 Co-pilot grounds every answer in the Atlas. If we don&apos;t know, we say so. No hallucinations dressed as facts.</li>
      </ul>

      <h2>The founder</h2>
      <p>
        R2BOT is built by <strong>Ravi Bohra</strong>, a solo founder based in India. The plan,
        the brand, the platform, the early Atlas entries — all written by one person who cares more
        about the next generation understanding robotics than they care about reaching unicorn status.
      </p>

      <h2>The roadmap</h2>
      <p>
        We&apos;re working in public. The product evolves week by week. Current focus areas:
      </p>
      <ul>
        <li>Growing the Atlas to 500+ entries by end of 2026</li>
        <li>Spark (beginner) course track shipping in pieces through Q3 2026</li>
        <li>R2 Co-pilot grounded in the full Atlas via RAG</li>
        <li>Hindi translations of the top-trafficked entries from Q4 2026</li>
      </ul>

      <h2>Talk to us</h2>
      <p>
        Found an error? Want to suggest an Atlas entry? Want to collaborate? Email
        <strong> ravi6703@gmail.com</strong> with the subject line &quot;R2BOT&quot; and we&apos;ll read it.
      </p>
    </StaticPage>
  );
}
