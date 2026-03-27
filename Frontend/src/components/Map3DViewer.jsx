import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Canvas } from '@react-three/fiber'
import { Clouds, Cloud } from '@react-three/drei'
import * as THREE from 'three'

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

export default function Map3DViewer({ lat, lon, weatherCode, cloudCover = 0, isDay }) {
  const container = useRef(null)
  const map = useRef(null)
  const isDayRef = useRef(isDay)

  const getStyleUrl = (dayFlag) => dayFlag === 1
    ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

  useEffect(() => {
    if (map.current) return
    map.current = new maplibregl.Map({
      container: container.current,
      style: getStyleUrl(isDay),
      center: [lon, lat],
      zoom: 12,
      pitch: 60,
      bearing: -15,
      antialias: true,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.current.on('styledata', () => {
      /* 3D buildings from CartoDB vector tiles */
      if (map.current.getLayer('3d-buildings')) return;
      const layers = map.current.getStyle()?.layers
      if (!layers) return;
      
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
              'fill-extrusion-color': isDayRef.current === 1 ? '#78909c' : '#1a1e3a',
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

  /* reactively change map style on isDay toggle */
  useEffect(() => {
    if (!map.current) return;
    if (isDayRef.current !== isDay) {
        isDayRef.current = isDay;
        map.current.setStyle(getStyleUrl(isDay));
    }
  }, [isDay])

  const tint = weatherTint(weatherCode)

  const isCloudy = cloudCover > 10;
  const cloudDensity = cloudCover / 100;
  const cloudColor = (weatherCode >= 61 && weatherCode <= 95) ? '#aaaaaa' : '#ffffff';

  return (
    <div className="absolute inset-0">
      <div ref={container} className="w-full h-full" />
      {tint && (
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-1000 z-[4]"
          style={{ background: tint }}
        />
      )}
      {isDay === 1 && (
        <div 
          className="absolute inset-0 pointer-events-none transition-colors duration-1000 z-[5]" 
          style={{ background: 'rgba(84, 110, 122, 0.45)', mixBlendMode: 'multiply' }}
        />
      )}
      
      {/* 3D Volumetric Clouds Overlay */}
      {isCloudy && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 50], fov: 75 }} gl={{ alpha: true }} style={{ pointerEvents: 'none' }}>
            <ambientLight intensity={Math.PI / 1.0} />
            <directionalLight position={[0, 10, 0]} intensity={3} color={cloudColor} />
            <Clouds material={THREE.MeshLambertMaterial} limit={400}>
              {/* TOP LEFT */}
              <Cloud 
                bounds={[50, 8, 8]} color={cloudColor} seed={1}
                position={[-70, 28, 0]}
                volume={Math.max(cloudDensity * 18, 7)}
                opacity={Math.max(cloudDensity * 0.9, 0.45)}
                segments={40}
              />
              {/* TOP CENTER */}
              <Cloud 
                bounds={[60, 8, 8]} color={cloudColor} seed={2}
                position={[0, 32, 0]}
                volume={Math.max(cloudDensity * 18, 7)}
                opacity={Math.max(cloudDensity * 0.9, 0.45)}
                segments={40}
              />
              {/* TOP RIGHT */}
              <Cloud 
                bounds={[50, 8, 8]} color={cloudColor} seed={3}
                position={[70, 28, 0]}
                volume={Math.max(cloudDensity * 18, 7)}
                opacity={Math.max(cloudDensity * 0.9, 0.45)}
                segments={40}
              />
              {/* FAR LEFT SIDE */}
              <Cloud 
                bounds={[12, 30, 8]} color={cloudColor} seed={4}
                position={[-85, 10, 0]}
                volume={Math.max(cloudDensity * 15, 6)}
                opacity={Math.max(cloudDensity * 0.8, 0.35)}
                segments={30}
              />
              {/* FAR RIGHT SIDE */}
              <Cloud 
                bounds={[12, 30, 8]} color={cloudColor} seed={5}
                position={[85, 10, 0]}
                volume={Math.max(cloudDensity * 15, 6)}
                opacity={Math.max(cloudDensity * 0.8, 0.35)}
                segments={30}
              />
              {cloudDensity > 0.4 && (
                <>
                  {/* UPPER LEFT FILL */}
                  <Cloud 
                    bounds={[30, 8, 8]} color={cloudColor} seed={6}
                    position={[-50, 24, -5]}
                    volume={Math.max(cloudDensity * 12, 5)}
                    opacity={Math.max(cloudDensity * 0.7, 0.3)}
                    segments={25}
                  />
                  {/* UPPER RIGHT FILL */}
                  <Cloud 
                    bounds={[30, 8, 8]} color={cloudColor} seed={7}
                    position={[50, 24, -5]}
                    volume={Math.max(cloudDensity * 12, 5)}
                    opacity={Math.max(cloudDensity * 0.7, 0.3)}
                    segments={25}
                  />
                </>
              )}
            </Clouds>
          </Canvas>
        </div>
      )}
    </div>
  )
}


