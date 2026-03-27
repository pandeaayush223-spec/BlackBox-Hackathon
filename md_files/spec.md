# AETHEROS — Project Spec v4
> Updated to reflect the current implementation including Radar Prediction and Past Comparer features. All decisions below supersede v3 where they conflict.

---

## Overview

**AETHEROS** is an immersive weather visualization app that lets users enter a US zip code and explore weather data across three modes:

1. **Short-Term Forecast** — a 7-day hourly forecast on an interactive 3D map with real-time weather particle effects (rain, snow, lightning, fog) using Three.js, overlaid on a MapLibre GL 3D city map with building extrusions. A timeline slider lets users scrub through 168 hours of forecast data.
2. **Radar Prediction** — an animated precipitation radar map using RainViewer data, showing past and near-future (nowcast) precipitation movement with play/pause controls.
3. **Past Comparer** — a year-over-year climate comparison showing today's temperature and precipitation vs. the same date last year, displayed as a glass morphism overlay on the 3D map.

The backend also supports a **climate fingerprint** feature — a radial chart encoding a full year of daily temperature, precipitation, and wind data — with similarity scoring against 15 precomputed world cities.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + JavaScript (no TypeScript) |
| 3D Map | MapLibre GL 4.7 (CartoDB dark-matter vector tiles) |
| 3D Effects | Three.js 0.170 via @react-three/fiber + @react-three/drei |
| Styling | Tailwind CSS 3.4 + custom glass morphism |
| Backend | FastAPI (Python) |
| Weather data | open-meteo API (free, no key) + Nominatim (zip geocoding) + RainViewer (radar) |
| Caching | In-memory Python dict (1hr TTL, no database) |
| Build tool | Vite 6.0 |

> **No TypeScript.** Plain JS throughout. No tsconfig, no type checking in the build pipeline.

---

## Architecture

```
open-meteo API + Nominatim + RainViewer
         |
   services/open_meteo.py     <- Model: fetches + shapes raw data
   services/cache.py           <- In-memory cache (1hr TTL)
         |
   routes/weather.py           <- Controller: city-based endpoints + fingerprint + comparer
   routes/viz.py               <- Controller: coordinate-based endpoints (3D frontend)
         |
   React components            <- View: 3D map, particles, timeline, stats, radar, comparer
```

**Key rule:** React components never call external APIs directly — **except** `RadarMapViewer`, which fetches radar tile metadata directly from RainViewer (a client-side-only tile service). All other data flows through the FastAPI backend. The Vite dev server proxies `/api` to `http://localhost:8000`.

---

## Folder Structure

```
Project/
+-- Backend/
|   +-- main.py                     # FastAPI app, CORS, lifespan startup
|   +-- requirements.txt
|   +-- models/
|   |   +-- __init__.py
|   |   +-- weather.py              # Pydantic schemas
|   +-- routes/
|   |   +-- __init__.py
|   |   +-- weather.py              # /weather, /forecast, /fingerprint, /similarity, /comparer, /geocode/search
|   |   +-- viz.py                  # /viz/geocode/zip, /viz/forecast, /viz/current
|   +-- services/
|       +-- __init__.py
|       +-- open_meteo.py           # All external API calls, similarity algo, precomputed cities
|       +-- cache.py                # In-memory cache + global_max_precip_mm
|
+-- Frontend/
|   +-- index.html
|   +-- package.json
|   +-- vite.config.js              # Proxy /api -> localhost:8000
|   +-- tailwind.config.js
|   +-- postcss.config.js
|   +-- src/
|       +-- main.jsx
|       +-- index.css               # Tailwind, glass morphism, animations
|       +-- App.jsx                 # Main app: zip input -> mode routing (forecast/radar/past)
|       +-- components/
|           +-- ZipCodeInput.jsx    # Landing page with particle background + 3 mode buttons
|           +-- Map3DViewer.jsx     # MapLibre 3D map with building extrusions
|           +-- WeatherOverlay.jsx  # Three.js rain/snow/lightning particles
|           +-- WeatherStats.jsx    # Glass morphism stats panel (top-left)
|           +-- WeatherTimeline.jsx # 7-day hourly scrubbing slider (bottom)
|           +-- RadarMapViewer.jsx  # Animated precipitation radar (RainViewer tiles)
|           +-- PastComparerOverlay.jsx # Year-over-year climate comparison panel
|           +-- FingerprintCanvas.jsx   # (placeholder) Climate fingerprint radial chart
|           +-- CitySearch.jsx          # (placeholder) City search with disambiguation
|           +-- ForecastPanel.jsx       # (placeholder) 24h horizontal strip
|
+-- md_files/
    +-- spec.md                     # This file
    +-- tasks.md                    # Task tracking
```

---

## API Endpoints

The backend has **two routers**: the original weather router (city-based queries) and the viz router (coordinate-based queries for the 3D frontend).

### Viz Router (prefix: `/viz`) — Powers the 3D Frontend

#### `GET /viz/geocode/zip?zip_code=43210`
Geocodes a US zip code to coordinates via Nominatim.

```json
Response: { "lat": 40.0, "lon": -83.01, "name": "43210" }
```

- Query param: `zip_code` (exactly 5 digits, validated)
- External API: Nominatim OpenStreetMap
- Cached: Yes (1hr TTL, key: `viz:geocode_zip:{zip_code}`)
- Error: 404 if zip not found

#### `GET /viz/forecast?lat=40.0&lon=-83.0`
Returns 7-day hourly forecast (168 data points).

```json
Response: {
  "lat": 40.0,
  "lon": -83.0,
  "points": [
    {
      "datetime": "2026-03-26T00:00",
      "temp_c": 12.5,
      "wind_kph": 15.2,
      "precip_mm": 0.0,
      "weather_code": 2,
      "humidity": 65,
      "cloud_cover": 45
    },
    ...  // 168 items (7 days x 24 hours)
  ]
}
```

- Cached: Yes (1hr TTL, key: `viz:forecast:{lat},{lon}`)
- Timeout: 30s (large response)

#### `GET /viz/current?lat=40.0&lon=-83.0`
Returns current weather conditions for coordinates.

```json
Response: {
  "temp_c": 17.1,
  "wind_kph": 27.9,
  "precip_mm": 0.7,
  "weather_code": 63,
  "humidity": 72,
  "cloud_cover": 100
}
```

- Cached: Yes (1hr TTL, key: `viz:current:{lat},{lon}`)

### Weather Router (no prefix) — City-based Queries + Fingerprint

#### `GET /weather?city=London`
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

#### `GET /forecast?city=London`
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

#### `GET /fingerprint?city=London`
Returns a full year (365 days) of daily historical data plus similarity scores against all 15 precomputed cities.

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
    days: list[DayData]                # 365 items
    similarity_scores: dict[str, float]  # city -> similarity score (0-100)
    fallback_used: bool
    fallback_city: Optional[str]
    global_max_precip_mm: float        # for consistent precipitation normalization
```

- Historical data is fetched for the **most recent complete calendar year** (dynamically computed, not hardcoded)
- Cache stores fingerprint as a dict with metadata: `{"days": [...], "city_name": "...", "lat": ..., "lon": ...}`
- On cache hit, geocoding is skipped entirely (metadata is in the cache)

**Fallback logic:** If the archive API returns < 300 days for a location, the system substitutes data from the nearest precomputed city (by Euclidean distance on lat/lon). Sets `fallback_used: true` and `fallback_city` in the response. The frontend should display a warning when `fallback_used` is true.

#### `GET /similarity?city=London`
Returns top 3 most climatically similar precomputed cities.

```json
Response: [
  { "city": "Vancouver", "score": 82.3 },
  { "city": "Oslo", "score": 79.1 },
  { "city": "New York", "score": 76.8 }
]
```

#### `GET /comparer?city=Columbus`
Returns year-over-year daily temperature and precipitation data: the full previous year and the current year up to today.

```json
Response: {
  "city": "Columbus",
  "lat": 39.96,
  "lon": -82.99,
  "last_year": [
    { "date": "2025-01-01", "temp_max": 5.2, "precip_mm": 0.0 },
    ...  // 365 items (full previous year)
  ],
  "current_year": [
    { "date": "2026-01-01", "temp_max": 3.8, "precip_mm": 1.2 },
    ...  // up to today's date
  ],
  "last_year_label": "2025",
  "current_year_label": "2026"
}
```

- Resolves city name to coordinates via geocoding (same `_resolve_city` helper as other endpoints)
- External API: Open-Meteo Archive (two calls: last year full + current year to today)
- Cached: Yes (1hr TTL, key: `comparer:{city_lower}`)
- Timeout: 30s per archive call

#### `GET /geocode/search?name=Springfield`
Returns up to 5 geocoding candidates for disambiguation.

```python
class GeocodingResult(BaseModel):
    name: str
    country: str
    admin1: str = ""       # state/region (may be absent)
    lat: float
    lon: float
    population: int = 0    # may be absent
```

---

## CORS Configuration

```python
origins = ["http://localhost:5173"]
allowed_origin = os.getenv("ALLOWED_ORIGIN", "")
if allowed_origin:
    origins.append(allowed_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

Set `ALLOWED_ORIGIN` as an environment variable in production. Do not hardcode it.

---

## open-meteo API Usage

All calls use underscored field names (the current API convention).

**Current weather:**
```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,wind_speed_10m,precipitation,weather_code,relative_humidity_2m
  &timezone=auto
```

**7-day hourly forecast (viz router):**
```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &hourly=temperature_2m,wind_speed_10m,precipitation,weather_code,relative_humidity_2m,cloud_cover
  &forecast_days=7
  &timezone=auto
```

**24h forecast (weather router):**
```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &hourly=temperature_2m,wind_speed_10m,precipitation
  &forecast_days=1
  &timezone=auto
```

**Historical fingerprint (dynamic year):**
```
https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}&longitude={lon}
  &start_date={last_year}-01-01
  &end_date={last_year}-12-31
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max
  &timezone=auto
```
Where `last_year = current_year - 1` (always uses the most recent complete calendar year).

**Historical comparer (past year vs current year):**
```
https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}&longitude={lon}
  &start_date={last_year}-01-01
  &end_date={last_year}-12-31
  &daily=temperature_2m_max,precipitation_sum
  &timezone=auto
```
Plus a second call for the current year:
```
https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}&longitude={lon}
  &start_date={current_year}-01-01
  &end_date={today}
  &daily=temperature_2m_max,precipitation_sum
  &timezone=auto
```

**RainViewer radar metadata (client-side only):**
```
https://api.rainviewer.com/public/weather-maps.json
```
Returns `radar.past[]` and `radar.nowcast[]` frame arrays. Each frame has a `path` and `time` (unix timestamp). Tile URL pattern:
```
https://tilecache.rainviewer.com{frame.path}/256/{z}/{x}/{y}/2/1_1.png
```

**Geocoding (city name):**
```
https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=en&format=json
```

**Geocoding (US zip code via Nominatim):**
```
https://nominatim.openstreetmap.org/search
  ?postalcode={zip}&country=US&format=json&limit=1
```
Requires `User-Agent` header. Cache results to respect Nominatim usage policy.

---

## Caching

```python
# services/cache.py
from datetime import datetime, timedelta

_cache = {}
global_max_precip_mm: float = 0.0    # Set at startup, never expires

def get_cached(key: str):
    if key in _cache:
        data, timestamp = _cache[key]
        if datetime.now() - timestamp < timedelta(hours=1):
            return data
    return None

def set_cached(key: str, data):
    _cache[key] = (data, datetime.now())
```

**Cache key conventions:**
| Key pattern | Data |
|---|---|
| `geocode:{city_lower}` | List of geocoding result dicts |
| `current:{city_lower}` | CurrentWeather dict |
| `forecast:{city_lower}` | ForecastResponse dict |
| `fingerprint:{city_lower}` | Dict: `{"days": [...], "city_name": ..., "lat": ..., "lon": ...}` |
| `comparer:{city_lower}` | Comparer response dict (last_year + current_year arrays) |
| `viz:geocode_zip:{zip_code}` | `{"lat": ..., "lon": ..., "name": ...}` |
| `viz:forecast:{lat},{lon}` | Full 7-day forecast response |
| `viz:current:{lat},{lon}` | Current weather response |

**`global_max_precip_mm`** is a module-level variable (not in the TTL cache). Set once at startup, accessed via `cache_module.global_max_precip_mm` from routes (not via `from ... import` which would copy the initial value).

**Precomputed cities** (warmed at startup via `lifespan` context manager):
```python
PRECOMPUTED_CITIES = [
    "London", "Dubai", "Reykjavik", "New York", "Tokyo",
    "Sydney", "Singapore", "Cairo", "Oslo", "Miami",
    "Columbus", "Mumbai", "São Paulo", "Nairobi", "Vancouver"
]
```

Startup precomputation for each city: geocode -> get historical -> cache fingerprint + coordinates. Each city wrapped in try/except so one failure doesn't kill the server. `_city_coords` dict populated for fallback distance lookups.

---

## httpx Timeout Policy

| Call type | Timeout |
|---|---|
| Geocoding (open-meteo, Nominatim) | 15s |
| Current weather | 15s |
| 24h / 7-day forecast | 30s |
| Historical archive (365 days) | 30s |
| Comparer archive (2 calls) | 30s |

---

## Frontend Components

### User Flow
```
1. ZipCodeInput (landing page)
       |  user enters 5-digit zip, picks a mode
       v
2. App fetches /viz/geocode/zip -> routes by mode
       |
       +-- "Short-Term Forecast" -----> fetches /viz/forecast
       |                                  |
       |                                  v
       |                                Main forecast view:
       |                                  Map3DViewer + WeatherOverlay
       |                                  + WeatherStats + WeatherTimeline
       |                                  |
       |                                  v
       |                                User scrubs timeline -> all components react
       |
       +-- "Radar Prediction" --------> RadarMapViewer
       |                                  (RainViewer tiles, animated loop)
       |
       +-- "Past Comparer" -----------> Map3DViewer (static, no weather overlay)
                                         + PastComparerOverlay
                                           (fetches /comparer, shows year-over-year diff)
```

### ZipCodeInput.jsx
Landing screen with animated particle canvas background (120 blue dots drifting downward). Dark gradient background. Title "AETHEROS" with minimalist styling. ZIP input validates for exactly 5 digits. Three mode buttons replace the single "Explore" button:
- **Short-Term Forecast** (cyan gradient) — default 3D weather view
- **Radar Prediction** (purple-to-pink gradient) — animated radar map
- **Past Comparer** (amber-to-red gradient) — year-over-year comparison

Buttons activate only when a valid zip is entered. Loading spinner shown below the buttons while fetching.

### Map3DViewer.jsx
MapLibre GL map using CartoDB dark-matter basemap. 3D building extrusions from vector tile data. Camera: pitch 60deg, bearing -15deg. Smooth `flyTo` animation when location changes. Weather-based atmospheric color tint overlay (purple for storms, blue for rain, white for snow, gray for fog).

### WeatherOverlay.jsx
Three.js `<Canvas>` layer with GPU-accelerated particle systems:
- **Rain**: 600-8000 particles scaled by precipitation. Wind affects horizontal drift. Light blue (#a8c8ff).
- **Snow**: 300-4000 particles. Sine-wave floating drift. Slower fall speed. White (#e8f0ff). Larger particles.
- **Lightning**: Random flashes every 800ms (12% chance). Double-flash effect. White overlay.

Effect selection based on WMO weather codes:
| Code range | Effect |
|---|---|
| >= 95 | Rain + Lightning |
| 80-94 | Rain |
| 71-77, 85-86 | Snow |
| 61-67 | Rain |
| 51-60 | Light rain (30% intensity) |
| 45-48 | None (fog — map tint only) |
| 2-3 | None (cloudy — map tint only) |
| 0-1 | None (clear) |

### WeatherStats.jsx
Top-left glass morphism panel. Shows: back button ("New Search"), location name, weather emoji + condition label, large gradient temperature, and 2x2 stat grid (wind, humidity, precip, cloud cover).

### WeatherTimeline.jsx
Bottom glass morphism bar. Shows current time/conditions. Range slider from 0 to `points.length - 1` (168 hours). Gradient progress fill. Day marker buttons for quick-jump to each of the 7 days. Formatted as "Mon Mar 25 . 3 PM".

### RadarMapViewer.jsx
Full-screen MapLibre GL map (CartoDB dark-matter basemap, 45° pitch, zoom 7) with animated precipitation radar tiles from the RainViewer API. On mount, fetches `https://api.rainviewer.com/public/weather-maps.json` to get past + nowcast radar frames. Cycles through frames at 1-second intervals.

**UI overlay (top-left glass panel):**
- Back button (← Back, cyan)
- Title: "Radar Prediction" with purple-to-pink gradient text
- Play/pause toggle button
- Current frame timestamp (HH:MM format)
- Gradient progress bar showing position in the animation loop

**Tile management:** Updates the `rainviewer` raster source tiles on each frame change. Uses `source.setTiles()` if available, otherwise falls back to removing and re-adding the source/layer.

### PastComparerOverlay.jsx
Glass morphism overlay (top-left) displayed on top of a static Map3DViewer (no weather particles). Fetches `GET /api/comparer?city={locationName}` on mount.

**Display:**
- Location name (large, bold)
- "Year-over-Year Climate" subtitle
- **Today card:** Most recent day's `temp_max` and `precip_mm` from current year data
- **Difference badge:** Shows the temperature delta between today and the same date last year, color-coded (red if warmer, blue if cooler)
- **Last year card:** Same date from the previous year's `temp_max` and `precip_mm`

**Date matching:** Matches current year's latest entry to the same month/day in last year's data. Falls back to the same index position if exact date match not found.

---

## Climate Fingerprint (to be integrated into 3D view)

The fingerprint feature exists in the backend and should be surfaced in the frontend as an additional panel or overlay accessible from the 3D weather view.

### Data Flow
1. After the user enters a zip code and views the 3D forecast, a "Climate Fingerprint" button/tab becomes available
2. Clicking it calls `GET /fingerprint?city={location_name}` (using the resolved city name from the zip geocode)
3. The radial chart renders in a `FingerprintCanvas` component overlaid on or beside the 3D view

### Radial Chart Spec

**Canvas:** 400x400px. Dark background (`#0f0f0f`) to match the app's dark theme.

**Ring orientation:** Today's date at 12 o'clock position. Animated rotation on load (~800ms ease-in).

**Color encoding per day:**

| Variable | Encoding |
|---|---|
| Avg temp `(temp_max + temp_min) / 2` | Slice color (blue < 5C, teal 5-15C, amber 15-25C, red > 25C) |
| Precipitation | Spike length outward from base radius |
| Wind speed | Slice opacity (0.4 to 1.0) |

**Precipitation normalization:** Uses `global_max_precip_mm` from the backend (global across all 15 precomputed cities, not per-city). This preserves visual differences — Mumbai's monsoon should visually dominate vs Columbus's mild rain.

**Annotations (on canvas):**
1. City name centered in inner ring
2. 12 month tick marks around perimeter
3. Color/spike/opacity legend at bottom

**Hover tooltip:** DOM overlay. Mouse -> polar coords -> day index. Shows date, high/low temps, precip, wind.

**Similarity scores:** Displayed below the fingerprint as text:
```
Climate twins for Columbus:
1. Vancouver — 82.3
2. Oslo — 79.1
3. New York — 76.8
```

### Similarity Algorithm

```python
def similarity(days_a: list[dict], days_b: list[dict]) -> float:
    if not days_a or not days_b:
        return 0.0
    temp_diffs = [abs(a["temp_max"] - b["temp_max"]) for a, b in zip(days_a, days_b)]
    rain_diffs = [abs(a["precip_mm"] - b["precip_mm"]) for a, b in zip(days_a, days_b)]
    score = 100 - (mean(temp_diffs) * 0.7 + mean(rain_diffs) * 0.3)
    return round(max(0.0, score), 1)
```

**Hemisphere caveat:** Calendar-aligned comparison (Jan vs Jan). Sydney summer vs London winter will score low. Accepted for MVP.

---

## Dev Tooling

| Tool | Included |
|---|---|
| Vite 6.0 | Yes — with `/api` proxy to backend |
| Tailwind CSS 3.4 | Yes — with PostCSS + Autoprefixer |
| ESLint / Prettier | No |
| Vitest | Not yet — planned for similarity algo + canvas math |

---

## Demo Script (for presentation)

1. Open the app — animated particle landing page appears with three mode buttons
2. Enter **43210** (Columbus, OH) — click **Short-Term Forecast** — 3D map flies to Columbus with building extrusions
3. If raining: rain particles fall across the screen with wind drift
4. Scrub the timeline slider through 7 days — watch weather effects change in real time
5. Show the stats panel updating: temperature, wind, humidity, cloud cover
6. Click "New Search" — return to landing
7. Enter **43210** again — click **Radar Prediction** — animated precipitation radar map appears, showing past and near-future radar frames cycling with a progress bar
8. Pause/play the radar animation
9. Click "← Back" — return to landing
10. Enter **43210** again — click **Past Comparer** — 3D map loads with a year-over-year comparison panel: today's temperature vs. this exact date last year, with the delta highlighted
11. Click "← Back" — return to landing, enter **10001** (New York) with **Short-Term Forecast** — different weather, different map
12. Open the Climate Fingerprint panel — radial chart generates showing Columbus's full-year pattern
13. Show similarity scores — find Columbus's climate twins among 15 world cities

**Columbus is non-negotiable in the demo.** Its moderate climate makes for an instructive contrast with extreme cities like Reykjavik or Mumbai.

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

**Frontend (`package.json` key dependencies):**
```
react 18.3
react-dom 18.3
maplibre-gl 4.7
three 0.170
@react-three/fiber 8.17
@react-three/drei 9.117
date-fns 4.1
tailwindcss 3.4
vite 6.0
```

No TypeScript. No database. No auth. No external paid APIs.

---

## Open Questions / Future Work

- **Fingerprint UI integration:** `FingerprintCanvas.jsx` is currently a placeholder. Needs to be wired into the 3D view as a panel/modal triggered from WeatherStats or a new button.
- **Hemisphere phase-offset similarity:** Current algorithm compares Jan vs Jan. Future version should detect southern hemisphere cities and shift by 182 days before scoring.
- **Render cold-start latency:** Precomputation takes ~60s for 15 cities. Consider serializing to a bundled JSON and loading from disk.
- **Mobile support:** The 3D map and particle effects are desktop-focused. Touch controls and responsive layout not yet implemented.
- **City search for 3D view:** Currently zip-code-only. Could add city name search using the existing `/geocode/search` endpoint with a disambiguation dropdown.
