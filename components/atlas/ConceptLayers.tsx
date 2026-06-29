'use client'

// components/atlas/ConceptLayers.tsx
// Layered content blocks for the Atlas concept page:
//   - KeyTakeaways  (always open)
//   - DeepDive      (collapsed, with technical body + formula + code + mistakes + pro tip)
//   - RealWorld     (always open)
//   - QuickChallenge (always open, with quiz state + XP)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { AtlasEntry } from '@/lib/atlas'
import {
  addXP,
  isConceptMastered,
  markConceptMastered,
  recordQuizRound,
} from '@/lib/atlas-xp'

export function KeyTakeaways({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <section
      style={{
        background: 'rgba(15, 18, 32, 0.55)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 22,
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#10b981',
          fontWeight: 900,
          margin: '0 0 10px',
        }}
      >
        ✅ Key takeaways
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#d1fae5', fontSize: 15 }}>
            <span style={{ color: '#10b981', fontWeight: 900, marginTop: 2 }}>✓</span>
            <span style={{ lineHeight: 1.5 }}>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DeepDive(props: {
  body?: string
  diagramImage?: string
  formulaLatex?: string
  codeSnippet?: string
  commonMistakes?: string[]
  proTip?: string
}) {
  const { body, diagramImage, formulaLatex, codeSnippet, commonMistakes, proTip } = props
  const [open, setOpen] = useState(false)
  const hasAny =
    body || diagramImage || formulaLatex || codeSnippet || (commonMistakes && commonMistakes.length > 0) || proTip
  if (!hasAny) return null

  return (
    <section
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        marginBottom: 22,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: 'rgba(15,18,32,0.55)',
          color: '#fff',
          border: 'none',
          textAlign: 'left',
          fontWeight: 800,
          fontSize: 15,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>🔬 Deep dive — full technical story</span>
        <span style={{ color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: 18, background: 'rgba(11,18,32,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {body && (
            <p style={{ color: '#c8d0dc', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: 0 }}>
              {body}
            </p>
          )}
          {diagramImage && (
            <img
              src={diagramImage}
              alt="Diagram"
              style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 12, margin: '12px 0' }}
            />
          )}
          {formulaLatex && (
            <pre
              style={{
                background: '#0b1220',
                color: '#10b981',
                padding: 14,
                borderRadius: 10,
                fontFamily: 'monospace',
                fontSize: 13,
                overflow: 'auto',
              }}
            >
              {formulaLatex}
            </pre>
          )}
          {codeSnippet && (
            <pre
              style={{
                background: '#0b1220',
                color: '#e5e7eb',
                padding: 14,
                borderRadius: 10,
                fontFamily: 'monospace',
                fontSize: 13,
                overflow: 'auto',
              }}
            >
              <code>{codeSnippet}</code>
            </pre>
          )}
          {commonMistakes && commonMistakes.length > 0 && (
            <div
              style={{
                marginTop: 14,
                background: 'rgba(249,115,22,0.10)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#fb923c',
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                ⚠️ Common mistakes
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                {commonMistakes.map((m, i) => (
                  <li key={i} style={{ color: '#fde68a', fontSize: 14, marginBottom: 4 }}>
                    • {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {proTip && (
            <div
              style={{
                marginTop: 12,
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.4)',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#a78bfa',
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                💜 Pro tip
              </p>
              <p style={{ color: '#ddd6fe', fontSize: 14, margin: '6px 0 0', lineHeight: 1.5 }}>{proTip}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export function RealWorldStrip({
  usedIn,
  realWorldProducts,
  companies,
  indianCompanies,
}: {
  usedIn?: string[]
  realWorldProducts?: string[]
  companies?: string[]
  indianCompanies?: string[]
}) {
  const hasAny =
    (usedIn && usedIn.length > 0) ||
    (realWorldProducts && realWorldProducts.length > 0) ||
    (companies && companies.length > 0) ||
    (indianCompanies && indianCompanies.length > 0)
  if (!hasAny) return null

  return (
    <section
      style={{
        background: 'rgba(15,18,32,0.55)',
        border: '1px solid rgba(0,229,255,0.3)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 22,
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#00E5FF',
          fontWeight: 900,
          margin: '0 0 10px',
        }}
      >
        🌍 Where you&apos;ve already seen this
      </p>
      {usedIn && usedIn.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
          {usedIn.map((u, i) => (
            <li key={i} style={{ color: '#c8d0dc', fontSize: 14, marginBottom: 4, display: 'flex', gap: 8 }}>
              <span>🔹</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
      )}
      {realWorldProducts && realWorldProducts.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {realWorldProducts.map(p => (
            <span
              key={p}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                background: 'rgba(0,184,212,0.14)',
                color: '#67e8f9',
                border: '1px solid rgba(0,184,212,0.3)',
                borderRadius: 999,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}
      {companies && companies.length > 0 && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          <span style={{ fontWeight: 700 }}>Used by:</span> {companies.join(' · ')}
        </p>
      )}
      {indianCompanies && indianCompanies.length > 0 && (
        <p style={{ fontSize: 12, color: '#fde68a', margin: '4px 0 0' }}>
          🇮🇳 <span style={{ fontWeight: 700 }}>In India:</span> {indianCompanies.join(' · ')}
        </p>
      )}
    </section>
  )
}

export function QuickChallenge({
  slug,
  questionText,
  options,
  correct,
  xpValue,
  defaultExplanation,
}: {
  slug: string
  questionText?: string
  options?: string[]
  correct?: number
  xpValue?: number
  defaultExplanation?: string
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [mastered, setMastered] = useState(false)
  const [bonusAwarded, setBonusAwarded] = useState(false)

  useEffect(() => {
    setMastered(isConceptMastered(slug))
  }, [slug])

  if (!questionText || !options || options.length === 0 || typeof correct !== 'number') {
    return (
      <MasterButton
        slug={slug}
        xpValue={xpValue}
        mastered={mastered}
        onMastered={() => setMastered(true)}
      />
    )
  }

  const isCorrect = picked !== null && picked === correct
  const isWrong = picked !== null && picked !== correct

  const handlePick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === correct) {
      if (!bonusAwarded) {
        addXP(5)
        setBonusAwarded(true)
      }
      recordQuizRound(slug, 1)
    }
  }

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(0,229,255,0.08))',
        border: '1px solid rgba(124,58,237,0.45)',
        borderRadius: 18,
        padding: 22,
        marginBottom: 22,
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#a78bfa',
          fontWeight: 900,
          margin: 0,
        }}
      >
        🎯 Quick challenge
      </p>
      <p style={{ fontSize: 16, color: '#fff', lineHeight: 1.55, margin: '8px 0 14px' }}>{questionText}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          const showCorrect = picked !== null && i === correct
          const showWrong = picked === i && i !== correct
          const bg =
            picked === null
              ? 'rgba(255,255,255,0.04)'
              : showCorrect
                ? 'rgba(16,185,129,0.18)'
                : showWrong
                  ? 'rgba(249,115,22,0.18)'
                  : 'rgba(255,255,255,0.03)'
          const border =
            picked === null
              ? '2px solid rgba(255,255,255,0.1)'
              : showCorrect
                ? '2px solid #10b981'
                : showWrong
                  ? '2px solid #f97316'
                  : '2px solid rgba(255,255,255,0.06)'
          const color = showCorrect ? '#d1fae5' : showWrong ? '#fed7aa' : '#f4f4f5'
          return (
            <button
              key={i}
              type="button"
              disabled={picked !== null}
              onClick={() => handlePick(i)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                background: bg,
                border,
                borderRadius: 12,
                color,
                fontSize: 14,
                fontWeight: 600,
                cursor: picked === null ? 'pointer' : 'default',
              }}
            >
              <span style={{ color: '#fbbf24', fontWeight: 900, marginRight: 8 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          )
        })}
      </div>

      {isCorrect && (
        <p style={{ marginTop: 14, color: '#10b981', fontWeight: 800, fontSize: 14 }}>
          ✅ Correct! +5 XP bonus.
        </p>
      )}
      {isWrong && (
        <p style={{ marginTop: 14, color: '#fb923c', fontWeight: 800, fontSize: 14 }}>
          ❌ The answer is: {options[correct]}.
          {defaultExplanation ? ` ${defaultExplanation}` : ''}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <MasterButton
          slug={slug}
          xpValue={xpValue}
          mastered={mastered}
          onMastered={() => setMastered(true)}
        />
      </div>
    </section>
  )
}

function MasterButton({
  slug,
  xpValue,
  mastered,
  onMastered,
}: {
  slug: string
  xpValue?: number
  mastered: boolean
  onMastered: () => void
}) {
  const handle = () => {
    if (mastered) return
    markConceptMastered(slug, xpValue ?? 10)
    onMastered()
  }
  return (
    <button
      type="button"
      onClick={handle}
      disabled={mastered}
      style={{
        width: '100%',
        minHeight: 50,
        background: mastered
          ? 'rgba(16,185,129,0.18)'
          : 'linear-gradient(135deg, #10b981, #059669)',
        color: mastered ? '#10b981' : '#fff',
        border: 'none',
        borderRadius: 12,
        fontWeight: 900,
        fontSize: 15,
        cursor: mastered ? 'default' : 'pointer',
      }}
    >
      {mastered
        ? '✅ Mastered!'
        : `✓ Mark as Mastered (+${xpValue ?? 10} XP)`}
    </button>
  )
}

// ─── Wrapper that picks the right fields from an AtlasEntry ────────────────

export function ConceptLayers({ entry }: { entry: AtlasEntry }) {
  return (
    <>
      <KeyTakeaways items={entry.keyTakeaways} />
      <DeepDive
        body={entry.deeperExplanation}
        diagramImage={entry.diagramImage}
        formulaLatex={entry.formulaLatex}
        codeSnippet={entry.codeSnippet}
        commonMistakes={entry.commonMistakes}
        proTip={entry.proTip}
      />
      <RealWorldStrip
        usedIn={entry.usedIn}
        realWorldProducts={entry.realWorldProducts}
        companies={entry.companies}
        indianCompanies={entry.indianCompanies}
      />
      <QuickChallenge
        slug={entry.slug}
        questionText={entry.quizQuestionText ?? entry.quizQuestion?.q}
        options={entry.quizOptions ?? entry.quizQuestion?.options}
        correct={
          typeof entry.quizCorrect === 'number'
            ? entry.quizCorrect
            : entry.quizQuestion?.answer
        }
        defaultExplanation={entry.quizQuestion?.explanation}
        xpValue={entry.xpValue}
      />
      {/* Share button under the master button */}
      <ShareButton entry={entry} />
    </>
  )
}

function ShareButton({ entry }: { entry: AtlasEntry }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: -10, marginBottom: 22 }}>
      <Link
        href="/atlas"
        style={{
          flex: 1,
          padding: '11px 16px',
          background: 'rgba(255,255,255,0.04)',
          color: '#c4b5fd',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          fontWeight: 700,
          textDecoration: 'none',
          textAlign: 'center',
        }}
      >
        ← Atlas home
      </Link>
      <button
        type="button"
        onClick={() => {
          const text = `I just learned about ${entry.title} on R2BOT! 🤖 r2bot.in/atlas`
          if (typeof window !== 'undefined') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }
        }}
        style={{
          padding: '11px 16px',
          background: '#25d366',
          color: '#0a0a16',
          border: 'none',
          borderRadius: 12,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        📤 Share on WhatsApp
      </button>
    </div>
  )
}
