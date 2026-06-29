import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to R2BOT — track your courses, save Atlas entries, and pick up where you left off.',
};

export default function LoginPage() {
  return (
    <StaticPage
      eyebrow="Sign in"
      title="Welcome back."
      lede="Enter your email. We'll send you a one-time sign-in link — no password to remember."
      maxWidth={480}
    >
      <AuthForm mode="signin" />
      <p style={{ marginTop: 28, fontSize: 14, color: '#8893a4' }}>
        New to R2BOT? <a href="/signup" style={{ color: 'var(--cyan)' }}>Create an account →</a>
      </p>
    </StaticPage>
  );
}
