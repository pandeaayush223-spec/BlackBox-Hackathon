import { useRef, useEffect, useState, useCallback } from 'react'

// --- Helper functions ---

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  return Math.floor(diff / (1000 * 60 * 60 * 24)) - 1 // 0-indexed
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function tempToColor(temp) {
  const stops = [
    [5,  [59, 139, 212]],   // blue
    [15, [93, 202, 165]],   // teal
    [25, [239, 159, 39]],   // amber
  ]
  if (temp <= 5)  return [59, 139, 212]
  if (temp >= 25) return [226, 75, 74]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (temp >= t0 && temp <= t1) {
      const t = (temp - t0) / (t1 - t0)
      return c0.map((v, j) => Math.round(lerp(v, c1[j], t)))
    }
  }
  return [226, 75, 74]
}

// --- Constants ---

const BASE_RADIUS = 140
const MAX_SPIKE = 40
const cx = 200
const cy = 200

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_START_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

// --- Pure draw function ---

function drawFingerprint(ctx, data, progress, globalMaxPrecip, maxWindForCity, darkMode) {
  const todayDOY = getDayOfYear(new Date())
  const START_ANGLE = -Math.PI / 2 - (todayDOY / 365) * 2 * Math.PI
  const sliceAngle = (2 * Math.PI) / 365
  const slicesToDraw = Math.floor(progress * 365)

  // Draw slices
  for (let i = 0; i < slicesToDraw && i < data.length; i++) {
    const day = data[i]
    const angle = START_ANGLE + (i / 365) * 2 * Math.PI
    const avgTemp = (day.temp_max + day.temp_min) / 2
    const radius = BASE_RADIUS + (day.precip_mm / Math.max(globalMaxPrecip, 0.01)) * MAX_SPIKE
    const opacity = 0.4 + (day.wind_kph / maxWindForCity) * 0.6
    const color = tempToColor(avgTemp)

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, angle - sliceAngle / 2, angle + sliceAngle / 2)
    ctx.closePath()
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`
    ctx.fill()
  }

  // Inner circle cutout for city name
  ctx.beginPath()
  ctx.arc(cx, cy, BASE_RADIUS * 0.55, 0, Math.PI * 2)
  ctx.fillStyle = darkMode ? '#0f0f0f' : '#ffffff'
  ctx.fill()

  // Month tick marks and labels
  const tickInner = BASE_RADIUS + MAX_SPIKE + 4
  const tickOuter = BASE_RADIUS + MAX_SPIKE + 12
  const labelRadius = BASE_RADIUS + MAX_SPIKE + 22

  ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1

  for (let m = 0; m < 12; m++) {
    const angle = START_ANGLE + (MONTH_START_DAYS[m] / 365) * 2 * Math.PI
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    ctx.beginPath()
    ctx.moveTo(cx + cosA * tickInner, cy + sinA * tickInner)
    ctx.lineTo(cx + cosA * tickOuter, cy + sinA * tickOuter)
    ctx.stroke()

    const lx = cx + cosA * labelRadius
    const ly = cy + sinA * labelRadius

    ctx.save()
    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(MONTH_LABELS[m], lx, ly)
    ctx.restore()
  }

  // City name in center (only when fully drawn)
  if (progress === 1) {
    ctx.font = 'bold 16px Inter, system-ui, sans-serif'
    ctx.fillStyle = darkMode ? '#ffffff' : '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // data doesn't carry cityName, caller draws it via separate label or we skip
    // City name drawn by the component after calling this function
  }

  // Legend at bottom
  if (progress === 1) {
    const legendY = 382
    const legendItemWidth = 100
    const legendStartX = cx - (legendItemWidth * 3) / 2

    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    const labelColor = darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'

    // 1. Temp gradient swatch
    const gradW = 40
    const gradH = 8
    const gx = legendStartX + 10
    const gy = legendY - gradH / 2
    const grad = ctx.createLinearGradient(gx, 0, gx + gradW, 0)
    grad.addColorStop(0, 'rgb(59,139,212)')
    grad.addColorStop(0.33, 'rgb(93,202,165)')
    grad.addColorStop(0.66, 'rgb(239,159,39)')
    grad.addColorStop(1, 'rgb(226,75,74)')
    ctx.fillStyle = grad
    ctx.fillRect(gx, gy, gradW, gradH)
    ctx.fillStyle = labelColor
    ctx.textAlign = 'left'
    ctx.fillText('Temp', gx + gradW + 4, legendY)

    // 2. Rain spike shape
    const sx = legendStartX + legendItemWidth + 18
    ctx.beginPath()
    ctx.moveTo(sx, legendY + 4)
    ctx.lineTo(sx + 5, legendY - 8)
    ctx.lineTo(sx + 10, legendY + 4)
    ctx.closePath()
    ctx.fillStyle = darkMode ? 'rgba(100,180,255,0.6)' : 'rgba(59,139,212,0.6)'
    ctx.fill()
    ctx.fillStyle = labelColor
    ctx.textAlign = 'left'
    ctx.fillText('Rain', sx + 14, legendY)

    // 3. Opacity swatch
    const ox = legendStartX + legendItemWidth * 2 + 18
    for (let i = 0; i < 4; i++) {
      const alpha = 0.4 + (i / 3) * 0.6
      ctx.fillStyle = darkMode
        ? `rgba(255,255,255,${alpha})`
        : `rgba(0,0,0,${alpha})`
      ctx.fillRect(ox + i * 10, legendY - 4, 8, 8)
    }
    ctx.fillStyle = labelColor
    ctx.textAlign = 'left'
    ctx.fillText('Wind', ox + 44, legendY)
  }
}

// --- React Component ---

/**
 * @param {{
 *   data: Array<{date: string, temp_max: number, temp_min: number, precip_mm: number, wind_kph: number}>,
 *   cityName: string,
 *   globalMaxPrecip: number,
 *   loading: boolean,
 *   darkMode: boolean
 * }} props
 */
export default function FingerprintCanvas({ data, cityName, globalMaxPrecip, loading, darkMode }) {
  const canvasRef = useRef(null)
  const [tooltip, setTooltip] = useState({ visible: false })
  const maxWindRef = useRef(1)

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !data || !data.length) return
    const ctx = canvasRef.current.getContext('2d')
    const maxWindForCity = Math.max(...data.map(d => d.wind_kph), 1)
    maxWindRef.current = maxWindForCity

    let animId
    const start = performance.now()

    const frame = (now) => {
      const progress = Math.min((now - start) / 800, 1)
      const easedProgress = easeOut(progress)

      ctx.fillStyle = darkMode ? '#0f0f0f' : '#ffffff'
      ctx.fillRect(0, 0, 400, 400)

      drawFingerprint(ctx, data, easedProgress, globalMaxPrecip, maxWindForCity, darkMode)

      // Draw city name in center when fully loaded
      if (easedProgress === 1) {
        ctx.font = 'bold 16px Inter, system-ui, sans-serif'
        ctx.fillStyle = darkMode ? '#ffffff' : '#000000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cityName || '', cx, cy)
      }

      if (progress < 1) {
        animId = requestAnimationFrame(frame)
      }
    }

    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [data, globalMaxPrecip, darkMode, cityName])

  // Hover handler
  const todayDOY = getDayOfYear(new Date())
  const START_ANGLE = -Math.PI / 2 - (todayDOY / 365) * 2 * Math.PI

  const onMouseMove = useCallback((e) => {
    if (!canvasRef.current || !data || !data.length) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left - 200
    const my = e.clientY - rect.top - 200

    const dist = Math.sqrt(mx * mx + my * my)
    let angle = Math.atan2(my, mx)

    let normalized = angle - START_ANGLE
    while (normalized < 0) normalized += 2 * Math.PI
    while (normalized > 2 * Math.PI) normalized -= 2 * Math.PI
    const dayIndex = Math.floor((normalized / (2 * Math.PI)) * 365)

    if (dist >= BASE_RADIUS - 5 && dist <= BASE_RADIUS + MAX_SPIKE + 5 && dayIndex < data.length) {
      const day = data[dayIndex]
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        content: {
          date: formatDate(day.date),
          high: day.temp_max,
          low: day.temp_min,
          precip: day.precip_mm,
          wind: day.wind_kph
        }
      })
    } else {
      setTooltip(prev => prev.visible ? { visible: false } : prev)
    }
  }, [data, START_ANGLE])

  const onMouseLeave = useCallback(() => {
    setTooltip(prev => prev.visible ? { visible: false } : prev)
  }, [])

  // PNG download
  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !data || !data.length) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const maxWindForCity = maxWindRef.current

    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, 400, 400)
    drawFingerprint(ctx, data, 1, globalMaxPrecip, maxWindForCity, true)

    // Draw city name for export
    ctx.font = 'bold 16px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(cityName || '', cx, cy)

    const link = document.createElement('a')
    link.download = `${cityName || 'climate'}-climate-fingerprint.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [data, cityName, globalMaxPrecip])

  // Shimmer skeleton while loading
  if (loading && (!data || !data.length)) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-[400px] h-[400px] rounded-full relative overflow-hidden bg-white/5">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
          <p className="absolute inset-0 flex items-center justify-center text-cyan-400/60 text-sm">
            Loading fingerprint...
          </p>
        </div>
      </div>
    )
  }

  if (!data || !data.length) return null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-2xl"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        />
        {tooltip.visible && tooltip.content && (
          <div
            className="absolute pointer-events-none backdrop-blur-md bg-black/70 border border-cyan-500/30 rounded-lg p-2 text-xs text-white z-20"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              transform: tooltip.x > 280 ? 'translateX(-110%)' : 'none'
            }}
          >
            <p className="font-semibold text-cyan-300 mb-1">{tooltip.content.date}</p>
            <p>High: {tooltip.content.high.toFixed(1)}°C</p>
            <p>Low: {tooltip.content.low.toFixed(1)}°C</p>
            <p>Precip: {tooltip.content.precip.toFixed(1)} mm</p>
            <p>Wind: {tooltip.content.wind.toFixed(1)} kph</p>
          </div>
        )}
      </div>
      <button
        onClick={handleDownload}
        className="glass px-4 py-2 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 border border-white/10"
      >
        Download PNG
      </button>
    </div>
  )
}
