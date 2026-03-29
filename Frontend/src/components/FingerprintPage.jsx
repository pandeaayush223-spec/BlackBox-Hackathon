import { useState, useEffect, useCallback } from 'react'
import FingerprintCanvas from './FingerprintCanvas'

// --- Helper components ---

function ShimmerCircle({ size = 400 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-white/5 relative overflow-hidden flex items-center justify-center"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
      <p className="text-cyan-400/40 text-sm z-10">Loading fingerprint...</p>
    </div>
  )
}

function ShimmerCard() {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
      style={{ flex: 1 }}
    >
      <div className="w-[160px] h-[160px] rounded-full bg-white/10 flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  )
}

function TwinCityCard({ rank, cityName, countryCode, score, days, globalMaxPrecip, tempUnit, onClick }) {
  const MINI_SIZE = 500
  const DISPLAY_SIZE = 160
  const scale = DISPLAY_SIZE / MINI_SIZE

  return (
    <div
      onClick={onClick}
      className="
        flex items-center gap-4 p-4 rounded-2xl cursor-pointer
        bg-white/5 border border-cyan-500/30
        hover:border-cyan-400/70 hover:bg-white/[0.08]
        transition-all duration-200 hover:scale-[1.02]
      "
      style={{ flex: 1 }}
    >
      {/* Mini fingerprint — rendered at 500x500, scaled down via CSS */}
      <div
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: 'hidden',
          flexShrink: 0,
          borderRadius: '50%',
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: MINI_SIZE, height: MINI_SIZE }}>
          <FingerprintCanvas
            data={days}
            cityName={cityName}
            globalMaxPrecip={globalMaxPrecip}
            darkMode={true}
            minimal={true}
            animationDuration={400}
            tempUnit={tempUnit}
          />
        </div>
      </div>

      {/* Text content */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-white font-semibold text-base truncate">
            {rank}. {cityName}
            {countryCode && (
              <span className="text-xs text-white/40 font-mono bg-white/10 px-1.5 py-0.5 rounded ml-2">
                {countryCode}
              </span>
            )}
          </span>
          <span className="text-cyan-300 font-mono text-sm flex-shrink-0">
            {score?.toFixed(1)}
          </span>
        </div>
        <p className="text-white/40 text-xs">Climate similarity score</p>
        <p className="text-cyan-400/50 text-xs mt-1">Click to explore &rarr;</p>
      </div>
    </div>
  )
}

// --- Main page component ---

export default function FingerprintPage({ initialCity, onBack }) {
  const [mainCity, setMainCity] = useState(initialCity || 'Columbus')
  const [mainData, setMainData] = useState(null)
  const [twinData, setTwinData] = useState([])
  const [mainLoading, setMainLoading] = useState(false)
  const [twinsLoading, setTwinsLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [inputCity, setInputCity] = useState(initialCity || 'Columbus')
  const [tempUnit, setTempUnit] = useState('F')

  const loadCity = useCallback(async (cityName) => {
    setMainLoading(true)
    setTwinsLoading(true)
    setMainData(null)
    setTwinData([])

    try {
      const res = await fetch(`/api/fingerprint?city=${encodeURIComponent(cityName)}`)
      const data = await res.json()
      setMainData(data)
      setMainCity(data.city || cityName)

      // Use pre-filtered top_twins from backend (falls back to similarity_scores for compat)
      const top3 = data.top_twins?.length > 0
        ? data.top_twins
        : Object.entries(data.similarity_scores || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([city, score]) => ({ city, score }))

      // Fetch all 3 twin fingerprints in parallel
      const twinResponses = await Promise.all(
        top3.map(({ city: twinCity, score }) =>
          fetch(`/api/fingerprint?city=${encodeURIComponent(twinCity)}`)
            .then(r => r.json())
            .then(d => ({
              ...d,
              score,
              country_code: d.country_code,
            }))
        )
      )

      setTwinData(twinResponses)
    } catch (e) {
      console.error('Failed to load fingerprint:', e)
    } finally {
      setMainLoading(false)
      setTwinsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCity(mainCity)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTwinClick = useCallback(async (twinCityName) => {
    setFadeOut(true)
    await new Promise(resolve => setTimeout(resolve, 200))
    setMainData(null)
    setFadeOut(false)
    setInputCity(twinCityName)
    loadCity(twinCityName)
  }, [loadCity])

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* Left panel */}
      <div
        className="w-1/2 h-full flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(to right, #0a0a0f, #000000)' }}
      >
        <div
          style={{
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 200ms ease-in-out',
          }}
          className="flex flex-col items-center gap-4 w-full px-8"
        >
          {/* Back + title row */}
          <div className="self-start w-full flex items-center justify-between">
            {/* Placeholder to balance the flex row (Title centered, Temp Toggle right) */}
            <div className="w-16" />

            {/* Page title */}
            <span className="text-white/50 text-xs tracking-[0.2em] uppercase font-medium">Nimbus DNA</span>

            {/* C/F Toggle */}
            <div className="flex rounded-full p-0.5 relative" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <div className="absolute top-0.5 bottom-0.5 w-7 rounded-full transition-transform duration-300"
                   style={{
                     background: 'linear-gradient(135deg,rgba(6,182,212,0.55),rgba(6,182,212,0.25))',
                     boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                     transform: tempUnit === 'C' ? 'translateX(2px)' : 'translateX(30px)',
                   }} />
              <button onClick={() => setTempUnit('C')}
                      className={`relative z-10 w-7 h-6 text-xs font-bold rounded-full cursor-pointer bg-transparent border-none transition-colors ${tempUnit === 'C' ? 'text-white' : 'text-white/35'}`}>C</button>
              <button onClick={() => setTempUnit('F')}
                      className={`relative z-10 w-7 h-6 text-xs font-bold rounded-full cursor-pointer bg-transparent border-none transition-colors ${tempUnit === 'F' ? 'text-white' : 'text-white/35'}`}>F</button>
            </div>
          </div>

          {/* City search */}
          <div className="flex gap-2 w-full max-w-sm">
            <input
              value={inputCity}
              onChange={e => setInputCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadCity(inputCity)}
              placeholder="Enter city name..."
              className="flex-1 bg-white/5 border border-cyan-500/30 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              onClick={() => loadCity(inputCity)}
              disabled={mainLoading}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {mainLoading ? '...' : 'Generate'}
            </button>
          </div>

          {/* Main fingerprint canvas or shimmer */}
          {mainLoading || !mainData ? (
            <ShimmerCircle size={400} />
          ) : (
            <FingerprintCanvas
              data={mainData.days}
              cityName={mainCity}
              globalMaxPrecip={mainData.global_max_precip_mm}
              darkMode={true}
              minimal={false}
              animationDuration={800}
              tempUnit={tempUnit}
            />
          )}

          {/* Fallback warning */}
          {mainData?.fallback_used && (
            <p className="text-amber-400 text-xs text-center">
              Limited data for {mainCity} — showing nearest match: {mainData.fallback_city}
            </p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div
        className="w-1/2 h-full flex flex-col items-center justify-center gap-4 px-6"
        style={{ background: 'linear-gradient(to left, #0a0a0f, #000000)' }}
      >
        <div className="flex flex-col gap-4 w-full h-full justify-center py-8 max-w-lg">
          <p className="text-cyan-400/60 text-xs uppercase tracking-widest text-center mb-2">
            Climate Twins &mdash; <span className="text-white/30">{tempUnit === 'C' ? 'Celsius' : 'Fahrenheit'}</span>
          </p>

          {twinsLoading ? (
            [0, 1, 2].map(i => <ShimmerCard key={i} />)
          ) : (
            twinData.map((twin, i) => (
              <TwinCityCard
                key={twin.city}
                rank={i + 1}
                cityName={twin.city}
                countryCode={twin.country_code}
                score={twin.score}
                days={twin.days}
                globalMaxPrecip={twin.global_max_precip_mm}
                tempUnit={tempUnit}
                onClick={() => handleTwinClick(twin.city)}
              />
            ))
          )}

          {!twinsLoading && twinData.length === 0 && mainData && (
            <p className="text-white/40 text-sm text-center">No similarity data available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
