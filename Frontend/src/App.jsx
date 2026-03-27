import { useState, useCallback } from 'react'
import ZipCodeInput from './components/ZipCodeInput'
import Map3DViewer from './components/Map3DViewer'
import WeatherOverlay from './components/WeatherOverlay'
import WeatherTimeline from './components/WeatherTimeline'
import WeatherStats from './components/WeatherStats'
import RadarMapViewer from './components/RadarMapViewer'
import PastComparerOverlay from './components/PastComparerOverlay'

const API = '/api/viz'

export default function App() {
  const [location, setLocation] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('forecast')

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

  // Past Comparer Mode
  if (mode === 'past') {
    return (
      <div className="w-screen h-screen relative overflow-hidden">
        {/* We reuse the 3D map but without live weather overlay, just the map */}
        <Map3DViewer lat={location.lat} lon={location.lon} weatherCode={null} />
        <PastComparerOverlay 
          lat={location.lat} 
          lon={location.lon} 
          locationName={location.name} 
          onBack={handleBack} 
        />
      </div>
    )
  }

  // Default: Short-Term Forecast Mode
  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Map3DViewer lat={location.lat} lon={location.lon} weatherCode={current?.weather_code} cloudCover={current?.cloud_cover} />
      <WeatherOverlay weatherData={current} />
      <WeatherStats weatherData={current} locationName={location.name} onBack={handleBack} />
      {forecast && (
        <WeatherTimeline
          points={forecast.points}
          currentIndex={idx}
          onTimeChange={setIdx}
        />
      )}
    </div>
  )
}
