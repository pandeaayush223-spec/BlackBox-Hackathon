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

        {/* AETHEROS Logo and Wordmark */}
        <div className="text-center mb-8">
          {/* Minimalist Sun + Wave Logo */}
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" className="mx-auto mb-6 opacity-95">
            {/* Sun Body */}
            <circle cx="50" cy="45" r="22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Rays */}
            <line x1="50" y1="12" x2="50" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="74" y1="21" x2="69" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="88" y1="45" x2="82" y2="45" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="26" y1="21" x2="31" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="12" y1="45" x2="18" y2="45" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Horizontal Water Lines */}
            <line x1="20" y1="65" x2="40" y2="65" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="65" x2="80" y2="65" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

            {/* Wave Path */}
            <path d="M35 65 C 45 65, 45 45, 55 45 C 65 45, 65 65, 75 65" 
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-[0.02em] mb-2 text-white uppercase">
            AETHEROS
          </h1>
          <p className="text-xs md:text-sm font-medium tracking-[0.1em] opacity-60 text-white">
            Minimalist Meteorology
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
