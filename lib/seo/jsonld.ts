// lib/seo/jsonld.ts
// Reusable schema.org JSON-LD builders.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app';

export function organizationJsonLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'R2BOT',
    alternateName: 'R2BOT — ROBOT, decoded',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description: "India's most accessible robotics learning platform.",
    foundingDate: '2024',
    areaServed: { '@type': 'Country', name: 'India' },
    educationalCredentialAwarded: 'Robotics Certificates',
    sameAs: [] as string[],
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
    inLanguage: 'en-IN',
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
