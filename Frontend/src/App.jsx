import { useState, useCallback } from 'react'
import ZipCodeInput from './components/ZipCodeInput'
import Map3DViewer from './components/Map3DViewer'
import WeatherOverlay from './components/WeatherOverlay'
import WeatherTimeline from './components/WeatherTimeline'
import WeatherStats from './components/WeatherStats'
import RadarMapViewer from './components/RadarMapViewer'
import FingerprintPage from './components/FingerprintPage'

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
<<<<<<< HEAD
=======
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
>>>>>>> 9d08d2747be6a74a4f39877a998825de54c2a1a4

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

  // Past Comparer Mode — split-screen fingerprint page
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
