// lib/kids/ai/spark/lang.ts
// Text folding and a tiny language guess for Ask Spark's safety checks.
// Pure, light, safe on server and client (the offline notebook uses it).
//
// Children write in English, Hindi (Devanagari or romanised "Hinglish") and
// Spanish, with or without accents. Every safety pattern in ./safety.ts and
// ./patterns-i18n.ts is written against the FOLDED form produced here:
// lowercase, Latin accents removed (ñ → n), Devanagari nukta removed and
// chandrabindu written as anusvara, curly quotes straightened, ¿¡ dropped.

export type SparkLang = 'en' | 'hi' | 'es'

const DEVANAGARI = /[ऀ-ॿ]/
const HINGLISH =
  /\b(mujhe|muje|mujhse|mera|meri|mere|main|mai|hai|hain|hu|hoon|kya|nahi|nahin|kaise|kaisa|tum|aap|karo|karu|kar do|karte|karti|kuch|batao|bata|dikhao|chahta|chahti|lagta|ghar|bhai|papa|mummy)\b/g
const SPANISH_MARK = /[¿¡ñáéíóú]/
const SPANISH =
  /\b(que|como|los|las|mi|mis|tengo|quiero|una|estoy|soy|del|por|para|el|es|eres|tu|donde|dame|hazme|haz|cual|pega|pegan|nadie|nos|van|son|se|muy|ayuda|puedo|esta|hace)\b/g

/** Lowercase, accent-free, Devanagari-normalised text with single spaces. */
export function foldText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/़/g, '')
    .replace(/ँ/g, 'ं')
    .normalize('NFC')
    .replace(/[¿¡]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A best guess at the language of a child's message. English when unsure. */
export function guessLang(text: string): SparkLang {
  if (DEVANAGARI.test(text)) return 'hi'
  const lower = text.toLowerCase()
  const es = (lower.match(SPANISH) ?? []).length
  if (SPANISH_MARK.test(lower) && es >= 1) return 'es'
  const hi = (lower.match(HINGLISH) ?? []).length
  if (hi >= 2 || (hi >= 1 && es === 0 && /\b(mujhe|mera|meri|hai|hain|nahi|kaise|kya)\b/.test(lower))) return 'hi'
  if (es >= 2) return 'es'
  return 'en'
}
