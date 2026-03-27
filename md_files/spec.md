# Weather Visualizer — Project Spec v2
> Updated from design interview. All decisions below supersede v1 where they conflict.
 
---
 
## Overview
 
**AtmoSphere 3D** is an immersive weather visualization app. It replaces static charts with a fully interactive 3D globe (via MapLibre) topped with incredibly realistic, data-driven volumetric clouds (React Three Fiber). The UI offers three distinct exploration modes for any searched ZIP code:

1. **Short-Term Forecast:** A 3D map overlay showing real-time conditions, 24h timeline, and accurate 3D clouds generated from live `cloud_cover` data.
2. **Radar Prediction:** A 48+ hour future global weather model powered natively by Windy.com, featuring interactive Rain and Wind toggles.
3. **Past Comparer:** A "Year-over-Year" climate time machine that contrasts today's live temperature and precipitation against the exact same day last year.
 
---
 
## Stack
 
| Layer | Technology |
|---|---|
| Frontend | React + **JavaScript** (not TypeScript — speed over strictness) |
| Backend | FastAPI (Python) |
| Weather data | open-meteo API (free, no key required) |
| Frontend hosting | Vercel |
| Backend hosting | Render (free tier) |
| Caching | In-memory Python dict (no database needed) |
| Testing | Vitest (similarity algorithm + canvas math only) |
 
> **No TypeScript.** Use plain JS with JSDoc comments for editor hints where helpful. No tsconfig, no type checking in the build pipeline.
 
---
 
## Architecture (MVC)
 
```
open-meteo API
     ↓
 services/open_meteo.py     ← Model: fetches + shapes raw data
     ↓
 routes/weather.py          ← Controller: FastAPI route handlers
     ↓
 React components           ← View: renders, no business logic
```
 
**Key rule:** React components never call open-meteo directly. They only talk to the FastAPI backend.
 
---
 
## Folder Structure
 
```
project/
├── backend/
│   ├── main.py                  # FastAPI app entry point + CORS config
│   ├── routes/
│   │   └── weather.py           # GET /weather, GET /forecast, GET /fingerprint, GET /similarity
│   ├── models/
│   │   └── weather.py           # Pydantic schemas
│   └── services/
│       ├── open_meteo.py        # Calls open-meteo, returns clean data
│       └── cache.py             # In-memory cache (1hr TTL)
│
└── frontend/
   └── src/
       ├── components/
       │   ├── Map3DViewer.jsx         # MapLibre globe + 3D Volumetric Clouds overlay
       │   ├── RadarMapViewer.jsx      # Future 48h Prediction Map (Windy embed integration)
       │   ├── PastComparerOverlay.jsx # Year-over-year dynamic stats comparison UI
       │   ├── ZipCodeInput.jsx        # Glassmorphism landing screen with 3 feature buttons
       │   ├── WeatherOverlay.jsx      # Live stats dashboard
       │   ├── WeatherTimeline.jsx     # 24h horizontal interactive strip
       │   └── WeatherStats.jsx        # Detailed current conditions overlay
       ├── hooks/
       │   └── useWeather.js           # Split fetches: current first, fingerprint separately
       └── types/
           └── weather.js              # JSDoc type definitions (no TypeScript)
```
 
---
 
## API Endpoints
 
### `GET /weather?city=London`
Returns current conditions for a city.
 
```python
class CurrentWeather(BaseModel):
   city: str
   temp_c: float
   wind_kph: float
   humidity: int
   condition: str        # "clear" | "rain" | "storm" | "snow" | "cloudy"
   precip_mm: float
   lat: float
   lon: float
```
 
### `GET /forecast?city=London`
Returns next 24 hours of hourly data.
 
```python
class ForecastPoint(BaseModel):
   hour: int
   temp_c: float
   wind_kph: float
   precip_mm: float
 
class ForecastResponse(BaseModel):
   city: str
   points: list[ForecastPoint]   # 24 items
```
 
### `GET /fingerprint?city=London`
Returns a full year (365 days) of daily historical data. Checks cache first.
 
```python
class DayData(BaseModel):
   date: str
   temp_max: float
   temp_min: float
   precip_mm: float
   wind_kph: float
 
class FingerprintResponse(BaseModel):
   city: str
   lat: float
   lon: float
   days: list[DayData]              # 365 items
   similarity_scores: dict[str, float]
   fallback_used: bool              # True if sparse data → nearest major city substituted
   fallback_city: str | None        # Name of substituted city if fallback_used
```
 
**Historical data gaps:** If the archive API returns incomplete or empty data for a searched location, fall back silently to the nearest precomputed major city's data. Set `fallback_used: true` and `fallback_city: "<name>"` in the response. The frontend must display a visible warning banner when `fallback_used` is true, e.g. *"Limited data for Ulaanbaatar — showing nearest match: Novosibirsk."*
 
### `GET /comparer?city=London`
Fetches and aggregates historical data from open-meteo, returning an array of daily stats for exactly one year ago vs. the current year up to today.

### `GET /similarity?city=London`
Compares fingerprint against ~15 precomputed cities. Returns top 3 matches as plain text/JSON. **No drill-down UI** — results displayed as text only (city name + score).
 
### `GET /geocode/search?name=Springfield`
New endpoint wrapping the open-meteo geocoding API. Returns the top 5 candidate results so the frontend can render a disambiguation dropdown. Each result includes `name`, `country`, `admin1` (state/region), `lat`, `lon`, `population`.
 
---
 
## CORS Configuration
 
FastAPI must include explicit CORS middleware. Configure in `main.py`:
 
```python
from fastapi.middleware.cors import CORSMiddleware
 
app.add_middleware(
   CORSMiddleware,
   allow_origins=[
       "http://localhost:5173",           # Vite dev server
       "https://<your-app>.vercel.app",   # Production Vercel domain
   ],
   allow_methods=["GET"],
   allow_headers=["*"],
)
```
 
Set the production Vercel domain as an environment variable `ALLOWED_ORIGIN` on Render. Do not hardcode it.
 
Frontend uses `import.meta.env.VITE_API_URL` (set in Vercel env vars) pointing to the Render service URL.
 
---
 
## open-meteo API Usage
 
**Current weather:**
```
https://api.open-meteo.com/v1/forecast
 ?latitude={lat}&longitude={lon}
 &current=temperature_2m,windspeed_10m,precipitation,weathercode,relativehumidity_2m
 &timezone=auto
```
 
**24h forecast:**
```
https://api.open-meteo.com/v1/forecast
 ?latitude={lat}&longitude={lon}
 &hourly=temperature_2m,windspeed_10m,precipitation
 &forecast_days=1
 &timezone=auto
```
 
**Historical fingerprint (full year):**
```
https://archive-api.open-meteo.com/v1/archive
 ?latitude={lat}&longitude={lon}
 &start_date=2024-01-01
 &end_date=2024-12-31
 &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max
 &timezone=auto
```
 
**Geocoding / disambiguation:**
```
https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=en&format=json
```
 
---
 
## Caching (no database)
 
```python
# services/cache.py
from datetime import datetime, timedelta
 
_cache = {}
 
def get_cached(key: str):
   if key in _cache:
       data, timestamp = _cache[key]
       if datetime.now() - timestamp < timedelta(hours=1):
           return data
   return None
 
def set_cached(key: str, data: dict):
   _cache[key] = (data, datetime.now())
```
 
**Cold start behavior:** Render free tier spins down after ~15 min of inactivity, destroying the in-memory cache. This is **accepted** — precomputation is fast enough that the first cold-start request is tolerable. No serialization or persistence needed.
 
**Precomputed cities** (warm at startup):
```python
PRECOMPUTED_CITIES = [
   "London", "Dubai", "Reykjavik", "New York", "Tokyo",
   "Sydney", "Singapore", "Cairo", "Oslo", "Miami",
   "Columbus", "Mumbai", "São Paulo", "Nairobi", "Vancouver"
]
```
 
---
 
## Climate Fingerprint Visual
 
### Canvas Setup
 
Drawn on an HTML `<canvas>` element, **400×400px**, desktop-only (no responsive resizing).
 
**Dark/light mode:** User-toggleable via a button in the UI. Canvas background color and legend colors must respond to the mode. Use CSS variables on the surrounding container; the canvas itself should be re-rendered when mode toggles (trigger `useEffect` dependency on mode).
 
| Mode | Canvas bg | Legend text |
|---|---|---|
| Dark | `#0f0f0f` | `#e0e0e0` |
| Light | `#ffffff` | `#1a1a1a` |
 
### Ring Orientation — Animated to Today
 
Do **not** use a fixed `-Math.PI / 2` start offset. Instead:
 
1. Compute `todayIndex` = day-of-year for today's date (0–364).
2. Place `todayIndex` at the **12 o'clock position**.
3. Animate the ring rotating from `startAngle = 0` to `finalAngle` over ~800ms on load using `requestAnimationFrame`, easing in.
 
```javascript
const todayIndex = getDayOfYear(new Date())  // 0-indexed
const todayAngle = -Math.PI / 2              // 12 o'clock
const startOffset = todayAngle - (todayIndex / 365) * 2 * Math.PI
```
 
This means January 1 may not be at the top — the ring is climatically anchored to the present day.
 
### Color Encoding (per day)
 
| Variable | Visual encoding |
|---|---|
| Avg temperature `(temp_max + temp_min) / 2` | Slice color |
| Precipitation | Spike length outward from base radius |
| Wind speed | Slice opacity |
 
**Color scale:**
- `< 5°C` → blue `#3B8BD4`
- `5–15°C` → teal `#5DCAA5`
- `15–25°C` → amber `#EF9F27`
- `> 25°C` → red `#E24B4A`
- Interpolate smoothly between thresholds (linear lerp between hex values).
 
### Precipitation Normalization — Global Scale
 
Normalization is **global across all precomputed cities**, not per-city. This preserves climatically meaningful differences — Mumbai's monsoon spikes should visually dominate compared to Columbus's mild rain.
 
At backend startup, compute `global_max_precip` = the single highest daily precipitation value across all 15 precomputed city datasets. Return this value in the `FingerprintResponse` so the frontend can normalize consistently.
 
```python
class FingerprintResponse(BaseModel):
   ...
   global_max_precip_mm: float   # Add this field
```
 
For user-searched cities not in the precomputed list, use the same `global_max_precip` value (not the searched city's own max).
 
### Canvas Math
 
```javascript
const angle = startOffset + (dayIndex / 365) * 2 * Math.PI
const radius = BASE_RADIUS + (precip_mm / globalMaxPrecip) * MAX_SPIKE
const opacity = 0.4 + (wind_kph / maxWindForCity) * 0.6
const color = tempToColor(avgTemp)
 
ctx.beginPath()
ctx.moveTo(cx, cy)
ctx.arc(cx, cy, radius, angle - sliceAngle / 2, angle + sliceAngle / 2)
ctx.closePath()
ctx.fillStyle = colorWithOpacity(color, opacity)
ctx.fill()
```
 
Wind opacity remains per-city normalized (not global) since it affects readability, not cross-city comparison.
 
### Canvas Annotations
 
Draw these **on the canvas itself** (not DOM overlays):
 
1. **City name** — centered in the inner ring (white/dark text depending on mode, ~16px bold)
2. **Month tick marks** — 12 small radial ticks at month boundaries around the perimeter, labeled with 3-letter month abbreviations
3. **Legend** — drawn outside the ring (bottom area of canvas): small color swatch + "Temp", spike icon + "Rain", opacity swatch + "Wind"
 
### Hover Tooltip
 
Use a transparent DOM `<div>` overlay (not canvas drawing) positioned absolutely over the canvas. On `mousemove`:
 
1. Convert mouse `(x, y)` → polar `(angle, distance)` relative to canvas center.
2. Map angle → day index using the same `startOffset` used to render.
3. If `distance` is within the fingerprint band (BASE_RADIUS - MAX_SPIKE to BASE_RADIUS + MAX_SPIKE), show tooltip with:
  - Date (e.g. "March 15")
  - High / Low temps
  - Precipitation (mm)
  - Wind speed (kph)
4. If mouse is over the **center ring** (distance < BASE_RADIUS - MAX_SPIKE), show city stats:
  - Annual avg temp
  - Total annual precipitation
  - Windiest month
 
Hide tooltip on `mouseleave`.
 
### PNG Download
 
Add a **Download** button below the canvas. On click:
 
```javascript
const link = document.createElement('a')
link.download = `${cityName}-climate-fingerprint.png`
link.href = canvasRef.current.toDataURL('image/png')
link.click()
```
 
The downloaded image should include the canvas background color (set `canvas.style.background` or fill a rect before drawing).
 
---
 
## City Search — Disambiguation Dropdown
 
When the user submits a search:
 
1. Call `GET /geocode/search?name={query}` → receive up to 5 candidates.
2. If exactly 1 result → proceed directly to weather fetch.
3. If 2–5 results → render a dropdown below the search bar listing each as:
  `City, State/Region, Country` (e.g. "Springfield, Illinois, United States")
4. User selects one → fetch weather using that result's `lat`/`lon` directly (bypass further geocoding).
5. If 0 results → show inline error: *"City not found. Try adding a country (e.g. 'Valencia, Spain')."*
 
---
 
## Loading UX — Split Fetches
 
The `useWeather` hook fires **two separate fetch groups**, not one `Promise.all`:
 
**Group 1 (fast):** `/weather` + `/forecast` — resolves in < 1s for cached cities.
**Group 2 (slow):** `/fingerprint` — may take 2–4s for uncached cities.
 
```javascript
// hooks/useWeather.js
export const useWeather = (city) => {
 const [current, setCurrent] = useState(null)
 const [forecast, setForecast] = useState([])
 const [fingerprint, setFingerprint] = useState([])
 const [loadingFast, setLoadingFast] = useState(false)
 const [loadingSlow, setLoadingSlow] = useState(false)
 const [error, setError] = useState(null)
 
 useEffect(() => {
   if (!city) return
   setLoadingFast(true)
   setLoadingSlow(true)
 
   Promise.all([
     fetch(`${API_BASE}/weather?city=${encodeURIComponent(city)}`).then(r => r.json()),
     fetch(`${API_BASE}/forecast?city=${encodeURIComponent(city)}`).then(r => r.json()),
   ])
     .then(([cur, fore]) => {
       setCurrent(cur)
       setForecast(fore.points)
     })
     .catch(e => setError(e.message))
     .finally(() => setLoadingFast(false))
 
   fetch(`${API_BASE}/fingerprint?city=${encodeURIComponent(city)}`)
     .then(r => r.json())
     .then(fing => setFingerprint(fing.days))
     .catch(e => setError(e.message))
     .finally(() => setLoadingSlow(false))
 }, [city])
 
 return { current, forecast, fingerprint, loadingFast, loadingSlow, error }
}
```
 
**UI behavior:**
- `CitySearch` + `ForecastPanel` render immediately once `loadingFast` resolves.
- `FingerprintCanvas` shows a **shimmer skeleton** (animated CSS gradient on a circle) while `loadingSlow` is true, with text *"Loading fingerprint..."* in the center.
- Canvas replaces shimmer once fingerprint data arrives.
 
---
 
## Similarity Score
 
```python
from statistics import mean
 
def similarity(city_a: list[DayData], city_b: list[DayData]) -> float:
   temp_diffs = [abs(a.temp_max - b.temp_max) for a, b in zip(city_a, city_b)]
   rain_diffs = [abs(a.precip_mm - b.precip_mm) for a, b in zip(city_a, city_b)]
   score = 100 - (mean(temp_diffs) * 0.7 + mean(rain_diffs) * 0.3)
   return round(max(0.0, score), 1)
```
 
**Note on hemisphere inversion:** The algorithm uses calendar-aligned comparison (Jan 1 vs Jan 1). This means Sydney (Jan = summer) and London (Jan = winter) will score low similarity even if their climates are otherwise analogous. This is a known simplification — acceptable for MVP. A future improvement would be to compute a best-fit phase offset for southern hemisphere city pairs. Document this limitation in the README.
 
**"Find Climate Twin" UI:** Returns top 3 matches as plain text below the fingerprint, e.g.:
```
🌍 Climate twins for Columbus:
1. Pittsburgh, USA — 84.2
2. Warsaw, Poland — 81.7
3. Seoul, South Korea — 79.4
```
No click-through or drill-down on these results.
 
---
 
## Dev Tooling
 
| Tool | Included |
|---|---|
| Vite | Yes (default config, no customization) |
| ESLint / Prettier | No |
| Husky | No |
| Vitest | Yes — for similarity algorithm + canvas math utilities only |
 
**What to test with Vitest:**
- `similarity()` function: known city pairs with expected score ranges
- `tempToColor()`: boundary values at 5°C, 15°C, 25°C
- `getDayOfYear()`: Jan 1 = 0, Dec 31 = 364, leap year handling
- `mouseToSliceIndex()`: polar coordinate → day index conversion
 
---
 
## Demo Script (for presentation)
 
1. Search **Columbus, OH** — disambiguation dropdown appears (Columbus OH vs Columbus GA etc.), select Ohio, fingerprint generates
2. Search **Reykjavik** — fingerprint looks completely different side by side
3. Hit "Find climate twin" for Columbus — top 3 results appear as text
4. Show the 24h forecast strip updating live
5. Toggle dark/light mode — fingerprint re-renders
6. Hover over a slice — tooltip shows date + weather data
7. Click Download — save Columbus fingerprint as PNG
 
**Columbus is non-negotiable in the demo** regardless of visual impact. If the fingerprint looks flat/mild, that's a feature — it accurately represents Columbus's relatively moderate climate and makes for an instructive contrast with Reykjavik or Mumbai.
 
---
 
## MVP Build Order
 
1. `services/open_meteo.py` — geocoding (with multi-result return) + all three API calls
2. CORS middleware configured in `main.py`
3. Three FastAPI endpoints + `/geocode/search` returning clean JSON
4. `useWeather` hook with split fast/slow fetches confirmed working
5. `CitySearch` with disambiguation dropdown + `ForecastPanel` showing real numbers
6. `FingerprintCanvas` — shimmer skeleton first, then real render with rotation animation
7. Hover tooltip + center hover stats
8. Dark/light mode toggle
9. PNG download button
10. Similarity scores + climate twin text display
11. Vitest suite for core utilities
12. Deploy: Vercel (frontend) + Render (backend), env vars configured on both sides
 
---
 
## Dependencies
 
**Backend (`requirements.txt`):**
```
fastapi
uvicorn
httpx
pydantic
geopy
```
 
**Frontend (`package.json`):**
```
react
vite
maplibre-gl
three
@react-three/fiber
@react-three/drei
```
 
No TypeScript. No database. No auth. No external paid APIs.
 
---
 
## Open Questions / Future Work
 
- **Hemisphere phase-offset similarity:** Current algorithm compares Jan vs Jan regardless of hemisphere. Future version should detect southern hemisphere cities and shift by 182 days before scoring.
- **Render cold-start latency:** If demo reliability becomes an issue, serialize precomputed fingerprints to a bundled JSON file in the repo and load from disk on startup instead of fetching from open-meteo.
- **Canvas responsiveness:** Currently 400×400px fixed, desktop-only. Mobile support not in scope.
 

