import React, { useState, useEffect, useRef } from 'react'
import Map, { NavigationControl, Marker, Popup } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function SondeTrackerViewer({ location, onBack }) {
  const [sondes, setSondes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSonde, setSelectedSonde] = useState(null)

  // Fetch Live SondeHub Data
  const fetchData = async () => {
    try {
      const res = await fetch('https://api.v2.sondehub.org/sondes')
      if (!res.ok) throw new Error('Failed to fetch SondeHub telemetry')
      const data = await res.json()
      setSondes(data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Error connecting to SondeHub.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Poll every 15 seconds to simulate real-time stream
    const int = setInterval(fetchData, 15000)
    return () => clearInterval(int)
  }, [])

  const sondeList = Object.values(sondes)

  return (
    <div className="w-full h-full relative" style={{ background: '#000' }}>
      <button onClick={onBack} className="absolute top-4 left-4 z-50 text-rose-400 hover:text-rose-300 text-sm glass px-4 py-2 rounded-full cursor-pointer transition-colors shadow-[0_0_15px_rgba(244,63,94,0.3)]">
        &larr; Back
      </button>

      {/* Glass Header Info */}
      <div className="absolute top-4 right-4 z-50 glass p-4 rounded-2xl max-w-sm pointer-events-none border border-rose-500/20 backdrop-blur-xl bg-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <h1 className="text-2xl font-light text-white mb-1 uppercase tracking-widest flex items-center gap-2">
          <span>Sonde Tracker</span>
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,1)]" />
        </h1>
        <p className="text-white/60 text-xs tracking-wide">
          {loading ? 'Scanning upper atmosphere...' : `Tracking ${sondeList.length} active weather balloons globally.`}
        </p>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <Map
        initialViewState={{
          longitude: location?.lon || -98.5795,
          latitude: location?.lat || 39.8283,
          zoom: 3,
          pitch: 60,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        interactive={true}
      >
        <NavigationControl position="bottom-right" />

        {/* Global Balloon Markers */}
        {sondeList.map(sonde => {
          if (!sonde.lat || !sonde.lon) return null
          return (
            <Marker 
              key={sonde.serial} 
              longitude={sonde.lon} 
              latitude={sonde.lat}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation()
                setSelectedSonde(sonde)
              }}
            >
              <div className="group cursor-pointer flex flex-col items-center">
                {/* Visual "altitude stem" connecting to ground */}
                <div className="w-px bg-gradient-to-t from-transparent to-rose-500/50" Math style={{ height: `${Math.min(sonde.alt / 200, 100)}px` }} />
                {/* Balloon icon */}
                <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] border-2 border-white group-hover:scale-125 transition-transform" />
              </div>
            </Marker>
          )
        })}

        {/* Selected Balloon Telemetry Tooltip */}
        {selectedSonde && (
          <Popup
            longitude={selectedSonde.lon}
            latitude={selectedSonde.lat}
            anchor="bottom"
            onClose={() => setSelectedSonde(null)}
            offset={20}
            closeButton={false}
            className="sonde-popup"
          >
            <div className="glass p-4 rounded-xl border border-white/20 backdrop-blur-md bg-black/80 text-white min-w-[200px]">
              <h3 className="text-rose-400 font-bold uppercase tracking-widest text-xs border-b border-white/10 pb-2 mb-2">
                Flight: {selectedSonde.serial}
              </h3>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Altitude</span>
                  <span>{(selectedSonde.alt || 0).toFixed(0)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Vertical Speed</span>
                  <span className={selectedSonde.vel_v > 0 ? 'text-emerald-400' : 'text-orange-400'}>
                    {(selectedSonde.vel_v || 0).toFixed(1)} m/s {selectedSonde.vel_v > 0 ? '↑' : '↓'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Air Temp</span>
                  <span>{selectedSonde.temp !== undefined ? `${selectedSonde.temp.toFixed(1)}°C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Hardware</span>
                  <span>{selectedSonde.type || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Global popup styles to override maplibre defaults */}
      <style>{`
        .sonde-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .sonde-popup .maplibregl-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  )
}
