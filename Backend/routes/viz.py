from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException
import httpx

from services.cache import get_cached, set_cached

router = APIRouter(prefix="/viz")


@router.get("/geocode/zip")
async def geocode_zip(zip_code: str = Query(..., min_length=5, max_length=5)):
    """Geocode a US zip code to coordinates."""
    cache_key = f"viz:geocode_zip:{zip_code}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "postalcode": zip_code,
                "country": "US",
                "format": "json",
                "limit": 1,
            },
            headers={"User-Agent": "AETHEROS/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    if not data:
        raise HTTPException(status_code=404, detail="Zip code not found")

    place = data[0]
    display = place.get("display_name", "")
    short_name = display.split(",")[0] if display else zip_code

    result = {
        "lat": float(place["lat"]),
        "lon": float(place["lon"]),
        "name": short_name,
    }
    set_cached(cache_key, result)
    return result


@router.get("/forecast")
async def forecast_7day(lat: float = Query(...), lon: float = Query(...)):
    """Get 7-day hourly forecast for coordinates."""
    cache_key = f"viz:forecast:{lat},{lon}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": (
                    "temperature_2m,wind_speed_10m,precipitation,"
                    "weather_code,relative_humidity_2m,cloud_cover,is_day"
                ),
                "forecast_days": 7,
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    hourly = data["hourly"]
    points = []
    for i in range(len(hourly["time"])):
        points.append(
            {
                "datetime": hourly["time"][i],
                "temp_c": hourly["temperature_2m"][i],
                "wind_kph": hourly["wind_speed_10m"][i],
                "precip_mm": hourly["precipitation"][i],
                "weather_code": hourly["weather_code"][i],
                "humidity": hourly["relative_humidity_2m"][i],
                "cloud_cover": hourly["cloud_cover"][i],
                "is_day": hourly["is_day"][i],
            }
        )

    result = {"lat": lat, "lon": lon, "points": points}
    set_cached(cache_key, result)
    return result


@router.get("/current")
async def current_weather(lat: float = Query(...), lon: float = Query(...)):
    """Get current weather for coordinates."""
    cache_key = f"viz:current:{lat},{lon}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": (
                    "temperature_2m,wind_speed_10m,precipitation,"
                    "weather_code,relative_humidity_2m,cloud_cover,is_day"
                ),
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    cur = data["current"]
    result = {
        "temp_c": cur["temperature_2m"],
        "wind_kph": cur["wind_speed_10m"],
        "precip_mm": cur["precipitation"],
        "weather_code": cur["weather_code"],
        "humidity": cur["relative_humidity_2m"],
        "cloud_cover": cur["cloud_cover"],
        "is_day": cur.get("is_day", 1),
    }
    set_cached(cache_key, result)
    return result
