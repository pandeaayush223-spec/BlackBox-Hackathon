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
    fallback_used: bool
    fallback_city: str | None
    global_max_precip_mm: float


class GeocodingResult(BaseModel):
    name: str
    country: str
    admin1: str = ""
    lat: float
    lon: float
    population: int = 0
