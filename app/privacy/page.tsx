import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: "How R2BOT collects, uses, and protects your data — in plain English, in compliance with India's DPDP Act 2023 and GDPR.",
};

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Privacy · DPDP-compliant"
      title="Privacy, in plain English."
      lede="We collect the minimum we need to make R2BOT work. We never sell your data. Every section below has the short version on top."
    >
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Last updated: 19 May 2026. Effective immediately.
      </p>

      <h2>Short version</h2>
      <ul>
        <li>If you don&apos;t sign up, we collect basically nothing about you personally.</li>
        <li>If you sign up, we store your email + a profile to track your course progress.</li>
        <li>R2 Co-pilot conversations are logged for 30 days to improve the Atlas, then deleted.</li>
        <li>We use one analytics tool (Plausible) that doesn&apos;t use cookies or track you across sites.</li>
        <li>We never sell, rent, or share your data with third parties for marketing.</li>
        <li>You can delete everything we have about you by emailing <strong>ravi6703@gmail.com</strong>.</li>
      </ul>

      <h2>What we collect</h2>

      <h3>If you just visit the site (no signup)</h3>
      <ul>
        <li>Anonymous analytics (page views, country-level location, browser type) via Plausible. No cookies. No personal ID.</li>
        <li>Your IP address is processed by Vercel for serving the site, but not stored by us beyond the 30-day Vercel default.</li>
        <li>If you use R2 Co-pilot without signing up: the text of your conversation is sent to Anthropic to generate a response, then logged on our server with no user ID, then deleted after 30 days.</li>
      </ul>

      <h3>If you sign up</h3>
      <ul>
        <li>Your email address (required, used for login and account recovery)</li>
        <li>Your display name and avatar (optional, you provide)</li>
        <li>Your diagnostic-test result and which courses you&apos;ve started or completed</li>
        <li>Your R2 Co-pilot conversations, linked to your account, for a rolling 90 days (so you can revisit past explanations)</li>
      </ul>

      <h2>How we use what we collect</h2>
      <ul>
        <li><strong>To run the site.</strong> Show you the right course progress, remember your placement, log you in.</li>
        <li><strong>To improve content.</strong> When R2 Co-pilot can&apos;t answer a question well, we use the anonymised question to write a new Atlas entry.</li>
        <li><strong>To send you the newsletter</strong> — only if you explicitly subscribe. One Pulse per week. Unsubscribe in one click.</li>
        <li><strong>We do NOT</strong> use your data to train Claude or any other foundation model. Your conversations with R2 Co-pilot are sent to Anthropic&apos;s API under Anthropic&apos;s no-training policy for API customers.</li>
      </ul>

      <h2>Who we share data with</h2>
      <ul>
        <li><strong>Anthropic</strong> — for R2 Co-pilot responses. They process the conversation, do not train on it, and delete it per their API terms.</li>
        <li><strong>Vercel</strong> — for hosting. They see request logs.</li>
        <li><strong>Supabase</strong> — for database and authentication. They store the data you give us.</li>
        <li><strong>Resend</strong> — for sending newsletter and account emails. They see your email address.</li>
        <li><strong>Plausible</strong> — for privacy-first analytics. They see anonymous page-view events.</li>
      </ul>
      <p>We do not share your data with anyone else. We do not sell it. We do not rent it.</p>

      <h2>Your rights under the DPDP Act 2023 (India) and GDPR (EU)</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong> — see what data we have about you.</li>
        <li><strong>Rectify</strong> — correct anything inaccurate.</li>
        <li><strong>Erase</strong> — delete your account and all associated data. Permanent.</li>
        <li><strong>Withdraw consent</strong> — at any time, for anything you previously consented to.</li>
        <li><strong>Port your data</strong> — get a copy of your data in a machine-readable format.</li>
        <li><strong>Lodge a complaint</strong> — with the Data Protection Board of India (under DPDP) or your local Data Protection Authority (under GDPR).</li>
      </ul>
      <p>To exercise any of these rights, email <strong>ravi6703@gmail.com</strong> with &quot;DPDP request&quot; in the subject line. We respond within 30 days.</p>

      <h2>Children</h2>
      <p>
        R2BOT is intended for everyone, including children, but if you&apos;re under 18 and want
        to create an account, please have a parent or guardian set it up with you. We do not
        knowingly collect data from children under 13.
      </p>

      <h2>Security</h2>
      <p>
        All data in transit is encrypted (HTTPS). Database is encrypted at rest. Authentication
        uses industry-standard tokens. We don&apos;t store passwords in plain text. If we ever
        suffer a breach affecting your data, we&apos;ll notify you within 72 hours.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We&apos;ll update this page when our practices change. Material changes will be announced
        in the next newsletter and to logged-in users. The &quot;last updated&quot; date at the top
        will always reflect the most recent revision.
      </p>

      <p>
        Questions? Email <strong>ravi6703@gmail.com</strong>.
      </p>
    </StaticPage>
  );
}
