'use client'

// components/kids/net/SecurityCheckClient.tsx
// Robot Security Check (roadmap #88), the Robot Guardians mission at
// /kids/lab/network/guardian. Four defensive steps on a school's robots:
// audit → signed update → strong password → least privilege. Every choice is
// a tap on a card (no typing: the child never enters or stores a password).
// Mistakes get a kind, specific explanation and the step continues.
// Reward: reportBestRun({ kind: 'challenge', id: SECURITY_BEST_ID, score: stars }).

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { reportBestRun } from '@/lib/kids/universe/rewards'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { playSound } from '@/lib/kids-audio'
import { useKidsReducedMotion } from '@/lib/kids/settings'
import { FLEET, PASSWORDS, PERMISSIONS, SECURITY_BEST_ID, UPDATES, checkSignature, permissionMistakes, securityStars, type SignatureCheck } from './security-check'

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5'
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const btnPrimary = `inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-amber-400 px-5 font-display text-base font-black text-[#1A1103] hover:bg-amber-300 disabled:opacity-40 ${focus}`
const btnGhost = `inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-3 text-sm font-bold text-slate-100 hover:bg-white/10 ${focus}`

const STEPS = ['Find the weak robot', 'Install the right update', 'Choose a strong password', 'Only what the job needs'] as const

type Verdict = { tone: 'ok' | 'no'; text: string } | null

function Feedback({ v }: { v: Verdict }) {
  return (
    <p role="status" aria-live="polite" data-cue={v ? v.tone : undefined} className={`mt-3 min-h-[1.5rem] rounded-2xl text-[15px] leading-snug ${v ? `border p-3 ${v.tone === 'ok' ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-50' : 'border-amber-300/40 bg-amber-400/10 text-amber-50'}` : ''}`}>
      {v?.text}
    </p>
  )
}

function Deeper({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-[15px] leading-snug text-cyan-50">
      <summary className={`min-h-[44px] cursor-pointer py-2 font-bold text-cyan-200 ${focus}`}>Go deeper (ages 11+)</summary>
      <div className="space-y-2 pt-1">{children}</div>
    </details>
  )
}

export default function SecurityCheckClient() {
  const reduced = useKidsReducedMotion()
  const [step, setStep] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [solved, setSolved] = useState(false)
  // step 2
  const [checks, setChecks] = useState<Record<string, SignatureCheck>>({})
  const [peek, setPeek] = useState<string | null>(null)
  const [installing, setInstalling] = useState(0)
  // step 4
  const [granted, setGranted] = useState<Set<string>>(new Set())
  const [wrongPerms, setWrongPerms] = useState<string[]>([])
  // done
  const [best, setBest] = useState<number | null>(null)
  const [reward, setReward] = useState<{ stars: number; xp: number; improved: boolean } | null>(null)
  const headRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    const read = () => {
      const v = getProgress().personalBests[SECURITY_BEST_ID]
      setBest(typeof v === 'number' ? v : null)
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, read)
  }, [])

  const miss = (text: string) => {
    setMistakes((m) => m + 1)
    setVerdict({ tone: 'no', text })
    playSound('wrong')
  }
  const win = (text: string) => {
    setVerdict({ tone: 'ok', text })
    setSolved(true)
    playSound('correct')
  }

  const next = () => {
    setStep((s) => s + 1)
    setVerdict(null)
    setSolved(false)
    setWrongPerms([])
    requestAnimationFrame(() => headRef.current?.focus())
  }

  const restart = () => {
    setStep(0)
    setMistakes(0)
    setVerdict(null)
    setSolved(false)
    setChecks({})
    setPeek(null)
    setInstalling(0)
    setGranted(new Set())
    setWrongPerms([])
    setReward(null)
    requestAnimationFrame(() => headRef.current?.focus())
  }

  // Install progress (instant with less motion).
  useEffect(() => {
    if (installing <= 0 || installing >= 100) return
    if (reduced) {
      setInstalling(100)
      return
    }
    const id = window.setTimeout(() => setInstalling((p) => Math.min(100, p + 20)), 180)
    return () => window.clearTimeout(id)
  }, [installing, reduced])
  useEffect(() => {
    if (installing === 100 && step === 1) win('Update 3.0 installed. Patch now refuses its factory password and asks for a new one. Next: choose it.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installing, step])

  const finish = () => {
    const stars = securityStars(mistakes)
    const r = reportBestRun({ kind: 'challenge', id: SECURITY_BEST_ID, stars, score: stars, attempts: 1 })
    setReward({ stars, xp: r?.xpGained ?? 0, improved: !!r })
    setStep(4)
    setVerdict(null)
    playSound('star')
    requestAnimationFrame(() => headRef.current?.focus())
  }

  return (
    <section aria-labelledby="sec-title" className="mx-auto max-w-4xl px-4 pb-8">
      <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Mission steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={`rounded-xl px-2 py-2 text-center text-[12px] font-bold leading-tight sm:text-[13px] ${i < step ? 'bg-emerald-400 text-[#0A1120]' : i === step ? 'bg-amber-400 text-[#1A1103]' : 'bg-white/5 text-[#A7B0C0]'}`}>
            <span aria-hidden>{i < step ? '✓ ' : `${i + 1}. `}</span>
            {s}
          </li>
        ))}
      </ol>

      <div className={card}>
        {step === 0 && (
          <>
            <h2 id="sec-title" ref={headRef} tabIndex={-1} className="font-display text-2xl font-black text-white focus:outline-none">
              Step 1 · Which robot is easiest to take over?
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-slate-200">
              You are the school’s Robot Guardian. The IT team printed the settings of the four school robots. Read them and tap the robot that needs fixing first.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {FLEET.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={solved}
                    onClick={() => (r.weakest ? win(r.feedback) : miss(r.feedback))}
                    className={`flex h-full w-full flex-col gap-1 rounded-2xl border border-white/10 bg-[#111C32] p-3 text-left hover:border-white/25 disabled:cursor-default ${focus} ${solved && r.weakest ? 'border-emerald-300 ring-2 ring-emerald-300/50' : ''}`}
                  >
                    <span className="flex items-center gap-2 font-display text-lg font-bold text-white">
                      <span aria-hidden className="text-2xl">
                        {r.icon}
                      </span>
                      {r.name}
                    </span>
                    <span className="text-sm text-[#A7B0C0]">{r.job}</span>
                    <span className="text-sm text-slate-200">
                      <b>Password:</b> {r.password}
                    </span>
                    <span className="text-sm text-slate-200">
                      <b>Software:</b> {r.software}
                    </span>
                    <span className="text-sm text-slate-200">
                      <b>Updates:</b> {r.updates}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Feedback v={verdict} />
            <Deeper>
              <p>
                Many devices used to leave the factory with the same password on every unit (“admin”, “1234”), printed in the manual. Automated programs scan networks
                for devices still using them. That is why the UK banned universal default passwords on smart devices from April 2024, and why a Guardian’s first check
                is “has anyone changed the factory password?”
              </p>
              <p>Old software is the second check: every update fixes mistakes that have become public. A robot that never updates keeps every one of them.</p>
            </Deeper>
          </>
        )}

        {step === 1 && (
          <>
            <h2 id="sec-title" ref={headRef} tabIndex={-1} className="font-display text-2xl font-black text-white focus:outline-none">
              Step 2 · Fix Patch with the right update
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-slate-200">
              Three files say they will fix Patch. A robot should install only an update its maker <b>signed</b>. Check each signature, then install the safe one.
            </p>
            <ul className="mt-3 space-y-2">
              {UPDATES.map((u) => {
                const c = checks[u.id]
                return (
                  <li key={u.id} className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
                    <p className="font-mono text-base font-bold text-white">{u.file}</p>
                    <p className="text-sm text-[#A7B0C0]">From: {u.from}</p>
                    {c && (
                      <p className="mt-1 text-sm" data-cue={c.status === 'valid' ? 'ok' : 'no'}>
                        {c.status === 'missing' ? (
                          <span className="font-bold text-amber-200">✗ No signature. Nobody vouches for this file.</span>
                        ) : (
                          <>
                            <span className="block text-slate-200">
                              Fingerprint of this file: <span className="font-mono">{c.fileFingerprint}</span>
                            </span>
                            <span className="block text-slate-200">
                              Fingerprint RoboMaker signed: <span className="font-mono">{c.signedFingerprint}</span>
                            </span>
                            <span className={`font-bold ${c.status === 'valid' ? 'text-emerald-300' : 'text-amber-200'}`}>
                              {c.status === 'valid' ? '✓ They match: this is exactly the file RoboMaker signed.' : '✗ They do not match: the file was changed after it was signed.'}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    {peek === u.id && <p className="mt-1 rounded-xl bg-black/30 p-2 font-mono text-[13px] text-slate-300">{u.content}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className={btnGhost} onClick={() => setChecks((m) => ({ ...m, [u.id]: checkSignature(u) }))} disabled={!!c}>
                        Check signature
                      </button>
                      <button type="button" className={btnGhost} onClick={() => setPeek((p) => (p === u.id ? null : u.id))} aria-expanded={peek === u.id}>
                        Look inside
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={solved || installing > 0}
                        onClick={() => {
                          const res = checkSignature(u)
                          setChecks((m) => ({ ...m, [u.id]: res }))
                          if (res.status === 'valid') {
                            setVerdict({ tone: 'ok', text: u.feedback })
                            setInstalling(reduced ? 100 : 20)
                          } else miss(u.feedback)
                        }}
                      >
                        Install
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            {installing > 0 && (
              <div className="mt-3" aria-hidden>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${installing}%` }} />
                </div>
              </div>
            )}
            <Feedback v={verdict} />
            <Deeper>
              <p>
                A digital signature uses a key pair. RoboMaker keeps a <b>private key</b> secret and signs the fingerprint (a hash) of each update with it. Every robot
                has the matching <b>public key</b>, which can check a signature but cannot make one. Change even one letter of the file and its fingerprint changes
                completely, so the signature no longer fits.
              </p>
              <p>
                The fingerprint here is a tiny 32-bit one so you can read it. Real updates use SHA-256 (256 bits) and signature schemes such as Ed25519 or ECDSA.
                Car makers, phones and robot fleets all refuse unsigned updates; this is called secure boot or code signing.
              </p>
            </Deeper>
          </>
        )}

        {step === 2 && (
          <>
            <h2 id="sec-title" ref={headRef} tabIndex={-1} className="font-display text-2xl font-black text-white focus:outline-none">
              Step 3 · Choose Patch’s new password
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-slate-200">
              The update makes Patch ask the IT team for a new password. Which one should they pick? (These are examples: never use a password you have seen online.)
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {PASSWORDS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={solved}
                    onClick={() => (p.strong ? win(`${p.feedback} Guessing it takes ${p.guesses}: ${p.time} even for a very fast computer.`) : miss(`${p.feedback} Guessing it takes ${p.guesses} — ${p.time} for a fast computer.`))}
                    className={`flex min-h-[64px] w-full items-center rounded-2xl border border-white/10 bg-[#111C32] p-3 text-left font-mono text-lg font-bold text-white hover:border-white/25 disabled:cursor-default ${focus} ${solved && p.strong ? 'border-emerald-300 ring-2 ring-emerald-300/50' : ''}`}
                  >
                    {p.text}
                  </button>
                </li>
              ))}
            </ul>
            <Feedback v={verdict} />
            <Deeper>
              <p>
                Strength comes from how many possibilities a guesser must try. Five words, each picked at random from a list of 7,776, give 7,776⁵ ≈ 2.8 × 10¹⁹
                possibilities. Short passwords with symbols have far fewer, and guessers try common patterns (names, years, “P@ss”) first.
              </p>
              <p>Good robots also slow guessers down: they lock for a while after a few wrong tries, and they can ask for a second factor.</p>
            </Deeper>
          </>
        )}

        {step === 3 && (
          <>
            <h2 id="sec-title" ref={headRef} tabIndex={-1} className="font-display text-2xl font-black text-white focus:outline-none">
              Step 4 · Least privilege for the delivery app
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-slate-200">
              A new app will drive Patch between classrooms. Give it only the permissions its job needs, then press Check.
            </p>
            <ul className="mt-3 space-y-2">
              {PERMISSIONS.map((p) => {
                const on = granted.has(p.id)
                const wrong = wrongPerms.includes(p.id)
                return (
                  <li key={p.id}>
                    <label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border p-3 ${wrong ? 'border-amber-300/70 bg-amber-400/10' : on ? 'border-emerald-300/50 bg-emerald-400/10' : 'border-white/10 bg-[#111C32]'}`}>
                      <input
                        type="checkbox"
                        className="h-6 w-6 shrink-0 accent-amber-400"
                        checked={on}
                        disabled={solved}
                        onChange={(e) => {
                          const n = new Set(granted)
                          if (e.target.checked) n.add(p.id)
                          else n.delete(p.id)
                          setGranted(n)
                          setWrongPerms((w) => w.filter((x) => x !== p.id))
                        }}
                      />
                      <span aria-hidden className="text-2xl">
                        {p.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block font-bold text-white">{p.label}</span>
                        {(wrong || solved) && <span className="block text-sm text-[#C9D2E0]">{p.why}</span>}
                      </span>
                      <span className="text-sm font-bold text-[#A7B0C0]">{on ? 'Allowed' : 'Not allowed'}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            {!solved && (
              <button
                type="button"
                className={`${btnPrimary} mt-3`}
                onClick={() => {
                  const wrong = permissionMistakes(granted)
                  setWrongPerms(wrong)
                  if (wrong.length === 0) win('Exactly right: wheels, map and the front camera, nothing else. If this app ever has a bug, it cannot listen in, read pupils’ details or touch other robots.')
                  else miss(`${wrong.length === 1 ? 'One permission needs' : `${wrong.length} permissions need`} another look (marked in orange). Ask of each one: does delivering parcels really need this?`)
                }}
              >
                Check
              </button>
            )}
            <Feedback v={verdict} />
            <Deeper>
              <p>
                Least privilege is one of the oldest rules in computer security: every program and every person gets the smallest set of powers that lets them do
                their job. Then one mistake or one stolen password cannot spread far.
              </p>
              <p>
                Robots do this too. ROS 2 can run with security enabled (SROS 2), where each part of the robot gets its own key and a list of the topics it may
                read or write: the delivery planner may send drive commands, but the camera driver may not.
              </p>
            </Deeper>
          </>
        )}

        {step === 4 && reward && (
          <>
            <h2 id="sec-title" ref={headRef} tabIndex={-1} className="font-display text-3xl font-black text-white focus:outline-none">
              Patch is safe again
            </h2>
            <p className="mt-1 font-display text-2xl" aria-label={`${reward.stars} of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <span key={i} aria-hidden className={i < reward.stars ? 'text-amber-300' : 'text-white/20'}>
                  ★
                </span>
              ))}
            </p>
            <p className="mt-2 text-[15px] text-slate-200">
              {mistakes === 0 ? 'No wrong turns at all.' : `${mistakes} wrong ${mistakes === 1 ? 'turn' : 'turns'} on the way, each one a lesson.`}{' '}
              {reward.improved && reward.xp > 0 ? <b className="text-amber-300">+{reward.xp} XP</b> : best !== null ? 'Beat your best to earn more XP.' : ''}
            </p>
            <ul className="mt-3 space-y-1 text-[15px] text-slate-200">
              <li>✓ Changed the factory password: no more “admin”.</li>
              <li>✓ Installed only a signed update, and saw a changed file fail its check.</li>
              <li>✓ Chose a long passphrase of random words.</li>
              <li>✓ Gave the app only what its job needs: least privilege.</li>
            </ul>
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-[15px] leading-snug text-slate-200">
              <b>Guardian rule:</b> if you ever notice a weakness in a device that is not yours, do not try it out. Tell the person in charge.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={restart}>
                Play again
              </button>
              <Link href="/kids/lab/network" className={btnGhost}>
                Link Lab: keep a robot safe when the radio fails
              </Link>
              <Link href="/kids/worlds/guardians" className={btnGhost}>
                Back to Robot Guardians
              </Link>
            </div>
          </>
        )}

        {step < 4 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#A7B0C0]">{best !== null ? `Your best: ${best} of 3 stars` : 'Progress is saved on this device.'}</p>
            <button type="button" className={btnPrimary} disabled={!solved} onClick={step === 3 ? finish : next}>
              {step === 3 ? 'Finish the mission' : 'Next step'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
