// lib/seo/jsonld.ts
// Reusable schema.org JSON-LD builders.

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export function organizationJsonLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'R2BOT',
    alternateName: 'R2BOT — ROBOT, decoded',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description:
      'From zero to robotics engineer — with an AI mentor, real simulators and hands-on projects. The clearest robotics knowledge on the internet.',
    foundingDate: '2024',
    // Worldwide, not a single country. Declaring areaServed: India told Google
    // this was a regional site and worked directly against ranking anywhere
    // else — India remains a key market, but it is not the identity.
    areaServed: 'Worldwide',
    educationalCredentialAwarded: 'Robotics Certificates',
    // Only accounts we have verified. A wrong URL here tells Google to
    // associate someone else's account with this brand, which is worse than
    // listing nothing. Add YouTube back once the correct handle is confirmed.
    sameAs: ['https://www.instagram.com/r2bot.in'] as string[],
  };
}

export function courseJsonLD(name: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'R2BOT',
      sameAs: BASE_URL,
    },
    // 'en' not 'en-IN' — the content is written for a global English audience.
    inLanguage: 'en',
    isAccessibleForFree: true,
  };
}

export function articleJsonLD(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'R2BOT', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'R2BOT',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon.svg` },
    },
    image: `${BASE_URL}/og-default.svg`,
  };
}

export function faqJsonLD(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** Helper to render any JSON-LD object as a <script> string. */
export function jsonldScript(data: unknown): string {
  return JSON.stringify(data);
}
