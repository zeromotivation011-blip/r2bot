import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  title: 'Mission',
  description: "R2BOT's mission and 10-year vision — why every human on Earth should be able to understand robotics.",
};

export default function MissionPage() {
  return (
    <StaticPage eyebrow="Mission · Vision · Posture" title="One brain. Every robot. Explained for everyone.">
      <h2>Our mission</h2>
      <blockquote>
        To make robotics understandable for everyone on Earth — and easy to build for anyone who decides to try.
      </blockquote>

      <h2>Our 10-year vision</h2>
      <blockquote>
        R2BOT is the first place 1 billion people go when they want to understand a robot —
        whether it&apos;s a humanoid in a Tesla factory, a Mars rover, a surgical arm in Bengaluru,
        or a Roomba in the kitchen.
      </blockquote>

      <h2>Why now</h2>
      <p>
        Robotics is having its smartphone moment. Humanoid robots are entering homes
        (Figure, Tesla Optimus, Unitree, Agility). Industrial automation is the largest CapEx
        category in the world. India launched its National Robotics Strategy. China&apos;s robot
        density per worker is 6× the global average.
      </p>
      <p>
        Yet most robotics content online is either too technical (IEEE papers, GitHub READMEs)
        or too superficial (clickbait shorts). The middle — the explainer layer — is missing.
        R2BOT exists to own that layer.
      </p>

      <h2>Our posture</h2>
      <ul>
        <li><strong>Plain words first, technical terms second.</strong> Every page begins with the answer in one sentence. Jargon is defined the moment we use it.</li>
        <li><strong>Confidently uncertain.</strong> When we don&apos;t know, we say so. Never bluff.</li>
        <li><strong>Free as a foundation.</strong> Atlas, courses, R2 Co-pilot — all free, all the time, for every learner.</li>
        <li><strong>India + global.</strong> Built in India. Aimed at the world. Cheaper content production, underserved audience, English-first reach, Hindi second.</li>
        <li><strong>Cited and current.</strong> Every entry has sources. Every entry has a &quot;last reviewed&quot; date. Stale content gets refreshed.</li>
      </ul>

      <h2>How we&apos;ll know we&apos;re winning</h2>
      <p>
        Three north-star metrics, in order of importance:
      </p>
      <ol>
        <li><strong>Comprehension.</strong> When a 14-year-old reads an Atlas entry and can explain the topic to a friend afterward.</li>
        <li><strong>Reach.</strong> When R2BOT is the first thing AI overviews cite for robotics queries — globally, and especially for India-specific robotics queries.</li>
        <li><strong>Conversion to creators.</strong> When learners who started on R2BOT ship their own robots.</li>
      </ol>

      <h2>What we will never do</h2>
      <ul>
        <li>Charge a learner for any course or any encyclopedia entry.</li>
        <li>Sell user data, ever.</li>
        <li>Run ads, sell your attention, or use dark patterns. We ask for your email once, in a dismissable box you can close and never see again — and we tell you exactly what we&apos;ll send.</li>
        <li>Publish unsourced claims or AI-hallucinated &quot;facts.&quot;</li>
        <li>Talk down to a beginner.</li>
      </ul>

      <p>
        That&apos;s the work. <a href="/atlas">Start here</a>, or <a href="/diagnostic">find your level</a>.
      </p>
    </StaticPage>
  );
}
