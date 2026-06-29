import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = {
  title: 'Get started',
  description: 'Create your free R2BOT account — track diagnostics, save Atlas entries, and follow courses.',
};

export default function SignupPage() {
  return (
    <StaticPage
      eyebrow="Create account"
      title="Join R2BOT."
      lede="One email gets you the Atlas, courses, the diagnostic, and R2 Co-pilot. No card, no spam, no upsell."
      maxWidth={480}
    >
      <AuthForm mode="signup" />
      <p style={{ marginTop: 28, fontSize: 14, color: '#8893a4' }}>
        Already have an account? <a href="/login" style={{ color: 'var(--cyan)' }}>Sign in →</a>
      </p>
    </StaticPage>
  );
}
