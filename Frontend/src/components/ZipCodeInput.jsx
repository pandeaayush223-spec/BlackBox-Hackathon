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
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-sky-400">
      {/* Slow moving clouds background */}
      <div 
        className="aero-cloud-bg" 
        style={{ backgroundImage: `url('/app_background_sunny_clouds_1774639985556.png')` }}
      />
      
      {/* Decorative glass overlay for more liquid feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="relative z-10 text-center px-4 animate-fadeInUp">
        <div className="text-7xl mb-6 animate-float filter drop-shadow-2xl">🌦️</div>

        <h1 className="text-6xl md:text-8xl font-black mb-3 tracking-tighter drop-shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg,#ffffff,rgba(255,255,255,0.6))',
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
          AtmoSphere
        </h1>
        <p className="text-sm md:text-base text-white/80 font-bold tracking-[0.3em] uppercase mb-12 drop-shadow-md">
          3D Weather Visualization
        </p>

        <form onSubmit={(e) => submit(e, 'forecast')} className="flex flex-col items-center gap-8 justify-center w-full max-w-3xl mx-auto">
          <div className="relative">
            <input
              id="zip-code-input"
              type="text"
              inputMode="numeric"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter ZIP code"
              className="w-72 px-8 py-5 rounded-[2.5rem] glass text-white text-xl font-bold
                         placeholder-white/40 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all text-center shadow-2xl"
              maxLength={5}
              disabled={loading}
              autoFocus
            />
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-5 justify-center w-full">
            <button
              type="button"
              onClick={(e) => submit(e, 'forecast')}
              disabled={!valid || loading}
              className="px-8 py-5 rounded-[2rem] glass font-bold text-white transition-all
                         duration-500 disabled:opacity-30 disabled:cursor-not-allowed flex-1 min-w-[200px] border border-white/30 hover:scale-105"
              style={{
                boxShadow: valid ? '0 10px 40px rgba(255,255,255,0.2)' : 'none',
              }}
            >
              Short-Term Forecast
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, 'radar')}
              disabled={!valid || loading}
              className="px-8 py-5 rounded-[2rem] glass font-bold text-white transition-all
                         duration-500 disabled:opacity-30 disabled:cursor-not-allowed flex-1 min-w-[200px] border border-white/30 hover:scale-105"
              style={{
                boxShadow: valid ? '0 10px 40px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Radar Prediction
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, 'past')}
              disabled={!valid || loading}
              className="px-8 py-5 rounded-[2rem] glass font-bold text-white transition-all
                         duration-500 disabled:opacity-30 disabled:cursor-not-allowed flex-1 min-w-[200px] border border-white/30 hover:scale-105"
              style={{
                boxShadow: valid ? '0 10px 40px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Past Comparer
            </button>
          </div>
          
          {loading && (
            <div className="flex items-center gap-3 text-white font-bold animate-pulse mt-4">
              <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          )}
        </form>

        {error && (
          <div className="mt-6 px-4 py-2 bg-red-500/80 backdrop-blur-md rounded-lg text-white text-sm font-bold border border-white/20 animate-bounce">
            {error}
          </div>
        )}

        <p className="mt-12 text-white/60 text-[10px] font-black uppercase tracking-widest">
          High Fidelity 3D Atmospheric Rendering
        </p>
      </div>
    </div>
  )
}
