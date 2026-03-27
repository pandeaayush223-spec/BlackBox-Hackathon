import { useState } from 'react'

export default function RadarMapViewer({ lat, lon, onBack }) {
  const [activeLayer, setActiveLayer] = useState('rain')

  return (
    <div className="absolute inset-0 z-0 bg-black">
      <iframe
        width="100%"
        height="100%"
        src={`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=7&level=surface&overlay=${activeLayer}&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=${lat}&detailLon=${lon}&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`}
        frameBorder="0"
        title="Windy Map"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-10 glass rounded-2xl p-6 text-white max-w-sm animate-fadeInRight shadow-2xl border border-white/10 pointer-events-auto">
        <button 
          onClick={onBack}
          className="mb-4 text-sm font-semibold tracking-wider text-pink-400 hover:text-pink-300 transition-colors uppercase flex items-center gap-2"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Future Prediction
        </h2>
        <p className="text-white/60 mb-6 text-sm">48+ Hour Global Weather Model (Windy.com)</p>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${activeLayer === 'rain' ? 'bg-pink-500 border-pink-400' : 'border-white/20 group-hover:border-white/50'}`}>
              {activeLayer === 'rain' && <span className="text-white text-sm">✓</span>}
            </div>
            <input 
              type="radio" 
              name="layer" 
              value="rain" 
              className="hidden" 
              checked={activeLayer === 'rain'} 
              onChange={() => setActiveLayer('rain')} 
            />
            <span className="text-lg font-medium">Rain / Precipitation</span>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${activeLayer === 'wind' ? 'bg-purple-500 border-purple-400' : 'border-white/20 group-hover:border-white/50'}`}>
              {activeLayer === 'wind' && <span className="text-white text-sm">✓</span>}
            </div>
            <input 
              type="radio" 
              name="layer" 
              value="wind" 
              className="hidden" 
              checked={activeLayer === 'wind'} 
              onChange={() => setActiveLayer('wind')} 
            />
            <span className="text-lg font-medium">Wind Pattern</span>
          </label>
        </div>
      </div>
    </div>
  )
}
