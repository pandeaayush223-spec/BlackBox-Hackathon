import { useEffect, useState, useMemo } from 'react'

export default function PastComparerOverlay({ lat, lon, locationName, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/comparer?city=${encodeURIComponent(locationName)}`)
      .then(r => {
        if (!r.ok) throw new Error('Comparer data load failed')
        return r.json()
      })
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [locationName])

  // Get today's stats from current_year and exactly 1 year ago from last_year
  const stats = useMemo(() => {
    if (!data) return null
    const { current_year, last_year } = data
    if (!current_year.length || !last_year.length) return null
    
    // Most recent is the last entry in current_year
    const todayData = current_year[current_year.length - 1]
    
    // Find the equivalent date in last year (ignoring leap year complexities for now, just matching month/day)
    const todayDateStr = todayData.date // format YYYY-MM-DD
    const [y, m, d] = todayDateStr.split('-')
    
    const lastYearData = last_year.find(ly => ly.date.endsWith(`-${m}-${d}`)) || last_year[current_year.length - 1]

    return {
      today: todayData,
      lastYear: lastYearData,
      yearLabel: data.last_year_label
    }
  }, [data])

  if (loading) {
    return (
      <div className="absolute top-6 left-6 z-10 glass rounded-2xl p-6 text-white min-w-[300px]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/20 rounded w-1/4"></div>
          <div className="h-8 bg-white/20 rounded w-1/2"></div>
          <div className="h-20 bg-white/10 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="absolute top-6 left-6 z-10 glass rounded-2xl p-6 text-white shadow-2xl">
        <button onClick={onBack} className="block mb-4 text-cyan-400 hover:text-cyan-300">← Back</button>
        <p className="text-red-400">{error || "No data available."}</p>
      </div>
    )
  }

  const { today, lastYear, yearLabel } = stats
  const tempDiff = today.temp_max - lastYear.temp_max

  return (
    <div className="absolute top-6 left-6 z-10 glass rounded-2xl p-8 text-white max-w-sm animate-fadeInRight shadow-2xl border border-white/10">
      <button 
        onClick={onBack}
        className="mb-4 text-sm font-semibold tracking-wider text-orange-400 hover:text-orange-300 transition-colors uppercase flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="mb-8">
        <h2 className="text-4xl font-black mb-1 tracking-tight text-white drop-shadow-lg">
          {locationName}
        </h2>
        <p className="text-white/60 text-lg uppercase tracking-widest">Year-over-Year Climate</p>
      </div>

      <div className="space-y-6">
        <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-white/50 text-xs font-mono mb-1">TODAY</p>
          <div className="text-3xl font-light tabular-nums">
            {today.temp_max.toFixed(1)}<span className="text-xl text-white/50 ml-1">°C</span>
          </div>
          <p className="text-white/40 text-sm mt-1">Precip: {today.precip_mm.toFixed(1)} mm</p>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-1 flex items-center gap-2 border border-white/10">
            <span className={`text-sm font-bold ${tempDiff > 0 ? 'text-red-400' : tempDiff < 0 ? 'text-blue-400' : 'text-white'}`}>
              {tempDiff > 0 ? '+' : ''}{tempDiff.toFixed(1)}°C
            </span>
            <span className="text-[10px] uppercase text-white/40 font-mono tracking-widest">Difference</span>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-white/50 text-xs font-mono mb-1">EXACTLY {yearLabel}</p>
          <div className="text-3xl font-light tabular-nums">
            {lastYear.temp_max.toFixed(1)}<span className="text-xl text-white/50 ml-1">°C</span>
          </div>
          <p className="text-white/40 text-sm mt-1">Precip: {lastYear.precip_mm.toFixed(1)} mm</p>
        </div>
      </div>
    </div>
  )
}
