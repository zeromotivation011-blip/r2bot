// app/api/robotics-data/route.ts
// Returns the 50-country IFR 2023 dataset as JSON (default) or CSV.
import { NextRequest } from 'next/server'
import { COUNTRIES, opportunityScore } from '@/lib/robotics-map-data'

export const dynamic = 'force-static'
export const revalidate = 86400 // 1 day

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') || 'json').toLowerCase()

  if (format === 'csv') {
    const headers = [
      'iso3', 'name', 'region', 'world_rank',
      'density_2023', 'growth_rate_pct',
      'total_installed_2023', 'investment_billion_usd',
      'gdp_per_capita_usd', 'manufacturing_gdp_pct',
      'pct_industrial', 'pct_service', 'pct_collaborative',
      'opportunity_score',
      'top_sectors',
    ]
    const rows = COUNTRIES.map(c => [
      c.iso3,
      `"${c.name.replace(/"/g, '""')}"`,
      c.region,
      c.worldRank,
      c.density,
      c.densityGrowthRate,
      c.totalInstalled2023,
      c.investmentBillionUSD,
      c.gdpPerCapitaUSD,
      c.manufacturingGDPPercent,
      c.robotTypes.industrial,
      c.robotTypes.service,
      c.robotTypes.collaborative,
      opportunityScore(c),
      `"${c.topSectors.join('; ')}"`,
    ].join(','))

    const body = [headers.join(','), ...rows].join('\n')
    return new Response(body, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="r2bot-world-robotics-2023.csv"',
        'cache-control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  }

  const payload = {
    source: 'International Federation of Robotics (IFR), World Robotics 2024 Report',
    lastUpdated: '2023',
    countryCount: COUNTRIES.length,
    countries: COUNTRIES.map(c => ({
      iso3: c.iso3,
      name: c.name,
      region: c.region,
      worldRank: c.worldRank,
      density: c.density,
      densityGrowthRate: c.densityGrowthRate,
      totalInstalled2023: c.totalInstalled2023,
      investmentBillionUSD: c.investmentBillionUSD,
      gdpPerCapitaUSD: c.gdpPerCapitaUSD,
      manufacturingGDPPercent: c.manufacturingGDPPercent,
      robotTypes: c.robotTypes,
      opportunityScore: opportunityScore(c),
      topSectors: c.topSectors,
    })),
  }

  return Response.json(payload, {
    headers: {
      'cache-control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
