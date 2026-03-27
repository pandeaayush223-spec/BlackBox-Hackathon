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

export default function WeatherStats({ weatherData, locationName, onBack, tempUnit, setTempUnit }) {
  const w = weatherData || {}

  const tempVal = w.temp_c != null ? (tempUnit === 'C' ? w.temp_c : (w.temp_c * 9/5) + 32) : null;

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

      {/* Temp & Unit Toggle */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl font-black text-white"
             style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {tempVal != null ? `${Math.round(tempVal)}°` : '--'}
        </div>
        
        <div className="flex bg-white/10 rounded-full p-1 border border-white/20 relative w-[4rem]">
          <div className="absolute top-1 bottom-1 w-[1.75rem] rounded-full bg-cyan-500/50 shadow-sm transition-transform duration-300"
               style={{ transform: tempUnit === 'C' ? 'translateX(0)' : 'translateX(1.75rem)' }} />
          <button onClick={() => setTempUnit('C')}
                  className={`flex-1 text-center text-xs font-bold z-10 py-1 rounded-full cursor-pointer transition-colors bg-transparent border-none ${tempUnit === 'C' ? 'text-white' : 'text-white/50'}`}>C</button>
          <button onClick={() => setTempUnit('F')}
                  className={`flex-1 text-center text-xs font-bold z-10 py-1 rounded-full cursor-pointer transition-colors bg-transparent border-none ${tempUnit === 'F' ? 'text-white' : 'text-white/50'}`}>F</button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Wind" value={w.wind_kph != null ? `${w.wind_kph.toFixed(0)} km/h` : '--'} icon="💨" />
        <HumidityDroplet percent={w.humidity} />
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

function HumidityDroplet({ percent }) {
  const p = percent || 0;
  return (
    <div className="rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div>
        <div className="text-white/40 mb-0.5 whitespace-nowrap" style={{ fontSize: '0.65rem' }}>💧 Humidity</div>
        <div className="text-white font-semibold">{percent != null ? `${percent}%` : '--'}</div>
      </div>
      <div className="relative w-8 h-8 filter drop-shadow-md">
        <svg viewBox="0 0 24 24" width="32" height="32" className="absolute top-0 left-0">
          <defs>
            <clipPath id="dropClip">
              <path d="M12 21.5c-3.18 0-5.75-2.57-5.75-5.75 0-2.33 1.96-5.46 5.75-11.45 3.79 5.99 5.75 9.12 5.75 11.45 0 3.18-2.57 5.75-5.75 5.75z" />
            </clipPath>
          </defs>
          <path d="M12 21.5c-3.18 0-5.75-2.57-5.75-5.75 0-2.33 1.96-5.46 5.75-11.45 3.79 5.99 5.75 9.12 5.75 11.45 0 3.18-2.57 5.75-5.75 5.75z" 
                fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <g clipPath="url(#dropClip)">
            <rect x="0" y={21.5 - (p / 100) * 17.5} width="24" height="24" fill="#00f2fe" opacity="0.8" className="transition-all duration-1000 ease-in-out" />
          </g>
        </svg>
      </div>
    </div>
  )
}
