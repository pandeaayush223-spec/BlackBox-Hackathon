import { useState } from 'react'

/* ─── Main component ──────────────────────────────────────────── */
export default function ZipCodeInput({ onSubmit, loading, error }) {
  const [zip, setZip] = useState('')
  const valid = /^\d{5}$/.test(zip)

  const submit = (e, mode) => {
    e.preventDefault()
    if (valid && !loading) onSubmit(zip, mode)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* ── Fullscreen video background ── */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Dark blue tint overlay */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             background: 'linear-gradient(180deg, rgba(5,15,40,0.55) 0%, rgba(5,15,40,0.35) 50%, rgba(5,15,40,0.65) 100%)',
             zIndex: 1
           }} />

      {/* ── Apple-style glass card ── */}
      <div className="relative z-10 w-full max-w-md mx-6 animate-fadeInUp"
           style={{
             background: 'linear-gradient(160deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 100%)',
             backdropFilter: 'blur(48px) saturate(200%)',
             WebkitBackdropFilter: 'blur(48px) saturate(200%)',
             border: '1px solid rgba(255,255,255,0.18)',
             borderRadius: '28px',
             boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15), 0 32px 80px rgba(0,10,40,0.6)',
             padding: '48px 40px 40px',
           }}>
        {/* Top highlight stroke */}
        <div className="absolute top-0 left-12 right-12 h-px"
             style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }} />

        {/* Wordmark */}
        <div className="text-center mb-8">
          {/* Minimal cloud icon instead of emoji */}
          <svg width="48" height="32" viewBox="0 0 48 32" fill="none" className="mx-auto mb-5 opacity-90">
            <path d="M38 26H12C7.58 26 4 22.42 4 18C4 13.86 7.12 10.47 11.18 10.06C12.36 6.55 15.65 4 19.5 4C23.1 4 26.22 6.18 27.66 9.3C28.26 9.1 28.88 9 29.5 9C33.09 9 36 11.91 36 15.5C36 15.67 35.99 15.84 35.98 16H38C41.31 16 44 18.69 44 22C44 25.31 41.31 26 38 26Z"
                  fill="url(#cloudGrad)" />
            <defs>
              <linearGradient id="cloudGrad" x1="4" y1="4" x2="44" y2="26">
                <stop offset="0%" stopColor="rgba(147,210,255,0.9)" />
                <stop offset="100%" stopColor="rgba(79,172,254,0.7)" />
              </linearGradient>
            </defs>
          </svg>

          <h1 className="text-4xl font-bold tracking-tight mb-2"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #a8d8ff 60%, #4facfe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em'
              }}>
            AtmoSphere
          </h1>
          <p className="text-sm font-medium tracking-[0.18em] uppercase"
             style={{ color: 'rgba(160,210,255,0.55)' }}>
            3D Weather Visualization
          </p>
        </div>

        {/* ZIP input */}
        <form onSubmit={(e) => submit(e, 'forecast')} className="flex flex-col gap-3">
          <input
            id="zip-code-input"
            type="text"
            inputMode="numeric"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="ZIP Code"
            className="w-full text-center text-xl font-semibold tracking-widest focus:outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '16px 24px',
              color: '#fff',
              caretColor: '#4facfe',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              letterSpacing: '0.2em',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(79,172,254,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            maxLength={5}
            disabled={loading}
            autoFocus
          />

          {/* Mode buttons */}
          <div className="flex flex-col gap-2 mt-1">
            {[
              { mode: 'forecast', label: 'Short-Term Forecast', accent: [79,172,254] },
              { mode: 'radar',    label: 'Radar Prediction',    accent: [139,92,246] },
              { mode: 'past',     label: 'Nimbus DNA',          accent: [251,146,60] },
            ].map(({ mode, label, accent }) => {
              const [r,g,b] = accent
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={(e) => submit(e, mode)}
                  disabled={!valid || loading}
                  className="w-full font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: valid
                      ? `linear-gradient(135deg, rgba(${r},${g},${b},0.28) 0%, rgba(${r},${g},${b},0.10) 100%)`
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(${r},${g},${b},${valid ? 0.35 : 0.12})`,
                    borderRadius: '14px',
                    padding: '14px 20px',
                    color: valid ? `rgba(${r+60},${g+60},${b+60},1)` : 'rgba(255,255,255,0.3)',
                    boxShadow: valid ? `inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 16px rgba(${r},${g},${b},0.2)` : 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={e => { if (valid) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-white/60 text-sm mt-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading weather data…
            </div>
          )}

          {error && (
            <p className="text-center text-sm mt-1 animate-fadeInUp"
               style={{ color: 'rgba(255,120,120,0.85)' }}>{error}</p>
          )}
        </form>

        <p className="text-center text-xs mt-6"
           style={{ color: 'rgba(160,210,255,0.25)', letterSpacing: '0.05em' }}>
          Enter any US ZIP code to begin
        </p>
      </div>
    </div>
  )
}
