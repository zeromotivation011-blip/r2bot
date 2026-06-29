'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DOMAINS,
  PROFILES,
  USE_CASES,
  filterUseCases,
  type DomainId,
  type ProfileId,
  type UseCase,
} from '@/lib/daily-life-data';

type Stored = {
  profile: ProfileId;
  domains: DomainId[];
};

const STORAGE_KEY = 'r2bot_daily_profile';

function loadStored(): Stored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed.profile || !Array.isArray(parsed.domains)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(s: Stored) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // best-effort
  }
}

function clearStored() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}

export function DailyLifePageClient() {
  const [step, setStep] = useState<'profile' | 'domains' | 'results'>('profile');
  const [profile, setProfile] = useState<ProfileId | null>(null);
  const [domains, setDomains] = useState<DomainId[]>([]);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setProfile(stored.profile);
      setDomains(stored.domains);
      setStep('results');
    }
  }, []);

  function pickProfile(p: ProfileId) {
    setProfile(p);
    setStep('domains');
  }

  function toggleDomain(d: DomainId) {
    setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function commitDomains() {
    if (!profile) return;
    saveStored({ profile, domains });
    setStep('results');
  }

  function resetProfile() {
    clearStored();
    setProfile(null);
    setDomains([]);
    setStep('profile');
  }

  if (step === 'profile') {
    return <ProfileStep onPick={pickProfile} />;
  }
  if (step === 'domains' && profile) {
    return (
      <DomainsStep
        profile={profile}
        domains={domains}
        onToggle={toggleDomain}
        onSubmit={commitDomains}
        onBack={() => setStep('profile')}
      />
    );
  }
  if (step === 'results' && profile) {
    return <ResultsStep profile={profile} domains={domains} onReset={resetProfile} />;
  }
  return null;
}

function ProfileStep({ onPick }: { onPick: (p: ProfileId) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4">
      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
          🤖 Step 1 of 2
        </span>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">Who are you?</h1>
        <p className="mt-2 text-zinc-400">
          Pick the one that best describes you — we&apos;ll personalise the robots that are already in your life.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/50 hover:bg-amber-500/5"
          >
            <span className="text-5xl" aria-hidden>
              {p.emoji}
            </span>
            <span className="text-base font-bold text-white">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DomainsStep({
  profile,
  domains,
  onToggle,
  onSubmit,
  onBack,
}: {
  profile: ProfileId;
  domains: DomainId[];
  onToggle: (d: DomainId) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const profileLabel = PROFILES.find((p) => p.id === profile)?.label ?? 'You';
  return (
    <div className="mx-auto max-w-4xl px-4">
      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-cyan-300">
          🤖 Step 2 of 2 · {profileLabel}
        </span>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
          What part of life interests you?
        </h1>
        <p className="mt-2 text-zinc-400">
          Pick one or more. We&apos;ll only show robots from the areas you choose. (Leave empty to see everything.)
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {DOMAINS.map((d) => {
          const active = domains.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onToggle(d.id)}
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all ${
                active
                  ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/30'
              }`}
              aria-pressed={active}
            >
              <span className="text-3xl" aria-hidden>
                {d.emoji}
              </span>
              <span className="text-xs font-semibold">{d.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-white/30"
        >
          ← Change profile
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-3 text-sm font-extrabold text-[#1a0f00] shadow-lg hover:scale-[1.03]"
        >
          Show me the robots in my life →
        </button>
      </div>
    </div>
  );
}

function ResultsStep({
  profile,
  domains,
  onReset,
}: {
  profile: ProfileId;
  domains: DomainId[];
  onReset: () => void;
}) {
  const cases = useMemo(() => filterUseCases(profile, domains), [profile, domains]);
  const profileLabel = PROFILES.find((p) => p.id === profile)?.label ?? 'You';
  const domainLabels = domains
    .map((d) => DOMAINS.find((x) => x.id === d)?.label ?? d)
    .join(', ');

  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
          🤖 Found in your life
        </span>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
          Found{' '}
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
            {cases.length} robots
          </span>{' '}
          already working in your life
        </h1>
        <p className="mt-3 text-zinc-400">
          Showing {cases.length} use cases for <strong className="text-white">{profileLabel}</strong>
          {domainLabels ? (
            <>
              {' '}in <strong className="text-white">{domainLabels}</strong>
            </>
          ) : (
            <> across <strong className="text-white">all domains</strong></>
          )}
          .
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((u) => (
          <UseCaseCard key={u.id} useCase={u} />
        ))}
      </div>

      {cases.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-400">
          No use cases match this exact combination yet. Try adding more domains, or change your profile.
        </p>
      ) : null}

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-white/30"
        >
          Change my profile
        </button>
      </div>
    </div>
  );
}

function difficultyLabel(d: UseCase['difficulty']): { text: string; cls: string } {
  if (d === 'invisible') return { text: '👻 Invisible', cls: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300' };
  if (d === 'simple') return { text: '🤝 Simple', cls: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200' };
  return { text: '🧠 Complex', cls: 'border-purple-400/30 bg-purple-500/10 text-purple-200' };
}

function UseCaseCard({ useCase }: { useCase: UseCase }) {
  const [open, setOpen] = useState(false);
  const diff = difficultyLabel(useCase.difficulty);
  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white/[0.03] transition-colors ${
        open ? 'border-amber-400/40' : 'border-white/10 hover:border-white/25'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="block w-full p-5 text-left"
      >
        <div className="flex items-start gap-3">
          <span className="text-4xl" aria-hidden>
            {useCase.imageEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${diff.cls}`}>
                {diff.text}
              </span>
              {useCase.domains.slice(0, 2).map((d) => (
                <span key={d} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  {d.replace('-', ' ')}
                </span>
              ))}
            </div>
            <h3 className="mt-2 text-lg font-extrabold text-white">{useCase.title}</h3>
            <p className="mt-2 text-sm font-bold leading-snug text-amber-300">
              {useCase.hookLine}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
              {open ? 'Hide details ▴' : 'Show how it works →'}
            </span>
          </div>
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/10 px-5 pb-5 pt-3">
          <div className="space-y-3 text-sm leading-relaxed text-zinc-200">
            <p>
              <span className="font-bold text-white">How it works: </span>
              {useCase.howItWorks}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-500/[0.06] p-3">
            <p className="text-sm text-cyan-100">
              <span className="font-bold">Think of it like:</span> {useCase.analogyExplanation}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3">
            <p className="text-sm text-amber-100">
              <span className="font-bold">🤯 Mind-blowing:</span> {useCase.mindBlowingFact}
            </p>
          </div>

          {useCase.costImpact ? (
            <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-3">
              <p className="text-sm text-emerald-100">
                <span className="font-bold">💰 Impact:</span> {useCase.costImpact}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {useCase.simulationLink ? (
              <Link
                href={useCase.simulationLink}
                className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                Try the concept →
              </Link>
            ) : null}
            {useCase.atlasLink ? (
              <Link
                href={useCase.atlasLink}
                className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                Learn more in Atlas →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
