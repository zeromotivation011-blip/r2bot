import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { AuthPanel } from '@/components/auth/AuthPanel';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to R2BOT — track your courses, save Atlas entries, and pick up where you left off.',
};

export default function LoginPage() {
  return (
    <StaticPage
      eyebrow="Sign in"
      title="Welcome back."
      lede="A sign-in link, Google, or a password — whichever you used before. Everything on R2BOT is free to read without an account; signing in only saves your progress."
      maxWidth={480}
    >
      <AuthPanel mode="signin" next="/dashboard" />
      <p style={{ marginTop: 28, fontSize: 14, color: 'var(--text-3)' }}>
        New to R2BOT? <a href="/signup" className="r2-link">Create an account</a>
      </p>
    </StaticPage>
  );
}
