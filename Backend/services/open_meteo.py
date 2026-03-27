from __future__ import annotations

import httpx
import math
from datetime import date
from statistics import mean
from fastapi import HTTPException

from models.weather import GeocodingResult
from services.cache import get_cached, set_cached

PRECOMPUTED_CITIES = [
    "London", "Dubai", "Reykjavik", "New York", "Tokyo",
    "Sydney", "Singapore", "Cairo", "Oslo", "Miami",
    "Columbus", "Mumbai", "São Paulo", "Nairobi", "Vancouver",
]

# Populated during startup — maps city_lower -> (lat, lon)
_city_coords: dict[str, tuple[float, float]] = {}


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


def find_nearest_precomputed(lat: float, lon: float) -> str | None:
    """Find the nearest precomputed city by Euclidean distance on lat/lon."""
    best_city = None
    best_dist = float("inf")
    for city_lower, (clat, clon) in _city_coords.items():
        dist = math.sqrt((lat - clat) ** 2 + (lon - clon) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_city = city_lower
    return best_city


def similarity(days_a: list[dict], days_b: list[dict]) -> float:
    """Compute climate similarity score between two city datasets (0-100)."""
    if not days_a or not days_b:
        return 0.0
    temp_diffs = [abs(a["temp_max"] - b["temp_max"]) for a, b in zip(days_a, days_b)]
    rain_diffs = [abs(a["precip_mm"] - b["precip_mm"]) for a, b in zip(days_a, days_b)]
    score = 100 - (mean(temp_diffs) * 0.7 + mean(rain_diffs) * 0.3)
    return round(max(0.0, score), 1)
