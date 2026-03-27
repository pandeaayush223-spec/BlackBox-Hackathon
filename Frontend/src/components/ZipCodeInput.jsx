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

        {/* Cloud icon */}
        <div className="flex justify-center mb-4">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M36 22a8 8 0 00-15.5-2.5A6 6 0 1014 28h22a6 6 0 000-12z"
                  fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>

        <h1 className="text-6xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #1a3a5c, #2d6a9f, #1a3a5c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
          AETHEROS
        </h1>
        <p className="text-sm font-bold tracking-[0.3em] text-slate-700 mt-2 uppercase mb-8">
          3D Weather Visualization
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

          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              onClick={(e) => submit(e, 'forecast')}
              disabled={!valid || loading}
              className="w-full py-4 rounded-2xl font-bold text-base tracking-wide
                         bg-blue-600/70 hover:bg-blue-600/95 text-white
                         border border-blue-400/40 backdrop-blur-sm
                         transition-all duration-200
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Short-Term Forecast
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, 'radar')}
              disabled={!valid || loading}
              className="w-full py-4 rounded-2xl font-bold text-base tracking-wide
                         bg-blue-600/70 hover:bg-blue-600/95 text-white
                         border border-blue-400/40 backdrop-blur-sm
                         transition-all duration-200
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Radar Prediction
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, 'past')}
              disabled={!valid || loading}
              className="w-full py-4 rounded-2xl font-bold text-base tracking-wide
                         bg-blue-600/70 hover:bg-blue-600/95 text-white
                         border border-blue-400/40 backdrop-blur-sm
                         transition-all duration-200
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Past Comparer
            </button>
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
