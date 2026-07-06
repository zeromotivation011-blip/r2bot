// app/world-map/page.tsx
import type { Metadata } from 'next';
import WorldMapDynamic from './WorldMapDynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';
const PAGE_URL = `${BASE_URL}/world-map`;

export const metadata: Metadata = {
  title: 'World Robotics Map 2024 | Robot Density by Country — R2BOT',
  description:
    "Interactive world robotics map with IFR 2023 data. Compare robot density across 50 countries. India vs South Korea: a 253× gap. Explore the global automation race, GDP vs automation scatter, and India's opportunity calculator.",
  keywords: [
    'world robotics map',
    'robot density by country 2024',
    'IFR robotics data',
    'industrial robots per country',
    'India robotics growth',
    'robotics in India',
    'global automation map',
    'robots per 10000 workers',
    'India robotics hubs',
    'IFR World Robotics report',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'World Robotics Map 2024 — R2BOT',
    description:
      "50 countries · IFR 2023 data · India's 4 vs South Korea's 1,012. The world's most feature-rich interactive robotics map.",
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'World Robotics Map — R2BOT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'World Robotics Map 2024 — R2BOT',
    description:
      "Interactive map of robot density across 50 countries (IFR 2023). India's +59% growth vs South Korea's 1,012 density.",
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

const datasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'World Robot Density by Country 2023',
  alternateName: 'IFR World Robotics Density Map v2',
  description:
    'Industrial robot density per 10,000 manufacturing workers for 50 countries, plus year-on-year growth, total installs, investment estimates, and GDP context. Includes India city-level robotics hubs and global milestones from 1961 onward.',
  url: PAGE_URL,
  keywords: [
    'robot density',
    'world robotics map',
    'automation by country',
    'IFR 2023',
    'industrial robots',
    'India robotics',
  ],
  isAccessibleForFree: true,
  license: 'https://creativecommons.org/licenses/by/4.0/',
  inLanguage: 'en',
  spatialCoverage: 'World',
  temporalCoverage: '2016/2023',
  creator: { '@type': 'Organization', name: 'R2BOT', url: BASE_URL },
  sourceOrganization: [
    {
      '@type': 'Organization',
      name: 'International Federation of Robotics (IFR)',
      url: 'https://ifr.org/',
    },
  ],
  citation:
    'International Federation of Robotics (IFR), World Robotics 2024 Report — https://ifr.org/worldrobotics/',
  variableMeasured: [
    'Robot density (robots per 10,000 manufacturing workers)',
    'Year-on-year density growth rate (%)',
    'Total industrial robot installations',
    'Robotics investment (USD billion)',
    'GDP per capita context',
    'India city-level robotics hubs',
    'Global robotics milestones (1961–present)',
  ],
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'text/csv',
      contentUrl: `${BASE_URL}/api/robotics-data?format=csv`,
    },
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${BASE_URL}/api/robotics-data`,
    },
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Which country has the most robots per worker?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'South Korea leads with 1,012 robots per 10,000 workers (IFR 2023), followed by Singapore (770), China (470), Germany (429) and Japan (419).',
      },
    },
    {
      '@type': 'Question',
      name: "What is India's robot density?",
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'India has 4 robots per 10,000 workers as of IFR 2023 — but is growing at +59% per year, the fastest rate among major economies.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the global average robot density?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'The global average is 162 robots per 10,000 workers as of 2023 — roughly double the level of 2015.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which country has the fastest-growing robotics?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Among major economies, India leads at +59% year-on-year density growth in 2023. Among medium economies, UAE (+22%) and Vietnam (+20%) are the fastest. China remains the fastest in absolute installs (276,288 units in 2023).',
      },
    },
    {
      '@type': 'Question',
      name: 'What is robot density?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Robot density is the number of operational industrial robots per 10,000 employees in the manufacturing industry, as defined by the International Federation of Robotics (IFR).',
      },
    },
  ],
};

export default function WorldMapPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <WorldMapDynamic />
    </>
  );
}
