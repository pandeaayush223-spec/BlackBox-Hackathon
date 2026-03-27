import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function RadarMapViewer({ lat, lon, onBack }) {
  const mapContainer = useRef(null)
  const mapInstance = useRef(null)
  const [frames, setFrames] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  // Fetch RainViewer metadata
  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        // We want both past and radar (future forecast) frames
        const allFrames = [...data.radar.past, ...data.radar.nowcast]
        
        setFrames(allFrames.map(f => ({
          path: f.path,
          time: f.time * 1000
        })))
      })
      .catch(console.error)
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [lon, lat],
      zoom: 7,
      pitch: 45,
      interactive: true,
    })

    mapInstance.current = map

    map.on('load', () => {
      // Add a source and layer for radar
      map.addSource('rainviewer', {
        type: 'raster',
        tiles: [''], // Will be updated
        tileSize: 256
      })

      map.addLayer({
        id: 'radar-layer',
        type: 'raster',
        source: 'rainviewer',
        paint: {
          'raster-opacity': 0.7,
        }
      })
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [lat, lon])

  // Animation Loop
  useEffect(() => {
    if (!frames.length || !mapInstance.current || !isPlaying) return

    const timer = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length)
    }, 1000)

    return () => clearInterval(timer)
  }, [frames, isPlaying])

  // Update Radar Layer when frame changes
  useEffect(() => {
    if (!frames.length || !mapInstance.current) return
    const map = mapInstance.current
    if (!map.getSource('rainviewer')) return

    const frame = frames[currentFrame]
    const tileUrl = `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`

    // MapLibre requires removing and re-adding source/layer sometimes for smooth swap, 
    // or just updating the source tiles.
    const source = map.getSource('rainviewer')
    if (source && typeof source.setTiles === 'function') {
      source.setTiles([tileUrl])
    } else {
      // For maplibre 4, accessing style source might need specific method
      map.removeLayer('radar-layer')
      map.removeSource('rainviewer')
      map.addSource('rainviewer', { type: 'raster', tiles: [tileUrl], tileSize: 256 })
      map.addLayer({ id: 'radar-layer', type: 'raster', source: 'rainviewer', paint: { 'raster-opacity': 0.7 } })
    }
  }, [currentFrame, frames])

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-10 glass rounded-2xl p-6 text-white max-w-sm animate-fadeInRight shadow-2xl border border-white/10">
        <button 
          onClick={onBack}
          className="mb-4 text-sm font-semibold tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors uppercase flex items-center gap-2"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Radar Prediction
        </h2>
        <p className="text-white/60 mb-6 text-sm">Future precipitation movement (RainViewer)</p>
        
        {frames.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="text-lg font-medium font-mono text-cyan-300">
                {new Date(frames[currentFrame].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-4">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-300 ease-linear"
                style={{ width: `${((currentFrame + 1) / frames.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
