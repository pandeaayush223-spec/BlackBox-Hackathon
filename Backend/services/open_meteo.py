from __future__ import annotations

import httpx
import math
from datetime import date
from statistics import mean
from fastapi import HTTPException

from models.weather import GeocodingResult
from services.cache import get_cached, set_cached

PRECOMPUTED_CITIES = [
    # North America
    "New York", "Los Angeles", "Chicago", "Miami", "Denver", "Seattle", "Toronto", "Vancouver", 
    "Mexico City", "Anchorage", "Honolulu", "Las Vegas", "Atlanta", "Montreal",
    # South America
    "São Paulo", "Rio de Janeiro", "Buenos Aires", "Bogotá", "Lima", "Santiago", "Caracas",
    # Europe
    "London", "Paris", "Berlin", "Rome", "Madrid", "Reykjavik", "Oslo", "Stockholm", 
    "Moscow", "Athens", "Dublin", "Istanbul", "Vienna", "Amsterdam", "Prague",
    # Africa
    "Cairo", "Nairobi", "Johannesburg", "Cape Town", "Lagos", "Casablanca", "Addis Ababa", "Dakar",
    # Asia
    "Tokyo", "Beijing", "Shanghai", "Mumbai", "New Delhi", "Dubai", "Singapore", 
    "Bangkok", "Seoul", "Jakarta", "Manila", "Riyadh", "Tehran", "Hong Kong", "Kuala Lumpur",
    # Oceania
    "Sydney", "Melbourne", "Brisbane", "Perth", "Auckland", "Wellington", "Suva", "Port Moresby"
]

# Populated during startup — maps city_lower -> {"lat": ..., "lon": ..., "country_code": ...}
_city_coords: dict[str, dict] = {}


def _map_weathercode(code: int) -> str:
    if code <= 1:
        return "clear"
    if code <= 3:
        return "cloudy"
    if code <= 49:
        # 45-48 is fog; treat as cloudy
        return "cloudy"
    if code <= 67:
        return "rain"
    if code <= 77:
        return "snow"
    return "storm"


async def geocode(city: str) -> list[GeocodingResult]:
    """Call open-meteo geocoding API. Returns up to 5 results."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 5, "language": "en", "format": "json"},
        )
        resp.raise_for_status()
        data = resp.json()

    if "results" not in data or not data["results"]:
        raise HTTPException(status_code=404, detail="City not found.")

    return [
        GeocodingResult(
            name=r["name"],
            country=r.get("country", ""),
            country_code=r.get("country_code", ""),
            admin1=r.get("admin1", ""),
            lat=r["latitude"],
            lon=r["longitude"],
            population=r.get("population", 0),
        )
        for r in data["results"]
    ]


async def get_current_weather(lat: float, lon: float) -> dict:
    """Fetch current conditions from open-meteo forecast API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,wind_speed_10m,precipitation,weather_code,relative_humidity_2m",
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    cur = data["current"]
    return {
        "temp_c": cur["temperature_2m"],
        "wind_kph": cur["wind_speed_10m"],
        "humidity": cur["relative_humidity_2m"],
        "condition": _map_weathercode(cur["weather_code"]),
        "precip_mm": cur["precipitation"],
    }


async def get_forecast(lat: float, lon: float) -> list[dict]:
    """Fetch 24h hourly forecast from open-meteo."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": "temperature_2m,wind_speed_10m,precipitation",
                "forecast_days": 1,
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    hourly = data["hourly"]
    points = []
    for i in range(len(hourly["time"])):
        # Extract hour from ISO time string like "2024-03-15T14:00"
        hour = int(hourly["time"][i].split("T")[1].split(":")[0])
        points.append({
            "hour": hour,
            "temp_c": hourly["temperature_2m"][i],
            "wind_kph": hourly["wind_speed_10m"][i],
            "precip_mm": hourly["precipitation"][i],
        })
    return points[:24]


async def get_historical(lat: float, lon: float) -> list[dict]:
    """Fetch full year of daily historical data from open-meteo archive API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": f"{date.today().year - 1}-01-01",
                "end_date": f"{date.today().year - 1}-12-31",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    daily = data.get("daily", {})
    times = daily.get("time", [])
    days = []
    for i in range(len(times)):
        days.append({
            "date": times[i],
            "temp_max": daily["temperature_2m_max"][i] or 0.0,
            "temp_min": daily["temperature_2m_min"][i] or 0.0,
            "precip_mm": daily["precipitation_sum"][i] or 0.0,
            "wind_kph": daily["wind_speed_10m_max"][i] or 0.0,
        })
    return days

async def get_comparer_data(lat: float, lon: float) -> dict:
    """Fetch comparative historical data: past year vs current year up to today."""
    today = date.today()
    last_year = today.year - 1

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch last year's data
        resp_last = await client.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": f"{last_year}-01-01",
                "end_date": f"{last_year}-12-31",
                "daily": "temperature_2m_max,precipitation_sum",
                "timezone": "auto",
            },
        )
        resp_last.raise_for_status()
        data_last = resp_last.json()

        # Fetch this year's data up to today
        # Note: Open-Meteo archive data is usually delayed by 5 days, so we fetch up to today-5
        # or we can use the regular forecast API for recent days. But archive is simpler here.
        # Actually, let's just fetch up to today - 5 days, or use the historical API's auto availability
        end_date_current = today.strftime("%Y-%m-%d")
        resp_curr = await client.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": f"{today.year}-01-01",
                "end_date": end_date_current,
                "daily": "temperature_2m_max,precipitation_sum",
                "timezone": "auto",
            },
        )
        resp_curr.raise_for_status()
        data_curr = resp_curr.json()

    # Parse last year
    last_daily = data_last.get("daily", {})
    last_times = last_daily.get("time", [])
    last_year_data = [
        {
            "date": last_times[i],
            "temp_max": last_daily["temperature_2m_max"][i] or 0.0,
            "precip_mm": last_daily["precipitation_sum"][i] or 0.0,
        }
        for i in range(len(last_times))
    ]

    # Parse current year
    curr_daily = data_curr.get("daily", {})
    curr_times = curr_daily.get("time", [])
    current_year_data = [
        {
            "date": curr_times[i],
            "temp_max": curr_daily["temperature_2m_max"][i] or 0.0,
            "precip_mm": curr_daily["precipitation_sum"][i] or 0.0,
        }
        for i in range(len(curr_times))
    ]

    return {
        "last_year": last_year_data,
        "current_year": current_year_data,
        "last_year_label": str(last_year),
        "current_year_label": str(today.year),
    }


def find_nearest_precomputed(lat: float, lon: float) -> str | None:
    """Find the nearest precomputed city by Euclidean distance on lat/lon."""
    best_city = None
    best_dist = float("inf")
    for city_lower, info in _city_coords.items():
        dist = math.sqrt((lat - info["lat"]) ** 2 + (lon - info["lon"]) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_city = city_lower
    return best_city


def get_country_code(city_name: str) -> str | None:
    """Return the ISO country code for a precomputed city, or None."""
    entry = _city_coords.get(city_name.lower())
    if isinstance(entry, dict):
        return entry.get("country_code") or None
    return None


def get_all_precomputed_fingerprints() -> dict[str, dict]:
    """Return cached fingerprint dicts for all precomputed cities that are ready."""
    results = {}
    for city_name in PRECOMPUTED_CITIES:
        cached = get_cached(f"fingerprint:{city_name.lower()}")
        if cached and isinstance(cached, dict) and "days" in cached:
            results[city_name] = cached
    return results


def get_top_similar_cities(
    searched_days: list[dict],
    searched_country_code: str | None,
    n: int = 3,
) -> list[dict]:
    """
    Compare searched_days against all precomputed cities.
    Exclude cities whose country_code matches searched_country_code.
    Return top n matches sorted by score descending.
    """
    import logging
    logger = logging.getLogger(__name__)

    all_fingerprints = get_all_precomputed_fingerprints()
    results = []
    same_country = []

    for city_name, cached in all_fingerprints.items():
        precomputed_country = get_country_code(city_name)
        score = similarity(searched_days, cached["days"])
        entry = {"city": city_name, "score": score}

        is_same_country = (
            searched_country_code is not None
            and precomputed_country is not None
            and precomputed_country.upper() == searched_country_code.upper()
        )

        if is_same_country:
            same_country.append(entry)
        else:
            results.append(entry)

    results.sort(key=lambda x: x["score"], reverse=True)

    # Fallback: if fewer than n foreign cities, fill from same-country cities
    if len(results) < n:
        same_country.sort(key=lambda x: x["score"], reverse=True)
        needed = n - len(results)
        results += same_country[:needed]
        if same_country[:needed]:
            logger.info(f"Country filter fallback: added {len(same_country[:needed])} same-country cities")

    return results[:n]


def similarity(days_a: list[dict], days_b: list[dict]) -> float:
    """Compute climate similarity score between two city datasets (0-100)."""
    if not days_a or not days_b:
        return 0.0
    temp_diffs = [abs(a["temp_max"] - b["temp_max"]) for a, b in zip(days_a, days_b)]
    rain_diffs = [abs(a["precip_mm"] - b["precip_mm"]) for a, b in zip(days_a, days_b)]
    score = 100 - (mean(temp_diffs) * 0.7 + mean(rain_diffs) * 0.3)
    return round(max(0.0, score), 1)
