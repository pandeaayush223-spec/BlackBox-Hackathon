function weatherLabel(code) {
  if (code == null) return 'Loading…'
  if (code >= 95) return 'Thunderstorm'
  if (code >= 80) return 'Rain Showers'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 61) return 'Rain'
  if (code >= 51) return 'Drizzle'
  if (code >= 45) return 'Fog'
  if (code >= 2)  return 'Cloudy'
  if (code <= 1)  return 'Clear'
  return 'Unknown'
}

function weatherIcon(code) {
  if (code == null) return '🌡️'
  if (code >= 95) return '⛈️'
  if (code >= 80) return '🌧️'
  if (code >= 71 && code <= 77) return '🌨️'
  if (code >= 61) return '🌧️'
  if (code >= 51) return '🌦️'
  if (code >= 45) return '🌫️'
  if (code >= 2)  return '☁️'
  if (code <= 1)  return '☀️'
  return '🌡️'
}

export default function WeatherStats({ weatherData, locationName, onBack }) {
  const w = weatherData || {}

  return (
    <div className="absolute top-4 left-4 glass rounded-2xl p-5 min-w-[220px] animate-fadeInUp"
         style={{ zIndex: 20 }}>
      {/* Back button */}
      <button
        id="back-button"
        onClick={onBack}
        className="flex items-center gap-1 text-white/50 hover:text-white text-xs mb-3
                   transition-colors cursor-pointer bg-transparent border-none"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        New Search
      </button>

      {/* Location */}
      <h2 className="text-white font-bold text-lg leading-tight mb-1 truncate max-w-[200px]">
        {locationName || 'Location'}
      </h2>

      {/* Condition */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{weatherIcon(w.weather_code)}</span>
        <span className="text-white/60 text-sm">{weatherLabel(w.weather_code)}</span>
      </div>

      {/* Temp */}
      <div className="text-4xl font-black text-white mb-4"
           style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {w.temp_c != null ? `${Math.round(w.temp_c)}°C` : '--'}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Wind" value={w.wind_kph != null ? `${w.wind_kph.toFixed(0)} km/h` : '--'} icon="💨" />
        <Stat label="Humidity" value={w.humidity != null ? `${w.humidity}%` : '--'} icon="💧" />
        <Stat label="Precip" value={w.precip_mm != null ? `${w.precip_mm} mm` : '--'} icon="🌧️" />
        <Stat label="Clouds" value={w.cloud_cover != null ? `${w.cloud_cover}%` : '--'} icon="☁️" />
      </div>
    </div>
  )
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="text-white/40 mb-0.5">{icon} {label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  )
}
