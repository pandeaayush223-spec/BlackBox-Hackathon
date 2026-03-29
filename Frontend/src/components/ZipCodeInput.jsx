import { useState } from 'react'

export default function ZipCodeInput({ onSubmit, loading, error }) {
  const [zip, setZip] = useState('')

  const valid = /^\d{5}$/.test(zip)

  const submit = (e, mode) => {
    e.preventDefault()
    if (valid && !loading) onSubmit(zip, mode)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Sky gradient background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #4a90d9 0%, #6ba3e0 30%, #8bb8e8 55%, #a8cdf0 75%, #c4dff5 100%)',
      }} />

      {/* Animated cloud layers */}
      <div className="clouds-layer clouds-layer-1" />
      <div className="clouds-layer clouds-layer-2" />
      <div className="clouds-layer clouds-layer-3" />

      {/* Drifting cloud blobs */}
      <div
        className="absolute top-10 left-10 w-64 h-32 bg-white/50 rounded-full blur-3xl"
        style={{ animation: 'cloudDriftLeft 12s ease-in-out infinite alternate' }}
      />
      <div
        className="absolute top-20 right-10 w-80 h-40 bg-blue-200/60 rounded-full blur-3xl"
        style={{ animation: 'cloudDriftRight 18s ease-in-out infinite alternate' }}
      />
      <div
        className="absolute bottom-10 left-20 w-72 h-36 bg-white/40 rounded-full blur-3xl"
        style={{ animation: 'cloudDriftSlow 22s ease-in-out infinite alternate' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-96 h-48 bg-blue-100/40 rounded-full blur-3xl"
        style={{ animation: 'cloudDriftLeft 15s ease-in-out infinite alternate-reverse' }}
      />

      {/* Central glass card */}
      <div className="relative z-10 text-center px-8 py-10 rounded-3xl max-w-md w-full mx-6 animate-fadeInUp"
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
             backdropFilter: 'blur(40px) saturate(180%)',
             WebkitBackdropFilter: 'blur(40px) saturate(180%)',
             border: '1px solid rgba(255,255,255,0.35)',
             boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 24px 60px rgba(0,0,0,0.15)',
           }}>

        {/* Custom AETHEROS logo & Title */}
        <h1 className="text-6xl font-black tracking-[0.02em] font-semibold flex flex-col items-center gap-4 text-slate-800"
            style={{
              background: 'linear-gradient(135deg, #1a3a5c, #2d6a9f, #1a3a5c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <path d="M24 10C24 6 20 2 16 2S8 6 8 10C8 14.5 11.5 18 16 18C20.5 18 24 14.5 24 10ZM16 6C18.2 6 20 7.8 20 10C20 12.2 18.2 14 16 14C13.8 14 12 12.2 12 10C12 7.8 13.8 6 16 6Z" fill="rgba(45,106,159,0.8)" />
            <path d="M42 30C38 30 35 27 35 23C35 19 38 16 42 16C46 16 48 19 48 23C48 27 46 30 42 30ZM42 20C40.3 20 39 21.3 39 23C39 24.7 40.3 26 42 26C43.7 26 45 24.7 45 23C45 21.3 43.7 20 42 20Z" fill="rgba(45,106,159,0.5)" />
            <path d="M30 42C26.7 42 24 39.3 24 36C24 32.7 26.7 30 30 30C33.3 30 36 32.7 36 36C36 39.3 33.3 42 30 42ZM30 34C28.9 34 28 34.9 28 36C28 37.1 28.9 38 30 38C31.1 38 32 37.1 32 36C32 34.9 31.1 34 30 34Z" fill="rgba(45,106,159,0.6)" />
            <path d="M12 28C8.7 28 6 30.7 6 34C6 37.3 8.7 40 12 40C15.3 40 18 37.3 18 34C18 30.7 15.3 28 12 28ZM12 36C10.9 36 10 35.1 10 34C10 32.9 10.9 32 12 32C13.1 32 14 32.9 14 34C14 35.1 13.1 36 12 36Z" fill="rgba(45,106,159,0.7)" />
          </svg>
          AETHEROS
        </h1>
        <p className="text-sm font-bold tracking-[0.3em] text-slate-700 mt-2 uppercase mb-8">
          Minimalist Meteorology
        </p>

        <form onSubmit={(e) => submit(e, 'forecast')} className="flex flex-col items-center gap-4 w-full">
          <input
            id="zip-code-input"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="ZIP Code"
            className="w-full rounded-2xl px-6 py-4
                       bg-white/60 backdrop-blur-sm
                       border-2 border-blue-300/60
                       text-slate-800 text-center text-xl font-bold tracking-widest
                       placeholder-slate-500
                       focus:outline-none focus:border-blue-500 focus:bg-white/80
                       transition-all duration-200"
            maxLength={5}
            disabled={loading}
            autoFocus
          />

          {/* Mode buttons */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { mode: 'forecast', label: 'Short-Term Forecast', accent: [79,172,254] },
              { mode: 'radar',    label: 'Radar Prediction',    accent: [139,92,246] },
              { mode: 'past',     label: 'Nimbus DNA',          accent: [251,146,60] },
              { mode: 'lunar',    label: 'Lunar Oracle',        accent: [148,163,184] },
              { mode: 'nexus',    label: 'Data Nexus',          accent: [16,185,129] },
              { mode: 'sonde',    label: 'Sonde Tracker',       accent: [236,72,153] },
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
            <div className="flex items-center gap-2 text-white/60 mt-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading...
            </div>
          )}
        </form>

        {error && (
          <p className="text-red-600 font-bold text-sm mt-1 animate-fadeInUp">{error}</p>
        )}
        <p className="text-slate-600 font-semibold text-sm mt-2">
          Enter any US ZIP code to begin
        </p>
      </div>
    </div>
  )
}
