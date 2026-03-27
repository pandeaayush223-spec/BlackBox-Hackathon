import { useState, useCallback, useEffect } from 'react'
import ZipCodeInput from './components/ZipCodeInput'
import Map3DViewer from './components/Map3DViewer'
import WeatherOverlay from './components/WeatherOverlay'
import WeatherTimeline from './components/WeatherTimeline'
import WeatherStats from './components/WeatherStats'
import RadarMapViewer from './components/RadarMapViewer'
import FingerprintPage from './components/FingerprintPage'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const API = `${API_BASE}/viz`

function DayNightIndicator({ isDay }) {
  if (isDay == null) return null;
  const isDaytime = isDay === 1;

  return (
    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none animate-fadeInDown flex flex-col items-center gap-1">
      {isDaytime ? (
        /* ── SUN ── */
        <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
          {/* Outer soft glow */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(250,204,21,0.35) 0%, transparent 70%)',
            transform: 'scale(1.8)',
          }} />
          {/* SVG: core + rays */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="animate-spin" style={{ animationDuration: '20s', animationTimingFunction: 'linear' }}>
            {/* Rays */}
            {[0,45,90,135,180,225,270,315].map((angle, i) => (
              <line key={i}
                x1="36" y1="8" x2="36" y2="14"
                stroke="rgba(250,204,21,0.7)" strokeWidth="2.5" strokeLinecap="round"
                transform={`rotate(${angle} 36 36)`}
              />
            ))}
          </svg>
          {/* Core disc */}
          <div className="absolute rounded-full" style={{
            width: 36, height: 36,
            background: 'radial-gradient(circle at 38% 35%, #fde68a 0%, #facc15 60%, #f59e0b 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(180,100,0,0.3), 0 0 24px rgba(250,204,21,0.7)',
          }} />
        </div>
      ) : (
        /* ── MOON ── */
        <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
          {/* Outer soft glow */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
            transform: 'scale(1.8)',
          }} />
          {/* Core crescent via SVG */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="18"
              fill="url(#moonGrad)"
              style={{ filter: 'drop-shadow(0 0 10px rgba(14,165,233,0.6))' }}
            />
            {/* Crescent cutout illusion */}
            <circle cx="44" cy="30" r="13" fill="#0a0e27" opacity="0.85" />
            <defs>
              <radialGradient id="moonGrad" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="60%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}
      <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: isDaytime ? 'rgba(250,204,21,0.7)' : 'rgba(14,165,233,0.7)' }}>
        {isDaytime ? 'Day' : 'Night'}
      </span>
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
  const [tempUnit, setTempUnit] = useState('F')
  const [fingerprint, setFingerprint] = useState(null)
  const [fingerprintLoading, setFingerprintLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'past' || !location) return
    setFingerprintLoading(true)
    setFingerprint(null)
    fetch(`${API_BASE}/fingerprint?city=${encodeURIComponent(location.name)}`)
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

  // Past Comparer Mode — fingerprint radial chart
  if (mode === 'past') {
    return <FingerprintPage initialCity={location.name} onBack={handleBack} />
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
