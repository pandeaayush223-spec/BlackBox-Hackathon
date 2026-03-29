import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.weather import router
from routes.viz import router as viz_router
from services.open_meteo import geocode, get_historical, PRECOMPUTED_CITIES
from services.cache import set_cached
import services.cache as cache_module
import services.open_meteo as open_meteo_module

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load persistence layer
    cache_module.load_disk_cache()

    all_days: list[dict] = []
    missing_cities = []

    # First pass: Fast load from disk cache
    for city_name in PRECOMPUTED_CITIES:
        cached = cache_module.get_cached(f"fingerprint:{city_name.lower()}")
        if cached and "days" in cached:
            open_meteo_module._city_coords[city_name.lower()] = {
                "lat": cached.get("lat", 0),
                "lon": cached.get("lon", 0),
                "country_code": cached.get("country_code", ""),
            }
            all_days.extend(cached["days"])
        else:
            missing_cities.append(city_name)
    
    if missing_cities:
        logger.info(f"Disk cache miss. Batch fetching {len(missing_cities)} new global cities concurrently...")
        
        sem = asyncio.Semaphore(2) # Strict anti-DDoS rate-limit pacing (2 concurrent max)
        
        async def fetch_and_cache(city: str):
            async with sem:
                try:
                    await asyncio.sleep(0.5) # Hard sleep pacing to prevent 429 Too Many Requests Let's go!
                    results = await geocode(city)
                    first = results[0]
                    lat, lon = first.lat, first.lon

                    open_meteo_module._city_coords[city.lower()] = {
                        "lat": lat,
                        "lon": lon,
                        "country_code": first.country_code,
                    }

                    # Cache geocoding
                    set_cached(f"geocode:{city.lower()}", [r.model_dump() for r in results])

                    # Fetch archive
                    days = await get_historical(lat, lon)
                    set_cached(f"fingerprint:{city.lower()}", {
                        "days": days,
                        "city_name": first.name,
                        "lat": lat,
                        "lon": lon,
                        "country_code": first.country_code,
                    })
                    all_days.extend(days)
                    logger.info(f"Successfully cached global city: {city}")
                except Exception as e:
                    logger.error(f"Failed to fetch {city}: {e}")

        # Execute paced concurrent batch
        await asyncio.gather(*(fetch_and_cache(c) for c in missing_cities))
        
        # Save new mutations back to disk
        cache_module.save_disk_cache()

    # Compute global max precipitation
    max_precip = max((d["precip_mm"] for d in all_days), default=0.0)
    cache_module.global_max_precip_mm = max_precip
    logger.info(f"Global Twins Architecture initialized. Boot time: Instant. Global max precip: {max_precip} mm")

    yield  # App runs

    # Shutdown — nothing to clean up


app = FastAPI(title="Weather Visualizer API", lifespan=lifespan)

# --- CORS ---
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

app.include_router(router)
app.include_router(viz_router)
