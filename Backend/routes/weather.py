from __future__ import annotations

from fastapi import APIRouter, Query

from models.weather import (
    CurrentWeather,
    ForecastResponse,
    FingerprintResponse,
    GeocodingResult,
)
from services.cache import get_cached, set_cached, global_max_precip_mm
from services import open_meteo
from services.open_meteo import (
    geocode,
    get_current_weather,
    get_forecast,
    get_historical,
    find_nearest_precomputed,
    similarity,
    PRECOMPUTED_CITIES,
)
import services.cache as cache_module

router = APIRouter()


async def _resolve_city(city: str) -> tuple[str, float, float]:
    """Geocode a city name, return (display_name, lat, lon). Uses cache."""
    cache_key = f"geocode:{city.lower()}"
    cached = get_cached(cache_key)
    if cached:
        r = cached[0]
        return r["name"], r["lat"], r["lon"]

    results = await geocode(city)
    set_cached(cache_key, [r.model_dump() for r in results])
    first = results[0]
    return first.name, first.lat, first.lon


async def _get_or_compute_fingerprint(city: str) -> tuple[list[dict], str, float, float, bool, str | None]:
    """
    Get fingerprint data for a city (from cache or compute).
    Returns (days, city_name, lat, lon, fallback_used, fallback_city).
    """
    cache_key = f"fingerprint:{city.lower()}"
    cached = get_cached(cache_key)

    if cached and isinstance(cached, dict) and "days" in cached:
        return cached["days"], cached["city_name"], cached["lat"], cached["lon"], False, None

    city_name, lat, lon = await _resolve_city(city)
    fallback_used = False
    fallback_city = None

    days = await get_historical(lat, lon)

    # Fallback if sparse data
    if len(days) < 300:
        nearest = find_nearest_precomputed(lat, lon)
        if nearest:
            nearest_cached = get_cached(f"fingerprint:{nearest}")
            if nearest_cached and isinstance(nearest_cached, dict) and "days" in nearest_cached:
                days = nearest_cached["days"]
                fallback_used = True
                fallback_city = nearest.title()

    set_cached(cache_key, {"days": days, "city_name": city_name, "lat": lat, "lon": lon})
    return days, city_name, lat, lon, fallback_used, fallback_city


@router.get("/weather")
async def weather(city: str = Query(...)):
    cache_key = f"current:{city.lower()}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    city_name, lat, lon = await _resolve_city(city)
    data = await get_current_weather(lat, lon)
    result = CurrentWeather(
        city=city_name,
        lat=lat,
        lon=lon,
        **data,
    ).model_dump()
    set_cached(cache_key, result)
    return result


@router.get("/forecast")
async def forecast(city: str = Query(...)):
    cache_key = f"forecast:{city.lower()}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    city_name, lat, lon = await _resolve_city(city)
    points = await get_forecast(lat, lon)
    result = ForecastResponse(city=city_name, points=points).model_dump()
    set_cached(cache_key, result)
    return result


@router.get("/fingerprint")
async def fingerprint(city: str = Query(...)):
    days, city_name, lat, lon, fallback_used, fallback_city = (
        await _get_or_compute_fingerprint(city)
    )

    # Compute similarity against all precomputed cities
    similarity_scores = {}
    for pc in PRECOMPUTED_CITIES:
        pc_cached = get_cached(f"fingerprint:{pc.lower()}")
        if pc_cached and pc.lower() != city.lower():
            pc_days = pc_cached["days"] if isinstance(pc_cached, dict) and "days" in pc_cached else pc_cached
            similarity_scores[pc] = similarity(days, pc_days)

    result = FingerprintResponse(
        city=city_name,
        lat=lat,
        lon=lon,
        days=days,
        similarity_scores=similarity_scores,
        fallback_used=fallback_used,
        fallback_city=fallback_city,
        global_max_precip_mm=cache_module.global_max_precip_mm,
    ).model_dump()
    return result


@router.get("/similarity")
async def similarity_endpoint(city: str = Query(...)):
    days, city_name, lat, lon, _, _ = await _get_or_compute_fingerprint(city)

    scores = []
    for pc in PRECOMPUTED_CITIES:
        pc_cached = get_cached(f"fingerprint:{pc.lower()}")
        if pc_cached and pc.lower() != city.lower():
            pc_days = pc_cached["days"] if isinstance(pc_cached, dict) and "days" in pc_cached else pc_cached
            score = similarity(days, pc_days)
            scores.append({"city": pc, "score": score})

    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:3]


@router.get("/geocode/search")
async def geocode_search(name: str = Query(...)):
    results = await geocode(name)
    return [r.model_dump() for r in results]
