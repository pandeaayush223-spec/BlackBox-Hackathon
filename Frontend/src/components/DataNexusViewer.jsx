import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Line, Preload, Sphere } from '@react-three/drei'
import * as THREE from 'three'

// Helper to normalize data between 0 and 1
function normalize(val, min, max) {
  if (max === min) return 0.5
  return (val - min) / (max - min)
}

function GraphStructure({ title }) {
  const size = 10
  const divisions = 10

  return (
    <group position={[0, -2, 0]}>
      {/* Grid Floor */}
      <gridHelper args={[size, divisions, 0x10b981, 0x064e3b]} position={[0, 0, 0]} />
      {/* Background Grid */}
      <gridHelper args={[size, divisions, 0x10b981, 0x064e3b]} rotation={[Math.PI / 2, 0, 0]} position={[0, size / 2, -size / 2]} />
      
      {/* Axis Labels */}
      <Text position={[size / 2 + 1, 0, 0]} color="#10b981" fontSize={0.4} anchorX="left">Time</Text>
      <Text position={[0, size / 2 + 1, 0]} color="#10b981" fontSize={0.4} anchorY="bottom">Temp</Text>
      <Text position={[0, 0, size / 2 + 1]} color="#10b981" fontSize={0.4} anchorZ="top" rotation={[0, Math.PI / 2, 0]}>Humidity</Text>
      
      {/* Location Title */}
      <Text position={[0, size + 1, -size / 2]} color="#6ee7b7" fontSize={0.6} font="https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NJtEtq.woff">
        {title}
      </Text>
    </group>
  )
}

function DataPoints({ data }) {
  if (!data || data.length === 0) return null

  // Calculate mins and maxes
  const temps = data.map(d => d.temp)
  const hums = data.map(d => d.humidity)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const minHum = 0
  const maxHum = 100

  const size = 10 // Same as grid size
  const half = size / 2

  // Map to 3D Points: X = Time, Y = Temp, Z = Humidity
  const points = data.map((d, i) => {
    const x = normalize(i, 0, data.length - 1) * size - half
    const y = normalize(d.temp, minTemp, maxTemp) * size // 0 to size
    const z = normalize(d.humidity, minHum, maxHum) * size - half
    return new THREE.Vector3(x, y - 2, z) // -2 offset to align with grid floor
  })

  return (
    <group>
      {/* The trailing line */}
      <Line
        points={points}
        color="#34d399"
        lineWidth={3}
        dashed={false}
      />
      {/* The scatter spheres */}
      {points.map((p, i) => {
        // Color based on temperature
        const heat = normalize(data[i].temp, minTemp, maxTemp)
        const color = new THREE.Color().setHSL((1 - heat) * 0.6, 1, 0.5) // 0.6 = blue, 0 = red
        
        return (
          <Sphere key={i} position={p} args={[0.1, 16, 16]}>
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} />
          </Sphere>
        )
      })}
    </group>
  )
}

export default function DataNexusViewer({ location, forecast, onBack }) {
  const dataPoints = useMemo(() => forecast?.points || [], [forecast])

  return (
    <div className="w-full h-full relative" style={{ background: 'radial-gradient(circle at center, #022c22 0%, #000000 100%)' }}>
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [8, 5, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, 5, -10]} intensity={0.5} color="#10b981" />
          
          <GraphStructure title={location?.name || 'Unknown Location'} />
          <DataPoints data={dataPoints} />
          
          <OrbitControls 
            target={[0, 3, 0]}
            maxPolarAngle={Math.PI / 2 + 0.1} 
            minDistance={5} 
            maxDistance={25} 
            autoRotate 
            autoRotateSpeed={0.8}
          />
          <Preload all />
        </Canvas>
      </div>

      {/* Liquid Glass UI Overlay / Legend */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50 pointer-events-none">
        <div className="glass p-5 rounded-2xl border border-emerald-500/20 backdrop-blur-md bg-black/50 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <h2 className="text-emerald-400 font-semibold tracking-widest uppercase text-sm mb-3">Data Nexus Metrics</h2>
          
          <div className="flex flex-col gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-red-500" />
              <span><strong>Y-Axis (Height & Color):</strong> Temperature</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-0.5 bg-emerald-500" />
              <span><strong>X-Axis (Width):</strong> Time (48 Hours)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 border border-emerald-500/50" style={{ transform: 'skew(-20deg)' }} />
              <span><strong>Z-Axis (Depth):</strong> Humidity (0% - 100%)</span>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-emerald-500/50 uppercase tracking-widest text-center">Drag to rotate • Scroll to zoom</p>
        </div>
      </div>
    </div>
  )
}
