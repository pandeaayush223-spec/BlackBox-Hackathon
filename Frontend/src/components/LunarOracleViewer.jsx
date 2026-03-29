import React, { useState, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useTexture, Stars } from '@react-three/drei'
import * as THREE from 'three'

// --- Moon Math ---
function getMoonPhase(date) {
  // Approximate lunar cycle (29.53058867 days in seconds)
  const lp = 2551442.8
  const now = date.getTime() / 1000
  // Known new moon: Jan 6, 2000 18:14 UTC
  const newMoon = new Date('2000-01-06T18:14:00.000Z').getTime() / 1000
  let phase = ((now - newMoon) % lp) / lp
  if (phase < 0) phase += 1
  return phase
}

function getPhaseName(phase) {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

// --- 3D Moon Component ---
function Moon({ phase }) {
  const moonTex = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg')
  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001 // Slow atmospheric rotation
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        map={moonTex}
        bumpMap={moonTex}
        bumpScale={0.02}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

// --- Dynamic Lighting ---
function MoonLighting({ phase }) {
  const lightRef = useRef()
  
  useFrame(() => {
    if (lightRef.current) {
      // Phase 0 (New) -> light from behind (z = -1)
      // Phase 0.5 (Full) -> light from front (z = 1)
      const angle = phase * Math.PI * 2
      const x = Math.sin(angle) * 10
      const z = -Math.cos(angle) * 10
      lightRef.current.position.set(x, 0, z)
    }
  })

  return (
    <>
      <ambientLight intensity={0.02} />
      <directionalLight ref={lightRef} intensity={2.5} color="#ffffff" castShadow />
      {/* Subtle blue rim light for the "glass" twist effect */}
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#4facfe" />
    </>
  )
}

export default function LunarOracleViewer({ location, onBack }) {
  const [daysOffset, setDaysOffset] = useState(0)

  // Calculate target date
  const targetDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + daysOffset)
    return d
  }, [daysOffset])

  const phase = useMemo(() => getMoonPhase(targetDate), [targetDate])
  const phaseName = getPhaseName(phase)
  const illum = useMemo(() => {
    // 0 = 0%, 0.5 = 100%, 1.0 = 0%
    let i = (0.5 - Math.abs(phase - 0.5)) * 2
    return (i * 100).toFixed(1)
  }, [phase])

  return (
    <div className="w-full h-full relative" style={{ background: 'radial-gradient(circle at center, #111a3a 0%, #000000 100%)' }}>
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <MoonLighting phase={phase} />
          <Moon phase={phase} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Liquid Glass UI Overlay */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
        <div className="glass p-6 rounded-3xl border border-slate-400/20 backdrop-blur-xl bg-black/40 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col items-center">
          
          <div className="flex justify-between w-full items-end mb-6 border-b border-white/10 pb-4">
            <div>
              <h1 className="text-3xl font-light text-white tracking-widest uppercase">{phaseName}</h1>
              <p className="text-slate-400 text-sm tracking-widest mt-1">
                {targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-light text-slate-200">{illum}%</span>
              <p className="text-slate-500 text-xs tracking-widest uppercase mt-1">Illumination</p>
            </div>
          </div>

          {/* Time Scrubber */}
          <div className="w-full">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">
              <span>Today</span>
              <span>+30 Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={daysOffset}
              onChange={(e) => setDaysOffset(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer outline-none"
              style={{
                background: `linear-gradient(to right, #4facfe ${((daysOffset) / 30) * 100}%, #1e293b ${((daysOffset) / 30) * 100}%)`
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                appearance: none;
                width: 14px;
                height: 14px;
                background: #fff;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(79, 172, 254, 0.8);
                transition: transform 0.1s;
              }
              input[type=range]::-webkit-slider-thumb:hover {
                transform: scale(1.3);
              }
            `}</style>
          </div>

        </div>
      </div>
    </div>
  )
}
