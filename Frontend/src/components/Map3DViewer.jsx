import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Determine atmospheric tint based on weather code.
 */
function weatherTint(code) {
  if (code == null) return null
  if (code >= 95) return 'rgba(30,20,60,0.55)'   // storm
  if (code >= 61) return 'rgba(40,55,80,0.40)'    // rain
  if (code >= 71 && code <= 77) return 'rgba(200,210,230,0.25)' // snow
  if (code >= 45 && code <= 48) return 'rgba(180,180,190,0.45)' // fog
  if (code >= 2  && code <= 3)  return 'rgba(100,110,130,0.20)' // cloudy
  return null
}

export default function Map3DViewer({ lat, lon, weatherCode }) {
  const container = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return
    map.current = new maplibregl.Map({
      container: container.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [lon, lat],
      zoom: 12,
      pitch: 60,
      bearing: -15,
      antialias: true,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      /* 3D buildings from CartoDB vector tiles */
      const layers = map.current.getStyle().layers
      const labelLayer = layers.find(
        (l) => l.type === 'symbol' && l.layout && l.layout['text-field']
      )
      try {
        map.current.addLayer(
          {
            id: '3d-buildings',
            source: 'carto',
            'source-layer': 'building',
            filter: ['all', ['==', '$type', 'Polygon']],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#1a1e3a',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.7,
            },
          },
          labelLayer?.id
        )
      } catch (_) {
        /* building layer may not be available */
      }
    })

    return () => { map.current?.remove(); map.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* fly to new coords when lat/lon change */
  useEffect(() => {
    if (!map.current) return
    map.current.flyTo({ center: [lon, lat], zoom: 12, pitch: 60, bearing: -15, duration: 2000 })
  }, [lat, lon])

  const tint = weatherTint(weatherCode)

  return (
    <div className="absolute inset-0">
      <div ref={container} className="w-full h-full" />
      {tint && (
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-1000"
          style={{ background: tint }}
        />
      )}
    </div>
  )
}
