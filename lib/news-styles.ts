// lib/news-styles.ts — shared map of source-name → brand colour + short label.
// Kept in lib/ so it can be imported by the client (route files in Next 15
// can only export GET/POST/dynamic/runtime/etc).

export const SOURCE_STYLES: Record<string, { color: string; short: string }> = {
  'IEEE Spectrum':    { color: '#0066CC', short: 'IEEE' },
  'The Robot Report': { color: '#FF6B35', short: 'TRR' },
  'Wired':            { color: '#000000', short: 'WIRE' },
  'TechCrunch':       { color: '#0E9B26', short: 'TC' },
  'Robohub':          { color: '#2ECC71', short: 'RH' },
  'MIT News':         { color: '#A31F34', short: 'MIT' },
  'Analytics India':  { color: '#6C3483', short: 'AIM' },
  'Analytics Vidhya': { color: '#1F77B4', short: 'AV' },
}
