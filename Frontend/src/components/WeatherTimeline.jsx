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

export default function WeatherTimeline({ points, currentIndex, onTimeChange, tempUnit = 'C' }) {
  const current = points[currentIndex]
  const tempVal = current?.temp_c != null ? (tempUnit === 'C' ? current.temp_c : (current.temp_c * 9/5) + 32) : null;

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

  const handleInteraction = useCallback((clientX) => {
    const el = document.getElementById('timeline-interaction-area');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newIdx = Math.round((x / rect.width) * (points.length - 1));
    onTimeChange(newIdx);
  }, [onTimeChange, points.length]);

  const onMouseDown = (e) => {
    handleInteraction(e.clientX);
    const moveHandler = (moveE) => handleInteraction(moveE.clientX);
    const upHandler = () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  };

  const onTouchStart = (e) => {
    handleInteraction(e.touches[0].clientX);
    const moveHandler = (moveE) => handleInteraction(moveE.touches[0].clientX);
    const upHandler = () => {
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', upHandler);
    };
    window.addEventListener('touchmove', moveHandler);
    window.addEventListener('touchend', upHandler);
  };

  const pct = points.length > 1 ? (currentIndex / (points.length - 1)) * 100 : 0

  // Sparkline calculations
  const svgWidth = 1000;
  const svgHeight = 45;
  const temps = points.map(p => tempUnit === 'C' ? p.temp_c : (p.temp_c * 9/5) + 32);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  
  const sparklinePoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * svgWidth;
    const y = svgHeight - ((temps[i] - minTemp) / (maxTemp - minTemp || 1)) * (svgHeight - 12) - 6;
    return `${x},${y}`;
  }).join(' ');

  const currentCy = svgHeight - ((temps[currentIndex] - minTemp) / (maxTemp - minTemp || 1)) * (svgHeight - 12) - 6;

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
            {tempVal != null ? `${Math.round(tempVal)}°${tempUnit}` : '--'}
          </div>
        </div>

        {/* Interactive Wrapper Area (Massive Click Surface) */}
        <div 
          id="timeline-interaction-area"
          className="relative h-24 mt-2 select-none group cursor-ew-resize"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {/* Sparkline SVG */}
          <svg className="absolute top-2 left-0 w-full h-16 pointer-events-none drop-shadow-md" style={{ overflow: 'visible' }} preserveAspectRatio="none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
             <defs>
               <clipPath id="progressClip">
                 <rect x="-20" y="-20" width={(pct / 100) * svgWidth + 20} height={svgHeight + 40} />
               </clipPath>
               <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
               </linearGradient>
             </defs>
             
             {/* Background curve */}
             <polyline points={sparklinePoints} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
             
             {/* Progress curve (clipped) */}
             <g clipPath="url(#progressClip)">
               <polygon points={`0,${svgHeight} ${sparklinePoints} ${svgWidth},${svgHeight}`} fill="url(#sparkGradient)" opacity="0.4" />
               <polyline points={sparklinePoints} fill="none" stroke="#00f2fe" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
             </g>

             {/* Moving Dot indicator directly on sparkline */}
             {points.length > 0 && (
                <circle cx={(currentIndex / (points.length - 1)) * svgWidth} cy={currentCy} r="5" fill="#fff" stroke="#00f2fe" strokeWidth="2" className="transition-all duration-100 ease-linear" />
             )}
          </svg>

          {/* Scrubber Base Track */}
          <div className="absolute bottom-4 left-0 right-0 h-1.5 bg-white/10 rounded-full pointer-events-none" />
          
          {/* Progress fill */}
          <div className="absolute bottom-4 left-0 h-1.5 rounded-l-full pointer-events-none"
               style={{
                 width: `${pct}%`,
                 background: 'linear-gradient(90deg,#4facfe,#00f2fe)',
                 boxShadow: '0 0 15px rgba(0,242,254,0.4)',
                 transition: 'width 0.1s linear'
               }} />

          {/* Thumb & Tooltip */}
          <div className="absolute bottom-[10px] w-4 h-4 bg-white rounded-full pointer-events-none transform -translate-x-1/2 shadow-lg flex justify-center"
               style={{ left: `${pct}%`, border: '2.5px solid #00f2fe', transition: 'left 0.1s linear' }}>
             <div className="absolute bottom-7 bg-black/90 backdrop-blur-xl text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg border border-white/20 whitespace-nowrap shadow-2xl animate-fadeInUp">
               {fmtHour(current?.datetime)}
             </div>
          </div>
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
