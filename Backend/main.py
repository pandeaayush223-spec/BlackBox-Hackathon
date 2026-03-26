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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup: precompute fingerprints for all 15 cities ---
    all_days: list[dict] = []
    for city_name in PRECOMPUTED_CITIES:
        try:
            results = await geocode(city_name)
            first = results[0]
            lat, lon = first.lat, first.lon

            # Cache coordinates for fallback lookups
            open_meteo_module._city_coords[city_name.lower()] = (lat, lon)

            # Cache geocoding result
            set_cached(f"geocode:{city_name.lower()}", [r.model_dump() for r in results])

            days = await get_historical(lat, lon)
            set_cached(f"fingerprint:{city_name.lower()}", days)
            all_days.extend(days)
            logger.info(f"Precomputed: {city_name} ({len(days)} days)")
        except Exception as e:
            logger.error(f"Failed to precompute {city_name}: {e}")

    # Compute global max precipitation across all precomputed datasets
    if all_days:
        max_precip = max(d["precip_mm"] for d in all_days)
    else:
        max_precip = 0.0
    cache_module.global_max_precip_mm = max_precip
    logger.info(f"Global max precip: {max_precip} mm")

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
