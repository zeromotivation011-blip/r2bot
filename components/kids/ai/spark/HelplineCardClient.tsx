'use client'

// components/kids/ai/spark/HelplineCardClient.tsx
// The "people who can help" card Spark shows after a child tells it something
// serious. Region-aware from the device's time zone and language (no network,
// no location permission), works offline, and is NEVER behind the parental
// gate or the Ask Spark switch: a child must be able to tap a number straight
// away. The helpline directory link leaves R2BOT on purpose, ungated.

import { useEffect, useState } from 'react'
import { deviceHelplineRegion, HELPLINE_DIRECTORY_LABEL, HELPLINE_DIRECTORY_URL, HELPLINES, type HelplineRegion } from '@/lib/kids/ai/spark/helplines'

type Lang = 'en' | 'hi' | 'es'

const T: Record<Lang, { title: string; trusted: string; call: string; emergency: string; danger: string; other: string; intl: string }> = {
  en: {
    title: 'People who can help',
    trusted: 'Tell a grown-up you trust: a parent, a teacher or another adult you feel safe with.',
    call: 'Call',
    emergency: 'Emergency',
    danger: 'In danger right now? Call',
    other: 'Another country? Find a free helpline for kids at',
    intl: 'Find a free helpline for kids in your country at',
  },
  hi: {
    title: 'ये लोग मदद कर सकते हैं',
    trusted: 'किसी भरोसेमंद बड़े को बताओ: माता-पिता, टीचर या कोई और जिसके साथ तुम सुरक्षित महसूस करते हो।',
    call: 'कॉल करो',
    emergency: 'इमरजेंसी',
    danger: 'अभी खतरे में हो? कॉल करो',
    other: 'दूसरे देश में हो? बच्चों की मुफ़्त हेल्पलाइन यहाँ ढूँढो:',
    intl: 'अपने देश की बच्चों की मुफ़्त हेल्पलाइन यहाँ ढूँढो:',
  },
  es: {
    title: 'Personas que pueden ayudarte',
    trusted: 'Cuéntaselo a una persona adulta de confianza: tu familia, un profesor o alguien con quien te sientas a salvo.',
    call: 'Llamar',
    emergency: 'Emergencias',
    danger: '¿Estás en peligro ahora? Llama al',
    other: '¿Otro país? Busca una línea de ayuda gratis para niños en',
    intl: 'Busca una línea de ayuda gratis para niños de tu país en',
  },
}

export interface HelplineCardProps {
  lang?: Lang
  /** Override the detected region (tests and the grown-up preview). */
  region?: HelplineRegion
}

export default function HelplineCardClient({ lang = 'en', region }: HelplineCardProps) {
  // INTL until mounted so server and first client render agree; the device
  // region is known one frame later and needs no network.
  const [detected, setDetected] = useState<HelplineRegion>(region ?? 'INTL')
  useEffect(() => {
    if (!region) setDetected(deviceHelplineRegion())
  }, [region])

  const set = HELPLINES[detected]
  const t = T[lang]

  return (
    <section
      aria-label={t.title}
      className="rounded-[20px] border-2 border-cyan-300/50 bg-[#111C32] p-4 shadow-[0_8px_24px_rgba(0,0,0,.35)]"
    >
      <h3 className="font-display text-lg font-extrabold text-[#EEF2F8]">
        <span aria-hidden="true">💛 </span>
        {t.title}
      </h3>
      <p className="mt-1 text-[16px] leading-relaxed text-[#C9D1DE]">{t.trusted}</p>

      {set.lines.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {set.lines.map((l) => (
            <li key={l.tel}>
              <a
                data-kids-safety
                href={`tel:${l.tel}`}
                className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-amber-500 px-4 py-2 text-[#1A1103] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 active:scale-[.98]"
              >
                <PhoneIcon />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold leading-tight">{l.name}</span>
                  <span className="block font-display text-xl font-extrabold leading-tight tabular-nums">
                    <span className="sr-only">{t.call} </span>
                    {l.number}
                  </span>
                  <span className="block text-[13px] font-semibold leading-tight opacity-80">{l.note}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {set.emergency && (
        <a
          data-kids-safety
          href={`tel:${set.emergency.tel}`}
          className="mt-2 flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-white/[0.16] bg-white/[0.04] px-4 text-[15px] font-bold text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.98]"
        >
          <span>{t.danger}</span>
          <span className="font-display text-lg font-extrabold tabular-nums text-amber-300">{set.emergency.number}</span>
        </a>
      )}

      <p className="mt-3 text-[14px] leading-snug text-[#A7B0C0]">
        {set.lines.length ? t.other : t.intl}{' '}
        <a
          data-kids-safety
          href={HELPLINE_DIRECTORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center font-bold text-cyan-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
        >
          {HELPLINE_DIRECTORY_LABEL}
        </a>
        {!set.lines.length && (
          <span className="block">{lang === 'hi' ? 'खतरे में हो तो अपने देश के इमरजेंसी नंबर पर कॉल करो।' : lang === 'es' ? 'Si estás en peligro, llama al número de emergencias de tu país.' : 'If you are in danger, call your country’s emergency number.'}</span>
        )}
      </p>
    </section>
  )
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z"
        fill="currentColor"
      />
    </svg>
  )
}
