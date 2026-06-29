import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { SchoolRegisterForm } from './SchoolRegisterForm';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app';

export const metadata: Metadata = {
  title: 'Register Your School — R2BOT for Schools',
  description: 'Sign up your school for the free R2BOT robotics curriculum. CBSE/ICSE aligned. Activation in 24 hours.',
  alternates: { canonical: `${BASE_URL}/schools/register` },
};

export default function SchoolRegisterPage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#050810] min-h-screen pt-32 pb-16">
        <div className="mx-auto max-w-2xl px-4">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
              🏫 School Registration
            </span>
            <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">Activate R2BOT for your school</h1>
            <p className="mt-2 text-zinc-400">
              Free during the entire 2026 academic year. We&apos;ll send you a class code and dashboard link in 24 hours.
            </p>
          </header>
          <SchoolRegisterForm />
        </div>
      </main>
    </CopilotProvider>
  );
}
