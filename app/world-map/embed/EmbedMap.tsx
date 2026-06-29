'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import {
  COUNTRIES,
  NUMERIC_TO_ALPHA3,
  LAYER_META,
  getLayerColor,
  type CountryData,
  type DataLayer,
} from '@/lib/robotics-map-data'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export default function EmbedMap() {
  const [layer, setLayer] = useState<DataLayer>('density')
  const [hover, setHover] = useState<CountryData | null>(null)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div>
          <p className="text-sm font-semibold">🌍 World Robotics Map · IFR 2023</p>
          <p className="text-xs text-gray-500">{LAYER_META[layer].legend}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['density', 'growth', 'investment', 'gdpVsAuto', 'opportunity'] as DataLayer[]).map(l => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`text-[10px] px-2 py-1 rounded whitespace-nowrap ${
                layer === l ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300'
              }`}
            >{LAYER_META[l].label}</button>
          ))}
        </div>
      </div>

      <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130, center: [20, 20] }}>
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const alpha3 = NUMERIC_TO_ALPHA3[geo.id]
                  const data = COUNTRIES.find(c => c.id === alpha3)
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHover(data || null)}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        default: { fill: getLayerColor(data, layer), stroke: '#374151', strokeWidth: 0.4, outline: 'none' },
                        hover: { fill: '#f59e0b', stroke: '#fcd34d', outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {hover && (
          <div className="absolute top-2 right-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
            <span className="font-semibold">{hover.flagEmoji} {hover.name}</span>
            <span className="text-amber-400 ml-2">{hover.density}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2 text-center">
        Powered by <a href="https://r2bot.in/world-map" className="text-amber-400 underline">r2bot.in/world-map</a>
      </p>
    </div>
  )
}
