'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'
import { scaleLog, scaleLinear } from 'd3-scale'
import {
  COUNTRIES,
  INDIA_HUBS,
  INDIA_INITIATIVES,
  TIMELINE_EVENTS,
  RACE_DATA,
  RACE_YEARS,
  RACE_COUNTRIES,
  NUMERIC_TO_ALPHA3,
  GLOBAL_AVERAGE_DENSITY,
  GLOBAL_TOTAL_OPERATIONAL_ROBOTS,
  LAYER_META,
  getLayerColor,
  getDensityColor,
  getDensityLabel,
  opportunityScore,
  type CountryData,
  type DataLayer,
} from '@/lib/robotics-map-data'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

type ViewTab = 'map' | 'compare' | 'explorer' | 'race' | 'india'

const VIEW_TABS: { id: ViewTab; label: string; icon: string }[] = [
  { id: 'map',      label: 'Map',              icon: '🌍' },
  { id: 'compare',  label: 'Compare',          icon: '⚖️' },
  { id: 'explorer', label: 'Data Explorer',    icon: '📊' },
  { id: 'race',     label: 'Growth Race',      icon: '📈' },
  { id: 'india',    label: 'India Deep Dive',  icon: '🇮🇳' },
]

const LAYER_OPTIONS: { id: DataLayer; label: string }[] = [
  { id: 'density',     label: 'Density' },
  { id: 'growth',      label: 'Growth %' },
  { id: 'investment',  label: 'Investment $B' },
  { id: 'gdpVsAuto',   label: 'GDP vs Auto' },
  { id: 'opportunity', label: 'Opportunity' },
]

const REGION_COLORS: Record<string, string> = {
  Asia: '#f59e0b',
  Europe: '#3b82f6',
  Americas: '#10b981',
  Oceania: '#06b6d4',
  Africa: '#ec4899',
  'Middle East': '#a855f7',
}

const TICKER_ITEMS = [
  '🌍 Global avg: 162 robots / 10K workers',
  '📈 China grew +17% in 2023 — fastest major economy in stock',
  '🏆 South Korea: #1 for 10 consecutive years (1,012)',
  '🇮🇳 India 2023: 8,510 new robots installed (+59%)',
  '🤖 4.28M industrial robots operating worldwide',
  '💡 Global density doubled in just 7 years',
  '🚀 India 4 · Korea 1,012 · Gap 253×',
]

// ────────────────────────────────────────────────────────────────────────────
export default function WorldMapClient() {
  const [tab, setTab] = useState<ViewTab>('map')
  const [layer, setLayer] = useState<DataLayer>('density')
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; country: CountryData } | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<CountryData | null>(null)
  const [compareB, setCompareB] = useState<CountryData | null>(null)
  const [showShareToast, setShowShareToast] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Read URL hash for ?compare=IND,KOR
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const cmp = url.searchParams.get('compare')
    if (cmp) {
      const [a, b] = cmp.split(',')
      const ca = COUNTRIES.find(c => c.id === a)
      const cb = COUNTRIES.find(c => c.id === b)
      if (ca && cb) {
        setCompareA(ca); setCompareB(cb); setCompareMode(true); setTab('compare')
      }
    }
  }, [])

  const handleCountrySelect = useCallback((c: CountryData) => {
    if (compareMode) {
      if (!compareA) setCompareA(c)
      else if (!compareB && c.id !== compareA.id) setCompareB(c)
      else { setCompareA(c); setCompareB(null) }
    } else {
      setSelectedCountry(c)
    }
  }, [compareMode, compareA, compareB])

  const handleGeoClick = useCallback((geoId: string) => {
    const alpha3 = NUMERIC_TO_ALPHA3[geoId]
    if (!alpha3) return
    const c = COUNTRIES.find(x => x.id === alpha3)
    if (!c) return
    handleCountrySelect(c)
  }, [handleCountrySelect])

  const indiaData = COUNTRIES.find(c => c.id === 'IND')!
  const koreaData = COUNTRIES.find(c => c.id === 'KOR')!

  const share = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 1800)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 md:pb-10">
      {/* ── Live Ticker ────────────────────────────────────────────────────── */}
      <LiveTicker />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">🌍 World Robotics Map <span className="text-amber-400 text-sm font-normal">v2</span></h1>
            <p className="text-xs md:text-sm text-gray-400 mt-0.5">50 countries · IFR 2023 · 5 data layers</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCompareMode(m => !m)
                if (!compareMode) { setTab('map'); setCompareA(null); setCompareB(null) }
              }}
              className={`text-xs md:text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                compareMode
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              {compareMode ? '✓ Comparing' : '⚖️ Compare'}
            </button>
            <a
              href="/api/robotics-data?format=csv"
              className="text-xs md:text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
            >
              ⬇ CSV
            </a>
            <button
              onClick={() => setShowEmbed(true)}
              className="hidden md:block text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
            >
              &lt;/&gt; Embed
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop Tab Bar ────────────────────────────────────────────────── */}
      <div className="hidden md:block sticky top-[81px] z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {VIEW_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'map' && (
          <MapTab
            layer={layer}
            setLayer={setLayer}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            tooltip={tooltip}
            setTooltip={setTooltip}
            selected={selectedCountry}
            compareMode={compareMode}
            compareA={compareA}
            compareB={compareB}
            onGeoClick={handleGeoClick}
            onSelect={handleCountrySelect}
            onShare={share}
            india={indiaData}
            korea={koreaData}
            isMobile={isMobile}
          />
        )}

        {tab === 'compare' && (
          <CompareTab
            a={compareA}
            b={compareB}
            setA={setCompareA}
            setB={setCompareB}
            onShare={share}
          />
        )}

        {tab === 'explorer' && (
          <ExplorerTab
            onSelect={c => { setSelectedCountry(c); setTab('map') }}
            isMobile={isMobile}
          />
        )}

        {tab === 'race' && <RaceTab />}

        {tab === 'india' && <IndiaTab india={indiaData} korea={koreaData} />}
      </div>

      {/* ── Compare drawer ─────────────────────────────────────────────────── */}
      {compareMode && (compareA || compareB) && tab === 'map' && (
        <CompareDrawer
          a={compareA}
          b={compareB}
          onClose={() => { setCompareA(null); setCompareB(null); setCompareMode(false) }}
          onShare={share}
        />
      )}

      {/* ── Mobile bottom-sheet for selected country ───────────────────────── */}
      {isMobile && selectedCountry && tab === 'map' && (
        <MobileBottomSheet country={selectedCountry} onClose={() => setSelectedCountry(null)} onShare={share} />
      )}

      {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 flex">
        {VIEW_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium ${
              tab === t.id ? 'text-amber-400' : 'text-gray-400'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Embed modal ────────────────────────────────────────────────────── */}
      {showEmbed && <EmbedModal onClose={() => setShowEmbed(false)} onShare={share} />}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {showShareToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black text-sm font-semibold px-4 py-2 rounded-full shadow-xl">
          Copied to clipboard ✓
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE TICKER
// ════════════════════════════════════════════════════════════════════════════
function LiveTicker() {
  return (
    <div className="bg-gray-900 border-b border-amber-500/20 overflow-hidden h-9 flex items-center group">
      <style>{`@keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
.ticker-track { animation: ticker 45s linear infinite }
.ticker-track:hover, .ticker-wrap:hover .ticker-track { animation-play-state: paused }`}</style>
      <div className="ticker-wrap relative w-full">
        <div className="ticker-track inline-flex whitespace-nowrap text-xs md:text-sm text-amber-300">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="px-6 py-2 border-r border-gray-800/40">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAP TAB
// ════════════════════════════════════════════════════════════════════════════
function MapTab(props: {
  layer: DataLayer
  setLayer: (l: DataLayer) => void
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  tooltip: { x: number; y: number; country: CountryData } | null
  setTooltip: (t: { x: number; y: number; country: CountryData } | null) => void
  selected: CountryData | null
  compareMode: boolean
  compareA: CountryData | null
  compareB: CountryData | null
  onGeoClick: (geoId: string) => void
  onSelect: (c: CountryData) => void
  onShare: (text: string) => void
  india: CountryData
  korea: CountryData
  isMobile: boolean
}) {
  const { layer, setLayer, hoveredId, setHoveredId, tooltip, setTooltip,
    selected, compareMode, compareA, compareB, onGeoClick, onSelect, onShare,
    india, korea, isMobile } = props

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        {/* Layer selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {LAYER_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setLayer(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all border ${
                layer === opt.id
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-3">{LAYER_META[layer].legend}</p>

        {/* Compare hint */}
        {compareMode && (
          <div className="mb-3 text-xs text-pink-300 bg-pink-500/10 border border-pink-500/30 rounded-lg px-3 py-2">
            {!compareA ? 'Click any country to set Country A (blue).'
              : !compareB ? `${compareA.flagEmoji} ${compareA.name} = A · click another to set Country B (pink).`
              : `Comparing ${compareA.name} vs ${compareB.name}.`}
          </div>
        )}

        {/* Map — desktop only */}
        {!isMobile && (
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 140, center: [20, 20] }}
              style={{ width: '100%', height: 'auto' }}
            >
              <ZoomableGroup>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map(geo => {
                      const alpha3 = NUMERIC_TO_ALPHA3[geo.id]
                      const data = COUNTRIES.find(c => c.id === alpha3)
                      const isHovered = alpha3 === hoveredId
                      const isSelected = alpha3 === selected?.id
                      const isA = alpha3 === compareA?.id
                      const isB = alpha3 === compareB?.id
                      let fill = getLayerColor(data, layer)
                      if (isA) fill = '#3b82f6'
                      else if (isB) fill = '#ec4899'
                      else if (isSelected) fill = '#f59e0b'

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => onGeoClick(geo.id)}
                          onMouseEnter={(evt) => {
                            setHoveredId(alpha3 || null)
                            if (data) {
                              const e = evt as unknown as React.MouseEvent
                              setTooltip({ x: e.clientX, y: e.clientY, country: data })
                            }
                          }}
                          onMouseMove={(evt) => {
                            if (data) {
                              const e = evt as unknown as React.MouseEvent
                              setTooltip({ x: e.clientX, y: e.clientY, country: data })
                            }
                          }}
                          onMouseLeave={() => { setHoveredId(null); setTooltip(null) }}
                          style={{
                            default: {
                              fill,
                              stroke: '#374151',
                              strokeWidth: isSelected || isA || isB ? 1.5 : 0.4,
                              outline: 'none',
                              transition: 'all 0.2s',
                              cursor: data ? 'pointer' : 'default',
                            },
                            hover: {
                              fill: data ? '#f59e0b' : fill,
                              stroke: '#fcd34d',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: data ? 'pointer' : 'default',
                              opacity: isHovered ? 0.95 : 1,
                            },
                            pressed: { outline: 'none', fill: '#f59e0b' },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>

                {/* India hubs always visible */}
                {INDIA_HUBS.map(hub => (
                  <Marker key={hub.name} coordinates={[hub.lng, hub.lat]}>
                    <circle r={hub.intensity * 1.8} fill="#fbbf24" fillOpacity={0.35} className="animate-pulse" />
                    <circle r={2} fill="#fbbf24" />
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>

            {/* Floating tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none fixed z-50 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl"
                style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}
              >
                <p className="font-semibold text-white">{tooltip.country.flagEmoji} {tooltip.country.name}</p>
                <p className="text-amber-400 text-xs">
                  Density: {tooltip.country.density.toLocaleString()} · Growth: {tooltip.country.densityGrowthRate > 0 ? '+' : ''}{tooltip.country.densityGrowthRate}%
                </p>
                <p className="text-gray-400 text-xs">Rank #{tooltip.country.worldRank}</p>
              </div>
            )}

            {/* Legend (bottom-left) */}
            <div className="absolute bottom-3 left-3 bg-gray-900/85 border border-gray-700 rounded-xl p-3 text-[10px]">
              <p className="text-gray-300 font-semibold mb-1">{LAYER_META[layer].label}</p>
              <div className="flex gap-1">
                {LAYER_META[layer].stops.map(s => (
                  <div key={s.v} className="text-center">
                    <div className="w-4 h-3" style={{ backgroundColor: s.c }} />
                    <p className="text-gray-400 mt-0.5">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile-only ranked table */}
        {isMobile && <RankedTable layer={layer} onSelect={onSelect} />}
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        {selected ? (
          <CountryPanel country={selected} onClose={() => onSelect(selected)} onShare={onShare} india={india} />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-3">🖱️</div>
            <p className="text-gray-300 text-sm font-medium">Click any country</p>
            <p className="text-gray-500 text-xs mt-1">50 countries with detailed IFR 2023 data</p>
          </div>
        )}

        <IndiaSpotlight india={india} korea={korea} />

        <DensityLeaderboard onSelect={onSelect} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// RANKED TABLE (mobile fallback for map)
// ════════════════════════════════════════════════════════════════════════════
function RankedTable({ layer, onSelect }: { layer: DataLayer; onSelect: (c: CountryData) => void }) {
  const [sortBy, setSortBy] = useState<'density' | 'growth'>('density')
  const sorted = useMemo(() => {
    return [...COUNTRIES].sort((a, b) =>
      sortBy === 'density' ? b.density - a.density : b.densityGrowthRate - a.densityGrowthRate
    )
  }, [sortBy])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setSortBy('density')}
          className={`flex-1 py-2 text-xs font-medium ${sortBy === 'density' ? 'bg-amber-500 text-black' : 'text-gray-400'}`}
        >Sort: Density</button>
        <button
          onClick={() => setSortBy('growth')}
          className={`flex-1 py-2 text-xs font-medium ${sortBy === 'growth' ? 'bg-amber-500 text-black' : 'text-gray-400'}`}
        >Sort: Growth</button>
      </div>
      <ul>
        {sorted.map((c, i) => (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60 active:bg-gray-800 text-left"
            >
              <span className="text-gray-500 text-xs w-6">#{i + 1}</span>
              <span>{c.flagEmoji}</span>
              <span className="text-sm text-gray-200 truncate flex-1">{c.name}</span>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ backgroundColor: getLayerColor(c, layer) + '40', color: '#fcd34d' }}
              >{c.density}</span>
              <span className={`text-xs font-mono ${c.densityGrowthRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {c.densityGrowthRate > 0 ? '↑' : '↓'}{Math.abs(c.densityGrowthRate)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COUNTRY PANEL
// ════════════════════════════════════════════════════════════════════════════
function CountryPanel({ country, onClose, onShare, india }: {
  country: CountryData
  onClose: () => void
  onShare: (s: string) => void
  india: CountryData
}) {
  const gapVsIndia = india.density > 0 ? Math.round(country.density / india.density) : 0
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-3xl">{country.flagEmoji}</span>
          <h3 className="text-lg font-bold text-white mt-1">{country.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-amber-400 font-medium">{getDensityLabel(country.density)}</span>
            <span className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700">#{country.worldRank}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Density" value={country.density.toLocaleString()} sub="per 10K workers" />
        <Stat label="Growth" value={`${country.densityGrowthRate > 0 ? '+' : ''}${country.densityGrowthRate}%`} sub="YoY 2022→23"
              positive={country.densityGrowthRate > 0} />
        <Stat label="2023 Installs" value={country.totalInstalled2023.toLocaleString()} sub="new units" />
        <Stat label="Investment" value={`$${country.investmentBillionUSD}B`} sub="annual" />
        <Stat label="GDP/cap" value={`$${(country.gdpPerCapitaUSD / 1000).toFixed(0)}K`} sub="USD" />
        <Stat label="Mfg % GDP" value={`${country.manufacturingGDPPercent}%`} sub="of economy" />
      </div>

      {/* Sparkline (fake trend last 5y derived from RACE_DATA if available) */}
      <Sparkline country={country} />

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs text-amber-300/90 leading-relaxed">💡 {country.funFact}</p>
      </div>

      {country.id !== 'IND' && (
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">vs India</p>
          <p className="text-2xl font-bold text-amber-400">
            {gapVsIndia > 0 ? `${gapVsIndia}× more` : '—'}
          </p>
          <p className="text-xs text-gray-500">robots per worker</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top Sectors</p>
        <div className="flex flex-wrap gap-1">
          {country.topSectors.map(s => (
            <span key={s} className="text-xs bg-blue-900/50 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Robot Mix</p>
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
          <div style={{ width: `${country.robotTypes.industrial}%`, backgroundColor: '#f59e0b' }} />
          <div style={{ width: `${country.robotTypes.service}%`, backgroundColor: '#3b82f6' }} />
          <div style={{ width: `${country.robotTypes.collaborative}%`, backgroundColor: '#10b981' }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Industrial {country.robotTypes.industrial}%</span>
          <span>Service {country.robotTypes.service}%</span>
          <span>Cobot {country.robotTypes.collaborative}%</span>
        </div>
      </div>

      {country.topRobots.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Famous Robots</p>
          <div className="space-y-1.5">
            {country.topRobots.map(r => (
              <div key={r.name} className="flex items-center gap-2 bg-gray-800 rounded-lg px-2.5 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-white">{r.name}</span>
                  <span className="text-gray-500 text-xs ml-1">by {r.maker}</span>
                </div>
                <span className="ml-auto text-xs text-gray-600">{r.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onShare(
            `${country.flagEmoji} ${country.name} Robotics: ${country.density} robots per 10,000 workers · #${country.worldRank} in the world · +${country.densityGrowthRate}% growth · Source: IFR 2023 via r2bot.in/world-map`
          )}
          className="flex-1 text-xs py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700"
        >
          📋 Share stats
        </button>
        <a
          href={`/world-map?compare=IND,${country.id}`}
          className="flex-1 text-xs py-2 text-center bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30"
        >
          ⚖️ vs India
        </a>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) {
  const color = positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="bg-gray-800 rounded-xl p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{sub}</p>
    </div>
  )
}

function Sparkline({ country }: { country: CountryData }) {
  // Build a series: if in RACE_DATA use real, else interpolate backwards from growth rate.
  const series = useMemo(() => {
    const isRace = (RACE_COUNTRIES as readonly string[]).includes(country.id)
    if (isRace) {
      return RACE_YEARS.map(y => ({ year: y, v: RACE_DATA[y][country.id as typeof RACE_COUNTRIES[number]] }))
    }
    const g = country.densityGrowthRate / 100
    return [7, 6, 5, 4, 3, 2, 1, 0].map(back => {
      const v = country.density / Math.pow(1 + g, back)
      return { year: 2023 - back, v: Math.max(0, v) }
    })
  }, [country])

  const max = Math.max(...series.map(s => s.v))
  const pts = series.map((s, i) => `${(i / (series.length - 1)) * 100},${30 - (s.v / max) * 28}`).join(' ')

  return (
    <div className="bg-gray-800/60 rounded-xl p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">5-year trend</p>
      <svg viewBox="0 0 100 30" className="w-full h-12">
        <polyline fill="none" stroke="#f59e0b" strokeWidth="1.2" points={pts} />
        <polyline
          fill="url(#sparkfill)"
          stroke="none"
          points={`0,30 ${pts} 100,30`}
          opacity={0.25}
        />
        <defs>
          <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{series[0].year}</span>
        <span>{series[series.length - 1].year}</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// INDIA SPOTLIGHT
// ════════════════════════════════════════════════════════════════════════════
function IndiaSpotlight({ india, korea }: { india: CountryData; korea: CountryData }) {
  const gap = Math.round(korea.density / india.density)
  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl p-5">
      <h3 className="font-bold text-amber-400 mb-1 flex items-center gap-2">🚀 India&apos;s Moment</h3>
      <p className="text-xs text-gray-400 mb-4">The world&apos;s biggest automation gap is also the biggest opportunity.</p>
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-gray-900/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-gray-400">{india.density}</p>
          <p className="text-xs text-gray-500">India</p>
        </div>
        <div className="self-center text-gray-600 text-sm font-bold">vs</div>
        <div className="flex-1 bg-gray-900/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-amber-400">{korea.density.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Korea</p>
        </div>
      </div>
      <div className="bg-amber-500/10 rounded-xl p-3 mb-3 text-center">
        <p className="text-3xl font-black text-amber-400">{gap}×</p>
        <p className="text-xs text-gray-400">gap — biggest robotics opportunity on Earth</p>
      </div>
      <div className="text-center text-xs text-emerald-400">
        +59% growth · fastest big economy in 2023
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DENSITY LEADERBOARD
// ════════════════════════════════════════════════════════════════════════════
function DensityLeaderboard({ onSelect }: { onSelect: (c: CountryData) => void }) {
  const sorted = [...COUNTRIES].sort((a, b) => b.density - a.density).slice(0, 10)
  const max = sorted[0].density

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h3 className="font-semibold text-gray-200 text-sm mb-4">🏆 Top 10 Rankings</h3>
      <div className="space-y-2">
        {sorted.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full text-left hover:bg-gray-800/40 rounded-lg p-1.5 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                <span className="text-sm">{c.flagEmoji}</span>
                <span className="text-xs text-gray-300">{c.name}</span>
              </div>
              <span className="text-xs font-mono text-amber-400">{c.density.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(c.density / max) * 100}%`,
                  backgroundColor: c.id === 'IND' ? '#f59e0b' : '#6366f1',
                }}
              />
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3 text-center">Robots per 10,000 workers · IFR 2023</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPARE TAB
// ════════════════════════════════════════════════════════════════════════════
function CompareTab({ a, b, setA, setB, onShare }: {
  a: CountryData | null
  b: CountryData | null
  setA: (c: CountryData | null) => void
  setB: (c: CountryData | null) => void
  onShare: (s: string) => void
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h2 className="text-xl font-bold mb-1">⚖️ Country Comparison</h2>
      <p className="text-sm text-gray-400 mb-4">Pick two countries to see them side by side.</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <CountryPicker label="Country A" value={a} onChange={setA} color="blue" />
        <CountryPicker label="Country B" value={b} onChange={setB} color="pink" />
      </div>

      {a && b ? <CompareTable a={a} b={b} onShare={onShare} /> : (
        <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-10 text-center text-gray-500">
          Pick a country in each dropper to start.
        </div>
      )}
    </div>
  )
}

function CountryPicker({ label, value, onChange, color }: {
  label: string
  value: CountryData | null
  onChange: (c: CountryData | null) => void
  color: 'blue' | 'pink'
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() =>
    COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [query]
  )

  const ring = color === 'blue' ? 'border-blue-500/40 text-blue-300' : 'border-pink-500/40 text-pink-300'

  return (
    <div>
      <p className={`text-xs uppercase tracking-wide mb-1 ${color === 'blue' ? 'text-blue-400' : 'text-pink-400'}`}>{label}</p>
      <div className={`bg-gray-800 border ${ring} rounded-xl p-3`}>
        {value ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{value.flagEmoji}</span>
            <div className="flex-1">
              <p className="font-semibold">{value.name}</p>
              <p className="text-xs text-gray-400">#{value.worldRank} · {value.density} density</p>
            </div>
            <button onClick={() => onChange(null)} className="text-gray-500 hover:text-white">×</button>
          </div>
        ) : (
          <>
            <input
              autoFocus={false}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search 50 countries..."
              className="w-full bg-gray-900 text-sm border border-gray-700 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
            />
            {query && (
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
                {filtered.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => { onChange(c); setQuery('') }}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span>{c.flagEmoji}</span> {c.name}
                      <span className="ml-auto text-xs text-gray-500">{c.density}</span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="text-gray-500 text-xs p-2">No match</li>}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CompareTable({ a, b, onShare }: { a: CountryData; b: CountryData; onShare: (s: string) => void }) {
  const rows: { label: string; aVal: string; bVal: string; aWin: boolean; bWin: boolean }[] = [
    { label: 'Robot Density',  aVal: a.density.toLocaleString(),                    bVal: b.density.toLocaleString(),
      aWin: a.density > b.density, bWin: b.density > a.density },
    { label: 'Growth Rate',    aVal: `${a.densityGrowthRate > 0 ? '+' : ''}${a.densityGrowthRate}%`, bVal: `${b.densityGrowthRate > 0 ? '+' : ''}${b.densityGrowthRate}%`,
      aWin: a.densityGrowthRate > b.densityGrowthRate, bWin: b.densityGrowthRate > a.densityGrowthRate },
    { label: 'Investment',     aVal: `$${a.investmentBillionUSD}B`,                 bVal: `$${b.investmentBillionUSD}B`,
      aWin: a.investmentBillionUSD > b.investmentBillionUSD, bWin: b.investmentBillionUSD > a.investmentBillionUSD },
    { label: 'GDP per capita', aVal: `$${a.gdpPerCapitaUSD.toLocaleString()}`,      bVal: `$${b.gdpPerCapitaUSD.toLocaleString()}`,
      aWin: a.gdpPerCapitaUSD > b.gdpPerCapitaUSD, bWin: b.gdpPerCapitaUSD > a.gdpPerCapitaUSD },
    { label: 'World Rank',     aVal: `#${a.worldRank}`,                              bVal: `#${b.worldRank}`,
      aWin: a.worldRank < b.worldRank, bWin: b.worldRank < a.worldRank },
    { label: 'Gap to close',   aVal: a.density >= b.density ? '—' : `${Math.round(b.density / Math.max(a.density, 1))}×`,
                               bVal: b.density >= a.density ? '—' : `${Math.round(a.density / Math.max(b.density, 1))}×`,
      aWin: false, bWin: false },
  ]

  const yearsToReach = (from: CountryData, to: CountryData): number | null => {
    if (from.density >= to.density) return 0
    if (from.densityGrowthRate <= 0) return null
    const yrs = Math.log(to.density / Math.max(from.density, 1)) / Math.log(1 + from.densityGrowthRate / 100)
    return Math.ceil(yrs)
  }

  const insight = (() => {
    const lower = a.density < b.density ? a : b
    const higher = lower === a ? b : a
    const yrs = yearsToReach(lower, higher)
    const arrival = yrs ? 2023 + yrs : null
    const fastIsLower = lower.densityGrowthRate > higher.densityGrowthRate
    const multiplier = higher.densityGrowthRate > 0 ? (lower.densityGrowthRate / higher.densityGrowthRate).toFixed(1) : '∞'

    if (fastIsLower && arrival && yrs! <= 100) {
      return `${lower.flagEmoji} ${lower.name}'s growth (${lower.densityGrowthRate}%) is ${multiplier}× faster than ${higher.name}'s (${higher.densityGrowthRate}%) — at this pace ${lower.name} could match ${higher.name}'s current density by ${arrival}.`
    }
    if (arrival) {
      return `At ${lower.name}'s current growth (${lower.densityGrowthRate}%/yr), it would take ${yrs} years to reach ${higher.name}'s density (${higher.density}).`
    }
    return `${higher.flagEmoji} ${higher.name} leads ${lower.name} by ${Math.round(higher.density / Math.max(lower.density, 1))}× in robot density.`
  })()

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Metric</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-blue-400">{a.flagEmoji} {a.name}</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-pink-400">{b.flagEmoji} {b.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className="border-t border-gray-800">
                <td className="px-4 py-2.5 text-gray-300">{r.label}</td>
                <td className={`px-4 py-2.5 text-right font-mono ${r.aWin ? 'text-emerald-400 font-bold' : 'text-gray-200'}`}>{r.aVal}</td>
                <td className={`px-4 py-2.5 text-right font-mono ${r.bWin ? 'text-emerald-400 font-bold' : 'text-gray-200'}`}>{r.bVal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">Insight</p>
        <p className="text-sm text-gray-200">{insight}</p>
      </div>

      <button
        onClick={() => onShare(
          `${a.flagEmoji} ${a.name} (${a.density}) vs ${b.flagEmoji} ${b.name} (${b.density}) — ${insight} via r2bot.in/world-map?compare=${a.id},${b.id}`
        )}
        className="mt-3 w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 rounded-xl"
      >
        📋 Share this comparison
      </button>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPARE DRAWER (slides up on Map tab when in compare mode)
// ════════════════════════════════════════════════════════════════════════════
function CompareDrawer({ a, b, onClose, onShare }: {
  a: CountryData | null
  b: CountryData | null
  onClose: () => void
  onShare: (s: string) => void
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-pink-500/30 max-h-[60vh] overflow-y-auto md:max-w-7xl md:left-1/2 md:-translate-x-1/2 md:rounded-t-2xl shadow-2xl">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
        <p className="text-sm font-semibold">⚖️ Comparison</p>
        <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
      </div>
      <div className="p-4">
        {a && b ? <CompareTable a={a} b={b} onShare={onShare} /> :
          <p className="text-sm text-gray-500 text-center py-6">Click another country to complete the comparison.</p>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// EXPLORER TAB — scatter plot
// ════════════════════════════════════════════════════════════════════════════
function ExplorerTab({ onSelect, isMobile }: { onSelect: (c: CountryData) => void; isMobile: boolean }) {
  if (isMobile) {
    // Ranked-table fallback
    const sorted = [...COUNTRIES].sort((a, b) => b.density - a.density)
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <h2 className="text-lg font-bold mb-1">📊 Data Explorer</h2>
        <p className="text-xs text-gray-500 mb-3">Ranked table view — SVG scatter shown on larger screens.</p>
        <ul className="divide-y divide-gray-800">
          {sorted.map((c, i) => (
            <li key={c.id}>
              <button onClick={() => onSelect(c)} className="w-full flex items-center gap-2 py-2.5 text-left">
                <span className="text-gray-500 w-6 text-xs">#{i + 1}</span>
                <span>{c.flagEmoji}</span>
                <span className="text-sm flex-1 truncate">{c.name}</span>
                <span className="text-xs text-gray-500">${(c.gdpPerCapitaUSD / 1000).toFixed(0)}K</span>
                <span className="text-xs text-amber-400 w-12 text-right">{c.density}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return <ScatterPlot onSelect={onSelect} />
}

function ScatterPlot({ onSelect }: { onSelect: (c: CountryData) => void }) {
  const [hover, setHover] = useState<CountryData | null>(null)
  const width = 880, height = 520
  const margin = { top: 30, right: 30, bottom: 50, left: 60 }

  const xScale = scaleLog<number>().domain([1000, 100000]).range([margin.left, width - margin.right])
  const yScale = scaleLinear<number>().domain([0, 1100]).range([height - margin.bottom, margin.top])
  const rScale = scaleLinear<number>().domain([0, 25]).range([4, 22])

  // Trend line via simple regression on log(x) vs y
  const reg = useMemo(() => {
    const pts = COUNTRIES.filter(c => c.density > 0 && c.gdpPerCapitaUSD > 0)
      .map(c => ({ x: Math.log10(c.gdpPerCapitaUSD), y: c.density }))
    const n = pts.length
    const sx = pts.reduce((a, p) => a + p.x, 0)
    const sy = pts.reduce((a, p) => a + p.y, 0)
    const sxy = pts.reduce((a, p) => a + p.x * p.y, 0)
    const sxx = pts.reduce((a, p) => a + p.x * p.x, 0)
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    const b = (sy - m * sx) / n
    return { m, b }
  }, [])

  const trendLineY = (gdp: number) => reg.m * Math.log10(gdp) + reg.b
  const trendX1 = 1500, trendX2 = 95000

  const xTicks = [1000, 3000, 10000, 30000, 100000]
  const yTicks = [0, 200, 400, 600, 800, 1000]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">📊 GDP vs Automation</h2>
          <p className="text-sm text-gray-400">Each dot is a country · X = GDP/capita (log) · Y = robot density · Size = investment</p>
        </div>
        <div className="flex gap-3 text-xs">
          {(['Asia', 'Europe', 'Americas', 'Oceania', 'Middle East', 'Africa'] as const).map(r => (
            <span key={r} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[r] }} />
              <span className="text-gray-400">{r}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid */}
          {xTicks.map(t => (
            <line key={`xg-${t}`} x1={xScale(t)} x2={xScale(t)} y1={margin.top} y2={height - margin.bottom} stroke="#1f2937" />
          ))}
          {yTicks.map(t => (
            <line key={`yg-${t}`} x1={margin.left} x2={width - margin.right} y1={yScale(t)} y2={yScale(t)} stroke="#1f2937" />
          ))}

          {/* Global avg crosshair */}
          <line x1={margin.left} x2={width - margin.right} y1={yScale(GLOBAL_AVERAGE_DENSITY)} y2={yScale(GLOBAL_AVERAGE_DENSITY)}
                stroke="#f59e0b" strokeDasharray="4 4" opacity={0.55} />
          <text x={width - margin.right} y={yScale(GLOBAL_AVERAGE_DENSITY) - 4} textAnchor="end"
                fill="#fcd34d" fontSize="11">Global avg = 162</text>

          {/* Trend line */}
          <line
            x1={xScale(trendX1)} y1={yScale(Math.max(0, trendLineY(trendX1)))}
            x2={xScale(trendX2)} y2={yScale(Math.max(0, trendLineY(trendX2)))}
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4" opacity={0.7}
          />

          {/* Dots */}
          {COUNTRIES.map(c => {
            const cx = xScale(c.gdpPerCapitaUSD)
            const cy = yScale(c.density)
            const r = rScale(c.investmentBillionUSD)
            const isIndia = c.id === 'IND'
            const isKorea = c.id === 'KOR'
            const isFocus = hover?.id === c.id
            return (
              <g key={c.id}
                 onMouseEnter={() => setHover(c)}
                 onMouseLeave={() => setHover(null)}
                 onClick={() => onSelect(c)}
                 style={{ cursor: 'pointer' }}>
                <circle cx={cx} cy={cy} r={r}
                  fill={isIndia ? '#f59e0b' : REGION_COLORS[c.region]}
                  fillOpacity={isFocus ? 0.95 : isIndia ? 0.95 : 0.7}
                  stroke={isFocus || isIndia ? '#fde68a' : 'none'}
                  strokeWidth={isFocus ? 2 : isIndia ? 1.5 : 0}
                />
                {(isIndia || isKorea || isFocus) && (
                  <text x={cx + r + 4} y={cy + 4} fontSize="11" fill="#fde68a" fontWeight={isIndia ? 700 : 500}>
                    {c.flagEmoji} {c.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* India annotation arrow */}
          {(() => {
            const ind = COUNTRIES.find(c => c.id === 'IND')!
            const cx = xScale(ind.gdpPerCapitaUSD), cy = yScale(ind.density)
            return (
              <g>
                <line x1={cx} y1={cy} x2={cx + 80} y2={cy - 60} stroke="#f59e0b" strokeWidth="1" />
                <rect x={cx + 78} y={cy - 88} width={170} height={36} fill="#1f2937" stroke="#f59e0b" rx="6" />
                <text x={cx + 86} y={cy - 72} fontSize="11" fill="#f59e0b" fontWeight={700}>🇮🇳 India</text>
                <text x={cx + 86} y={cy - 58} fontSize="10" fill="#fde68a">Biggest opportunity gap</text>
              </g>
            )
          })()}

          {/* Axes */}
          <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#4b5563" />
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#4b5563" />
          {xTicks.map(t => (
            <text key={`xt-${t}`} x={xScale(t)} y={height - margin.bottom + 16} textAnchor="middle" fill="#9ca3af" fontSize="10">
              ${t >= 1000 ? `${t / 1000}K` : t}
            </text>
          ))}
          {yTicks.map(t => (
            <text key={`yt-${t}`} x={margin.left - 8} y={yScale(t) + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{t}</text>
          ))}
          <text x={width / 2} y={height - 8} textAnchor="middle" fill="#9ca3af" fontSize="11">GDP per capita (USD, log scale)</text>
          <text transform={`rotate(-90 16 ${height / 2})`} x={16} y={height / 2} fill="#9ca3af" fontSize="11" textAnchor="middle">
            Robot density (per 10K workers)
          </text>
        </svg>

        {hover && (
          <div className="absolute top-2 right-2 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl max-w-[220px]">
            <p className="font-semibold text-white mb-1">{hover.flagEmoji} {hover.name}</p>
            <p className="text-gray-300">Density: <span className="text-amber-400">{hover.density}</span></p>
            <p className="text-gray-300">GDP/cap: <span className="text-amber-400">${hover.gdpPerCapitaUSD.toLocaleString()}</span></p>
            <p className="text-gray-300">Investment: <span className="text-amber-400">${hover.investmentBillionUSD}B</span></p>
            <p className="text-gray-300">Growth: <span className={hover.densityGrowthRate > 0 ? 'text-emerald-400' : 'text-red-400'}>
              {hover.densityGrowthRate > 0 ? '+' : ''}{hover.densityGrowthRate}%</span></p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
        <Quadrant title="High GDP, High Auto" color="emerald" hint="Korea · Germany · Japan" />
        <Quadrant title="High GDP, Low Auto" color="amber" hint="Switzerland · Saudi · UAE" />
        <Quadrant title="Growth Opportunity" color="cyan" hint="China · Thailand · Malaysia" />
        <Quadrant title="Frontier Markets" color="pink" hint="🇮🇳 India · Indonesia · Vietnam" />
      </div>
    </div>
  )
}

function Quadrant({ title, color, hint }: { title: string; color: string; hint: string }) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    amber:   'bg-amber-500/10 border-amber-500/30 text-amber-300',
    cyan:    'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    pink:    'bg-pink-500/10 border-pink-500/30 text-pink-300',
  }
  return (
    <div className={`border rounded-lg p-2 ${bg[color]}`}>
      <p className="font-semibold">{title}</p>
      <p className="text-[10px] opacity-80 mt-0.5">{hint}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// RACE TAB
// ════════════════════════════════════════════════════════════════════════════
function RaceTab() {
  const [yearIdx, setYearIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (playing) {
      intervalRef.current = setInterval(() => {
        setYearIdx(i => {
          if (i >= RACE_YEARS.length - 1) { setPlaying(false); return RACE_YEARS.length - 1 }
          return i + 1
        })
      }, 1200 / speed)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speed])

  const year = RACE_YEARS[yearIdx]
  const data = RACE_DATA[year]
  const ranked = useMemo(
    () => RACE_COUNTRIES.map(id => ({ id, v: data[id], country: COUNTRIES.find(c => c.id === id)! }))
      .sort((a, b) => b.v - a.v),
    [data]
  )
  const max = Math.max(...ranked.map(r => r.v))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">📈 Growth Race: Robot Density 2016 → 2023</h2>
          <p className="text-sm text-gray-400">Top 10 countries · IFR yearly density</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (yearIdx === RACE_YEARS.length - 1) setYearIdx(0)
              setPlaying(p => !p)
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold"
          >
            {playing ? '⏸ Pause' : yearIdx === RACE_YEARS.length - 1 ? '↻ Replay' : '▶ Play'}
          </button>
          {[0.5, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 text-xs rounded ${speed === s ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300'}`}
            >{s}×</button>
          ))}
        </div>
      </div>

      <div className="text-center my-4">
        <p className="text-6xl md:text-8xl font-black text-amber-400 tabular-nums">{year}</p>
      </div>

      <div className="space-y-2">
        {ranked.map((r, i) => {
          const isIndia = r.id === 'IND'
          return (
            <div key={r.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6 text-right">#{i + 1}</span>
              <span className="w-7">{r.country.flagEmoji}</span>
              <span className="text-sm w-24 truncate text-gray-300">{r.country.name}</span>
              <div className="flex-1 bg-gray-800 rounded-md overflow-hidden h-7 relative">
                <div
                  className="h-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                  style={{
                    width: `${(r.v / max) * 100}%`,
                    backgroundColor: isIndia ? '#f59e0b' : '#475569',
                  }}
                >
                  <span className={`text-xs font-mono font-bold ${isIndia ? 'text-black' : 'text-white'}`}>{r.v.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <input
        type="range"
        min={0}
        max={RACE_YEARS.length - 1}
        value={yearIdx}
        onChange={e => { setPlaying(false); setYearIdx(parseInt(e.target.value)) }}
        className="w-full mt-6 accent-amber-500"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        {RACE_YEARS.map(y => (
          <span key={y} className={y === year ? 'text-amber-400 font-bold' : ''}>{y}</span>
        ))}
      </div>

      {year >= 2021 && (
        <div className="mt-5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-sm">
          📍 <span className="text-amber-300 font-semibold">2021:</span> China overtook Japan in density — the fastest rise in robotics history.
        </div>
      )}
      {year === 2023 && (
        <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-sm">
          🇮🇳 <span className="text-emerald-300 font-semibold">India 2023:</span> +59% YoY growth — fastest among major economies.
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// INDIA TAB — 4 sub-tabs
// ════════════════════════════════════════════════════════════════════════════
type IndiaSubTab = 'hubs' | 'initiatives' | 'opportunity' | 'robots'

function IndiaTab({ india, korea }: { india: CountryData; korea: CountryData }) {
  const [sub, setSub] = useState<IndiaSubTab>('opportunity')
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-5 border-b border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🇮🇳</span>
          <div>
            <h2 className="text-2xl font-bold">India Deep Dive</h2>
            <p className="text-sm text-gray-400">Density 4 · Rank #{india.worldRank} · +{india.densityGrowthRate}% growth · $2.1B est. market 2030</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-800 overflow-x-auto">
        {([
          { id: 'opportunity', label: '🎯 Opportunity Calculator' },
          { id: 'hubs',         label: '🏙️ City Hubs' },
          { id: 'initiatives',  label: '🏛️ Gov Initiatives' },
          { id: 'robots',       label: '🤖 India\'s Robots' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
              sub === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      <div className="p-5">
        {sub === 'opportunity' && <OpportunityCalculator india={india} korea={korea} />}
        {sub === 'hubs' && <CityHubsGrid />}
        {sub === 'initiatives' && <GovInitiatives />}
        {sub === 'robots' && <IndiasRobots />}
      </div>
    </div>
  )
}

function OpportunityCalculator({ india, korea }: { india: CountryData; korea: CountryData }) {
  const [target, setTarget] = useState(50)
  const presets: { label: string; v: number; headline: string }[] = [
    { label: 'Global Avg (162)', v: 162, headline: 'India joins normal automation economies' },
    { label: 'Japan (419)',      v: 419, headline: 'India joins the G5 of robot nations' },
    { label: 'Germany (429)',    v: 429, headline: 'India matches Europe\'s manufacturing core' },
    { label: 'Korea (1,012)',    v: 1012, headline: 'India becomes the world robot leader' },
  ]

  // Calculations (per spec from new message):
  // 1. New robots needed: (target - 4) × 60 × 100 (thousand) = (target - 4) × 6,000 (in units total — million scale)
  //    Spec text: "(targetDensity - 4) × 60 (India's manufacturing workforce in millions) × 100" → display millions.
  const newRobotsMillions = ((target - india.density) * 60 * 100) / 1_000_000 // = (target-4)*60*100 expressed as millions
  // 2. Jobs enhanced: targetDensity × 0.6M × 1.3 (millions)
  const jobsEnhancedMillions = (target * 0.6 * 1.3)
  // 3. GDP impact: (target / 4) × 0.3 × 3.5T → trillions INR (≈ USD-ish; we display as ₹trillion)
  const gdpImpactTrillion = (target / Math.max(india.density, 1)) * 0.3 * 3.5
  // 4. Years at 59% growth
  const years = target <= india.density ? 0 : Math.ceil(Math.log(target / india.density) / Math.log(1 + india.densityGrowthRate / 100))

  // Approximate world rank if India hit `target` (search COUNTRIES)
  const projectedRank = useMemo(() => {
    const sorted = [...COUNTRIES, { ...india, density: target }]
      .sort((a, b) => b.density - a.density)
    return sorted.findIndex(c => c.id === 'IND') + 1
  }, [target, india])

  const headline = presets.find(p => p.v === target)?.headline

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-300">Target density: <span className="text-amber-400 font-bold text-2xl tabular-nums">{target}</span> <span className="text-xs text-gray-500">robots / 10K workers</span></p>
        </div>
        <input
          type="range"
          min={10}
          max={1012}
          step={1}
          value={target}
          onChange={e => setTarget(parseInt(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10</span><span>250</span><span>500</span><span>750</span><span>1,012 (Korea)</span>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-3">
          {presets.map(p => (
            <button key={p.v}
              onClick={() => setTarget(p.v)}
              className={`text-xs px-2.5 py-1.5 rounded-full border ${
                target === p.v
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >{p.label}</button>
          ))}
        </div>
        {headline && (
          <p className="mt-3 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">{headline}</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="New robots needed" value={`${newRobotsMillions.toFixed(1)}M`} sub="units to install" />
        <Stat label="Jobs enhanced" value={`${jobsEnhancedMillions.toFixed(1)}M`} sub="(not replaced, ILO multiplier)" positive />
        <Stat label="GDP impact" value={`₹${gdpImpactTrillion.toFixed(1)}T`} sub="additional by 2035" />
        <Stat label="Time to reach" value={years === 0 ? 'Now' : `${years} yrs`} sub={`at +${india.densityGrowthRate}% / yr`} />
      </div>

      <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="text-xs text-gray-400">If India reaches {target} density today</p>
          <p className="text-lg font-bold text-amber-400">India would rank ~#{projectedRank} globally</p>
        </div>
      </div>
    </div>
  )
}

function CityHubsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {INDIA_HUBS.map(hub => (
        <div key={hub.name} className="bg-gray-800 border border-gray-700 rounded-xl p-3.5 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 font-semibold">{hub.name}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: hub.intensity }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-2">{hub.focus}</p>
          <div className="flex flex-wrap gap-1">
            {hub.orgs.slice(0, 4).map(o => (
              <span key={o} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{o}</span>
            ))}
            {hub.orgs.length > 4 && <span className="text-[10px] text-gray-500">+{hub.orgs.length - 4}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function GovInitiatives() {
  return (
    <ol className="relative border-l-2 border-amber-500/40 pl-5 space-y-5">
      {INDIA_INITIATIVES.map(it => (
        <li key={it.year + it.name} className="relative">
          <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full"
               style={{ backgroundColor: it.status === 'launched' ? '#10b981' : it.status === 'milestone' ? '#f59e0b' : '#a78bfa' }} />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{it.year}</span>
            <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
              it.status === 'launched' ? 'bg-emerald-500/20 text-emerald-300' :
              it.status === 'milestone' ? 'bg-amber-500/20 text-amber-300' :
              'bg-purple-500/20 text-purple-300'
            }`}>{it.status}</span>
            {it.budgetINR && <span className="text-[10px] text-gray-500">{it.budgetINR}</span>}
          </div>
          <p className="text-sm font-semibold text-white">{it.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{it.blurb}</p>
        </li>
      ))}
    </ol>
  )
}

function IndiasRobots() {
  const ind = COUNTRIES.find(c => c.id === 'IND')!
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {ind.topRobots.map(r => (
        <div key={r.name} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-3xl mb-2">🤖</div>
          <p className="font-bold text-amber-400">{r.name}</p>
          <p className="text-xs text-gray-400">{r.maker} · {r.year}</p>
          <p className="text-xs text-gray-500 mt-1">{r.type}</p>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE BOTTOM SHEET
// ════════════════════════════════════════════════════════════════════════════
function MobileBottomSheet({ country, onClose, onShare }: { country: CountryData; onClose: () => void; onShare: (s: string) => void }) {
  const india = COUNTRIES.find(c => c.id === 'IND')!
  return (
    <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 w-full max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-gray-700 p-1"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto my-2" />
        <div className="p-3">
          <CountryPanel country={country} onClose={onClose} onShare={onShare} india={india} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// EMBED MODAL
// ════════════════════════════════════════════════════════════════════════════
function EmbedModal({ onClose, onShare }: { onClose: () => void; onShare: (s: string) => void }) {
  const code = `<iframe src="https://r2bot.in/world-map/embed" width="100%" height="600" frameborder="0"></iframe>`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">&lt;/&gt; Embed this map</h3>
        <p className="text-sm text-gray-400 mb-4">Copy this iframe — works on any site.</p>
        <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-amber-300 overflow-x-auto">{code}</pre>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onShare(code)}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 rounded-lg"
          >Copy</button>
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded-lg">Close</button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Or open the stripped embed view: <a className="text-amber-400 underline" href="/world-map/embed">/world-map/embed</a>
        </p>
      </div>
    </div>
  )
}
