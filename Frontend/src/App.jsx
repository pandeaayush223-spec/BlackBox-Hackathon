import { useState, useCallback, useEffect } from 'react'
import ZipCodeInput from './components/ZipCodeInput'
import Map3DViewer from './components/Map3DViewer'
import WeatherOverlay from './components/WeatherOverlay'
import WeatherTimeline from './components/WeatherTimeline'
import WeatherStats from './components/WeatherStats'
import RadarMapViewer from './components/RadarMapViewer'
import FingerprintCanvas from './components/FingerprintCanvas'

const API = '/api/viz'

function DayNightIndicator({ isDay }) {
  if (isDay == null) return null;
  const isDaytime = isDay === 1;
  const color = isDaytime ? '#facc15' : '#0ea5e9'; // yellow for day, blue for night
  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none filter drop-shadow-xl animate-fadeInDown">
       <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all duration-1000"
            style={{ 
               background: `radial-gradient(circle at 35% 35%, ${color}90 0%, rgba(255,255,255,0.05) 90%)`,
               boxShadow: `inset 0px 4px 6px rgba(255,255,255,0.4), inset 0px -4px 6px rgba(0,0,0,0.2), 0 0 20px ${color}60`,
               backdropFilter: 'blur(8px)',
             }}
       />
    </div>
  )
}

export default function App() {
  const [location, setLocation] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('forecast')
  const [fingerprint, setFingerprint] = useState(null)
  const [fingerprintLoading, setFingerprintLoading] = useState(false)
  const [tempUnit, setTempUnit] = useState('F')

  // Fetch fingerprint data when entering past mode
  useEffect(() => {
    if (mode !== 'past' || !location) return
    setFingerprintLoading(true)
    setFingerprint(null)
    fetch(`/api/fingerprint?city=${encodeURIComponent(location.name)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load fingerprint')
        return r.json()
      })
      .then(d => setFingerprint(d))
      .catch(() => {})
      .finally(() => setFingerprintLoading(false))
  }, [mode, location])

  const handleSubmit = useCallback(async (zip, selectedMode) => {
    setLoading(true)
    setError(null)
    setMode(selectedMode)
    try {
      const geoRes = await fetch(`${API}/geocode/zip?zip_code=${zip}`)
      if (!geoRes.ok) throw new Error('Invalid zip code')
      const geo = await geoRes.json()
      setLocation(geo)

      // Only fetch short-term forecast if we're in forecast mode
      if (selectedMode === 'forecast') {
        const fRes = await fetch(`${API}/forecast?lat=${geo.lat}&lon=${geo.lon}`)
        if (!fRes.ok) throw new Error('Failed to fetch forecast')
        const fData = await fRes.json()
        
        // Find closest index to the exact current hour with cross-browser safe parsing
        const nowMs = new Date().getTime();
        let closestIdx = 0;
        let minDiff = Infinity;
        fData.points.forEach((p, i) => {
          let pLocalTs = 0;
          try {
            const [dStr, tStr] = p.datetime.split('T');
            const [y, m, d] = dStr.split('-');
            const [h, min] = tStr.split(':');
            pLocalTs = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min)).getTime();
          } catch(e) {}
          
          if (!pLocalTs || isNaN(pLocalTs)) {
             pLocalTs = new Date(p.datetime).getTime();
          }

          const diff = Math.abs(pLocalTs - nowMs);
          if (diff < minDiff) { minDiff = diff; closestIdx = i; }
        });

        fData.points = fData.points.slice(closestIdx, closestIdx + 48) // Limit to 48 hours from now
        setForecast(fData)
        setIdx(0)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBack = useCallback(() => {
    setLocation(null)
    setForecast(null)
    setFingerprint(null)
    setIdx(0)
    setMode('forecast')
  }, [])

  const current = forecast?.points?.[idx]

  if (!location) {
    return <ZipCodeInput onSubmit={handleSubmit} loading={loading} error={error} />
  }

  // Radar Mode
  if (mode === 'radar') {
    return (
      <div className="w-screen h-screen relative overflow-hidden bg-black">
        <RadarMapViewer lat={location.lat} lon={location.lon} onBack={handleBack} />
      </div>
    )
  }

  // Past Comparer Mode — split: Fingerprint (left) + Twin Cities (right)
  if (mode === 'past') {
    const sortedTwins = fingerprint
      ? Object.entries(fingerprint.similarity_scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
      : []

    return (
      <div className="w-screen h-screen relative overflow-hidden bg-[#0a0e27]">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 z-20 glass px-4 py-2 rounded-full text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors border border-white/10"
        >
          ← Back
        </button>

        {/* Split layout */}
        <div className="w-full h-full flex items-center justify-center gap-12 px-12">
          {/* Left: Fingerprint */}
          <div className="flex flex-col items-center">
            <FingerprintCanvas
              data={fingerprint?.days || []}
              cityName={fingerprint?.city || location.name}
              globalMaxPrecip={fingerprint?.global_max_precip_mm || 1}
              loading={fingerprintLoading}
              darkMode={true}
            />
          </div>

          {/* Right: Twin Cities */}
          <div className="flex flex-col gap-6 min-w-[280px] max-w-[320px]">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight mb-1">
                {fingerprint?.city || location.name}
              </h2>
              <p className="text-white/50 text-sm uppercase tracking-widest">Climate Twins</p>
            </div>

            {fingerprintLoading && !fingerprint && (
              <div className="space-y-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="glass rounded-2xl p-5 animate-pulse border border-white/5">
                    <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
                    <div className="h-8 bg-white/10 rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {sortedTwins.map(([city, score], i) => (
              <div
                key={city}
                className="glass rounded-2xl p-5 border border-white/10 relative overflow-hidden group animate-fadeInUp"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-white/40 text-xs font-mono mb-1">#{i + 1} MATCH</p>
                    <p className="text-xl font-bold text-white">{city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-light tabular-nums text-cyan-400">
                      {score.toFixed(1)}
                    </p>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest">similarity</p>
                  </div>
                </div>
              </div>
            ))}

            {fingerprint && sortedTwins.length === 0 && (
              <p className="text-white/40 text-sm">No similarity data available.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default: Short-Term Forecast Mode
  return (
    <div className={`w-screen h-screen relative overflow-hidden ${current?.is_day === 1 ? 'day-mode' : ''}`}>
      <DayNightIndicator isDay={current?.is_day} />
      <Map3DViewer lat={location.lat} lon={location.lon} weatherCode={current?.weather_code} cloudCover={current?.cloud_cover} isDay={current?.is_day} />
      <WeatherOverlay weatherData={current} />
      <WeatherStats weatherData={current} locationName={location.name} onBack={handleBack} tempUnit={tempUnit} setTempUnit={setTempUnit} />
      {forecast && (
        <WeatherTimeline
          points={forecast.points}
          currentIndex={idx}
          onTimeChange={setIdx}
          tempUnit={tempUnit}
        />
      )}
    </div>
  )
}
