import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy' },
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
        Last updated: 26 November 2026 (R2BOT Kids section added). Effective immediately.
      </p>

      <h2>Short version</h2>
      <ul>
        <li>If you don&apos;t sign up, we collect basically nothing about you personally.</li>
        <li>If you sign up, we store your email + a profile to track your course progress.</li>
        <li>R2 Co-pilot conversations are logged for 30 days to improve the Atlas, then deleted.</li>
        <li>We count page views with a simple first-party counter (no cookies, no IP address, no user ID) and use Google Analytics for anonymous usage statistics — but never on R2BOT Kids.</li>
        <li>We never sell, rent, or share your data with third parties for marketing.</li>
        <li>R2BOT Kids asks children for nothing: progress stays on the device. <a href="#kids">Details for parents</a>.</li>
        <li>You can delete everything we have about you by emailing <strong>hello@r2bot.in</strong>.</li>
      </ul>

      <h2>What we collect</h2>

      <h3>If you just visit the site (no signup)</h3>
      <ul>
        <li>Anonymous page-view counts through our own counter (no cookies, no IP address, no user ID), plus anonymous usage statistics through Google Analytics, which may set cookies.</li>
        <li>If you arrive through an invite link, we keep a random invite code in a cookie for 30 days so we can count invites. It holds no personal data. Your Quick Lesson progress is saved only in your own browser (local storage), not on our servers.</li>
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
        <li><strong>Google Analytics</strong> — for anonymous usage statistics (page views, country-level location, browser type).</li>
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
      <p>To exercise any of these rights, email <strong>hello@r2bot.in</strong> with &quot;DPDP request&quot; in the subject line. We respond within 30 days.</p>

      <h2>Children</h2>
      <p>
        The main R2BOT site is for teenagers and adults. If you&apos;re under 18 and want to create
        an account, please have a parent or guardian set it up with you. We do not knowingly
        collect personal data from children under 13 on the main site.
      </p>

      <h2 id="kids">R2BOT Kids (ages 5–17) and the R2BOT Kids app</h2>
      <p>
        R2BOT Kids (www.r2bot.in/kids and the R2BOT Kids app for Android and iOS) is built so that a
        child never has to give us anything about themselves. This section describes exactly what it
        stores and where, and it applies under COPPA (United States), GDPR and UK GDPR, including
        Article 8 (children), and India&apos;s DPDP Act 2023.
      </p>
      <h3>What a child never gives us</h3>
      <ul>
        <li>No email address, password, phone number, birthday, real name, photo or location.
          There are no accounts for children, no chat between children, no ads, no in-app
          purchases and no leaderboards.</li>
      </ul>
      <h3>Progress stays on the device</h3>
      <ul>
        <li>Stars, XP, badges, course and activity progress, game personal bests, the explorer
          name and avatar, and the robot a child designs are saved in the browser&apos;s own
          storage (local storage) on that device. They are not sent to us. Clearing the
          browser&apos;s site data, or uninstalling the app, deletes them.</li>
      </ul>
      <h3>Joining a teacher&apos;s class (optional)</h3>
      <ul>
        <li>Only if a child types a class code from their teacher, we store: the <strong>class
          nickname</strong> they pick (2–20 characters; the form asks for a first name or a made-up
          robot name, and rejects anything that looks like an email, phone number or link), and a
          <strong> progress snapshot</strong> the teacher sees: star totals, Robot World levels and
          zones finished, story episodes, Code Lab missions, course sessions and Skill Galaxy
          activities finished, games played, minutes played, which levels the child keeps
          retrying, the age band, and the Workshop robot design including the robot&apos;s name.</li>
        <li>The child&apos;s device is identified to the class by a random token. We store only a
          SHA-256 hash of it, never anything that identifies the device or the child.</li>
        <li>Only that teacher can see the nickname and snapshot; if the class belongs to a school,
          the school&apos;s admin teacher sees a school-wide summary. Nothing is shared with anyone else.</li>
        <li>Deletion: a child can tap &quot;Leave class&quot; on the Join page, which deletes the
          nickname and snapshot at once; a teacher can remove a member or delete the class; or a
          parent can email <strong>hello@r2bot.in</strong>.</li>
      </ul>
      <h3>Camera, microphone and voices</h3>
      <ul>
        <li>The camera is used only in two places: the Workshop&apos;s &quot;see your robot in your
          room&quot; view and the Vision Lab (where a child teaches a robot to spot things), and only
          after the device asks permission. Camera frames are processed on the device and never
          leave it: nothing is recorded or uploaded.</li>
        <li>Spoken voices are pre-recorded audio files or the device&apos;s own text-to-speech. R2BOT
          Kids never records or stores audio itself.</li>
      </ul>
      <h3>Ask Spark and the AI labs</h3>
      <ul>
        <li>When a child types a question to Ask Spark, or presses &quot;Ask the AI helper&quot; in
          Talk to your robot, the text is sent to our server. Anything that looks personal (an
          email, a long number, a web address, &quot;my name is&nbsp;&hellip;&quot;) is removed or
          the request is refused before anything else happens. Questions are not stored or logged;
          we keep only hashed counters for daily limits.</li>
        <li>Many questions are answered from Spark&apos;s own notebook on our server. Only when the
          AI helper is switched on, the cleaned question is sent to our AI model provider,
          Anthropic (Claude), to write the answer. Under Anthropic&apos;s commercial terms, what is
          sent through its API is not used to train its models.</li>
        <li>The microphone buttons (in Ask Spark and some activities) use the browser&apos;s own
          speech recognition. In some browsers, for example Chrome, the browser sends that audio to
          its maker (such as Google) to turn it into text. R2BOT never receives the audio, only the
          text, and typing always works instead.</li>
        <li>Vision Lab frames stay on the device, as above.</li>
      </ul>
      <h3>Analytics</h3>
      <ul>
        <li>Google Analytics is not loaded on R2BOT Kids pages, and never inside the R2BOT Kids
          app. We count page views with our own first-party counter, which sends the page address
          and nothing else: no cookie, no identifier, no IP address stored.</li>
        <li>Inside the app, any link that leaves R2BOT Kids (to the main site or anywhere else)
          sits behind a parental gate: a grown-up has to answer a question first.</li>
      </ul>
      <h3>Teachers and parents</h3>
      <ul>
        <li>Teachers sign in with their own adult account to create a class; the &quot;What we
          collect&quot; section above applies to them. The schools pilot form is for adults and
          asks for a work email.</li>
      </ul>

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
        Questions? Email <strong>hello@r2bot.in</strong>.
      </p>
    </StaticPage>
  );
}
