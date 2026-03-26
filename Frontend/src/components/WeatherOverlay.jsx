import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ─── Rain particles ─── */
function Rain({ intensity = 1, wind = 0 }) {
  const count = Math.min(Math.max(Math.round(intensity * 2000), 600), 8000)
  const mesh = useRef()

  const [positions, velocities] = useMemo(() => {
    const p = new Float32Array(count * 3)
    const v = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 100
      p[i * 3 + 1] = Math.random() * 80
      p[i * 3 + 2] = (Math.random() - 0.5) * 60
      v[i * 3]     = (wind / 60) * (Math.random() * 0.5 + 0.5)
      v[i * 3 + 1] = -(Math.random() * 1.8 + 1.2)
      v[i * 3 + 2] = 0
    }
    return [p, v]
  }, [count, wind])

  useFrame((_, dt) => {
    const arr = mesh.current.geometry.attributes.position.array
    const s = Math.min(dt, 0.05) * 60
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += velocities[i * 3] * s
      arr[i * 3 + 1] += velocities[i * 3 + 1] * s
      if (arr[i * 3 + 1] < -10) {
        arr[i * 3]     = (Math.random() - 0.5) * 100
        arr[i * 3 + 1] = 80
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#a8c8ff" size={0.12} transparent opacity={0.55} sizeAttenuation />
    </points>
  )
}

/* ─── Snow particles ─── */
function Snow({ intensity = 1, wind = 0 }) {
  const count = Math.min(Math.max(Math.round(intensity * 800), 300), 4000)
  const mesh = useRef()
  const time = useRef(0)

  const [positions, seeds] = useMemo(() => {
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 100
      p[i * 3 + 1] = Math.random() * 80
      p[i * 3 + 2] = (Math.random() - 0.5) * 60
      s[i] = Math.random() * Math.PI * 2
    }
    return [p, s]
  }, [count])

  useFrame((_, dt) => {
    time.current += dt
    const arr = mesh.current.geometry.attributes.position.array
    const s = Math.min(dt, 0.05) * 60
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += (Math.sin(time.current + seeds[i]) * 0.04 + (wind / 120)) * s
      arr[i * 3 + 1] -= (0.15 + Math.random() * 0.05) * s
      if (arr[i * 3 + 1] < -10) {
        arr[i * 3]     = (Math.random() - 0.5) * 100
        arr[i * 3 + 1] = 80
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#e8f0ff" size={0.25} transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

/* ─── Lightning flash ─── */
function Lightning() {
  const [flash, setFlash] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.12) {
        setFlash(1)
        setTimeout(() => setFlash(0), 80)
        setTimeout(() => {
          if (Math.random() < 0.5) { setFlash(0.6); setTimeout(() => setFlash(0), 60) }
        }, 150)
      }
    }, 800)
    return () => clearInterval(id)
  }, [])

  if (!flash) return null
  return (
    <mesh position={[0, 0, -1]}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial color="white" transparent opacity={flash * 0.35} />
    </mesh>
  )
}

/* ─── Determine which effects to render ─── */
function getEffectType(code) {
  if (code == null) return 'none'
  if (code >= 95) return 'storm'
  if (code >= 80) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 85 && code <= 86) return 'snow'
  if (code >= 61) return 'rain'
  if (code >= 51) return 'drizzle'
  if (code >= 45 && code <= 48) return 'fog'
  if (code >= 2 && code <= 3) return 'cloudy'
  return 'none'
}

/* ─── Scene contents ─── */
function Effects({ weatherData }) {
  const effect = getEffectType(weatherData?.weather_code)
  const precip = weatherData?.precip_mm ?? 0
  const wind = weatherData?.wind_kph ?? 0

  return (
    <>
      <ambientLight intensity={0.3} />
      {(effect === 'rain' || effect === 'storm') && (
        <Rain intensity={Math.max(precip, 0.5)} wind={wind} />
      )}
      {effect === 'drizzle' && <Rain intensity={0.3} wind={wind} />}
      {effect === 'snow' && <Snow intensity={Math.max(precip, 0.5)} wind={wind} />}
      {effect === 'storm' && <Lightning />}
    </>
  )
}

/* ─── Main overlay ─── */
export default function WeatherOverlay({ weatherData }) {
  const effect = getEffectType(weatherData?.weather_code)
  if (effect === 'none' || effect === 'cloudy') return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        gl={{ alpha: true, antialias: false }}
        style={{ background: 'transparent' }}
      >
        <Effects weatherData={weatherData} />
      </Canvas>
    </div>
  )
}
