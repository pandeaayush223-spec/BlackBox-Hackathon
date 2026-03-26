# Weather Visualizer — Task List
 
---
 
## Phase 1 — Backend
 
- [✓] **Ask Claude Code to oneshot the complete backend** — provide it `weather-visualizer-spec-v2.md` and instruct it to scaffold the full `backend/` folder in one shot: `main.py` (with CORS middleware + `ALLOWED_ORIGIN` env var), `routes/weather.py` (all 5 endpoints), `models/weather.py` (all Pydantic schemas including `fallback_used`, `fallback_city`, `global_max_precip_mm`), `services/open_meteo.py` (geocoding + current + forecast + historical archive + fallback logic), `services/cache.py` (1hr TTL in-memory dict), and `requirements.txt`
 
- [ ] **Verify geocoding endpoint** — manually hit `GET /geocode/search?name=Springfield` and confirm it returns up to 5 results with `name`, `country`, `admin1`, `lat`, `lon`, `population`
 
- [ ] **Verify current weather endpoint** — hit `GET /weather?city=Columbus` and confirm all fields return (`temp_c`, `wind_kph`, `humidity`, `condition`, `precip_mm`, `lat`, `lon`)
 
- [ ] **Verify forecast endpoint** — hit `GET /forecast?city=Columbus` and confirm 24 `ForecastPoint` items return with correct fields
 
- [ ] **Verify fingerprint endpoint** — hit `GET /fingerprint?city=Columbus` and confirm exactly 365 `DayData` items, `similarity_scores` dict, `fallback_used`, `fallback_city`, and `global_max_precip_mm` are all present
 
- [ ] **Verify similarity endpoint** — hit `GET /similarity?city=Columbus` and confirm top 3 matches return with city name + score
 
- [ ] **Test fallback behavior** — hit `/fingerprint` with a remote/obscure city (e.g. `?city=Longyearbyen`) and confirm `fallback_used: true` and a valid `fallback_city` are returned
 
- [ ] **Confirm precomputed cities warm on startup** — check logs to verify all 15 cities in `PRECOMPUTED_CITIES` are fetched and cached when the server starts
 
- [ ] **Confirm `global_max_precip_mm` is stable** — value should be derived from the precomputed set at startup, not recalculated per request
 
---
 
## Phase 2 — Frontend Core
 
- [ ] **Scaffold frontend** — `npm create vite@latest` with React + JavaScript (no TypeScript), install `vitest`, add `VITE_API_URL` to `.env.local` pointing at `http://localhost:8000`
 
- [ ] **Build `useWeather.js` hook** — implement split fetch groups: Group 1 (`/weather` + `/forecast`) and Group 2 (`/fingerprint`) fire independently; expose `loadingFast`, `loadingSlow`, `error`, `current`, `forecast`, `fingerprint`
 
- [ ] **Build `CitySearch.jsx`** — search bar calls `/geocode/search`, shows disambiguation dropdown for 2–5 results, auto-proceeds on 1 result, shows inline error on 0 results
 
- [ ] **Build `ForecastPanel.jsx`** — 24h horizontal strip rendering `forecast` data (temp, wind, precip per hour); renders immediately once `loadingFast` resolves
 
---
 
## Phase 3 — Fingerprint Canvas
 
- [ ] **Build `FingerprintCanvas.jsx` skeleton** — shimmer circle animation + "Loading fingerprint..." text while `loadingSlow` is true
 
- [ ] **Implement core canvas render** — 365 arc slices with correct color (temp), spike length (precip via `global_max_precip_mm`), and opacity (wind, per-city normalized)
 
- [ ] **Implement smooth color interpolation** — linear lerp between `#3B8BD4` → `#5DCAA5` → `#EF9F27` → `#E24B4A` at 5°/15°/25°C boundaries
 
- [ ] **Implement animated ring rotation to today** — compute `todayIndex` (day-of-year), place it at 12 o'clock using `startOffset`, animate rotation over ~800ms with `requestAnimationFrame` easing on load
 
- [ ] **Draw canvas annotations** — city name centered in inner ring; 12 month tick marks + 3-letter labels around perimeter; legend in bottom area of canvas (color swatch = Temp, spike = Rain, opacity swatch = Wind)
 
- [ ] **Implement hover tooltip** — transparent DOM `<div>` overlay; on `mousemove` convert `(x,y)` → polar → day index; show date + high/low temps + precip + wind if in fingerprint band; show annual avg temp + total precip + windiest month if in center ring; hide on `mouseleave`
 
- [ ] **Implement dark/light mode toggle** — CSS variables on container, canvas re-renders on mode change; dark bg `#0f0f0f`, light bg `#ffffff`; canvas background rect filled before drawing so PNG export includes it
 
- [ ] **Implement PNG download button** — `canvas.toDataURL('image/png')` → anchor click → file named `{cityName}-climate-fingerprint.png`
 
---
 
## Phase 4 — Similarity Feature
 
- [ ] **Wire up "Find Climate Twin" button** — calls `/similarity?city={city}`, renders top 3 matches as plain text below the canvas (no click-through)
 
- [ ] **Implement fallback warning banner** — if `fingerprint.fallback_used` is true, display visible banner: *"Limited data for {city} — showing nearest match: {fallback_city}."*
 
---
 
## Phase 5 — Testing
 
- [ ] **Write Vitest tests for `similarity()`** — known city pairs with expected score ranges; confirm score is 0–100 bounded
 
- [ ] **Write Vitest tests for `tempToColor()`** — boundary values at exactly 5°C, 15°C, 25°C; values above and below
 
- [ ] **Write Vitest tests for `getDayOfYear()`** — Jan 1 = 0, Dec 31 = 364; leap year (Feb 29 exists); correct index for today
 
- [ ] **Write Vitest tests for `mouseToSliceIndex()`** — polar coordinate → day index round-trip with known `startOffset`
 
---
 
## Phase 6 — Deployment
 
- [ ] **Deploy backend to Render** — set `ALLOWED_ORIGIN` env var to Vercel production domain; confirm cold-start precomputation completes without timeout
 
- [ ] **Deploy frontend to Vercel** — set `VITE_API_URL` env var to Render service URL; confirm CORS handshake works end-to-end
 
- [ ] **Smoke test production** — run through full demo script: Columbus search → disambiguation → fingerprint → Reykjavik → climate twin → dark mode toggle → hover → PNG download
 
- [ ] **Add hemisphere limitation note to README** — document that similarity scoring is calendar-aligned (Jan vs Jan), which penalizes cross-hemisphere comparisons (e.g. Sydney vs London)
 