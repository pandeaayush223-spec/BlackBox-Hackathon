from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class CurrentWeather(BaseModel):
    city: str
    temp_c: float
    wind_kph: float
    humidity: int
    condition: str  # "clear" | "rain" | "storm" | "snow" | "cloudy"
    precip_mm: float
    lat: float
    lon: float


class ForecastPoint(BaseModel):
    hour: int
    temp_c: float
    wind_kph: float
    precip_mm: float


class ForecastResponse(BaseModel):
    city: str
    points: list[ForecastPoint]


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
    days: list[DayData]
    similarity_scores: dict[str, float]
    top_twins: list[dict]
    fallback_used: bool
    fallback_city: Optional[str]
    global_max_precip_mm: float
    country_code: Optional[str]


class GeocodingResult(BaseModel):
    name: str
    country: str
    country_code: str = ""
    admin1: str = ""
    lat: float
    lon: float
    population: int = 0
