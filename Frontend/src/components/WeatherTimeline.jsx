import { useMemo, useCallback } from 'react'

function fmtHour(iso) {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00')
  const h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh} ${ampm}`
}

function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function weatherEmoji(code) {
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

export default function WeatherTimeline({ points, currentIndex, onTimeChange }) {
  const current = points[currentIndex]

  const markers = useMemo(() => {
    const m = []
    let lastDay = ''
    points.forEach((p, i) => {
      const day = p.datetime?.split('T')[0] ?? ''
      if (day !== lastDay) { m.push({ i, label: fmtDay(p.datetime) }); lastDay = day }
    })
    return m
  }, [points])

  const handleChange = useCallback((e) => {
    onTimeChange(parseInt(e.target.value, 10))
  }, [onTimeChange])

  const pct = points.length > 1 ? (currentIndex / (points.length - 1)) * 100 : 0

  return (
    <div className="absolute bottom-0 left-0 right-0 glass rounded-t-3xl"
         style={{ zIndex: 20 }}>
      <div className="max-w-5xl mx-auto px-6 py-4">
        {/* Current info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weatherEmoji(current?.weather_code)}</span>
            <div>
              <div className="text-white font-semibold text-sm">
                {fmtDay(current?.datetime)} · {fmtHour(current?.datetime)}
              </div>
              <div className="text-white/50 text-xs">
                💧 {current?.precip_mm ?? 0} mm · 💨 {current?.wind_kph?.toFixed(0) ?? 0} km/h · 💧 {current?.humidity ?? 0}%
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {current?.temp_c != null ? `${Math.round(current.temp_c)}°C` : '--'}
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            id="timeline-slider"
            type="range"
            min={0}
            max={points.length - 1}
            value={currentIndex}
            onChange={handleChange}
            className="w-full"
          />
          {/* progress fill */}
          <div className="absolute top-0 left-0 h-[6px] rounded-l-full pointer-events-none"
               style={{
                 width: `${pct}%`,
                 background: 'linear-gradient(90deg,#4facfe,#00f2fe)',
                 marginTop: '0px',
               }} />
        </div>

        {/* Day markers */}
        <div className="flex justify-between mt-2 text-[10px] text-white/40 select-none">
          {markers.slice(0, 7).map((m) => (
            <button key={m.i} onClick={() => onTimeChange(m.i)}
                    className="hover:text-white/80 transition-colors cursor-pointer bg-transparent border-none text-[10px] text-white/40">
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
