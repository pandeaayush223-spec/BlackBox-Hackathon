import { useState, useEffect, useRef } from 'react'

export default function ZipCodeInput({ onSubmit, loading, error }) {
  const [zip, setZip] = useState('')
  const canvasRef = useRef(null)

  /* ---- animated background particles ---- */
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    let w = (cvs.width = window.innerWidth)
    let h = (cvs.height = window.innerHeight)

    const dots = Array.from({ length: 120 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: Math.random() * 0.6 + 0.15,
      r: Math.random() * 2.5 + 0.8,
      o: Math.random() * 0.45 + 0.08,
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      dots.forEach((d) => {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(79,172,254,${d.o})`
        ctx.fill()
        d.x += d.vx
        d.y += d.vy
        if (d.y > h) { d.y = -4; d.x = Math.random() * w }
        if (d.x < 0 || d.x > w) d.vx *= -1
      })
      raf = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => { w = cvs.width = window.innerWidth; h = cvs.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  const valid = /^\d{5}$/.test(zip)

  const submit = (e, mode) => {
    e.preventDefault()
    if (valid && !loading) onSubmit(zip, mode)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg,#06091c 0%,#0d1040 50%,#060d2e 100%)' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.5 }} />

      {/* Central glass panel */}
      <div className="relative z-10 text-center px-10 py-12 glass rounded-3xl max-w-2xl w-full mx-6 animate-fadeInUp" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 60px rgba(0,0,0,0.5)' }}>
        {/* Top highlight */}
        <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />

        <div className="text-6xl mb-4 animate-float">🌦️</div>

        <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tight"
            style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe,#a78bfa)',
                     WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AtmoSphere
        </h1>
        <p className="text-base md:text-lg text-white/40 font-light tracking-widest uppercase mb-10">
          3D Weather Visualization
        </p>

        <form onSubmit={(e) => submit(e, 'forecast')} className="flex flex-col items-center gap-6 justify-center w-full">
          <input
            id="zip-code-input"
            type="text"
            inputMode="numeric"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Enter ZIP code"
            className="w-64 px-6 py-4 rounded-2xl glass text-white text-lg font-medium
                       placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-all text-center"
            maxLength={5}
            disabled={loading}
            autoFocus
          />
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center w-full">
            <button
              type="button"
              onClick={(e) => submit(e, 'forecast')}
              disabled={!valid || loading}
              className="glass-btn px-6 py-4 rounded-2xl font-semibold text-white transition-all
                         duration-300 disabled:opacity-25 disabled:cursor-not-allowed flex-1 min-w-[180px] relative overflow-hidden"
              style={{
                background: valid ? 'linear-gradient(135deg, rgba(79,172,254,0.35), rgba(0,242,254,0.15))' : undefined,
                boxShadow: valid ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(79,172,254,0.25)' : undefined,
              }}
            >
              Short-Term Forecast
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, 'radar')}
              disabled={!valid || loading}
              className="glass-btn px-6 py-4 rounded-2xl font-semibold text-white transition-all
                         duration-300 disabled:opacity-25 disabled:cursor-not-allowed flex-1 min-w-[180px]"
              style={{
                background: valid ? 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(236,72,153,0.15))' : undefined,
                boxShadow: valid ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(168,85,247,0.25)' : undefined,
              }}
            >
              Radar Prediction
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, 'past')}
              disabled={!valid || loading}
              className="glass-btn px-6 py-4 rounded-2xl font-semibold text-white transition-all
                         duration-300 disabled:opacity-25 disabled:cursor-not-allowed flex-1 min-w-[180px]"
              style={{
                background: valid ? 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(239,68,68,0.15))' : undefined,
                boxShadow: valid ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(239,68,68,0.2)' : undefined,
              }}
            >
              Past Comparer
            </button>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-white mt-4">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading...
            </div>
          )}
        </form>

          {error && (
            <p className="mt-4 text-red-400 text-sm animate-fadeInUp">{error}</p>
          )}
        <p className="mt-8 text-white/20 text-xs">
          Enter any US zip code to view a 3D weather forecast
        </p>
        </div>
    </div>
  )
}
