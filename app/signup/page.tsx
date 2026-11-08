import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { AuthPanel } from '@/components/auth/AuthPanel';

export const metadata: Metadata = {
  title: 'Get started',
  description: 'Create your free R2BOT account — track courses, save Atlas entries, and earn certificates.',
};

export default function SignupPage() {
  return (
    <StaticPage
      eyebrow="Create account"
      title="Join R2BOT."
      lede="An account saves your progress and your certificates. No card, no spam, no upsell — and everything here stays free to read whether you make one or not."
      maxWidth={480}
    >
      <AuthPanel mode="signup" next="/dashboard" />
      <p style={{ marginTop: 28, fontSize: 14, color: 'var(--text-3)' }}>
        Already have an account? <a href="/login" className="r2-link">Sign in</a>
      </p>
    </StaticPage>
  );
}
