import React from 'react'
import {
  CloudIcon,
  GlobeAltIcon,
  ClockIcon,
  MoonIcon,
  ChartBarIcon,
  MapIcon,
  HomeIcon
} from '@heroicons/react/24/outline'

const MODES = [
  { id: 'forecast', label: 'Forecast', icon: CloudIcon, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'radar', label: 'Radar', icon: GlobeAltIcon, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { id: 'past', label: 'DNA', icon: ClockIcon, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { id: 'lunar', label: 'Lunar', icon: MoonIcon, color: 'text-slate-300', bg: 'bg-slate-500/20' },
  { id: 'nexus', label: 'Nexus', icon: ChartBarIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { id: 'sonde', label: 'Sondes', icon: MapIcon, color: 'text-rose-400', bg: 'bg-rose-500/20' }
]

export default function ModeNavigation({ currentMode, setMode, onHome }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2">
      <button 
        onClick={onHome}
        className="glass p-2.5 rounded-full hover:bg-white/10 transition-colors shadow-lg border border-white/20 mr-2 backdrop-blur-xl bg-black/40"
        title="Change Location"
      >
        <HomeIcon className="w-5 h-5 text-white/80" />
      </button>

      <div className="glass p-1.5 rounded-full border border-white/20 shadow-lg flex items-center backdrop-blur-xl bg-black/40">
        {MODES.map(mode => {
          const isActive = currentMode === mode.id
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              onClick={() => setMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                isActive 
                  ? `${mode.bg} ${mode.color} shadow-[0_0_15px_rgba(255,255,255,0.1)]` 
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className={`${isActive ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none hidden md:block'} transition-all overflow-hidden whitespace-nowrap`}>
                {mode.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
