// lib/kids/ai/spark/helplines.ts
// Helplines for the Ask Spark crisis card. Pure data + region guess, bundled
// with the Spark sheet so the card works OFFLINE and is never behind a
// parental gate or the Ask Spark switch.
//
// Only numbers we are certain of are listed (checked 27 Nov 2026). Every
// region also shows Child Helpline International's directory, which lists a
// free children's helpline for most countries. Add a country only with a
// number confirmed on the helpline's own site, in the same change.

export type HelplineRegion = 'IN' | 'GB' | 'US' | 'CA' | 'AU' | 'IE' | 'ES' | 'EU' | 'INTL'

export interface Helpline {
  name: string
  /** As written locally, e.g. "0800 1111". */
  number: string
  /** For tel: links, digits and + only. */
  tel: string
  /** One short line: who it is for / how to reach it. */
  note: string
}

export interface HelplineSet {
  region: HelplineRegion
  /** "India", "United Kingdom" … or null for the international default. */
  label: string | null
  lines: Helpline[]
  /** The emergency number, or null when we cannot know it. */
  emergency: { number: string; tel: string } | null
}

export const HELPLINE_DIRECTORY_URL = 'https://childhelplineinternational.org/'
export const HELPLINE_DIRECTORY_LABEL = 'childhelplineinternational.org'

export const HELPLINES: Record<HelplineRegion, HelplineSet> = {
  IN: {
    region: 'IN',
    label: 'India',
    lines: [{ name: 'CHILDLINE', number: '1098', tel: '1098', note: 'Free, day and night, for children' }],
    emergency: { number: '112', tel: '112' },
  },
  GB: {
    region: 'GB',
    label: 'United Kingdom',
    lines: [{ name: 'Childline', number: '0800 1111', tel: '08001111', note: 'Free, day and night, for under-19s' }],
    emergency: { number: '999', tel: '999' },
  },
  US: {
    region: 'US',
    label: 'United States',
    lines: [
      { name: '988 Suicide & Crisis Lifeline', number: '988', tel: '988', note: 'Call or text, day and night' },
      { name: 'Childhelp National Child Abuse Hotline', number: '1-800-422-4453', tel: '18004224453', note: 'Free, day and night' },
    ],
    emergency: { number: '911', tel: '911' },
  },
  CA: {
    region: 'CA',
    label: 'Canada',
    lines: [{ name: 'Kids Help Phone', number: '1-800-668-6868', tel: '18006686868', note: 'Free, day and night. Or text 686868' }],
    emergency: { number: '911', tel: '911' },
  },
  AU: {
    region: 'AU',
    label: 'Australia',
    lines: [{ name: 'Kids Helpline', number: '1800 55 1800', tel: '1800551800', note: 'Free, day and night, ages 5 to 25' }],
    emergency: { number: '000', tel: '000' },
  },
  IE: {
    region: 'IE',
    label: 'Ireland',
    lines: [{ name: 'Childline (ISPCC)', number: '1800 66 66 66', tel: '1800666666', note: 'Free, day and night' }],
    emergency: { number: '112', tel: '112' },
  },
  ES: {
    region: 'ES',
    label: 'España',
    lines: [
      { name: 'Fundación ANAR', number: '900 20 20 10', tel: '900202010', note: 'Gratis, día y noche, para niños y adolescentes' },
      { name: 'Línea de ayuda a la infancia', number: '116 111', tel: '116111', note: 'Gratis' },
    ],
    emergency: { number: '112', tel: '112' },
  },
  EU: {
    region: 'EU',
    label: 'Europe',
    lines: [{ name: 'Child helpline', number: '116 111', tel: '116111', note: 'The free children’s helpline number in many European countries' }],
    emergency: { number: '112', tel: '112' },
  },
  INTL: { region: 'INTL', label: null, lines: [], emergency: null },
}

// Time zones are the better signal (a phone set to en-US is common everywhere).
const TZ_EXACT: Record<string, HelplineRegion> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Africa/Ceuta': 'ES',
  'Pacific/Honolulu': 'US',
}
const US_TZ = /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Adak|Nome|Sitka|Yakutat|Metlakatla|Menominee|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)$|^US\//
const CA_TZ =
  /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Swift_Current|Dawson_Creek|Fort_Nelson|Cambridge_Bay|Rankin_Inlet|Resolute|Inuvik|Atikokan|Creston|Dawson|Thunder_Bay|Nipigon|Rainy_River|Pangnirtung)$|^Canada\//
const EU_TZ =
  /^Europe\/(Amsterdam|Berlin|Brussels|Paris|Rome|Vienna|Warsaw|Prague|Lisbon|Stockholm|Copenhagen|Helsinki|Athens|Budapest|Bucharest|Sofia|Zagreb|Ljubljana|Bratislava|Vilnius|Riga|Tallinn|Luxembourg|Malta|Busingen)$|^Atlantic\/(Madeira|Azores)$|^Asia\/Nicosia$/

export function regionFromTimeZone(tz: string | undefined | null): HelplineRegion | null {
  if (!tz) return null
  if (TZ_EXACT[tz]) return TZ_EXACT[tz]
  if (US_TZ.test(tz)) return 'US'
  if (CA_TZ.test(tz)) return 'CA'
  if (/^Australia\//.test(tz)) return 'AU'
  if (EU_TZ.test(tz)) return 'EU'
  return null
}

const LANG_REGION: Record<string, HelplineRegion> = { IN: 'IN', GB: 'GB', UK: 'GB', US: 'US', CA: 'CA', AU: 'AU', IE: 'IE', ES: 'ES' }

export function regionFromLanguage(tag: string | undefined | null): HelplineRegion | null {
  if (!tag) return null
  const parts = tag.replace('_', '-').split('-')
  const lang = parts[0].toLowerCase()
  const country = parts.find((p, i) => i > 0 && /^[A-Za-z]{2}$/.test(p))?.toUpperCase()
  if (country && LANG_REGION[country]) return LANG_REGION[country]
  if (lang === 'hi') return 'IN'
  return null
}

/**
 * The device's region: its time zone when we know it (a known zone that is
 * not in our list gives the international card, NOT a guess from language),
 * otherwise the browser language's country.
 */
export function detectHelplineRegion(input: { timeZone?: string | null; languages?: readonly string[] }): HelplineRegion {
  const tz = input.timeZone
  if (tz && tz !== 'UTC' && tz !== 'Etc/UTC') return regionFromTimeZone(tz) ?? 'INTL'
  for (const l of input.languages ?? []) {
    const r = regionFromLanguage(l)
    if (r) return r
  }
  return 'INTL'
}

/** Browser-only convenience. */
export function deviceHelplineRegion(): HelplineRegion {
  if (typeof window === 'undefined') return 'INTL'
  let timeZone: string | undefined
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    timeZone = undefined
  }
  const languages = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []
  return detectHelplineRegion({ timeZone, languages })
}
