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

  const submit = (e) => {
    e.preventDefault()
    if (valid && !loading) onSubmit(zip)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg,#0a0e27 0%,#1a1040 50%,#0d1537 100%)' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.6 }} />

      <div className="relative z-10 text-center px-4 animate-fadeInUp">
        <div className="text-6xl mb-4 animate-float">🌦️</div>

        <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tight"
            style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe,#a78bfa)',
                     WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AtmoSphere
        </h1>
        <p className="text-base md:text-lg text-white/50 font-light tracking-widest uppercase mb-10">
          3D Weather Visualization
        </p>

        <form onSubmit={submit} className="flex items-center gap-3 justify-center">
          <input
            id="zip-code-input"
            type="text"
            inputMode="numeric"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Enter ZIP code"
            className="w-64 px-6 py-4 rounded-2xl glass text-white text-lg font-medium
                       placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all"
            maxLength={5}
            disabled={loading}
            autoFocus
          />
          <button
            id="explore-button"
            type="submit"
            disabled={!valid || loading}
            className="px-8 py-4 rounded-2xl font-semibold text-lg text-white transition-all
                       duration-300 disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              background: valid ? 'linear-gradient(135deg,#4facfe,#00f2fe)' : 'rgba(255,255,255,0.08)',
              boxShadow: valid ? '0 4px 30px rgba(79,172,254,0.4)' : 'none',
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Loading
              </span>
            ) : 'Explore'}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-red-400 text-sm animate-fadeInUp">{error}</p>
        )}

        <p className="mt-8 text-white/30 text-xs">
          Enter any US zip code to view a 7-day 3D weather forecast
        </p>
      </div>
    </div>
  )
}
